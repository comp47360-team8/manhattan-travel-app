# ml/ — Data & ML

This folder holds the **data and machine-learning artifacts** behind the Manhattan
busyness feature: the datasets used to model POI busyness, and the SQL that builds
and seeds the POI / busyness-forecast layer.

## Contents

| Path | What it is |
|---|---|
| `data/interim/` | Cleaned, per-source intermediate tables (13 CSVs) — POI registry, spatial joins (taxi zone / subway / Citi Bike / nearest station), typical-week transport aggregates, weather, holidays, PLUTO capacity, signal-validation. |
| `data/processed/` | Model-ready tables: `modeling_table.parquet` (one row per POI × day-of-week × hour), `model_dataset.parquet` (transformed + split-tagged features), and `forecast_model.csv` (gbm_v1 busyness scores for the 67 POIs with no Google label). |
| `db/` | PostgreSQL DDL + seed for the POI and busyness-forecast layer: `01_ddl_create_poi_table.sql`, `02_dml_seed_poi_table.sql`, `03_ddl_create_busyness_forecast_table.sql`, `04_dml_seed_busyness_forecast.sql` (hybrid: 12,895 observed + 8,999 model rows), `05_dml_update_poi_best_time.sql`. |

> **`db/` vs `backend/db/`:** the schema the running app uses is managed by Alembic
> (`backend/alembic/`), with its seed in `backend/db/` — treat that as authoritative
> for the app. The SQL here is the ML-side origin of the POI/forecast data; the two
> have diverged, so reconcile against `backend/db/` when the POI schema or seed changes.

## Data sources

The busyness model is built from a POI registry (Google Places, MapPLUTO,
OpenStreetMap, NYC POI/LION) combined with demand and context signals — Citi Bike,
yellow/green taxi, FHVHV (Uber/Lyft), MTA subway/turnstile/bus ridership, DOT
pedestrian counts, traffic volume counts, weather, holidays, and events — each
pulled from a public API (NYC Open Data, TLC, MTA, Open-Meteo).

**Defining "busy":** after comparing candidate signals (OpenStreetMap capacity
tags, an NYC city-facilities dataset, live line-camera feeds), the target is
**Google Popular Times** — a busyness score normalised 0–100 relative to each
place's own typical peak, available for over 60% of the selected POIs.

## Key semantics

- **Busyness target** is a **typical week**: a 7×24 `(day-of-week, hour)` profile
  (0–100, Google Popular Times semantics), not calendar dates.
- Transport panels are reduced to the same footing via a **weekly climatology**
  (mean demand per `(dow, hour)` cell across the window).
- The modeling table joins each POI to nearby transport demand within distance
  buffers, plus POI attributes, weather, and calendar features.
