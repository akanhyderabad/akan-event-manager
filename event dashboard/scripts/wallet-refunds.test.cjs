// Real SQLite ledgers; synthetic guests only. No payment or messaging provider.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const Database = require('better-sqlite3');
const root = path.resolve(__dirname, '../src');

function fixture(t) {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  t.after(() => db.close());
  db.exec(`
    CREATE TABLE guests (id TEXT PRIMARY KEY, name TEXT, phone TEXT, email TEXT);
    CREATE TABLE wallets (txn_id TEXT PRIMARY KEY, guest_id TEXT REFERENCES guests(id), event_id TEXT,
      entry_fee REAL, cover_issued REAL, balance REAL, status TEXT, payment_method TEXT, issued_at INTEGER,
      issued_by TEXT, expires_at INTEGER, pin_hash TEXT, pin_fail_count INTEGER, pin_locked_until INTEGER);
    CREATE TABLE audit_log (id INTEGER PRIMARY KEY, timestamp INTEGER, actor TEXT, action TEXT, entity_type TEXT, entity_id TEXT, details TEXT);
    CREATE TABLE payments (id TEXT PRIMARY KEY, txn_id TEXT, status TEXT, amount REAL, notes TEXT);
    CREATE TABLE redemptions (id TEXT PRIMARY KEY, txn_id TEXT, amount REAL, balance_before REAL, balance_after REAL,
      captain TEXT, order_ref TEXT, notes TEXT, status TEXT, created_at INTEGER, settled INTEGER DEFAULT 0,
      settled_by TEXT, settled_at INTEGER, invoice_no TEXT);
    INSERT INTO guests VALUES ('guest', 'Synthetic Refund Guest', '+12025550100', NULL);
  `);
  const state = { role: 'host', grant: false, auditFails: false, verify: async () => true };
  const cache = new Map();
  function load(relative) {
    const filename = path.resolve(root, relative);
    const key = path.relative(root, filename);
    if (key === 'lib/db.ts') return { getDb: () => db, getConfig: (_key, fallback = '') => fallback };
    if (key === 'lib/auth.ts') return { requireRole: async (roles) => state.grant || roles.includes(state.role)
      ? { role: state.role, name: 'Test Admin', sub: 'admin-1' }
      : { forbidden: true, status: state.role ? 403 : 401, message: 'Not authorized' } };
    if (key === 'lib/tables.ts' || key === 'lib/reservations.ts') return {};
    if (key === 'lib/events.ts') return { getEvent: (id) => ['a', 'b'].includes(id) ? { id } : null };
    if (key === 'lib/crypto.ts') return { verifyPin: (...args) => state.verify(...args), generateRedemptionId: () => 'redeem-1' };
    if (key.includes('razorpay') || key.includes('whatsapp')) throw new Error('Refunds must never contact a provider');
    if (cache.has(filename)) return cache.get(filename).exports;
    const module = { exports: {} }; cache.set(filename, module);
    const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
    const localRequire = (id) => id.startsWith('@/') ? load(id.slice(2) + '.ts') : id.startsWith('.') ? load(path.resolve(path.dirname(filename), id + '.ts')) : require(id);
    vm.compileFunction(code, ['module', 'exports', 'require'], { filename })(module, module.exports, localRequire);
    return module.exports;
  }
  load('lib/wallet-refund-schema.ts').initWalletRefundSchema(db);
  load('lib/wallet-qr-codes.ts').initWalletQrCodeSchema(db);
  const wallet = (id = 'wallet', { event = 'a', cover = 1000, balance = cover, status = 'active', method = 'cash', expiry = Date.now() + 86400000 } = {}) => {
    db.prepare(`INSERT INTO wallets VALUES (?, 'guest', ?, 100, ?, ?, ?, ?, ?, 'Door Staff', ?, 'hash', 0, NULL)`)
      .run(id, event, cover, balance, status, method, Date.now(), expiry);
  };
  const input = (values = {}) => ({ eventId: 'a', txnId: 'wallet', requestId: 'request-1234567890', amount: 200,
    method: 'cash', reason: 'Guest changed plans', reference: '', confirmedPaid: true, ...values });
  const actor = { id: 'admin-1', name: 'Test Admin' };
  const refund = (values = {}) => load('lib/wallet-refunds.ts').recordWalletRefund(input(values), actor);
  const snapshot = () => db.prepare('SELECT balance,status,cover_issued,entry_fee FROM wallets WHERE txn_id = ?').get('wallet');
  return { db, state, load, wallet, input, refund, snapshot };
}

test('additive migration is repeatable, preserves existing wallets and does not infer historical refunds', (t) => {
  const f = fixture(t); f.wallet();
  f.db.prepare(`INSERT INTO audit_log (action,entity_type,entity_id,details) VALUES ('wallet_void','wallet','wallet','{"refund_amount":1000}')`).run();
  f.load('lib/wallet-refund-schema.ts').initWalletRefundSchema(f.db);
  assert.equal(f.snapshot().balance, 1000);
  assert.equal(f.db.prepare('SELECT COUNT(*) n FROM wallet_refunds').get().n, 0);
});

test('five-digit cover references find the correct wallet and refund history within the selected event', (t) => {
  const f = fixture(t); f.wallet(); f.wallet('other', { event: 'b' });
  const codes = f.load('lib/wallet-qr-codes.ts');
  const code = codes.ensureWalletQrCode(f.db, 'wallet');
  const refund = f.refund();
  assert.equal(refund.qrCodeId, code);
  const list = f.load('lib/wallet-refunds.ts').getEventRefunds;
  const results = list('a', code, 0);
  assert.equal(results.wallets.length, 1);
  assert.equal(results.wallets[0].txnId, 'wallet');
  assert.equal(results.wallets[0].qrCodeId, code);
  assert.equal(results.refundCount, 1);
  assert.equal(results.refunds[0].id, refund.id);
  assert.equal(list('b', code, 0).wallets.length, 0);
  assert.equal(list('b', code, 0).refundCount, 0);
});

test('partial and full refunds atomically reduce spendable cover, preserve receipts and retain staff evidence', (t) => {
  const f = fixture(t); f.wallet();
  const first = f.refund({ amount: 200.25, method: 'upi', reference: 'UTR-TEST-1' });
  assert.equal(first.balanceAfter, 799.75);
  assert.equal(first.recordedBy, 'Test Admin');
  assert.equal(first.reference, 'UTR-TEST-1');
  assert.deepEqual(f.snapshot(), { balance: 799.75, status: 'active', cover_issued: 1000, entry_fee: 100 });
  f.refund({ requestId: 'request-2222222222', amount: 799.75 });
  assert.equal(f.snapshot().status, 'exhausted');
  assert.equal(f.snapshot().balance, 0);
  assert.equal(f.db.prepare("SELECT COUNT(*) n FROM audit_log WHERE action = 'wallet_refund'").get().n, 2);
  const summary = f.load('lib/wallet-collections.ts').getEventWalletCollections('a');
  assert.equal(summary.totals.total, 1100);
  assert.equal(summary.totals.refunded, 1000);
  assert.equal(summary.totals.net, 100);
  assert.equal(summary.methods.find((x) => x.method === 'upi').net, -200.25);
  assert.equal(summary.methods.find((x) => x.method === 'cash').net, 300.25);
});

test('retry returns the same record even after exhaustion; reusing identity with different details is rejected', (t) => {
  const f = fixture(t); f.wallet();
  const first = f.refund({ amount: 1000 });
  assert.deepEqual(f.refund({ amount: 1000 }), first);
  assert.throws(() => f.refund({ amount: 999 }), /already used/);
  assert.equal(f.db.prepare('SELECT COUNT(*) n FROM wallet_refunds').get().n, 1);
});

test('rejects invalid amounts, missing paid confirmation, method, reason and noncash reference without changes', (t) => {
  const f = fixture(t); f.wallet();
  for (const amount of [-1, 0, NaN, Infinity, 0.001, 100000.01, '20', null]) assert.throws(() => f.refund({ amount }));
  for (const values of [{ confirmedPaid: false }, { reason: ' ' }, { reason: 'a'.repeat(501) }, { method: 'comp' }, { method: 'upi' }, { requestId: '' }, { reference: 'a'.repeat(121) }]) assert.throws(() => f.refund(values));
  assert.equal(f.snapshot().balance, 1000);
  assert.equal(f.db.prepare('SELECT COUNT(*) n FROM wallet_refunds').get().n, 0);
});

test('cannot refund spent balance, another event, complimentary or disabled wallets', (t) => {
  const f = fixture(t); f.wallet('wallet', { balance: 50 });
  assert.throws(() => f.refund(), /Only ₹50.00/);
  assert.throws(() => f.refund({ amount: 50, eventId: 'b' }), /not found/);
  for (const status of ['exhausted', 'revoked', 'flagged']) {
    f.db.prepare('UPDATE wallets SET status = ?').run(status);
    assert.throws(() => f.refund({ amount: 1 }), /Only ₹0.00/);
  }
  f.wallet('comp', { method: 'comp' });
  assert.throws(() => f.refund({ txnId: 'comp' }), /not found/);
});

test('refunds on expired unused wallets do not reactivate them', (t) => {
  const f = fixture(t); f.wallet('wallet', { status: 'expired', expiry: Date.now() - 1000 });
  f.refund();
  assert.equal(f.snapshot().status, 'expired');
  assert.equal(f.snapshot().balance, 800);
});

test('refunds exclude top-ups and cap cumulative refunds to the original entrance receipt', (t) => {
  const f = fixture(t); f.wallet('wallet', { cover: 1500 });
  f.db.exec(`INSERT INTO payments VALUES ('topup','wallet','captured',500,'{"kind":"wallet_topup"}')`);
  assert.throws(() => f.refund({ amount: 1000.01 }), /Only ₹1000.00/);
  f.refund({ amount: 1000 });
  assert.equal(f.snapshot().balance, 500);
  assert.throws(() => f.refund({ amount: 1, requestId: 'request-2222222222' }), /Only ₹0.00/);
});

test('an audit failure rolls back the balance and refund record together', (t) => {
  const f = fixture(t); f.wallet();
  f.db.exec("CREATE TRIGGER reject_audit BEFORE INSERT ON audit_log BEGIN SELECT RAISE(ABORT, 'test audit failure'); END");
  assert.throws(() => f.refund(), /test audit failure/);
  assert.equal(f.snapshot().balance, 1000);
  assert.equal(f.db.prepare('SELECT COUNT(*) n FROM wallet_refunds').get().n, 0);
});

test('a redemption waiting on PIN verification cannot spend cover refunded in the meantime', async (t) => {
  const f = fixture(t); f.wallet();
  let verified; f.state.verify = () => new Promise((resolve) => { verified = resolve; });
  const pending = f.load('lib/redemption.ts').redeemWallet({ txnId: 'wallet', pin: '000000', amount: 900, captain: 'Test Captain' });
  f.refund({ amount: 200 });
  verified(true);
  const result = await pending;
  assert.equal(result.ok, false);
  assert.match(result.message, /Insufficient balance/);
  assert.equal(f.snapshot().balance, 800);
  assert.equal(f.db.prepare('SELECT COUNT(*) n FROM redemptions').get().n, 0);
});

test('event search is isolated, literal and paginated; history lists refunds as money out', (t) => {
  const f = fixture(t); f.wallet(); f.wallet('other-event', { event: 'b' });
  f.refund();
  f.refund({ eventId: 'b', txnId: 'other-event', requestId: 'request-2222222222' });
  const api = f.load('lib/wallet-refunds.ts');
  assert.equal(api.getEventRefunds('a', 'Synthetic', 0).refundCount, 1);
  assert.equal(api.getEventRefunds('a', '%', 0).wallets.length, 0);
  assert.equal(api.getEventRefunds('a', '', 50).refunds.length, 0);
  const history = f.load('lib/transactions.ts').listTransactions({ from: 1, to: Date.now() + 1000, kind: 'refund' });
  assert.equal(history.rows.length, 2);
  assert.equal(history.rows[0].amount, -200);
  assert.equal(history.totals.refunds_amount, 400);
  assert.equal(history.totals.redemptions_amount, 0);
});

test('refund routes authenticate, restrict writes to the actual host and preserve idempotency', async (t) => {
  const f = fixture(t); f.wallet();
  const route = f.load('app/api/wallets/refunds/route.ts');
  const post = (values = {}) => route.POST({ json: async () => f.input(values) });
  const get = (params = '?eventId=a') => route.GET({ nextUrl: new URL('http://localhost/api/wallets/refunds' + params) });
  f.state.role = null;
  assert.equal((await post()).status, 401);
  assert.equal((await get()).status, 401);
  for (const role of ['manager', 'entry', 'cashier', 'captain']) {
    f.state.role = role;
    assert.equal((await post()).status, 403);
  }
  f.state.role = 'manager'; f.state.grant = true;
  assert.equal((await post()).status, 403);
  assert.equal((await (await get()).json()).canRecord, false);
  f.state.role = 'host'; f.state.grant = false;
  assert.equal((await get('')).status, 400);
  assert.equal((await get('?eventId=missing')).status, 404);
  assert.equal((await get('?eventId=a&offset=-1')).status, 400);
  const response = await post();
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
  assert.equal((await post()).status, 200);
  assert.equal(f.snapshot().balance, 800);
  assert.equal((await route.POST({ json: async () => null })).status, 400);
});


test('void only disables a wallet, records zero refund and rejects the obsolete refund parameter', async (t) => {
  const f = fixture(t); f.wallet();
  const route = f.load('app/api/wallets/[txnId]/route.ts');
  const context = { params: Promise.resolve({ txnId: 'wallet' }) };
  assert.equal((await route.DELETE({ json: async () => ({ refundAmount: 100 }) }, context)).status, 400);
  assert.equal(f.snapshot().balance, 1000);
  assert.equal((await route.DELETE({ json: async () => ({ reason: 'Duplicate test wallet' }) }, context)).status, 200);
  assert.equal(f.snapshot().balance, 0);
  const details = JSON.parse(f.db.prepare("SELECT details FROM audit_log WHERE action = 'wallet_void'").get().details);
  assert.equal(details.refund_amount, 0);
  assert.equal(details.money_returned, false);
  assert.equal(f.db.prepare('SELECT COUNT(*) n FROM wallet_refunds').get().n, 0);
  assert.equal(f.load('lib/wallet-collections.ts').getEventWalletCollections('a').totals.refunded, 0);
});
