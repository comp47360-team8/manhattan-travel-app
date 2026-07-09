from pydantic import BaseModel
from datetime import date, time

class ItineraryRequest(BaseModel):
    trip_name: str
    trip_dates: list[date]
    pois: list
    accessibilty: list[str | None]

class BusynessResponse(BaseModel):
    hour_of_day: int
    busyness: int

class StopResponse(BaseModel):
    poi_id: int
    poi_name: str
    slug: str
    day_number: int
    visit_date: date
    slot: str
    slot_start: time
    slot_end: time
    position: int
    poi_type: str
    crowd_level: str
    hero_image_url: str
    borough: str
    neighborhood: str
    suggested_duration: str
    accessibility: list
    flags: list[str]
    busyness_for_day: list[BusynessResponse]
    hero_image_url: str

class ItineraryResponse(BaseModel):
    trip_name: str
    start_date: date
    end_date: date
    warning: str | None
    stops: list[StopResponse]

class ItinerarySaveResponse(BaseModel):
    message: str

class ItineraryUnsaveResponse(BaseModel):
    message: str

class ItinerarySavedResponse(BaseModel):
    itinerary_id: str
    trip_name: str
    trip_dates: str
    number_of_places: int
    hero_image_url: str
    


