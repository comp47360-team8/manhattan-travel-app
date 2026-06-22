from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.services.poi_service import get_all_pois, get_poi_by_slug, unsave_poi_for_user
from app.services.poi_service import save_poi_for_user
from app.core.exceptions import POINotFoundError
from app.dependencies.auth import authorise_access
from app.schemas.poi import POIDetailedResponse, POISaveResponse, POIUnsaveResponse

router = APIRouter(prefix="/pois", tags=["pois"])

@router.get("", response_model=list[POIDetailedResponse])
def get_pois(db: Session = Depends(get_db)):
    return get_all_pois(db)


@router.get("/{slug}", response_model=POIDetailedResponse)
def get_poi(slug: str, db: Session = Depends(get_db)):
    poi = get_poi_by_slug(slug, db)
    if poi is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Attraction not found."
        )
    return poi


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

    

    

