from .user import User
from .chat import Chat, ChatParticipant, Contact  
from .message import Message

# Это гарантирует что все модели загружены до создания таблиц
__all__ = ["User", "Chat", "ChatParticipant", "Contact", "Message"]