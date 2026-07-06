from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.services.poi_service import get_saved_pois
from app.dependencies.auth import authorise_access
from app.schemas.poi import POIDetailedResponse
from app.repositories.itinerary_repository import get_saved_itineraries, get_saved_itinerary
from app.schemas.itinerary import ItineraryResponse, SaveItineraryResponse
from app.core.exceptions import ItineraryNotFound

router = APIRouter(prefix="/api/users/me", tags=["users"])

@router.get("/saved-pois", response_model=list[POIDetailedResponse])
def display_saved_pois(db: Session = Depends(get_db), user=Depends(authorise_access)):
    return get_saved_pois(db, user)

@router.get("/saved-itineraries", response_model=list[SaveItineraryResponse])
def display_saved_itineraries(db: Session = Depends(get_db), user=Depends(authorise_access)):
    return get_saved_itineraries(db, user)

@router.get("/saved-itineraries/{itinerary_id}", response_model=ItineraryResponse)
def display_saved_itinerary(itinerary_id, db: Session = Depends(get_db), user=Depends(authorise_access)):
    try:
        return get_saved_itinerary(itinerary_id, db, user)
    except ItineraryNotFound:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Itinerary not found."
        )

