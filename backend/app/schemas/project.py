from pydantic import BaseModel, Field, field_validator


class ProjectCreate(BaseModel):
    title: str
    description: str | None = None
    workspace_id: int


class ProjectUpdate(BaseModel):
    title: str | None = Field(
        default=None,
        min_length=1,
        max_length=100
    )
    description: str | None = Field(
        default=None,
        max_length=500
    )

    @field_validator("title")
    @classmethod
    def validate_title(cls, value):
        if value is not None and not value.strip():
            raise ValueError("Project name cannot be blank")

        return value.strip() if value is not None else value

    @field_validator("description")
    @classmethod
    def clean_description(cls, value):
        return value.strip() if value is not None else value


class ProjectResponse(BaseModel):
    id: int
    title: str
    description: str | None = None
    workspace_id: int
    owner_id: int

    class Config:
        from_attributes = True