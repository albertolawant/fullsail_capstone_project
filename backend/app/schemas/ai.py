from pydantic import BaseModel


class AIGenerateRequest(BaseModel):
    project_id: int
    title: str
    content_type: str
    prompt: str


class AIGenerateResponse(BaseModel):
    id: int
    project_id: int
    title: str
    content_type: str
    body: str