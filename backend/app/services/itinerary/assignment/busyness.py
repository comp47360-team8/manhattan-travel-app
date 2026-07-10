from sqlalchemy.orm import Session
from app.domains.scheduling import POIProfile
from app.repositories.poi_repository import get_poi_busyness_forecast
from app.services.itinerary.assignment.utils import normalize_cost
from app.core.constants import TIME_SLOTS

def build_busyness_matrix(pois: list[POIProfile], trip_days: list, db: Session):
    percentages = get_poi_busyness_forecast(pois, trip_days, db)

    busyness_matrix = {
        poi.slug: {day: {slot.name: None for slot in TIME_SLOTS} for day in trip_days}
        for poi in pois
    }

    for row in percentages:
        busyness_matrix[row.slug][row.day][row.slot] = row.avg_busyness_pct
                    
    return busyness_matrix

def find_best_slot(poi: POIProfile, day: int, matrix: dict[str, dict]):
    lowest_score = float("inf")
    best_day = None
    best_time_slot = None

    for slot, score in matrix.items():
        if not poi.availability[day][slot]:
            continue

        if score is None:
            continue

        if score < lowest_score:
            lowest_score = score
            best_day = day
            best_time_slot = slot

    if best_day is None:
        return None

    return {
        "slug": poi.slug,
        "day": best_day,
        "time_slot": best_time_slot,
        "score": lowest_score,
    }

def calculate_busyness_cost(poi: POIProfile, slot: dict, matrix: dict):
    candidates = [dest for dest in slot["pois"]]
    candidates.append(poi)

    cost_list = []
    costs = []

    for candidate in candidates:
        current_day = matrix[candidate.slug][slot["day"]]

        slots = [s.name for s in TIME_SLOTS]

        current_slot_index = slots.index(slot["time_slot"])
        current_slot = slots[current_slot_index]

        next_slot = slots[current_slot_index + 1]
        
        if not candidate.availability[slot["day"]][next_slot]:
            continue

        current_score = current_day[current_slot]
        next_score = current_day[next_slot]

        if not next_score:
            continue

        cost = next_score - current_score
        costs.append(cost)
        busyness_cost = {
            "poi": candidate, 
            "cost": next_score - current_score
            }
        cost_list.append(busyness_cost)

    if not cost_list:
        return

    for item in cost_list:
        sign = "positive" if item["cost"] >= 0 else "negative"
        item["normalized_cost"] = normalize_cost(item["cost"], costs, sign)
    return cost_list
