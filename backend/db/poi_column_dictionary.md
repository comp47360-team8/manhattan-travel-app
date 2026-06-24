# POI Table — Column Sources & Data Dictionary

Reference for the `poi` table defined in `db/01_create_poi_table.sql`.
Describes what each column means, where its data comes from, when it may be NULL, and how often it should be refreshed.

---

## Identity & Classification

| Column | Type | Nullable | Description |
|---|---|---|---|
| `id` | BIGSERIAL | NO | Auto-incrementing primary key. Set by the database on insert. |
| `slug` | TEXT UNIQUE | NO | URL-safe identifier derived from `name` at insert time (e.g. `"central-park"`). Regex: `[^a-z0-9]+ → "-"`. Used as the stable URL path for the detail page. Never changes after first insert. |
| `name` | TEXT | NO | Display name as returned by the Google Places API. |
| `type` | poi_type | NO | Categorical type for filtering and UI icons. Enum values: `landmark`, `museum`, `viewpoint`, `market`, `park`, `gallery`, `neighborhood`, `other`. |

**`type` resolution order**:
1. Semantic override dict (hardcoded corrections for known-wrong data)
2. First element of the `type` array in `data/raw/google_busyness.json`, mapped through a lookup table
3. `osm_category` from the POI registry, mapped through the same lookup table

---

## Descriptions

| Column | Type | Nullable | Description |
|---|---|---|---|
| `summary` | TEXT | YES | 1–3 sentence visitor-facing blurb for the card view. Sourced from Wikipedia REST API (`extract` field) for ~92/198 POIs; Claude Haiku-generated for the remainder. NULL only for very obscure POIs where neither source produces usable text. |
| `description` | TEXT | YES | Longer-form introductory text for the detail page (~100–500 words). Sourced from Wikipedia article intro section. NULL for POIs without a matched English Wikipedia article. |

---

## Location

| Column | Type | Nullable | Description |
|---|---|---|---|
| `borough` | TEXT | NO | NYC borough. All current POIs are `"Manhattan"`. CHECK constraint enforces valid borough names. |
| `neighborhood` | TEXT | YES | Sub-borough district name from the **NYC 2020 Neighborhood Tabulation Areas (NTA)** shapefile (NYC Open Data). Determined by point-in-polygon spatial join on lat/lon; waterfront POIs use nearest-NTA-centroid fallback. |
| `address` | TEXT | YES | Street address string from the Google Places API initial discovery call. |
| `latitude` | DOUBLE PRECISION | YES | WGS84 decimal degrees. Source priority: Google Places candidate → SerpAPI GPS → OpenStreetMap. See `coord_source` in the intermediate POI registry. |
| `longitude` | DOUBLE PRECISION | YES | Same source priority as `latitude`. |

---

## Images

| Column | Type | Nullable | Description |
|---|---|---|---|
| `hero_image_url` | TEXT | YES | CDN URL for the primary card/header image. Source priority: Google Places Photos API → Wikipedia thumbnail. NULL if neither source returns an image. |
| `gallery_image_urls` | TEXT[] | YES | Array of up to 3 additional CDN URLs for the detail-page carousel. All from Google Places Photos API (photo references 2–4). NULL or empty array if fewer than 2 photo references available. |

---

## Hours

| Column | Type | Nullable | Description |
|---|---|---|---|
| `opening_hours` | JSONB | YES | Structured opening hours in the format `{"mon": [["HH:MM", "HH:MM"]], ...}`. Day keys are 3-letter abbreviations (`mon`–`sun`). Each value is an array of `[open, close]` time pairs (24h format). Overnight intervals are expressed with close < open (e.g. `["06:00","01:00"]` = 6 AM to 1 AM next day). `null` for a day means closed. Top-level NULL means hours are unknown. |
| `opening_hours_text` | TEXT | YES | Human-readable fallback string for the UI (e.g. `"Daily 9 AM–5 PM"`, `"Mon–Fri 10:00–18:00"`). Generated from `opening_hours` JSONB where available; falls back to the raw OSM `opening_hours` tag string. NULL for ~8 POIs where neither source is available. |

**Source:** Fetch via Google Places API. 46/198 POIs have NULL opening hours from the API (primarily outdoor public spaces with no structured hours); these will require manual update later on.

---

## Google Places Metadata

| Column | Type | Nullable | Description |
|---|---|---|---|
| `google_place_id` | TEXT UNIQUE | YES | Google Places API identifier (e.g. `ChIJaXQRs6lZwokRY6EFpJnhNNE`). Used as the join key for the SerpAPI popular-times pipeline and for re-fetching any column. |
| `google_review_star` | NUMERIC(2,1) | YES | Average Google star rating (0.0–5.0). Sourced from the initial Places API discovery call. Refresh periodically (monthly) as ratings drift. |
| `google_review_count` | INTEGER | YES | Total number of Google reviews at last fetch. Same refresh cadence as `google_review_star`. |

---

## ML Pipeline Outputs (populated later — NULL at initial insert)

| Column | Type | Nullable | Description |
|---|---|---|---|
| `current_busyness` | busyness_level | YES | Live or predicted crowd level snapshot. Enum: `quiet`, `moderate`, `busy`, `very_busy`. Set by the FastAPI ML inference layer at serve time or on a schedule. |
| `current_busyness_at` | TIMESTAMPTZ | YES | Timestamp when `current_busyness` was last computed. |
| `best_time_start` | TIME | YES | Start of the recommended low-crowd visit window (e.g. `08:00`). Output of the Offpeak ML model trained on Google Popular Times data. |
| `best_time_end` | TIME | YES | End of the recommended visit window. |
| `best_time_label` | TEXT | YES | Human-readable label for the UI (e.g. `"Weekday mornings"`). |
| `why_this_time` | TEXT | YES | One-sentence rationale shown to the user (e.g. `"Weekend afternoons push crowds above 80%; arriving on a weekday before 9 AM keeps it calm."`). |

---

## Accessibility

| Column | Type | Nullable | Description |
|---|---|---|---|
| `accessibility_labels` | TEXT[] | YES | Array of accessibility feature tags. Current values: `"wheelchair"` (fully accessible), `"wheelchair_limited"` (partial access). Sourced from the OpenStreetMap `wheelchair` tag via `src/02_enrich_poi_attributes_osm.py`. Empty array means no OSM data (not necessarily inaccessible). |

---

## Admission

| Column | Type | Nullable | Description |
|---|---|---|---|
| `admission_fee` | NUMERIC(8,2) | YES | General adult admission cost in USD. `0` = free. `NULL` = unknown (not the same as free). Sourced from Wikidata property P2555/P1716. |
| `admission_text` | TEXT | YES | Human-readable pricing string for display (e.g. `"Free"`, `"$33 adults; free Fridays 5–9 PM"`). Generated by Claude Haiku using `admission_fee` + OSM `fee:conditional` tag. NULL when `admission_fee` is NULL. |

---

## Visit Planning

| Column | Type | Nullable | Description |
|---|---|---|---|
| `recommended_duration_min` | INTEGER | YES | Estimated visit duration in minutes. Used by the itinerary planner as a time-slot length. CHECK constraint enforces > 0. |

<details>
<summary>Full POI type vs duration definition</summary>
    "museum":                   90,
    "art_museum":               90,
    "modern art museum":        90,
    "history museum":           90,
    "natural history museum":   90,
    "local history museum":     90,
    "national museum":          90,
    "children's museum":        90,
    "wax museum":               90,
    "historical place museum":  90,
    "park":                     60,
    "city_park":                60,
    "garden":                   60,
    "botanical_garden":         60,
    "state park":               60,
    "memorial park":            60,
    "nature preserve":          60,
    "observation_deck":         45,
    "viewpoint":                45,
    "observatory":              45,
    "performing_arts_theater":  120,
    "concert hall":             120,
    "theatre":                  120,
    "movie theater":            120,
    "arena":                    150,
    "sports_centre":            150,
    "church":                   30,
    "place_of_worship":         30,
    "cathedral":                30,
    "landmark":                 30,
    "historical_landmark":      30,
    "monument":                 30,
    "bridge":                   30,
    "sculpture":                30,
    "castle":                   30,
    "zoo":                      120,
    "market":                   45,
    "plaza":                    45,
    "attraction":               45,
    "tourist_attraction":       45,
    "neighborhood":             60,
    "other":                    60
</details>

---

## Navigation

| Column | Type | Nullable | Description |
|---|---|---|---|
| `closest_subway` | TEXT | YES | Nearest subway station complex and its lines (e.g. `"34 St-Herald Sq (B,D,F,M,N,Q,R,W)"`). Computed great-circle distance. |
| `map_embed_url` | TEXT | YES | Google Maps Embed API URL for an inline iframe map. Source: Google Map API |
| `map_external_url` | TEXT | YES | Deep-link URL to open the POI in Google Maps (e.g. via a "Get directions" button). Format: `https://www.google.com/maps/search/?api=1&query={name}&query_place_id={place_id}`. |
| `website_url` | TEXT | YES | Official website URL. Source priority: OSM `website` tag → Google Places `websiteUri` → Wikidata P856. |
| `phone` | TEXT | YES | Contact phone number. Source priority: OSM `phone` tag → Google Places `nationalPhoneNumber`. |

---

## Taxonomy & Metadata

| Column | Type | Nullable | Description |
|---|---|---|---|
| `tags` | TEXT[] | YES | Array of lowercase keyword strings for search and filtering (e.g. `["park", "outdoor", "free", "wheelchair"]`). Assembled from: registry `category`, `osm_category`, `indoor_outdoor`, `wheelchair`, extended by Claude Haiku suggestions. GIN-indexed for fast `@>` and `&&` queries. |
| `is_active` | BOOLEAN | NO | Soft-delete flag. `TRUE` = visible in the app. `FALSE` = hidden without deleting the row. Default `TRUE`. |
| `created_at` | TIMESTAMPTZ | NO | Row creation timestamp. Set automatically by PostgreSQL `DEFAULT now()`. |
| `updated_at` | TIMESTAMPTZ | NO | Last-update timestamp. Maintained automatically by the `trg_poi_touch` trigger. |
