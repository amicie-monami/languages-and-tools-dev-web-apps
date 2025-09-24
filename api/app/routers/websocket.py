# app/routers/websocket.py 
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException, status
from sqlalchemy.orm import Session
import json
import logging
from app.database import get_db
from app.models.user import User
from app.websocket_manager import manager
from app.auth import verify_token

logger = logging.getLogger(__name__)
router = APIRouter()

async def get_user_from_token(token: str, db: Session) -> User:
    """Verify token and get user for websocket connection"""
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
    """WebSocket connection endpoint"""
    db = next(get_db())
    
    try:
        # Verify token and get user
        user = await get_user_from_token(token, db)
    except:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return
    
    await manager.connect(websocket, user.id)
    
    # Update user online status
    user.is_online = True
    db.commit()
    await manager.broadcast_user_status(user.id, True)
    
    try:
        while True:
            data = await websocket.receive_text()
            message_data = json.loads(data)
            
            # Simple message handling
            message_type = message_data.get("type")
            logger.info(f"Received WebSocket message: {message_type} from user {user.id}")
            
            # Echo back for now (can be expanded later)
            await websocket.send_text(json.dumps({
                "type": "message_received",
                "original": message_data,
                "user_id": user.id
            }))
            
    except WebSocketDisconnect:
        manager.disconnect(websocket)
        
        # Update user offline status
        user.is_online = False
        db.commit()
        await manager.broadcast_user_status(user.id, False)
        
    except Exception as e:
        logger.error(f"WebSocket error for user {user.id}: {e}")
        manager.disconnect(websocket)
    finally:
        db.close()

@router.get("/ws/stats")
async def get_websocket_stats():
    """Get WebSocket connection statistics"""
    return manager.get_stats()