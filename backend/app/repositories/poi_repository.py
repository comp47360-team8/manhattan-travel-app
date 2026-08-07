"""Database queries for POI services."""

from sqlalchemy import select, func
from zoneinfo import ZoneInfo
from datetime import datetime
from sqlalchemy.orm import Session
from app.models.poi_model import POI, POIBusynessForecast
from app.domains.scheduling import POIProfile
from app.models.ai_model import TripExcludedPOI, Trip, Conversation

def load_coordinates(pois: list[POIProfile], db: Session):
    """Retrieve latitude and longitude coordinates for the given POIs."""

    coordinates = {}

    for poi in pois:
        statement = select(POI.latitude, POI.longitude).where(POI.slug == poi.slug)
        result = db.execute(statement).one_or_none()
        lat, lng = result
        coordinates[poi.slug] = (lat, lng)
    
    return coordinates

def get_poi_busyness_forecast(pois: list[POI], trip_days: list, db: Session):
    """Retrieve average busyness forecasts for POIs across the selected trip days."""

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
    """Retrieve POI IDs excluded by the user in a conversation."""

    statement = select(TripExcludedPOI.poi_id).join(Trip).join(Conversation).where(
        Conversation.id == conv_id
    )
    return db.execute(statement).scalars().all()

def get_busyness_for_day(id, day: int, db: Session):
    """Retrieve hourly predicted busyness for a POI on a specified day."""

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

def get_hourly_busyness(days, poi_id, db: Session):
    """Retrieve hourly busyness forecasts for a POI across the specified days."""

    statement = select(
        POIBusynessForecast
    ).where(
        POIBusynessForecast.poi_id == poi_id,
        POIBusynessForecast.day_of_week.in_(days)
    ).order_by(
        POIBusynessForecast.hour_of_day
    )

    return db.execute(statement).scalars().all()

def get_weekend_hourly_busyness(poi_id, db: Session):
    """Retrieve average hourly busyness for a POI across Saturday and Sunday."""

    statement = select(
        POIBusynessForecast.hour_of_day,
        func.avg(POIBusynessForecast.busyness_pct).label("avg_busyness_pct")
    ).where(
        POIBusynessForecast.poi_id == poi_id,
        POIBusynessForecast.day_of_week.in_([5, 6])
    ).group_by(
        POIBusynessForecast.hour_of_day
    ).order_by(
        POIBusynessForecast.hour_of_day
    )

    return db.execute(statement).all()

def get_current_busyness(pois: list[POI], db: Session):
    """Retrieve the current predicted busyness level for each POI in New York time."""

    ny_now = datetime.now(ZoneInfo("America/New_York"))
    hour = ny_now.hour
    day = ny_now.weekday()

    statement = select(
        POIBusynessForecast.poi_id,
        POIBusynessForecast.level,
        POIBusynessForecast.busyness_pct
        ).where(
        POIBusynessForecast.poi_id.in_([poi.id for poi in pois]),
        POIBusynessForecast.hour_of_day == hour,
        POIBusynessForecast.day_of_week == day
    )

    rows = db.execute(statement).all()

    return {row.poi_id: {
        "txt": row.level,
        "pct": row.busyness_pct
    } for row in rows}
