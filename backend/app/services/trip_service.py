import re
from rapidfuzz import process, fuzz
from app.models.poi_model import POI
from app.models.ai_model import Trip
from app.repositories.trip_repository import get_trip
from app.schemas.ai import TripParameters

def get_trip_details(conv_id, db):
    trip = get_trip(conv_id, db)

    trip_details = TripParameters(
        name=trip.name,
        start_date=trip.start_date,
        end_date=trip.end_date,
        pace=trip.pace,
        excluded_pois=[poi.slug for poi in trip.excluded_pois],
        excluded_types=trip.excluded_types,
        preferences=trip.preferences
        )
    return trip_details

def fuzzy_search(pois_to_exclude: list[str], pois: list[POI]):
    if pois_to_exclude is None:
        return None
    
    poi_map = {normalize(poi.name): poi.slug for poi in pois}

    slug_list = []

    for poi in pois_to_exclude:
        print(f"poi: {poi}")
        match = process.extractOne(
            normalize(poi),
            poi_map.keys(),
            scorer= fuzz.WRatio
        )

        if match is None:
            continue

        print(f"match: {match}")
        matched_name, score, _ = match

        if score >= 65:
            slug_list.append(poi_map[matched_name])

    return slug_list

def normalize(text: str) -> str:
    text = text.lower()
    text = re.sub(r"[^\w\s]", "", text)
    text = re.sub(r"\b(the|a|an)\b", "", text)
    return " ".join(text.split())

def is_trip_ready(trip: Trip) -> bool:
    return (
        trip.start_date is not None
        and trip.end_date is not None
        and trip.pace is not None
        and trip.name is not None
        and len(trip.preferences) > 0
        and len(trip.excluded_types) > 0
    )


