import enum
import uuid
from app.database import Base
from sqlalchemy import BigInteger, String, Enum, Text, Double, CheckConstraint, ARRAY, Numeric, Integer, DateTime, Time, Boolean, text, func, ForeignKey
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship
from decimal import Decimal
from sqlalchemy.orm import Mapped, mapped_column
from datetime import datetime, time

class POIType(str, enum.Enum):
    landmark="landmark"
    museum = "museum"
    viewpoint = "viewpoint"
    market = "market"
    park = "park"
    gallery = "gallery"
    neighborhood = "neighborhood"
    other = "other"

class BusynessLevel(str, enum.Enum):
    quiet = "quiet"
    moderate = "moderate"
    busy = "busy"
    very_busy = "very_busy"

class POI(Base):
    __tablename__ = "poi"

    __table_args__ = (
        CheckConstraint("borough IN ('Manhattan','Brooklyn','Queens','Bronx','Staten Island')"),
        CheckConstraint("latitude  BETWEEN -90  AND 90"),
        CheckConstraint("longitude BETWEEN -180 AND 180"),
        CheckConstraint("google_review_star BETWEEN 0 AND 5"),
        CheckConstraint("google_review_count >= 0"), 
        CheckConstraint("recommended_duration_min > 0")
        )

    id: Mapped[int] = mapped_column(
        BigInteger, 
        primary_key=True,
        autoincrement=True)
    
    slug: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        nullable=False,
        index=True
    )

    name: Mapped[str] = mapped_column(
        String(255),
        nullable=False
    )

    type: Mapped[POIType] = mapped_column(
        Enum(POIType, name="poi_type"),
        nullable=False,
        index=True
    )

    summary: Mapped[str| None] = mapped_column(
        Text,
        nullable=True)

    description: Mapped[str| None] = mapped_column(
        Text,
        nullable=True)

    borough: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        index=True
    )

    neighborhood: Mapped[str| None] = mapped_column(
        String(255),
        nullable=True)

    address: Mapped[str| None] = mapped_column(
        Text,
        nullable=True)

    latitude: Mapped[float| None] = mapped_column(
        Double,
        nullable=True)

    longitude: Mapped[float| None] = mapped_column(
        Double,
        nullable=True)

    hero_image_url: Mapped[str | None] = mapped_column(
        String(2048),
        nullable=True)

    gallery_image_urls: Mapped[list[str]] = mapped_column(
        ARRAY(String),
        nullable=True,
        default=list)

    opening_hours: Mapped[dict | None] = mapped_column(
        JSONB,
        nullable=True
    )

    opening_hours_text: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True
    )

    google_place_id: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True
    )

    google_review_star: Mapped[float | None] = mapped_column(
        Numeric(2,1),
        nullable=True
    )

    google_review_count: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True
    )

    current_busyness: Mapped[BusynessLevel | None] = mapped_column(
        Enum(BusynessLevel, name = "busyness_level"),
        nullable=True
    )

    current_busyness_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True
    )

    best_time_start: Mapped[time | None] = mapped_column(
        Time,
        nullable=True
    )

    best_time_end: Mapped[time | None] = mapped_column(
        Time,
        nullable=True
    )

    best_time_label: Mapped[str | None] = mapped_column(
        Text,
        nullable=True
    )

    why_this_time: Mapped[str | None] = mapped_column(
        Text,
        nullable=True
    )

    accessibility_labels: Mapped[list[str]] = mapped_column(
        ARRAY(String),
        nullable=True,
        default=list
    )

    admission_fee: Mapped[Decimal | None] = mapped_column(
        Numeric(8,2),
        nullable=True
    )

    admission_text: Mapped[str | None] = mapped_column(
        Text,
        nullable=True
    )

    recommended_duration_min: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True
    )

    closest_subway: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True
    )

    map_embed_url: Mapped[str | None] = mapped_column(
        String(2048),
        nullable=True
    )

    map_external_url: Mapped[str | None] = mapped_column(
        String(2048),
        nullable=True
    )

    website_url: Mapped[str | None] = mapped_column(
        String(2048),
        nullable=True
    )

    phone: Mapped[str | None] = mapped_column(
        String(32),
        nullable=True
    )

    tags: Mapped[list[str]] = mapped_column(
        ARRAY(String),
        nullable=True,
        default=list
    )

    is_active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        server_default=text("true")
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now()
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        server_onupdate=func.now()
    )

    saved_by = relationship(
        "SavedPOI", 
        back_populates="poi",
        cascade="all, delete"
        )
    
class SavedPOI(Base):
    __tablename__ = "saved_pois"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID,
        ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True
    )

    poi_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("poi.id", ondelete="CASCADE"),
        primary_key=True
    )

    saved_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )

    poi = relationship("POI", back_populates="saved_by")



    