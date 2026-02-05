from sqlalchemy import Column, Integer, String, Enum, ForeignKey, DateTime, Float, Text, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
import enum

class AppStatus(str, enum.Enum):
    DRAFT = "draft"
    DEPLOYING = "deploying"
    DEPLOYED = "deployed"
    PUBLISHED = "published"
    FAILED = "failed"

class FrameworkType(str, enum.Enum):
    REACT = "react"
    NODE = "node"
    PYTHON = "python"
    UNKNOWN = "unknown"

class DeploymentProvider(str, enum.Enum):
    VERCEL = "vercel"
    RENDER = "render"
    NONE = "none"

class AppCategory(str, enum.Enum):
    PRODUCTIVITY = "productivity"
    BUSINESS = "business"
    EDUCATION = "education"
    ENTERTAINMENT = "entertainment"
    UTILITIES = "utilities"
    SOCIAL = "social"
    FINANCE = "finance"
    HEALTH = "health"
    OTHER = "other"

class App(Base):
    __tablename__ = "apps"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    description = Column(Text, nullable=True)
    category = Column(Enum(AppCategory), default=AppCategory.OTHER)
    price = Column(Float, default=9.99)  # Monthly subscription price
    developer_id = Column(Integer, ForeignKey("users.id"))
    framework = Column(Enum(FrameworkType), default=FrameworkType.UNKNOWN)
    deployment_provider = Column(Enum(DeploymentProvider), default=DeploymentProvider.NONE)
    status = Column(Enum(AppStatus), default=AppStatus.DRAFT)
    source_path = Column(String, nullable=True) # Path to extracted code
    production_url = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Multi-step creation tracking
    step_completed = Column(Integer, default=0)  # 0=info, 1=pricing, 2=upload, 3=deploy
    
    # Image and metadata fields
    images = Column(JSON, nullable=True)  # Array of image URLs/paths
    logo_url = Column(String, nullable=True)  # Main app logo
    tags = Column(JSON, nullable=True)  # Array of tags
    features = Column(JSON, nullable=True)  # Array of key features
    demo_url = Column(String, nullable=True)  # Demo/preview URL
    support_email = Column(String, nullable=True)
    website_url = Column(String, nullable=True)
    
    developer = relationship("User", backref="apps")
