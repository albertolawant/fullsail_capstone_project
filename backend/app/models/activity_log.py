from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text

from app.db.database import Base


class ActivityLog(Base):
    __tablename__ = "activity_logs"

    id = Column(Integer, primary_key=True, index=True)

    owner_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False,
        index=True,
    )

    action_type = Column(String, nullable=False)
    item_type = Column(String, nullable=False)
    item_id = Column(Integer, nullable=True)

    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)

    project_id = Column(Integer, nullable=True)
    project_name = Column(String, nullable=True)

    old_project_id = Column(Integer, nullable=True)
    old_project_name = Column(String, nullable=True)

    new_project_id = Column(Integer, nullable=True)
    new_project_name = Column(String, nullable=True)

    created_at = Column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
    )