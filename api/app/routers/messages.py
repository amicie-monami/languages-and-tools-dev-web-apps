from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, desc
from typing import List
from app.database import get_db
from app.models.user import User
from app.models.chat import Chat, ChatParticipant
from app.models.message import Message
from app.schemas.message import MessageCreate, MessageResponse, MessageUpdate, MessageListResponse
from app.auth import get_current_user

router = APIRouter()

@router.get("/chat/{chat_id}", response_model=List[MessageListResponse])
async def get_chat_messages(
    chat_id: int,
    offset: int = Query(0, ge=0),
    limit: int = Query(50, le=100),
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
    
    messages = db.query(Message).options(
        joinedload(Message.sender)
    ).filter(Message.chat_id == chat_id).order_by(
        desc(Message.created_at)
    ).offset(offset).limit(limit).all()
    
    # convert to response format
    message_responses = []
    for msg in messages:
        message_responses.append(MessageListResponse(
            id=msg.id,
            content=msg.content,
            message_type=msg.message_type,
            sender_id=msg.sender_id,
            sender_name=msg.sender.name,
            sender_avatar=msg.sender.avatar_url,
            file_url=msg.file_url,
            is_edited=msg.is_edited,
            created_at=msg.created_at
        ))
    
    # mark messages as read
    participant.unread_count = 0
    db.commit()
    
    return list(reversed(message_responses))  # return in chronological order

@router.post("/", response_model=MessageResponse)
async def send_message(
    message_data: MessageCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # check if user is participant of the chat
    participant = db.query(ChatParticipant).filter(
        and_(
            ChatParticipant.chat_id == message_data.chat_id,
            ChatParticipant.user_id == current_user.id
        )
    ).first()
    
    if not participant:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not a participant of this chat"
        )
    
    # create message
    message = Message(
        chat_id=message_data.chat_id,
        sender_id=current_user.id,
        content=message_data.content,
        message_type=message_data.message_type
    )
    
    db.add(message)
    db.flush()  # get message.id
    
    # update unread count for other participants
    other_participants = db.query(ChatParticipant).filter(
        and_(
            ChatParticipant.chat_id == message_data.chat_id,
            ChatParticipant.user_id != current_user.id
        )
    ).all()
    
    for participant in other_participants:
        participant.unread_count += 1
    
    db.commit()
    db.refresh(message)
    
    return message

@router.put("/{message_id}", response_model=MessageResponse)
async def edit_message(
    message_id: int,
    message_update: MessageUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    message = db.query(Message).filter(Message.id == message_id).first()
    
    if not message:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Message not found"
        )
    
    if message.sender_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Can only edit your own messages"
        )
    
    message.content = message_update.content
    message.is_edited = True
    message.edited_at = db.func.now()
    
    db.commit()
    db.refresh(message)
    
    return message

@router.delete("/{message_id}")
async def delete_message(
    message_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    message = db.query(Message).filter(Message.id == message_id).first()
    
    if not message:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Message not found"
        )
    
    if message.sender_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Can only delete your own messages"
        )
    
    db.delete(message)
    db.commit()
    
    return {"message": "Message deleted successfully"}