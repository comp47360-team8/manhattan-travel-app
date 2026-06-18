from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import health, auth, poi, saved_pois

# instantiate app
app = FastAPI()

# connect React frontend origin to FastAPI backend origin via CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# include routers
app.include_router(health.router)
app.include_router(auth.router)
app.include_router(poi.router)
app.include_router(saved_pois.router)

@app.get("/")
def root():
    return {"message": "API running"}
