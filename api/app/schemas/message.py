from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional
from .user import UserResponse

class MessageBase(BaseModel):
    content: str = Field(..., min_length=1, max_length=4000)
    message_type: str = Field(default="text", pattern="^(text|image|file|voice)$")

class MessageCreate(MessageBase):
    chat_id: int

class MessageUpdate(BaseModel):
    content: str = Field(..., min_length=1, max_length=4000)

class MessageResponse(MessageBase):
    id: int
    chat_id: int
    sender: UserResponse
    file_url: Optional[str] = None
    is_edited: bool
    edited_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True

class MessageListResponse(BaseModel):
    id: int
    content: str
    message_type: str
    sender_id: int
    sender_name: str
    sender_avatar: Optional[str] = None
    file_url: Optional[str] = None
    is_edited: bool
    created_at: datetime

    class Config:
        from_attributes = True