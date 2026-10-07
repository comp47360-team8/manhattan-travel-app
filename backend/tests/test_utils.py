"""Unit tests for app/services/itinerary/assignment/utils.py (pure functions)."""
from datetime import date

import pytest

from app.services.itinerary.assignment.utils import (
    convert_to_days,
    number_of_weeks,
    split_evenly,
    normalize_cost,
)


class TestSplitEvenly:
    def test_exact_division(self):
        assert split_evenly(6, 3) == [2, 2, 2]

    def test_remainder_goes_to_earlier_days(self):
        assert split_evenly(5, 2) == [3, 2]

    def test_fewer_pois_than_days(self):
        assert split_evenly(1, 3) == [1, 0, 0]

    def test_total_is_preserved(self):
        for total in range(0, 12):
            for parts in range(1, 5):
                assert sum(split_evenly(total, parts)) == total


class TestConvertToDays:
    def test_single_day_trip(self):
        # 2026-07-20 is a Monday -> weekday 0
        assert convert_to_days([date(2026, 7, 20)]) == [0]

    def test_two_consecutive_days(self):
        assert convert_to_days([date(2026, 7, 20), date(2026, 7, 21)]) == [0, 1]

    def test_range_wraps_around_the_week(self):
        # Friday 2026-07-17 .. Monday 2026-07-20 -> Fri, Sat, Sun, Mon
        assert convert_to_days([date(2026, 7, 17), date(2026, 7, 20)]) == [4, 5, 6, 0]


class TestNumberOfWeeks:
    def test_short_trip_is_one_week(self):
        assert number_of_weeks([4, 5, 6]) == 1

    def test_full_week_counts_as_two(self):
        # Documents current behaviour: len==7 -> 2 (scheduler allocates a
        # second week bucket when the trip includes a Sunday rollover).
        assert number_of_weeks([0, 1, 2, 3, 4, 5, 6]) == 2


class TestNormalizeCost:
    def test_identical_costs_normalize_to_zero(self):
        assert normalize_cost(5, [5, 5, 5], "positive") == 0

    def test_positive_sign_scales_min_to_zero_max_to_one(self):
        costs = [10, 20, 30]
        assert normalize_cost(10, costs, "positive") == 0
        assert normalize_cost(30, costs, "positive") == 1
        assert normalize_cost(20, costs, "positive") == pytest.approx(0.5)

    def test_negative_sign_reverses_the_scale(self):
        costs = [10, 20, 30]
        assert normalize_cost(10, costs, "negative") == 1
        assert normalize_cost(30, costs, "negative") == 0
