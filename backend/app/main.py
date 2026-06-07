from fastapi import FastAPI
from app.routers import health

# instantiate app
app = FastAPI()

# include routers 
app.include_router(health.router)

@app.get("/")
def root():
  return {"message":"API running"}







