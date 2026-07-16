import math
from sqlalchemy.orm import Session
from collections import defaultdict
from datetime import date, timedelta, time
from app.services.itinerary.assignment.utils import convert_to_days
from app.services.itinerary.accessibility import filter_accessibility
from app.services.itinerary.poi_profile import get_poi_profiles
from app.services.itinerary.assignment.scheduler import assign_days, assign_slots
from app.schemas.itinerary import ItineraryRequest
from app.services.poi_service import get_pois_by_slug, get_poi_by_slug, get_all_pois, get_poi_by_id
from app.repositories.itinerary_repository import get_crowd_level, get_busyness_for_day, get_busyness_for_trip
from app.services.itinerary.ordering import reorder_pois
from app.core.constants import MAX_POIS_PER_DAY
from app.core.exceptions import MaximumPOIsExceeded, POINotFoundError, RepeatingPOI
from app.models.ai_model import Trip
from app.models.user_model import User
from app.repositories.poi_repository import get_excluded_pois
from app.services.user_services import get_user_by_id

def create_itinerary(request: ItineraryRequest, db):
    pois, full_trip_days = validate_request(request, db)

    poi_profiles = get_poi_profiles(pois, full_trip_days)

    pois_assigned_days = assign_days(pois, poi_profiles, full_trip_days)
  
    pois_assigned_slots, warning = assign_slots(poi_profiles, pois_assigned_days, full_trip_days, db)

    reordered_itinerary = reorder_pois(pois, poi_profiles, pois_assigned_slots)

    final_itinerary = transform_itinerary(request, reordered_itinerary, warning, db)

    return final_itinerary

def validate_request(request: ItineraryRequest, db: Session):
    full_trip_days = convert_to_days(request.trip_dates)

    if len(full_trip_days) * MAX_POIS_PER_DAY < len(request.pois):
        raise MaximumPOIsExceeded
    
    pois = get_pois_by_slug(request.pois, db)
    for poi in request.pois:
        if poi not in [p.slug for p in pois]:
            raise POINotFoundError(f"'{poi}' does not exist. Please enter a valid POI.")
        
    slugs = [p.slug for p in pois]
    if len(slugs) != len(set(slugs)):
        raise RepeatingPOI
        
    if request.accessibility != []:
        pois = filter_accessibility(pois, request.accessibility)

    return pois, full_trip_days

def transform_itinerary(request: ItineraryRequest, itinerary: dict, warning: str | None, db: Session):
    day_number = 1
    current_date = request.trip_dates[0]

    final_itinerary = {
        "trip_name": request.trip_name,
        "start_date": request.trip_dates[0],
        "end_date": request.trip_dates[-1],
        "warning": warning,
        "accessibility": request.accessibility,
        "stops": []
        }
    i = 1
    for week, week_days in itinerary.items():
        for weekday, slots in week_days.items():
            for slot_name, pois in slots.items():
                for poi in pois:
                    poi_object = get_poi_by_slug(poi.slug, db)
                    crowd_level = get_crowd_level(poi_object.id, weekday, slot_name, db)
                    day_busyness = get_busyness_for_day(poi_object.id, weekday, db)
                    if slot_name == "morning":
                        slot_start = time(9,0)
                        slot_end = time(12,0)
                    elif slot_name == "afternoon":
                        slot_start = time(12,0)
                        slot_end = time(18,0)
                    else:
                        slot_start = time(18,0)
                        slot_end = time(22,0)

                    poi_card = {
                        "poi_id": poi_object.id,
                        "poi_name": poi_object.name,
                        "slug": poi_object.slug,
                        "day_number": day_number,
                        "visit_date": current_date,
                        "slot": slot_name,
                        "slot_start": slot_start,
                        "slot_end": slot_end,
                        "position": i,
                        "poi_type": poi_object.type,
                        "crowd_level": crowd_level,
                        "hero_image_url": poi_object.hero_image_url,
                        "borough": poi_object.borough,
                        "neighborhood": poi_object.neighborhood,
                        "suggested_duration": poi_object.recommended_duration_min,
                        "accessibility": poi_object.accessibility_labels or [],
                        "flags": poi.flags,
                        "busyness_for_day": day_busyness
                    }
                    final_itinerary["stops"].append(poi_card)
                    i += 1
            day_number += 1
            current_date += timedelta(days=1)
                    
    return final_itinerary

def auto_generate_itinerary(trip: Trip, conv_id, db: Session, user):
    user_profile = get_user_by_id(user, db)
    pois = get_poi_candidates(trip, conv_id, db, user_profile)

    request = ItineraryRequest(
        trip_name=trip.name,
        trip_dates=[trip.start_date, trip.end_date],
        pois=pois,
        accessibility=["wheelchair", "wheelchair-limited"] if user_profile.accessibility else []
    )

    itinerary = create_itinerary(request, db)
    return itinerary

def get_poi_candidates(trip: Trip, conv_id, db: Session, user: User):
    pois = get_all_pois(db)

    if user.accessibility:
        pois = filter_accessibility(pois, ["wheelchair", "wheelchair-limited"])

    poi_slug_map = {poi.slug: poi for poi in pois}
    poi_id_map = {poi.id: poi for poi in pois}

    trip_days = convert_to_days([trip.start_date, trip.end_date])

    poi_profiles = get_poi_profiles(pois, trip_days)

    open_during_trip_filter = []
    for poi in poi_profiles:
        if any(day in poi.opening_days for day in trip_days):
            open_during_trip_filter.append(poi)

    types_excluded = []
    for poi in open_during_trip_filter:
        if poi_slug_map[poi.slug].type not in trip.excluded_types:
            types_excluded.append(poi)
    
    excluded_poi_ids = get_excluded_pois(conv_id, db)
    excluded_poi_slugs = {get_poi_by_id(poi_id, db).slug for poi_id in excluded_poi_ids}
    
    pois_excluded = []
    for poi in types_excluded:
        if poi.slug not in excluded_poi_slugs:
            pois_excluded.append(poi)

    poi_ids = [get_poi_by_slug(poi.slug, db).id for poi in pois_excluded]

    poi_per_day = 3 if trip.pace == "relaxed" else 5
    target_count = poi_per_day * len(trip_days)
    max_per_type = math.ceil(target_count * 0.3)

    preferred_types = set(trip.preferences)

    if preferred_types:
        total_preferred_type = math.ceil(target_count * 0.6)
        max_per_preferred_type = math.ceil(total_preferred_type / len(preferred_types))

    busyness_per_poi = get_busyness_for_trip(poi_ids, trip_days, db)

    candidates = []
    type_count = defaultdict(int)

    if preferred_types:
        available_preferred_pois = [
            poi_id_map[poi["poi_id"]] for poi in busyness_per_poi 
            if poi_id_map[poi["poi_id"]].type in preferred_types
            ]
    
        preferred_target = min(total_preferred_type, len(available_preferred_pois))

        for poi in available_preferred_pois:
            if len(candidates) >= preferred_target:
                break

            if type_count[poi.type] >= max_per_preferred_type:
                continue
        
            candidates.append(poi.slug)
            type_count[poi.type] += 1
    
    for poi in busyness_per_poi:
        if len(candidates) >= target_count:
            break

        poi_obj = poi_id_map[poi["poi_id"]]
        poi_type = poi_obj.type

        if poi_obj.slug in candidates:
            continue

        if type_count[poi_type] >= max_per_type:
            continue

        candidates.append(poi_obj.slug)
        type_count[poi_type] += 1

    return candidates
                    



    



