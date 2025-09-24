# app/schemas/chat.py
from pydantic import BaseModel, Field, field_validator
from datetime import datetime
from typing import Optional, List
from .user import UserResponse

class ChatBase(BaseModel):
    name: Optional[str] = Field(None, max_length=100)
    is_group: bool = False

class ChatCreate(ChatBase):
    participant_ids: List[int] = Field(..., min_length=1)
    # Frontend compatibility
    userId: Optional[int] = None
    avatar_url: Optional[str] = None
    type: str = Field(default="private")

class ChatParticipantResponse(BaseModel):
    id: int
    user: UserResponse
    is_pinned: bool
    is_muted: bool
    unread_count: int
    joined_at: datetime

    class Config:
        from_attributes = True

class ChatResponse(ChatBase):
    id: int
    avatar_url: Optional[str] = None
    created_at: datetime
    is_group: bool
    participants: List[ChatParticipantResponse]
    
    class Config:
        from_attributes = True

# Frontend-compatible chat list item
class ChatListItem(BaseModel):
    id: int
    name: Optional[str] = None
    is_group: bool = Field(alias="isGroup", default=False)
    avatar_url: Optional[str] = Field(alias="avatarUrl", default=None)
    last_message: Optional[str] = Field(alias="lastMessage", default=None)
    last_message_time: Optional[datetime] = Field(alias="lastMessageTime", default=None)
    unread_count: int = Field(alias="unreadCount", default=0)
    is_pinned: bool = Field(alias="isPinned", default=False)
    is_muted: bool = Field(alias="isMuted", default=False)
    
    # Frontend expects these fields
    userId: Optional[int] = None
    type: str = "private"
    avatarUrl: Optional[str] = None  # Duplicate for compatibility
    
    # For private chats
    other_participant: Optional[UserResponse] = None

    @field_validator('avatarUrl', mode='before')
    @classmethod
    def set_avatar_url(cls, v, info):
        if hasattr(info, 'data') and info.data:
            return v or info.data.get('avatar_url')
        return v

    @field_validator('type', mode='before')
    @classmethod
    def set_type(cls, v, info):
        if hasattr(info, 'data') and info.data:
            return "group" if info.data.get('is_group') else "private"
        return v

    class Config:
        from_attributes = True
        populate_by_name = True

class ChatUpdate(BaseModel):
    is_pinned: Optional[bool] = Field(None, alias="isPinned")
    is_muted: Optional[bool] = Field(None, alias="isMuted")

    class Config:
        populate_by_name = True