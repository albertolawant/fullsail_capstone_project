from pydantic import BaseModel
from typing import Optional


class ContentCreate(BaseModel):
    project_id: int
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

    class Config:
        from_attributes = True