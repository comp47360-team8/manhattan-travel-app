import os
import json
from dotenv import load_dotenv
from openai import OpenAI
from app.models.ai_model import Message
from app.core.constants import USER, SYSTEM
from app.core.constants import SYSTEM_PROMPT, EXTRACTION_PROMPT, SUMMARY_PROMPT
from app.schemas.ai import TripParameters
from app.models.ai_model import Trip
from app.services.itinerary.itinerary_service import auto_generate_itinerary

load_dotenv()

client = OpenAI(api_key=os.getenv("GROQ_API_KEY"), base_url="https://api.groq.com/openai/v1")

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

def convert_for_ai(history: list[Message]):
    final_history = []
    for message in history:
        final_history.append({
            "role": message.role.value,
            "content":message.content
            })
    return final_history

def generate_chat_response(history, summary, conv_id, trip_details: Trip, db, user):
    prompt = f"""
You are helping a user plan a trip.
Previous conversation summary: {summary}
Current trip details: {trip_details}

Use the summary and trip details as context.
Ask the user for missing details naturally.

When a tool returns an itinerary summary, explain the summary clearly to the user.
Do not mention tools or internal processes.
"""
    messages = [
    {
        "role": SYSTEM,
        "content": SYSTEM_PROMPT 
    },
    {
        "role": SYSTEM,
        "content": prompt
    },
    *history
    ]
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=messages,
        tools=tools,
        tool_choice="auto"
    )

    message = response.choices[0].message
    print(f"message : {message}")

    if message.tool_calls:
        messages.append(message)
        for tool_call in message.tool_calls:
            if tool_call.function.name == "auto_generate_itinerary":

                args = json.loads(
                    tool_call.function.arguments
                )
                itinerary = auto_generate_itinerary(
                    trip=trip_details,
                    conv_id=conv_id,
                    db=db,
                    user=user
                )

                itinerary_summary = {
                    "itinerary_name": trip_details.name,
                    "number_of_days": itinerary["stops"][-1]["day_number"],
                    "number_of_pois": len(itinerary["stops"]),
                    "pois": [poi["poi_name"] for poi in itinerary["stops"]]
                }

                messages.append({
                    "role": "tool",
                    "tool_call_id": tool_call.id,
                    "content": json.dumps(itinerary_summary)
                })

                final_response = client.chat.completions.create(
                    model="llama-3.3-70b-versatile",
                    messages=messages
                )

                return {
                "message": final_response.choices[0].message.content,
                "itinerary": itinerary
            }

    return {
        "message": message.content,
        "itinerary": None
        }

def extract_trip_parameters(prompt):
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {
                "role": SYSTEM,
                "content": EXTRACTION_PROMPT
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
    data = json.loads(
        response.choices[0].message.content
    )
    return TripParameters.model_validate(data)

def create_summary(history):
    formatted_history = "\n".join(
        f"{msg['role']}: {msg['content']}"
        for msg in history
    )

    response = client.chat.completions.create(
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






