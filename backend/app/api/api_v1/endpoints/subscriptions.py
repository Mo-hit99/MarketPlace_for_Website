from typing import Any
from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from app import models
from app.schemas import subscription as subscription_schemas
from app.api import deps
from app.core.database import get_db
from app.services.payment_service import PaymentService
from app.core.config import settings

router = APIRouter()

@router.post("/orders", response_model=subscription_schemas.OrderResponse)
def create_order(
    *,
    db: Session = Depends(get_db),
    order_in: subscription_schemas.OrderCreate,
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Create Razorpay Order.
    """
    # Create txn record
    order = PaymentService.create_order(order_in.amount)
    
    txn = models.Transaction(
        user_id=current_user.id,
        amount=order_in.amount,
        razorpay_order_id=order["id"],
        status="created"
    )
    db.add(txn)
    db.commit()
    
    return {
        "order_id": order["id"],
        "amount": order_in.amount,
        "currency": "INR",
        "key_id": settings.RAZORPAY_KEY_ID or "dummy_key"
    }

@router.post("/verify")
def verify_payment(
    *,
    db: Session = Depends(get_db),
    payload: dict = Body(...),
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Verify payment signature and create subscription.
    Payload: {razorpay_order_id, razorpay_payment_id, razorpay_signature, app_id}
    """
    app_id = payload.get("app_id")
    # Verify signature
    # In real world, we construct dict with required fields
    if not PaymentService.verify_payment(payload):
         raise HTTPException(status_code=400, detail="Invalid signature")
         
    # Update TXN
    txn = db.query(models.Transaction).filter(models.Transaction.razorpay_order_id == payload["razorpay_order_id"]).first()
    if txn:
        txn.razorpay_payment_id = payload["razorpay_payment_id"]
        txn.status = "success"
        
    # Create Subscription
    sub = models.Subscription(
        user_id=current_user.id,
        app_id=app_id,
        status=models.SubscriptionStatus.ACTIVE
    )
    db.add(sub)
    db.commit()
    
    return {"status": "success"}

@router.get("/", response_model=list[subscription_schemas.Subscription])
def get_subscriptions(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    return db.query(models.Subscription).filter(models.Subscription.user_id == current_user.id).all()
