from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User
from pydantic import BaseModel, EmailStr, field_validator, model_validator
from pydantic_core import PydanticCustomError

router = APIRouter(tags=["authentication"])

class SignupUser(BaseModel):
    email: EmailStr
    password: str
    confirm_password: str
    display_name: str

    @field_validator("password")
    @classmethod
    def password_length(cls, value):
        if len(value) < 6:
            raise PydanticCustomError(
                "password_too_short",
                "Password must be at least 6 characters long."
                )
        elif len(value) > 128:
            raise PydanticCustomError(
                "password_too_long",
                "Password must be at most 128 characters long."
            )
        return value
    
    @model_validator(mode="after")
    def check_passwords(self):
        if self.password != self.confirm_password:
            raise PydanticCustomError(
                "passwords_not_matching",
                "Passwords do not match"
            )
        return self

    @field_validator("display_name")
    @classmethod
    def empty_display_name(cls, value):
        if not value.strip():
            raise PydanticCustomError(
                "empty_display_name",
                "Display name cannot be blank.")
        return value
    
class LoginUser(BaseModel):
    email: EmailStr
    password: str

class ForgotPasswordUser(BaseModel):
    email: EmailStr

@router.post("/signup")
def signup(user: SignupUser, db: Session = Depends(get_db)):

    existing_user = db.query(User).filter(User.email == user.email).first()

    if existing_user:
        raise HTTPException(
            status_code=409,
            detail="This email is already registered. Please login or use a different email."
        )
    
    new_user = User(
        email=user.email, 
        password_hash=user.password, # Remenber To Do: implement hashing function for password instead of storing raw 
        display_name=user.display_name
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return {"message": "User created successfully"}

@router.post("/login")
def login(user: LoginUser, db: Session = Depends(get_db)):

    existing_user = db.query(User).filter(User.email == user.email).first()

    if existing_user and existing_user.password_hash == user.password:
        return {"message": "Login successful."} # Remember To Do: replace with actual functions later

    raise HTTPException(
        status_code=401,
        detail="Incorrect email or password. Please try again."
    )
    