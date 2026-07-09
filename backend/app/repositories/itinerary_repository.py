import uuid
from sqlalchemy import select, func
from sqlalchemy.orm import Session
from app.models.poi_model import POIBusynessForecast
from app.models.itinerary_model import SavedItinerary, ItineraryStop
from app.schemas.itinerary import ItineraryResponse
from app.core.exceptions import ItineraryNotFound
from app.services.poi_service import get_pois_by_slug

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

def get_busyness_for_day(id, day: int, db: Session):
    statement = select(
        POIBusynessForecast.hour_of_day,
        POIBusynessForecast.busyness_pct
        ).where(
            POIBusynessForecast.poi_id == id,
            POIBusynessForecast.day_of_week == day
        ).order_by(
            POIBusynessForecast.hour_of_day
        )
    result = db.execute(statement).all()

    return [
        {
            "hour_of_day": row[0],
            "busyness": row[1]
            }
         for row in result
         ]

def get_saved_itineraries(db: Session, user: uuid.UUID):
    statement = select(
        SavedItinerary.id,
        SavedItinerary.name,
        SavedItinerary.itinerary
        ).where(SavedItinerary.user_id == user)
    
    result =  db.execute(statement).all()
    
    return [
        {"itinerary_id": str(row.id),
         "trip_name": row.name,
         "trip_dates": row.itinerary["trip_dates"],
         "number_of_places": len(row.itinerary["stops"]),
         "hero_image_url": row.itinerary["stops"][0]["hero_image_url"]
         }
         for row in result
    ]

def get_saved_itinerary(itinerary_id, db: Session, user: uuid.UUID):
    statement = select(SavedItinerary.itinerary).where(
        SavedItinerary.id == itinerary_id,
        SavedItinerary.user_id == user
    )
    result = db.execute(statement).scalar_one_or_none()

    if not result:
        raise ItineraryNotFound
    return db.execute(statement).scalar_one_or_none()
        
def unsave_itinerary_for_user(itinerary_id, db: Session, user: uuid.UUID):
    statement = select(SavedItinerary).where(
        SavedItinerary.id == itinerary_id,
        SavedItinerary.user_id == user
        )

    db_entry = db.execute(statement).scalar_one_or_none()

    if not db_entry:
        return

    db.delete(db_entry)
    db.commit()

def save_itinerary_for_user(itinerary: ItineraryResponse, db: Session, user: uuid.UUID):
    itinerary_entry = SavedItinerary(
        user_id=user,
        name=itinerary.trip_name,
        start_date=itinerary.start_date,
        end_date=itinerary.end_date
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
        "itinerary_id": itinerary.id,
        "trip_name" : itinerary.name,
        "start_date" : itinerary.start_date,
        "end_date": itinerary.end_date,
        "stops": [
            {
                "stop_id": str(stop.id),
                "poi_id": stop.poi_id,
                "poi_name": stop.poi_name,
                "slug": stop.slug,
                "day_number": stop.day_number,
                "visit_date": stop.visit_date,
                "slot": stop.slot,
                "slot_start": stop.slot_start,
                "slot_end": stop.slot_end,
                "position": stop.position,
                "poi_type": stop.type,
                "crowd_level": stop.rowd_level,
                "hero_image_url": stop.hero_image_url,
                "borough": stop.borough,
                "neighborhood": stop.neighborhood,
                "suggested_duration": stop.suggested_duration,
                "accessibility": stop.accessibility_labels,
                "flags": stop.flags,
                "busyness_for_day": stop.busyness_for_day
            } for stop in itinerary.stops
        ]
    }







    
    
