from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import health
from app.routers import auth
from app.database import Base, engine
from app.models.user_model import User

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

@app.on_event("startup")
def startup():
    Base.metadata.create_all(bind=engine)

# include routers
app.include_router(health.router)
app.include_router(auth.router)

@app.get("/")
def root():
    return {"message": "API running"}
