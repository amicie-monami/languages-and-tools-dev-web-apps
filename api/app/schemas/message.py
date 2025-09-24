# app/schemas/message.py
from pydantic import BaseModel, Field, field_validator
from datetime import datetime
from typing import Optional

class MessageBase(BaseModel):
    content: str = Field(..., min_length=1, max_length=4000, alias="text")
    message_type: str = Field(default="text", pattern="^(text|image|file|voice)$", alias="type")

class MessageCreate(MessageBase):
    chat_id: int = Field(alias="chatId")

class MessageUpdate(BaseModel):
    content: str = Field(..., min_length=1, max_length=4000, alias="text")

class MessageResponse(MessageBase):
    id: int
    chat_id: int = Field(alias="chatId")
    sender_id: int = Field(alias="senderId")
    sender_name: str = Field(alias="senderName")
    sender_avatar: Optional[str] = Field(alias="senderAvatar")
    file_url: Optional[str] = Field(alias="fileUrl")
    is_edited: bool = Field(alias="isEdited")
    edited_at: Optional[datetime] = Field(alias="editedAt")
    created_at: datetime = Field(alias="time")
    
    # Frontend compatibility
    text: Optional[str] = None
    chatId: Optional[int] = None
    senderId: Optional[int] = None
    senderName: Optional[str] = None
    time: Optional[datetime] = None
    type: Optional[str] = None
    isRead: bool = True
    isEdited: Optional[bool] = None

    @field_validator('text', mode='before')
    @classmethod
    def set_text(cls, v, info):
        if hasattr(info, 'data') and info.data:
            return v or info.data.get('content')
        return v

    @field_validator('chatId', mode='before')
    @classmethod
    def set_chat_id(cls, v, info):
        if hasattr(info, 'data') and info.data:
            return v or info.data.get('chat_id')
        return v

    @field_validator('time', mode='before')
    @classmethod
    def set_time(cls, v, info):
        if hasattr(info, 'data') and info.data:
            return v or info.data.get('created_at')
        return v

    @field_validator('type', mode='before')
    @classmethod
    def set_type(cls, v, info):
        if hasattr(info, 'data') and info.data:
            return v or info.data.get('message_type')
        return v

    class Config:
        from_attributes = True
        populate_by_name = True

# Simplified response for message lists
class MessageListResponse(BaseModel):
    id: int
    text: str = Field(alias="content")
    type: str = Field(alias="message_type", default="text")
    chatId: int = Field(alias="chat_id")
    senderId: int = Field(alias="sender_id")
    senderName: str = Field(alias="sender_name")
    senderAvatar: Optional[str] = Field(alias="sender_avatar", default=None)
    fileUrl: Optional[str] = Field(alias="file_url", default=None)
    isEdited: bool = Field(alias="is_edited", default=False)
    time: datetime = Field(alias="created_at")
    isRead: bool = True

    class Config:
        from_attributes = True
        populate_by_name = True