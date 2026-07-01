-- =============================================================
-- OFFPEAK — POI schema (PostgreSQL)
-- 01_ddl_create_poi_table.sql : create tables + insert 5 NYC POIs
-- Run: psql -d offpeak -f db/01_ddl_create_poi_table.sql
-- Sources: data/google_busyness.json, data/osm_attributes.json
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

  -- live/predicted crowd snapshot (populated by ML pipeline; not added here)
  current_busyness     busyness_level,
  current_busyness_at  TIMESTAMPTZ,                     -- when the snapshot was computed

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

-- =============================================================
-- Insert data: 5 NYC POIs
-- All core fields sourced from data/google_busyness.json and data/osm_attributes.json.
-- NULL fields (hero_image_url, map_embed_url, phone) require Google Places Photos/Details API.
-- current_busyness is intentionally NULL — populated by the ML pipeline at runtime.
-- =============================================================
INSERT INTO poi (
  slug, name, type, summary, description,
  borough, neighborhood, address, latitude, longitude,
  opening_hours, opening_hours_text,
  google_place_id, google_review_star, google_review_count,
  best_time_start, best_time_end, best_time_label, why_this_time,
  accessibility_labels, admission_fee, admission_text, recommended_duration_min,
  closest_subway, map_external_url, website_url, tags
) VALUES
-- 1. Central Park
-- google_busyness.json: place_id ChIJ4zGFAZpYwokRGUGph3Mf37k, rating 4.8, reviews 300300
-- osm_attributes.json: opening_hours 06:00-01:00, wheelchair yes
(
  'central-park', 'Central Park', 'park',
  'A 843-acre urban oasis stretching through the heart of Manhattan.',
  'Designed by Frederick Law Olmsted and Calvert Vaux, Central Park offers meadows, lakes, outdoor theaters, and miles of walking paths. Home to the Bethesda Fountain, Sheep Meadow, and the Delacorte Theater.',
  'Manhattan', 'Midtown', 'Central Park, New York, NY 10024',
  40.7825547, -73.9655834,
  '{"mon":[["06:00","01:00"]],"tue":[["06:00","01:00"]],"wed":[["06:00","01:00"]],"thu":[["06:00","01:00"]],"fri":[["06:00","01:00"]],"sat":[["06:00","01:00"]],"sun":[["06:00","01:00"]]}',
  'Daily 6 AM–1 AM',
  'ChIJ4zGFAZpYwokRGUGph3Mf37k', 4.8, 300300,
  '07:00', '09:00', 'Weekday mornings',
  'Weekend afternoons push busyness above 80%; weekday mornings before 9 AM are calm with far fewer visitors.',
  ARRAY['wheelchair'], 0, 'Free', 180,
  '72 St (B,C) or 86 St (4,5,6)',
  'https://maps.google.com/?q=Central+Park+New+York',
  'https://www.centralparknyc.org',
  ARRAY['park','nature','outdoor','free','walk']
),
-- 2. Times Square
-- google_busyness.json: place_id ChIJmQJIxlVYwokRLgeuocVOGVU, rating 4.7, reviews 243817
-- osm_attributes.json: no opening_hours, no wheelchair data
(
  'times-square', 'Times Square', 'landmark',
  'The neon-lit crossroads of the world, buzzing day and night with Broadway marquees and giant billboards.',
  'Times Square stretches from 42nd to 47th Street along Broadway, drawing over 50 million visitors a year to its theater district, flagship stores, and iconic New Year''s Eve ball drop.',
  'Manhattan', 'Midtown', 'Manhattan, NY 10036',
  40.7579747, -73.9855426,
  '{"mon":[["00:00","24:00"]],"tue":[["00:00","24:00"]],"wed":[["00:00","24:00"]],"thu":[["00:00","24:00"]],"fri":[["00:00","24:00"]],"sat":[["00:00","24:00"]],"sun":[["00:00","24:00"]]}',
  'Open 24 hours',
  'ChIJmQJIxlVYwokRLgeuocVOGVU', 4.7, 243817,
  '08:00', '10:00', 'Weekday mornings',
  'Evenings and weekends push crowd levels above 85%; weekday mornings have far fewer tourists and better photo opportunities.',
  NULL, 0, 'Free', 60,
  '42 St–Times Sq (1,2,3,7,N,Q,R,W,S)',
  'https://maps.google.com/?q=Times+Square+New+York',
  'https://www.timessquarenyc.org',
  ARRAY['landmark','nyc-icon','free','broadway','photo-spot']
),
-- 3. 9/11 Memorial & Museum
-- google_busyness.json: place_id ChIJRcvoOxpawokR7R4dQMXMMPQ, rating 4.8, reviews 93953
-- osm_attributes.json: opening_hours Mo-Th 09:00-20:00, Fr-Sa 09:00-21:00, Su 09:00-20:00; wheelchair yes
(
  '9-11-memorial', '9/11 Memorial & Museum', 'museum',
  'A solemn tribute at Ground Zero honoring the nearly 3,000 victims of the September 11 attacks.',
  'The memorial''s twin reflecting pools occupy the footprints of the original Twin Towers, surrounded by bronze panels engraved with every victim''s name. The underground museum traces the events of 9/11 through artifacts, oral histories, and exhibitions.',
  'Manhattan', 'Financial District', '180 Greenwich St, New York, NY 10007',
  40.7115776, -74.0133362,
  '{"mon":[["09:00","20:00"]],"tue":[["09:00","20:00"]],"wed":[["09:00","20:00"]],"thu":[["09:00","20:00"]],"fri":[["09:00","21:00"]],"sat":[["09:00","21:00"]],"sun":[["09:00","20:00"]]}',
  'Mon–Thu & Sun 9 AM–8 PM; Fri–Sat 9 AM–9 PM',
  'ChIJRcvoOxpawokR7R4dQMXMMPQ', 4.8, 93953,
  '09:00', '11:00', 'At opening, any weekday',
  'Busyness climbs above 90% from noon onward; arriving right at 9 AM gives the quietest and most reflective experience.',
  ARRAY['wheelchair','accessible_restroom'], 33.00, '$33 adults; outdoor memorial pools are free', 90,
  'Cortlandt St (1) or Fulton St (2,3,4,5,A,C,J,Z)',
  'https://maps.google.com/?q=9/11+Memorial+Museum+New+York',
  'https://www.911memorial.org',
  ARRAY['museum','memorial','history','indoor','landmark']
),
-- 4. Grand Central Terminal
-- google_busyness.json: place_id ChIJhRwB-yFawokRi0AhGH87UTc, rating 4.7, reviews 7628
-- osm_attributes.json: opening_hours Mo-Su 05:30-02:00; wheelchair yes
(
  'grand-central-terminal', 'Grand Central Terminal', 'landmark',
  'Beaux-Arts masterpiece and working rail hub beneath a celestial ceiling of 2,500 stars.',
  'Opened in 1913, Grand Central handles half a million visitors daily across its Main Concourse, dining concourse, and the famous Oyster Bar. The celestial ceiling mural and the whisper gallery are architectural must-sees.',
  'Manhattan', 'Midtown East', '89 E 42nd St, New York, NY 10017',
  40.7533582, -73.9768041,
  '{"mon":[["05:30","02:00"]],"tue":[["05:30","02:00"]],"wed":[["05:30","02:00"]],"thu":[["05:30","02:00"]],"fri":[["05:30","02:00"]],"sat":[["05:30","02:00"]],"sun":[["05:30","02:00"]]}',
  'Daily 5:30 AM–2 AM',
  'ChIJhRwB-yFawokRi0AhGH87UTc', 4.7, 7628,
  '08:00', '10:00', 'Weekday early morning',
  'Commuter rush fades by mid-morning; early arrivals get the Main Concourse nearly to themselves for an unobstructed look at the architecture.',
  ARRAY['wheelchair','accessible_restroom'], 0, 'Free', 60,
  'Grand Central–42 St (4,5,6,7,S)',
  'https://maps.google.com/?q=Grand+Central+Terminal+New+York',
  'https://www.grandcentralterminal.com',
  ARRAY['landmark','architecture','free','indoor','transit']
),
-- 5. The High Line
-- google_busyness.json: place_id ChIJ5bQPhMdZwokRkTwKhVxhP1g, rating 4.7, reviews 67573
-- osm_attributes.json: opening_hours Mo-Su 07:00-19:00; wheelchair yes
(
  'the-high-line', 'The High Line', 'park',
  'Elevated rail-trail turned urban park stretching 1.45 miles above Chelsea and Hudson Yards.',
  'Built on a former freight rail line, the High Line winds through the West Side offering rotating public art installations, native plantings, and city views from 14th to 34th Street. Directly connected to Chelsea Market and The Shed.',
  'Manhattan', 'Chelsea', 'New York, NY 10011',
  40.7479925, -74.0047649,
  '{"mon":[["07:00","19:00"]],"tue":[["07:00","19:00"]],"wed":[["07:00","19:00"]],"thu":[["07:00","19:00"]],"fri":[["07:00","19:00"]],"sat":[["07:00","19:00"]],"sun":[["07:00","19:00"]]}',
  'Daily 7 AM–7 PM',
  'ChIJ5bQPhMdZwokRkTwKhVxhP1g', 4.7, 67573,
  '07:00', '09:00', 'Weekday mornings at opening',
  'Weekend afternoons fill the walkway; arriving at opening on a weekday gives you the gardens and art installations without the crowds.',
  ARRAY['wheelchair'], 0, 'Free', 60,
  '14 St / 8 Av (A,C,E,L) or 23 St (C,E)',
  'https://maps.google.com/?q=The+High+Line+New+York',
  'https://www.thehighline.org',
  ARRAY['park','outdoor','free','art','walk']
);

COMMIT;
