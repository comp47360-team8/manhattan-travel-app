from pydantic import BaseModel
from datetime import date

class ItineraryRequest(BaseModel):
    trip_name: str
    trip_dates: list[date]
    pois: list
    accessibilty: list[str | None]

class BusynessResponse(BaseModel):
    hour_of_day: int
    busyness: int

class StopResponse(BaseModel):
    poi_name: str
    slug: str
    day_number: str
    dates: str
    slot: str
    slot_times: str
    poi_type: str
    crowd_level: str
    hero_image_url: str
    borough: str
    neighborhood: str
    suggested_duration: str
    accessibility: list
    flags: list[str]
    busyness_for_day: list[BusynessResponse]

class ItineraryResponse(BaseModel):
    itinerary_id: str
    trip_name: str
    trip_dates: str
    stops: list[StopResponse]

class SaveItineraryResponse(BaseModel):
    itinerary_id: str
    trip_name: str
    trip_dates: str
    number_of_places: int
    hero_image_url: str

class UnsaveItineraryResponse(BaseModel):
    message: str


