import json
from openai import OpenAI, APIError, APITimeoutError, RateLimitError
from datetime import date
from app.models.ai_model import Message
from app.core.constants import USER, SYSTEM
from app.core.constants import SYSTEM_PROMPT, EXTRACTION_PROMPT, SUMMARY_PROMPT, POI_TYPE_OPTIONS
from app.schemas.ai import TripParameters, ChatResponse, UIOption
from app.models.ai_model import Trip
from app.services.itinerary.itinerary_service import auto_generate_itinerary
from app.services.ai.base import LLMProvider
from app.services.user_services import get_user_by_id
from app.core.config import settings
from app.core.exceptions import LLMUnresponsiveError

tools = [
    {
        "type": "function",
        "function": {
            "name": "auto_generate_itinerary",
            "description": """
                Generate the user's itinerary when all required trip details have been collected.

                Call this only when you know:
                - itinerary name
                - trip dates
                - pace of days
                - POIs and POI types to be excluded
                - user POI type preferences
                """,
            "parameters": {
                "type": "object",
                "properties": {
                    
                },
                "required": [   
                ]
            }
        }
    }
]


class LlamaProvider(LLMProvider):
    def __init__(self):
        self.client = OpenAI(api_key=settings.GROQ_API_KEY, base_url="https://api.groq.com/openai/v1")
    
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

        If you are NOT calling a tool:
        - Return ONLY JSON matching this schema.
        - Do not include any text before or after the JSON.
        - Do not use markdown.
        Schema:
        {{
        "message": "string",
        "ui_action": {{
            "component": "string",
            "field": "string",
            "selection": "single|multiple",
            "options": []
        }} | null
        }}
    
        If you call the auto_generate_itinerary tool, ignore the JSON schema. 
        After receiving the tool result, write ONE friendly paragraph in plain text.

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
                tools=tools,
                tool_choice="auto",
            )
        except (APIError, APITimeoutError, RateLimitError) as e:
            raise LLMUnresponsiveError(e) from e

        message = response.choices[0].message

        if message.tool_calls:
            messages.append(message)
            for tool_call in message.tool_calls:
                if tool_call.function.name == "auto_generate_itinerary":

                    itinerary = auto_generate_itinerary(
                        trip=trip_details,
                        conv_id=conv_id,
                        db=db,
                        user=user
                    )

                    itinerary_summary = {
                        "trip_name": trip_details.name,
                        "number_of_days": itinerary["stops"][-1]["day_number"],
                        "number_of_pois": len(itinerary["stops"]),
                        "pois": [poi["poi_name"] for poi in itinerary["stops"]]
                    }

                    messages.append({
                        "role": "tool",
                        "tool_call_id": tool_call.id,
                        "content": json.dumps(itinerary_summary)
                    })

                    final_response = self.client.chat.completions.create(
                        model="llama-3.3-70b-versatile",
                        messages=messages
                    )

                    return ChatResponse(
                    message=final_response.choices[0].message.content,
                    ui_action=None,
                    itinerary=itinerary
                    )

        try:
            llama_response = ChatResponse.model_validate_json(
                message.content
            )
        except Exception:
            return ChatResponse(
                message=message.content,
                ui_action=None,
                itinerary=None
            )

        if llama_response.ui_action:
            if llama_response.ui_action.component == "poi_type_selector":
                llama_response.ui_action.options = [
                    UIOption(**option)
                    for option in POI_TYPE_OPTIONS
                ]
        return llama_response

    def extract_trip_parameters(self, prompt, last_message, trip_details):
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
            response = self.client.chat.completions.create(
                model="llama-3.3-70b-versatile",
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
                response_format={
                    "type": "json_object"
                }
            )
        except (APIError, APITimeoutError, RateLimitError) as e:
            raise LLMUnresponsiveError(e) from e

        data = json.loads(
            response.choices[0].message.content
        )
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
