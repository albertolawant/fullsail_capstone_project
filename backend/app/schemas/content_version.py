from typing import Optional

from pydantic import BaseModel, Field


class ContentVersionCreate(BaseModel):
    body: Optional[str] = Field(default=None, min_length=1)
    regeneration_instructions: Optional[str] = Field(
        default=None,
        max_length=2500,
    )


class ContentVersionResponse(BaseModel):
    id: int
    content_id: int
    title: str
    content_type: str
    body: str
    version_number: int
    regeneration_instructions: Optional[str] = None
    owner_id: int

    class Config:
        from_attributes = True