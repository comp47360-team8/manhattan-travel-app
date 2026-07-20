"""Unit tests for the overflow cost model (70% busyness / 30% geography)."""
from decimal import Decimal

from tests.conftest import make_profile

from app.services.itinerary.assignment.overflow import (
    calculate_combined_cost,
    find_combined_costs,
    replace,
)

DAY = 5


class TestCombinedCost:
    def test_weights_are_70_30(self):
        assert calculate_combined_cost(1, 0) == Decimal("0.7")
        assert calculate_combined_cost(0, 1) == Decimal("0.3")
        assert calculate_combined_cost(1, 1) == Decimal("1.0")

    def test_uses_decimal_not_float(self):
        # 0.7*0.1 + 0.3*0.2 must be exactly 0.13, no float drift.
        assert calculate_combined_cost(0.1, 0.2) == Decimal("0.13")


class TestFindCombinedCosts:
    def test_picks_cheapest_poi_to_move(self):
        a = make_profile(1, "a", [DAY])
        b = make_profile(2, "b", [DAY])

        busyness = [
            {"poi": a, "normalized_cost": 1.0},
            {"poi": b, "normalized_cost": 0.0},  # b is cheapest to move
        ]
        geographic = [
            {"poi": a, "normalized_cost": 0.5},
            {"poi": b, "normalized_cost": 0.5},
        ]

        result = find_combined_costs(busyness, geographic, [a, b])

        assert result["to_move"] is b

    def test_poi_missing_geographic_cost_is_skipped(self):
        a = make_profile(1, "a", [DAY])
        b = make_profile(2, "b", [DAY])

        busyness = [
            {"poi": a, "normalized_cost": 0.0},  # cheapest, but no geo cost
            {"poi": b, "normalized_cost": 1.0},
        ]
        geographic = [{"poi": b, "normalized_cost": 0.0}]

        result = find_combined_costs(busyness, geographic, [a, b])

        assert result["to_move"] is b


class TestReplace:
    def test_swaps_pois_when_new_poi_is_available(self):
        old = make_profile(1, "old", [DAY])
        new = make_profile(2, "new", [DAY])
        slot = {"day": DAY, "time_slot": "morning", "pois": [old]}

        replace(old, new, slot)

        assert slot["pois"] == [new]

    def test_documents_silent_drop_when_new_poi_unavailable(self):
        # DOCUMENTED CURRENT BEHAVIOUR (candidate bug for the paper's
        # honesty section): if the incoming POI is not available in the
        # slot, the old POI is removed but the new one is NOT added,
        # so the slot shrinks and the new POI vanishes from this slot.
        old = make_profile(1, "old", [DAY])
        new = make_profile(2, "new", [DAY], open_slots=("evening",))
        slot = {"day": DAY, "time_slot": "morning", "pois": [old]}

        replace(old, new, slot)

        assert slot["pois"] == []
