# Offpeak — Manhattan Trip Itinerary Planner 🗽🧭

<p align="center">
  <a href="https://skillicons.dev">
    <img src="https://skillicons.dev/icons?i=python,fastapi,postgres,react,ts,vite,npm,swift,git,figma&theme=light" />
  </a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="License: MIT" />
  <img src="https://img.shields.io/badge/status-live-brightgreen.svg" alt="Status: Live" />
  <img src="https://img.shields.io/badge/COMP47360-Research%20Project-blue.svg" alt="COMP47360 Research Project" />
  <a href="https://offpeak.live/"><img src="https://img.shields.io/badge/website-offpeak.live-orange.svg" alt="Website" /></a>
</p>

## 🌟 Project Overview

**Offpeak** is a trip itinerary planner web and mobile application built for tourists visiting Manhattan, New York. The central problem it addresses is the uncertainty visitors face when planning a day out: which attractions will be overcrowded, when is the best time to visit each one, and how to build a realistic multi-stop itinerary around that.

Offpeak solves this by combining a curated Points-of-Interest (POI) database for Manhattan with a machine-learning busyness prediction model, letting users generate and save personalised itineraries that account for predicted crowd levels, accessibility needs, and trip dates.

🌏 Website: https://offpeak.live/

---

## 📋 Table of Contents

<details open>
  <summary>Table of Contents</summary>

  - [👩‍💻🧑‍💻 Group Members](#-group-members)
  - [📑 Team Documents](#-team-documents)
  - [✨ Features](#-features)
  - [🧰 Technology Stack](#-technology-stack)
  - [🧠 Machine Learning / Busyness Prediction](#-machine-learning--busyness-prediction)
  - [🚀 Getting Started](#-getting-started)
    - [💾 Prerequisites](#-prerequisites)
    - [🔧 Backend Setup](#-backend-setup)
    - [🎨 Frontend Setup](#-frontend-setup)
    - [📱 iOS Setup](#-ios-setup)
  - [📂 Repository Layout](#-repository-layout)
  - [🌐 Deployment](#-deployment)
  - [🤝 Contributing](#-contributing)
  - [📝 License](#-license)
</details>

---

## 👩‍💻🧑‍💻 Group Members

- Yu Ning Chen
- Hansel Oduah
- Eoin Conroy
- Shida Cai
- Fan Chi Meng

> Developed as part of the **COMP47360** Research Project.

---

## 📑 Team Documents

- [Deployment Guide](DEPLOYMENT.md)
- [Git Workflow](git-workflow.md)
- [Budget & Timeline](budget-and-timeline/README.md)
- [Machine Learning / Data](ml/README.md)
- [POI Column Dictionary](backend/db/poi_column_dictionary.md)

---

## ✨ Features

The app is organised into five tabs, available on both web and mobile:

- **🧭 Explore** — Browse and search Manhattan points of interest. Each POI card shows a photo, name, neighbourhood, rating, crowd level, and a best-time-to-visit hint, plus an accessibility icon (♿) where applicable. Tapping a card opens its detail page, with a 6-slot Crowd Forecast chart (colour-coded Quiet / Moderate / Busy), a "Best Time to Visit" window, and an accessibility section shown by default, listing confirmed wheelchair or step-free access and otherwise linking to the venue's own site.
- **🤖 AI Planner** — A conversational planner: the assistant asks whether you're starting a new trip or refining an existing one in My Itinerary, then gathers trip dates, interests, and accessibility needs through dialogue. Once confirmed, the generated itinerary is saved into My Itinerary.
- **🗓️ My Itinerary** (manual, main flow) — Pick POIs and trip dates directly; the system auto-schedules them into a time-slotted itinerary based on predicted crowd level and location, prioritising Quiet/Moderate slots where possible. Stops can be removed, with the schedule reflowing automatically.
- **🔖 Saved** — POIs can be saved straight from Explore (no itinerary needed) and appear here immediately; saved itineraries can also be reopened in full or deleted.
- **👤 Profile** — Account info (username, joined date) and an accessibility setting (e.g. step-free routes). When enabled, itineraries are restricted to POIs with *confirmed* wheelchair access; places with only partial access, or with no accessibility data, are left out and a warning is shown if you add one anyway.

---

## 🧰 Technology Stack

- **Backend:** [Python](https://www.python.org/) — [FastAPI](https://fastapi.tiangolo.com/) (REST API), [SQLAlchemy](https://www.sqlalchemy.org/) (ORM), [Alembic](https://alembic.sqlalchemy.org/) (database migrations)
- **Database:** [PostgreSQL](https://www.postgresql.org/)
- **Frontend (Web):** [React](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/) + [Vite](https://vitejs.dev/)
- **Mobile:** Native iOS ([Swift](https://developer.apple.com/swift/))
- **Machine Learning:** [NYC Open Data](https://opendata.cityofnewyork.us/), [Google Maps API](https://developers.google.com/maps), [Pandas](https://pandas.pydata.org/), [Python](https://www.python.org/), [DuckDB](https://duckdb.org/)
- **Design / Mockups:** [Figma](https://www.figma.com/), [Stitch](https://stitch.withgoogle.com/)
- **Deployment:** Backend on [Render](https://render.com/), frontend on [Vercel](https://vercel.com/) — live at [https://offpeak.live/](https://offpeak.live/)

---

## 🧠 Machine Learning / Busyness Prediction

The busyness estimation model and its training data live in a separate project (**Offpeak** data-science repo), which is the **source of truth**. The `ml/` folder in this repository holds synced copies the team needs:

- `ml/data/interim/` — cleaned per-source intermediate tables (POI registry, spatial joins, typical-week transport aggregates, weather, holidays, capacity).
- `ml/data/processed/` — model-ready tables (`modeling_table.parquet`, `model_dataset.parquet`).
- `ml/db/` — PostgreSQL DDL + generated seed for the `poi` layer.

**Defining "busy":** after comparing several candidate signals (OpenStreetMap capacity tags, an NYC city-facilities dataset, live line-camera feeds), the team settled on **Google Popular Times** as the target — a busyness score normalised 0–100 relative to each place's own typical peak, available for over 60% of the selected POIs.

**Data sources:** a POI registry (Google Places, MapPLUTO, OpenStreetMap, NYC POI/LION) is combined with demand and context signals — Citi Bike, yellow/green taxi, FHVHV (Uber/Lyft), MTA subway/turnstile/bus ridership, DOT pedestrian counts, traffic volume counts, weather, holidays, and events — each pulled via a reproducible script against a public API (NYC Open Data, TLC, MTA, Open-Meteo).

---

## 🚀 Getting Started

### 💾 Prerequisites

- Python 3.x and `pip`
- Node.js and `npm`
- PostgreSQL (installed locally, or a GUI client such as [DBeaver](https://dbeaver.io/) or [pgAdmin](https://www.pgadmin.org/))
- Xcode (for iOS development) — iOS 26

### 🔧 Backend Setup

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
psql -d your_database_name -f 01_create_poi.sql
psql -d your_database_name -f 03_dml_seed_poi_table.sql
psql -d your_database_name -f 04_dml_seed_busyness_forecast.sql
psql -d your_database_name -f 05_insert_poi_availability_mode.sql
psql -d your_database_name -f 06_dml_update_poi_best_time.sql
psql -d your_database_name -f 07_dml_update_poi_content.sql
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

### 🎨 Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The web app should now be running at `http://localhost:5173`.

### 📱 iOS Setup

> 🚧 **TODO (iOS team):** Setup instructions to be added. Please cover: opening the Xcode project (`ios/ManhattanTravelApp.xcodeproj`), setting the backend API base URL, selecting a simulator or device (iOS 26), and running the app.

---

## 📂 Repository Layout

| Folder | Purpose |
|---|---|
| `backend/` | FastAPI + SQLAlchemy API and Postgres schema (Alembic migrations in `backend/alembic/`, seed SQL in `backend/db/`). |
| `frontend/` | Vite / React / TypeScript web client. |
| `ios/` | Native iOS client. |
| `ml/` | **Data / ML side** — intermediate & processed datasets and the POI DB seed that power the busyness feature. See [`ml/README.md`](ml/README.md). |

---

## 🌐 Deployment

Offpeak is deployed and publicly accessible at **[https://offpeak.live/](https://offpeak.live/)**.

- **Backend:** FastAPI app hosted on [Render](https://render.com/), with the PostgreSQL database also hosted on Render.
- **Frontend:** React app hosted on [Vercel](https://vercel.com/).
- **Domain:** `offpeak.live`

---

## 🤝 Contributing

We follow a branch-and-PR workflow — see the [Git Workflow](git-workflow.md) for the full details.

1. Create a new branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```
2. Commit your changes:
   ```bash
   git commit -m "Add your awesome feature"
   ```
3. Push to the branch:
   ```bash
   git push origin feature/your-feature-name
   ```
4. Open a pull request. 🚀

---

## 📝 License

This project is licensed under the [MIT License](LICENSE) — see the `LICENSE` file for details. Developed as part of the **COMP47360** Research Project at University College Dublin.
