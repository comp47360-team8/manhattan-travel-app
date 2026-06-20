from sqlalchemy import select
from sqlalchemy.orm import Session
from app.models.poi_model import POI, SavedPOI
from app.core.exceptions import POINotFoundError, POIAlreadySavedError


def get_all_pois(db: Session):
    statement = select(POI)
    result = db.execute(statement)
    return result.scalars().all()
    

def get_poi_by_slug(slug: str, db: Session):
    statement = select(POI).where(POI.slug == slug)
    result = db.execute(statement)
    return result.scalar_one_or_none()


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
        raise POIAlreadySavedError()

    saved_poi = SavedPOI(
        user_id = user,
        poi_id = poi.id
    )

    db.add(saved_poi)
    db.commit()
    db.refresh(saved_poi)

    return saved_poi


def get_saved_pois(db: Session, user: int):
    statement = (
        select(POI).join(SavedPOI, POI.id == SavedPOI.poi_id).where(SavedPOI.user_id == user)
    )
    result = db.execute(statement)
    return result.scalars().all()



