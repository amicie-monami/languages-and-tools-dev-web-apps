# app/routers/users.py - Полная версия
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List, Optional
from datetime import datetime
from app.database import get_db
from app.models.user import User
from app.models.chat import Contact
from app.schemas.user import UserResponse, UserUpdate, UsernameCheck
from app.auth import get_current_user

router = APIRouter()

@router.get("/test")
async def test_endpoint():
    """Test endpoint"""
    return {"message": "Users router is working", "timestamp": datetime.utcnow()}

@router.get("/me", response_model=UserResponse)
async def get_current_user_profile(current_user: User = Depends(get_current_user)):
    """Get current user profile"""
    return current_user

@router.put("/me", response_model=UserResponse)
async def update_current_user_put(
    user_update: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update current user profile via PUT"""
    # Check username availability if changing
    if user_update.username and user_update.username != current_user.username:
        existing = db.query(User).filter(
            User.username == user_update.username,
            User.id != current_user.id
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already taken"
            )
    
    # Update fields
    for field, value in user_update.dict(exclude_unset=True).items():
        if field == "avatarUrl":  # Handle alias
            setattr(current_user, "avatar_url", value)
        else:
            setattr(current_user, field, value)
    
    current_user.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(current_user)
    return current_user

@router.patch("/me", response_model=UserResponse) 
async def update_current_user_patch(
    user_update: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update current user profile via PATCH"""
    return await update_current_user_put(user_update, current_user, db)

@router.get("/username-check", response_model=UsernameCheck)
async def check_username_availability(
    username: str = Query(..., min_length=2),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Check if username is available"""
    existing = db.query(User).filter(
        User.username == username,
        User.id != current_user.id
    ).first()
    return {"available": not bool(existing)}

@router.get("/", response_model=List[UserResponse])
async def get_all_users(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all users (for UserService.preloadAllUsers)"""
    users = db.query(User).filter(User.id != current_user.id).all()
    return users

@router.post("/batch", response_model=List[UserResponse])
async def get_users_by_ids(
    request_data: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get multiple users by their IDs"""
    user_ids = request_data.get("userIds", [])
    if not user_ids:
        return []
    
    users = db.query(User).filter(User.id.in_(user_ids)).all()
    return users

@router.post("/status", response_model=dict)
async def get_users_status(
    request_data: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get online status for multiple users"""
    user_ids = request_data.get("userIds", [])
    if not user_ids:
        return {}
    
    users = db.query(User).filter(User.id.in_(user_ids)).all()
    status_map = {user.id: user.is_online for user in users}
    return status_map

@router.get("/search", response_model=List[UserResponse])
async def search_users(
    q: str = Query(..., min_length=2, description="Search query"),
    limit: int = Query(20, le=50),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Search users by name or username"""
    users = db.query(User).filter(
        User.id != current_user.id,  # Exclude current user
        or_(
            User.username.ilike(f"%{q}%"),
            User.name.ilike(f"%{q}%"),
            User.bio.ilike(f"%{q}%")
        )
    ).limit(limit).all()
    
    return users

# ЭТОТ ЭНДПОИНТ ДОЛЖЕН БЫТЬ ПОСЛЕДНИМ (он перехватывает все /{что-то})
@router.get("/{user_id}", response_model=UserResponse)
async def get_user_by_id(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user by ID"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return user


# @router.get("/{user_id}")
# async def check_is_contact(
#     user_id: int,
#     current_user: User = Depends(get_current_user),
#     db: Session = Depends(get_db)
# ):
#     """Check if user is in contacts"""
#     contact = db.query(Contact).filter(
#         Contact.user_id == current_user.id,
#         Contact.contact_user_id == user_id
#     ).first()
    
#     is_contact = bool(contact)
#     print(f"[DEBUG] User {current_user.id} checking contact {user_id}: {is_contact}")
    
#     return {"is_contact": is_contact, "user_id": user_id, "current_user_id": current_user.id}