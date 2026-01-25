from typing import Optional
from pydantic import BaseModel, EmailStr
from datetime import datetime
from app.models.user import UserRole

class UserBase(BaseModel):
    email: EmailStr

class UserCreate(UserBase):
    password: str
    role: UserRole = UserRole.USER

class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    password: Optional[str] = None
    full_name: Optional[str] = None
    company: Optional[str] = None
    bio: Optional[str] = None
    preferences: Optional[str] = None

class OnboardingUpdate(BaseModel):
    full_name: str
    company: Optional[str] = None
    bio: Optional[str] = None
    preferences: str  # JSON string
    onboarding_completed: bool = True

class DeploymentServicePayment(BaseModel):
    amount: float = 99.00  # One-time payment for deployment service

class UserInDBBase(UserBase):
    id: int
    role: UserRole
    is_active: bool
    is_verified: bool
    full_name: Optional[str] = None
    company: Optional[str] = None
    bio: Optional[str] = None
    preferences: Optional[str] = None
    onboarding_completed: bool
    deployment_service_paid: bool
    deployment_service_amount: Optional[float] = None
    created_at: datetime

    class Config:
        from_attributes = True

class User(UserInDBBase):
    pass

class UserInDB(UserInDBBase):
    hashed_password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenPayload(BaseModel):
    sub: Optional[int] = None
