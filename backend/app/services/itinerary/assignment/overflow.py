from decimal import Decimal
from app.domains.scheduling import POIProfile

def calculate_combined_cost(busyness, geographic):
    """
    Calculate the weighted combined cost of moving a POI.

    The combined cost balances crowd impact and geographic impact using
    fixed weights. Lower values represent better relocation candidates.

    The weighting prioritizes reducing busyness while still considering
    route efficiency.

    Args:
        busyness: Normalized busyness cost.
        geographic: Normalized geographic cost.

    Returns:
        Decimal representing the combined relocation cost.
    """
    busyness = Decimal(str(busyness))
    geographic = Decimal(str(geographic))
    return (Decimal("0.7") * busyness) + (Decimal("0.3") * geographic)

def find_combined_costs(busyness, geographic, pois: list[POIProfile]):
    """
    Determine the best POI to move during overflow resolution.

    Combines normalized busyness and geographic costs for each candidate POI.
    The POI with the lowest weighted cost is selected as the preferred
    candidate for relocation.

    Args:
        busyness: List of normalized busyness relocation costs.
        geographic: List of normalized geographic relocation costs.
        pois: Available POI profiles for lookup.

    Returns:
        Dictionary containing combined costs for each POI and the POI
        selected for movement under the "to_move" key.
    """
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
    combined_costs["to_move"] = poi_lookup[min_key]

    return combined_costs

def replace(remove: POIProfile, add: POIProfile, slot: dict):
    """
    Replace a POI in a time slot during overflow resolution.

    Removes the selected high-cost POI and inserts the new POI if it is
    available during the slot.

    Args:
        remove: POI being moved out of the slot.
        add: POI being inserted into the slot.
        slot: Current itinerary slot.
    """
    
    slot["pois"].remove(remove)
    if add.availability[slot["day"]][slot["time_slot"]]:
        slot["pois"].append(add)

