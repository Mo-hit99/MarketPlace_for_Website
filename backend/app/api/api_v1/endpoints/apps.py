from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session

from app import models
from app.schemas import app as app_schemas
from app.api import deps
from app.core.database import get_db
from app.services.app_service import AppService

router = APIRouter()

@router.post("/", response_model=app_schemas.App)
def create_app(
    *,
    db: Session = Depends(get_db),
    app_in: app_schemas.AppCreate,
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Create new app metadata (Step 1: Basic Information).
    """
    if current_user.role != models.UserRole.DEVELOPER and current_user.role != models.UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    app = models.App(
        name=app_in.name,
        description=app_in.description,
        category=app_in.category,
        price=app_in.price,
        developer_id=current_user.id,
        status=models.AppStatus.DRAFT,
        step_completed=1  # Completed step 1: basic info
    )
    db.add(app)
    db.commit()
    db.refresh(app)
    return app

@router.put("/{app_id}/step", response_model=app_schemas.App)
def update_app_step(
    *,
    db: Session = Depends(get_db),
    app_id: int,
    step_update: app_schemas.AppStepUpdate,
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Update app step completion status.
    """
    app = db.query(models.App).filter(models.App.id == app_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="App not found")
    if app.developer_id != current_user.id and current_user.role != models.UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    app.step_completed = step_update.step_completed
    db.commit()
    db.refresh(app)
    return app

@router.put("/{app_id}/pricing", response_model=app_schemas.App)
def update_app_pricing(
    *,
    db: Session = Depends(get_db),
    app_id: int,
    app_update: app_schemas.AppUpdate,
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Update app pricing (Step 2: Set Price).
    """
    app = db.query(models.App).filter(models.App.id == app_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="App not found")
    if app.developer_id != current_user.id and current_user.role != models.UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    if app_update.price is not None:
        app.price = app_update.price
    if app_update.category is not None:
        app.category = app_update.category
    if app_update.description is not None:
        app.description = app_update.description
    
    app.step_completed = max(app.step_completed, 2)  # Completed step 2: pricing
    db.commit()
    db.refresh(app)
    return app

@router.post("/{app_id}/upload")
async def upload_app_source(
    *,
    db: Session = Depends(get_db),
    app_id: int,
    file: UploadFile = File(...),
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Upload app source code (Step 3: Upload ZIP/Folder).
    """
    app = db.query(models.App).filter(models.App.id == app_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="App not found")
    if app.developer_id != current_user.id and current_user.role != models.UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    await AppService.save_upload(file, app_id)
    source_path, framework = AppService.process_upload(app_id)
    
    app.source_path = source_path
    app.framework = framework
    app.step_completed = max(app.step_completed, 3)  # Completed step 3: upload
    db.commit()
    
    return {"message": "Upload successful", "framework": framework, "step_completed": 3}

@router.put("/{app_id}", response_model=app_schemas.App)
def update_app(
    *,
    db: Session = Depends(get_db),
    app_id: int,
    app_update: app_schemas.AppUpdate,
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Update app information.
    """
    app = db.query(models.App).filter(models.App.id == app_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="App not found")
    if app.developer_id != current_user.id and current_user.role != models.UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    update_data = app_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(app, field, value)
    
    db.commit()
    db.refresh(app)
    return app

@router.delete("/{app_id}")
def delete_app(
    *,
    db: Session = Depends(get_db),
    app_id: int,
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Delete an app and all related data.
    """
    app = db.query(models.App).filter(models.App.id == app_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="App not found")
    if app.developer_id != current_user.id and current_user.role != models.UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    try:
        # Clear any deployment logs for this app
        from app.services.deployment_logger import deployment_logger
        deployment_logger.clear_logs(app_id)
        
        # Delete the app (subscriptions will be automatically deleted due to CASCADE)
        db.delete(app)
        db.commit()
        
        # Clean up uploaded files if they exist
        import os
        import shutil
        if app.source_path and os.path.exists(app.source_path):
            try:
                if os.path.isfile(app.source_path):
                    os.remove(app.source_path)
                elif os.path.isdir(app.source_path):
                    shutil.rmtree(app.source_path)
                print(f"✅ Cleaned up files for app {app_id}")
            except Exception as e:
                print(f"⚠️ Failed to clean up files for app {app_id}: {e}")
        
        return {"message": "App and all related data deleted successfully"}
        
    except Exception as e:
        db.rollback()
        print(f"❌ Error deleting app {app_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to delete app: {str(e)}")

@router.get("/", response_model=List[app_schemas.App])
def read_apps(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Retrieve apps. Developers see their own apps, users see published apps.
    """
    if current_user.role == models.UserRole.DEVELOPER:
        # Developers see their own apps
        apps = db.query(models.App).filter(
            models.App.developer_id == current_user.id
        ).offset(skip).limit(limit).all()
    elif current_user.role == models.UserRole.ADMIN:
        # Admins see all apps
        apps = db.query(models.App).offset(skip).limit(limit).all()
    else:
        # Users see only published apps
        apps = db.query(models.App).filter(
            models.App.status == models.AppStatus.PUBLISHED
        ).offset(skip).limit(limit).all()
    
    return apps

@router.get("/{app_id}", response_model=app_schemas.App)
def read_app(
    *,
    db: Session = Depends(get_db),
    app_id: int,
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Get app by ID.
    """
    app = db.query(models.App).filter(models.App.id == app_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="App not found")
    
    # Check permissions
    if (app.developer_id != current_user.id and 
        current_user.role != models.UserRole.ADMIN and 
        app.status != models.AppStatus.PUBLISHED):
        raise HTTPException(status_code=403, detail="Not authorized")
    
    return app
