// Shared TypeScript types used across the web frontend.
//
// The itinerary and POI types mirror the current FastAPI schemas.
// The authentication types are intentionally flexible because some auth
// endpoints currently return only a success message rather than full user data.

/* =========================================================
   Authentication and profile types
========================================================= */

export type AuthMode = "login" | "register";

/*
  Basic user information stored by the frontend after login or registration.

  The backend currently authenticates web users using HttpOnly cookies.
  The cookie itself cannot be read by JavaScript, which is intentional.
*/
export type AuthUser = {
  email: string;
  displayName: string;
};

/*
  Possible successful authentication response.

  Some backend responses may return only:
  { message: "Login successful." }

  The optional fields allow the frontend to use additional user information
  later without breaking the current implementation.
*/
export type AuthResponse = {
  message?: string;
  email?: string;
  display_name?: string;
  username?: string;
  user?: {
    email?: string;
    display_name?: string;
    username?: string;
  };
};

/*
  Profile preferences currently handled by the frontend UI.

  These can later be sent to a backend profile endpoint when one exists.
*/
export type ProfilePreferences = {
  stepFreeRoutes: boolean;
};

/* =========================================================
   POI types
========================================================= */

export type Poi = {
  id?: number;
  slug: string;
  name: string;
  type: string;
  address: string | null;
  summary: string | null;
  description: string | null;
  borough: string;
  neighborhood: string | null;
  phone: string | null;
  latitude: number | null;
  longitude: number | null;
  hero_image_url: string | null;
  gallery_image_urls: string[] | null;
  opening_hours: Record<string, unknown> | null;
  opening_hours_text: string | null;
  availability_mode?: string | null;
  google_place_id?: string | null;
  google_review_star: number | null;
  google_review_count: number | null;
  current_busyness: string | null;
  current_busyness_at: string | null;
  best_time_start: string | null;
  best_time_end: string | null;
  best_time_label: string | null;
  why_this_time: string | null;
  accessibility_labels: string[] | null;
  admission_fee: number | null;
  admission_text: string | null;
  recommended_duration_min: number | null;
  closest_subway: string | null;
  map_embed_url: string | null;
  map_external_url: string | null;
  website_url: string | null;
  tags: string[] | null;
  is_active?: boolean;
};

/* =========================================================
   Itinerary generation types
========================================================= */

/*
  Request body for:

  POST /api/itinerary/generate

  trip_dates contains:
  [start date, end date]
*/
export type ItineraryGenerateRequest = {
  trip_name: string;
  trip_dates: string[];
  pois: string[];
  accessibility: Array<string | null>;
};

/*
  One hour in the busyness forecast returned for an itinerary stop.
*/
export type BusynessResponse = {
  hour_of_day: number;
  busyness: number;
};

/*
  GET /api/pois/{slug}/crowd-forecast returns three forecast periods for
  the selected attraction.
*/
export type PoiCrowdForecast = {
  today: BusynessResponse[];
  tomorrow: BusynessResponse[];
  weekend: BusynessResponse[];
};

/*
  One stop returned by the itinerary generation endpoint.

  Python date and time values arrive in the browser as JSON strings.
*/
export type ItineraryStop = {
  poi_id: number;
  poi_name: string;
  slug: string;
  day_number: number;
  visit_date: string;
  slot: string;
  slot_start: string;
  slot_end: string;
  position: number;
  poi_type: string;
  crowd_level: string;
  hero_image_url: string;
  borough: string;
  neighborhood: string;
  suggested_duration: number;
  accessibility: unknown[];
  flags: string[];
  busyness_for_day: BusynessResponse[];
};

/*
  Response from:

  POST /api/itinerary/generate
*/
export type ItineraryResponse = {
  trip_name: string;
  start_date: string;
  end_date: string;
  warning: string | null;
  accessibility: string[];
  stops: ItineraryStop[];
};

/* =========================================================
   Saved itinerary types
========================================================= */

/*
  Preview returned by:

  GET /api/users/me/saved-itineraries
*/
export type SavedItineraryPreview = {
  itinerary_id: string;
  trip_name: string;
  start_date: string;
  end_date: string;
  number_of_places: number;
  hero_image_url: string | null;
};

/*
  A saved itinerary stop includes stop_id.

  stop_id is required by:

  DELETE /api/itinerary/{itinerary_id}/stops/{stop_id}
*/
export type SavedItineraryStop = ItineraryStop & {
  stop_id: string;
  accessibility: string[] | null;
};

/*
  Response returned after saving or editing an itinerary.

  This mirrors the current ItinerarySavedResponse backend model.
*/
export type SavedItinerary = {
  itinerary_id: string;
  trip_name: string;
  start_date?: string;
  end_date: string;
  warning: string | null;
  stops: SavedItineraryStop[];
};

/*
  Request body for:

  POST /api/itinerary/{itinerary_id}/stops
*/
export type AddStopRequest = {
  slug: string;
};

/* =========================================================
   General API response types
========================================================= */

/*
  Used by endpoints that return only a message.
*/
export type ApiMessageResponse = {
  message: string;
};