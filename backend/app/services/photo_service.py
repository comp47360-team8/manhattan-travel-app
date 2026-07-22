"""Resolve fresh Google Places photo URLs on demand.

Google Places (New) photo media URLs (lh3.googleusercontent.com/place-photos/...)
are short-lived by spec, so storing them in the DB means they rot. Instead we keep
only the stable google_place_id per POI and resolve a fresh URL at request time,
caching the result briefly to bound API cost.

Two calls per cache miss:
  1. Place Details (photos field mask) -> the first photo's resource name.
  2. Place Photo media (skipHttpRedirect) -> a fresh photoUri as JSON, so the API
     key is never exposed in a browser-visible redirect.
"""
import time
import threading

import httpx

from app.core.config import settings

_PLACES_BASE = "https://places.googleapis.com/v1"
_MAX_WIDTH_PX = 800
_TIMEOUT_S = 8.0

# Resolved photoUris are valid for a while; cache them so we don't hit Google on
# every image load. Keyed by place_id.
_CACHE_TTL_S = 6 * 60 * 60
_cache: dict[str, tuple[float, str | None]] = {}
_lock = threading.Lock()


def get_photo_url(place_id: str | None) -> str | None:
    """Return a currently-valid image URL for a place, or None if unavailable.

    None (rather than an exception) on every failure path: no key configured, no
    place_id, the place has no photos, or Google is unreachable. Callers treat
    None as "no photo" and fall back to a placeholder.
    """
    if not place_id or not settings.GOOGLE_PLACES_API_KEY:
        return None

    now = time.time()
    with _lock:
        cached = _cache.get(place_id)
        if cached and cached[0] > now:
            return cached[1]

    url = _resolve(place_id)

    with _lock:
        _cache[place_id] = (now + _CACHE_TTL_S, url)
    return url


def _resolve(place_id: str) -> str | None:
    headers = {"X-Goog-Api-Key": settings.GOOGLE_PLACES_API_KEY}
    try:
        with httpx.Client(timeout=_TIMEOUT_S) as client:
            details = client.get(
                f"{_PLACES_BASE}/places/{place_id}",
                headers={**headers, "X-Goog-FieldMask": "photos"},
            )
            details.raise_for_status()
            photos = details.json().get("photos") or []
            if not photos:
                return None

            media = client.get(
                f"{_PLACES_BASE}/{photos[0]['name']}/media",
                headers=headers,
                params={"maxWidthPx": _MAX_WIDTH_PX, "skipHttpRedirect": "true"},
            )
            media.raise_for_status()
            return media.json().get("photoUri")
    except (httpx.HTTPError, KeyError, ValueError):
        return None
