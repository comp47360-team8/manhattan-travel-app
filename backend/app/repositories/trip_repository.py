from sqlalchemy import select
from sqlalchemy.orm import Session
from app.models.ai_model import Trip, TripExcludedPOI
from app.schemas.ai import TripParameters
from app.services.poi_service import get_pois_by_slug

def get_trip(conv_id, db: Session):
    statement = select(Trip).where(Trip.conversation_id == conv_id)
    return db.execute(statement).scalar_one_or_none()

def update_trip(conv_id: str, extracted: TripParameters, exclude_pois: list[str] | None, db: Session, user):
    statement = select(Trip).where(Trip.conversation_id == conv_id)
    trip = db.execute(statement).scalar_one_or_none()

    if extracted.name:
        trip.name = extracted.name

    if extracted.start_date:
        trip.start_date = extracted.start_date

    if extracted.end_date:
        trip.end_date = extracted.end_date

    if extracted.pace:
        trip.pace = extracted.pace

    if extracted.excluded_types:
        for poi_type in extracted.excluded_types:
            if poi_type not in trip.excluded_types:
                trip.excluded_types.append(poi_type)
            if poi_type in trip.preferences:
                trip.preferences = [item for item in trip.preferences if item != poi_type]

    if extracted.preferences:
        for preference in extracted.preferences:
            if preference not in trip.preferences:
                trip.preferences.append(preference)
            if preference in trip.excluded_types:
                trip.excluded_types = [item for item in trip.excluded_types if item != preference]
   

    if exclude_pois:
        statement2 = select(TripExcludedPOI.poi_id).join(Trip).where(
            Trip.conversation_id == conv_id
        )
        poi_ids = db.execute(statement2).scalars().all()

        if len(exclude_pois) > 0:
            pois_to_exclude = get_pois_by_slug(exclude_pois, db)

            for poi in pois_to_exclude:
                if poi and poi.id not in poi_ids:
                    db_entry = TripExcludedPOI(trip_id=trip.id, poi_id=poi.id)
                    db.add(db_entry)

    db.commit()

