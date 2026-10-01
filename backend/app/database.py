"""Database configuration, SQLAlchemy setup, and session management."""

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.core.config import settings

DATABASE_URL = settings.DATABASE_URL

engine = create_engine(
    DATABASE_URL,
    pool_size = 10, 
    max_overflow = 10,
    # a request can't get a connections within 5s errors out instead of hanging for 30s
    pool_timeout = 5,
    # Neon closes idle connection; ping before checkout so we never hand out a dead one
    pool_pre_ping = True,
    )

SessionLocal = sessionmaker(
    autoflush=False,
    autocommit=False,
    bind=engine
)

class Base(DeclarativeBase):
    """Base class for all SQLAlchemy ORM models."""

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