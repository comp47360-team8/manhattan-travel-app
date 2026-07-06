import uuid
from datetime import date, timedelta
from app.services.itinerary.assignment.utils import convert_to_days
from app.services.itinerary.accessibility import filter_accessibility
from app.services.itinerary.validation import validate_pois
from app.services.itinerary.assignment.scheduler import assign_days, assign_slots
from app.schemas.itinerary import ItineraryRequest
from app.services.poi_service import get_pois_by_slug
from app.services.poi_service import get_poi_by_slug
from app.repositories.itinerary_repository import get_crowd_level, get_busyness_for_day

def create_itinerary(request: ItineraryRequest, db):
    pois = get_pois_by_slug(request.pois, db)

    if request.accessibilty != []:
        pois = filter_accessibility(pois, request.accessibilty)

    full_trip_days = convert_to_days(request.trip_dates)

    validated_pois = validate_pois(pois, full_trip_days)

    pois_assigned_days = assign_days(validated_pois, full_trip_days)

    pois_assigned_slots = assign_slots(validated_pois, pois_assigned_days, full_trip_days, db)

    transformed = transform_itinerary(request.trip_name, request.trip_dates, pois_assigned_slots, db)

    return transformed

def transform_itinerary(trip_name: str, dates:list[date], itinerary: dict, db):
    day_number = 1
    current_date = dates[0]
    if len(dates) == 1:
        date_interval = f"{dates[0].strftime('%d %b, %Y')}"
    else:
        date_interval = f"{dates[0].strftime('%d %b, %Y')} - {dates[1].strftime('%d %b, %Y')}"

    final_itinerary = {
        "itinerary_id": str(uuid.uuid4()),
        "trip_name": trip_name,
        "trip_dates": date_interval,
        "stops": []
        }
    for week, week_days in itinerary.items():
        for weekday, slots in week_days.items():
            for slot_name, pois in slots.items():
                for poi in pois:
                    poi_object = get_poi_by_slug(poi.slug, db)
                    crowd_level = get_crowd_level(poi_object.id, weekday, slot_name, db)
                    day_busyness = get_busyness_for_day(poi_object.id, weekday, db)
                    if slot_name == "morning":
                        hours = "09:00AM - 12:00PM"
                    elif slot_name == "afternoon":
                        hours = "12:00PM - 18:00PM"
                    else:
                        hours = "18:00PM - 22:00PM"
                    poi_card = {
                        "poi_name": poi_object.name,
                        "slug": poi_object.slug,
                        "day_number": f"Day {day_number}",
                        "dates": f"{current_date.strftime('%A')}, {current_date.strftime('%d %b')}",
                        "slot": slot_name,
                        "slot_times": hours,
                        "poi_type": poi_object.type,
                        "crowd_level": crowd_level,
                        "hero_image_url": poi_object.hero_image_url,
                        "borough": poi_object.borough,
                        "neighborhood": poi_object.neighborhood,
                        "suggested_duration": f"{poi_object.recommended_duration_min} minutes",
                        "accessibility": poi_object.accessibility_labels or [],
                        "flags": poi.flags,
                        "busyness_for_day": day_busyness
                    }
                    final_itinerary["stops"].append(poi_card)
                    if poi.last_of_day:
                        day_number += 1
                        current_date += timedelta(days=1)
                    
    return final_itinerary
                    
                    



    



