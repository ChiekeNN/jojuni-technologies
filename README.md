# Jojuni Technologies

Marketing site + private team workspace for Jojuni Technologies.
Deployed on **Vercel** (static frontend + serverless API) with **Neon** (serverless PostgreSQL) as the database.

| Part | Where it lives | Runs on |
| --- | --- | --- |
| Public marketing site (`/`) | `src/PublicSite.tsx` | Vercel static/edge |
| Team workspace (`/workspace`) | `src/WorkspaceApp.tsx` | Vercel static/edge (PWA-installable) |
| REST API (`/api/*`) | `api/` | Vercel serverless functions |
| Database | `db/schema.sql`, `db/seed.sql` | Neon (PostgreSQL) |

## What the database stores

- **Leads** — every "Send project brief" submission from the public contact form (`leads` table).
- **Workspace data** — tasks, projects, the finance ledger, shared file metadata and channel messages (`tasks`, `projects`, `ledger_entries`, `workspace_files`, `workspace_messages`).

The workspace UI always renders immediately from local seed data and then swaps in
whatever Neon returns. If the database is unreachable it labels itself **"Demo data"**
instead of breaking.

## Local development

```bash
npm install
cp .env.example .env        # then paste your Neon DATABASE_URL

npm run db:migrate          # create tables in Neon (idempotent)
npm run db:seed             # optional demo content (only fills empty tables)

npm run dev:stack           # API (:3000) + Vite (:5173) together, /api proxied
```

Separate terminals work too: `npm run dev:api` and `npm run dev`.
Without a `DATABASE_URL` everything still runs — the API answers `503
database_not_configured` and the UI falls back to demo data.

### Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Vite dev server (proxies `/api` to `:3000`) |
| `npm run dev:api` | Runs the real `api/` handlers locally (tsx) |
| `npm run dev:stack` | Both of the above in one terminal |
| `npm run build` | Production frontend build (`dist/`) |
| `npm run typecheck` | Type-checks `src/`, `shared/` and `api/` |
| `npm run db:migrate` | Applies `db/schema.sql` to Neon |
| `npm run db:seed` | Applies `db/seed.sql` (empty tables only) |
| `npm run db:status` | Connection check + row counts per table |

## API reference

All endpoints are JSON. Errors return `{ "error": "<code>", "message": "...", "hint": "..." }`.

| Method & path | Purpose |
| --- | --- |
| `GET /api/health` | Service + database diagnostics (never throws) |
| `POST /api/leads` | Public contact form. Hidden `website` field is a honeypot |
| `GET /api/leads?limit=50` | Lead export. Requires `x-admin-key: $ADMIN_API_KEY` |
| `GET /api/workspace` | Full snapshot. Ledger only for founder/accountant |
| `GET/POST/PATCH/DELETE /api/workspace/tasks` | Task CRUD |
| `GET/POST/PATCH/DELETE /api/workspace/projects` | Project CRUD |
| `GET/POST/PATCH/DELETE /api/workspace/ledger` | Ledger CRUD (finance roles only) |
| `GET/POST/PATCH/DELETE /api/workspace/files` | File metadata CRUD (bytes not stored yet) |
| `GET/POST/DELETE /api/workspace/messages` | Channel messages |

Finance endpoints require the `x-workspace-role: founder|accountant` header.
⚠️ That header mirrors the in-app role switcher and is **demo-grade authorisation** —
add a real identity provider before storing real financial data.

## Environment variables

See `.env.example`. On Vercel these live in *Project Settings → Environment Variables*;
the Vercel ↔ Neon integration can inject `DATABASE_URL` for you as well.

| Variable | Required | Notes |
| --- | --- | --- |
| `DATABASE_URL` | yes | Neon **pooled** connection string |
| `DIRECT_DATABASE_URL` | no | Preferred by migrations when present |
| `ADMIN_API_KEY` | recommended | Protects `GET /api/leads` |
| `DEV_API_PORT` | no | Local API port (default 3000) |

## Deploying

Step-by-step (Neon first, then Vercel via GitHub import) lives in **[DEPLOYMENT.md](./DEPLOYMENT.md)**.

## Project layout

```
api/            serverless functions (same code the local dev server runs)
  _lib/         db client, HTTP helpers, validation, role checks
db/             schema.sql + seed.sql (single source of truth for the schema)
scripts/        db.mjs (migrate/seed/status), dev-api.mjs, dev-stack.mjs
shared/         domain types shared by browser and API (type-only imports)
src/            React app (public site + workspace)
public/         static assets, PWA manifest/service worker/icons
```
