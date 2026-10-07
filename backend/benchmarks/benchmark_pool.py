import time
from concurrent.futures import ThreadPoolExecutor
from sqlalchemy.exc import TimeoutError
from app.database import engine
from sqlalchemy import text
import statistics

def one_request(_):
  try: 
    startS = time.perf_counter()
    with engine.connect() as conn:
      conn.execute(text("SELECT pg_sleep(10)"))
    return time.perf_counter() - startS
  except TimeoutError:
    return "Time out error"


start = time.perf_counter()

with ThreadPoolExecutor(max_workers=40) as executor:
  results = list(executor.map(one_request, range(40)))

totalTime = time.perf_counter() - start


times = [r for r in results if r != "Time out error"]
timeout = len(results) - len(times)
print("===================")
print("Median: {:.2f}".format(statistics.median(times)))
print("Total time spend: {:.2f}".format(totalTime))
print("P99: {:.2f}".format(statistics.quantiles(times, n=100)[98]))
print("Time out count: {}".format(timeout))




