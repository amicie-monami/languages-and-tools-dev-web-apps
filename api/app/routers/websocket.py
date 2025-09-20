from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import and_
import json
import logging
from app.database import get_db
from app.models.user import User
from app.models.chat import ChatParticipant
from app.models.message import Message
from app.websocket_manager import manager
from app.auth import verify_token

logger = logging.getLogger(__name__)
router = APIRouter()

async def get_user_from_token(token: str, db: Session) -> User:
    """verify token and get user for websocket connection"""
    try:
        username = verify_token(token)
        user = db.query(User).filter(User.username == username).first()
        if not user:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED)
        return user
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED)

@router.websocket("/ws/{token}")
async def websocket_endpoint(websocket: WebSocket, token: str):
    db = next(get_db())
    
    try:
        user = await get_user_from_token(token, db)
    except:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return
    
    await manager.connect(websocket, user.id)
    
    # update user online status
    user.is_online = True
    db.commit()
    await manager.broadcast_user_status(user.id, True)
    
    try:
        while True:
            data = await websocket.receive_text()
            message_data = json.loads(data)
            
            await handle_websocket_message(message_data, user, db)
            
    except WebSocketDisconnect:
        manager.disconnect(websocket)
        
        # update user offline status
        user.is_online = False
        user.last_seen = db.func.now()
        db.commit()
        await manager.broadcast_user_status(user.id, False)
        
    except Exception as e:
        logger.error(f"WebSocket error for user {user.id}: {e}")
        manager.disconnect(websocket)
    finally:
        db.close()

async def handle_websocket_message(message_data: dict, user: User, db: Session):
    """handle different types of websocket messages"""
    message_type = message_data.get("type")
    
    if message_type == "send_message":
        await handle_send_message(message_data, user, db)
    elif message_type == "typing":
        await handle_typing_status(message_data, user, db)
    elif message_type == "mark_read":
        await handle_mark_read(message_data, user, db)
    else:
        logger.warning(f"Unknown message type: {message_type}")

async def handle_send_message(message_data: dict, user: User, db: Session):
    """handle new message sending via websocket"""
    chat_id = message_data.get("chat_id")
    content = message_data.get("content")
    
    if not chat_id or not content:
        return
    
    # check if user is participant
    participant = db.query(ChatParticipant).filter(
        and_(
            ChatParticipant.chat_id == chat_id,
            ChatParticipant.user_id == user.id
        )
    ).first()
    
    if not participant:
        return
    
    # create message
    message = Message(
        chat_id=chat_id,
        sender_id=user.id,
        content=content,
        message_type=message_data.get("message_type", "text")
    )
    
    db.add(message)
    db.flush()
    
    # update unread count for other participants
    other_participants = db.query(ChatParticipant).filter(
        and_(
            ChatParticipant.chat_id == chat_id,
            ChatParticipant.user_id != user.id
        )
    ).all()
    
    participant_ids = []
    for p in other_participants:
        p.unread_count += 1
        participant_ids.append(p.user_id)
    
    participant_ids.append(user.id)  # include sender
    
    db.commit()
    db.refresh(message)
    
    # broadcast message to all chat participants
    response_message = {
        "type": "new_message",
        "message": {
            "id": message.id,
            "chat_id": message.chat_id,
            "content": message.content,
            "message_type": message.message_type,
            "sender_id": message.sender_id,
            "sender_name": user.name,
            "sender_avatar": user.avatar_url,
            "created_at": message.created_at.isoformat(),
            "is_edited": False
        }
    }
    
    await manager.send_to_chat(response_message, participant_ids)

async def handle_typing_status(message_data: dict, user: User, db: Session):
    """handle typing indicator"""
    chat_id = message_data.get("chat_id")
    is_typing = message_data.get("is_typing", False)
    
    if not chat_id:
        return
    
    # check if user is participant
    participant = db.query(ChatParticipant).filter(
        and_(
            ChatParticipant.chat_id == chat_id,
            ChatParticipant.user_id == user.id
        )
    ).first()
    
    if not participant:
        return
    
    # get other participants
    other_participants = db.query(ChatParticipant).filter(
        and_(
            ChatParticipant.chat_id == chat_id,
            ChatParticipant.user_id != user.id
        )
    ).all()
    
    participant_ids = [p.user_id for p in other_participants]
    
    typing_message = {
        "type": "typing",
        "chat_id": chat_id,
        "user_id": user.id,
        "user_name": user.name,
        "is_typing": is_typing
    }
    
    await manager.send_to_chat(typing_message, participant_ids)

async def handle_mark_read(message_data: dict, user: User, db: Session):
    """mark chat as read"""
    chat_id = message_data.get("chat_id")
    
    if not chat_id:
        return
    
    # update unread count
    participant = db.query(ChatParticipant).filter(
        and_(
            ChatParticipant.chat_id == chat_id,
            ChatParticipant.user_id == user.id
        )
    ).first()
    
    if participant:
        participant.unread_count = 0
        db.commit()
        
        # notify other participants about read status
        other_participants = db.query(ChatParticipant).filter(
            and_(
                ChatParticipant.chat_id == chat_id,
                ChatParticipant.user_id != user.id
            )
        ).all()
        
        participant_ids = [p.user_id for p in other_participants]
        
        read_message = {
            "type": "message_read",
            "chat_id": chat_id,
            "user_id": user.id
        }
        
        await manager.send_to_chat(read_message, participant_ids)