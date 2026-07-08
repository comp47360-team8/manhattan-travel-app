# Deployment Architecture

This document explains how Offpeak is deployed and hosted.

> **Scope:** this describes *where things run and how they ship*. For day-to-day
> branching rules see [`git-workflow.md`](git-workflow.md). For the app itself
> see [`README.md`](README.md).

---

## 1. Overview

The app is three independently hosted pieces plus a native client:

```
                              ┌──────────────────────────────┐
   Web browser  ─────────────▶│  VERCEL   (frontend)         │
   https://offpeak.live       │  React + Vite (static build) │
                              └───────────────┬──────────────┘
                                              │  /api/* rewrite (server-side proxy)
                                              ▼
                              ┌──────────────────────────────┐
   iOS app  ─────────────────▶│  RENDER   (backend API)      │
   https://api.offpeak.live   │  FastAPI + Uvicorn (Python)  │
                              └───────────────┬──────────────┘
                                              │  SQL over SSL
                                              ▼
                              ┌──────────────────────────────┐
                              │  NEON   (PostgreSQL + PostGIS)│
                              └──────────────────────────────┘
```

- The **web frontend** never calls the backend cross-origin. It calls
  relative `/api/*` paths on `offpeak.live`; Vercel rewrites those server-side
  to the Render backend. This keeps everything same-origin so auth cookies work
  (see [§7](#7-why-the-api-is-a-subdomain-cookie-architecture)).
- The **iOS app** calls `https://api.offpeak.live` directly (native apps don't
  have the browser cross-origin constraint).

---

## 2. Live URLs & dashboards

| What | URL | Notes |
|---|---|---|
| Production web app | https://offpeak.live | also `www.offpeak.live` |
| Production API | https://api.offpeak.live | health check: `/api/health` |
| Backend (Render internal URL) | https://manhattan-travel-app.onrender.com | still works; `api.offpeak.live` points here |
| Vercel dashboard | vercel.com → `offpeak` team → `manhattan-travel-app` | frontend hosting |
| Render dashboard | dashboard.render.com → `manhattan-travel-app` | backend hosting |
| Neon dashboard | console.neon.tech → `Offpeak` project | database |

---

## 3. Components

### Frontend — Vercel
- **Repo path:** `frontend/` (Root Directory set to `frontend` in the Vercel project)
- **Framework:** Vite (React + TypeScript), static build
- **Deploys from:** the `production` branch, **only** via the
  [`deploy.yml`](.github/workflows/deploy.yml) GitHub Action (token-based
  `vercel deploy --prod`). Vercel's native Git integration is **intentionally
  disconnected** — no per-developer Vercel access is required, and no Vercel
  checks run on PRs to `main` (see [§11](#11-cicd-status)).
- **Custom domains:** `offpeak.live`, `www.offpeak.live`
- **Key config in repo:** [`frontend/vercel.json`](frontend/vercel.json) — the
  `/api/*` → `https://api.offpeak.live/api/*` rewrite
- **Note:** deploying from a **private org repo requires a Vercel Pro plan.**
  We are currently on a **Pro trial** — see [§9](#9-known-constraints--gotchas).

### Backend — Render
- **Repo path:** `backend/` (Root Directory set to `backend`)
- **Runtime:** Render's native **Python 3** environment (not Docker — a
  `backend/Dockerfile` exists in the repo but Render is *not* using it)
- **Build command:** `pip install -r requirements.txt && alembic upgrade head`
  (migrations run automatically on every deploy)
- **Start command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- **Python version:** pinned to `3.12.7` via [`backend/.python-version`](backend/.python-version)
  (Render defaults to 3.14, which breaks SQLAlchemy 2.0.39 — do not remove this pin)
- **Deploys from:** the `production` branch (auto-deploy on push)
- **Plan:** Free tier — spins down after ~15 min idle (see §9)

### Database — Neon
- **Project:** `Offpeak` (region: AWS `eu-west-2`, London)
- **Database:** `neondb`
- **Extensions:** **PostGIS is enabled** (required by the itinerary feature's
  `geom` column). If a fresh DB is ever provisioned, run
  `CREATE EXTENSION IF NOT EXISTS postgis;` before migrating.
- **Schema:** managed by Alembic (`backend/alembic/`), applied on every backend deploy
- **Seed data:** POI data is loaded via SQL in `backend/db/` (see §8)
- **Connection:** the backend uses the **pooled** connection string, set as
  `DATABASE_URL` on Render (see §6)

### iOS — native client
- **Repo path:** `ios/`
- **API base URL:** [`APIConfig.swift`](ios/ManhattanTravelApp/Networking/APIConfig.swift)
  — `DEBUG` → `http://127.0.0.1:8000`, `RELEASE` → `https://api.offpeak.live`
- **Distribution:** not yet set up. Requires Apple Developer Program enrollment
  ($99/yr) → TestFlight → App Store. **`TODO(team)`.**

---

## 4. Domains & DNS

`offpeak.live` is **registered at Porkbun**, but its **nameservers are delegated
to Vercel** (`ns1.vercel-dns.com`, `ns2.vercel-dns.com`).

> ### ⚠️ DNS is managed in Vercel, NOT Porkbun
> Because nameservers point at Vercel, **any DNS record you add/edit in
> Porkbun's panel is ignored by the internet.** Records must be edited in the
> **Vercel dashboard → Domains → `offpeak.live` → DNS Records.**
> (Porkbun still shows old records in its UI — they are inert. Don't trust them.)

Current records (managed in Vercel):

| Host | Type | Points to | Purpose |
|---|---|---|---|
| `offpeak.live` | A | Vercel | web frontend |
| `www.offpeak.live` | CNAME | Vercel | web frontend |
| `api.offpeak.live` | CNAME | `manhattan-travel-app.onrender.com` | backend API |

TLS certificates are issued automatically (Vercel for the frontend domains,
Render for `api.offpeak.live`).

---

## 5. Deployment flow

We use a two-branch model on top of the normal feature-branch workflow:

- **`main`** — the team's integration branch. All feature branches PR into here,
  exactly as described in [`git-workflow.md`](git-workflow.md). **Merging to
  `main` does NOT deploy anything.**
- **`production`** — the deploy target. Pushing here triggers CI, and on CI
  success [`deploy.yml`](.github/workflows/deploy.yml) runs migrations, triggers
  the Render backend deploy, and deploys the frontend to Vercel. `production`
  only ever receives merges *from* `main` — never direct commits or PRs.

### Shipping a release

```bash
# 1. make sure main has everything you want to ship (via normal PRs)
git checkout main && git pull origin main

# 2. promote main -> production
git checkout production && git pull origin production
git merge main --no-edit
git push origin production        # <-- this triggers the live deploy
```

On push to `production`: CI runs, then `deploy.yml` applies migrations, hits the
Render deploy hook, and deploys the frontend to Vercel via the CLI. The frontend
no longer deploys through Vercel's Git integration — the Action is the only path.

### Rolling back
- **Render:** dashboard → the service → *Events* / *Deploys* → **Rollback** on a
  previous successful deploy.
- **Vercel:** dashboard → *Deployments* → pick a previous one → **Promote to
  Production**.
- Or revert the offending commit on `production` and push.

---

## 6. Environment variables & secrets

> **No secret values live in this doc or in the repo.** This is only *what is
> set and where*. Real values live in the Render / Neon / GitHub dashboards.

### Render — backend service env vars
| Name | What it is | Required? |
|---|---|---|
| `DATABASE_URL` | Neon **pooled** connection string | yes |
| `JWT_SECRET_KEY` | random secret for signing tokens (generated in Render) | yes |
| `ALLOWED_ORIGINS` | CORS allowlist, currently `http://localhost:5173` | see note |
| `ALGORITHM`, `ACCESS_TOKEN_EXPIRE_MINUTES`, `REFRESH_TOKEN_EXPIRE_DAYS` | have code defaults | optional |

> **Note on `ALLOWED_ORIGINS`:** production doesn't actually depend on CORS — the
> web app reaches the API same-origin through the Vercel rewrite, and iOS is a
> native app. So the localhost default is harmless. Only change it if something
> starts calling the API cross-origin *from a browser* on another domain.

### GitHub Actions secrets (repo settings → Secrets and variables → Actions)
| Name | Status | Used by |
|---|---|---|
| `DATABASE_URL` | ✅ set | `seed-db.yml`, and `deploy.yml` migration step |
| `RENDER_DEPLOY_HOOK_URL` | ❌ not set | `deploy.yml` (see §11) |
| `VERCEL_TOKEN` | ❌ not set | `deploy.yml` Vercel deploy (see §11) |
| `VERCEL_ORG_ID` | ❌ not set | `deploy.yml` — identifies the Vercel team (no `.vercel` link in repo) |
| `VERCEL_PROJECT_ID` | ❌ not set | `deploy.yml` — identifies the `manhattan-travel-app` project |

The template of what the backend expects is in
[`backend/.env.example`](backend/.env.example).

---

## 7. Why the API is a subdomain (cookie architecture)

The web login flow sets **`HttpOnly`, `Secure`, `SameSite=Lax` cookies**. Those
cookies are only sent on requests the browser considers *same-site*.

- Frontend: `offpeak.live`
- Backend: `api.offpeak.live`

Both share the registrable domain `offpeak.live`, so the browser treats them as
same-site and the auth cookies work. On top of that, the web app calls
`/api/*` on its own origin (`offpeak.live`) and Vercel rewrites to the backend
server-side, so from the browser's point of view it's fully same-origin.

**Don't "simplify" this by pointing the frontend straight at the raw
`*.onrender.com` URL or a different domain** — that would make requests
cross-site, `SameSite=Lax` cookies would stop being sent, and login would
silently break (you'd log in "successfully" but every authed request would 401).

---

## 8. Common operational tasks

### Re-seed POI data
There's a manual GitHub Actions workflow for this
([`seed-db.yml`](.github/workflows/seed-db.yml)):

- GitHub → **Actions** → **Seed database** → **Run workflow**, or:
  ```bash
  gh workflow run seed-db.yml --ref main
  ```
It runs `backend/db/03_dml_seed_poi_table.sql` against `DATABASE_URL`. Safe to
re-run (the seed is idempotent / upsert-based).

### Run migrations manually
Migrations normally run automatically in Render's build step. To run them by
hand against the DB:
```bash
cd backend
DATABASE_URL="<neon pooled url>" alembic upgrade head
```
> Note: this must run somewhere with network access to Neon (e.g. a GitHub
> Actions runner). Some local networks block outbound Postgres (port 5432).

### Enable PostGIS on a fresh database
```sql
CREATE EXTENSION IF NOT EXISTS postgis;
```
Run in the Neon SQL Editor **before** the first `alembic upgrade head`.

### Deploy / promote / roll back
See [§5](#5-deployment-flow).

---

## 9. Known constraints & gotchas

- **Render free tier cold starts:** the backend spins down after ~15 min idle;
  the first request after that takes ~50s while it wakes. Fine for demos; if you
  need it always-warm (e.g. a live presentation) the Render Starter plan is ~$7/mo.
- **Neon autosuspend:** the DB also suspends when idle but resumes in ~1s —
  usually unnoticeable.
- **Python version is pinned** to 3.12.7 (`backend/.python-version`). Removing it
  lets Render default to 3.14, which breaks SQLAlchemy 2.0.39. Don't.
- **`geoalchemy2` + PostGIS:** the itinerary feature's `geom` column needs the
  `geoalchemy2` package (in `requirements.txt`) *and* the PostGIS extension
  enabled on the DB. Both must be present or the backend won't boot.
- **Vercel Pro trial:** deploying a private org repo requires Vercel Pro. We're
  on a **14-day Pro trial that will convert to paid unless downgraded/cancelled**
  before it ends. **`TODO(team)`: decide** — keep Pro, make the repo public (Pro
  not needed for public repos), or move the frontend to another free host.
- **DNS lives in Vercel, not Porkbun** — see [§4](#4-domains--dns). This trips
  people up; editing Porkbun does nothing.

---

## 10. Accounts & ownership

> `TODO(team)`: fill in who owns / has admin on each account.

| Service | Account / owner | Notes |
|---|---|---|
| GitHub org `comp47360-team8` | owner: `hansel-3` | org owner must approve GitHub App installs (Render, Vercel) |
| Vercel (`offpeak` team) | `TODO(team)` | Pro trial active |
| Render | `TODO(team)` | |
| Neon | `TODO(team)` | |
| Domain (Porkbun) | `TODO(team)` | `offpeak.live`, renews `TODO` |
| Apple Developer | not enrolled | needed for iOS distribution |

---

## 11. CI/CD status

Three workflows in `.github/workflows/`:

| Workflow | Trigger | What it does |
|---|---|---|
| [`ci.yml`](.github/workflows/ci.yml) | every push / PR | backend: install deps + `compileall`; frontend: `npm ci` + lint + build |
| [`seed-db.yml`](.github/workflows/seed-db.yml) | manual | re-runs the POI seed SQL (see §8) |
| [`deploy.yml`](.github/workflows/deploy.yml) | CI success on `production` | migrate → trigger Render deploy hook → deploy Vercel |

> ### Vercel: single-pipeline via `deploy.yml` (decided)
> Vercel's **native Git integration was disconnected** so that:
> - teammates without Vercel access are **no longer blocked** on PRs to `main`
>   (Vercel used to post commit-status checks on every PR, and a duplicate broken
>   project `manhattan-travel-app-nj4s` failed every time — that project was
>   deleted);
> - the frontend deploys **only** through `deploy.yml` using `VERCEL_TOKEN` +
>   `VERCEL_ORG_ID` + `VERCEL_PROJECT_ID` (see §6). Since there's no committed
>   `frontend/.vercel/project.json`, the org/project IDs must be set as secrets
>   for `vercel pull` to resolve the project.
>
> For this to actually ship the frontend, the three Vercel secrets **must be set**
> (they aren't yet — see §6). Until then the Vercel step fails.
>
> **`TODO(team)` — Render still uses native auto-deploy** watching `production`;
> `deploy.yml` *also* hits the Render deploy hook, so once `RENDER_DEPLOY_HOOK_URL`
> is set both would fire. Decide whether to keep native Render auto-deploy (and
> drop the hook step) or gate Render on CI via the hook (and turn off native).
>
> No tests exist yet (`ci.yml` only does compile/lint/build) — worth adding a
> `pytest` suite so CI actually catches regressions.
