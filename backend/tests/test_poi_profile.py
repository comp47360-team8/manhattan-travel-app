from types import SimpleNamespace

from app.services.itinerary.poi_profile import find_availabile_slots


def test_assumed_open_poi_is_available_in_every_slot():
    poi = SimpleNamespace(availability_mode="ASSUMED_OPEN")
    matrix, flags = find_availabile_slots(poi, [5, 6])
    assert all(is_open for slots in matrix.values() for is_open in slots.values())
    assert flags

def test_unknown_hours_poi_is_available_with_a_warning():
    poi = SimpleNamespace(availability_mode="UNKNOWN")
    matrix, flags = find_availabile_slots(poi, [5, 6]) 
    assert all(is_open for slots in matrix.values() for is_open in slots.values())
    assert "Unverified" in flags[0]