from dataclasses import dataclass
from app.services.poi_service import get_all_pois


# |-----ITINERARY-----|


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



# |-----AI-----|


USER = "user"
ASSISTANT = "assistant"
SYSTEM = "system"

POI_TYPE_OPTIONS = [
    {
        "label": "Museums",
        "value": "museum"
    },
    {
        "label": "Parks",
        "value": "park"
    },
    {
        "label": "Landmarks",
        "value": "landmark"
    },
    {
        "label": "Markets",
        "value": "market"
    },
    {
        "label": "Viewpoints",
        "value": "viewpoint"
    },
    {
        "label": "Galleries",
        "value": "gallery"
    },
    {
        "label": "Neighborhood",
        "value": "neighborhood"
    },
    {
        "label": "Other",
        "value": "other"
    }
]

SYSTEM_PROMPT = """
You are a travel assistant for Offpeak, a Manhattan NYC itinerary app. 
To begin, introduce yourself and explain what you do.
Refer to the user by their name.
Help users plan their trip.
Ask for only these questions, one at a time:
- name of itinerary
- trip dates
- pace of days (relaxed or packed)
- any preferred types of POI's
- types of POIs and specific POIs they dont want to visit
Keep answers short, concise and friendly.
When you need the user to choose preferred POI types or excluded POI types:
- Do not ask the user to type the answer.
- Return a UI action:
- component: poi_type_selector
The available values will be provided by the backend.
Only request this when the user has not already provided.
Once all parameters are recieved, ask the user if you may generate the itinerary.
Only proceed to if they agree.
Always respond using this structure:
{
  "message": "...",
  "ui_action": null,
  "itinerary": null
}
"""

EXTRACTION_PROMPT = """
You are a travel information extractor. 
Extract trip planning parameters from the user's message.
Return only a JSON object matching the schema. Do not add explanation:
- name: name of itinerary
- start_date: start date of trip
- end_date: end date of trip
- pace: "relaxed", "packed", or null. If the user wants a moderate day, classify this as "relaxed".
- excluded_pois: list of POIs user does not want to visit.
- excluded_types: list of POI types the user does not want.
- preferences: list of POI types the user shows interest in.

If a field cannot be determined, return null for that field.
Dates must be in YYYY-MM-DD format.
If one date is given, this is both start and end date.
Both preferences and excluded_types must be extracted from the UI action, using these exact values:
- landmark | museum | viewpoint | market | park | gallery | neighborhood | other
"""

SUMMARY_PROMPT = """
You are summarizing a conversation for another AI assistant.
Create a concise summary (100 words MAX) that allows the conversation to continue naturally.
Include:
- Important facts the user mentioned.
- Questions that have already been answered.
- Outstanding questions that still need to be answered.
- Any context that would make future replies more natural.
Return plain text only.
"""

ITINERARY_PRESENTATION_PROMPT="""
You are giving a brief summary of the generated itinerary.

Include the name, number of days, number of POIs and 
list of the POI names of the itinerary.
Do not suggest anything.
"""

