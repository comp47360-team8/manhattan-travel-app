from dataclasses import dataclass

@dataclass
class POIProfile:
    id: int
    slug: str
    availability: dict
    locked_day: int | None
    mode: str
    flags: list[str]
    last_of_day: bool
    
