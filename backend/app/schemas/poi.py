from pydantic import BaseModel
from datetime import time

class POIDetailedResponse(BaseModel):
    slug: str

    name: str

    type: str

    address: str | None

    summary: str | None

    description: str | None

    borough: str

    neighborhood: str | None

    phone: str | None

    latitude: float | None

    longitude: float | None

    current_busyness: str 

    current_busyness_pct : int | None

    hero_image_url: str | None

    gallery_image_urls: list[str] | None

    opening_hours: dict | None

    opening_hours_text: str | None

    google_review_star: float | None

    google_review_count: int | None

    best_time_start: time | None

    best_time_end: time | None

    best_time_label: str | None

    why_this_time: str | None

    accessibility_labels: list[str] | None

    admission_fee: int | None

    admission_text: str | None

    recommended_duration_min: int | None

    closest_subway: str | None

    map_embed_url: str | None

    map_external_url: str | None

    website_url: str | None

    tags: list[str] | None

    model_config = {"from_attributes": True}

class HourlyBusynessResponse(BaseModel):
    hour_of_day: int
    busyness: float

class POIBusynessResponse(BaseModel):
    today: list[HourlyBusynessResponse]
    tomorrow: list[HourlyBusynessResponse]
    weekend: list[HourlyBusynessResponse]

class POISaveResponse(BaseModel):
    message: str

class POIUnsaveResponse(BaseModel):
    message: str