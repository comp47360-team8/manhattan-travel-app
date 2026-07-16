import os
from dotenv import load_dotenv
from google import genai
from google.genai import types
from datetime import date, datetime, time
from app.models.ai_model import Message
from app.core.constants import SYSTEM_PROMPT, EXTRACTION_PROMPT, SUMMARY_PROMPT, POI_TYPE_OPTIONS
from app.schemas.ai import TripParameters, ChatResponse, UIOption, GeminiResponse
from app.models.ai_model import Trip
from app.services.itinerary.itinerary_service import auto_generate_itinerary
from app.services.user_services import get_user_by_id

load_dotenv()

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

tools = [
    types.Tool(
        function_declarations=[
            types.FunctionDeclaration(
                name="auto_generate_itinerary",
                description="""
                            Generate the user's itinerary when all required trip details have been collected.
                            Call this only when you know:
                            - itinerary name
                            - trip dates
                            - pace of days
                            - POIs and POI types to be excluded
                            - user POI type preferences
                            """,
                parameters=types.Schema(
                    type="OBJECT",
                    properties={},
                    required=[]
                )
            )
        ]
    )
]

def convert_for_ai(history: list[Message]):
    final_history = []
    for message in history:
        final_history.append({
            "role": message.role.value,
            "parts": [{
                "text": message.content
                }],
            })
    return final_history

def generate_chat_response(history, summary, trip_details: Trip, conv_id, db, user):
    user_profile = get_user_by_id(user, db)

    system_instruction = f"""
    {SYSTEM_PROMPT}

    User's name:
    {user_profile.display_name}

    User's accessibility:
    {user_profile.accessibility}

    Conversation summary:
    {summary}

    Current trip details:
    {trip_details}

    - Use the summary and trip details as context.
    - Ask for missing trip details naturally.
    - Only generate an itinerary when all required details are available.
    The tool returs the itinerary details:
    - Write ONE friendly paragraph.   
    - Do not output JSON.
    - Do not output keys.
    - Do not output ui_action.
    - Describe some of the POIs but Do not list every POI generated
    - Return only plain text.
    - Only if a user has accessibility needs, tell them that their needs have been taken
    into account.
    """
    response = client.models.generate_content(
        model="gemini-3.5-flash",
        contents=history,
        config={
            "system_instruction": system_instruction,
            "tools": tools,
            "response_schema": GeminiResponse
        }
    )

    if response.function_calls:
        function_call = response.function_calls[0]
        if function_call.name == "auto_generate_itinerary":
            itinerary_json = auto_generate_itinerary(
                trip=trip_details,
                conv_id=conv_id,
                db=db,
                user=user
            )
            itinerary_json = make_json_serializable(itinerary_json)

            tool_response = types.Part.from_function_response(
                name="auto_generate_itinerary",
                response= {
                    "trip_name": itinerary_json["trip_name"],
                    "number_of_days": itinerary_json["stops"][-1]["day_number"],
                    "number_of_pois": len(itinerary_json["stops"]),
                    "some_pois": [stop["poi_name"] for stop in itinerary_json["stops"]]  
                }
            )

            final_response = client.models.generate_content(
                model="gemini-3.5-flash",
                contents=[
                    *history,
                    response.candidates[0].content,
                    types.Content(
                        role="tool",
                        parts=[
                            tool_response
                        ]
                    )
                ],
                config={
                    "system_instruction": system_instruction
                }
            )
            return ChatResponse(
                message=final_response.text,
                ui_action=None,
                itinerary=itinerary_json
            )
    
    gemini_response = response.parsed
    if gemini_response is None:
        return ChatResponse(
            message=response.text,
            ui_action=None,
            itinerary=None
        )
    if gemini_response.ui_action:
        if gemini_response.ui_action.component == "poi_type_selector":
            gemini_response.ui_action.options = [
                UIOption(**option)
                for option in POI_TYPE_OPTIONS
                ]
            
    return gemini_response

def extract_trip_parameters(prompt,last_message) -> TripParameters:
    system_instruction = f"""
    {EXTRACTION_PROMPT}

    Last message sent by the assistant:
    {last_message or "None"}
    Use it only to understand the context of the user's latest message.
    """
    response =  client.models.generate_content(
        model="gemini-3.5-flash",
        contents=prompt,
        config={
            "system_instruction": system_instruction,
            "response_schema": TripParameters
        }
    )
    return response.parsed

def create_summary(history):
    formatted_history = "\n".join(
    f"{msg['role'].capitalize()}: {msg['parts'][0]["text"]}"
    for msg in history
)

    response = client.models.generate_content(
        model="gemini-3.5-flash",
        contents=formatted_history,
        config={
            "system_instruction": SUMMARY_PROMPT
        }
    )
    return response.text

def make_json_serializable(obj):
    if isinstance(obj, (date, datetime, time)):
        return obj.isoformat()

    if isinstance(obj, dict):
        return {
            key: make_json_serializable(value)
            for key, value in obj.items()
        }

    if isinstance(obj, list):
        return [
            make_json_serializable(item)
            for item in obj
        ]

    return obj






