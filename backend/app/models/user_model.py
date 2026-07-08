import uuid
from sqlalchemy import String, DateTime, Boolean, func, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime, timezone, timedelta
from app.database import Base

class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )

    email: Mapped[str] = mapped_column(
        String(255), unique=True, nullable=False, index=True
    )

    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)

    display_name: Mapped[str] = mapped_column(String(50), nullable=False)

    created_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    sessions = relationship(
        "UserSession", 
        back_populates="user", 
        cascade="all, delete"
        )

    itineraries =  relationship(
        "SavedItineraries",
        back_populates="user",
        cascade="all, delete-orphan"
    )

class UserSession(Base):
    __tablename__ = "user_sessions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        default=uuid.uuid4,
    )

    refresh_token_hash: Mapped[Text] = mapped_column(
        Text,
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc) + timedelta(days=30),
        nullable=False,
    )

    revoked: Mapped[bool] = mapped_column(Boolean, default=False)

    user = relationship("User", back_populates="sessions")
