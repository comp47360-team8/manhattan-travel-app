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
    pass

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()