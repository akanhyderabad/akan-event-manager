# Akan Events workspace

Source repository: https://github.com/akanhyderabad/akan-event-manager

This repository contains two independently built Next.js applications serving the same events domain. Start here before changing code or configuring a coding platform:

- [AGENTS.md](AGENTS.md): instructions for coding agents and developers.
- [DEVELOPER_GUIDE.md](DEVELOPER_GUIDE.md): architecture, local setup, change checklist, and integration contracts.
- [VPS_DEPLOYMENT_RUNBOOK.md](VPS_DEPLOYMENT_RUNBOOK.md): recorded production topology, safe release procedure, verification, and rollback.

## Repository structure

| Directory | Purpose | Deployment |
|---|---|---|
| `akan-events-app/` | Public event discovery, event details, reservation UI, dashboard API proxies | Public service on loopback port 3201 |
| `event dashboard/` | Staff/admin UI, booking/payment APIs, SQLite, passes, integrations | Dashboard service on loopback port 3200 |
| `project/`, `akan-events-home-page/`, `Events page original design/`, ZIP bundles | Design references and original handoffs | Not production applications |
| Planning/phase documents | Historical proposals and progress notes | Not deployment authority |

The production layout was last recorded on **2026-06-29**. Read the runbook and verify the server before a deployment; this repository alone does not establish today's live state. Pushing to GitHub and deploying to the VPS are separate operations. No GitHub Actions deployment workflow is checked into this repository.

There is no root package or combined build. Install and build inside each application directory. Keep the space in `event dashboard` and quote that path in commands.
