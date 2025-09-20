from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base

# import models so they register with Base
from app.models.user import User
from app.models.chat import Chat, ChatParticipant, Contact  
from app.models.message import Message

from app.routers import auth, users, chats, messages, websocket

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Messenger API",
    description="Backend для мессенджера",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:5500"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/auth", tags=["authentication"])
app.include_router(users.router, prefix="/users", tags=["users"])
app.include_router(chats.router, prefix="/chats", tags=["chats"])
app.include_router(messages.router, prefix="/messages", tags=["messages"])
app.include_router(websocket.router, tags=["websocket"])  # add this line

@app.get("/")
async def root():
    return {"message": "Messenger API is running"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}