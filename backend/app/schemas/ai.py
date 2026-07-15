from pydantic import BaseModel
from datetime import date

class ChatRequest(BaseModel):
    prompt: str

class ChatResponse(BaseModel):
    message: str
    itinerary: dict | None = None

class ChatIDResponse(BaseModel):
    conversation_id: str

class TripParameters(BaseModel):
    name: str | None = None
    start_date: date | None = None
    end_date: date | None = None
    pace: str | None = None
    excluded_pois: list[str] | None = None
    excluded_types: list[str] | None = None
    preferences: list[str] | None = None
