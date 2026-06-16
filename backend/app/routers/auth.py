from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.schemas.user import UserResponse, UserCreate
from app.database import get_db
from app.services.user_services import create_user
from app.services.auth_services import authenticate_user, refresh
from app.services.session_service import revoke_session
from app.dependencies.auth import authorise_access
from app.core.exceptions import UserAlreadyExists, AuthenticationError

router = APIRouter(prefix="/auth", tags=["authentication"])

@router.post("/signup", response_model=UserResponse)
def signup(user: UserCreate, db: Session = Depends(get_db)):
    try:
        return create_user(user, db)

    except UserAlreadyExists as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, 
            detail=str(e)
            )

@router.post("/login")
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    try:
        return authenticate_user(form_data.username, form_data.password, db)
 
    except AuthenticationError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e)
        )

@router.post("/refresh")
def refresh_session(refresh_token: str, db: Session = Depends(get_db)):
    try:
        return refresh(refresh_token, db)
    except AuthenticationError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Your session has expired. Please log in again."
        )
    
@router.post("/logout")
def logout(refresh_token: str, db: Session = Depends(get_db)):
    revoke_session(refresh_token, db)
    return {"message": "Session ended."}
