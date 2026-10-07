import uuid
from app.core.config import settings
from datetime import datetime, timedelta, timezone
from jose import jwt
from jose.exceptions import ExpiredSignatureError, JWTError
from app.core.exceptions import AuthenticationError

SESSION_EXPIRED = "Your session has expired. Please log in again."
AUTH_REQUIRED = "Please log in again."

def create_access_token(user_id: uuid):
    payload = {
        "sub": str(user_id),
        "type": "access",
        "exp": datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    }
    token = jwt.encode(
        payload,
        settings.JWT_SECRET_KEY,
        algorithm=settings.ALGORITHM,
    )
    return token


def create_refresh_token(session_id: str):
    payload = {
        "sid": str(session_id),
        "type": "refresh",
        "exp": datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
    }
    token = jwt.encode(
        payload,
        settings.JWT_SECRET_KEY,
        algorithm=settings.ALGORITHM,
    )
    return token

def decode_token(token: str):
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=settings.ALGORITHM,
            )  
        return payload
    
    except ExpiredSignatureError:
        raise AuthenticationError(SESSION_EXPIRED)
    
    except JWTError:
        raise AuthenticationError(AUTH_REQUIRED)
