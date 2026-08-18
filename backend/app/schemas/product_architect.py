from typing import Literal

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


class ProductLogoRequest(BaseModel):
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

    style: Literal[
        "default",
        "modern",
        "minimalist",
        "bold",
        "playful",
        "luxury",
        "futuristic",
    ] = "default"

    preferred_colors: str = Field(
        default="",
        max_length=200,
    )

    logo_ideas: str = Field(
        default="",
        max_length=300,
    )

    branding_direction: str = Field(
        default="",
        max_length=500,
    )


class ProductLogoResponse(BaseModel):
    image_base64: str