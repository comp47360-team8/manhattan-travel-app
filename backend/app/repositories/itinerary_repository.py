import uuid
from sqlalchemy import select, func
from sqlalchemy.orm import Session
from app.models.poi_model import POIBusynessForecast
from app.models.itinerary_model import SavedItinerary, ItineraryStop
from app.schemas.itinerary import ItineraryResponse
from app.core.exceptions import ItineraryNotFound, StopNotFound, POINotFoundError
from app.schemas.itinerary import ItineraryRequest
from app.services.poi_service import get_poi_by_slug

def get_crowd_level(id, day, slot, db: Session):
    statement = select(
        func.avg(POIBusynessForecast.busyness_pct).label("avg_busyness_pct"),
        POIBusynessForecast.poi_id,
        POIBusynessForecast.day_of_week,
        POIBusynessForecast.time_slot
        ).where(
            POIBusynessForecast.time_slot == slot,
            POIBusynessForecast.poi_id == id,
            POIBusynessForecast.day_of_week == day
        ).group_by(
            POIBusynessForecast.time_slot,
            POIBusynessForecast.poi_id,
            POIBusynessForecast.day_of_week
        )

    result = db.execute(statement).one_or_none()

    if result is None:
        return "Unavailable"
    
    elif result.avg_busyness_pct < 30:
        return "Quiet"
    
    elif 30 <= result.avg_busyness_pct < 50:
        return "Moderate"
        
    elif 50 <= result.avg_busyness_pct < 70:
        return "Busy"
    
    return "Very Busy"

def save_itinerary_for_user(itinerary: ItineraryResponse, db: Session, user: uuid.UUID):
    itinerary_entry = SavedItinerary(
        user_id=user,
        name=itinerary.trip_name,
        start_date=itinerary.start_date,
        end_date=itinerary.end_date,
        accessibility_requirements=itinerary.accessibility,
        warning=itinerary.warning
    )

    db.add(itinerary_entry)
    db.flush()

    for stop in itinerary.stops:
        db.add(
            ItineraryStop(
                itinerary_id=itinerary_entry.id,
                poi_id= stop.poi_id,
                day_number=stop.day_number,
                visit_date=stop.visit_date,
                slot=stop.slot,
                slot_start=stop.slot_start,
                slot_end=stop.slot_end,
                position=stop.position,
                crowd_level=stop.crowd_level,
                flags=stop.flags,
                busyness_for_day=[item.model_dump() for item in stop.busyness_for_day],
                hero_image_url=stop.hero_image_url,
        ))

    db.commit()
    db.refresh(itinerary_entry)

    return itinerary_entry

def serialize_itinerary(itinerary: SavedItinerary):
    return {
        "itinerary_id": str(itinerary.id),
        "trip_name" : itinerary.name,
        "start_date" : itinerary.start_date,
        "end_date": itinerary.end_date,
        "warning": itinerary.warning,
        "stops": [
            {
                "stop_id": str(stop.id),
                "poi_id": stop.poi_id,
                "poi_name": stop.poi.name,
                "slug": stop.poi.slug,
                "day_number": stop.day_number,
                "visit_date": stop.visit_date,
                "slot": stop.slot,
                "slot_start": stop.slot_start,
                "slot_end": stop.slot_end,
                "position": stop.position,
                "poi_type": stop.poi.type,
                "crowd_level": stop.crowd_level,
                "hero_image_url": stop.hero_image_url,
                "borough": stop.poi.borough,
                "neighborhood": stop.poi.neighborhood,
                "suggested_duration": stop.poi.recommended_duration_min,
                "accessibility": stop.poi.accessibility_labels,
                "flags": stop.flags,
                "busyness_for_day": stop.busyness_for_day
            } for stop in itinerary.stops
        ]
    }

def get_saved_itineraries(db: Session, user: uuid.UUID):
    statement = select(SavedItinerary).where(SavedItinerary.user_id == user)
    all_itineraries = db.execute(statement).scalars().all()

    return [{
        "itinerary_id": str(itinerary.id),
        "trip_name": itinerary.name,
        "start_date": itinerary.start_date,
        "end_date": itinerary.end_date,
        "number_of_places": len(itinerary.stops),
        "hero_image_url": itinerary.stops[0].hero_image_url if len(itinerary.stops) > 0 else None
    }
    for itinerary in all_itineraries]

def get_saved_itinerary(itinerary_id, db: Session, user: uuid.UUID):
    statement = select(SavedItinerary).where(
        SavedItinerary.id == itinerary_id,
        SavedItinerary.user_id == user
        )
    itinerary = db.execute(statement).scalar_one_or_none()

    if not itinerary:
        raise ItineraryNotFound
    
    return serialize_itinerary(itinerary)

def unsave_itinerary_for_user(itinerary_id, db: Session, user: uuid.UUID):
    statement = select(SavedItinerary).where(
        SavedItinerary.id == itinerary_id,
        SavedItinerary.user_id == user
        )
    itinerary = db.execute(statement).scalar_one_or_none()

    if not itinerary:
        raise ItineraryNotFound
    
    db.delete(itinerary)
    db.commit()

def create_new_request(itinerary_id, slug: str | None, stop_id: str | None, db: Session, user):
    statement = select(SavedItinerary).where(
        SavedItinerary.id == itinerary_id,
        SavedItinerary.user_id == user
        )
    itinerary = db.execute(statement).scalar_one_or_none()

    if itinerary is None:
        raise ItineraryNotFound

    trip_name = itinerary.name
    start_date = itinerary.start_date
    end_date = itinerary.end_date
    accessibility_labels = itinerary.accessibility_requirements 

    if slug:
        slug_found = get_poi_by_slug(slug, db)
        if not slug_found:
            raise POINotFoundError
        
        pois = [stop.poi.slug for stop in itinerary.stops]
        pois.append(slug)

    elif stop_id:
        stop_found = False
        for stop in itinerary.stops:
            if str(stop.id) == stop_id:
                stop_found = True
        if not stop_found:
            raise StopNotFound

        pois = [stop.poi.slug for stop in itinerary.stops if str(stop.id) != stop_id]

    request = ItineraryRequest(
        trip_name=trip_name,
        trip_dates=[start_date, end_date],
        pois=pois,
        accessibility=accessibility_labels
    )

    return request

def update_saved_itinerary(new_itinerary, itinerary_id, db: Session, user: uuid.UUID):
    statement = select(SavedItinerary).where(
        SavedItinerary.id == itinerary_id,
        SavedItinerary.user_id == user
        )
    itinerary = db.execute(statement).scalar_one_or_none()

    for stop in itinerary.stops:
        db.delete(stop)

    db.flush()

    for new_stop in new_itinerary["stops"]:
        itinerary.stops.append(
            ItineraryStop(
                itinerary_id=itinerary.id,
                poi_id=new_stop["poi_id"],
                day_number=new_stop["day_number"],
                visit_date=new_stop["visit_date"],
                slot=new_stop["slot"],
                slot_start=new_stop["slot_start"],
                slot_end=new_stop["slot_end"],
                position=new_stop["position"],
                crowd_level=new_stop["crowd_level"],
                flags=new_stop["flags"],
                busyness_for_day=new_stop["busyness_for_day"],
                hero_image_url=new_stop["hero_image_url"],
            ))
        
    itinerary.warning = new_itinerary["warning"]
    db.commit()

    return serialize_itinerary(itinerary)
    






    
    
