"""Database configuration, SQLAlchemy setup, and session management."""

from app.core.config import settings
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase

DATABASE_URL = settings.DATABASE_URL

engine = create_engine(DATABASE_URL)

SessionLocal = sessionmaker(
    autoflush=False,
    autocommit=False,
    bind=engine
)

class Base(DeclarativeBase):
    """Base class for all SQLAlchemy ORM models."""
    pass

def get_db():
    """
    Provide a database session for FastAPI dependencies.

    Creates a new session for each request and ensures it is
    closed after the request completes.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()