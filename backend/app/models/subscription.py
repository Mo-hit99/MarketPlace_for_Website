from sqlalchemy import Column, Integer, String, Enum, ForeignKey, DateTime, Float
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
import enum

class SubscriptionStatus(str, enum.Enum):
    ACTIVE = "active"
    CANCELED = "canceled"
    PENDING = "pending"

class Subscription(Base):
    __tablename__ = "subscriptions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    app_id = Column(Integer, ForeignKey("apps.id", ondelete="CASCADE"))
    status = Column(Enum(SubscriptionStatus), default=SubscriptionStatus.PENDING)
    razorpay_sub_id = Column(String, nullable=True) # If using Razorpay Subscriptions
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    user = relationship("User", backref="subscriptions")
    app = relationship("App")

class Transaction(Base):
    __tablename__ = "transactions"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    amount = Column(Float)
    currency = Column(String, default="INR")
    razorpay_order_id = Column(String, unique=True, index=True)
    razorpay_payment_id = Column(String, nullable=True)
    status = Column(String, default="created")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
