from dataclasses import dataclass

@dataclass
class TimeSlot:
    name: str
    start: int
    end: int

TIME_SLOTS = [
    TimeSlot("morning", 6, 12),
    TimeSlot("afternoon", 12, 18),
    TimeSlot("evening", 18, 24),
]

MAX_POIS_PER_SLOT = 2

MAX_POIS_PER_DAY = 5

