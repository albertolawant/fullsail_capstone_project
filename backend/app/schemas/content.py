from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class ContentCreate(BaseModel):
    project_id: Optional[int] = None
    title: str
    content_type: str
    body: str


class ContentUpdate(BaseModel):
    title: Optional[str] = None
    content_type: Optional[str] = None
    body: Optional[str] = None
    project_id: Optional[int] = None


class ContentResponse(BaseModel):
    id: int
    project_id: Optional[int] = None
    title: str
    content_type: str
    body: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True