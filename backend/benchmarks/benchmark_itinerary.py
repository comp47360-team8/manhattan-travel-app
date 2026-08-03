"""
Measure runtime of itinerary generation algorithm.

Run file locally:
    cd backend
    python -m benchmarks.benchmark_itinerary
"""

import random
import time
import statistics
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.services.itinerary.itinerary_service import create_itinerary
from app.services.poi_service import get_all_pois
from app.schemas.itinerary import ItineraryRequest

def get_all_slugs(db: Session):
    pois = get_all_pois(db)
    return [poi.slug for poi in pois]

def create_request(db: Session):
    return ItineraryRequest(
        trip_name="mock_itinerary",
        trip_dates=["2026-08-03", "2026-08-05"],
        pois=random.sample(get_all_slugs(db), 15),
        accessibility=[],
    )

# calculate create_itinerary metrics
def benchmark(db: Session):
    random.seed(27)
    
    request = create_request(db)
    
    # generate 100 itineraries
    runtimes = []
    for _ in range(100):
        start = time.perf_counter()
        itinerary = create_itinerary(request, db)
        end = time.perf_counter()

        runtimes.append((end - start) * 1000)

    # calculate runtime metric
    average_runtime = statistics.mean(runtimes)
    p95 = statistics.quantiles(runtimes, n = 100)[94]

    # calculate quality metric
    itinerary = create_itinerary(request, db)
    total = 0
    quiet_or_moderate = 0

    for stop in itinerary["stops"]:
        total += 1
        if stop["crowd_level"] in ["Quiet", "Moderate"]:
            quiet_or_moderate += 1

    percentage = (quiet_or_moderate / total) * 100
    
    # show results
    print("-----------------------")
    print(f"Total POIs in test set: {total}")
    print(f"Average itinerary generation runtime: {average_runtime:.2f}ms.")
    print(f"P95 runtime: {p95:.2f}ms.")
    print(f"Quiet/Moderate POIs: {percentage:.1f}%.")
    print("-----------------------")

if __name__ == "__main__":
    db = SessionLocal()
    try:
        for _ in range(5):
            benchmark(db)

    finally:
        db.close()
