from pydantic import BaseModel


class ContentVersionResponse(BaseModel):
    id: int
    content_id: int
    title: str
    content_type: str
    body: str
    version_number: int
    owner_id: int

    class Config:
        from_attributes = True