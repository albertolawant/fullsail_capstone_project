from datetime import datetime

from pydantic import BaseModel


class ProjectActivityResponse(BaseModel):
    id: int
    project_id: int
    user_id: int | None = None
    username: str | None = None
    action: str
    details: str | None = None
    created_at: datetime

    class Config:
        from_attributes = True