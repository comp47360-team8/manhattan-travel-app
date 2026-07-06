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

def calculate_busyness_cost(poi:POIProfile, slot: dict, matrix: dict):
    candidates = [dest for dest in slot["pois"]]
    candidates.append(poi)

    cost_list = []
    costs = []

    for profile in candidates:
        day = matrix[profile.slug][slot["day"]]

        slots = list(day.keys())

        current_slot_index = slots.index(slot["time_slot"])
        current_slot = slots[current_slot_index]

        wrap = False
        if current_slot_index == 2:
            wrap = True
        next_slot = slots[(current_slot_index + 1) % len(slots)]

        current_score = day[current_slot]
        if wrap:
            trip_days = sorted(matrix[profile.slug].keys())
            last_day = False
            for d in trip_days:
                if d + 1 not in trip_days:
                    last_day = True
                if last_day:
                    return
            day = matrix[profile.slug][(slot["day"] + 1) % 7]
        next_score = day[next_slot]

        cost = next_score - current_score
        costs.append(cost)
        busyness_cost = {
            "poi": profile, 
            "cost": next_score - current_score
            }
        cost_list.append(busyness_cost)

    for item in cost_list:
        sign = "positive" if item["cost"] >= 0 else "negative"
        item["normalized_cost"] = normalize_cost(item["cost"], costs, sign)

    return cost_list
