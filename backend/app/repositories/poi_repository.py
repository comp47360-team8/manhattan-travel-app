from fastapi import Depends
from sqlalchemy import select, func
from sqlalchemy.orm import Session
from app.models.poi_model import POI, POIBusynessForecast
from app.domains.scheduling import POIProfile

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

def get_hourly_busyness(days, poi_id, db: Session):
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