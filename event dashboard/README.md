# Akan event dashboard and backend

The backend half of the Akan Events workspace, using Next.js 15.0.3 and SQLite (`better-sqlite3`). It contains staff/admin workflows, public reservations, payments, wallets, passes, notifications, and tracking. The original local prototype README is obsolete; inspect current source and configuration for integration behavior.

Read the root [AGENTS.md](../AGENTS.md), [developer guide](../DEVELOPER_GUIDE.md), and [deployment runbook](../VPS_DEPLOYMENT_RUNBOOK.md).

```sh
npm ci
npm run dev -- -p 3001
```

Use test configuration in an untracked `.env.local` and a disposable local DB. The app auto-creates `data/eventcover.db` relative to its working directory. Integration settings may also be stored in the DB config table. Never delete production data to reset a demo.

Production uses `events-akanhyd.service` on `127.0.0.1:3200`; each release must link `data` to `/home/events.akanhyd.com/shared/data` and preserve the approved environment and signing configuration. Native dependencies must be installed/built for the server OS/runtime. This app requires persistent storage and a Node runtime.

Checks: `./node_modules/.bin/tsc --noEmit` and `npm run build`. See `src/lib/pricing.test.ts` for pricing test instructions and the root guide for functional checks. The current `next lint` script needs a verified compatible lint setup before it can provide lint coverage.
