/* Run: node --test scripts/wallet-voucher.test.cjs
 * Loads real TypeScript modules with isolated data/auth/network boundaries.
 * No database, credentials or customer messages are used.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { PDFDocument } = require('pdf-lib');
const root = path.resolve(__dirname, '../src');

function fixture(overrides = {}) {
  const config = new Map(Object.entries({ INTERAKT_API_SECRET: 'test-secret', WALLET_VOUCHER_TEMPLATE: 'test_voucher', VENUE_NAME: 'AKAN Hyderabad', ...overrides }));
  const wallet = { txn_id: 'TEST-COVER-001', name: 'Voucher Test Guest', phone: '+12025550100', cover_issued: 5000.5, entry_fee: 500, balance: 5000.5, status: 'active', expires_at: Date.now() + 86400000, event_id: 'test-event' };
  const state = { config, wallet, requests: [], audits: [], logs: [], role: 'host', response: { id: 'test-message', result: true }, status: 200, env: {}, networkError: false };
  const stubs = {
    'lib/db.ts': { getConfig: (key, fallback = '') => config.get(key) ?? fallback, setConfig: (key, value) => config.set(key, value), getAllConfig: () => Object.fromEntries(config) },
    'lib/wallet.ts': { lookupWallet: (id) => id === wallet.txn_id ? wallet : null },
    'lib/events.ts': { getEvent: () => ({ name: 'Local Demo Event' }) },
    'lib/audit.ts': { logAudit: (entry) => state.audits.push(entry) },
    'lib/auth.ts': { requireRole: async (roles) => roles.includes(state.role) ? { name: 'Test Staff', role: state.role } : { forbidden: true, status: state.role ? 403 : 401, message: 'Not authorized' } },
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
    const context = { module, exports: module.exports, require: localRequire, Buffer, URL, Date, Response, Request, Headers, AbortSignal,
      process: { env: state.env }, console: { log: (...args) => state.logs.push(args), warn: (...args) => state.logs.push(args) },
      fetch: async (url, init) => {
        state.requests.push({ url, ...init, body: JSON.parse(init.body) });
        if (state.networkError) throw new Error('offline');
        return new Response(JSON.stringify(state.response), { status: state.status });
      },
    };
    vm.compileFunction(code, Object.keys(context), { filename })(...Object.values(context));
    return module.exports;
  }
  return { ...state, state, load, send: (input = {}) => load('lib/whatsapp/wallet-pass-send.ts').sendWalletPassWhatsApp({ txnId: wallet.txn_id, origin: 'https://venue.example', format: 'pdf', force: true, ...input }) };
}

test('PDF uses document header, correct recipient, original cover only, and signed wallet link', async () => {
  const f = fixture();
  const before = JSON.stringify(f.wallet);
  const result = await f.send();
  assert.equal(result.ok, true);
  assert.equal(f.requests.length, 1);
  const { body, headers } = f.requests[0];
  assert.equal(headers.Authorization, 'Basic test-secret');
  assert.equal(body.countryCode, '+1');
  assert.equal(body.phoneNumber, '2025550100');
  assert.equal(body.template.fileName, 'Cover Voucher Issue.pdf');
  assert.deepEqual(Array.from(body.template.bodyValues.slice(0, 4)), ['Voucher Test Guest', 'AKAN Hyderabad', '5,000.50', 'TEST-COVER-001']);
  const signing = f.load('lib/signed-url.ts');
  assert.equal(signing.verifyWalletViewToken(body.template.bodyValues[4].split('/').pop()).txnId, f.wallet.txn_id);
  assert.equal(signing.verifyWalletVoucherToken(body.template.headerValues[0].split('/').pop()).txnId, f.wallet.txn_id);
  assert.equal(JSON.stringify(f.wallet), before);
  assert.equal(f.logs.length, 0);
  assert.ok(!JSON.stringify(f.audits).includes(result.passUrl));
});

test('PDF route renders the signed attachment and disallows public caching', async () => {
  const f = fixture();
  const result = await f.send();
  const token = result.passUrl.split('/').pop();
  const response = await f.load('app/api/public/wallet-voucher/[token]/route.ts').GET(null, { params: Promise.resolve({ token }) });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('content-type'), 'application/pdf');
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
  const bytes = Buffer.from(await response.arrayBuffer());
  assert.equal((await PDFDocument.load(bytes)).getPageCount(), 1);
  assert.equal(f.logs.length, 0, 'PDF must not overflow');
  if (process.env.VOUCHER_SAMPLE_PATH) fs.writeFileSync(process.env.VOUCHER_SAMPLE_PATH, bytes);
});

test('approved cover_issued uses four variables and the PDF QR ID with an IST expiry', async () => {
  const f = fixture({ WALLET_VOUCHER_TEMPLATE: 'cover_issued', WALLET_VOUCHER_TEMPLATE_LANG: 'en' });
  f.wallet.expires_at = Date.UTC(2099, 10, 3, 20, 30);
  assert.equal((await f.send({ qrCodeId: 'untrusted-display-code' })).ok, true);
  const template = f.requests[0].body.template;
  assert.equal(template.name, 'cover_issued');
  assert.equal(template.languageCode, 'en');
  assert.deepEqual(Array.from(template.bodyValues), ['Voucher Test Guest', '5,000.50', 'TEST-COVER-001', '04 Nov 2099, 02:00 am IST']);
  assert.equal(template.fileName, 'Cover Voucher Issue.pdf');
  assert.equal(f.audits[0].details.view_url_minted, false);
  for (const expiry of [null, NaN]) {
    f.wallet.expires_at = expiry;
    assert.equal((await f.send()).ok, false);
  }
  assert.equal(f.requests.length, 1);
});

test('settings require authentication and integration changes require the host', async () => {
  const f = fixture({ SESSION_SECRET: 'test-session-secret' });
  const route = f.load('app/api/config/route.ts');
  const request = (updates) => ({ json: async () => ({ updates }) });
  for (const role of [null, 'entry', 'cashier', 'captain']) {
    f.state.role = role;
    assert.equal((await route.GET()).status, role ? 403 : 401);
    assert.equal((await route.POST(request({ INTERAKT_API_SECRET: 'replacement' }))).status, role ? 403 : 401);
  }
  f.state.role = 'manager';
  assert.equal((await route.POST(request({ VENUE_NAME: 'Should not apply', INTERAKT_API_SECRET: 'replacement' }))).status, 403);
  assert.equal(f.config.get('VENUE_NAME'), 'AKAN Hyderabad');
  assert.equal(f.config.get('INTERAKT_API_SECRET'), 'test-secret');
  assert.equal((await route.POST(request({ TNC_TEXT: 'Updated terms' }))).status, 200);
  f.state.role = 'host';
  const saved = await route.POST(request({ INTERAKT_API_SECRET: 'replacement', WALLET_VOUCHER_TEMPLATE: 'cover_issued' }));
  assert.equal(saved.status, 200);
  assert.equal(saved.headers.get('cache-control'), 'private, no-store');
  const body = await saved.json();
  assert.equal(body.config.SESSION_SECRET, '••••••••');
  assert.equal(body.config.INTERAKT_API_SECRET, '••••••••');
  assert.equal(body.applied.INTERAKT_API_SECRET, '••••••••');
  await route.POST(request({ INTERAKT_API_SECRET: '••••••••' }));
  assert.equal(f.config.get('INTERAKT_API_SECRET'), 'replacement');
  assert.equal((await route.POST(request([]))).status, 400);
  assert.equal((await route.POST({ json: async () => { throw new Error('Invalid JSON'); } })).status, 400);
  assert.ok(!JSON.stringify(f.audits).includes('replacement'));
  assert.equal(f.audits[0].actor, 'Test Staff');
});

test('PDF, image and wallet-view tokens cannot impersonate one another', () => {
  const s = fixture().load('lib/signed-url.ts');
  const pdf = s.signWalletVoucherToken({ txnId: 'test' });
  const image = s.signWalletPassToken({ txnId: 'test' });
  const view = s.signWalletViewToken({ txnId: 'test' });
  assert.equal(s.verifyWalletPassToken(pdf), null);
  assert.equal(s.verifyWalletViewToken(pdf), null);
  assert.equal(s.verifyWalletVoucherToken(image), null);
  assert.equal(s.verifyWalletVoucherToken(view), null);
  assert.equal(s.verifyWalletPassToken(view), null);
  assert.equal(s.verifyWalletPassToken(image).txnId, 'test');
  for (const token of ['', pdf + '.extra', 'x' + pdf, s.signWalletVoucherToken({ txnId: 'test', ttlSeconds: -1 })]) {
    assert.equal(s.verifyWalletVoucherToken(token), null);
  }
});

test('invalid, expired, unknown and inactive vouchers cannot be fetched', async () => {
  const f = fixture();
  const route = f.load('app/api/public/wallet-voucher/[token]/route.ts');
  const s = f.load('lib/signed-url.ts');
  const get = (token) => route.GET(null, { params: Promise.resolve({ token }) });
  assert.equal((await get('invalid')).status, 401);
  assert.equal((await get(s.signWalletVoucherToken({ txnId: f.wallet.txn_id, ttlSeconds: -1 }))).status, 401);
  assert.equal((await get(s.signWalletVoucherToken({ txnId: 'missing' }))).status, 404);
  const token = s.signWalletVoucherToken({ txnId: f.wallet.txn_id });
  for (const status of ['expired', 'exhausted', 'revoked', 'flagged']) {
    f.wallet.status = status;
    assert.equal((await get(token)).status, 410);
  }
});

test('manual send is restricted to staff and validates the format', async () => {
  const f = fixture();
  const route = f.load('app/api/whatsapp/wallet-pass/[txnId]/route.ts');
  const request = (body = { format: 'pdf' }) => ({ json: async () => body, headers: new Headers({ host: 'venue.example' }), nextUrl: new URL('https://venue.example/api/whatsapp/wallet-pass/test') });
  const context = { params: Promise.resolve({ txnId: f.wallet.txn_id }) };
  for (const role of [null, 'captain', 'cashier']) {
    f.state.role = role;
    assert.equal((await route.POST(request(), context)).status, role ? 403 : 401);
  }
  assert.equal(f.requests.length, 0);
  f.state.role = 'entry';
  assert.equal((await route.POST(request({ format: 'other' }), context)).status, 400);
  const response = await route.POST(request(), context);
  assert.equal(response.status, 200);
  assert.match((await response.json()).message, /not yet confirmed/);
});

test('missing setup and local URLs do not attempt a network send', async () => {
  for (const overrides of [{ INTERAKT_API_SECRET: ' ' }, { WALLET_VOUCHER_TEMPLATE: '' }]) {
    const f = fixture(overrides);
    assert.equal((await f.send()).ok, false);
    assert.equal(f.requests.length, 0);
  }
  for (const origin of ['http://localhost:3001', 'https://127.0.0.1', 'https://192.168.1.1']) {
    const f = fixture();
    assert.equal((await f.send({ origin })).ok, false);
    assert.equal(f.requests.length, 0);
  }
});

test('a media-only HTTPS origin enables local cover_issued without publishing wallet links', async () => {
  const f = fixture({ WALLET_VOUCHER_TEMPLATE: 'cover_issued' });
  f.state.env.PUBLIC_BASE_URL = 'http://localhost:3001';
  f.state.env.WHATSAPP_MEDIA_BASE_URL = 'https://voucher-preview.example';
  assert.equal((await f.send()).ok, true);
  const template = f.requests[0].body.template;
  assert.ok(template.headerValues[0].startsWith('https://voucher-preview.example/api/public/wallet-voucher/'));
  assert.equal(template.bodyValues.length, 4);
  assert.equal(f.audits[0].details.view_url_minted, false);
  f.config.set('WALLET_VOUCHER_TEMPLATE', 'five_variable_voucher');
  assert.equal((await f.send()).ok, false, 'must not put an unusable local wallet link in the message');
  assert.equal(f.requests.length, 1);
  f.state.env.PUBLIC_BASE_URL = 'https://venue.example';
  assert.equal((await f.send()).ok, true);
  assert.ok(f.requests[1].body.template.bodyValues[4].startsWith('https://venue.example/w/'));
  for (const invalid of ['http://preview.example', 'https://127.0.0.1', 'https://user:pass@preview.example', 'invalid']) {
    f.state.env.WHATSAPP_MEDIA_BASE_URL = invalid;
    assert.equal((await f.send()).ok, false);
  }
  assert.equal(f.requests.length, 2);
});

test('provider failures allow a send retry without changing cover or balance', async () => {
  const f = fixture();
  const before = JSON.stringify(f.wallet);
  f.state.status = 429;
  f.state.response = { message: 'Rate limited' };
  assert.equal((await f.send()).ok, false);
  f.state.status = 200;
  f.state.response = { result: false, message: 'Template rejected' };
  assert.equal((await f.send()).ok, false);
  f.state.response = {};
  assert.equal((await f.send()).ok, false);
  f.state.response = null;
  assert.equal((await f.send()).ok, false);
  f.state.response = { id: 123 };
  assert.equal((await f.send()).ok, false);
  f.state.networkError = true;
  assert.equal((await f.send()).ok, false);
  f.state.networkError = false;
  f.state.response = { result: true, id: 'accepted-on-retry' };
  assert.equal((await f.send()).messageId, 'accepted-on-retry');
  assert.equal(JSON.stringify(f.wallet), before);
});

test('auto-send chooses PDF only when configured; old image templates still work', async () => {
  const f = fixture();
  assert.equal((await f.send({ force: false })).skipped, 'auto_send_off');
  f.config.set('AUTO_SEND_WHATSAPP_PASS', '1');
  f.config.set('WALLET_PASS_FORMAT', 'pdf');
  assert.equal((await f.send({ force: false, format: undefined })).ok, true);
  assert.equal(f.requests[0].body.template.fileName, 'Cover Voucher Issue.pdf');
  f.config.set('WALLET_PASS_FORMAT', 'image');
  f.config.set('WALLET_PASS_TEMPLATE_INCLUDE_LINK', '0');
  assert.equal((await f.send({ force: false, format: undefined })).ok, true);
  assert.equal(f.requests[1].body.template.fileName, undefined);
  assert.equal(f.requests[1].body.template.bodyValues.length, 2);
  assert.match(f.requests[1].body.template.headerValues[0], /\/wallet-pass\//);
});

test('phone country codes match supported customer countries', () => {
  const split = fixture().load('lib/providers/whatsapp/interakt.ts').splitPhone;
  for (const prefix of ['+91', '+1', '+44', '+971', '+65', '+61', '+966']) {
    assert.equal(split(prefix + '2025550100').countryCode, prefix);
    assert.equal(split(prefix + '2025550100').phoneNumber, '2025550100');
  }
});
