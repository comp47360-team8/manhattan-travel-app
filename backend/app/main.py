from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.routers import health, auth, pois, users, itinerary, ai

# instantiate app
app = FastAPI()

# connect React frontend origin(s) to FastAPI backend origin via CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# include routers
app.include_router(health.router)
app.include_router(auth.router)
app.include_router(pois.router)
app.include_router(users.router)
app.include_router(itinerary.router)
app.include_router(ai.router)

@app.get("/")
def root():
    return {"message": "API running"}
