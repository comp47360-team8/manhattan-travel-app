"""Unit tests for the accessibility filter (paper III-C step i)."""
from app.services.itinerary.accessibility import filter_accessibility


def test_keeps_pois_matching_any_required_label(make_poi):
    pois = [
        make_poi("met", accessibility_labels=["wheelchair", "step_free"]),
        make_poi("cafe", accessibility_labels=["step_free"]),
    ]

    result = filter_accessibility(pois, ["wheelchair"])

    assert [p.slug for p in result] == ["met"]


def test_excludes_pois_with_no_accessibility_data(make_poi):
    # A POI with unknown accessibility must NOT pass a hard requirement.
    pois = [make_poi("unknown", accessibility_labels=None)]

    assert filter_accessibility(pois, ["wheelchair"]) == []


def test_empty_requirement_list_filters_everything(make_poi):
    # Documents current behaviour: an empty requirements list matches
    # nothing (any() over empty -> False). Callers must only invoke the
    # filter when the user actually set accessibility requirements.
    pois = [make_poi("met", accessibility_labels=["wheelchair"])]

    assert filter_accessibility(pois, []) == []
