/* Local development only. Tunnel this listener, never the full dashboard.
 * node scripts/voucher-preview-proxy.cjs
 * Accepts only signed PDF GET/HEAD paths; the dashboard verifies the token.
 * No credentials, cookies, arbitrary paths or request logs are forwarded.
 */
const http = require('node:http');

const VOUCHER_PATH = /^\/api\/public\/wallet-voucher\/[A-Za-z0-9_-]{1,2048}\.[A-Za-z0-9_-]{43}$/;
const MAX_PDF_BYTES = 2 * 1024 * 1024;
const SAFE_HEADERS = {
  'Cache-Control': 'private, no-store',
  'X-Robots-Tag': 'noindex, nofollow',
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
};

function createVoucherProxy({ dashboardPort = 3001 } = {}) {
  let pending = 0;
  const server = http.createServer((req, res) => {
    const reply = (status, message) => {
      if (res.destroyed || res.writableEnded) return;
      res.writeHead(status, { ...SAFE_HEADERS, 'Content-Type': 'text/plain; charset=utf-8' });
      res.end(req.method === 'HEAD' ? undefined : message);
    };
    // Match the raw target before URL decoding/normalization. Query strings,
    // encoded slashes, dot segments and absolute URLs are not accepted.
    if (!['GET', 'HEAD'].includes(req.method) || !VOUCHER_PATH.test(req.url || '')) {
      reply(404, 'Not found.');
      return;
    }
    if (pending >= 8) { reply(503, 'Please try again.'); return; }
    pending += 1;
    let finished = false;
    const finish = () => { if (!finished) { finished = true; pending -= 1; } };
    res.once('close', finish);
    // Pin the upstream to loopback and discard ALL incoming request headers.
    const upstream = http.get({
      hostname: '127.0.0.1', port: dashboardPort, path: req.url,
      headers: { Accept: 'application/pdf' }, timeout: 15000,
    }, (response) => {
      if (response.statusCode !== 200) {
        const status = [401, 404, 410].includes(response.statusCode) ? response.statusCode : 502;
        reply(status, 'Voucher unavailable.');
        response.resume();
        return;
      }
      if (response.headers['content-type']?.split(';')[0].trim() !== 'application/pdf') {
        reply(502, 'Voucher unavailable.');
        response.destroy();
        return;
      }
      const chunks = [];
      let bytes = 0;
      response.on('data', (chunk) => {
        bytes += chunk.length;
        if (bytes > MAX_PDF_BYTES) {
          reply(502, 'Voucher unavailable.');
          response.destroy();
        } else { chunks.push(chunk); }
      });
      response.on('error', () => reply(502, 'Voucher unavailable.'));
      response.on('end', () => {
        if (res.destroyed || res.writableEnded) return;
        const pdf = Buffer.concat(chunks);
        if (pdf.subarray(0, 5).toString('ascii') !== '%PDF-') { reply(502, 'Voucher unavailable.'); return; }
        res.writeHead(200, {
          ...SAFE_HEADERS, 'Content-Type': 'application/pdf',
          'Content-Disposition': 'inline; filename="Cover Voucher Issue.pdf"',
          'Content-Length': pdf.length,
        });
        res.end(req.method === 'HEAD' ? undefined : pdf);
      });
    });
    upstream.on('timeout', () => upstream.destroy());
    upstream.on('error', () => reply(502, 'Voucher unavailable.'));
    res.once('close', () => upstream.destroy());
  });
  server.requestTimeout = 10000;
  server.headersTimeout = 5000;
  server.maxHeadersCount = 30;
  server.maxConnections = 20;
  return server;
}

module.exports = { createVoucherProxy };

if (require.main === module) {
  createVoucherProxy().listen(3002, '127.0.0.1', () => {
    console.log('Voucher preview proxy listening on http://127.0.0.1:3002 (PDF downloads only).');
  });
}
