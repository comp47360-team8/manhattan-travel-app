from sqlalchemy.orm import Session
from app.core.security.passwords import verify_password, verify_token
from app.core.security.tokens import create_access_token,decode_token
from app.core.exceptions import AuthenticationError
from app.services.user_services import get_user_by_email
from app.services.session_service import create_session, get_session_by_sid, rotate_session

INVALID_CREDENTIALS="Incorrect email or password. Please try again."
INVALID_TOKEN="Invalid or expired refresh token."


def authenticate_user(username: str, password: str, db: Session):
    existing_user = get_user_by_email(username, db)

    if existing_user is None:
        raise AuthenticationError(INVALID_CREDENTIALS)

    password_verified, hash_update = verify_password(
        password, 
        existing_user.password_hash
    )

    if not password_verified:
        raise AuthenticationError(INVALID_CREDENTIALS)

    if hash_update:
        existing_user.password_hash = hash_update
        db.commit()

    access_token = create_access_token(existing_user.id)
    refresh_token = create_session(existing_user.id, db)

    return {
        "access_token": access_token, 
        "refresh_token": refresh_token}


def refresh(refresh_token: str, db: Session):
    payload = decode_token(refresh_token)

    if payload.get("type") != "refresh":
        raise AuthenticationError(INVALID_TOKEN)

    existing_session = get_session_by_sid(payload["sid"], db)

    if (
        not existing_session
        or existing_session.revoked
        or not verify_token(refresh_token, existing_session.refresh_token_hash)
    ):
        raise AuthenticationError(INVALID_TOKEN)

    user_id = existing_session.user_id

    new_access_token = create_access_token(user_id)
    new_refresh_token = rotate_session(existing_session.id, user_id, db)

    return {"access_token": new_access_token, 
            "refresh_token": new_refresh_token}



