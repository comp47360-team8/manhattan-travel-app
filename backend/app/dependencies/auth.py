from fastapi import Depends, HTTPException, status, Header, Cookie
from app.core.security.tokens import decode_token
from app.core.exceptions import AuthenticationError

def get_access_token(authorization: str | None = Header(None), access_token: str | None = Cookie(None)):
    token = None

    # MOBILE 
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ")[1]
    
    # WEB
    elif access_token:
        token = access_token

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Access token missing."
        )
    return token

def authorise_access(token: str = Depends(get_access_token)):
    try:
        payload = decode_token(token)

    except AuthenticationError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e)
        )

    if payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authorised for this resource. Please log in first.",
        )
    
    return payload.get("sub")
