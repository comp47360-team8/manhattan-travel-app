"""Database operations for managing user authentication sessions."""

import uuid
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.models.user_model import UserSession
from app.core.security.tokens import create_refresh_token, decode_token
from app.core.security.passwords import hash_token

def get_session_by_sid(sid: str, db: Session):
    """Retrieve an authentication session by its session identifier."""

    session = db.execute(select(UserSession).where(UserSession.id == sid))
    return session.scalar_one_or_none()

def get_session_by_user(id: uuid, db: Session):
    """Retrieve authentication sessions associated with a user."""

    statement = select(UserSession).where(UserSession.user_id == id)
    result = db.execute(statement)
    return result

def create_session(subject: uuid, db: Session):
    """
    Create a new authentication session and generate a refresh token.

    The refresh token is hashed before being stored in the database.
    """

    session_id = str(uuid.uuid4())
    refresh_token = create_refresh_token(session_id)

    session = UserSession(
        id = session_id, 
        user_id = subject,
        refresh_token_hash = hash_token(refresh_token)
    )

    db.add(session)
    db.commit()
    db.refresh(session)

    return refresh_token

def rotate_session(sid: uuid, subject: uuid, db: Session):
    """
    Revoke an existing session and create a replacement refresh token.
    """
    old_session = get_session_by_sid(sid, db)
    old_session.revoked = True

    new_refresh_token = create_session(subject, db)

    return new_refresh_token

def revoke_session(token: str, db: Session):
    """
    Revoke an authentication session associated with a refresh token.
    """
    
    payload = decode_token(token)
    session = get_session_by_sid(payload.get("sid"), db)

    if session:
        session.revoked = True
        db.commit()
    





