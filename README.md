# Offpeak — Manhattan Trip Itinerary Planner

**(Developers: [Yu Ning Chen], [Hansel Oduah], [Eoin Conroy], [Shida Cai], [Fan Chi Meng] — COMP47360 Research Project)**

Offpeak is a trip itinerary planner web and mobile application built for tourists visiting Manhattan, New York. The central problem it addresses is the uncertainty visitors face when planning a day out: which attractions will be overcrowded, when is the best time to visit each one, and how to build a realistic multi-stop itinerary around that.

Offpeak solves this by combining a curated Points-of-Interest (POI) database for Manhattan with a machine-learning busyness prediction model (developed in the companion **Offpeak** data-science project), letting users generate and save personalised itineraries that account for predicted crowd levels, accessibility needs, and trip dates.

The application is **live at [https://offpeak.live/](https://offpeak.live/)**.

---

## Table of Contents

- [Offpeak](#offpeak--manhattan-trip-itinerary-planner)
  * [Table of Contents](#table-of-contents)
  * [Features](#features)
  * [Screenshots](#screenshots)
  * [Repository Layout](#repository-layout)
  * [Tech Stack](#tech-stack)
  * [Machine Learning / Busyness Prediction](#machine-learning--busyness-prediction)
  * [Getting Started](#getting-started)
    + [Prerequisites](#prerequisites)
    + [Backend Setup](#backend-setup)
    + [Frontend Setup](#frontend-setup)
    + [iOS Setup](#ios-setup)
  * [Deployment](#deployment)

---

## Features

The app is organised into five tabs, available on both web and mobile:

- **Explore** — Browse and search Manhattan points of interest. Each POI card shows a photo, name, neighbourhood, rating, crowd level, and a best-time-to-visit hint, plus an accessibility icon (♿) where applicable. Tapping a card opens its detail page, with a 6-slot Crowd Forecast chart (colour-coded Quiet / Moderate / Busy), a "Best Time to Visit" window, and an accessibility section (wheelchair access, accessible restroom, step-free entry) shown by default.
- **AI Planner** — A conversational planner: the assistant asks whether you're starting a new trip or refining an existing one in My Itinerary, then gathers trip dates, interests, and accessibility needs through dialogue. Once confirmed, the generated itinerary is saved into My Itinerary.
- **My Itinerary** (manual, main flow) — Pick POIs and trip dates directly; the system auto-schedules them into a time-slotted itinerary based on predicted crowd level and location, prioritising Quiet/Moderate slots where possible. Stops can be reordered (drag-and-drop on web, long-press on mobile) or removed, with the schedule reflowing automatically.
- **Saved** — POIs can be saved straight from Explore (no itinerary needed) and appear here immediately; saved itineraries can also be reopened in full or deleted.
- **Profile** — Account info (username, joined date) and an accessibility setting (e.g. step-free routes), which filters itineraries to only include wheelchair-accessible POIs and routes when enabled.

---

## Screenshots

### Web

| Explore | AI Planner | My Itinerary | Saved | Profile |
|---|---|---|---|---|
| ![Explore](/docs/screenshots/web/explore.png) | ![AI Planner](/docs/screenshots/web/ai-planner.png) | ![My Itinerary](/docs/screenshots/web/my-itinerary.png) | ![Saved](/docs/screenshots/web/saved.png) | ![Profile](/docs/screenshots/web/profile.png) |

### Mobile (iOS)

| Explore | AI Planner | My Itinerary | Saved | Profile |
|---|---|---|---|---|
| ![Explore](/docs/screenshots/mobile/explore.png) | ![AI Planner](/docs/screenshots/mobile/ai-planner.png) | ![My Itinerary](/docs/screenshots/mobile/my-itinerary.png) | ![Saved](/docs/screenshots/mobile/saved.png) | ![Profile](/docs/screenshots/mobile/profile.png) |


### Mockups (Figma / Stitch)

/docs/screenshots/mockup

---

## Repository Layout

| Folder | Purpose |
|---|---|
| `backend/` | FastAPI + SQLAlchemy API and Postgres schema (Alembic migrations in `backend/alembic/`, seed SQL in `backend/db/`). |
| `frontend/` | Vite / React / TypeScript web client. |
| `ios/` | Native iOS client. |
| `ml/` | **Data / ML side** — intermediate & processed datasets and the POI DB seed that power the busyness feature. See [`ml/README.md`](ml/README.md). |

---

## Tech Stack

- **Backend:** [Python](https://www.python.org/) — [FastAPI](https://fastapi.tiangolo.com/) (REST API), [SQLAlchemy](https://www.sqlalchemy.org/) (ORM), [Alembic](https://alembic.sqlalchemy.org/) (database migrations)
- **Database:** [PostgreSQL](https://www.postgresql.org/)
- **Frontend (Web):** [React](https://react.dev/)
- **Mobile:** Native iOS ([Swift](https://developer.apple.com/swift/))
- **Machine Learning:** [NYC Open Data](https://opendata.cityofnewyork.us/), [Google Maps API](https://developers.google.com/maps), [Pandas](https://pandas.pydata.org/), [Python](https://www.python.org/), [DuckDB](https://duckdb.org/)
- **Design / Mockups:** [Figma](https://www.figma.com/), [Stitch](https://stitch.withgoogle.com/)
- **Deployment:** Backend on [Render](https://render.com/), frontend on [Vercel](https://vercel.com/) — live at [https://offpeak.live/](https://offpeak.live/)

---

## Machine Learning / Busyness Prediction

The busyness estimation model and its training data live in a separate project (**Offpeak** data-science repo), which is the **source of truth**. The `ml/` folder in this repository holds synced copies the team needs:

- `ml/data/interim/` — cleaned per-source intermediate tables (POI registry, spatial joins, typical-week transport aggregates, weather, holidays, capacity).
- `ml/data/processed/` — model-ready tables (`modeling_table.parquet`, `model_dataset.parquet`).
- `ml/db/` — PostgreSQL DDL + generated seed for the `poi` layer.

**Defining "busy":** after comparing several candidate signals (OpenStreetMap capacity tags, an NYC city-facilities dataset, live line-camera feeds), the team settled on **Google Popular Times** as the target — a busyness score normalised 0–100 relative to each place's own typical peak, available for over 60% of the selected POIs.

**Data sources:** a POI registry (Google Places, MapPLUTO, OpenStreetMap, NYC POI/LION) is combined with demand and context signals — Citi Bike, yellow/green taxi, FHVHV (Uber/Lyft), MTA subway/turnstile/bus ridership, DOT pedestrian counts, traffic volume counts, weather, holidays, and events — each pulled via a reproducible script against a public API (NYC Open Data, TLC, MTA, Open-Meteo).

**Data quality:** checks covered missing values (~34% of POIs lack a Google busyness label), ambiguous zero-values (closed vs. genuinely empty), double-counted MTA riders across fare types, invalid IDs/coordinates, out-of-range timestamps, and timezone consistency.

**Key finding:** transport demand tracks *outdoor* busyness well (rank correlation 0.80) but is a weaker proxy for *indoor* venues (0.46), since indoor spots run on their own hours. Transport demand is therefore used as a validation signal and as a fallback for POIs without a Google label, rather than as the primary target.

**Modelling approach:** features include masked closed-hours, cyclical (sin/cos) encodings of hour and day, log-transformed and z-scored demand signals; candidate models range from a category-mean baseline through Ridge/Lasso to Random Forest and Gradient Boosting, evaluated with POI-grouped train/val/test splits (70/15/15) and 5-fold GroupKFold cross-validation against a target of MAE ≤ 15 and Spearman correlation ≥ 0.7.

**Why not just use Google Maps:** Offpeak sequences an entire day across multiple stops rather than showing one place at a time, estimates busyness for the ~34% of POIs Google has no data for, and precomputes a full 7×24 "typical week" so a trip can be planned in advance rather than decided on the spot.

**Next steps:** growing the labelled POI set (currently 131) toward 300–500, refining hand-tagged categories, tuning the transport-radius buffer, and adding features to close the indoor-prediction gap.

---

## Getting Started

### Prerequisites

- Python 3.x and `pip`
- Node.js and `npm`
- PostgreSQL (installed locally, or a GUI client such as [DBeaver](https://dbeaver.io/) or [pgAdmin](https://www.pgadmin.org/))
- Xcode (for iOS development) — iOS 26

### Backend Setup

Backend code resides in the `backend/app` folder:

- FastAPI application entry point: `backend/app/main.py`
- API endpoint definitions: `backend/app/routers/`
- Database connection code: `backend/app/database.py`

**1. Install dependencies**

```bash
cd backend
pip install -r requirements.txt
```

**2. Create your `.env` file**

A `.env.example` template file is provided inside `/backend`. Copy it to `.env` and fill in your own values — **anything marked with `**` must be left unchanged** so the variable names match the backend code. Never commit `.env` to GitHub.

**3. Set up a local PostgreSQL database**

Create a database, either via a GUI, or in the terminal:

```bash
psql postgres
```
```sql
CREATE DATABASE database_name;
\c database_name   -- connects to the database
\q                 -- quits the connection
```

**4. Connect PostgreSQL to FastAPI**

In your `.env`, add your database URL:

```
DATABASE_URL=postgresql+psycopg2://username:password@localhost:5432/database_name
```

Replace `username`, `password`, port (usually `5432`), and `database_name` with your actual values. `backend/app/database.py` reads this variable via `os.getenv("DATABASE_URL")` — no code changes needed if your `.env` variable name matches.

**5. Run database migrations (Alembic)**

Alembic is installed via `requirements.txt` and manages the tables defined in `backend/app/models/`.

```bash
git pull origin main
cd backend
alembic upgrade head
```

Run this command whenever the team announces a database change, then verify the new tables/columns exist.

**6. Seed the database**

Run the following seed scripts **in order**:

```bash
cd backend/db
psql -d your_database_name -f 02_seed_initial_poi.sql
psql -d your_database_name -f 03_dml_seed_poi_table.sql
psql -d your_database_name -f 04_dml_seed_busyness_forecast.sql
psql -d your_database_name -f 05_insert_poi_availability_mode.sql
```

**7. Run FastAPI**

For web development (paired with the React frontend):

```bash
cd backend
uvicorn app.main:app --reload
```

FastAPI will run at [http://localhost:8000](http://localhost:8000), with interactive endpoint docs at [http://localhost:8000/docs](http://localhost:8000/docs). Make sure the CORS middleware in `main.py` allows requests from `http://localhost:5173` (the default Vite dev server address) so the frontend can reach the backend.

For mobile development (so a physical device on the same network can reach it):

```bash
cd backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

- iOS Simulator → call the backend at `http://localhost:8000`.
- Physical iPhone → call the backend at `http://YOUR_MAC_IP:8000`, with the Mac and iPhone on the same Wi-Fi network.

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```
[setup instruction]

The web app should now be running at `http://localhost:5173`. 


### iOS Setup

[setup instruction]


---

## Deployment

Offpeak is deployed and publicly accessible at **[https://offpeak.live/](https://offpeak.live/)**.

- **Backend:** FastAPI app hosted on [Render](https://render.com/), with the PostgreSQL database also hosted on Render.
- **Frontend:** React app hosted on [Vercel](https://vercel.com/).
- **Domain:** `offpeak.live`
