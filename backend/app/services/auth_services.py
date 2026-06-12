from fastapi import Depends
from dotenv import load_dotenv
from sqlalchemy.orm import Session
from app.security import hash_password, verify_and_update_password
from app.models.user_model import User
from app.schemas.user import UserCreate, UserLogin
from app.database import get_db

load_dotenv()

def create_user(user: UserCreate, db: Session = Depends(get_db)):
    normalised_email = user.email.lower().strip()
    existing_user = db.query(User).filter(
        User.email == normalised_email
        ).first()

    if existing_user:
        raise ValueError(
            "This email is already registered. Please log in or use a different email."
        )

    hashed_password = hash_password(user.password)

    new_user = User(
        email=normalised_email,
        password_hash=hashed_password,
        display_name=user.display_name.strip(),
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return new_user


def authenticate_user(user: UserLogin, db: Session = Depends(get_db)):
    normalised_email = user.email.lower().strip()
    existing_user = db.query(User).filter(
        User.email == normalised_email
        ).first()

    if existing_user is None:
        raise ValueError(
            "Incorrect email or password. Please try again."
            )

    verified, update = verify_and_update_password(user.password, existing_user.password_hash)

    if not verified:
        raise ValueError(
            "Incorrect email or password. Please try again."
            )

    if update:
        existing_user.password_hash = update
        db.commit()

    return {"message": "Login Successful."}

