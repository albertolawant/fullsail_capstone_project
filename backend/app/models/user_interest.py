from sqlalchemy import Column, ForeignKey, Integer, JSON
from sqlalchemy.orm import relationship

from app.db.database import Base


class UserInterest(Base):
    __tablename__ = "user_interests"

    id = Column(Integer, primary_key=True, index=True)

    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
        index=True,
    )

    selected_modules = Column(
        JSON,
        nullable=False,
        default=list,
    )

    user = relationship("User")