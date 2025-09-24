# app/routers/contacts.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models.user import User
from app.models.chat import Contact
from app.schemas.user import UserResponse
from app.auth import get_current_user

router = APIRouter()

@router.get("/", response_model=List[UserResponse])
async def get_contacts(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's contacts"""
    contacts = db.query(User).join(
        Contact, Contact.contact_user_id == User.id
    ).filter(Contact.user_id == current_user.id).all()
    
    return contacts

@router.post("/", status_code=status.HTTP_201_CREATED)
async def add_contact_by_body(
    request_data: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add contact via POST body"""
    user_id = request_data.get("userId")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="userId is required"
        )
    
    if user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot add yourself as contact"
        )
    
    # Check if user exists
    contact_user = db.query(User).filter(User.id == user_id).first()
    if not contact_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Check if already in contacts
    existing_contact = db.query(Contact).filter(
        Contact.user_id == current_user.id,
        Contact.contact_user_id == user_id
    ).first()
    
    if existing_contact:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User already in contacts"
        )
    
    # Add contact
    contact = Contact(user_id=current_user.id, contact_user_id=user_id)
    db.add(contact)
    db.commit()
    
    return {"message": "Contact added successfully"}

@router.delete("/{user_id}")
async def remove_contact(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Remove user from contacts"""
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

# В app/routers/contacts.py ВЕРНИТЕ обратно правильную логику:

@router.get("/{user_id}")
async def check_is_contact(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Check if user is in contacts"""
    # Сначала проверим что пользователь существует
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        # Вот ТУТ правильно использовать 404 - пользователь не существует
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    contact = db.query(Contact).filter(
        Contact.user_id == current_user.id,
        Contact.contact_user_id == user_id
    ).first()
    
    is_contact = bool(contact)
    print(f"[DEBUG] User {current_user.id} checking contact {user_id}: {is_contact}")
    
    # ВСЕГДА возвращаем 200 OK с результатом проверки
    return {"is_contact": is_contact}