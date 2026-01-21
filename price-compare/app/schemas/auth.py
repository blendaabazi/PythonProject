from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class RegisterRequest(BaseModel):
    email: str = Field(min_length=3, max_length=254)
    password: str = Field(min_length=8, max_length=128)
    name: Optional[str] = Field(default=None, max_length=120)


class LoginRequest(BaseModel):
    email: str = Field(min_length=3, max_length=254)
    password: str = Field(min_length=8, max_length=128)


class UserResponse(BaseModel):
    id: str
    email: str
    name: Optional[str] = None
    role: str
    created_at: datetime


class UpdateProfileRequest(BaseModel):
    current_email: str = Field(min_length=3, max_length=254)
    email: str = Field(min_length=3, max_length=254)
    name: Optional[str] = Field(default=None, max_length=120)
    current_password: str = Field(min_length=8, max_length=128)
    new_password: Optional[str] = Field(default=None, min_length=8, max_length=128)


class ForgotPasswordRequest(BaseModel):
    email: str = Field(min_length=3, max_length=254)


class ResetPasswordRequest(BaseModel):
    token: str = Field(min_length=10, max_length=512)
    new_password: str = Field(min_length=8, max_length=128)
