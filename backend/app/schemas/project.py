from pydantic import BaseModel


class ProjectCreate(BaseModel):
    title: str
    description: str | None = None
    workspace_id: int


class ProjectUpdate(BaseModel):
    title: str | None = None
    description: str | None = None


class ProjectResponse(BaseModel):
    id: int
    title: str
    description: str | None = None
    workspace_id: int
    owner_id: int

    class Config:
        from_attributes = True