from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List, Optional
from app.database import get_db
from app.models.user import User
from app.models.chat import Contact
from app.schemas.user import UserResponse, UserUpdate
from app.auth import get_current_user

router = APIRouter()

@router.get("/me", response_model=UserResponse)
async def get_current_user_profile(current_user: User = Depends(get_current_user)):
    return current_user

@router.put("/me", response_model=UserResponse)
async def update_current_user(
    user_update: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    for field, value in user_update.dict(exclude_unset=True).items():
        setattr(current_user, field, value)
    
    db.commit()
    db.refresh(current_user)
    return current_user

@router.get("/search", response_model=List[UserResponse])
async def search_users(
    q: str = Query(..., min_length=2, description="search query"),
    limit: int = Query(20, le=50),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    users = db.query(User).filter(
        User.id != current_user.id,  # exclude current user
        or_(
            User.username.ilike(f"%{q}%"),
            User.name.ilike(f"%{q}%")
        )
    ).limit(limit).all()
    
    return users

@router.get("/contacts", response_model=List[UserResponse])
async def get_contacts(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    contacts = db.query(User).join(
        Contact, Contact.contact_user_id == User.id
    ).filter(Contact.user_id == current_user.id).all()
    
    return contacts

@router.post("/contacts/{user_id}")
async def add_contact(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot add yourself as contact"
        )
    
    # check if user exists
    contact_user = db.query(User).filter(User.id == user_id).first()
    if not contact_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # check if already in contacts
    existing_contact = db.query(Contact).filter(
        Contact.user_id == current_user.id,
        Contact.contact_user_id == user_id
    ).first()
    
    if existing_contact:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User already in contacts"
        )
    
    contact = Contact(user_id=current_user.id, contact_user_id=user_id)
    db.add(contact)
    db.commit()
    
    return {"message": "Contact added successfully"}

@router.delete("/contacts/{user_id}")
async def remove_contact(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    contact = db.query(Contact).filter(
        Contact.user_id == current_user.id,
        Contact.contact_user_id == user_id
    ).first()
    
    if not contact:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Contact not found"
        )
    
    db.delete(contact)
    db.commit()
    
    return {"message": "Contact removed successfully"}

@router.get("/{user_id}", response_model=UserResponse)
async def get_user_by_id(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    return user