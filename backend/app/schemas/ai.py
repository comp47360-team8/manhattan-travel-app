from pydantic import BaseModel
from datetime import date
from typing import Literal

class ChatRequest(BaseModel):
    prompt: str | list

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

class UIOption(BaseModel):
    label: str
    value: str

class UIAction(BaseModel):
    component: Literal[
        "poi_type_selector",
    ]
    field: str
    selection: Literal[
        "multiple"
    ]
    options: list[UIOption]

class ChatResponse(BaseModel):
    message: str
    ui_action: UIAction | None = None
    itinerary: dict | None = None

class GeminiResponse(BaseModel):
    message: str
    ui_action: UIAction | None = None

