from sqlalchemy import Boolean, Column, Integer, String, Enum, Text, Float, DateTime
from sqlalchemy.sql import func
from app.core.database import Base
import enum

class UserRole(str, enum.Enum):
    ADMIN = "admin"
    DEVELOPER = "developer"
    USER = "user"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(Enum(UserRole), default=UserRole.USER)
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False) # For developer approval
    
    # Onboarding information
    full_name = Column(String, nullable=True)
    company = Column(String, nullable=True)
    bio = Column(Text, nullable=True)
    preferences = Column(Text, nullable=True)  # JSON string for user preferences
    onboarding_completed = Column(Boolean, default=False)
    deployment_service_paid = Column(Boolean, default=False)
    deployment_service_amount = Column(Float, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
