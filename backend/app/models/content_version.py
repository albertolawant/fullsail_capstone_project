from sqlalchemy import Column, Integer, String, Text, ForeignKey

from app.db.database import Base


class ContentVersion(Base):
    __tablename__ = "content_versions"

    id = Column(Integer, primary_key=True, index=True)
    content_id = Column(Integer, ForeignKey("generated_content.id"), nullable=False)
    title = Column(String, nullable=False)
    content_type = Column(String, nullable=False)
    body = Column(Text, nullable=False)
    version_number = Column(Integer, nullable=False)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)