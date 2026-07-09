from sqlalchemy.orm import Session
from app.domains.scheduling import POIProfile
from app.models.poi_model import POI
from app.core.constants import TIME_SLOTS, MAX_POIS_PER_SLOT
from app.core.exceptions import POINotOpenDuringTrip
from app.services.itinerary.assignment.utils import split_evenly, number_of_weeks
from app.services.itinerary.assignment.busyness import build_busyness_matrix, find_best_slot, calculate_busyness_cost
from app.services.itinerary.assignment.overflow import find_combined_costs, replace
from app.services.itinerary.assignment.geography import calculate_geographic_cost

def assign_days(pois_list: list[POI], pois: list[POIProfile], trip_days: list[int]):
    sorted_pois = sorted(pois, key=lambda x: x.id)
    poi_map = {p.slug: p for p in pois_list}

    trip = {}
    week = 0

    for trip_day in trip_days:
        if week not in trip:
            trip[week] = {}
        trip[week][trip_day] = []
        if trip_day == 6:
            week += 1
    
    pois_to_lock = []
    for poi in pois:
        if all(days not in trip_days for days in poi.opening_days):
            poi_model = poi_map[poi.slug]
            raise POINotOpenDuringTrip(f"{poi_model.name} is closed during your trip. Please alter your requirements.")
        
        elif any(day not in poi.opening_days for day in trip_days):
            pois_to_lock.append(poi)
    
    filtered_pois = [p for p in sorted_pois if p not in pois_to_lock]

    target_pois_per_day = split_evenly(len(filtered_pois), len(trip_days))

    i = 0
    poi_list_index = 0
    for week, days in trip.items():
        for day, pois in days.items():
            while len(pois) < target_pois_per_day[i]:
                pois.append(filtered_pois[poi_list_index])
                poi_list_index += 1
            i += 1

    for poi in pois_to_lock:
        week_selected = None
        day_selected = None
        least_pois = float("inf")
        for week, days in trip.items():
            for day, pois in days.items():
                if day in poi.opening_days and len(pois) < least_pois:
                    week_selected = week
                    day_selected = day
                    least_pois = len(pois)

        trip[week_selected][day_selected].append(poi)
                
    return trip

def assign_slots(pois: list[POIProfile], calendar: dict[int, dict[int, list]], trip_days: list, db: Session):
    itinerary = {
        week: {day: {slot.name: [] for slot in TIME_SLOTS} for day in trip_days}
        for week in range(number_of_weeks(trip_days) + 1)
    }

    busyness_matrix = build_busyness_matrix(pois, trip_days, db)

    for week, days in calendar.items():
        for weekdays, day in days.items():
            for poi in day:
                poi_matrix = busyness_matrix[poi.slug]

                best_slot = find_best_slot(poi, weekdays, poi_matrix[weekdays])

                if best_slot is None:
                    continue

                if slot_not_full(best_slot, week, itinerary):
                    assign(best_slot, poi, week, itinerary)

                else:
                    overflow(poi, busyness_matrix, best_slot, week, itinerary, db, pois)

    warning = None
    cleaned_itinerary = {}
    for week, week_days in itinerary.items():
        for weekday, slots in week_days.items():
            for slot_name, pois in slots.items():
                if pois:
                    cleaned_itinerary.setdefault(week, {})
                    cleaned_itinerary[week].setdefault(weekday, {})
                    cleaned_itinerary[week][weekday][slot_name] = pois
                if len(pois) > MAX_POIS_PER_SLOT:
                    warning = "Some visits may overlap — you've got a packed trip! Consider adjusting your schedule."
    
    return cleaned_itinerary, warning

def assign(slot: dict, poi: POIProfile, week: int, itinerary: dict[str, dict[str, list]]):
    day = slot["day"]
    time_slot = slot["time_slot"]
    if poi.availability[day][time_slot]:
        itinerary[week][day][time_slot].append(poi)

def slot_not_full(slot: dict, week: int, itinerary: dict):
    test_slot = find_slot(slot, week, itinerary)
    return len(test_slot["pois"]) < MAX_POIS_PER_SLOT

def find_slot(slot: dict, week: int, itinerary: dict):
    day = slot["day"]
    time_slot = slot["time_slot"]
    pois = itinerary[week][day][time_slot]

    return {
        "week": week, 
        "day": day, 
        "time_slot": time_slot, 
        "pois": pois
        }

def overflow(poi: POIProfile, matrix: dict, slot: dict, week: int, itinerary: dict, db: Session, pois: list[POIProfile]):
    if slot["time_slot"] == "evening":
        assign(slot, poi, week, itinerary)
        return
    
    current_poi = poi
    current_slot = find_slot(slot, week, itinerary)

    busyness = calculate_busyness_cost(current_poi, current_slot, matrix)
    geographic = calculate_geographic_cost(current_poi, current_slot, db)

    combined_costs = find_combined_costs(busyness, geographic, pois)
    to_move = combined_costs["to_move"]
    
    if to_move in current_slot["pois"]:
        replace(to_move, current_poi, current_slot)
        assign_to_next_slot(to_move, current_slot, week, itinerary, matrix, db, pois)

    else:
        assign_to_next_slot(to_move, current_slot, week, itinerary, matrix, db, pois)

def assign_to_next_slot(to_move: POIProfile, slot: dict, week: int, itinerary: dict, matrix, db, pois):
    time_slots = [s.name for s in TIME_SLOTS]

    current_slot = slot["time_slot"]
    day = slot["day"]

    current_slot_index = time_slots.index(current_slot)
    next_slot = time_slots[current_slot_index + 1]
    
    next_slot_in_itinerary = {
        "day": day,
        "time_slot": next_slot,
        "pois": itinerary[week][day][next_slot]
    }

    if len(itinerary[week][day][next_slot]) >= MAX_POIS_PER_SLOT:
        overflow(to_move, matrix, next_slot_in_itinerary, week, itinerary, db, pois)
        
    else:
        assign(next_slot_in_itinerary, to_move, week, itinerary)
   


