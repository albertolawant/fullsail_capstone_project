from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text

from app.db.database import Base


class ProductLogo(Base):
    __tablename__ = "product_logos"

    id = Column(Integer, primary_key=True, index=True)

    project_id = Column(
        Integer,
        ForeignKey("projects.id"),
        nullable=True,
        index=True,
    )

    owner_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False,
        index=True,
    )

    image_base64 = Column(
        Text,
        nullable=False,
    )

    style = Column(
        String,
        nullable=False,
        default="default",
    )

    preferred_colors = Column(
        String,
        nullable=False,
        default="",
    )

    logo_ideas = Column(
        String,
        nullable=False,
        default="",
    )

    branding_direction = Column(
        String,
        nullable=False,
        default="",
    )

    created_at = Column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
    )