import uuid
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.models.user_model import UserSession
from app.core.security.tokens import create_refresh_token, decode_token
from app.core.security.passwords import hash_token

def get_session_by_sid(sid: str, db: Session):
    session = db.execute(select(UserSession).where(UserSession.id == sid))
    return session.scalar_one_or_none()

def get_session_by_user(id: uuid, db: Session):
    statement = select(UserSession).where(UserSession.user_id == id)
    result = db.execute(statement)
    return result

def create_session(subject: uuid, db: Session):
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
    old_session = get_session_by_sid(sid, db)
    old_session.revoked = True

    new_refresh_token = create_session(subject, db) # commit occurs inside create_session()

    return new_refresh_token

def revoke_session(token: str, db: Session):
    payload = decode_token(token)
    session = get_session_by_sid(payload.get("sid"), db)

    if session:
        session.revoked = True
        db.commit()
    





