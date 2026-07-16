# ml/ — Data & ML side

This folder holds the **data-science / machine-learning outputs** that feed the
Manhattan busyness feature: the intermediate and processed datasets used to model
POI busyness, plus the SQL that seeds the `poi` table the backend serves.

The full ML pipeline (fetch → clean → feature-engineer → model) lives in a separate
project (**Offpeak**), which is the **source of truth**. The files here are synced
copies so the team has the data and DB seed in one place.

## Contents

| Path | What it is |
|---|---|
| `data/interim/` | Cleaned, per-source intermediate tables (13 CSVs, ~22 MB) — POI registry, spatial joins (taxi zone / subway / Citi Bike / nearest station), typical-week transport aggregates, weather, holidays, PLUTO capacity, signal-validation. |
| `data/processed/` | Model-ready tables: `modeling_table.parquet` (one row per POI × day-of-week × hour), `model_dataset.parquet` (transformed + split-tagged features), and `forecast_model.csv` (gbm_v1 busyness scores for the 67 POIs with no Google label). |
| `db/` | PostgreSQL for the POI layer (1:1 mirror of Offpeak `db/`): `01_ddl_create_poi_table.sql`, `02_dml_seed_poi_table.sql`, `03_ddl_create_busyness_forecast_table.sql`, `04_dml_seed_busyness_forecast.sql` (hybrid: 12,895 observed + 8,999 model rows), `05_dml_update_poi_best_time.sql`. |

> **Note on `db/`:** these are the ML-side source-of-truth copies. The backend's own
> schema is managed by Alembic (`backend/alembic/`) and its seed lives in
> `backend/db/`. Reconcile against these when the POI schema or seed changes — don't
> assume they are byte-identical.

## Key semantics

- **Busyness target** is a **typical week**: a 7×24 `(day-of-week, hour)` profile
  (0–100, Google Popular Times semantics), not calendar dates.
- Transport panels are reduced to the same footing via a **weekly climatology**
  (mean demand per `(dow, hour)` cell across the window).
- The modeling table joins each POI to nearby transport demand within distance
  buffers, plus POI attributes, weather, and calendar features.

## Keeping this in sync

These files are **regenerated in Offpeak**. Whenever the interim/processed datasets
or the DB seed change there, update the copies here via a PR (see the root
`README.md` → *Data / ML* section for the rule).
