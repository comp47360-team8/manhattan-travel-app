"""
Mesaure system performance(latency) of key endpoints:
- /api/pois
- /api/pois/{slug}
- /api/itinerary/generate
- /api/ai/converstions/{conversation_id}/messages

Run file locally:
    cd backend
    python -m benchmarks.benchmark_endpoints
"""

import requests
import time
import statistics
import getpass

BASE_URL = "https://api.offpeak.live/api"
AI_PAYLOAD = {
    "prompt": "Plan a trip to Manhattan focusing on museums and landmarks"
    }

def benchmark_endpoint(url, title, runs, payload=None):
    times = []
    
    # warm up (in case of cold start)
    warmup_start = time.perf_counter()

    if payload is not None:
        response = requests.post(url, json=payload)
    else:
        response = requests.get(url)
    
    response.raise_for_status()

    warmup_end = time.perf_counter()

    initial_request_time = (warmup_end - warmup_start) * 1000

    # main benchmark
    for _ in range(runs):
        start = time.perf_counter()

        if payload is not None:
            response = requests.post(url, json=payload)
        else:
            response = requests.get(url)

        response.raise_for_status()

        end = time.perf_counter()

        times.append((end - start) * 1000)
    
    # time metric calculation
    median_time = statistics.median(times)
    p95 = statistics.quantiles(times, n=100)[94]
   
   # show results
    print("-----------------------")
    print(f"Title: {title}")
    print(f"Initial request latency: {initial_request_time:.2f} ms")
    print(f"Median latency: {median_time:.2f} ms")
    print(f"P95 latency: {p95:.2f} ms")
    
# test /pois, /pois/{slug} and /itinerary/generate endpoints
benchmark_endpoint(
    url=f"{BASE_URL}/pois/", 
    title="POIs List",
    runs=100
    )

benchmark_endpoint(
    url=f"{BASE_URL}/pois/central-park", 
    title="POI Detail",
    runs=100
    )

benchmark_endpoint(
    url=f"{BASE_URL}/itinerary/generate", 
    title="Itinerary Generation",
    runs=100,
    payload={
        "trip_name": "mock_itinerary",
        "trip_dates": ["2026-08-03","2026-08-05"],
        "pois": [
            "central-park", "times-square", "the-high-line", 
            "grand-central-terminal", "empire-state-building", "bryant-park", 
            "rockefeller-center", "little-island", "pier-17"
            ],
        "accessibility": []
        }
    )

# test /ai/converstions/{id}/messages endpoint
# login (with Offpeak credentials)
session = requests.Session()

email = input("Email: ")
password = getpass.getpass("Password: ")

response = session.post(
    f"{BASE_URL}/auth/login",
    json={
        "email": email,
        "password": password
    }
)
response.raise_for_status()

# calculate warmup time for ai planner
response = session.post(
        f"{BASE_URL}/ai/conversations",
        json={}
    )
response.raise_for_status()
conversation_id = response.json()["conversation_id"]

start = time.perf_counter()
response = session.post(
    f"{BASE_URL}/ai/converstions/{conversation_id}/messages",
    json=AI_PAYLOAD
)
response.raise_for_status()
end = time.perf_counter()
initial_request_time = (end - start) * 1000

# hit ai endpoint 20 times
ai_times = []
for _ in range(20):
    response = session.post(
        f"{BASE_URL}/ai/conversations",
        json={}
    )
    response.raise_for_status()
    conversation_id = response.json()["conversation_id"]

    start = time.perf_counter()
    response = session.post(
        f"{BASE_URL}/ai/converstions/{conversation_id}/messages",
        json=AI_PAYLOAD
        )
    response.raise_for_status()
    end = time.perf_counter()
    ai_times.append((end - start) * 1000)

# time metric calculation
median_time = statistics.median(ai_times)
sorted_times = sorted(ai_times)
p95 = sorted_times[int(0.95 * len(sorted_times)) - 1]

# show ai endpoint results
print("-----------------------")
print(f"Title: AI Planner")
print(f"Initial request latency: {initial_request_time:.2f} ms")
print(f"Median latency: {median_time:.2f} ms")
print(f"P95 latency: {p95:.2f} ms")





