# Deployment Architecture

How Offpeak is deployed and hosted.

> **Scope:** where things run and how they ship. For branching rules see
> [`git-workflow.md`](git-workflow.md); for the app, local setup, and the
> environment-variable reference see [`README.md`](README.md).

---

## 1. Overview

Three independently hosted pieces plus a native client:

```
                              ┌──────────────────────────────┐
   Web browser  ─────────────▶│  VERCEL   (frontend)         │
   https://offpeak.live       │  React + Vite (static build) │
                              └───────────────┬──────────────┘
                                              │  /api/* rewrite (server-side proxy)
                                              ▼
                              ┌──────────────────────────────┐
   iOS app  ─────────────────▶│  CLOUD RUN   (backend API)   │
   https://api.offpeak.live   │  FastAPI + Uvicorn · us-west1 │
                              └───────────────┬──────────────┘
                                              │  SQL over SSL
                                              ▼
                              ┌──────────────────────────────┐
                              │  NEON  (PostgreSQL + PostGIS) │
                              │  US West                      │
                              └──────────────────────────────┘
```

- The **web frontend** calls relative `/api/*` paths on `offpeak.live`; Vercel
  rewrites those server-side to the backend, keeping everything same-origin so
  auth cookies work (see [§7](#7-why-the-api-is-a-subdomain-cookie-architecture)).
- The **iOS app** calls `https://api.offpeak.live` directly (native apps have no
  browser cross-origin constraint).

---

## 2. Live URLs & dashboards

| What | URL | Notes |
|---|---|---|
| Production web app | https://offpeak.live | also `www.offpeak.live` |
| Production API | https://api.offpeak.live | health check: `/api/health` |
| Backend (Cloud Run URL) | https://manhattan-api-63wcgrongq-uw.a.run.app | `api.offpeak.live` maps here |
| Google Cloud console | console.cloud.google.com → project `offpeak-498815` → Cloud Run → `manhattan-api` (`us-west1`) | backend hosting **and logs** |
| Vercel dashboard | vercel.com → `offpeak` team → `manhattan-travel-app` | frontend hosting |
| Neon dashboard | console.neon.tech → US West project | database |

---

## 3. Components

### Frontend — Vercel
- **Repo path:** `frontend/` (Root Directory set to `frontend` in the Vercel project)
- **Framework:** Vite (React + TypeScript), static build
- **Deploys from:** the `production` branch, **only** via
  [`deploy.yml`](.github/workflows/deploy.yml) (token-based `vercel deploy --prod`).
  Vercel's native Git integration is **intentionally disconnected** — no
  per-developer Vercel access is required, and no Vercel checks run on PRs.
- **Custom domains:** `offpeak.live`, `www.offpeak.live`
- **Key config in repo:** [`frontend/vercel.json`](frontend/vercel.json) — the
  `/api/*` → `https://api.offpeak.live/api/*` rewrite

### Backend — Cloud Run
- **Repo path:** `backend/`, built from [`backend/Dockerfile`](backend/Dockerfile)
  (`python:3.12-slim`, installs `requirements.txt`, runs Uvicorn on `$PORT`)
- **Service:** `manhattan-api` · **region** `us-west1` · **project** `offpeak-498815`
- **Deploys with:** `gcloud run deploy manhattan-api --source backend` — Cloud
  Build builds the Dockerfile and rolls out a new revision. Runs
  `--allow-unauthenticated` (it's a public API).
- **Migrations:** `alembic upgrade head` runs in `deploy.yml` **before** the
  deploy, not inside the container.
- **Env & secrets:** see [§6](#6-environment-variables--secrets)

### Database — Neon
- **Region:** US West (AWS) — same region as Cloud Run to keep query latency low
- **Extensions:** **PostGIS is enabled** (required by the itinerary feature's
  `geom` column). On a fresh DB, run `CREATE EXTENSION IF NOT EXISTS postgis;`
  before migrating.
- **Schema:** managed by Alembic (`backend/alembic/`), applied by `deploy.yml`
- **Seed data:** SQL in `backend/db/` (see [§8](#8-common-operational-tasks))
- **Connection:** the backend uses the **pooled** connection string, stored in
  Secret Manager as `DB_URL`

### iOS — native client
- **Repo path:** `ios/`
- **API base URL:** [`APIConfig.swift`](ios/ManhattanTravelApp/Core/Networking/APIConfig.swift)
  — `DEBUG` → `http://127.0.0.1:8000`, `RELEASE` → `https://api.offpeak.live`
- **Distribution:** not yet set up. Requires Apple Developer Program enrollment
  ($99/yr) → TestFlight → App Store.

---

## 4. Domains & DNS

`offpeak.live` is **registered at Porkbun**, with **nameservers delegated to
Vercel** (`ns1.vercel-dns.com`, `ns2.vercel-dns.com`).

> ### ⚠️ DNS is managed in Vercel, NOT Porkbun
> Because nameservers point at Vercel, **any DNS record edited in Porkbun is
> ignored by the internet.** Edit records in the **Vercel dashboard → Domains →
> `offpeak.live` → DNS Records**. (Porkbun still shows old, inert records — don't
> trust them.)

Current records (managed in Vercel):

| Host | Type | Points to | Purpose |
|---|---|---|---|
| `offpeak.live` | A | Vercel | web frontend |
| `www.offpeak.live` | CNAME | Vercel | web frontend |
| `api.offpeak.live` | CNAME | `ghs.googlehosted.com` | backend API (Cloud Run domain mapping) |

TLS certificates are issued automatically — Vercel for the frontend domains,
Google-managed for `api.offpeak.live`.

---

## 5. Deployment flow

A two-branch model on top of the normal feature-branch workflow:

- **`main`** — the team's integration branch. All feature branches PR into here.
  **Merging to `main` does NOT deploy anything.**
- **`production`** — the deploy target. Pushing here triggers CI, and on CI
  success [`deploy.yml`](.github/workflows/deploy.yml) runs. `production` only
  ever receives merges *from* `main` — never direct commits or PRs.

### Shipping a release

```bash
# 1. make sure main has everything you want to ship (via normal PRs)
git checkout main && git pull origin main

# 2. promote main -> production
git checkout production && git pull origin production
git merge main --no-edit
git push origin production        # <-- triggers the live deploy
```

On push to `production`, CI runs, then `deploy.yml`:
1. runs database migrations (`alembic upgrade head`),
2. deploys the backend to Cloud Run (`gcloud run deploy --source backend`),
3. deploys the frontend to Vercel.

### Rolling back
- **Backend:** Cloud Run console → `manhattan-api` → **Revisions** → route 100%
  traffic to a previous healthy revision.
- **Frontend:** Vercel → **Deployments** → pick a previous one → **Promote to
  Production**.
- Or revert the offending commit on `production` and push.

---

## 6. Environment variables & secrets

> **No secret values live in this doc or in the repo** — only *what is set and
> where*. Variable **meanings** are in the [README](README.md#-environment-variables);
> this section covers how production supplies them.

The backend gets its config on Cloud Run two ways:

- **Plain env vars** (non-sensitive), set on the service:
  - `AI_PROVIDER = fallback`
  - `ALLOWED_ORIGINS = https://offpeak.live,https://www.offpeak.live`
- **GCP Secret Manager** (sensitive), mounted as env vars:

  | Env var | Secret name |
  |---|---|
  | `DATABASE_URL` | `DB_URL` |
  | `JWT_SECRET_KEY` | `JWT` |
  | `GEMINI_API_KEY` | `GEMINI` |
  | `GROQ_API_KEY` | `GROQ` |
  | `GOOGLE_PLACES_API_KEY` | `GOOGLE_PLACES` |

  The Cloud Run runtime service account holds `secretmanager.secretAccessor` on
  each secret.

### GitHub Actions secrets
Used by the workflows (repo → Settings → Secrets and variables → Actions):

| Secret(s) | Used by |
|---|---|
| `DATABASE_URL`, `JWT_SECRET_KEY`, `GEMINI_API_KEY`, `GROQ_API_KEY`, `AI_PROVIDER` | `deploy.yml` migrate step, `seed-db.yml` |
| `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` | `deploy.yml` Vercel deploy |

CI → Cloud Run authentication is **keyless via Workload Identity Federation** (no
service-account key is stored in GitHub): provider
`github-pool/github-provider`, service account
`github-deployer@offpeak-498815.iam.gserviceaccount.com`.

---

## 7. Why the API is a subdomain (cookie architecture)

The web login flow sets **`HttpOnly`, `Secure`, `SameSite=Lax` cookies**, which
the browser only sends on requests it considers *same-site*.

- Frontend: `offpeak.live`
- Backend: `api.offpeak.live`

Both share the registrable domain `offpeak.live`, so the browser treats them as
same-site and the cookies work. On top of that, the web app calls `/api/*` on its
own origin and Vercel rewrites to the backend server-side, so from the browser's
point of view it's fully same-origin.

**Don't "simplify" this by pointing the frontend at the raw `*.run.app` URL or a
different domain** — that makes requests cross-site, `SameSite=Lax` cookies stop
being sent, and login silently breaks (you'd log in "successfully" but every
authed request would 401).

---

## 8. Common operational tasks

### Re-seed POI data
Manual workflow [`seed-db.yml`](.github/workflows/seed-db.yml):

- GitHub → **Actions** → **Seed database** → **Run workflow**, or:
  ```bash
  gh workflow run seed-db.yml --ref main
  ```
It runs `backend/db/03`–`07` against `DATABASE_URL`. Safe to re-run (idempotent).

### Run migrations manually
Migrations normally run in `deploy.yml`. By hand:
```bash
cd backend
DATABASE_URL="<neon pooled url>" alembic upgrade head
```
> Must run somewhere with network access to Neon; some local networks block
> outbound Postgres (port 5432).

### Enable PostGIS on a fresh database
```sql
CREATE EXTENSION IF NOT EXISTS postgis;
```
Run in the Neon SQL Editor **before** the first `alembic upgrade head`.

### View backend logs
Teammates granted `roles/logging.viewer` + `roles/run.viewer` on the project can
read logs at Cloud Run → `manhattan-api` → **Logs** (no local setup needed).

### Deploy / promote / roll back
See [§5](#5-deployment-flow).

---

## 9. Known constraints & gotchas

- **Cold starts:** Cloud Run scales to zero when idle, so the first request after
  an idle period cold-starts (a few seconds).
- **Neon autosuspend:** the DB also suspends when idle but resumes in ~1s.
- **Python is pinned** to 3.12 (`backend/Dockerfile` / `backend/.python-version`
  `3.12.7`). 3.14 breaks SQLAlchemy 2.0.39.
- **`geoalchemy2` + PostGIS:** the itinerary `geom` column needs the
  `geoalchemy2` package (in `requirements.txt`) *and* PostGIS enabled on the DB.
  Both must be present or the backend won't boot.
- **Keep Cloud Run and Neon in the same region.** Splitting them adds
  cross-region latency to every query.
- **DNS lives in Vercel, not Porkbun** — see [§4](#4-domains--dns).

---

## 10. CI/CD

Three workflows in `.github/workflows/`:

| Workflow | Trigger | What it does |
|---|---|---|
| [`ci.yml`](.github/workflows/ci.yml) | every push / PR | backend: install deps + `compileall` + `pytest`; frontend: `npm ci` + lint + build |
| [`seed-db.yml`](.github/workflows/seed-db.yml) | manual | re-runs the POI seed SQL (see [§8](#8-common-operational-tasks)) |
| [`deploy.yml`](.github/workflows/deploy.yml) | CI success on `production` | migrate → deploy backend to Cloud Run (WIF) → deploy frontend to Vercel |
