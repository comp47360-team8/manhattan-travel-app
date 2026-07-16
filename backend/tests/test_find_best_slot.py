"""Unit tests for find_best_slot — the core 'busyness-first' rule.

Paper reference (III-C): each POI is assigned to the time slot where its
predicted busyness is lowest, among slots where the POI is open.
"""
from tests.conftest import make_profile

from app.services.itinerary.assignment.busyness import find_best_slot

DAY = 5  # Saturday


def test_picks_the_quietest_slot():
    poi = make_profile(1, "met-museum", [DAY])
    scores = {"morning": 30, "afternoon": 80, "evening": 55}

    best = find_best_slot(poi, DAY, scores)

    assert best["time_slot"] == "morning"
    assert best["score"] == 30
    assert best["day"] == DAY


def test_ignores_slots_where_poi_is_closed():
    # Quietest slot is morning, but the POI only opens in the evening.
    poi = make_profile(1, "evening-only", [DAY], open_slots=("evening",))
    scores = {"morning": 10, "afternoon": 20, "evening": 90}

    best = find_best_slot(poi, DAY, scores)

    assert best["time_slot"] == "evening"


def test_ignores_slots_without_forecast_data():
    poi = make_profile(1, "partial-data", [DAY])
    scores = {"morning": None, "afternoon": 40, "evening": None}

    best = find_best_slot(poi, DAY, scores)

    assert best["time_slot"] == "afternoon"


def test_returns_none_when_no_slot_is_usable():
    # All slots closed -> scheduler must signal 'nothing feasible today'.
    poi = make_profile(1, "closed-today", [DAY], open_slots=())
    scores = {"morning": 10, "afternoon": 20, "evening": 30}

    assert find_best_slot(poi, DAY, scores) is None


def test_returns_none_when_all_scores_missing():
    poi = make_profile(1, "no-data", [DAY])
    scores = {"morning": None, "afternoon": None, "evening": None}

    assert find_best_slot(poi, DAY, scores) is None
