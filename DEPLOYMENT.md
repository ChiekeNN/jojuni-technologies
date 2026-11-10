# Deploying Jojuni Technologies (Vercel + Neon)

Two steps, in order: **create the Neon database**, then **import the repo into Vercel**.
Total time: ~10 minutes. No CLI required.

---

## Part 1 — Neon (the database)

1. Go to <https://console.neon.tech> and sign up (free tier is plenty).
2. **Create a project**:
   - Name: `jojuni-technologies`
   - **Region: `AWS Europe (London) — aws-eu-west-2`** ← important. The site's
     users are in Nigeria; London is the closest Neon region, and `vercel.json`
     already pins the API functions to Vercel's London region (`lhr1`) so the
     two sit next to each other. (If you pick another Neon region, change
     `regions` in `vercel.json` to the matching Vercel region.)
   - Postgres version: default (17) is fine.
3. Open the project → **Connect** → copy the **pooled connection string**
   (it contains `-pooler` in the hostname), e.g.
   `postgresql://alex:AbC123@ep-cool-name-pooler.aws-eu-west-2.neon.tech/neondb?sslmode=require`
4. Create the tables. Either:
   - locally (recommended, uses `.env`):
     ```bash
     cp .env.example .env        # paste the pooled string into DATABASE_URL
     npm run db:migrate
     npm run db:seed             # optional demo content
     npm run db:status           # verify connection + tables
     ```
   - or paste the whole of `db/schema.sql` into the Neon **SQL Editor** and run it
     (then `db/seed.sql` if you want demo rows).
5. Keep the connection string handy — Part 2 needs it.

> Migrations are idempotent (`CREATE TABLE IF NOT EXISTS`), so re-running them
> after schema changes in `db/schema.sql` is always safe.

---

## Part 2 — Vercel (hosting + API)

1. Push this branch / merge the PR to `main` (Vercel deploys `main` by default).
2. In <https://vercel.com> → **Add New… → Project** → **Import** the
   `ChiekeNN/jojuni-technologies` repository.
3. Vercel auto-detects **Vite**. Confirm:
   - Build command: `npm run build`
   - Output directory: `dist`
   (both already declared in `vercel.json`, so leaving the defaults is fine.)
4. **Environment variables** (Project Settings → Environment Variables, or the
   import screen):
   | Key | Value | Environments |
   | --- | --- | --- |
   | `DATABASE_URL` | the Neon pooled connection string | Production, Preview, Development |
   | `ADMIN_API_KEY` | any long random string (`openssl rand -hex 24`) | Production, Preview |
5. Click **Deploy**. First build takes ~1–2 minutes.
6. Verify on the deployed URL:
   - `https://<your-app>.vercel.app/` → public site
   - `https://<your-app>.vercel.app/workspace` → workspace (badge should read **Synced**)
   - `https://<your-app>.vercel.app/api/health` → `"ready": true`
7. From now on, every push to `main` redeploys automatically; every PR gets a
   preview deployment (previews share the same Neon DB unless you create a
   branch database in Neon — recommended for risky schema work).

### Optional: use the Vercel ↔ Neon integration instead of pasting strings

Vercel dashboard → your project → **Integrations** → **Neon** → connect the
project. It injects `DATABASE_URL` (and `POSTGRES_URL*` aliases) automatically
for all environments, including per-branch preview databases. You still run
`npm run db:migrate` once against it.

### Optional: deploy from the CLI instead

```bash
npm i -g vercel
vercel login
vercel link                 # pick the project
vercel env pull .env.local  # pulls DATABASE_URL etc. for local dev
vercel                      # preview deployment
vercel --prod               # production
```

---

## Verifying end to end

```bash
# health
curl https://<your-app>.vercel.app/api/health

# submit a lead like the contact form does
curl -X POST https://<your-app>.vercel.app/api/leads \
  -H 'content-type: application/json' \
  -d '{"name":"Ada","email":"ada@example.com","company":"Jojuni","brief":"Hello"}'

# read leads back (admin)
curl https://<your-app>.vercel.app/api/leads?limit=10 \
  -H "x-admin-key: $ADMIN_API_KEY"

# workspace snapshot — super-admin only, so this 401s without a session
curl https://<your-app>.vercel.app/api/workspace
# {"error":"unauthorized",...}
```

---

## Troubleshooting

| Symptom | Cause / fix |
| --- | --- |
| Workspace badge shows **Demo data**; `/api/health` says `database_not_configured` | `DATABASE_URL` missing in that Vercel environment. Add it, redeploy. |
| `/api/health` says `schema_missing` | Tables not created: run `npm run db:migrate` (or paste `db/schema.sql` in the Neon SQL editor). |
| `/api/health` says `database_unreachable` | Wrong/expired connection string, or Neon project suspended (free tier auto-suspends; first request after idle wakes it — takes ~1s). |
| API feels slow (>500 ms) | Region mismatch: Neon region vs `regions` in `vercel.json`. Put both in London, or move both. |
| `/workspace` 404s on a Vercel deployment | Missing rewrite — check `vercel.json` is committed at the repo root. |
| `/workspace` shows the password screen and sign-in says *no database is configured* | `DATABASE_URL` missing, or `db/schema.sql` not applied. Run `npm run db:migrate`. |
| `/workspace` rejects the password | The seeded hash and the password disagree. Reset it with `node scripts/workspace-password.mjs`. |
| Signed out unexpectedly | Sessions expire after 7 days, and signing out on any device clears that session only. |
| Old workspace UI after a deploy | Service worker: bump `CACHE_NAME` in `public/workspace-sw.js` (it is `no-cache`, so clients pick the new worker on next visit). |

## Security notes (honest ones)

- `/workspace` is **super-admin only**: password, no username. The password is
  stored as a scrypt hash in `workspace_accounts` and verified server-side by
  `POST /api/workspace/auth`. It is never in the browser bundle.
- Sessions are opaque random tokens in an HttpOnly, SameSite=Strict cookie;
  only their SHA-256 digest is stored. They expire after 7 days and are
  revoked on sign-out.
- Sign-in is rate limited to 8 attempts per IP per 15 minutes, counted in the
  database so cold starts do not reset it.
- The old `x-workspace-role` header is now **ignored**; role comes from the
  session.
- One shared password is still one factor. Before storing real financials,
  consider putting an identity provider (Clerk, Auth.js, WorkOS) in front —
  the session layer here is designed to be swapped out wholesale.
- Rotate the password with `node scripts/workspace-password.mjs`; it prints an
  `update` statement and a `delete from workspace_sessions` that signs every
  device out.
- `ADMIN_API_KEY` protects lead export. Rotate it like any secret.
- `POST /api/leads` still works but the public site no longer posts to it
  (the contact page is details-only). Its honeypot is still in place.
- File uploads store **metadata only** today (`storage_url` column is reserved
  for Vercel Blob / S3 when you're ready for real bytes).
