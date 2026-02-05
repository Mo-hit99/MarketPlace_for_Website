from datetime import timedelta
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status, Body
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app import models
from app.schemas import user as user_schemas
from app.api import deps
from app.core import security
from app.core.config import settings
from app.core.database import get_db

router = APIRouter()

@router.post("/login/access-token", response_model=user_schemas.Token)
def login_access_token(
    db: Session = Depends(get_db), form_data: OAuth2PasswordRequestForm = Depends()
) -> Any:
    """
    OAuth2 compatible token login, get an access token for future requests
    """
    user = db.query(models.User).filter(models.User.email == form_data.username).first()
    if not user or not security.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    elif not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return {
        "access_token": security.create_access_token(
            user.id, expires_delta=access_token_expires
        ),
        "token_type": "bearer",
    }

@router.post("/signup", response_model=user_schemas.User)
def signup(
    *,
    db: Session = Depends(get_db),
    user_in: user_schemas.UserCreate,
) -> Any:
    """
    Create new user without the need to be logged in
    """
    user = db.query(models.User).filter(models.User.email == user_in.email).first()
    if user:
        raise HTTPException(
            status_code=400,
            detail="The user with this username already exists in the system",
        )
    user = models.User(
        email=user_in.email,
        hashed_password=security.get_password_hash(user_in.password),
        role=user_in.role,
        is_active=True,
        onboarding_completed=False,
        deployment_service_paid=False
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

@router.get("/me", response_model=user_schemas.User)
def read_user_me(
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Get current user.
    """
    return current_user

@router.put("/me/onboarding", response_model=user_schemas.User)
def complete_onboarding(
    *,
    db: Session = Depends(get_db),
    onboarding_data: user_schemas.OnboardingUpdate,
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Complete user onboarding process.
    """
    current_user.full_name = onboarding_data.full_name
    current_user.company = onboarding_data.company
    current_user.bio = onboarding_data.bio
    current_user.preferences = onboarding_data.preferences
    current_user.onboarding_completed = onboarding_data.onboarding_completed
    
    db.commit()
    db.refresh(current_user)
    return current_user

@router.post("/me/deployment-service/payment")
def pay_for_deployment_service(
    *,
    db: Session = Depends(get_db),
    payment_data: user_schemas.DeploymentServicePayment,
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Process one-time payment for deployment service access.
    """
    if current_user.deployment_service_paid:
        raise HTTPException(status_code=400, detail="Deployment service already paid")
    
    # Create Razorpay order for deployment service
    from app.services.payment_service import PaymentService
    
    order = PaymentService.create_order(payment_data.amount)
    
    # Create transaction record
    txn = models.Transaction(
        user_id=current_user.id,
        amount=payment_data.amount,
        razorpay_order_id=order["id"],
        status="created"
    )
    db.add(txn)
    db.commit()
    
    return {
        "order_id": order["id"],
        "amount": payment_data.amount,
        "currency": "INR",
        "key_id": settings.RAZORPAY_KEY_ID or "dummy_key",
        "message": "Complete payment to access deployment services"
    }

@router.post("/me/deployment-service/verify")
def verify_deployment_service_payment(
    *,
    db: Session = Depends(get_db),
    payload: dict = Body(...),
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Verify deployment service payment.
    """
    from app.services.payment_service import PaymentService
    
    if not PaymentService.verify_payment(payload):
        raise HTTPException(status_code=400, detail="Invalid payment signature")
    
    # Update transaction
    txn = db.query(models.Transaction).filter(
        models.Transaction.razorpay_order_id == payload["razorpay_order_id"]
    ).first()
    
    if txn:
        txn.razorpay_payment_id = payload["razorpay_payment_id"]
        txn.status = "success"
    
    # Mark deployment service as paid
    current_user.deployment_service_paid = True
    current_user.deployment_service_amount = txn.amount if txn else 99.00
    
    db.commit()
    
    return {"status": "success", "message": "Deployment service access granted"}
