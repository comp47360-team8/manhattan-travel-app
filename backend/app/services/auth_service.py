from sqlalchemy.orm import Session
from app.core.security.passwords import verify_password, verify_token
from app.core.security.tokens import create_access_token,decode_token
from app.core.exceptions import AuthenticationError
from app.services.user_services import get_user_by_email
from app.services.session_service import create_session, get_session_by_sid, rotate_session

INVALID_CREDENTIALS="Incorrect email or password. Please try again."
INVALID_TOKEN="Invalid or expired refresh token."


def authenticate_user(email: str, password: str, db: Session):
    """
    Authenticate a user and create access and refresh tokens.

    Verifies the supplied credentials and, when successful, creates a new
    refresh-token session and returns the authentication tokens and user
    information.

    Args:
        email: User's email address.
        password: User's plaintext password.
        db: Database session.

    Returns:
        A dictionary containing access and refresh tokens and basic user data.

    Raises:
        AuthenticationError: If the email or password is incorrect.
    """
    existing_user = get_user_by_email(email, db)

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
        "refresh_token": refresh_token,
        "display_name": existing_user.display_name,
        "accessibility": existing_user.accessibility
        }

def refresh_session(refresh_token: str, db: Session):
    """
    Refresh a user's access and refresh tokens.

    Validates the supplied refresh token and associated session before
    rotating the session and issuing a new pair of tokens.

    Args:
        refresh_token: The user's current refresh token.
        db: Database session.

    Returns:
        A dictionary containing a new access token and refresh token.

    Raises:
        AuthenticationError: If the refresh token is invalid, expired,
            revoked, or is not a refresh token.
    """
    payload = decode_token(refresh_token)

    if payload.get("type") != "refresh":
        raise AuthenticationError(INVALID_TOKEN)

    existing_session = get_session_by_sid(payload.get("sid"), db)

    if (
        not existing_session
        or existing_session.revoked
        or not verify_token(refresh_token, existing_session.refresh_token_hash)
    ):
        raise AuthenticationError(INVALID_TOKEN)

    user_id = existing_session.user_id

    new_access_token = create_access_token(user_id)
    new_refresh_token = rotate_session(existing_session.id, user_id, db)

    return {
        "access_token": new_access_token,
        "refresh_token": new_refresh_token
    }



