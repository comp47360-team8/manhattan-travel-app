import uuid
from sqlalchemy import select, func
from sqlalchemy.orm import Session
from app.models.poi_model import POIBusynessForecast
from app.models.itinerary_model import SavedItineraries
from app.schemas.itinerary import ItineraryResponse
from app.core.exceptions import ItineraryNotFound

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

def save_itinerary_for_user(itinerary_to_save: ItineraryResponse, db: Session, user: uuid.UUID):
    statement = select(SavedItineraries).where(
        SavedItineraries.id == itinerary_to_save.model_dump()["itinerary_id"],
        SavedItineraries.user_id == user
        )
    existing_save = db.execute(statement).scalar_one_or_none()

    if existing_save:
        return
    
    db_entry = SavedItineraries(
        id=itinerary_to_save.model_dump()["itinerary_id"],
        user_id=user,
        itinerary=itinerary_to_save.model_dump(),
        name=itinerary_to_save.model_dump()["trip_name"]
    )
    db.add(db_entry)
    db.commit()
    db.refresh(db_entry)

def get_saved_itineraries(db: Session, user: uuid.UUID):
    statement = select(
        SavedItineraries.id,
        SavedItineraries.name,
        SavedItineraries.itinerary
        ).where(SavedItineraries.user_id == user)
    
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
    statement = select(SavedItineraries.itinerary).where(
        SavedItineraries.id == itinerary_id,
        SavedItineraries.user_id == user
    )
    result = db.execute(statement).scalar_one_or_none()

    if not result:
        raise ItineraryNotFound
    return db.execute(statement).scalar_one_or_none()
        
def unsave_itinerary_for_user(itinerary_id, db: Session, user: uuid.UUID):
    statement = select(SavedItineraries).where(
        SavedItineraries.id == itinerary_id,
        SavedItineraries.user_id == user
        )

    db_entry = db.execute(statement).scalar_one_or_none()

    if not db_entry:
        return

    db.delete(db_entry)
    db.commit()







    
    
