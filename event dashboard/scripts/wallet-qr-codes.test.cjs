// Disposable SQLite only. No real customers, credentials, payments or messages.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const Database = require('better-sqlite3');
const root = path.resolve(__dirname, '../src');

function fixture(t, filename = ':memory:') {
  const db = new Database(filename);
  db.pragma('foreign_keys = ON');
  t.after(() => db.close());
  db.exec(`
    CREATE TABLE guests (id TEXT PRIMARY KEY, name TEXT, phone TEXT, email TEXT, pax INTEGER, source TEXT, created_at INTEGER);
    CREATE TABLE wallets (txn_id TEXT PRIMARY KEY, guest_id TEXT REFERENCES guests(id),
      entry_fee REAL, cover_issued REAL, balance REAL, payment_method TEXT, pin_hash TEXT,
      status TEXT, issued_by TEXT, issued_at INTEGER, expires_at INTEGER, table_id TEXT,
      event_id TEXT, reservation_id TEXT, pin_fail_count INTEGER DEFAULT 0, pin_locked_until INTEGER);
    CREATE TABLE redemptions (id TEXT PRIMARY KEY, txn_id TEXT, amount REAL, balance_before REAL,
      balance_after REAL, captain TEXT, order_ref TEXT, notes TEXT, status TEXT, created_at INTEGER);
    INSERT INTO guests (id, name, phone) VALUES ('guest', 'Synthetic Guest', '+12025550100');
  `);
  const state = { role: 'captain', lookups: 0, audits: [], nextId: 0 };
  const cache = new Map();
  function load(relative) {
    const filename = path.resolve(root, relative);
    const key = path.relative(root, filename);
    if (key === 'lib/db.ts') return { getDb: () => db, getConfig: (k, fallback = '') => k === 'EVENT_DATE' ? '2099-11-01' : fallback };
    if (key === 'lib/auth.ts') return {
      requireRole: async (roles) => roles.includes(state.role) ? { name: 'Test Staff', role: state.role }
        : { forbidden: true, status: state.role ? 403 : 401, message: 'Not authorized' },
      getSession: async () => state.role ? { name: 'Test Staff', role: state.role } : null,
    };
    if (key === 'lib/audit.ts') return { logAudit: (entry) => state.audits.push(entry) };
    if (key === 'lib/tables.ts' || key === 'lib/reservations.ts') return {};
    if (key === 'lib/events.ts') return { getEvent: () => ({ event_date: '2099-11-01', cutoff_hour: 2 }) };
    if (key === 'lib/crypto.ts') return { generateTxnId: () => `AKA-1101-TEST${++state.nextId}`,
      generatePin: () => '654321', hashPin: async () => 'synthetic-hash',
      verifyPin: async (pin) => pin === '654321', generateRedemptionId: () => `RED-${++state.nextId}` };
    if (cache.has(filename)) return cache.get(filename).exports;
    const module = { exports: {} }; cache.set(filename, module);
    const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: {
      module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true,
    } }).outputText;
    const localRequire = (id) => id.startsWith('@/') ? load(id.slice(2) + '.ts')
      : id.startsWith('.') ? load(path.resolve(path.dirname(filename), id + '.ts')) : require(id);
    vm.compileFunction(code, ['module', 'exports', 'require'], { filename })(module, module.exports, localRequire);
    return module.exports;
  }
  const codes = load('lib/wallet-qr-codes.ts');
  codes.initWalletQrCodeSchema(db);
  const wallet = (id) => db.prepare(`INSERT INTO wallets
    (txn_id,guest_id,entry_fee,cover_issued,balance,payment_method,pin_hash,status,issued_at,expires_at)
    VALUES (?, 'guest', 100, 2000, 2000, 'cash', 'synthetic-hash', 'active', ?, ?)`)
    .run(id, Date.now(), Date.now() + 86400000);
  const issue = () => load('lib/wallet.ts').issueWallet({ name: 'New Synthetic Guest', phone: '+12025550100',
    entryFee: 100, coverIssued: 2000, paymentMethod: 'cash', issuedBy: 'Test Staff' });
  const get = (reference) => load('app/api/wallets/[txnId]/route.ts').GET(null, { params: Promise.resolve({ txnId: reference }) });
  return { db, state, codes, wallet, issue, get, load };
}

test('additive migration preserves legacy wallets; codes are unique, stable and five digits', (t) => {
  const f = fixture(t);
  f.wallet('AKA-1101-LEGACY');
  const before = f.db.prepare('SELECT * FROM wallets').get();
  f.codes.initWalletQrCodeSchema(f.db);
  const code = f.codes.ensureWalletQrCode(f.db, before.txn_id);
  assert.match(code, /^[1-9]\d{4}$/);
  assert.equal(f.codes.ensureWalletQrCode(f.db, before.txn_id), code);
  assert.equal(f.codes.resolveWalletQrCode(f.db, code), before.txn_id);
  assert.deepEqual(f.db.prepare('SELECT * FROM wallets').get(), before);
  const seen = new Set([code]);
  for (let i = 0; i < 100; i++) {
    f.wallet(`LEGACY-${i}`);
    seen.add(f.codes.ensureWalletQrCode(f.db, `LEGACY-${i}`));
  }
  assert.equal(seen.size, 101);
  assert.throws(() => f.codes.ensureWalletQrCode(f.db, 'missing'), /not found/);
});

test('allocation is serialized between database connections and numbers are never recycled', (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'akan-qr-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const filename = path.join(dir, 'test.db');
  const f = fixture(t, filename);
  const other = new Database(filename, { timeout: 0 });
  t.after(() => other.close());
  f.wallet('first'); f.wallet('second');
  let first;
  f.db.transaction(() => {
    first = f.codes.ensureWalletQrCode(f.db, 'first');
    assert.throws(() => f.codes.ensureWalletQrCode(other, 'second'), /locked/);
  }).immediate();
  const second = f.codes.ensureWalletQrCode(other, 'second');
  assert.notEqual(first, second);
  f.db.prepare('DELETE FROM wallet_qr_codes WHERE txn_id = ?').run('second');
  f.wallet('third');
  const third = f.codes.ensureWalletQrCode(other, 'third');
  assert.notEqual(third, second);
  assert.equal(f.codes.resolveWalletQrCode(other, first), 'first');
});

test('issuing persists a separate code atomically; exhaustion rolls back guest and wallet', async (t) => {
  const f = fixture(t);
  const issued = await f.issue();
  assert.match(issued.qrCodeId, /^[1-9]\d{4}$/);
  assert.notEqual(issued.qrCodeId, issued.pin);
  assert.match(issued.txnId, /^AKA-/);
  assert.equal(f.codes.resolveWalletQrCode(f.db, issued.qrCodeId), issued.txnId);
  f.db.prepare("UPDATE sqlite_sequence SET seq = 89999 WHERE name = 'wallet_qr_codes'").run();
  const last = await f.issue();
  assert.equal(last.qrCodeId, '99999');
  const counts = () => [f.db.prepare('SELECT COUNT(*) n FROM guests').get().n, f.db.prepare('SELECT COUNT(*) n FROM wallets').get().n];
  const before = counts();
  await assert.rejects(f.issue(), /five-digit cover IDs have been used/);
  assert.deepEqual(counts(), before);
  assert.equal(f.codes.ensureWalletQrCode(f.db, issued.txnId), issued.qrCodeId);
});

test('staff can look up either ID; unauthenticated and unauthorized lookups are denied', async (t) => {
  const f = fixture(t);
  const issued = await f.issue();
  for (const reference of [issued.txnId, issued.qrCodeId]) {
    const response = await f.get(reference);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'private, no-store');
    const { wallet } = await response.json();
    assert.equal(wallet.txnId, issued.txnId);
    assert.equal(wallet.qrCodeId, issued.qrCodeId);
    assert.equal(wallet.balance, 2000);
    assert.equal(wallet.pin_hash, undefined);
  }
  assert.equal((await f.get('99998')).status, 404);
  for (const role of [null, 'unrecognized']) {
    f.state.role = role;
    assert.equal((await f.get(issued.qrCodeId)).status, role ? 403 : 401);
  }
});

test('short-code lookup preserves PIN checks, lockout and canonical redemption records', async (t) => {
  const f = fixture(t);
  const issued = await f.issue();
  const { wallet } = await (await f.get(issued.qrCodeId)).json();
  const route = f.load('app/api/wallets/[txnId]/redeem/route.ts');
  const redeem = (pin) => route.POST({ json: async () => ({ pin, amount: 100 }) }, { params: Promise.resolve({ txnId: wallet.txnId }) });
  assert.equal((await redeem(issued.qrCodeId)).status, 400, 'reference is not the PIN');
  const success = await redeem(issued.pin);
  assert.equal(success.status, 200);
  assert.equal((await success.json()).balanceAfter, 1900);
  assert.equal(f.db.prepare('SELECT txn_id FROM redemptions').get().txn_id, issued.txnId);
  for (let i = 0; i < 3; i++) await redeem('000000');
  assert.equal((await redeem(issued.pin)).status, 400, 'PIN lockout still applies');
  assert.equal(f.db.prepare('SELECT balance FROM wallets').get().balance, 1900);
  assert.equal(f.codes.ensureWalletQrCode(f.db, issued.txnId), issued.qrCodeId);
});
