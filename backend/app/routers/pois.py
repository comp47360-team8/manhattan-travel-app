from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from app.database import get_db
from app.services.poi_service import (
    get_all_pois, get_poi_by_slug, unsave_poi_for_user,
    save_poi_for_user, get_poi_busyness, serialise_poi, attach_current_busyness)
from app.services.photo_service import get_photo_url
from app.core.exceptions import POINotFoundError
from app.dependencies.auth import authorise_access
from app.schemas.poi import POIDetailedResponse, POISaveResponse, POIUnsaveResponse, POIBusynessResponse

router = APIRouter(prefix="/api/pois", tags=["pois"])


@router.get("", response_model=list[POIDetailedResponse])
def get_pois(db: Session = Depends(get_db)):
    return [serialise_poi(poi) for poi in get_all_pois(db)]

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
    photo_url = get_photo_url(poi.google_place_id, db)
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
def get_poi(slug: str, db: Session = Depends(get_db)):
    poi = get_poi_by_slug(slug, db)
    if poi is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Attraction not found."
        )
    attach_current_busyness([poi], db)
    return serialise_poi(poi)

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

    

    

