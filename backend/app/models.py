import uuid
from sqlalchemy import String,DateTime, func
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base

class User(Base):
  __tablename__ = "users"

  id: Mapped[uuid.UUID] = mapped_column(
    UUID(as_uuid=True),
    primary_key=True, 
    default=uuid.uuid4)
  
  email: Mapped[str] = mapped_column(
    String(255), 
    unique=True, 
    nullable=False, 
    index=True)
  
  password_hash: Mapped[str] = mapped_column(
    String(255), 
    nullable=False)
  
  display_name: Mapped[str] = mapped_column(
    String(50), 
    nullable=False)
  
  created_at: Mapped[DateTime] = mapped_column(
    DateTime(timezone=True), 
    server_default=func.now(), 
    nullable=False)

