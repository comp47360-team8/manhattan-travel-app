from app.models.poi_model import POI

def filter_accessibility(pois: list[POI], accessibility: list[str]):
    filtered = []
    for poi in pois:
        if poi.accessibility_labels != None:
            if any(label in accessibility for label in poi.accessibility_labels):
                filtered.append(poi)

    return filtered
