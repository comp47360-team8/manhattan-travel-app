from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from app.schemas.ai import ChatResponse, ChatRequest, ChatIDResponse
from app.dependencies.auth import authorise_access
from app.database import get_db
from app.repositories.ai_repository import (
    start_conversation, save_message, load_chat_history, get_conversation_by_id, update_summary,
    load_chat_summary
    )
from app.services.ai_service import generate_chat_response, extract_trip_parameters
from app.core.constants import USER, ASSISTANT
from app.repositories.poi_repository import get_all_pois
from app.services.itinerary.itinerary_service import auto_generate_itinerary
from app.services.trip_service import fuzzy_search, get_trip_details
from app.repositories.trip_repository import update_trip
from app.core.exceptions import ConversationNotFoundError

router = APIRouter(prefix="/api/ai", tags=["ai"])

@router.post("/conversations", response_model=ChatIDResponse)
def create_conversation(db: Session = Depends(get_db), user = Depends(authorise_access)):
    new_id = start_conversation(db, user)
    return ChatIDResponse(
        conversation_id=str(new_id)
    )

@router.post("/converstions/{conversation_id}/messages", response_model=ChatResponse)
def chat(conversation_id, request: ChatRequest, db: Session = Depends(get_db), user = Depends(authorise_access)):
    try:
        save_message(request.prompt, USER, conversation_id, db, user)

        extracted = extract_trip_parameters(request.prompt)

        pois = get_all_pois(db)
        excluded_pois = fuzzy_search(extracted.excluded_pois, pois)

        update_trip(conversation_id, extracted, excluded_pois, db, user)

        trip_details = get_trip_details(conversation_id, db)
        history = load_chat_history(conversation_id, db, user)
        summary = load_chat_summary(conversation_id, db, user)

        chat_response = generate_chat_response(history, summary, conversation_id, trip_details, db, user)
        
        save_message(chat_response["message"], ASSISTANT, conversation_id, db, user)
        
        print(f"length of history is: {len(history)}")
        if len(history) >= 10:
            update_summary(conversation_id, history, db, user)

        print(f"extraction response is: {extracted}")
        print(f"slugs to exclude are: {excluded_pois}")
        print(f"history: {history}")
        print(f"summary: {summary}")

        return chat_response
    
    except ConversationNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found."
        )
    
    except Exception:
        raise 

@router.post("/test/{conv_id}")
def testing(conv_id, db: Session = Depends(get_db), user = Depends(authorise_access)):
    conversation = get_conversation_by_id(conv_id, db, user)

    return auto_generate_itinerary(conversation.trip, conv_id, db, user)




    
