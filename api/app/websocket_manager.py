from fastapi import WebSocket, WebSocketDisconnect
from typing import List, Dict
import json
import logging

logger = logging.getLogger(__name__)

class ConnectionManager:
    def __init__(self):
        # user_id -> list of websocket connections
        self.active_connections: Dict[int, List[WebSocket]] = {}
        # websocket -> user_id mapping
        self.connection_users: Dict[WebSocket, int] = {}

    async def connect(self, websocket: WebSocket, user_id: int):
        await websocket.accept()
        
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        
        self.active_connections[user_id].append(websocket)
        self.connection_users[websocket] = user_id
        
        logger.info(f"User {user_id} connected. Active connections: {len(self.active_connections[user_id])}")

    def disconnect(self, websocket: WebSocket):
        user_id = self.connection_users.get(websocket)
        if user_id and user_id in self.active_connections:
            self.active_connections[user_id].remove(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
        
        if websocket in self.connection_users:
            del self.connection_users[websocket]
        
        logger.info(f"User {user_id} disconnected")

    async def send_personal_message(self, message: str, user_id: int):
        """send message to specific user (all their connections)"""
        if user_id in self.active_connections:
            connections_to_remove = []
            for connection in self.active_connections[user_id]:
                try:
                    await connection.send_text(message)
                except:
                    connections_to_remove.append(connection)
            
            # remove broken connections
            for connection in connections_to_remove:
                self.active_connections[user_id].remove(connection)
                if connection in self.connection_users:
                    del self.connection_users[connection]

    async def send_to_chat(self, message: dict, chat_participants: List[int]):
        """send message to all participants of a chat"""
        message_str = json.dumps(message)
        
        for user_id in chat_participants:
            await self.send_personal_message(message_str, user_id)

    async def broadcast_user_status(self, user_id: int, is_online: bool):
        """notify all users about user's online status"""
        status_message = {
            "type": "user_status",
            "user_id": user_id,
            "is_online": is_online
        }
        
        # send to all connected users
        for connected_user_id in self.active_connections:
            if connected_user_id != user_id:
                await self.send_personal_message(json.dumps(status_message), connected_user_id)

    def get_online_users(self) -> List[int]:
        """get list of currently online user ids"""
        return list(self.active_connections.keys())

# global instance
manager = ConnectionManager()