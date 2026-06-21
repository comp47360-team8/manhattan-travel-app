from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.orm import Session
from app.schemas.user import UserResponse, UserCreate, UserLogin, UserLoginResponse
from app.schemas.auth import RefreshTokenRequest, LogoutRequest, RefreshTokenResponse, LogoutResponse
from app.database import get_db
from app.services.user_services import create_user
from app.services.auth_service import authenticate_user, refresh
from app.services.session_service import revoke_session
from app.core.exceptions import UserAlreadyExists, AuthenticationError

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/signup", response_model=UserResponse)
def signup(user: UserCreate, db: Session = Depends(get_db)):
    try:
        return create_user(user, db)

    except UserAlreadyExists as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, 
            detail=str(e)
            )
    
@router.post("/login", response_model=UserLoginResponse)
def login(data: UserLogin, db: Session = Depends(get_db), response: Response = None):
    try:
        tokens = authenticate_user(data.email, data.password, db)

        access_token = tokens["access_token"]
        refresh_token = tokens["refresh_token"]

        response.set_cookie(
            key="access_token",
            value=access_token,
            httponly=True,
            secure=True,
            samesite="lax"
        )

        response.set_cookie(
            key="refresh_token",
            value=refresh_token,
            httponly=True,
            secure=True,
            samesite="lax"
        )

        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
        }

    except AuthenticationError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e)
        )

@router.post("/refresh", response_model=RefreshTokenResponse)
def refresh_session(request: RefreshTokenRequest, db: Session = Depends(get_db)):
    try:
        return refresh(request.refresh_token, db)
    
    except AuthenticationError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Your session has expired. Please log in again."
        )
    
@router.post("/logout", response_model=LogoutResponse)
def logout(request: LogoutRequest, response: Response, db: Session = Depends(get_db)):
    try:
        revoke_session(request.refresh_token, db)
        response.delete_cookie("access_token")
        response.delete_cookie("refresh_token")

        return {"message": "Session ended."}
    
    except AuthenticationError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e)
        )
    
    except AuthenticationError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e)
        )


