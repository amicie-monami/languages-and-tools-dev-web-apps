from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, desc, func
from typing import List
from datetime import datetime
from app.database import get_db
from app.models.user import User
from app.models.chat import Chat, ChatParticipant
from app.models.message import Message
from app.schemas.message import MessageCreate, MessageResponse, MessageUpdate, MessageListResponse
from app.auth import get_current_user
from app.websocket_manager import manager
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

# Note: This endpoint is accessed via /api/messages/chat/{chat_id}
# The chats router also has /api/chats/{chat_id}/messages for compatibility
@router.get("/chat/{chat_id}")
async def get_chat_messages(
    chat_id: int,
    offset: int = Query(0, ge=0),
    limit: int = Query(50, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get messages for a chat"""
    # Check if user is participant
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
    
    # Convert to frontend-compatible format
    message_responses = []
    for msg in messages:
        message_responses.append({
            "id": msg.id,
            "chatId": msg.chat_id,
            "senderId": msg.sender_id,
            "senderName": msg.sender.name,
            "text": msg.content,  # Frontend expects "text", not "content"
            "time": msg.created_at,
            "type": msg.message_type,
            "isRead": True,  # Assume read when fetching
            "isEdited": msg.is_edited
        })
    
    # Mark chat as read when loading messages
    participant.unread_count = 0
    db.commit()
    
    return list(reversed(message_responses))  # Return in chronological order

@router.post("/")
async def send_message(
    message_data: MessageCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Send a message to a chat"""
    try:
        # Get chat_id from different possible field names
        chat_id = getattr(message_data, 'chat_id', None) or getattr(message_data, 'chatId', None)
        content = getattr(message_data, 'content', None) or getattr(message_data, 'text', None)
        message_type = getattr(message_data, 'message_type', None) or getattr(message_data, 'type', 'text')
        
        if not chat_id or not content:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="chat_id and content are required"
            )
        
        # Check if user is participant of the chat
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
        
        # Create message
        message = Message(
            chat_id=chat_id,
            sender_id=current_user.id,
            content=content,
            message_type=message_type
        )
        
        db.add(message)
        db.flush()  # Get message.id
        
        # Update unread count for other participants
        other_participants = db.query(ChatParticipant).filter(
            and_(
                ChatParticipant.chat_id == chat_id,
                ChatParticipant.user_id != current_user.id
            )
        ).all()
        
        participant_ids = [current_user.id]  # Include sender
        for p in other_participants:
            p.unread_count += 1
            participant_ids.append(p.user_id)
        
        db.commit()
        db.refresh(message)
        
        # Create WebSocket message for real-time updates
        ws_message = {
            "type": "new_message",
            "message": {
                "id": message.id,
                "chatId": message.chat_id,
                "senderId": message.sender_id,
                "senderName": current_user.name,
                "text": message.content,
                "time": message.created_at.isoformat(),
                "type": message.message_type,
                "isRead": False,
                "isEdited": False
            }
        }
        
        # Broadcast to all chat participants via WebSocket
        await manager.send_to_chat(ws_message, participant_ids)
        
        # Return frontend-compatible response
        return {
            "id": message.id,
            "chatId": message.chat_id,
            "senderId": message.sender_id,
            "senderName": current_user.name,
            "text": message.content,
            "time": message.created_at,
            "type": message.message_type,
            "isRead": False,
            "isEdited": False
        }
        
    except Exception as e:
        logger.error(f"Error sending message: {e}")
        db.rollback()
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error sending message"
        )

@router.put("/{message_id}")
async def edit_message(
    message_id: int,
    message_update: MessageUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Edit a message"""
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
    
    # Update message content
    new_content = getattr(message_update, 'content', None) or getattr(message_update, 'text', None)
    if not new_content:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Content is required"
        )
    
    message.content = new_content
    message.is_edited = True
    message.edited_at = datetime.utcnow()
    
    db.commit()
    db.refresh(message)
    
    # Broadcast edit via WebSocket
    ws_message = {
        "type": "message_edited",
        "message": {
            "id": message.id,
            "chatId": message.chat_id,
            "text": message.content,
            "isEdited": True,
            "editedAt": message.edited_at.isoformat()
        }
    }
    
    # Get chat participants for broadcasting
    participants = db.query(ChatParticipant).filter(
        ChatParticipant.chat_id == message.chat_id
    ).all()
    participant_ids = [p.user_id for p in participants]
    
    await manager.send_to_chat(ws_message, participant_ids)
    
    return {
        "id": message.id,
        "chatId": message.chat_id,
        "senderId": message.sender_id,
        "senderName": current_user.name,
        "text": message.content,
        "time": message.created_at,
        "type": message.message_type,
        "isRead": True,
        "isEdited": message.is_edited,
        "editedAt": message.edited_at
    }

@router.delete("/{message_id}")
async def delete_message(
    message_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a message"""
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
    
    chat_id = message.chat_id
    
    # Delete the message
    db.delete(message)
    db.commit()
    
    # Broadcast deletion via WebSocket
    ws_message = {
        "type": "message_deleted",
        "message": {
            "id": message_id,
            "chatId": chat_id
        }
    }
    
    # Get chat participants for broadcasting
    participants = db.query(ChatParticipant).filter(
        ChatParticipant.chat_id == chat_id
    ).all()
    participant_ids = [p.user_id for p in participants]
    
    await manager.send_to_chat(ws_message, participant_ids)
    
    return {"message": "Message deleted successfully", "id": message_id}

@router.get("/search")
async def search_messages(
    chat_id: int = Query(...),
    q: str = Query(..., min_length=1),
    limit: int = Query(50, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Search messages in a chat"""
    # Check if user is participant
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
    ).filter(
        and_(
            Message.chat_id == chat_id,
            Message.content.ilike(f"%{q}%")
        )
    ).order_by(desc(Message.created_at)).limit(limit).all()
    
    # Convert to frontend format
    message_responses = []
    for msg in messages:
        message_responses.append({
            "id": msg.id,
            "chatId": msg.chat_id,
            "senderId": msg.sender_id,
            "senderName": msg.sender.name,
            "text": msg.content,
            "time": msg.created_at,
            "type": msg.message_type,
            "isRead": True,
            "isEdited": msg.is_edited
        })
    
    return message_responses

@router.get("/before/{message_id}")
async def get_messages_before(
    message_id: int,
    chat_id: int = Query(...),
    limit: int = Query(20, le=50),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get messages before a specific message (for pagination)"""
    # Check if user is participant
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
    
    # Get the reference message to get its timestamp
    ref_message = db.query(Message).filter(Message.id == message_id).first()
    if not ref_message:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Reference message not found"
        )
    
    messages = db.query(Message).options(
        joinedload(Message.sender)
    ).filter(
        and_(
            Message.chat_id == chat_id,
            Message.created_at < ref_message.created_at
        )
    ).order_by(desc(Message.created_at)).limit(limit).all()
    
    # Convert to frontend format
    message_responses = []
    for msg in messages:
        message_responses.append({
            "id": msg.id,
            "chatId": msg.chat_id,
            "senderId": msg.sender_id,
            "senderName": msg.sender.name,
            "text": msg.content,
            "time": msg.created_at,
            "type": msg.message_type,
            "isRead": True,
            "isEdited": msg.is_edited
        })
    
    return list(reversed(message_responses))  # Return in chronological order

@router.post("/mark-read")
async def mark_message_as_read(
    request_data: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Mark a specific message as read"""
    message_id = request_data.get("messageId")
    if not message_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="messageId is required"
        )
    
    message = db.query(Message).filter(Message.id == message_id).first()
    if not message:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Message not found"
        )
    
    # Check if user is participant of the chat
    participant = db.query(ChatParticipant).filter(
        and_(
            ChatParticipant.chat_id == message.chat_id,
            ChatParticipant.user_id == current_user.id
        )
    ).first()
    
    if not participant:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not a participant of this chat"
        )
    
    # For simplicity, just mark the entire chat as read
    participant.unread_count = 0
    db.commit()
    
    return {"message": "Message marked as read"}