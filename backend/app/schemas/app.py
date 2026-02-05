from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel
from app.models.app import AppStatus, FrameworkType, DeploymentProvider, AppCategory

class AppBase(BaseModel):
    name: str
    description: Optional[str] = None
    category: Optional[AppCategory] = AppCategory.OTHER
    price: Optional[float] = 9.99
    tags: Optional[List[str]] = None
    features: Optional[List[str]] = None
    demo_url: Optional[str] = None
    support_email: Optional[str] = None
    website_url: Optional[str] = None

class AppCreate(AppBase):
    pass

class AppUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[AppCategory] = None
    price: Optional[float] = None
    tags: Optional[List[str]] = None
    features: Optional[List[str]] = None
    demo_url: Optional[str] = None
    support_email: Optional[str] = None
    website_url: Optional[str] = None

class AppStepUpdate(BaseModel):
    step_completed: int

class AppInDBBase(AppBase):
    id: int
    developer_id: int
    framework: FrameworkType
    deployment_provider: DeploymentProvider
    status: AppStatus
    source_path: Optional[str] = None
    production_url: Optional[str] = None
    step_completed: int
    created_at: datetime
    images: Optional[List[str]] = None
    logo_url: Optional[str] = None

    class Config:
        from_attributes = True

class App(AppInDBBase):
    pass
