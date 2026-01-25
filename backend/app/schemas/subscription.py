from datetime import datetime
from typing import Optional
from pydantic import BaseModel
from app.models.subscription import SubscriptionStatus

class SubscriptionBase(BaseModel):
    app_id: int

class SubscriptionCreate(SubscriptionBase):
    pass

class Subscription(SubscriptionBase):
    id: int
    user_id: int
    status: SubscriptionStatus
    created_at: datetime
    
    class Config:
        from_attributes = True

class OrderCreate(BaseModel):
    app_id: int
    amount: float # In standard unit (e.g. 100.00)

class OrderResponse(BaseModel):
    order_id: str
    amount: float
    currency: str
    key_id: str
