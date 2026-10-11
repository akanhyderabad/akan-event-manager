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
(cd 'event dashboard' && npm ci)
```

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
