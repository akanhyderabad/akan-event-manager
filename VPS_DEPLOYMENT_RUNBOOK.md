# VPS Deployment Runbook — events.akanhyd.com (recorded topology)

> This document records the deployment verified by SSH on **2026-06-29**.
> Documentation reviewed against repository source on **2026-10-11**; the server was
> not re-inspected during that review. Verify current units, paths, routing, and runtime
> before deploying. See [AGENTS.md](AGENTS.md) and [DEVELOPER_GUIDE.md](DEVELOPER_GUIDE.md).
> It supersedes the earlier planning draft (which proposed a single unified app on PM2
> port 5002 — that plan was NOT followed). The real deployment uses **two separate
> Next.js apps managed by systemd** behind OpenLiteSpeed.

## 1) Server

- Host: `89.116.21.19` (Hostinger), hostname `srv1527568.hstgr.cloud`
- OS: AlmaLinux 9 (kernel 5.14)
- Access: `ssh root@89.116.21.19` (key: local `~/.ssh/id_rsa`)
- Web server: OpenLiteSpeed (ports 80 / 443)
- Control panel: CyberPanel (port 8090), OLS admin (7080)
- Site user: `event5757`, domain home: `/home/events.akanhyd.com`
- Process manager for events apps: **systemd** (NOT PM2)
- Unrelated: PM2 runs `akan-backend` on `127.0.0.1:5001` (corporate site) — DO NOT TOUCH.

## 2) The two apps

| | Public events page | Admin dashboard |
|---|---|---|
| systemd unit | `events-public.service` | `events-akanhyd.service` |
| Port (loopback) | `127.0.0.1:3201` | `127.0.0.1:3200` |
| App dir (`current` symlink) | `/home/events.akanhyd.com/public-app/current` | `/home/events.akanhyd.com/app/current` |
| Framework | Next.js 16.2.6 | Next.js 15.0.3 (the "eventcover" dashboard) |
| Node runtime | `/home/events.akanhyd.com/node/bin/node` (v20.20.2, vendored) | same |
| Start command | `next start -p 3201 -H 127.0.0.1` | `next start -p 3200 -H 127.0.0.1` |
| Boot | enabled, `Restart=always` | enabled, `Restart=always` |

Unit files live at `/etc/systemd/system/events-public.service` and
`/etc/systemd/system/events-akanhyd.service`. Both run as `User=event5757`,
`NODE_ENV=production`.

## 3) Routing — OpenLiteSpeed vhost

File: `/usr/local/lsws/conf/vhosts/events.akanhyd.com/vhost.conf`

Two proxy back-ends:
- `events-public-node`    → `127.0.0.1:3201`
- `events-dashboard-node` → `127.0.0.1:3200`

Path-prefix routing (most-specific prefix wins):

| Path | Routes to |
|---|---|
| `/` | public (3201) |
| `/admin` | dashboard (3200) |
| `/login` | dashboard (3200) |
| `/_next` | dashboard (3200) |
| `/_publicapp` | public (3201) — public app's static assets |
| `/api/dashboard` | public (3201) |
| `/api`, `/api/bookings` | dashboard (3200) |

TLS: Let's Encrypt — `/etc/letsencrypt/live/events.akanhyd.com/{privkey,fullchain}.pem`.

## 4) How one domain serves two Next apps (critical)

Both apps would collide on `/_next`. Resolved via env:

- Public app `.env.local`:
  - `ASSET_PREFIX=/_publicapp` → public assets served under `/_publicapp`, leaving `/_next` to the dashboard.
  - `DASHBOARD_API_BASE=http://127.0.0.1:3200` and `NEXT_PUBLIC_DASHBOARD_API_BASE=http://127.0.0.1:3200`
    → the public app's `/api/dashboard/*` proxy forwards server-to-server to the dashboard.

If `ASSET_PREFIX` is ever lost, the public page's CSS/JS will 404 (served by the wrong app).

## 5) Releases & data

- Release layout: each app has a `current` symlink to the live build + a `shared/` dir.
- SQLite DB: `/home/events.akanhyd.com/shared/data/eventcover.db` (WAL mode),
  symlinked into the dashboard release as `data/` so it persists across redeploys.
- Shared env: `/home/events.akanhyd.com/shared/env/.env.local`
  (Brevo SMTP, reservation webhook to `https://34.47.149.174/...`, `PUBLIC_BASE_URL=https://events.akanhyd.com`).
- NOTE: deployed `current` dirs are built artifacts, **not git checkouts** — there is no
  commit hash on the server tying running code to source. Track releases another way.

## 6) Env config reference

Shared (`shared/env/.env.local`) — also copied into the dashboard app:
```
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=<approved SMTP username>
SMTP_PASS=<secret>
SMTP_FROM=events@akanhyd.com
SMTP_FROM_NAME=Akan Hyderabad
ADMIN_BOOKING_EMAIL=akanhyd.dev@gmail.com
PUBLIC_RESERVATION_WEBHOOK_URL=https://34.47.149.174/api/reservations/webhook/reservego
PUBLIC_RESERVATION_WEBHOOK_TOKEN=<secret>
PUBLIC_BASE_URL=https://events.akanhyd.com
NEXT_PUBLIC_BASE_URL=https://events.akanhyd.com
```
Public app (`public-app/current/.env.local`):
```
DASHBOARD_API_BASE=http://127.0.0.1:3200
NEXT_PUBLIC_DASHBOARD_API_BASE=http://127.0.0.1:3200
ASSET_PREFIX=/_publicapp
```

## 7) Operations

Status / logs:
```
systemctl status events-public.service events-akanhyd.service
journalctl -u events-public.service  -n 100 --no-pager
journalctl -u events-akanhyd.service -n 100 --no-pager
```
Restart after a config/env change:
```
systemctl restart events-public.service     # public page (3201)
systemctl restart events-akanhyd.service     # dashboard  (3200)
```
Reload OLS after a vhost change:
```
/usr/local/lsws/bin/lswsctrl reload
```
Liveness checks:
```
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3201/        # public  -> 200
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3200/admin   # admin   -> 307 (login redirect)
curl -sk -o /dev/null -w "%{http_code}\n" https://events.akanhyd.com/  # via OLS -> 200
```

## 8) Safe release procedure (per app)

A push to `origin/main` does not deploy these services. No GitHub Actions deployment workflow is checked in. Deploy only within an explicitly authorized production task.

### Preflight and backup

1. Confirm the intended full source commit and which apps changed. Changes to shared reservation/payment/tracking contracts require coordinated verification of both apps.
2. Inspect the current systemd units with `systemctl cat events-public.service events-akanhyd.service`, their working directories, Node version, `readlink -f` results for each `current` and dashboard `data`, and the OLS vhost. Record existing release targets for rollback. Do not assume a relative symlink depth from this document.
3. Take a consistent SQLite backup using SQLite's backup API or the CLI `.backup` command into a private backup location, then check the backup with `PRAGMA integrity_check`. Do not copy only the live `.db` while WAL writes are active. Preserve env/config and any other persistent state discovered during preflight; never put backups or credentials in Git.
4. Review `src/lib/db.ts` schema initialization/migrations against the existing DB. Starting new dashboard code can migrate data immediately. Validate on a private staging copy first; confirm whether old code remains compatible with the migrated schema.
5. Review public Meta test-code fallback and dashboard test-event settings before production. Document any unresolved release blockers; a successful compile is not payment/QR/integration verification.

### Prepare releases without replacing the running version

1. Create a fresh release directory for each changed app under its existing app parent. Keep the old release. Copy that app's source and lockfile, excluding `.env*`, `data`, local `node_modules`, and build caches from the developer machine; restore only approved server configuration separately.
2. Install with `npm ci` on the target Linux runtime or an equivalent build environment. Native `better-sqlite3` must match the deployed OS/Node ABI. Do not transfer macOS binaries.
3. Before building the public app, provide `ASSET_PREFIX=/_publicapp` and its approved upstream/env. Build both changed apps with `npm run build` from their own directories. Public fonts may require outbound access during build. A runtime-only prefix change cannot repair assets already built with the wrong prefix.
4. Build/test the dashboard with a disposable staging database. Do not attach the live DB during checks that initialize schema or execute business code. Before activation, link the new dashboard release's `data` using the **absolute** target `/home/events.akanhyd.com/shared/data` and verify it resolves correctly. Do not copy an empty local DB into shared storage.
5. Restore the approved runtime `.env.local`/configuration for each release without printing secrets. Preserve signing configuration and verify permissions for `event5757` on persistent data and env. Record the full source commit in a `REVISION` file in each release and retain the build/check results.

### Activate and verify

1. Replace each `current` symlink atomically using a temporary sibling symlink and an OS-appropriate atomic rename. Reconfirm the unit's working directory follows `current`. Coordinate the two releases if API contracts require it.
2. Restart only the changed app's systemd service(s). Restarting Node does not require an OLS reload unless the vhost itself changed. Check status and logs without disclosing guest data, tokens, or secrets.
3. Run the liveness checks in section 7 with normal TLS verification for the public URL (`curl -s`, without `-k`). Then verify actual public JS/CSS URLs under `/_publicapp`, dashboard assets under `/_next`, `/api/dashboard/*` proxy responses, login, event list/detail, and relevant pass-download routes.
4. Perform approved smoke checks for changed workflows using synthetic records/test gateway settings: free and paid reservations, wallet/PIN checks, QR scan, redemption/top-up and repeat verification, and notifications. Do not create real charges or guest messages without authorization.
5. Record deployed commit(s), release directory targets, operator/time, backup location, and verification result in the operational release log. Existing deployments without a `REVISION` file must not be assumed to match GitHub.

### Rollback

Repoint affected `current` symlinks atomically to the previously recorded release targets, restart matching services, and repeat health/asset/proxy checks. Keep shared DB and environment in place. Code rollback does **not** undo schema changes: use a reviewed forward fix or a separately authorized restore plan if old code is incompatible. Restoring a pre-release DB can discard bookings/payments made since the backup; never do it automatically. Preserve failed releases/logs for investigation and remove old releases only after retention and rollback needs are satisfied.

## 9) Guardrails

- Do NOT touch PM2 `akan-backend` or port 5001 (corporate site).
- Events apps are systemd-managed — never start them under PM2.
- Keep ports loopback-only (`-H 127.0.0.1`); public traffic must go through OLS.
- Preserve `shared/data/eventcover.db` on every redeploy — it is the live database.
- Rotate the secrets in section 6 if they have ever been committed to git.
