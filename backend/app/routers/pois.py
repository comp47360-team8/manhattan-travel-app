from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.services.poi_service import get_all_pois, get_poi_by_slug

router = APIRouter(prefix="/pois", tags=["pois"])

@router.get("")
def get_pois(db: Session = Depends(get_db)):
    return get_all_pois(db)


@router.get("/{slug}")
def get_poi(slug:str, db: Session = Depends(get_db)):
    poi = get_poi_by_slug(slug, db)
    if poi is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Destination not found."
        )
    return poi
    
    

    

