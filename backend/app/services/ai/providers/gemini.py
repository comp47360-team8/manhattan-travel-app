import httpx
from google import genai
from google.genai import types
from google.genai.errors import APIError
from datetime import date, datetime, time
from app.services.ai.base import LLMProvider
from app.models.ai_model import Message
from app.core.constants import SYSTEM_PROMPT, EXTRACTION_PROMPT, SUMMARY_PROMPT, POI_TYPE_OPTIONS
from app.schemas.ai import TripParameters, ChatResponse, UIOption, GeminiResponse
from app.models.ai_model import Trip
from app.services.itinerary.itinerary_service import auto_generate_itinerary
from app.services.user_services import get_user_by_id
from app.core.config import settings
from app.core.exceptions import LLMUnresponsiveError

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

class GeminiProvider(LLMProvider):
    def __init__(self):
        self.client = genai.Client(api_key=settings.GEMINI_API_KEY)
    
    def convert_for_gemini(self, history: list[Message]):
        final_history = []
        for message in history:
            final_history.append({
                "role": message.role.value,
                "parts": [{
                    "text": message.content
                    }],
                })
        return final_history

    def generate_chat_response(self, history, summary, trip_details: Trip, conv_id, db, user):
        converted_history = self.convert_for_gemini(history)

        user_profile = get_user_by_id(user, db)

        system_instruction = f"""
        {SYSTEM_PROMPT}

        Today's date:
        {date.today()}
        Users cannot select a date in the past.
        If the user selects a date in the past without specifying the year,
        ask them to specify the year.
        If the user selects a day in the past, tell them that they cannot
        and must select today or a day in the future.
        Dates must be consecutive.

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
        try:
            response = self.client.models.generate_content(
                model="gemini-3.5-flash",
                contents=converted_history,
                config={
                    "system_instruction": system_instruction,
                    "tools": tools,
                    "response_schema": GeminiResponse
                }
            )
        except (APIError, httpx.HTTPError) as e:
            raise LLMUnresponsiveError(e) from e

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
                        "pois": [stop["poi_name"] for stop in itinerary_json["stops"]]  
                    }
                )

                final_response = self.client.models.generate_content(
                    model="gemini-3.5-flash",
                    contents=[
                        *converted_history,
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

    def extract_trip_parameters(self, prompt, last_message, trip_details) -> TripParameters:
        system_instruction = f"""
        {EXTRACTION_PROMPT}

        Today's date:
        {date.today()}
        Users cannot select a date in the past.

        Last message sent by the assistant:
        {last_message or "None"}
        Use it only to understand the context of the user's latest message.

        Current trip details are:
        {trip_details}
        Use this only for context.
        """
        try:
            response =  self.client.models.generate_content(
                model="gemini-3.5-flash",
                contents=prompt,
                config={
                    "system_instruction": system_instruction,
                    "response_schema": TripParameters
                }
            )
        except (APIError, httpx.HTTPError) as e:
            raise LLMUnresponsiveError(e) from e
        
        return response.parsed

    def create_summary(self, history):
        converted_history = self.convert_for_gemini(history)

        formatted_history = "\n".join(
        f"{msg['role'].capitalize()}: {msg['parts'][0]["text"]}"
        for msg in converted_history
        )
        
        try:
            response = self.client.models.generate_content(
                model="gemini-3.5-flash",
                contents=formatted_history,
                config={
                    "system_instruction": SUMMARY_PROMPT
                }
            )
        except (APIError, httpx.HTTPError) as e:
            raise LLMUnresponsiveError(e) from e
        
        return response.text


