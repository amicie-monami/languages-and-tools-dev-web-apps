from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, or_, desc
from typing import List
from app.database import get_db
from app.models.user import User
from app.models.chat import Chat, ChatParticipant
from app.models.message import Message
from app.schemas.chat import ChatCreate, ChatResponse, ChatListItem, ChatUpdate
from app.auth import get_current_user

router = APIRouter()

@router.get("/", response_model=List[ChatListItem])
async def get_user_chats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # get chats where user is participant
    chat_participants = db.query(ChatParticipant).options(
        joinedload(ChatParticipant.chat),
        joinedload(ChatParticipant.chat, Chat.participants),
        joinedload(ChatParticipant.chat, Chat.participants, ChatParticipant.user)
    ).filter(ChatParticipant.user_id == current_user.id).all()
    
    chat_list = []
    
    for participant in chat_participants:
        chat = participant.chat
        
        # get last message
        last_message = db.query(Message).filter(
            Message.chat_id == chat.id
        ).order_by(desc(Message.created_at)).first()
        
        # for private chats, get other participant
        other_participant = None
        if not chat.is_group:
            other_participant_obj = next(
                (p.user for p in chat.participants if p.user_id != current_user.id), 
                None
            )
            other_participant = other_participant_obj
        
        chat_item = ChatListItem(
            id=chat.id,
            name=chat.name if chat.is_group else other_participant.name if other_participant else None,
            is_group=chat.is_group,
            avatar_url=chat.avatar_url if chat.is_group else (other_participant.avatar_url if other_participant else None),
            last_message=last_message.content if last_message else None,
            last_message_time=last_message.created_at if last_message else None,
            unread_count=participant.unread_count,
            is_pinned=participant.is_pinned,
            is_muted=participant.is_muted,
            other_participant=other_participant
        )
        chat_list.append(chat_item)
    
    # sort by pinned first, then by last message time
    chat_list.sort(key=lambda x: (not x.is_pinned, x.last_message_time or x.id), reverse=True)
    
    return chat_list

@router.post("/", response_model=ChatResponse)
async def create_chat(
    chat_data: ChatCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # validate participants exist
    participant_ids = list(set(chat_data.participant_ids + [current_user.id]))  # add current user
    users = db.query(User).filter(User.id.in_(participant_ids)).all()
    
    if len(users) != len(participant_ids):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Some participants not found"
        )
    
    # for private chats, check if chat already exists
    if not chat_data.is_group and len(participant_ids) == 2:
        existing_chat = db.query(Chat).join(ChatParticipant).filter(
            and_(
                Chat.is_group == False,
                ChatParticipant.user_id.in_(participant_ids)
            )
        ).group_by(Chat.id).having(
            db.func.count(ChatParticipant.user_id) == 2
        ).first()
        
        if existing_chat:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Private chat already exists"
            )
    
    # create chat
    chat = Chat(
        name=chat_data.name,
        is_group=chat_data.is_group
    )
    db.add(chat)
    db.flush()  # get chat.id
    
    # add participants
    for user_id in participant_ids:
        participant = ChatParticipant(chat_id=chat.id, user_id=user_id)
        db.add(participant)
    
    db.commit()
    db.refresh(chat)
    
    return chat

@router.get("/{chat_id}", response_model=ChatResponse)
async def get_chat(
    chat_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # check if user is participant
    participant = db.query(ChatParticipant).filter(
        and_(
            ChatParticipant.chat_id == chat_id,
            ChatParticipant.user_id == current_user.id
        )
    ).first()
    
    if not participant:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not a participant of this chat"
        )
    
    chat = db.query(Chat).options(
        joinedload(Chat.participants),
        joinedload(Chat.participants, ChatParticipant.user)
    ).filter(Chat.id == chat_id).first()
    
    return chat

@router.put("/{chat_id}", response_model=dict)
async def update_chat_settings(
    chat_id: int,
    chat_update: ChatUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # get participant record to update settings
    participant = db.query(ChatParticipant).filter(
        and_(
            ChatParticipant.chat_id == chat_id,
            ChatParticipant.user_id == current_user.id
        )
    ).first()
    
    if not participant:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not a participant of this chat"
        )
    
    # update settings
    for field, value in chat_update.dict(exclude_unset=True).items():
        setattr(participant, field, value)
    
    db.commit()
    
    return {"message": "Chat settings updated"}

@router.delete("/{chat_id}")
async def delete_chat(
    chat_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # check if user is participant
    participant = db.query(ChatParticipant).filter(
        and_(
            ChatParticipant.chat_id == chat_id,
            ChatParticipant.user_id == current_user.id
        )
    ).first()
    
    if not participant:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not a participant of this chat"
        )
    
    # for now, just remove user from chat (leave chat)
    db.delete(participant)
    
    # if no participants left, delete the chat
    remaining_participants = db.query(ChatParticipant).filter(
        ChatParticipant.chat_id == chat_id
    ).count()
    
    if remaining_participants == 0:
        chat = db.query(Chat).filter(Chat.id == chat_id).first()
        if chat:
            db.delete(chat)
    
    db.commit()
    
    return {"message": "Left chat successfully"}