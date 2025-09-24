from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, or_, desc, func
from typing import List
from app.database import get_db
from app.models.user import User
from app.models.chat import Chat, ChatParticipant
from app.models.message import Message
from app.schemas.message import MessageCreate
from app.schemas.chat import ChatCreate, ChatResponse, ChatListItem, ChatUpdate
from app.auth import get_current_user
import logging
from app.websocket_manager import manager

logger = logging.getLogger(__name__)
router = APIRouter()
# Добавьте этот эндпоинт в начало app/routers/chats.py

@router.get("/")
async def get_user_chats(
    offset: int = Query(0, ge=0),
    limit: int = Query(50, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all chats for the current user"""
    try:
        # Get all chat participants where current user is a member
        participants = db.query(ChatParticipant).options(
            joinedload(ChatParticipant.chat),
            joinedload(ChatParticipant.chat, Chat.participants),
            joinedload(ChatParticipant.chat, Chat.participants, ChatParticipant.user)
        ).filter(
            ChatParticipant.user_id == current_user.id
        ).offset(offset).limit(limit).all()
        
        chat_list = []
        
        for participant in participants:
            chat = participant.chat
            if not chat:
                continue
            
            # Get last message
            last_message = db.query(Message).filter(
                Message.chat_id == chat.id
            ).order_by(desc(Message.created_at)).first()
            
            # For private chats, get other participant
            user_id = None
            other_participant = None
            if not chat.is_group:
                for p in chat.participants:
                    if p.user_id != current_user.id:
                        other_participant = p.user
                        user_id = p.user_id
                        break
            
            # Build response
            chat_item = {
                "id": chat.id,
                "name": chat.name if chat.is_group else (other_participant.name if other_participant else "Unknown"),
                "is_group": chat.is_group,
                "avatarUrl": chat.avatar_url if chat.is_group else (other_participant.avatar_url if other_participant else None),
                "lastMessage": {
                    "text": last_message.content if last_message else None,
                    "time": last_message.created_at if last_message else chat.created_at,
                    "senderId": last_message.sender_id if last_message else None,
                    "isRead": True  # Simplified for now
                },
                "unreadCount": participant.unread_count,
                "isPinned": participant.is_pinned,
                "isMuted": participant.is_muted,
                "userId": user_id,  # For frontend compatibility
                "type": "group" if chat.is_group else "private"
            }
            chat_list.append(chat_item)
        
        # Sort by pinned first, then by last message time
        chat_list.sort(key=lambda x: (
            not x["isPinned"], 
            -(x["lastMessage"]["time"].timestamp() if x["lastMessage"]["time"] else 0)
        ))
        
        return chat_list
        
    except Exception as e:
        logger.error(f"Error getting chats for user {current_user.id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error retrieving chats"
        )
    
# @router.get("/", response_model=List[ChatListItem])
# async def get_user_chats(
#     offset: int = Query(0, ge=0),
#     limit: int = Query(50, le=100),
#     current_user: User = Depends(get_current_user),
#     db: Session = Depends(get_db)
# ):
#     """Get chats where user is participant"""
#     try:
#         # Get chats where user is participant with proper joins
#         chat_participants = db.query(ChatParticipant).options(
#             joinedload(ChatParticipant.chat),
#             joinedload(ChatParticipant.chat).joinedload(Chat.participants).joinedload(ChatParticipant.user)
#         ).filter(ChatParticipant.user_id == current_user.id).offset(offset).limit(limit).all()
        
#         chat_list = []
        
#         for participant in chat_participants:
#             chat = participant.chat
            
#             # Get last message for this chat
#             last_message = db.query(Message).filter(
#                 Message.chat_id == chat.id
#             ).order_by(desc(Message.created_at)).first()
            
#             # For private chats, get other participant
#             other_participant = None
#             user_id = None
            
#             if not chat.is_group:
#                 other_participant_obj = next(
#                     (p.user for p in chat.participants if p.user_id != current_user.id), 
#                     None
#                 )
#                 if other_participant_obj:
#                     other_participant = other_participant_obj
#                     user_id = other_participant_obj.id
            
#             # Create frontend-compatible response
#             chat_item = ChatListItem(
#                 id=chat.id,
#                 name=chat.name if chat.is_group else (other_participant.name if other_participant else "Unknown"),
#                 is_group=chat.is_group,
#                 avatar_url=chat.avatar_url if chat.is_group else (other_participant.avatar_url if other_participant else None),
#                 last_message=last_message.content if last_message else None,
#                 last_message_time=last_message.created_at if last_message else chat.created_at,
#                 unread_count=participant.unread_count,
#                 is_pinned=participant.is_pinned,
#                 is_muted=participant.is_muted,
#                 userId=user_id,  # For frontend compatibility
#                 type="group" if chat.is_group else "private",
#                 other_participant=other_participant
#             )
#             chat_list.append(chat_item)
        
#         # Sort by pinned first, then by last message time
#         chat_list.sort(key=lambda x: (not x.is_pinned, -(x.last_message_time.timestamp() if x.last_message_time else 0)))
        
#         return chat_list
        
#     except Exception as e:
#         logger.error(f"Error getting chats for user {current_user.id}: {e}")
#         raise HTTPException(
#             status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
#             detail="Error retrieving chats"
#         )

@router.post("/", response_model=dict)
async def create_chat(
    chat_data: ChatCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create new chat"""
    try:
        # Handle different input formats
        participant_ids = list(chat_data.participant_ids or [])
        
        # Always include current user if not already in list
        if current_user.id not in participant_ids:
            participant_ids.append(current_user.id)
        
        print(f"DEBUG: Creating chat with participants: {participant_ids}")
        print(f"DEBUG: Current user: {current_user.id}")
        print(f"DEBUG: Chat data: {chat_data}")
        
        # Validate participants exist
        users = db.query(User).filter(User.id.in_(participant_ids)).all()
        if len(users) != len(participant_ids):
            missing_ids = set(participant_ids) - set(u.id for u in users)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Participants not found: {missing_ids}"
            )
        
        # For private chats, check if chat already exists with EXACT same participants
        if not chat_data.is_group and len(participant_ids) == 2:
            # Ищем чат с точно такими же участниками
            existing_chats = db.query(Chat).filter(
                Chat.is_group == False
            ).all()
            
            for chat in existing_chats:
                # Получаем всех участников этого чата
                chat_participants = db.query(ChatParticipant).filter(
                    ChatParticipant.chat_id == chat.id
                ).all()
                chat_participant_ids = [cp.user_id for cp in chat_participants]
                
                # Проверяем точное совпадение участников
                if set(chat_participant_ids) == set(participant_ids):
                    print(f"DEBUG: Found existing chat {chat.id} with same participants")
                    
                    # ИСПРАВЛЕНО: Возвращаем сериализованный объект
                    return {
                        "id": chat.id,
                        "name": chat.name,
                        "is_group": chat.is_group,
                        "avatar_url": chat.avatar_url,
                        "created_at": chat.created_at,
                        "updated_at": chat.updated_at,
                        "participants": [
                            {
                                "user_id": p.user_id,
                                "is_pinned": p.is_pinned,
                                "is_muted": p.is_muted,
                                "unread_count": p.unread_count
                            } for p in chat_participants
                        ]
                    }
            
            print("DEBUG: No existing chat found, creating new one")
        
        # Create new chat
        chat = Chat(
            name=chat_data.name or f"Chat {participant_ids}",
            is_group=chat_data.is_group or False,
            avatar_url=chat_data.avatar_url
        )
        db.add(chat)
        db.flush()  # Get chat.id
        
        print(f"DEBUG: Created chat with ID: {chat.id}")
        
        # Add participants
        participants = []
        for user_id in participant_ids:
            participant = ChatParticipant(
                chat_id=chat.id,
                user_id=user_id,
                is_pinned=False,
                is_muted=False,
                unread_count=0
            )
            db.add(participant)
            participants.append(participant)
        
        db.commit()
        db.refresh(chat)
        
        print(f"DEBUG: Successfully created chat {chat.id} with participants {participant_ids}")
        
        # ИСПРАВЛЕНО: Возвращаем правильно сериализованный объект
        return {
            "id": chat.id,
            "name": chat.name,
            "is_group": chat.is_group,
            "avatar_url": chat.avatar_url,
            "created_at": chat.created_at,
            "updated_at": chat.updated_at,
            "participants": [
                {
                    "user_id": p.user_id,
                    "is_pinned": p.is_pinned,
                    "is_muted": p.is_muted,
                    "unread_count": p.unread_count
                } for p in participants
            ]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"ERROR: Failed to create chat: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create chat"
        )

# ИСПРАВЛЕННАЯ ВЕРСИЯ - заменить существующий код
# @router.post("/", response_model=dict)
# async def create_chat(
#     chat_data: ChatCreate,
#     current_user: User = Depends(get_current_user),
#     db: Session = Depends(get_db)
# ):
#     """Create new chat"""
#     try:
#         # Handle different input formats
#         participant_ids = list(chat_data.participant_ids or [])
        
#         # Always include current user if not already in list
#         if current_user.id not in participant_ids:
#             participant_ids.append(current_user.id)
        
#         print(f"DEBUG: Creating chat with participants: {participant_ids}")
#         print(f"DEBUG: Current user: {current_user.id}")
#         print(f"DEBUG: Chat data: {chat_data}")
        
#         # Validate participants exist
#         users = db.query(User).filter(User.id.in_(participant_ids)).all()
#         if len(users) != len(participant_ids):
#             missing_ids = set(participant_ids) - set(u.id for u in users)
#             raise HTTPException(
#                 status_code=status.HTTP_400_BAD_REQUEST,
#                 detail=f"Participants not found: {missing_ids}"
#             )
        
#         # For private chats, check if chat already exists with EXACT same participants
#         if not chat_data.is_group and len(participant_ids) == 2:
#             # ИСПРАВЛЕННАЯ ЛОГИКА: ищем чат с ТОЧНО такими же участниками
#             existing_chats = db.query(Chat).filter(
#                 Chat.is_group == False
#             ).all()
            
#             for chat in existing_chats:
#                 # Получаем всех участников этого чата
#                 chat_participants = db.query(ChatParticipant).filter(
#                     ChatParticipant.chat_id == chat.id
#                 ).all()
#                 chat_participant_ids = [cp.user_id for cp in chat_participants]
                
#                 # Проверяем точное совпадение участников
#                 if set(chat_participant_ids) == set(participant_ids):
#                     print(f"DEBUG: Found existing chat {chat.id} with same participants")
#                     return chat
            
#             print("DEBUG: No existing chat found, creating new one")
        
#         # Create new chat
#         chat = Chat(
#             name=chat_data.name or f"Chat {participant_ids}",
#             is_group=chat_data.is_group or False,
#             avatar_url=chat_data.avatar_url
#         )
#         db.add(chat)
#         db.flush()  # Get chat.id
        
#         print(f"DEBUG: Created chat with ID: {chat.id}")
        
#         # Add participants
#         for user_id in participant_ids:
#             participant = ChatParticipant(
#                 chat_id=chat.id,
#                 user_id=user_id,
#                 is_pinned=False,
#                 is_muted=False,
#                 unread_count=0
#             )
#             db.add(participant)
        
#         db.commit()
#         db.refresh(chat)
        
#         print(f"DEBUG: Successfully created chat {chat.id} with participants {participant_ids}")
#         return {
#             "id": chat.id,
#             "name": chat.name,
#             "is_group": chat.is_group,
#             "avatar_url": chat.avatar_url,
#             "created_at": chat.created_at,
#             "updated_at": chat.updated_at,
#             "participants": [
#                 {
#                     "user_id": p.user_id,
#                     "is_pinned": p.is_pinned,  
#                     "is_muted": p.is_muted,
#                     "unread_count": p.unread_count
#                 } for p in db.query(ChatParticipant).filter(ChatParticipant.chat_id == chat.id).all()
#             ]
#         }     
       
#     except HTTPException:
#         raise
#     except Exception as e:
#         print(f"ERROR: Failed to create chat: {e}")
#         db.rollback()
#         raise HTTPException(
#             status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
#             detail="Failed to create chat"
#         )

# @router.post("/", response_model=ChatResponse)
# async def create_chat(
#     chat_data: ChatCreate,
#     current_user: User = Depends(get_current_user),
#     db: Session = Depends(get_db)
# ):
#     """Create new chat"""
#     try:
#         # Handle different input formats
#         participant_ids = chat_data.participant_ids or []
        
#         # If userId is provided (frontend compatibility), add it
#         if hasattr(chat_data, 'userId') and chat_data.userId:
#             participant_ids.append(chat_data.userId)
        
#         # Always include current user
#         participant_ids = list(set(participant_ids + [current_user.id]))
        
#         # Validate participants exist
#         users = db.query(User).filter(User.id.in_(participant_ids)).all()
#         if len(users) != len(participant_ids):
#             raise HTTPException(
#                 status_code=status.HTTP_400_BAD_REQUEST,
#                 detail="Some participants not found"
#             )
        
#         # For private chats, check if chat already exists
#         if not chat_data.is_group and len(participant_ids) == 2:
#             existing_participant_subquery = db.query(ChatParticipant.chat_id).filter(
#                 ChatParticipant.user_id.in_(participant_ids)
#             ).subquery()
            
#             existing_chat = db.query(Chat).join(ChatParticipant).filter(
#                 and_(
#                     Chat.is_group == False,
#                     Chat.id.in_(existing_participant_subquery)
#                 )
#             ).group_by(Chat.id).having(
#                 func.count(ChatParticipant.user_id) == 2
#             ).first()
            
#             if existing_chat:
#                 # Return existing chat instead of creating new one
#                 return existing_chat
        
#         # Create chat
#         chat = Chat(
#             name=chat_data.name,
#             is_group=chat_data.is_group,
#             avatar_url=None  # Set default avatar later if needed
#         )
#         db.add(chat)
#         db.flush()  # Get chat.id
        
#         # Add participants
#         for user_id in participant_ids:
#             participant = ChatParticipant(
#                 chat_id=chat.id,
#                 user_id=user_id,
#                 is_pinned=False,
#                 is_muted=False,
#                 unread_count=0
#             )
#             db.add(participant)
        
#         db.commit()
#         db.refresh(chat)
        
#         # Load chat with participants for response
#         chat_with_participants = db.query(Chat).options(
#             joinedload(Chat.participants).joinedload(ChatParticipant.user)
#         ).filter(Chat.id == chat.id).first()
        
#         return chat_with_participants
        
#     except Exception as e:
#         logger.error(f"Error creating chat: {e}")
#         db.rollback()
#         raise HTTPException(
#             status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
#             detail="Error creating chat"
#         )

@router.get("/{chat_id}", response_model=ChatResponse)
async def get_chat(
    chat_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get specific chat details"""
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
    
    chat = db.query(Chat).options(
        joinedload(Chat.participants).joinedload(ChatParticipant.user)
    ).filter(Chat.id == chat_id).first()
    
    if not chat:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat not found"
        )
    
    return chat

@router.put("/{chat_id}", response_model=dict)
async def update_chat_settings(
    chat_id: int,
    chat_update: ChatUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update chat settings for current user"""
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
    
    # Update settings
    update_data = chat_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        # Handle field aliases
        if field == "isPinned":
            participant.is_pinned = value
        elif field == "isMuted":
            participant.is_muted = value
        else:
            setattr(participant, field, value)
    
    db.commit()
    return {"message": "Chat settings updated"}

@router.post("/{chat_id}/pin")
async def toggle_chat_pin(
    chat_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Toggle pin status for chat"""
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
    
    participant.is_pinned = not participant.is_pinned
    db.commit()
    
    return {"is_pinned": participant.is_pinned, "message": "Chat pin status updated"}

@router.post("/{chat_id}/mute")
async def toggle_chat_mute(
    chat_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Toggle mute status for chat"""
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
    
    participant.is_muted = not participant.is_muted
    db.commit()
    
    return {"is_muted": participant.is_muted, "message": "Chat mute status updated"}

@router.post("/{chat_id}/read")
async def mark_chat_as_read(
    chat_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Mark chat as read (reset unread count)"""
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
    
    participant.unread_count = 0
    db.commit()
    
    return {"message": "Chat marked as read", "unread_count": 0}

@router.get("/{chat_id}/messages")
async def get_chat_messages(
    chat_id: int,
    offset: int = Query(0, ge=0),
    limit: int = Query(50, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get messages for a chat (alternative endpoint for frontend compatibility)"""
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
            "text": msg.content,  # Frontend expects "text"
            "time": msg.created_at,
            "type": msg.message_type,
            "isRead": True,  # Assume read when fetching
            "isEdited": msg.is_edited
        })
    
    # Mark messages as read
    participant.unread_count = 0
    db.commit()
    
    return list(reversed(message_responses))  # Return in chronological order

@router.post("/{chat_id}/messages")
async def send_message_to_chat(
    chat_id: int,
    message_data: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Send message to chat"""
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
    
    # Get message text
    text = message_data.get("text", "").strip()
    if not text:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Message text cannot be empty"
        )
    
    # Create message
    message = Message(
        chat_id=chat_id,
        sender_id=current_user.id,
        content=text,
        message_type="text"
    )
    
    db.add(message)
    
    # Update unread counts for other participants
    other_participants = db.query(ChatParticipant).filter(
        and_(
            ChatParticipant.chat_id == chat_id,
            ChatParticipant.user_id != current_user.id
        )
    ).all()
    
    for p in other_participants:
        p.unread_count += 1
    
    # Update chat timestamp
    chat = db.query(Chat).filter(Chat.id == chat_id).first()
    if chat:
        chat.updated_at = func.now()
    
    db.commit()
    db.refresh(message)

    # Get all chat participants for broadcasting
    participants = db.query(ChatParticipant).filter(
        ChatParticipant.chat_id == chat_id
    ).all()
    participant_ids = [p.user_id for p in participants]
    
    # Create WebSocket message
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
    
    # Broadcast via WebSocket
    await manager.send_to_chat(ws_message, participant_ids)
    print(f"DEBUG: WebSocket message sent to participants: {participant_ids}")
    
    # Return in frontend format
    return {
        "id": message.id,
        "chatId": message.chat_id,
        "senderId": message.sender_id,
        "senderName": current_user.name,
        "text": message.content,
        "time": message.created_at,
        "type": message.message_type,
        "isRead": True,
        "isEdited": False
    }

@router.delete("/{chat_id}")
async def delete_chat(
    chat_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Leave chat or delete if empty"""
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
    
    # Remove user from chat
    db.delete(participant)
    
    # Check if any participants left
    remaining_participants = db.query(ChatParticipant).filter(
        ChatParticipant.chat_id == chat_id
    ).count()
    
    # If no participants left, delete the chat and its messages
    if remaining_participants == 0:
        # Delete messages first
        db.query(Message).filter(Message.chat_id == chat_id).delete()
        
        # Delete chat
        chat = db.query(Chat).filter(Chat.id == chat_id).first()
        if chat:
            db.delete(chat)
    
    db.commit()
    
    return {"message": "Left chat successfully"}