# app/schemas/user.py
from pydantic import BaseModel, EmailStr, Field, field_validator, RootModel
from datetime import datetime
from typing import Optional

class UserBase(BaseModel):
    username: str = Field(..., min_length=2, max_length=50)
    email: EmailStr
    name: str = Field(..., min_length=1, max_length=100)
    bio: Optional[str] = Field(None, max_length=200)
    phone: Optional[str] = Field(None, max_length=20)

class UserCreate(UserBase):
    password: str = Field(..., min_length=6, max_length=100)

class UserUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    username: Optional[str] = Field(None, min_length=2, max_length=30)
    bio: Optional[str] = Field(None, max_length=200)
    phone: Optional[str] = Field(None, max_length=20)
    avatar_url: Optional[str] = Field(None, alias="avatarUrl")

    class Config:
        populate_by_name = True

class UserResponse(UserBase):
    id: int
    avatar_url: Optional[str] = Field(None, alias="avatarUrl")
    is_online: bool = Field(alias="isOnline")
    last_seen: datetime = Field(alias="lastSeen")
    created_at: datetime = Field(alias="createdAt")
    
    # Frontend compatibility
    avatarUrl: Optional[str] = None
    isOnline: Optional[bool] = None
    lastSeen: Optional[datetime] = None

    @field_validator('avatarUrl', mode='before')
    @classmethod
    def set_avatar_url(cls, v, info):
        if hasattr(info, 'data') and info.data:
            return v or info.data.get('avatar_url')
        return v

    @field_validator('isOnline', mode='before')
    @classmethod
    def set_is_online(cls, v, info):
        if hasattr(info, 'data') and info.data:
            return v if v is not None else info.data.get('is_online')
        return v

    @field_validator('lastSeen', mode='before')
    @classmethod
    def set_last_seen(cls, v, info):
        if hasattr(info, 'data') and info.data:
            return v or info.data.get('last_seen')
        return v

    class Config:
        from_attributes = True
        populate_by_name = True

class UserLogin(BaseModel):
    username: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user: Optional[UserResponse] = None  # Make optional to avoid circular issues

class TokenData(BaseModel):
    username: Optional[str] = None

class UsernameCheck(BaseModel):
    available: bool

# Исправлено для Pydantic v2 - использование RootModel
class UserStatusMap(RootModel[dict[int, bool]]):
    pass