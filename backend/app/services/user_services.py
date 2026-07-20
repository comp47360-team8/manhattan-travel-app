from sqlalchemy import select
from sqlalchemy.orm import Session
from app.schemas.user import UserCreate
from app.models.user_model import User
from app.core.security.passwords import hash_password
from app.core.exceptions import UserAlreadyExists

def get_user_by_email(email: str, db: Session):
    normalised_email = email.lower().strip()
    result = db.execute(select(User).where(User.email == normalised_email))
    return result.scalar_one_or_none()

def get_user_by_id(user_id, db: Session):
    statement = select(User).where(
        User.id == user_id
    )
    return db.execute(statement).scalar_one_or_none()

def create_user(user: UserCreate, db: Session):
    existing_user = get_user_by_email(user.email, db)

    if existing_user:
        raise UserAlreadyExists(
            "This email is already registered. Please log in or use a different email."
            )

    new_user = User(
        email=user.email.lower().strip(),
        password_hash=hash_password(user.password),
        display_name=user.display_name.strip(),
        accessibility=user.accessibility
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return new_user
