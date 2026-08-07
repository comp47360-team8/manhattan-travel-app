"""Domain objects used by the itinerary scheduling engine"""

from dataclasses import dataclass

@dataclass
class POIProfile:
    """Stores the scheduling data required for a point of interest"""

    id: int
    slug: str
    availability: dict
    opening_days: int | None
    mode: str
    flags: list[str]
    
