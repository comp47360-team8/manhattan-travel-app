from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.schemas.user import UserResponse, UserCreate, UserLogin
from app.database import get_db
from app.services.auth_services import create_user, authenticate_user

router = APIRouter(prefix="/auth", tags=["authentication"])

@router.post("/signup", response_model=UserResponse)
def signup(user: UserCreate, db: Session = Depends(get_db)):
    try:
        return create_user(user, db)

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, 
            detail=str(e)
            )

@router.post("/login")
def login(user: UserLogin, db: Session = Depends(get_db)):
    try:
        return authenticate_user(user, db)

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e)
        )