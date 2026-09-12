from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text

from app.db.database import Base


class GeneratedContent(Base):
    __tablename__ = "generated_content"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    content_type = Column(String, nullable=False)
    body = Column(Text, nullable=False)
    project_id = Column(
        Integer,
        ForeignKey("projects.id"),
        nullable=True,
    )
    owner_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False,
    )
    created_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )