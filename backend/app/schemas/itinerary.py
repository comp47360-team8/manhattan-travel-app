from pydantic import BaseModel
from datetime import date, time

class ItineraryRequest(BaseModel):
    trip_name: str
    trip_dates: list[date]
    pois: list
    accessibility: list[str | None]

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
    suggested_duration: int
    accessibility: list
    flags: list[str]
    busyness_for_day: list[BusynessResponse]
    hero_image_url: str

class ItineraryResponse(BaseModel):
    trip_name: str
    start_date: date
    end_date: date
    warning: str | None
    accessibility: list[str]
    warning: str | None
    stops: list[StopResponse]

class ItineraryUnsaveResponse(BaseModel):
    message: str

class ItinerarySummaryResponse(BaseModel):
    itinerary_id: str
    trip_name: str
    start_date: date
    end_date: date
    number_of_places: int
    hero_image_url: str | None

class ItinerarySavedStopsResponse(BaseModel):
    stop_id: str
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
    suggested_duration: int
    accessibility: list[str] | None
    flags: list[str]
    busyness_for_day: list[BusynessResponse]

class ItinerarySavedResponse(BaseModel):
    itinerary_id: str
    trip_name: str
    start_date: date
    end_date: date
    warning: str | None
    stops: list[ItinerarySavedStopsResponse]

class AddStopRequest(BaseModel):
    slug: str


