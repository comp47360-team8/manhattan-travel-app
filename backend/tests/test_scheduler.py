"""Integration-style unit tests for the scheduling engine (assign_days /
assign_slots). The busyness forecast and geographic costs are monkeypatched
so no database is needed — we are testing the RULES, not the data access.

Paper reference (III-C): (i) exclude closed POIs, (ii) place each POI in its
lowest-busyness feasible slot, (iv) over-scheduling yields a non-blocking
warning rather than a hard failure.
"""
import pytest

from tests.conftest import make_profile, FakePOI

from app.core.exceptions import POINotOpenDuringTrip
from app.services.itinerary.assignment import scheduler

FRI, SAT = 4, 5


# ---------------------------------------------------------------- assign_days

class TestAssignDays:
    def test_splits_pois_evenly_across_days(self):
        profiles = [make_profile(i, f"poi-{i}", [FRI, SAT]) for i in range(4)]
        pois_list = [FakePOI(p.slug) for p in profiles]

        trip = scheduler.assign_days(pois_list, profiles, [FRI, SAT])

        assert len(trip[0][FRI]) == 2
        assert len(trip[0][SAT]) == 2

    def test_poi_closed_for_entire_trip_raises(self):
        # Rule (i): a POI that never opens during the trip is a hard error
        # surfaced to the user, not a silent drop.
        closed = make_profile(1, "closed-mondays-venue", [FRI, SAT], opening_days=[0])
        pois_list = [FakePOI(closed.slug, name="Closed Venue")]

        with pytest.raises(POINotOpenDuringTrip, match="Closed Venue"):
            scheduler.assign_days(pois_list, [closed], [FRI, SAT])

    def test_partially_closed_poi_is_locked_to_an_open_day(self):
        open_both = [make_profile(i, f"poi-{i}", [FRI, SAT]) for i in range(2)]
        sat_only = make_profile(9, "sat-only", [FRI, SAT], opening_days=[SAT])
        profiles = open_both + [sat_only]
        pois_list = [FakePOI(p.slug) for p in profiles]

        trip = scheduler.assign_days(pois_list, profiles, [FRI, SAT])

        assert sat_only in trip[0][SAT]
        assert sat_only not in trip[0][FRI]


# --------------------------------------------------------------- assign_slots

def patch_matrix(monkeypatch, matrix):
    monkeypatch.setattr(scheduler, "build_busyness_matrix", lambda *a, **k: matrix)


def patch_geography(monkeypatch):
    def fake_geo(poi, slot, db):
        candidates = list(slot["pois"]) + [poi]
        return [{"poi": c, "normalized_cost": 0.5} for c in candidates]

    monkeypatch.setattr(scheduler, "calculate_geographic_cost", fake_geo)


class TestAssignSlots:
    def test_each_poi_lands_in_its_quietest_slot(self, monkeypatch):
        quiet_morning = make_profile(1, "quiet-morning", [SAT])
        quiet_evening = make_profile(2, "quiet-evening", [SAT])
        matrix = {
            "quiet-morning": {SAT: {"morning": 10, "afternoon": 80, "evening": 60}},
            "quiet-evening": {SAT: {"morning": 70, "afternoon": 80, "evening": 20}},
        }
        patch_matrix(monkeypatch, matrix)
        calendar = {0: {SAT: [quiet_morning, quiet_evening]}}

        itinerary, warning = scheduler.assign_slots(
            [quiet_morning, quiet_evening], calendar, [SAT], db=None
        )

        assert quiet_morning in itinerary[0][SAT]["morning"]
        assert quiet_evening in itinerary[0][SAT]["evening"]
        assert warning is None

    def test_full_slot_overflows_cheapest_poi_to_next_slot(self, monkeypatch):
        # Three POIs all quietest in the morning, but MAX_POIS_PER_SLOT=2.
        # The engine must move exactly one POI to the afternoon — the one
        # with the lowest combined (busyness+geography) cost of moving.
        a = make_profile(1, "a", [SAT])
        b = make_profile(2, "b", [SAT])
        c = make_profile(3, "c", [SAT])
        matrix = {
            # cost of moving = afternoon - morning: a=40, b=20, c=10
            "a": {SAT: {"morning": 10, "afternoon": 50, "evening": 90}},
            "b": {SAT: {"morning": 10, "afternoon": 30, "evening": 90}},
            "c": {SAT: {"morning": 10, "afternoon": 20, "evening": 90}},
        }
        patch_matrix(monkeypatch, matrix)
        patch_geography(monkeypatch)
        calendar = {0: {SAT: [a, b, c]}}

        itinerary, warning = scheduler.assign_slots([a, b, c], calendar, [SAT], db=None)

        morning = itinerary[0][SAT]["morning"]
        afternoon = itinerary[0][SAT].get("afternoon", [])
        assert len(morning) == 2
        assert c in afternoon  # cheapest mover ends up in the afternoon
        assert warning is None

    def test_overscheduled_evening_warns_but_does_not_fail(self, monkeypatch):
        # Rule (iv): evening is the terminal slot; a third evening-only POI
        # is still placed, and the user gets a non-blocking warning.
        pois = [
            make_profile(i, f"night-{i}", [SAT], open_slots=("evening",))
            for i in range(3)
        ]
        matrix = {
            p.slug: {SAT: {"morning": 10, "afternoon": 20, "evening": 30}}
            for p in pois
        }
        patch_matrix(monkeypatch, matrix)
        calendar = {0: {SAT: pois}}

        itinerary, warning = scheduler.assign_slots(pois, calendar, [SAT], db=None)

        assert len(itinerary[0][SAT]["evening"]) == 3
        assert warning is not None

    def test_poi_without_forecast_is_silently_skipped(self, monkeypatch):
        # DOCUMENTED CURRENT BEHAVIOUR: a POI whose forecast is entirely
        # missing is dropped from the itinerary without any warning.
        # Worth an honest sentence in the paper (or a fix): the user gets
        # no explanation for the missing stop.
        has_data = make_profile(1, "has-data", [SAT])
        no_data = make_profile(2, "no-data", [SAT])
        matrix = {
            "has-data": {SAT: {"morning": 10, "afternoon": 20, "evening": 30}},
            "no-data": {SAT: {"morning": None, "afternoon": None, "evening": None}},
        }
        patch_matrix(monkeypatch, matrix)
        calendar = {0: {SAT: [has_data, no_data]}}

        itinerary, warning = scheduler.assign_slots(
            [has_data, no_data], calendar, [SAT], db=None
        )

        all_scheduled = [
            poi
            for slots in itinerary[0].values()
            for pois in slots.values()
            for poi in pois
        ]
        assert has_data in all_scheduled
        assert no_data not in all_scheduled
        assert warning is None  # no signal to the user — see note above
