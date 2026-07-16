from fastapi import APIRouter, Depends, HTTPException, status, Response, Cookie
from sqlalchemy.orm import Session
from app.schemas.user import UserResponse, UserCreate
from app.schemas.auth import (
  RefreshTokenRequest, LogoutRequest, MobileRefreshResponse, LogoutResponse, 
  UserLogin, MobileLoginResponse, WebLoginResponse, WebRefreshResponse
  )
from app.database import get_db
from app.services.user_services import create_user
from app.services.auth_service import authenticate_user, refresh_session
from app.services.session_service import revoke_session
from app.core.exceptions import UserAlreadyExists, AuthenticationError

router = APIRouter(prefix="/api/auth", tags=["auth"])

@router.post("/signup", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def signup(user: UserCreate, db: Session = Depends(get_db)):
    try:
        return create_user(user, db)

    except UserAlreadyExists as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, 
            detail=str(e)
            )
    
    
@router.post("/login", response_model=WebLoginResponse)
def login_for_web(data: UserLogin, db: Session = Depends(get_db), response: Response = None):
    try:
        login_response = authenticate_user(data.email, data.password, db)

        response.set_cookie(
            key="access_token",
            value=login_response["access_token"],
            httponly=True,
            secure=True,
            samesite="lax"
        )

        response.set_cookie(
            key="refresh_token",
            value=login_response["refresh_token"],
            httponly=True,
            secure=True,
            samesite="lax"
        )

        return WebLoginResponse(
            message="Login successful",
            display_name=login_response["display_name"],
            accessibility=login_response["accessibility"]
        )
    
    except AuthenticationError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e)
        )
    
    
@router.post("/mobile/login", response_model=MobileLoginResponse)
def login_for_mobile(data: UserLogin, db: Session = Depends(get_db)):
    try:
        login_response = authenticate_user(data.email, data.password, db)

        return MobileLoginResponse(
            access_token=login_response["access_token"],
            refresh_token=login_response["refresh_token"],
            display_name=login_response["display_name"],
            accessibility=login_response["accessibility"]
        )
    
    except AuthenticationError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e)
        )


@router.post("/refresh", response_model=WebRefreshResponse)
def refresh_session_for_web(response: Response, refresh_token: str | None = Cookie(None), db: Session = Depends(get_db)):
    try:
        if not refresh_token:
            raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authorised for this resource."
        )

        tokens = refresh_session(refresh_token, db)

        response.set_cookie(
            key="access_token",
            value=tokens["access_token"],
            httponly=True,
            secure=True,
            samesite="lax"
        )

        response.set_cookie(
            key="refresh_token",
            value=tokens["refresh_token"],
            httponly=True,
            secure=True,
            samesite="lax"
        )

        return WebRefreshResponse(
            message="Session refreshed successfully."
        )
    
    except AuthenticationError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Your session has expired. Please log in again."
        )


@router.post("/mobile/refresh", response_model=MobileRefreshResponse)
def refresh_session_for_mobile(request: RefreshTokenRequest, db: Session = Depends(get_db)):
    try:
        tokens = refresh_session(request.refresh_token, db)
        return MobileRefreshResponse(
            access_token=tokens["access_token"],
            refresh_token=tokens["refresh_token"]
        )
    
    except AuthenticationError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Your session has expired. Please log in again."
        )
    

@router.post("/logout", response_model=LogoutResponse)
def logout_for_web(response: Response, refresh_token: str | None = Cookie(None), db: Session = Depends(get_db)):
    try:
        if not refresh_token:
            return LogoutResponse(
                message="Session ended."
            )
        
        revoke_session(refresh_token, db)
        response.delete_cookie("access_token")
        response.delete_cookie("refresh_token")

        return LogoutResponse(
            message="Session ended."
        )
    
    except AuthenticationError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e)
        )

    
@router.post("/mobile/logout", response_model=LogoutResponse)
def logout_for_mobile(request: LogoutRequest, db: Session = Depends(get_db)):
    try:
        revoke_session(request.refresh_token, db)
        return LogoutResponse(
            message="Session ended."
        )

    except AuthenticationError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e)
        )


