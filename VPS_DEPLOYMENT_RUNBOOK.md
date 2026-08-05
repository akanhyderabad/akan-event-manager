# VPS Deployment Runbook — events.akanhyd.com (AS-BUILT)

> This document reflects the **actual live deployment** verified by SSH on 2026-06-29.
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
SMTP_USER=afdee0001@smtp-brevo.com
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

## 8) Redeploy (per app)

1. Build the app and place it as a new release dir under the app's parent.
2. Repoint the `current` symlink to the new release (keep `shared/` data + env intact).
3. Ensure `.env.local` is present in the new `current` (esp. public app's `ASSET_PREFIX`
   and `DASHBOARD_API_BASE`; dashboard's DB symlink `data/ -> ../../shared/data`).
4. Restart the matching systemd service.
5. Verify with the liveness checks above.

## 9) Guardrails

- Do NOT touch PM2 `akan-backend` or port 5001 (corporate site).
- Events apps are systemd-managed — never start them under PM2.
- Keep ports loopback-only (`-H 127.0.0.1`); public traffic must go through OLS.
- Preserve `shared/data/eventcover.db` on every redeploy — it is the live database.
- Rotate the secrets in section 6 if they have ever been committed to git.
