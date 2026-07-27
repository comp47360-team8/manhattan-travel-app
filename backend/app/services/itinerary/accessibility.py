from app.models.poi_model import POI

"""
Labels are matched exactly against the values stored in accessibility_labels,
which come from the OpenStreetMap wheelchair tag.

Callers pass ["wheelchair"] and never "wheelchair_limited": from a visitor's
point of view partial access is the same as no access, so a partially
accessible POI must not satisfy a wheelchair requirement. A POI with no labels
at all means OSM had no data, which is likewise not enough to satisfy one.
"""

def filter_accessibility(pois: list[POI], accessibility: list[str]):
    filtered = []
    for poi in pois:
        if poi.accessibility_labels != None:
            if any(label in accessibility for label in poi.accessibility_labels):
                filtered.append(poi)

    return filtered
