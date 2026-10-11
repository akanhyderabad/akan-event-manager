# Instructions for developers and coding agents

These instructions apply to the entire workspace, including AI/vibe coding platforms. Read [DEVELOPER_GUIDE.md](DEVELOPER_GUIDE.md) and [VPS_DEPLOYMENT_RUNBOOK.md](VPS_DEPLOYMENT_RUNBOOK.md) before making changes. Also read any instructions in the application you edit; `akan-events-app/AGENTS.md` adds version-specific Next.js rules.

## Preserve the deployed architecture

- This is a two-app repository. Public code belongs in `akan-events-app/`; admin, business logic, persistence, and backend APIs belong in `event dashboard/`. Do not merge the apps or deploy the repository root as one Next.js project by default.
- Production is recorded as OpenLiteSpeed plus systemd: public port 3201, dashboard port 3200, both bound to 127.0.0.1. Do not substitute PM2, nginx, a static export, or ephemeral/serverless storage without an explicit architecture migration.
- Preserve `ASSET_PREFIX=/_publicapp` for the public production build. Dashboard assets use `/_next`. Preserve public `/api/dashboard/*` proxies and their server-side upstream configuration.
- Do not touch the unrelated corporate `akan-backend` PM2 process or port 5001.

## Protect data and integration contracts

- Never delete, reset, reseed, overwrite, or commit production SQLite data. Dashboard storage is `process.cwd()/data/eventcover.db`; releases must link `data` to the existing persistent directory before serving requests.
- Schema initialization/migrations run in `event dashboard/src/lib/db.ts`. Make changes compatible with existing rows, back up before migration, and document rollback implications. Use a disposable local DB for validation.
- Preserve authentication, roles, HMAC token purpose/expiry checks, PIN validation/lockout, transactional balance updates, payment signature verification, and idempotency. Client-side validation is supplementary to server validation.
- Keep rupees and Razorpay paise conversions explicit. Keep entry fees and redeemable cover separate; respect the wallet cap in `src/lib/money.ts`.
- Public and dashboard reservation flows both exist. Trace each affected route, proxy, UI, and notification when changing their shared contracts.
- Keep external integration failures from losing bookings or double-crediting payments. Review browser/Meta CAPI event names and IDs together to preserve deduplication. Test-event configuration requires explicit review before production.
- Never add credentials, customer records, real pass URLs, `.env.local`, DB files, or dependency/build output to Git. Use placeholders in docs and examples; do not print local secret values.

## Before completing a change

1. Inspect `git status` and the existing diff; preserve work already present. Use `origin` (`akanhyderabad/akan-event-manager`) as the intended remote; `reviewer` is a separate repository.
2. Make focused changes; do not silently upgrade either application's framework/dependencies, replace the database, or redesign hosting.
3. Run the relevant checks in each changed application. Both apps must build for changes spanning them. Add meaningful regression coverage for payment, balance, reservation, or security changes. Report any checks that could not run.
4. Review staged files for secrets and generated data. Describe changed behavior, validation, required env/config, and deployment impact.
5. Update the developer guide/runbook if architecture, routes, storage, services, or release requirements change. A Git push does not authorize a separate production deployment.
