from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.services.poi_service import save_poi_for_user, get_saved_pois
from app.schemas.poi import POICreate
from app.core.exceptions import POINotFoundError, POIAlreadySavedError
from app.dependencies.auth import authorise_access

router = APIRouter(prefix="/saved-pois", tags=["saved-pois"])


@router.post("")
def save_poi(slug: POICreate, db: Session = Depends(get_db), user=Depends(authorise_access)):
    try:
        save_poi_for_user(slug.name, db, user)
        return {"message": "poi saved"}

    except POINotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="POI not found."
        )

    except POIAlreadySavedError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This location is already saved.",
        )


@router.get("")
def display_saved_pois(db: Session = Depends(get_db), user=Depends(authorise_access)):
    return get_saved_pois(db, user)
