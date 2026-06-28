from sqlalchemy import Column, Integer, String, ForeignKey

from app.db.database import Base


class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(String, nullable=True)
    workspace_id = Column(Integer, ForeignKey("workspaces.id"), nullable=False)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)