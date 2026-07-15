from datetime import date
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.models.poi_model import POI, SavedPOI
from app.core.exceptions import POINotFoundError
from app.repositories.poi_repository import get_hourly_busyness, get_weekend_hourly_busyness

def get_all_pois(db: Session):
    statement = select(POI)
    result = db.execute(statement)
    return result.scalars().all()

def get_poi_by_slug(slug: str, db: Session):
    statement = select(POI).where(POI.slug == slug.lower().strip())
    result = db.execute(statement)
    return result.scalar_one_or_none()

def get_pois_by_slug(slugs: list[str], db: Session):
    normalized_slugs = [slug.lower().strip() for slug in slugs]
    
    statement = select(POI).where(POI.slug.in_(normalized_slugs))
    result = db.execute(statement).scalars().all()

    poi_map = {poi.slug: poi for poi in result}

    return [poi_map[slug] for slug in normalized_slugs if slug in poi_map]


def save_poi_for_user(slug: str, db: Session, user: int):
    poi = get_poi_by_slug(slug, db)

    if poi is None:
        raise POINotFoundError()
    
    statement = select(SavedPOI).where(
        SavedPOI.user_id == user, 
        SavedPOI.poi_id == poi.id
        )
    result = db.execute(statement)
    existing_save = result.scalar_one_or_none()

    if existing_save:
        return

    saved_poi = SavedPOI(
        user_id = user,
        poi_id = poi.id
    )

    db.add(saved_poi)
    db.commit()
    db.refresh(saved_poi)

    return saved_poi


def get_saved_poi(slug: str, db: Session, user: int):
    poi = get_poi_by_slug(slug, db)

    if not poi:
        raise POINotFoundError()

    statement = select(SavedPOI).where(
        SavedPOI.user_id == user,
        SavedPOI.poi_id == poi.id)
    
    saved_poi = db.execute(statement).scalar_one_or_none()
    return saved_poi


def get_saved_pois(db: Session, user: int):
    statement = (
        select(POI).join(SavedPOI, POI.id == SavedPOI.poi_id).where(SavedPOI.user_id == user)
    )
    result = db.execute(statement)
    return result.scalars().all()


def unsave_poi_for_user(slug: str, db: Session, user: int):
    saved_poi = get_saved_poi(slug, db, user)

    if not saved_poi:
        return
    
    db.delete(saved_poi)
    db.commit()

from datetime import date

def get_poi_busyness(pois: list[POI], db: Session):
    today = date.today().weekday()
    tomorrow = (today + 1) % 7

    poi_ids = [poi.id for poi in pois]

    rows = get_hourly_busyness(today, tomorrow, poi_ids, db)
    weekend_busyness = get_weekend_hourly_busyness(poi_ids, db)

    crowd_levels = {
        poi.slug: {
            "today": [],
            "tomorrow": [],
            "weekend": []
        }
        for poi in pois
    }

    poi_map = {poi.id: poi.slug for poi in pois}

    for row in rows:
        slug = poi_map[row.poi_id]

        entry = {
            "hour_of_day": row.hour_of_day,
            "busyness": row.busyness_pct
        }

        if row.day_of_week == today:
            crowd_levels[slug]["today"].append(entry)
        elif row.day_of_week == tomorrow:
            crowd_levels[slug]["tomorrow"].append(entry)

   
    for row in weekend_busyness:
        slug = poi_map[row.poi_id]

        crowd_levels[slug]["weekend"].append({
            "hour_of_day": row.hour_of_day,
            "busyness": row.avg_busyness_pct
        })

    return crowd_levels