from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List
from .user import UserResponse

class ChatBase(BaseModel):
    name: Optional[str] = Field(None, max_length=100)
    is_group: bool = False

class ChatCreate(ChatBase):
    participant_ids: List[int] = Field(..., min_items=1)

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
    participants: List[ChatParticipantResponse]
    
    class Config:
        from_attributes = True

class ChatListItem(BaseModel):
    id: int
    name: Optional[str] = None
    is_group: bool
    avatar_url: Optional[str] = None
    last_message: Optional[str] = None
    last_message_time: Optional[datetime] = None
    unread_count: int
    is_pinned: bool
    is_muted: bool
    # for private chats, show other participant's info
    other_participant: Optional[UserResponse] = None

    class Config:
        from_attributes = True

class ChatUpdate(BaseModel):
    is_pinned: Optional[bool] = None
    is_muted: Optional[bool] = None