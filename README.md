# COMP47360-Research-Project
This project involves the development of a trip itinerary planner application catered to tourists visiting Manhattan, New York.

## Repository layout

| Folder | Purpose |
|---|---|
| `backend/` | FastAPI + SQLAlchemy API and Postgres schema (Alembic migrations in `backend/alembic/`, seed SQL in `backend/db/`). |
| `frontend/` | Vite / React / TypeScript web client. |
| `ios/` | Native iOS client. |
| `ml/` | **Data / ML side** — intermediate & processed datasets and the POI DB seed that power the busyness feature. See [`ml/README.md`](ml/README.md). |

## Data / ML

The busyness estimation model and its data live in a separate project (**Offpeak**),
which is the **source of truth**. The `ml/` folder holds synced copies the team needs:

- `ml/data/interim/` — cleaned per-source intermediate tables (POI registry, spatial
  joins, typical-week transport aggregates, weather, holidays, capacity).
- `ml/data/processed/` — model-ready tables (`modeling_table.parquet`,
  `model_dataset.parquet`).
- `ml/db/` — PostgreSQL DDL + generated seed for the `poi` layer.

**Sync rule:** these files are regenerated in Offpeak. **Whenever `data/interim`,
`data/processed`, or `db/` change in Offpeak, open a PR here to update `ml/`.** The
backend's own schema stays Alembic-managed (`backend/alembic/`); reconcile `backend/db/`
against `ml/db/` when the POI schema or seed changes rather than assuming they match.
