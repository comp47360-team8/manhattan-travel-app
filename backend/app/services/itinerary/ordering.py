from app.services.itinerary.assignment.geography import haversine
from app.models.poi_model import POI
from app.domains.scheduling import POIProfile
from itertools import permutations, product

def reorder_pois(pois_list: list[POI], profiles_list: list[POIProfile], itinerary: dict):
    """
    Reorder POIs within each day to reduce total travel distance.

    Each day's time slots are optimized jointly, after which the resulting
    POIs are converted back to POI profiles for downstream itinerary
    transformation.

    Args:
        pois_list: POI database objects used to retrieve geographic data.
        profiles_list: POI profiles produced by the scheduling pipeline.
        itinerary: Itinerary grouped by week, day, and time slot.

    Returns:
        The itinerary with POIs reordered geographically within each day.
    """

    profile_map = {p.slug: p for p in profiles_list}
    
    for week, week_days in itinerary.items():
        for weekday, slots in week_days.items():
            optimized_slots = optimize_day(slots, pois_list)
            itinerary[week][weekday] = optimized_slots
            for slot_name, pois in optimized_slots.items():
                transformed_pois = []
                for poi in pois:
                    poi_profile = profile_map[poi.slug]
                    transformed_pois.append(poi_profile)
                itinerary[week][weekday][slot_name] = transformed_pois
    return itinerary

def optimize_day(slots, pois_list: list[POI]):
    """
    Find the lowest-distance ordering of POIs across a single day.

    Generates possible orderings within each time slot and evaluates their
    combined travel distance. The ordering with the lowest total distance
    is selected.

    Args:
        slots: POIs grouped by time slot for one day.
        pois_list: POI database objects containing geographic coordinates.

    Returns:
        A dictionary containing the optimized POI ordering for each time slot.
    """

    poi_map = {p.slug: p for p in pois_list}

    slot_names = list(slots.keys())

    slot_orders = []

    for slot_name in slot_names:
        pois = slots[slot_name]
        transformed_pois = []
        for poi in pois:
            poi_object = poi_map[poi.slug]
            transformed_pois.append(poi_object)
        slot_orders.append(list(permutations(transformed_pois)))

    best_route = None
    best_distance = float("inf")

    for candidate in product(*slot_orders):
        distance = calculate_distance(candidate)

        if distance < best_distance:
            best_distance = distance
            best_route = candidate

    optimized_slots = {}

    for slot_name, pois in zip(slot_names, best_route):
        optimized_slots[slot_name] = list(pois)

    return optimized_slots
    
def calculate_distance(itinerary):
    """
    Calculate the total geographic distance travelled during a day.

    The distance is calculated between consecutive POIs across all time
    slots using the Haversine formula.

    Args:
        itinerary: Ordered POIs grouped by time slot.

    Returns:
        Total travel distance in kilometres.
    """
    total = 0
    previous_poi = None

    for slot in itinerary:
        for poi in slot:
            if previous_poi is not None:
                total += haversine(
                    previous_poi.latitude,
                    previous_poi.longitude,
                    poi.latitude,
                    poi.longitude
                )
            previous_poi = poi
    return total
    
    


                
            
            


                


                
                


                









                        
                



