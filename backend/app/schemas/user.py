from pydantic import BaseModel, EmailStr


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