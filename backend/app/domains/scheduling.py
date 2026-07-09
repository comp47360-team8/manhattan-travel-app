from dataclasses import dataclass

@dataclass
class POIProfile:
    id: int
    slug: str
    availability: dict
    opening_days: int | None
    mode: str
    flags: list[str]
    
