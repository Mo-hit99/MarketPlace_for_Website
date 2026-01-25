from datetime import timedelta
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status, Body
from sqlalchemy.orm import Session
from jose import jwt, JWTError

from app import models
from app.api import deps
from app.core import security
from app.core.config import settings
from app.core.database import get_db

router = APIRouter()

@router.get("/launch/{app_id}")
def launch_app(
    *,
    db: Session = Depends(get_db),
    app_id: int,
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Launch an app. Checks subscription and redirects with clean URL.
    """
    app = db.query(models.App).filter(models.App.id == app_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="App not found")
    
    if app.status != models.AppStatus.PUBLISHED and app.developer_id != current_user.id:
         raise HTTPException(status_code=400, detail="App is not published")

    # Check Subscription
    sub = db.query(models.Subscription).filter(
        models.Subscription.user_id == current_user.id,
        models.Subscription.app_id == app_id,
        models.Subscription.status == models.SubscriptionStatus.ACTIVE
    ).first()
    
    # Allow developer to launch their own app without subscription
    if not sub and app.developer_id != current_user.id:
         raise HTTPException(status_code=403, detail="Active subscription required")
         
    # Generate Short-lived Token (60 seconds) and store in session/cookie
    launch_token = security.create_access_token(
        subject=f"{current_user.id}:{app_id}",
        expires_delta=timedelta(seconds=60)
    )
    
    # Return clean URL without query parameters
    clean_url = app.production_url.rstrip('/')
    return {
        "url": clean_url,
        "token": launch_token,
        "user_id": current_user.id,
        "app_id": app_id
    }

@router.post("/verify-token")
def verify_launch_token(
    *,
    db: Session = Depends(get_db),
    token: str = Body(..., embed=True),
) -> Any:
    """
    Called by the App to verify the launch token and get user info.
    """
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        sub = payload.get("sub") # "user_id:app_id"
        if not sub or ":" not in sub:
             raise HTTPException(status_code=400, detail="Invalid token format")
             
        user_id_str, app_id_str = sub.split(":")
        user_id = int(user_id_str)
        
        # We could also validate that the caller is indeed the app_id (by checking origin header or API key if we had one)
        # For now, we trust the token signature.
        
        user = db.query(models.User).filter(models.User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
            
        return {
            "valid": True,
            "user": {
                "id": user.id,
                "email": user.email,
                "role": user.role
            }
        }
    except JWTError:
        raise HTTPException(status_code=403, detail="Invalid token")
