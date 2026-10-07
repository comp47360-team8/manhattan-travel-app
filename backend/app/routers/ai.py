from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.schemas.ai import ChatResponse, ChatRequest, ChatIDResponse
from app.dependencies.auth import authorise_access
from app.database import get_db
from app.services.ai.ai_service import chat
from app.repositories.ai_repository import start_conversation
from app.core.exceptions import ConversationNotFoundError

router = APIRouter(prefix="/api/ai", tags=["ai"])

@router.post("/conversations", response_model=ChatIDResponse)
def create_conversation(db: Session = Depends(get_db), user = Depends(authorise_access)):
    new_id = start_conversation(db, user)
    return ChatIDResponse(
        conversation_id=str(new_id)
    )

@router.post("/converstions/{conversation_id}/messages", response_model=ChatResponse)
def conversation(conversation_id, request: ChatRequest, db: Session = Depends(get_db), user = Depends(authorise_access)):
    try:
        return chat(conversation_id, request.prompt, db, user)
    
    except ConversationNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found."
        )
    
    except Exception as e:
        print(f"Conversation endpoint failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Something unexpected went wrong. Please try again."
        )


    
