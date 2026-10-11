# Akan public events application

The public half of the Akan Events workspace, using Next.js 16.2.6. Read the root [developer guide](../DEVELOPER_GUIDE.md), [deployment runbook](../VPS_DEPLOYMENT_RUNBOOK.md), and local [AGENTS.md](AGENTS.md) before changing it.

```sh
npm ci
npm run dev -- -p 3000
```

Run the dashboard separately on port 3001 and set the untracked `.env.local` value `DASHBOARD_API_BASE=http://127.0.0.1:3001`. Public `/api/dashboard/*` handlers proxy to that backend; they do not own the database.

Production uses `events-public.service` on `127.0.0.1:3201`, with `ASSET_PREFIX=/_publicapp` set **before building** and `DASHBOARD_API_BASE=http://127.0.0.1:3200`. Preserve the prefix because the dashboard owns `/_next` on the shared domain.

Checks: `./node_modules/.bin/tsc --noEmit`, `npm run lint`, and `npm run build`. Build requires access to the Google fonts used by `next/font`. Pushing source to GitHub is separate from VPS deployment.
