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
    pois = get_all_pois(db)
    print(f"Fetched {len(pois)} POIs", flush=True)
    
    return ItineraryRequest(
        trip_name="mock_itinerary",
        trip_dates=["2026-08-03", "2026-08-05"],
        pois=random.sample([poi.slug for poi in pois], 15),
        accessibility=[]
        )

# calculate create_itinerary metrics
def benchmark(db: Session):
    random.seed(50)
    
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
    print(f"Test set length: {total}", flush=True)
    print(f"Mean itinerary generation runtime: {average_runtime:.2f} ms", flush=True)
    print(f"P95 runtime: {p95:.2f} ms", flush=True)
    print(f"Quiet & Moderate POIs: {percentage:.1f}%", flush=True)

if __name__ == "__main__":
    db = SessionLocal()
    
    try:
        print("Starting benchmark", flush=True)
        benchmark(db)
        print("Finished benchmark", flush=True)

    finally:
        db.close()
