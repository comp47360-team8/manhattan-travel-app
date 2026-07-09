import uuid
from datetime import date, time, datetime
from app.database import Base
from sqlalchemy import ForeignKey, func, DateTime, String, BigInteger, Integer, Date, Time, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.schemas.itinerary import BusynessResponse

class SavedItinerary(Base):
    __tablename__ = "saved_itineraries"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), 
        primary_key=True,
        default=uuid.uuid4
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

    saved_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), 
        server_default=func.now(), 
        nullable=False
    )

    start_date: Mapped[date] = mapped_column(
        Date,
        nullable=False
    )

    end_date: Mapped[date] = mapped_column(
        Date,
        nullable=False
    )

    accessibility_requirements: Mapped[list] = mapped_column(
        JSONB,
        nullable=False,
        server_default="[]"
    )

    warning: Mapped[list[str] | None] = mapped_column(
        JSONB,
        nullable=True,
    )

    user = relationship(
        "User",
        back_populates="itineraries"
    )

    stops = relationship(
        "ItineraryStop",
        back_populates="itinerary",
        cascade="all, delete-orphan",
        order_by="ItineraryStop.position"
    )

class ItineraryStop(Base):
    __tablename__ = "itinerary_stops"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )

    itinerary_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("saved_itineraries.id", ondelete="CASCADE"),
        nullable=False
    )

    poi_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("poi.id", ondelete="CASCADE"),
        nullable=False
    )

    day_number: Mapped[int] = mapped_column(
        Integer,
        nullable=False
    )

    visit_date: Mapped[date] = mapped_column(
        Date,
        nullable=False
    )

    slot: Mapped[str] = mapped_column(
        String(20),
        nullable=False
    )

    slot_start: Mapped[time] = mapped_column(
        Time,
        nullable=False
    )

    slot_end: Mapped[time] = mapped_column(
        Time,
        nullable=False
    )

    position: Mapped[int] = mapped_column(
        Integer,
        nullable=False
    )

    crowd_level: Mapped[str] = mapped_column(
        String(20),
        nullable=False
    )

    flags: Mapped[list | None] = mapped_column(
        JSONB,
        nullable=True
    )

    busyness_for_day: Mapped[list[BusynessResponse]] = mapped_column(
        JSONB
    )

    hero_image_url: Mapped[str] = mapped_column(
        Text,
        nullable=False
    )

    itinerary = relationship(
        "SavedItinerary",
        back_populates="stops"
    )

    poi = relationship(
        "POI",
    )

