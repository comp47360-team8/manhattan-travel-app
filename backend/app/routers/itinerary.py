from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.schemas.itinerary import ItineraryRequest
from app.services.itinerary.itinerary_service import create_itinerary
from app.database import get_db
from app.core.exceptions import MaximumPOIsExceeded, POINotOpenDuringTrip, StopNotFound, RepeatingPOI, ItineraryNotFound, POINotFoundError
from app.dependencies.auth import authorise_access
from app.schemas.itinerary import ItineraryResponse, ItinerarySavedResponse, ItineraryUnsaveResponse, AddStopRequest
from app.repositories.itinerary_repository import (
    save_itinerary_for_user, unsave_itinerary_for_user, 
    serialize_itinerary, create_new_request,
    update_saved_itinerary)

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
    except POINotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    
    except POINotOpenDuringTrip as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except RepeatingPOI:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"You cannot enter the same POI more than once. Please try again."
        )
    
@router.post("", response_model=ItinerarySavedResponse)
def save_itinerary(request: ItineraryResponse, db: Session = Depends(get_db), user = Depends(authorise_access)):
    try:
        itinerary = save_itinerary_for_user(request, db, user)
        return serialize_itinerary(itinerary)
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Something went wrong while processing your itinerary: {str(e)}"
        )
    
@router.delete("/{itinerary_id}", response_model=ItineraryUnsaveResponse)
def unsave_itinerary(itinerary_id, db: Session = Depends(get_db), user = Depends(authorise_access)):
    try:
        unsave_itinerary_for_user(itinerary_id, db, user)
        return ItineraryUnsaveResponse(
            message="Itinerary unsaved."
        )
    
    except ItineraryNotFound:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Itinerary not found."
        )
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Something went wrong while processing your itinerary: {str(e)}"
        )

@router.post("/{itinerary_id}/stops", response_model=ItinerarySavedResponse)
def add_stop(itinerary_id, request: AddStopRequest, db: Session = Depends(get_db), user = Depends(authorise_access)):
    try:
        new_request = create_new_request(itinerary_id, request.slug, None, db, user)
        new_itinerary = generate_itinerary(new_request, db)
        return update_saved_itinerary(new_itinerary, itinerary_id, db, user)
    
    except POINotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="POI not found."
        )
    
    except ItineraryNotFound:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Itinerary not found."
        )
    
@router.delete("/{itinerary_id}/stops/{stop_id}", response_model=ItinerarySavedResponse)
def delete_stop(itinerary_id, stop_id, db: Session = Depends(get_db), user = Depends(authorise_access)):
    try:
        new_request = create_new_request(itinerary_id, None, stop_id, db, user)
        new_itinerary = generate_itinerary(new_request, db)
        return update_saved_itinerary(new_itinerary, itinerary_id, db, user)
        
    except StopNotFound:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Stop not found."
        )
    except ItineraryNotFound:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Itinerary not found."
        )