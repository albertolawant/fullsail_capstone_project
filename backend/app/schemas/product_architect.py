from pydantic import BaseModel


class ProductArchitectRequest(BaseModel):
    project_id: int
    project_name: str
    description: str


class ProductArchitectResponse(BaseModel):
    id: int
    project_id: int
    title: str
    content_type: str
    body: str