from sqlalchemy import select, func
from sqlalchemy.orm import Session
from app.models.poi_model import POI, POIBusynessForecast
from app.domains.scheduling import POIProfile
from app.models.ai_model import TripExcludedPOI, Trip, Conversation

def load_coordinates(pois: list[POIProfile], db: Session):
    coordinates = {}

    for poi in pois:
        statement = select(POI.latitude, POI.longitude).where(POI.slug == poi.slug)
        result = db.execute(statement).one_or_none()
        lat, lng = result
        coordinates[poi.slug] = (lat, lng)
    
    return coordinates

def get_poi_busyness_forecast(pois: list[POI], trip_days: list, db: Session):
    statement = (
        select(
            POI.slug.label("slug"),
            POIBusynessForecast.day_of_week.label("day"),
            POIBusynessForecast.time_slot.label("slot"),
            func.avg(POIBusynessForecast.busyness_pct).label("avg_busyness_pct")
        )
        .select_from(POIBusynessForecast)
        .join(POI, POI.id == POIBusynessForecast.poi_id)
        .where(
            POI.slug.in_([poi.slug for poi in pois]),
            POIBusynessForecast.day_of_week.in_(trip_days),
            POIBusynessForecast.time_slot.is_not(None))
        .group_by(
            POI.slug,
            POIBusynessForecast.day_of_week,
            POIBusynessForecast.time_slot
        ))

    result = db.execute(statement).all()
    return result

def get_excluded_pois(conv_id, db: Session):
    statement = select(TripExcludedPOI.poi_id).join(Trip).join(Conversation).where(
        Conversation.id == conv_id
    )
    return db.execute(statement).scalars().all()