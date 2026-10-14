from datetime import datetime

from pydantic import BaseModel, EmailStr


class ProjectMemberResponse(BaseModel):
    id: int
    user_id: int
    username: str
    email: EmailStr
    role: str
    created_at: datetime
    last_seen: datetime | None = None
    is_online: bool = False

    class Config:
        from_attributes = True


class ProjectMemberListResponse(BaseModel):
    owner_id: int
    owner_username: str
    owner_email: EmailStr
    owner_last_seen: datetime | None = None
    owner_is_online: bool = False
    current_user_role: str
    members: list[ProjectMemberResponse]

class ProjectMemberCreate(BaseModel):
    user_identifier: str
    role: str


class ProjectMemberRoleUpdate(BaseModel):
    role: str