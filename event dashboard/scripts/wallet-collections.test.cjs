// Run: node --test scripts/wallet-collections.test.cjs
// Real SQLite queries against an in-memory database; no customer data or payments.
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
  t.after(() => db.close());
  db.exec(`
    CREATE TABLE wallets (txn_id TEXT PRIMARY KEY, event_id TEXT, payment_method TEXT, entry_fee REAL, cover_issued REAL, balance REAL, status TEXT);
    CREATE TABLE audit_log (id INTEGER PRIMARY KEY, entity_type TEXT, entity_id TEXT, action TEXT, details TEXT);
    CREATE TABLE wallet_refunds (txn_id TEXT, method TEXT, amount_paise INTEGER);
    CREATE TABLE payments (id TEXT PRIMARY KEY, txn_id TEXT, status TEXT, amount REAL, notes TEXT);
  `);
  const state = { role: 'host', issued: [] };
  const stubs = {
    'lib/db.ts': { getDb: () => db, getConfig: (_key, fallback = '') => fallback },
    'lib/events.ts': { getEvent: (id) => ['a', 'b'].includes(id) ? { id } : null },
    'lib/auth.ts': {
      requireRole: async (roles) => roles.includes(state.role) ? { name: 'Test Staff', role: state.role } : { forbidden: true, status: state.role ? 403 : 401, message: 'Not authorized' },
      getSession: async () => state.role ? { role: state.role, name: 'Test Staff' } : null,
    },
    'lib/wallet.ts': { issueWallet: async (input) => { state.issued.push(input); return { txnId: 'TEST', pin: '000000', balance: input.coverIssued, expiresAt: Date.now() }; }, listWallets: () => [] },
    'lib/whatsapp/wallet-pass-send.ts': { sendWalletPassWhatsApp: () => { throw new Error('Must not send WhatsApp'); } },
  };
  const cache = new Map();
  function load(relative) {
    const filename = path.resolve(root, relative);
    const key = path.relative(root, filename);
    if (stubs[key]) return stubs[key];
    if (cache.has(filename)) return cache.get(filename).exports;
    const module = { exports: {} };
    cache.set(filename, module);
    const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
    const localRequire = (id) => id.startsWith('@/') ? load(id.slice(2) + '.ts') : id.startsWith('.') ? load(path.resolve(path.dirname(filename), id + '.ts')) : require(id);
    vm.compileFunction(code, ['module', 'exports', 'require'], { filename })(module, module.exports, localRequire);
    return module.exports;
  }
  const wallet = (id, method = 'cash', entry = 100, cover = 1000, event = 'a', status = 'active', balance = cover) =>
    db.prepare('INSERT INTO wallets VALUES (?, ?, ?, ?, ?, ?, ?)').run(id, event, method, entry, cover, balance, status);
  const audit = (id, action, details, entityType = 'wallet') => db.prepare('INSERT INTO audit_log(entity_type,entity_id,action,details) VALUES (?,?,?,?)')
    .run(entityType, id, action, typeof details === 'string' ? details : JSON.stringify(details));
  const payment = (id, walletId, amount, status = 'captured', notes = '{"kind":"wallet_topup"}') => db.prepare('INSERT INTO payments VALUES (?,?,?,?,?)').run(id, walletId, status, amount, notes);
  return { db, state, load, wallet, audit, payment, summary: (id = 'a') => load('lib/wallet-collections.ts').getEventWalletCollections(id) };
}

test('isolates events and totals each collection method in rupees, including decimals', (t) => {
  const f = fixture(t);
  for (const [i, method] of ['cash','upi','card','online','razorpay'].entries()) f.wallet(method, method, (i + 1) * 10, (i + 1) * 100);
  f.wallet('decimal1', 'cash', 0.1, 0.2);
  f.wallet('decimal2', 'cash', 0.2, 0.1);
  f.wallet('other-event', 'cash', 999, 999, 'b');
  f.wallet('no-event', 'cash', 999, 999, null);
  const result = f.summary();
  assert.deepEqual(result.totals, { count: 7, entry: 150.3, cover: 1500.3, total: 1650.6, refunded: 0, refundCount: 0, net: 1650.6 });
  assert.deepEqual(result.methods.map((x) => x.total), [110.6, 220, 330, 440, 550]);
  assert.equal(f.summary('b').totals.total, 1998);
});

test('empty events show every method with zero, and no arbitrary row limit truncates totals', (t) => {
  const f = fixture(t);
  assert.equal(f.summary().methods.length, 5);
  assert.equal(f.summary().totals.total, 0);
  for (let i = 0; i < 230; i++) f.wallet(`wallet-${i}`, 'upi', 1, 2);
  assert.equal(f.summary().totals.count, 230);
  assert.equal(f.summary().totals.total, 690);
});

test('redemption, expiry, voids and repeat audit rows cannot change gross issue receipts', (t) => {
  const f = fixture(t);
  f.wallet('spent', 'cash', 100, 1500, 'a', 'exhausted', 0);
  f.audit('spent', 'issue_wallet', { entry: 100, cover: 1000 });
  f.audit('spent', 'issue_wallet', { entry: 100, cover: 9999 });
  f.audit('spent', 'wallet_void', { refund_amount: 100 });
  f.wallet('expired', 'card', 50, 200, 'a', 'expired', 200);
  assert.equal(f.summary().totals.total, 1350);
});

test('legacy wallets subtract only credited top-ups and tolerate malformed metadata', (t) => {
  const f = fixture(t);
  f.wallet('legacy', 'upi', 50, 1500);
  f.audit('legacy', 'issue_wallet', '{bad json');
  f.payment('credited', 'legacy', 500);
  f.payment('pending', 'legacy', 900, 'created');
  f.payment('failed', 'legacy', 900, 'failed');
  f.payment('not-topup', 'legacy', 900, 'captured', '{}');
  f.payment('bad-json', 'legacy', 900, 'captured', '{bad');
  f.payment('inactive', 'legacy', 800);
  f.audit('inactive', 'wallet_topup_after_inactive', {}, 'payment');
  assert.equal(f.summary().totals.total, 1050);
});

test('complimentary credit is excluded and unknown recorded methods remain visible as Other', (t) => {
  const f = fixture(t);
  f.wallet('comp', 'comp', 100, 5000);
  f.wallet('unknown', 'bank', 20, 80);
  f.wallet('unknown2', 'cheque', 10, 90);
  assert.equal(f.summary().totals.total, 200);
  assert.equal(f.summary().methods.find((m) => m.method === 'other').total, 200);
});

test('collections API requires staff, validates event and returns uncached aggregates only', async (t) => {
  const f = fixture(t);
  f.wallet('wallet');
  const get = f.load('app/api/wallets/collections/route.ts').GET;
  const req = (id) => ({ nextUrl: new URL('http://localhost/api/wallets/collections' + (id ? '?eventId=' + id : '')) });
  for (const role of [null, 'captain', 'cashier']) {
    f.state.role = role;
    assert.equal((await get(req('a'))).status, role ? 403 : 401);
  }
  f.state.role = 'entry';
  assert.equal((await get(req())).status, 400);
  assert.equal((await get(req('missing'))).status, 404);
  const response = await get(req('a'));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
  const body = await response.json();
  assert.equal(body.collections.totals.total, 1100);
  assert.ok(!JSON.stringify(body).includes('txn_id'));
  assert.equal((await get(req("a%27%20OR%201%3D1--"))).status, 404);
});

test('Razorpay selection records the existing collection method without starting checkout', async (t) => {
  const f = fixture(t);
  const post = f.load('app/api/wallets/route.ts').POST;
  const request = (method) => ({ json: async () => ({ name: 'Test', phone: '+12025550100', pax: 1, entryFee: 100, coverIssued: 500, paymentMethod: method, eventId: 'a' }), headers: new Headers({ host: 'localhost' }), nextUrl: new URL('http://localhost/api/wallets') });
  assert.equal((await post(request('razorpay'))).status, 200);
  assert.equal(f.state.issued.length, 1);
  assert.equal(f.state.issued[0].paymentMethod, 'razorpay');
  assert.equal((await post(request('invalid'))).status, 400);
  assert.equal(f.state.issued.length, 1);
});
