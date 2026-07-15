-- =============================================================
-- OFFPEAK — Busyness forecast schema (PostgreSQL)
-- 03_ddl_create_busyness_forecast_table.sql : table for ML-predicted busyness
-- =============================================================

BEGIN;

-- One row per POI x weekday x hour. Powers the "Busyness Forecast Chart".
-- Populated by the ML pipeline; no seed data inserted here.
CREATE TABLE poi_busyness_forecast (
  poi_id        BIGINT   NOT NULL REFERENCES poi(id) ON DELETE CASCADE,
  day_of_week   SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),  -- 0 = Monday
  hour_of_day   SMALLINT NOT NULL CHECK (hour_of_day BETWEEN 0 AND 23),
  busyness_pct  SMALLINT NOT NULL CHECK (busyness_pct BETWEEN 0 AND 100),
  level         busyness_level NOT NULL,                                -- bucketed pct
  source        TEXT NOT NULL DEFAULT 'model',                         -- 'model' | 'google_popular_times' | ...
  model_version TEXT,                                                   -- which model produced this row
  computed_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (poi_id, day_of_week, hour_of_day)
);

CREATE INDEX idx_forecast_poi   ON poi_busyness_forecast(poi_id);
CREATE INDEX idx_forecast_level ON poi_busyness_forecast(level);

COMMIT;
