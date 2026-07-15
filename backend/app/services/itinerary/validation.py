from app.models.poi_model import POI
from app.domains.scheduling import POIProfile
from app.core.constants import TIME_SLOTS
from app.core.exceptions import RepeatingPOI

def validate_pois(pois: list[POI], dates: list) -> list[POIProfile]:
    for poi in pois:
        if pois.count(poi) > 1:
            raise RepeatingPOI

    poi_profiles = []
    for poi in pois:
        profile = build_poi_profile(poi, dates)
        poi_profiles.append(profile)
    return poi_profiles

def build_poi_profile(poi: POI, dates: list):
    availability, flags = find_availabile_slots(poi, dates)

    opening_days = []

    days_not_open = []
    for day, slots in availability.items():
        openings = []
        for slot, is_open in slots.items():
            openings.append(is_open)
        if all(is_open == False for is_open in openings):
            days_not_open.append(day)

    for day in dates:
        if day not in days_not_open:
            opening_days.append(day)
        
    return POIProfile(
        id=poi.id,
        slug=poi.slug,
        availability=availability,
        mode=poi.availability_mode,
        opening_days=opening_days,
        flags=flags,
    )

def find_availabile_slots(poi: POI, days: list):
    matrix = {day: {slot.name: False for slot in TIME_SLOTS} for day in days}
    flags = []
    # assume open
    if poi.availability_mode == "ASSUMED_OPEN":
        for day in matrix:
            for slot in matrix[day]:
                matrix[day][slot] = True
        flags = ["No official opening hours."]

    # unknown opening hours
    if poi.availability_mode == "UNKNOWN":
        for day in matrix:
            for slot in matrix[day]:
                matrix[day][slot] = True
        flags = ["Unverified hours, hours may be unavailable or event-booked only."]

    # strict opening hours
    if poi.availability_mode == "STRICT":
        opening_hours = convert_opening_hours(poi.opening_hours)
        for day in days:
            if day not in opening_hours:
                continue

            intervals = opening_hours[day]
            for slot in TIME_SLOTS:
                if is_trip_within_opening(
                    intervals[0], intervals[1], slot.start, slot.end
                ):
                    matrix[day][slot.name] = True
    return matrix, flags

def convert_opening_hours(opening_hours: dict[str:[list]]):
    converted_opening_hours = {}

    weekday_to_int = {
        "mon": 0,
        "tue": 1,
        "wed": 2,
        "thu": 3,
        "fri": 4,
        "sat": 5,
        "sun": 6,
    }

    for weekday in opening_hours:
        if opening_hours[weekday] != None:
            day = weekday_to_int[weekday]
            start = opening_hours[weekday][0][0]
            end = opening_hours[weekday][0][1]
            start_hours, end_hours = extract_hours(start, end)
            converted_opening_hours[day] = (start_hours, end_hours)

    return converted_opening_hours

def extract_hours(start: str, end: str):
    start_hours = int(start.split(":")[0])
    end_hours = int(end.split(":")[0])
    if 11 >= end_hours >= 1:
        end_hours = end_hours + 24
    return start_hours, end_hours

def is_trip_within_opening(open_start, open_end, slot_start, slot_end):
    if open_end <= open_start or slot_end <= slot_start:
        return False
    return max(open_start, slot_start) < min(open_end, slot_end)
