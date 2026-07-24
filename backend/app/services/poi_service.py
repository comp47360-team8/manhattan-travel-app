from datetime import date
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.models.poi_model import POI, SavedPOI
from app.core.exceptions import POINotFoundError
from app.repositories.poi_repository import get_hourly_busyness, get_weekend_hourly_busyness, get_current_busyness
from app.schemas.poi import POIDetailedResponse
from app.services.photo_service import poi_photo_url

def attach_current_busyness(pois: list[POI], db: Session):
    """Set the (non-persisted) current_busyness fields POIDetailedResponse needs.

    Every POI served through POIDetailedResponse requires these, so this must run
    on any path that returns POIs (list, detail, saved) — not just the list.
    """
    busyness = get_current_busyness(pois, db)

    for poi in pois:
        current = busyness.get(poi.id)

        if current:
            poi.current_busyness = current["txt"]
            poi.current_busyness_pct = current["pct"]

        else:
            poi.current_busyness = "Closed"
            poi.current_busyness_pct = None

    return pois

def serialise_poi(poi: POI) -> POIDetailedResponse:
    """Serialise a POI, pointing hero_image_url at our durable photo proxy.

    Shared by every endpoint that returns a POI (list, detail, saved) so they all
    hand clients the same self-healing image URL rather than the stored Google URL
    that expires. Falls back to the stored value when no proxy URL applies. The
    POI must already have current_busyness attached (see attach_current_busyness).
    """
    response = POIDetailedResponse.model_validate(poi)
    proxy = poi_photo_url(poi.slug, poi.google_place_id)
    if proxy:
        response.hero_image_url = proxy
    return response

def get_all_pois(db: Session):
    statement = select(POI)
    pois = db.execute(statement).scalars().all()
    return attach_current_busyness(pois, db)


def get_poi_by_slug(slug: str, db: Session):
    statement = select(POI).where(POI.slug == slug.lower().strip())
    result = db.execute(statement)
    return result.scalar_one_or_none()

def get_poi_by_id(poi_id, db: Session):
    statement = select(POI).where(POI.id == poi_id)
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
    pois = db.execute(statement).scalars().all()
    return attach_current_busyness(pois, db)


def unsave_poi_for_user(slug: str, db: Session, user: int):
    saved_poi = get_saved_poi(slug, db, user)

    if not saved_poi:
        return
    
    db.delete(saved_poi)
    db.commit()

def get_poi_busyness(poi: POI, db: Session):
    today = date.today().weekday()
    tomorrow = (today + 1) % 7

    rows = get_hourly_busyness([today, tomorrow], poi.id, db)

    weekend_busyness = get_weekend_hourly_busyness(poi.id,db)

    crowd_levels = {
        "today": [],
        "tomorrow": [],
        "weekend": []
    }

    for row in rows:
        entry = {
            "hour_of_day": row.hour_of_day,
            "busyness": row.busyness_pct
        }

        if row.day_of_week == today:
            crowd_levels["today"].append(entry)

        elif row.day_of_week == tomorrow:
            crowd_levels["tomorrow"].append(entry)

    for row in weekend_busyness:
        crowd_levels["weekend"].append({
            "hour_of_day": row.hour_of_day,
            "busyness": row.avg_busyness_pct
        })

    return crowd_levels

