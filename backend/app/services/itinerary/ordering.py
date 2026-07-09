from app.services.itinerary.assignment.geography import haversine
from app.models.poi_model import POI
from app.domains.scheduling import POIProfile
from itertools import permutations, product

def reorder_pois(pois_list: list[POI], profiles_list: list[POIProfile], itinerary: dict):
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
    
    


                
            
            


                


                
                


                









                        
                



