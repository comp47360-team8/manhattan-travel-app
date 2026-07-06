from __future__ import annotations
import uuid
from datetime import datetime
from app.database import Base
from sqlalchemy import ForeignKey, func, DateTime, String
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

class SavedItineraries(Base):
    __tablename__ = "saved_itineraries"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), 
        primary_key=True, 
        )

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False
    )

    name: Mapped[str] = mapped_column(
        String, 
        nullable=False
        )

    itinerary: Mapped[dict] = mapped_column(
        JSONB,
        nullable=False
    )

    user = relationship(
        "User",
        back_populates="itineraries"
    )

    saved_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), 
        server_default=func.now(), 
        nullable=False
    )


