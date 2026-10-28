# Developer and coding-platform guide

## Architecture and source of truth

Read the root [AGENTS.md](AGENTS.md) and [deployment runbook](VPS_DEPLOYMENT_RUNBOOK.md). The runbook records a server inspection on 2026-06-29; reconfirm infrastructure before deployment. Older planning files and prototype handoffs may describe a single app or missing integrations and must not override the deployed layout.

| Concern | Source |
|---|---|
| Public pages | `akan-events-app/app/` |
| Public event data/marketing | `akan-events-app/lib/` |
| Public server-to-server API proxy | `akan-events-app/app/api/dashboard/_proxy.ts` and sibling routes |
| Admin and secondary public booking UI | `event dashboard/src/app/`, `src/components/` |
| Backend API handlers | `event dashboard/src/app/api/` |
| DB schema/init/migrations | `event dashboard/src/lib/db.ts` |
| Wallet issue/redemption and money limits | `src/lib/wallet.ts`, `redemption.ts`, `money.ts` in dashboard |
| Reservation ledger/check-in | Dashboard `src/lib/reservations.ts`, `reservation-ledger.ts`, `reservation-checkin.ts` |
| Payments and signatures | Dashboard `src/lib/razorpay.ts`, `src/app/api/payments/`, public wallet top-up APIs |
| QR/pass signing and generation | Dashboard `src/lib/signed-url.ts`, `src/lib/pdf/` |
| Delivery and tracking | Dashboard `src/lib/notifications.ts`, `meta-pixel.ts`; public `lib/marketing.ts` |

Do not assume two apps with similar route names are interchangeable. `/event/[id]` in the public app and `/event/[slug]` in the dashboard have distinct implementations. Check proxy/vhost routing for the actual request path.

## Local setup

Use npm and each application's committed `package-lock.json`. The recorded server runtime is Node 20.20.2; validate native `better-sqlite3` compatibility on the actual target runtime/OS. Do not copy macOS `node_modules` to Linux.

From the repository root, install independently:

```sh
(cd akan-events-app && npm ci)
(cd 'event dashboard' && npm ci --legacy-peer-deps)
```

The dashboard pins a React 19 prerelease that does not satisfy Tiptap's stable
React peer range. `--legacy-peer-deps` installs the committed lockfile without
upgrading either framework. The public app uses ordinary `npm ci`.

Create untracked `.env.local` files from approved configuration, using test credentials only. In the public application set `DASHBOARD_API_BASE=http://127.0.0.1:3001`. Leave `ASSET_PREFIX` unset for ordinary local development. The proxy currently falls back to `http://localhost:3001`; production must explicitly use its configured upstream.

Start these in separate terminals:

```sh
cd 'event dashboard'
npm run dev -- -p 3001
```

```sh
cd akan-events-app
npm run dev -- -p 3000
```

Visit the public UI on port 3000 and dashboard on port 3001. The local dashboard auto-creates `data/eventcover.db` and initializes its schema. Use synthetic guests and a disposable DB; never copy production customer data into a coding platform. Session and integration settings can also reside in the DB config table, so environment files are not the complete configuration inventory.

The public app's HTTPS redirect runs only in production. Development uses HTTP;
Next.js can populate `x-forwarded-proto: http` even for direct local requests.

## Checks before shipping

Run from the repository root:

```sh
(cd akan-events-app && ./node_modules/.bin/tsc --noEmit)
(cd akan-events-app && npm run lint)
(cd akan-events-app && npm run build)
(cd 'event dashboard' && ./node_modules/.bin/tsc --noEmit)
(cd 'event dashboard' && npm run build)
git diff --check
```

Dashboard pricing tests use `node:test` and require a TypeScript runner such as `tsx`, as described in `src/lib/pricing.test.ts`. Do not treat the dashboard's `next lint` script as verified lint coverage: confirm a supported lint configuration before relying on it. Public builds fetch Google fonts via `next/font`; restricted network access can prevent a build. Report failures and distinguish environment limitations from code failures.

### Issue Cover collection summary

`/admin/issue` displays collections for the selected event using authenticated
`GET /api/wallets/collections?eventId=...` (host/manager/entry). It returns only
aggregate counts and amounts, with private/no-store caching. The summary refreshes
when the event changes, after wallet issue, on window focus, or via Refresh.

Gross amounts are wallet-issue receipts (entry plus cover), before refunds.
The summary also shows recorded refunds and net collections overall and per
payment method. Refunds are deducted from the method used to return money, which
may differ from the original collection method (and can make that method negative).
They include exhausted/expired wallets because redemption does not undo a
collection. Complimentary wallets and later top-ups are excluded. The original
`issue_wallet` audit snapshot supplies entry/cover amounts; legacy wallets without
a snapshot fall back to stored values minus successfully credited wallet top-ups.
All arithmetic aggregates integer paise before returning INR amounts. Unknown
recorded methods appear as Other instead of disappearing from the total.

Cash, UPI, Card, Online and Razorpay use the recorded wallet payment method.
The existing Razorpay choice now passes server validation for recording a payment
already collected; it does not initiate checkout or verify a gateway payment.
Historical Online rows remain Online. Existing general analytics combine newly
recorded Razorpay wallets with Online; this event summary displays them separately.
Refunds use the additive ledger described below. Tests:
`node --test scripts/wallet-collections.test.cjs` in the dashboard.

### Staff-paid cover refunds

In **Issue Cover → Refunds**, select an event, find a paid wallet and record money
already returned to the guest. `GET /api/wallets/refunds` supports event-scoped
name/phone/cover-ID search, 20 recent matching wallets, and refund-history pages
of 50 (`offset`). Host/manager/entry may read it; only the actual host role may
`POST`, even with custom page grants. The UI captures amount, payout method,
reason, reference (required for non-cash), and confirmation that staff paid it.
This workflow does not contact Razorpay, move money, or send notifications.

The `wallet_refunds` table is initialized additively by `db.ts` via
`wallet-refund-schema.ts`; amounts and before/after balances are integer paise.
It preserves the original receipt and records operator ID/name, timestamp,
request ID and a `wallet_refund` audit. An immediate SQLite transaction commits
the ledger, audit and wallet debit together. Retrying the same request and
payload returns the original record; a conflicting payload returns 409.

Only unused original entrance cover is refundable here. The limit is the lower
of current balance and original issue cover minus previously recorded refunds.
Entry fees, complimentary wallets and top-ups are excluded. Expired unused
cover may be returned without reactivating the wallet; revoked/flagged/voided
wallets are blocked. A fully debited active wallet becomes exhausted. Historical
void audits are **not** automatically converted to refunds: those actions did
not prove that money was returned. Void now explicitly records no refund and
rejects the obsolete `refundAmount` parameter; use the refund workflow instead.

Refunds appear as negative movements in Transaction History with their own
filter and refunded total, as well as the event's detailed refund history.
General analytics receipts remain gross; use Issue Cover for event net amounts.
Tests: `node --test scripts/wallet-refunds.test.cjs scripts/wallet-collections.test.cjs`.
They exercise real disposable SQLite transactions, partial/full refunds, retries,
audit rollback, permissions, top-up limits and redemption racing a refund.

Back up the persistent DB before deploying, as in the runbook. This migration
adds a table/indexes and leaves existing rows unchanged. Older code can run with
the added table, but will omit refund records/totals; wallet balances already
debited remain debited. Prefer a forward fix after refunds have been recorded;
never restore an old DB to undo a code release.

### WhatsApp cover vouchers

After issuing a wallet, staff can select **Send voucher on WhatsApp** in `/admin/issue`.
It sends a PDF to the phone stored on that wallet through the existing staff-only
`POST /api/whatsapp/wallet-pass/[txnId]` endpoint with `{ "format": "pdf" }`.
Retries send the existing voucher; they do not issue or credit another wallet.
An accepted API request is not proof of delivery: check Interakt's delivery status.

In **Settings → WhatsApp**, configure the existing Interakt credentials and an
approved **Document** header template (`WALLET_VOUCHER_TEMPLATE`, language in
`WALLET_VOUCHER_TEMPLATE_LANG`, default `en`). Akan's existing approved utility
template is `cover_issued` (English `en`), verified in Interakt on 2026-10-28. It
has a Document header, no buttons and four body variables: customer name, cover
amount in INR (excluding entry fees), QR/transaction ID, expiry formatted in IST.
The ID matches the attached PDF's QR. Missing expiry blocks this template;
client-supplied display IDs are not used. Its approved text has no wallet link.

Other document template names retain the five-variable contract: customer name,
venue name, cover amount in INR, cover ID, signed wallet balance/top-up URL.
The settings page provides the proposed text for that separate approval. Interakt sends
the attachment filename `Cover Voucher Issue.pdf`. See the
[Interakt template API](https://www.interakt.shop/resource-center/how-to-send-whatsapp-templates-using-apis-webhooks/)
for the document `headerValues` and `fileName` contract.

For automatic delivery, enable `AUTO_SEND_WHATSAPP_PASS` and select PDF
(`WALLET_PASS_FORMAT=pdf`). Existing installations default to `image` and retain
their existing image-template configuration. PDF template names default to empty
until an approved template is configured; no credentials or automatic sending
are enabled by this change. Rolling back requires switching automatic format to
`image` first; the additional config rows can remain in the existing database.

`/api/config` now requires authenticated host/manager access (or existing
explicit page grants). Integration writes additionally require the actual host
role, and mixed unauthorized batches are rejected before any writes. Session
and integration secrets are masked in responses; responses are private/no-store.
Public branding continues to use the separate `/api/branding` allow-list.

Interakt must reach the dashboard's public HTTPS origin (`PUBLIC_BASE_URL`, then
`NEXT_PUBLIC_BASE_URL`, otherwise the forwarded request origin). Local/private
origins are rejected before sending. The new media endpoint is
`GET /api/public/wallet-voucher/[token]`: a separate HMAC purpose, 24-hour expiry,
no PIN in the token, no public caching, and an active-wallet check. Keep the
existing `INTERNAL_TOKEN_SECRET` stable and redact signed paths from access logs.
The existing PNG endpoint and wallet-view token remain separate.

Run `node --test scripts/wallet-voucher.test.cjs` in the dashboard. Tests load the
real sender, provider, token verifiers and PDF route against isolated data/auth
and a simulated Interakt response; they never send messages or touch a database.
For a visual QA sample, set `VOUCHER_SAMPLE_PATH` to an ignored local PDF path.
Live delivery still requires testing an approved template on the deployed HTTPS
site with an explicitly authorized recipient.

For local PDF delivery testing, `WHATSAPP_MEDIA_BASE_URL` can override only the
attachment origin. Keep `PUBLIC_BASE_URL`/`NEXT_PUBLIC_BASE_URL` on localhost so
admin/login behavior stays local. Templates containing a wallet link still need
a public website origin; Akan's four-variable `cover_issued` template has no link
and can use a media-only preview. Production behavior is unchanged when the
override is absent. Remove the override when the temporary preview ends.

`node scripts/voucher-preview-proxy.cjs` starts a loopback-only listener on 3002,
forwarding to the local dashboard on 3001. It permits only GET/HEAD requests to
the exact `/api/public/wallet-voucher/<signed-token>` path; the dashboard still
verifies the HMAC, expiry and wallet state. Other routes/methods are rejected,
incoming cookies/auth headers are discarded, redirects are not followed, and
only bounded PDF responses are returned. It does not log signed request paths.
Run `node --test scripts/voucher-preview-proxy.test.cjs` for the access checks.

After explicit authorization to expose test vouchers, a temporary HTTPS tunnel
may target **3002 only**. Do not tunnel the full dashboard on 3001. Set its origin
as `WHATSAPP_MEDIA_BASE_URL` in the untracked local env and restart the dashboard.
The tunnel provider and Interakt can process the voucher's contents; anyone with
the full signed link can fetch it while valid. Use synthetic vouchers and an
authorized test recipient. Stop the tunnel and proxy after testing. Never copy
production data into this setup or bypass the attachment HTTPS check.

For functional changes, use a staging/disposable database and test the affected paths: event list/detail and reservation (free and paid where applicable), public-to-dashboard proxy, admin login/roles, pass downloads and QR scanning, wrong/expired tokens, wallet issue/redeem/top-up, failed/repeated payment verification, and email/WhatsApp delivery. Exercise amount boundaries and concurrent/repeated operations for balance changes. Do not place real charges or send live guest notifications during automated checks.

## Contracts to preserve

- `ASSET_PREFIX` is build-time configuration. The public production build needs `/_publicapp` before `npm run build`; merely changing runtime env cannot fix already-built asset paths.
- The dashboard is a Node server with a writable persistent SQLite directory. An ephemeral/serverless preview can demonstrate the public UI, but cannot be treated as an equivalent dashboard deployment.
- Money is generally represented as INR rupees in application logic; payment gateway order amounts use paise. Preserve existing conversions, entry/cover separation, two-decimal handling, and the Rs 100,000 wallet cap. Validate on the server even when the UI has input bounds.
- Preserve signed-token purpose separation and stable signing configuration across releases. Rotating signing material can invalidate outstanding guest links.
- Verify Razorpay signatures and idempotency before mutating ledgers. Provider retries must not create duplicate credits/reservations or notifications.
- Reservation QR/PDF URLs contain signed tokens; keep them out of logs, examples, and public caches. Test printable/downloaded passes and actual scans, not just response status.
- Browser Pixel and Meta CAPI must agree on custom event names and deduplication IDs. Review `NEXT_PUBLIC_META_TEST_EVENT_CODE` and dashboard `META_TEST_EVENT_CODE` (DB config). The current public layout has a hardcoded test-code fallback; inspect it before a production release rather than assuming an empty env value disables testing.
- SMTP, Razorpay, WhatsApp, ReserveGo, Meta, and webhook configuration must stay private. Inspect environment and DB-based config through approved channels; never commit real keys. Review existing hardcoded integration defaults before using them for a new environment.

## GitHub and release workflow

`origin` is https://github.com/akanhyderabad/akan-event-manager. The additional `reviewer` remote points elsewhere. Confirm remote and branch before pushing. Use feature branches and PRs for future work when practical; never force-push shared history as a routine update.

A GitHub push stores source; this repo contains no checked-in GitHub Actions deployment workflow. Production uses release directories and `current` symlinks, not a git checkout. Follow the runbook, record the full source commit in each release, preserve shared state, and validate both apps when their contracts change. Configure hosted coding tools with the correct application subdirectory and separate build commands. They must not automatically migrate production to their default hosting target.
