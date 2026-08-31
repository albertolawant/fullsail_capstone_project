from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class ActivityLogCreate(BaseModel):
    action_type: str
    item_type: str
    item_id: Optional[int] = None

    title: str
    description: Optional[str] = None

    project_id: Optional[int] = None
    project_name: Optional[str] = None

    old_project_id: Optional[int] = None
    old_project_name: Optional[str] = None

    new_project_id: Optional[int] = None
    new_project_name: Optional[str] = None


class ActivityLogResponse(BaseModel):
    id: int
    owner_id: int

    action_type: str
    item_type: str
    item_id: Optional[int] = None

    title: str
    description: Optional[str] = None

    project_id: Optional[int] = None
    project_name: Optional[str] = None

    old_project_id: Optional[int] = None
    old_project_name: Optional[str] = None

    new_project_id: Optional[int] = None
    new_project_name: Optional[str] = None

    created_at: datetime

    class Config:
        from_attributes = True