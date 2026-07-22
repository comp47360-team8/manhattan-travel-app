from app.repositories.ai_repository import (
    save_message, load_chat_history, update_summary,
    load_chat_summary, get_last_message
    )
from app.core.constants import USER, ASSISTANT
from app.services.poi_service import get_all_pois
from app.services.trip_service import fuzzy_search, get_trip_details
from app.repositories.trip_repository import update_trip
from app.services.ai.selector import LLMSelector
from app.core.config import settings

provider = LLMSelector.create(settings.AI_PROVIDER)

def chat(conversation_id, prompt, db, user):
    save_message(prompt, USER, conversation_id, db, user)

    last_message = get_last_message(conversation_id, db, user)
    trip_details = get_trip_details(conversation_id, db)
    
    extracted = provider.extract_trip_parameters(prompt, last_message, trip_details)
   
    pois = get_all_pois(db)
    excluded_pois = fuzzy_search(extracted.excluded_pois, pois)

    update_trip(conversation_id, extracted, excluded_pois, db, user)

    trip_details = get_trip_details(conversation_id, db)
    history = load_chat_history(conversation_id, db, user)
    summary = load_chat_summary(conversation_id, db, user)

    chat_response = provider.generate_chat_response(history, summary, trip_details, conversation_id, db, user)

    if chat_response.save_to_history:
        save_message(chat_response.message, ASSISTANT, conversation_id, db, user)
        
    if len(history) >= 10:
        update_summary(conversation_id, history, db, user)

    return chat_response
