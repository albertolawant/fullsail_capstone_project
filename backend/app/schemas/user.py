import re
from typing import Dict, List

from pydantic import BaseModel, EmailStr, Field, field_validator


ALLOWED_MODULE_IDS = {
    "product-architect",
    "tabletop-creator",
    "problem-solver",
    "learning-studio",
}


class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: int
    username: str
    email: EmailStr
    is_active: bool

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str


class UserUpdate(BaseModel):
    username: str
    email: EmailStr


class EmailUpdate(BaseModel):
    new_email: EmailStr


class EmailUpdateResponse(BaseModel):
    email: EmailStr
    access_token: str
    token_type: str


class PasswordUpdate(BaseModel):
    current_password: str
    new_password: str


class UserProfileUpdateResponse(BaseModel):
    id: int
    username: str
    email: EmailStr
    is_active: bool
    access_token: str
    token_type: str

    class Config:
        from_attributes = True


class UserInterestUpdate(BaseModel):
    selected_modules: List[str]


class UserInterestResponse(BaseModel):
    completed: bool
    selected_modules: List[str]


class UserModuleColorsUpdate(BaseModel):

    module_colors: Dict[str, str] = Field(..., max_length=4)

    @field_validator("module_colors", mode="before")
    @classmethod
    def validate_module_colors(cls, value):
        if not isinstance(value, dict):
            raise ValueError("Module colors must be an object.")

        if len(value) > len(ALLOWED_MODULE_IDS):
            raise ValueError("Too many module colors were provided.")

        validated_colors = {}

        for module_id, color in value.items():
            if module_id not in ALLOWED_MODULE_IDS:
                raise ValueError(
                    f"Unknown module: {module_id}"
                )

            if not isinstance(color, str):
                raise ValueError(
                    f"Color for {module_id} must be a string."
                )

            cleaned_color = color.strip()

            if not re.fullmatch(r"#[0-9a-fA-F]{6}", cleaned_color):
                raise ValueError(
                    f"Color for {module_id} must use "
                    "six-digit hex format, such as #06b6d4."
                )

            validated_colors[module_id] = cleaned_color.lower()

        return validated_colors


class UserModuleColorsResponse(BaseModel):
    user_id: int
    module_colors: Dict[str, str]