import math
from sqlalchemy.orm import Session
from app.domains.scheduling import POIProfile
from app.repositories.poi_repository import load_coordinates
from app.services.itinerary.assignment.utils import normalize_cost

def calculate_geographic_cost(poi: POIProfile, slot: dict, db: Session):
    """
    Calculate the geographic impact of moving a POI within a time slot.

    The function compares the current route distance with the distance
    after removing each candidate POI. This estimates which POIs contribute
    most to route inefficiency and allows the overflow resolver to select
    lower-cost replacements.

    The route distance is estimated using a nearest-neighbour heuristic.

    Args:
        poi: POI being evaluated for insertion into the slot.
        slot: Current itinerary slot containing assigned POIs.
        db: Database session used to retrieve coordinates.

    Returns:
        A list of dictionaries containing each POI's geographic cost and
        normalized cost value.
    """
    candidates = [dest for dest in slot["pois"]]
    candidates.append(poi)

    coordinates = load_coordinates(candidates, db)

    original_route = nearest_neighbour_route(candidates, coordinates)
    original_distance = route_distance(original_route, coordinates)

    cost_list = []
    costs = []

    for i in range(len(candidates)):
        removed_poi = candidates[i]
        remaining_candidates = [dest for j, dest in enumerate(candidates) if j != i]

        new_route = nearest_neighbour_route(remaining_candidates, coordinates)
        new_distance = route_distance(new_route, coordinates)

        cost = new_distance - original_distance
        costs.append(cost)

        geographic_cost = {
            "poi": removed_poi, 
            "cost": cost
            }
        cost_list.append(geographic_cost)

    for item in cost_list:
        sign = "positive" if item["cost"] >= 0 else "negative"
        item["normalized_cost"] = normalize_cost(item["cost"], costs, sign)

    return cost_list

def nearest_neighbour_route(pois: list[str], coordinates: dict[str, tuple[float, float]]):
    """
    Generate an approximate shortest route using the nearest-neighbour heuristic.

    Starting from the first POI, repeatedly selects the closest unvisited POI.
    This provides a lightweight route estimate without requiring an expensive
    optimal travelling salesman solver.

    Args:
        pois: POIs to order.
        coordinates: Mapping of POI slugs to latitude/longitude pairs.

    Returns:
        Ordered list of POIs representing the estimated route.
    """

    if len(pois) <= 1:
        return pois

    unvisited = pois.copy()
    route = [unvisited.pop(0)]

    while unvisited:
        current = route[-1]
        nearest = min(
            unvisited,
            key=lambda p: haversine(
                coordinates[current.slug][0],
                coordinates[current.slug][1],
                coordinates[p.slug][0],
                coordinates[p.slug][1],
            ),
        )
        route.append(nearest)
        unvisited.remove(nearest)

    return route

def route_distance(route: list[str], coordinates: dict[str, tuple[float, float]]):
    """
    Calculate the total distance travelled along a POI route.

    Distances between consecutive POIs are calculated using the Haversine
    formula.

    Args:
        route: Ordered POI route.
        coordinates: Mapping of POI identifiers to coordinates.

    Returns:
        Total route distance in kilometres.
    """

    total = 0
    for i in range(len(route) - 1):
        lat1, lng1 = coordinates[route[i].slug]
        lat2, lng2 = coordinates[route[i + 1].slug]

        total += haversine(lat1, lng1, lat2, lng2)
    return total

def haversine(lat1, lng1, lat2, lng2):
    """Calculate the great-circle distance between two geographic coordinates."""
    
    R = 6371

    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)

    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lng2 - lng1)

    a = (
        math.sin(dphi / 2) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    return R * c
