-- =============================================================
-- OFFPEAK — POI schema (PostgreSQL)
-- 01_create_poi.sql : create tables (DDL only; POIs seeded by 03_dml_seed_poi_table.sql)
-- Run: psql -d offpeak -f db/01_create_poi.sql
-- =============================================================

BEGIN;

-- ---------- Enums ----------
CREATE TYPE poi_type AS ENUM (
  'landmark', 'museum', 'viewpoint', 'market', 'park', 'gallery', 'neighborhood', 'other'
);

CREATE TYPE busyness_level AS ENUM ('quiet', 'moderate', 'busy', 'very_busy');

-- ---------- Main POI table ----------
CREATE TABLE poi (
  id                   BIGSERIAL PRIMARY KEY,
  slug                 TEXT UNIQUE NOT NULL,            -- url-friendly id, e.g. 'brooklyn-bridge'
  name                 TEXT NOT NULL,
  type                 poi_type NOT NULL,
  summary              TEXT,                            -- short blurb (appears in mockup card)
  description          TEXT,                            -- long-form detail page text
  borough              TEXT NOT NULL CHECK (borough IN
                         ('Manhattan','Brooklyn','Queens','Bronx','Staten Island')),
  neighborhood         TEXT,                            -- finer-grained than borough
  address              TEXT,
  latitude             DOUBLE PRECISION CHECK (latitude  BETWEEN -90  AND 90),
  longitude            DOUBLE PRECISION CHECK (longitude BETWEEN -180 AND 180),

  hero_image_url       TEXT,
  gallery_image_urls   TEXT[],                          -- extra photos (detail page carousel)

  opening_hours        JSONB,                           -- {"mon":[["10:00","17:30"]], ... } null = closed
  opening_hours_text   TEXT,                            -- display fallback, e.g. "Open 24 hours"

  google_place_id      TEXT UNIQUE,                     -- join key for SerpAPI/popular-times pipeline
  google_review_star   NUMERIC(2,1) CHECK (google_review_star BETWEEN 0 AND 5),
  google_review_count  INTEGER CHECK (google_review_count >= 0),

  best_time_start      TIME,                            -- recommended visit window
  best_time_end        TIME,
  best_time_label      TEXT,                            -- e.g. "Weekdays 8–10 AM"
  why_this_time        TEXT,                            -- rationale shown to user

  accessibility_labels TEXT[],                          -- e.g. {'wheelchair','accessible_restroom','step_free'}

  admission_fee        NUMERIC(8,2),                    -- NULL = unknown, 0 = free
  admission_text       TEXT,                            -- e.g. "Free", "$30 adults / pay-what-you-wish Fri"
  recommended_duration_min INTEGER CHECK (recommended_duration_min > 0),  -- minutes

  closest_subway       TEXT,                            -- e.g. "High St (A,C)"
  map_embed_url        TEXT,                            -- iframe/widget src
  map_external_url     TEXT,                            -- open-in-Google-Maps link
  website_url          TEXT,
  phone                TEXT,

  tags                 TEXT[],                          -- search/filter keywords
  is_active            BOOLEAN NOT NULL DEFAULT TRUE,   -- soft delete / hide from app
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_poi_type     ON poi(type);
CREATE INDEX idx_poi_borough  ON poi(borough);
CREATE INDEX idx_poi_geo      ON poi(latitude, longitude);
CREATE INDEX idx_poi_tags     ON poi USING GIN(tags);

-- keep updated_at fresh
CREATE OR REPLACE FUNCTION touch_updated_at() RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_poi_touch BEFORE UPDATE ON poi
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

COMMIT;
