const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { createVoucherProxy } = require('./voucher-preview-proxy.cjs');
const voucherPath = `/api/public/wallet-voucher/c3ludGhldGlj.${'a'.repeat(43)}`;
const pdf = Buffer.from('%PDF-1.7\nsynthetic test content');

async function setup(t, responseHandler) {
  const requests = [];
  const upstream = http.createServer((req, res) => {
    requests.push({ path: req.url, headers: req.headers });
    responseHandler(req, res);
  });
  await new Promise((resolve) => upstream.listen(0, '127.0.0.1', resolve));
  const proxy = createVoucherProxy({ dashboardPort: upstream.address().port });
  await new Promise((resolve) => proxy.listen(0, '127.0.0.1', resolve));
  t.after(async () => {
    proxy.closeAllConnections(); upstream.closeAllConnections();
    await Promise.all([proxy, upstream].map(server => new Promise(resolve => server.close(resolve))));
  });
  return {
    requests,
    request: (path, method = 'GET', headers = {}) => new Promise((resolve, reject) => {
      const req = http.request({ hostname: '127.0.0.1', port: proxy.address().port, path, method, headers }, res => {
        const chunks = [];
        res.on('data', chunk => chunks.push(chunk));
        res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) }));
      });
      req.on('error', reject);
      req.end();
    }),
  };
}

test('only exact voucher GET/HEAD paths reach the dashboard; all other routes and methods are blocked', async t => {
  const f = await setup(t, (_req, res) => { res.writeHead(200, { 'Content-Type': 'application/pdf' }); res.end(pdf); });
  for (const path of ['/', '/admin', '/login', '/api/config', '/api/wallets', '/w/token', '/_next/static/test.js',
    voucherPath + '?x=1', voucherPath + '/extra', '/api/public/wallet-voucher/%2e%2e/config',
    '/api/public/wallet-voucher/../config', '/api/public/wallet-voucher/invalid', 'http://example.com' + voucherPath]) {
    assert.equal((await f.request(path)).status, 404, path);
  }
  for (const method of ['POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']) {
    assert.equal((await f.request(voucherPath, method)).status, 404);
  }
  assert.equal(f.requests.length, 0);
  assert.equal((await f.request(voucherPath)).status, 200);
  const head = await f.request(voucherPath, 'HEAD');
  assert.equal(head.status, 200);
  assert.equal(head.body.length, 0);
  assert.equal(Number(head.headers['content-length']), pdf.length);
});

test('does not forward credentials or allow upstream cookies and private headers into the response', async t => {
  const f = await setup(t, (_req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/pdf', 'Set-Cookie': 'private=value', 'X-Internal': 'private' });
    res.end(pdf);
  });
  const result = await f.request(voucherPath, 'GET', {
    Authorization: 'Bearer test', Cookie: 'session=test', Host: 'untrusted.example', 'X-Forwarded-Host': 'untrusted.example',
  });
  assert.equal(result.status, 200);
  assert.deepEqual(result.body, pdf);
  assert.equal(f.requests[0].headers.authorization, undefined);
  assert.equal(f.requests[0].headers.cookie, undefined);
  assert.equal(f.requests[0].headers['x-forwarded-host'], undefined);
  assert.match(f.requests[0].headers.host, /^127\.0\.0\.1:/);
  assert.equal(result.headers['set-cookie'], undefined);
  assert.equal(result.headers['x-internal'], undefined);
  assert.equal(result.headers['cache-control'], 'private, no-store');
});

test('invalid/expired tokens remain rejected; redirects and unexpected content are never published', async t => {
  let mode = 401;
  const f = await setup(t, (_req, res) => {
    if (typeof mode === 'number') {
      res.writeHead(mode, { Location: '/api/config' }); res.end('private error details');
    } else {
      res.writeHead(200, { 'Content-Type': mode === 'html' ? 'text/html' : 'application/pdf' });
      res.end(mode === 'large' ? Buffer.alloc(2 * 1024 * 1024 + 1) : 'not a PDF');
    }
  });
  for (mode of [401, 404, 410, 302, 500, 'html', 'fake-pdf', 'large']) {
    const response = await f.request(voucherPath);
    assert.equal(response.status, [401, 404, 410].includes(mode) ? mode : 502);
    assert.equal(response.body.toString(), 'Voucher unavailable.');
  }
  assert.equal(f.requests.length, 8, 'redirects must not produce additional requests');
});
