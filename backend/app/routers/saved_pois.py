from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.services.poi_service import get_saved_pois
from app.dependencies.auth import authorise_access
from app.schemas.poi import POIDetailedResponse

router = APIRouter(prefix="/api/users/me/saved-pois", tags=["saved-pois"])

@router.get("", response_model=list[POIDetailedResponse])
def display_saved_pois(db: Session = Depends(get_db), user=Depends(authorise_access)):
    return get_saved_pois(db, user)
