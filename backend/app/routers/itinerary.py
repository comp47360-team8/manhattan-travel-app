from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.schemas.itinerary import ItineraryRequest
from app.services.itinerary.itinerary_service import create_itinerary
from app.database import get_db
from app.core.exceptions import MaximumPOIsExceeded, POINotOpenDuringTrip
from app.dependencies.auth import authorise_access
from app.schemas.itinerary import ItineraryResponse, ItinerarySaveResponse, ItineraryUnsaveResponse
from app.repositories.itinerary_repository import save_itinerary_for_user, unsave_itinerary_for_user, serialize_itinerary

router = APIRouter(prefix="/api/itinerary", tags=["itinerary"])

@router.post("/generate", response_model=ItineraryResponse)
def generate_itinerary(request: ItineraryRequest, db: Session = Depends(get_db)):
    try:
        return create_itinerary(request, db)
    
    except MaximumPOIsExceeded:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Too many POIs for your date range. Maximum 5 POIs per day."
        )
    
    except POINotOpenDuringTrip as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    
@router.post("")
def save_itinerary(request: ItineraryResponse, db: Session = Depends(get_db), user = Depends(authorise_access)):
    try:
        itinerary = save_itinerary_for_user(request, db, user)
        return serialize_itinerary(itinerary)
    except Exception as e:
        raise e
    
@router.delete("/{itinerary_id}", response_model=ItineraryUnsaveResponse)
def unsave_itinerary(itinerary_id, db: Session = Depends(get_db), user = Depends(authorise_access)):
    try:
        unsave_itinerary_for_user(itinerary_id, db, user)
        return ItineraryUnsaveResponse(
            message="Itinerary unsaved."
        )
    except Exception as e:
        raise e
    



        

    
    

