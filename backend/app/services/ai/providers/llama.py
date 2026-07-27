import json
from openai import OpenAI, APIError, APITimeoutError, RateLimitError
from datetime import datetime
from zoneinfo import ZoneInfo
from app.models.ai_model import Message
from app.core.constants import USER, SYSTEM
from app.core.constants import SYSTEM_PROMPT, EXTRACTION_PROMPT, SUMMARY_PROMPT, POI_TYPE_OPTIONS, ITINERARY_SUMMARY_PROMPT
from app.schemas.ai import TripParameters, ChatResponse, UIOption
from app.models.ai_model import Trip
from app.services.itinerary.itinerary_service import auto_generate_itinerary
from app.services.trip_service import is_trip_ready
from app.services.ai.base import LLMProvider
from app.services.user_services import get_user_by_id
from app.core.config import settings
from app.core.exceptions import LLMUnresponsiveError

class LlamaProvider(LLMProvider):
    def __init__(self):
        self.client = OpenAI(
            api_key=settings.GROQ_API_KEY, 
            base_url="https://api.groq.com/openai/v1",
            timeout=15.0
            )
    
    
    def convert_for_llama(self, history: list[Message]):
        final_history = []
        for message in history:
            final_history.append({
                "role": message.role.value,
                "content":message.content
                })
        return final_history

    def generate_chat_response(self, history, summary, trip_details: Trip, conv_id, db, user):
        converted_history = self.convert_for_llama(history)

        user_profile = get_user_by_id(user, db)

        if is_trip_ready(trip_details):
            itinerary_json = auto_generate_itinerary(trip_details, conv_id, db, user)

            itinerary_details = {
                "trip_name": itinerary_json["trip_name"],
                "number_of_days": itinerary_json["stops"][-1]["day_number"],
                "number_of_pois": len(itinerary_json["stops"]),
                "pois": [stop["poi_name"] for stop in itinerary_json["stops"]]
                }
            
            instruction = f"""
            {ITINERARY_SUMMARY_PROMPT}

            itinerary details:
            {itinerary_details}

            User's name:
            {user_profile.display_name}

            User's accessibility:
            {user_profile.accessibility}

            Conversation summary:
            {summary}
            """
            messages = [
            {
                "role": SYSTEM,
                "content": instruction
            },
            *converted_history
            ]

            try:
                response = self.client.chat.completions.create(
                    model="llama-3.3-70b-versatile",
                    messages=messages,
                )
        
            except (APIError, APITimeoutError, RateLimitError) as e:
                raise LLMUnresponsiveError(e) from e
            
            return ChatResponse(
                message=response.choices[0].message.content,
                ui_action=None,
                itinerary=itinerary_json,
                save_to_history=True
            )

        system_instruction = f"""
        {SYSTEM_PROMPT}

        Today's date:
        {datetime.now(ZoneInfo("America/New_York"))}
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

        Return ONLY JSON matching the schema below where:
        - "message" is the message you generated.
        - "ui_action" is set as described earlier.
        - Do not include any text before or after the JSON - it goes into "message" in the schema above.
        - Do not use markdown.
        Schema:
        {{
        "message": "string",
        "ui_action": {{
            "component": "string",
            "field": "string",
            "selection": "multiple",
            "options": []
        }} | null
        }}
        - For every ui_action, options must always be an array of objects:
        [
            {{
                "label": "string",
                "value": "string"
            }}
        ]
        Never return options as an array of strings.

        - Use the summary and trip details as context.
        - Ask for missing trip details naturally.
        """
        messages = [
        {
            "role": SYSTEM,
            "content": system_instruction
        },
        *converted_history
        ]

        try:
            response = self.client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=messages,
                response_format={"type": "json_object"}
            )
    
        except (APIError, APITimeoutError, RateLimitError) as e:
            raise LLMUnresponsiveError(e) from e

        message = response.choices[0].message
        
        try:
            llama_response = ChatResponse.model_validate_json(message.content)
        except Exception as e:
            print("Failed to parse LLM JSON response")
            raise
        
        if llama_response.ui_action:
            if llama_response.ui_action.component == "poi_type_selector":
                llama_response.ui_action.options = [
                    UIOption(**option)
                    for option in POI_TYPE_OPTIONS[:-1]
                ]
        return llama_response

    def extract_trip_parameters(self, prompt, last_message, trip_details):
        system_instruction = f"""
        {EXTRACTION_PROMPT}

        Today's date:
        {datetime.now(ZoneInfo("America/New_York"))}
        Users cannot select a date in the past.

        Current trip details are:
        {trip_details}

        Last assistant message:
        {last_message}
        
        Use trip details and last messsage for context only.
        """
        try:
            response = self.client.chat.completions.create(
                model="llama-3.1-8b-instant",
                messages=[
                    {
                        "role": SYSTEM,
                        "content": system_instruction
                    },
                    {
                        "role": USER,
                        "content": prompt
                    }
                ],
                response_format={"type": "json_object"}
            )
        except (APIError, APITimeoutError, RateLimitError) as e:
            raise LLMUnresponsiveError(e) from e

        data = json.loads(response.choices[0].message.content)

        return TripParameters.model_validate(data)

    def create_summary(self, history):
        converted_history = self.convert_for_llama(history)

        formatted_history = "\n".join(
            f"{msg['role']}: {msg['content']}"
            for msg in converted_history
        )

        response = self.client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {
                    "role": SYSTEM,
                    "content": SUMMARY_PROMPT
                },
                {
                    "role": USER,
                    "content":formatted_history
                }
            ]
        )
        return response.choices[0].message.content
