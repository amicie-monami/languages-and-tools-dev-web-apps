from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.database import engine, Base
import logging

# Import models so they register with Base
from app.models.user import User
from app.models.chat import Chat, ChatParticipant, Contact  
from app.models.message import Message

from app.routers import auth, users, chats, messages, contacts, websocket

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Messenger API",
    description="Backend API для мессенджера",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc"
)

# Configure CORS properly
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000", 
        "http://127.0.0.1:5500",
        "http://localhost:5173",
        "http://localhost:8080",
        "http://localhost:8000",
        "null"  # Для локальных HTML файлов
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    allow_origin_regex=r"http://localhost:\d+"
)

# Mount static files for avatars
app.mount("/static", StaticFiles(directory="static"), name="static")

# Include routers with /api prefix
app.include_router(auth.router, prefix="/api/auth", tags=["authentication"])
app.include_router(users.router, prefix="/api/users", tags=["users"])
app.include_router(chats.router, prefix="/api/chats", tags=["chats"])
app.include_router(contacts.router, prefix="/api/contacts", tags=["contacts"])
app.include_router(messages.router, prefix="/api/messages", tags=["messages"])
app.include_router(websocket.router, tags=["websocket"])

@app.get("/")
async def root():
    return {"message": "Messenger API is running", "version": "1.0.0"}

@app.get("/api/")
async def api_root():
    return {
        "message": "Messenger API", 
        "version": "1.0.0",
        "endpoints": {
            "auth": "/api/auth",
            "users": "/api/users", 
            "chats": "/api/chats",
            "messages": "/api/messages",
            "websocket": "/ws",
            "docs": "/api/docs"
        }
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy", "database": "connected"}