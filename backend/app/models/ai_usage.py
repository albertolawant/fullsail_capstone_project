from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String

from app.db.database import Base


class AIUsage(Base):
    __tablename__ = "ai_usage"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False,
        index=True,
    )

    project_id = Column(
        Integer,
        ForeignKey("projects.id"),
        nullable=False,
        index=True,
    )

    feature_type = Column(
        String(100),
        nullable=False,
    )

    content_type = Column(
        String(100),
        nullable=False,
    )

    status = Column(
        String(30),
        nullable=False,
        default="success",
    )

    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )