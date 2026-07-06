from decimal import Decimal
from app.domains.scheduling import POIProfile

def calculate_combined_cost(busyness, geographic):
    busyness = Decimal(str(busyness))
    geographic = Decimal(str(geographic))
    return (Decimal("0.7") * busyness) + (Decimal("0.3") * geographic)

def find_combined_costs(busyness, geographic, pois: list[POIProfile]):
    poi_costs = []

    geo_lookup = {g["poi"].slug: g for g in geographic}
    for b in busyness:
        g = geo_lookup.get(b["poi"].slug)
        if g is None:
            continue

        poi_costs.append(
            {
                "poi": b["poi"],
                "normalized_busyness_cost": b["normalized_cost"],
                "normalized_geographic_cost": g["normalized_cost"],
            }
        )
    combined_costs = {}
    poi_lookup = {p.slug: p for p in pois}

    for dest in poi_costs:
        norm_busyness = dest["normalized_busyness_cost"]
        norm_geographic = dest["normalized_geographic_cost"]
        combined_cost = calculate_combined_cost(norm_busyness, norm_geographic)
        combined_costs[dest["poi"].slug] = combined_cost

    min_key = min(combined_costs, key=combined_costs.get)
    combined_costs["winner"] = poi_lookup[min_key]

    return combined_costs

def replace(remove: POIProfile, add: POIProfile, slot: dict):
    slot["pois"].remove(remove)
    slot["pois"].append(add)
