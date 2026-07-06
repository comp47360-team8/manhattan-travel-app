from sqlalchemy.orm import Session
from app.domains.scheduling import POIProfile
from app.core.constants import MAX_POIS_PER_DAY, TIME_SLOTS, MAX_POIS_PER_SLOT
from app.core.exceptions import MaximumPOIsExceeded
from app.services.itinerary.assignment.utils import split_evenly, number_of_weeks
from app.services.itinerary.assignment.busyness import build_busyness_matrix, find_best_slot, calculate_busyness_cost
from app.services.itinerary.assignment.overflow import find_combined_costs, replace
from app.services.itinerary.assignment.geography import calculate_geographic_cost

def assign_days(pois: list[POIProfile], trip_days: list[int]):
    if len(trip_days) * MAX_POIS_PER_DAY < len(pois):
        raise MaximumPOIsExceeded

    sorted_pois = sorted(pois, key=lambda x: x.id)
    store = [i for i in sorted_pois]
    days = {}
    week = 0

    for trip_day in trip_days:
        if week not in days:
            days[week] = {}
        days[week][trip_day] = []
        if trip_day == 6:
            week += 1

    pois_per_day = split_evenly(len(pois), len(trip_days))

    index = 0
    week = 0
    start = 0
    for count in pois_per_day:
        days[week][trip_days[index]] = sorted_pois[start : start + count]
        if trip_days[index] == 6:
            week += 1
        index += 1
        start += count
    return days

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

    for week, week_days in itinerary.items():
        for weekday, slots in week_days.items():
            pois_in_day = []
            for slot_name, pois in slots.items():
                for poi in pois:
                    pois_in_day.append(poi)
            if pois_in_day:
                pois_in_day[-1].last_of_day = True

    return itinerary

def assign(slot: dict, poi: POIProfile, week: int, itinerary: dict[str, dict[str, list]]):
    day = slot["day"]
    time_slot = slot["time_slot"]
    if poi.slug not in itinerary[week][day][time_slot]:
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
    current_poi = poi
    current_slot = find_slot(slot, week, itinerary)

    busyness = calculate_busyness_cost(current_poi, current_slot, matrix)
    geographic = calculate_geographic_cost(current_poi, current_slot, db)

    if busyness is None:
        assign(current_slot, current_poi, week, itinerary)
        return

    combined_costs = find_combined_costs(busyness, geographic, pois)
    to_move = combined_costs["winner"]
    
    if to_move in current_slot["pois"]:
        replace(to_move, current_poi, current_slot)
        assign_to_next_slot(to_move, current_slot, week, itinerary)

    else:
        assign_to_next_slot(to_move, current_slot, week, itinerary)

def assign_to_next_slot(to_move: POIProfile, slot: dict, week: int, itinerary: dict):
    time_slots = [s.name for s in TIME_SLOTS]

    current_slot_index = time_slots.index(slot["time_slot"])
    wrap = False
    if current_slot_index == 2:
        wrap = True
    next_slot = time_slots[(current_slot_index + 1) % len(time_slots)]

    day = slot["day"]
    if wrap:
        day = (slot["day"] + 1) % 7

    if len(itinerary[week][day][next_slot]) >= MAX_POIS_PER_SLOT:
        itinerary[week][day]["evening"].append(to_move)
        return
    itinerary[week][day][next_slot].append(to_move)

    return {
        "day": day, 
        "time_slot": next_slot, 
        "pois": itinerary[week][day][next_slot]
        }


