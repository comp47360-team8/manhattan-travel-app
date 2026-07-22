from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from app.database import get_db
from app.services.poi_service import get_all_pois, get_poi_by_slug, unsave_poi_for_user
from app.services.poi_service import save_poi_for_user, get_poi_busyness
from app.services.photo_service import get_photo_url
from app.core.config import settings
from app.core.exceptions import POINotFoundError
from app.dependencies.auth import authorise_access
from app.schemas.poi import POIDetailedResponse, POISaveResponse, POIUnsaveResponse, POIBusynessResponse

router = APIRouter(prefix="/api/pois", tags=["pois"])


def _serialise_poi(poi, request: Request) -> POIDetailedResponse:
    """Serialise a POI, pointing hero_image_url at our durable photo proxy.

    The stored hero_image_url is a Google media URL that expires. When we have a
    stable google_place_id and a key configured, hand clients a stable URL on our
    own host that resolves a fresh image on each load. Absolute (not relative) so
    the iOS client, which does URL(string:) with no base, can use it directly.
    """
    response = POIDetailedResponse.model_validate(poi)
    if poi.google_place_id and settings.GOOGLE_PLACES_API_KEY:
        base = str(request.base_url).rstrip("/")
        response.hero_image_url = f"{base}/api/pois/{poi.slug}/photo"
    return response


@router.get("", response_model=list[POIDetailedResponse])
def get_pois(request: Request, db: Session = Depends(get_db)):
    return [_serialise_poi(poi, request) for poi in get_all_pois(db)]

@router.get("/{slug}/crowd-forecast", response_model=POIBusynessResponse)
def display_hourly_busyness(slug: str, db: Session = Depends(get_db)):
    poi = get_poi_by_slug(slug, db)
    return get_poi_busyness(poi, db)

@router.get("/{slug}/photo")
def get_poi_photo(slug: str, db: Session = Depends(get_db)):
    """Redirect to a currently-valid Google photo for this POI.

    Resolves on demand from the POI's google_place_id, so the link never rots the
    way a stored media URL does. 404 when the POI has no place_id, no photo, or no
    key is configured; clients then show their placeholder.
    """
    poi = get_poi_by_slug(slug, db)
    if poi is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Attraction not found."
        )
    photo_url = get_photo_url(poi.google_place_id)
    if not photo_url:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No photo available."
        )
    # Cache the redirect at the browser/CDN so repeat views don't re-hit us.
    return RedirectResponse(
        photo_url,
        status_code=status.HTTP_307_TEMPORARY_REDIRECT,
        headers={"Cache-Control": "public, max-age=21600"},
    )

@router.get("/{slug}", response_model=POIDetailedResponse)
def get_poi(slug: str, request: Request, db: Session = Depends(get_db)):
    poi = get_poi_by_slug(slug, db)
    if poi is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Attraction not found."
        )
    return _serialise_poi(poi, request)

@router.post("/{slug}/save", response_model=POISaveResponse)
def save_poi(slug: str , db: Session = Depends(get_db), user = Depends(authorise_access)):
    try:
        save_poi_for_user(slug, db, user)
        return POISaveResponse(
            message="Attraction saved."
        )

    except POINotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Attraction not found."
        )
    
@router.delete("/{slug}/save", response_model=POIUnsaveResponse)
def unsave_poi(slug: str, db: Session = Depends(get_db), user = Depends(authorise_access)):
    try:
        unsave_poi_for_user(slug, db, user)
        return POIUnsaveResponse(
            message="Attraction unsaved."
        )
    
    except POINotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Attraction not found."
        )

    

    

