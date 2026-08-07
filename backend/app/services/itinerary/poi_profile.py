from sqlalchemy.orm import Session
from app.models.poi_model import POI
from app.domains.scheduling import POIProfile
from app.core.constants import TIME_SLOTS

def get_poi_profiles(pois: list[POI], dates: list):
    """
    Build scheduling profiles for a collection of POIs.

    Each profile contains the POI's availability, opening days, availability
    mode, and scheduling flags for the requested trip dates.

    Args:
        pois: POIs to create profiles for.
        dates: Days of the week included in the trip.

    Returns:
        A list of POIProfile objects used by the scheduling engine.
    """

    poi_profiles = []
    for poi in pois:
        profile = build_poi_profile(poi, dates)
        poi_profiles.append(profile)
    return poi_profiles

def build_poi_profile(poi: POI, dates: list):
    """
    Build a scheduling profile for a single POI.

    Determines which time slots are available during the trip and identifies
    the days on which the POI is open.

    Args:
        poi: POI database object.
        dates: Days of the week included in the trip.

    Returns:
        A POIProfile containing availability and scheduling metadata.
    """

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
    """
    Determine which time slots are available for a POI.

    Availability is determined according to the POI's availability mode:
    assumed-open POIs are treated as available for all slots, unknown-hours
    POIs are treated as available with a warning, and strict POIs are checked
    against their recorded opening hours.

    Args:
        poi: POI whose availability is being evaluated.
        days: Days of the week to evaluate.

    Returns:
        A tuple containing the availability matrix and any scheduling flags.
    """

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
    """
    Convert opening hours from weekday names to numeric weekday values.

    Args:
        opening_hours: Opening-hour data keyed by weekday abbreviation.

    Returns:
        A dictionary mapping weekday numbers to opening and closing hours.
    """

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
    """
    Convert opening-hour strings into integer hour values.

    Closing times between 1:00 and 11:00 are treated as occurring after
    midnight and shifted into the following day.

    Args:
        start: Opening time in HH:MM format.
        end: Closing time in HH:MM format.

    Returns:
        A tuple containing the opening and closing hour values.
    """
    start_hours = int(start.split(":")[0])
    end_hours = int(end.split(":")[0])
    if 11 >= end_hours >= 1:
        end_hours = end_hours + 24
    return start_hours, end_hours

def is_trip_within_opening(open_start, open_end, slot_start, slot_end):
    """
    Determine whether a scheduling slot overlaps with opening hours.

    Args:
        open_start: POI opening hour.
        open_end: POI closing hour.
        slot_start: Scheduling slot start time.
        slot_end: Scheduling slot end time.

    Returns:
        True if the scheduling slot overlaps the POI's opening interval,
        otherwise False.
    """
    if open_end <= open_start or slot_end <= slot_start:
        return False
    return max(open_start, slot_start) < min(open_end, slot_end)
