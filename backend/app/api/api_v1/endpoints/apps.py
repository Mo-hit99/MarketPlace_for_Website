from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
import os
import shutil
import logging
from pathlib import Path

from app import models
from app.schemas import app as app_schemas
from app.api import deps
from app.core.database import get_db
from app.services.app_service import AppService
from app.services.image_storage_service import ImageStorageService

router = APIRouter()
logger = logging.getLogger(__name__)

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
    
    # Ensure the images directory exists for this app
    try:
        from app.utils.storage_utils import ensure_storage_directory
        ensure_storage_directory(app.id, "images")
        logger.info(f"Created images directory for app {app.id}")
    except Exception as e:
        logger.warning(f"Failed to create images directory for app {app.id}: {e}")
    
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

@router.post("/{app_id}/images")
async def upload_app_images(
    *,
    db: Session = Depends(get_db),
    app_id: int,
    files: List[UploadFile] = File(...),
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Upload app images using robust storage service.
    """
    app = db.query(models.App).filter(models.App.id == app_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="App not found")
    if app.developer_id != current_user.id and current_user.role != models.UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    try:
        # Log the upload attempt
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"Starting image upload for app {app_id}, {len(files)} files")
        
        # Ensure images directory exists before upload
        from app.utils.storage_utils import ensure_storage_directory
        ensure_storage_directory(app_id, "images")
        
        # Use robust storage service
        upload_results = ImageStorageService.save_multiple_files(files, app_id)
        
        # Extract paths for database
        uploaded_images = [result[0] for result in upload_results]
        
        # Update app with new images
        current_images = app.images or []
        current_images.extend(uploaded_images)
        app.images = current_images
        
        db.commit()
        db.refresh(app)
        
        # Log success
        logger.info(f"Successfully uploaded {len(files)} images for app {app_id}")
        
        # Return success response
        total_size = sum(result[1] for result in upload_results)
        return {
            "message": f"Successfully uploaded {len(files)} images",
            "images": uploaded_images,
            "total_size": total_size,
            "count": len(uploaded_images),
            "app_id": app_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Image upload failed for app {app_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

@router.post("/{app_id}/logo")
async def upload_app_logo(
    *,
    db: Session = Depends(get_db),
    app_id: int,
    file: UploadFile = File(...),
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Upload app logo using robust storage service.
    """
    app = db.query(models.App).filter(models.App.id == app_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="App not found")
    if app.developer_id != current_user.id and current_user.role != models.UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    try:
        # Log the upload attempt
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"Starting logo upload for app {app_id}")
        
        # Ensure images directory exists before upload
        from app.utils.storage_utils import ensure_storage_directory
        ensure_storage_directory(app_id, "images")
        
        # Use robust storage service
        relative_path, file_size = ImageStorageService.save_logo(file, app_id)
        
        # Update app with logo URL
        app.logo_url = relative_path
        
        db.commit()
        db.refresh(app)
        
        # Log success
        logger.info(f"Successfully uploaded logo for app {app_id}: {relative_path}")
        
        return {
            "message": "Logo uploaded successfully",
            "logo_url": relative_path,
            "size": file_size,
            "app_id": app_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Logo upload failed for app {app_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Logo upload failed: {str(e)}")

@router.delete("/{app_id}/images/{image_name}")
def delete_app_image(
    *,
    db: Session = Depends(get_db),
    app_id: int,
    image_name: str,
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Delete a specific app image.
    """
    app = db.query(models.App).filter(models.App.id == app_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="App not found")
    if app.developer_id != current_user.id and current_user.role != models.UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Remove from database
    if app.images:
        app.images = [img for img in app.images if not img.endswith(image_name)]
        db.commit()
    
    # Remove file using the service
    deleted = ImageStorageService.delete_file(app_id, image_name)
    
    return {
        "message": "Image deleted successfully",
        "file_deleted": deleted
    }

@router.get("/{app_id}/images/{image_name}")
def get_app_image(
    app_id: int,
    image_name: str,
) -> Any:
    """
    Serve app images.
    """
    from app.utils.storage_utils import get_file_path
    import logging
    
    logger = logging.getLogger(__name__)
    logger.info(f"Serving image request: app_id={app_id}, image_name={image_name}")
    
    file_path = get_file_path(app_id, image_name, "images")
    logger.info(f"Resolved file path: {file_path}")
    
    if not file_path.exists():
        logger.warning(f"Image not found: {file_path}")
        
        # Check if the images directory exists
        images_dir = file_path.parent
        logger.info(f"Images directory exists: {images_dir.exists()}")
        
        if images_dir.exists():
            available_files = list(images_dir.iterdir())
            logger.info(f"Available files in directory: {[f.name for f in available_files]}")
        
        raise HTTPException(status_code=404, detail="Image not found")
    
    logger.info(f"Serving image: {file_path}")
    return FileResponse(file_path)

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
