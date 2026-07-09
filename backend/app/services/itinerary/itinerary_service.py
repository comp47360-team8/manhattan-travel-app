from datetime import date, timedelta, time
from app.services.itinerary.assignment.utils import convert_to_days
from app.services.itinerary.accessibility import filter_accessibility
from app.services.itinerary.validation import validate_pois
from app.services.itinerary.assignment.scheduler import assign_days, assign_slots
from app.schemas.itinerary import ItineraryRequest
from app.services.poi_service import get_pois_by_slug
from app.services.poi_service import get_poi_by_slug
from app.repositories.itinerary_repository import get_crowd_level, get_busyness_for_day
from app.services.itinerary.ordering import reorder_pois
from app.core.constants import MAX_POIS_PER_DAY
from app.core.exceptions import MaximumPOIsExceeded

def create_itinerary(request: ItineraryRequest, db):
    full_trip_days = convert_to_days(request.trip_dates)

    if len(full_trip_days) * MAX_POIS_PER_DAY < len(request.pois):
        raise MaximumPOIsExceeded
    
    pois = get_pois_by_slug(request.pois, db)

    if request.accessibility != []:
        pois = filter_accessibility(pois, request.accessibility)

    validated_pois = validate_pois(pois, full_trip_days)

    pois_assigned_days = assign_days(pois, validated_pois, full_trip_days)
  
    pois_assigned_slots, warning = assign_slots(validated_pois, pois_assigned_days, full_trip_days, db)

    redordered_itinerary = reorder_pois(pois, validated_pois, pois_assigned_slots)

    final_itinerary = transform_itinerary(request.trip_name, request.trip_dates, request.accessibility, redordered_itinerary, warning, db)

    return final_itinerary

def transform_itinerary(trip_name: str, dates:list[date], accessibility: list[str], itinerary: dict, warning: str|None, db):
    day_number = 1
    current_date = dates[0]

    final_itinerary = {
        "trip_name": trip_name,
        "start_date": dates[0],
        "end_date": dates[-1],
        "warning": warning,
        "accessibility": accessibility,
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
                    
                    



    



