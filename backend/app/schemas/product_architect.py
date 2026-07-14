from pydantic import BaseModel, Field


class ProductArchitectRequest(BaseModel):
    project_name: str = Field(
        ...,
        min_length=2,
        max_length=100,
    )
    description: str = Field(
        ...,
        min_length=10,
        max_length=5000,
    )


class ProductArchitectResponse(BaseModel):
    id: int
    project_id: int
    title: str
    content_type: str
    body: str