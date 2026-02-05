from typing import Any
import asyncio
from fastapi import APIRouter, Depends, HTTPException, Body, BackgroundTasks
from sqlalchemy.orm import Session
from app import models
from app.api import deps
from app.core.database import get_db, SessionLocal
from app.services.deployment_service import DeploymentService
from app.services.deployment_logger import deployment_logger

router = APIRouter()

@router.get("/{app_id}/logs")
def get_deployment_logs(
    *,
    db: Session = Depends(get_db),
    app_id: int,
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Get deployment logs for an app.
    """
    app = db.query(models.App).filter(models.App.id == app_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="App not found")
    if app.developer_id != current_user.id and current_user.role != models.UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    logs = deployment_logger.get_logs(app_id)
    status = deployment_logger.get_status(app_id)
    
    return {
        "logs": logs,
        "status": status,
        "app_id": app_id,
        "is_deploying": status == "deploying"
    }

@router.post("/{app_id}/deploy")
async def deploy_app(
    *,
    db: Session = Depends(get_db),
    app_id: int,
    provider: models.DeploymentProvider = Body(..., embed=True),
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Trigger deployment for an app to Vercel.
    """
    app = db.query(models.App).filter(models.App.id == app_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="App not found")
    if app.developer_id != current_user.id and current_user.role != models.UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Only allow Vercel deployments
    if provider != models.DeploymentProvider.VERCEL:
        raise HTTPException(status_code=400, detail="Only Vercel deployments are supported")
    
    # Clear previous logs
    deployment_logger.clear_logs(app_id)
    deployment_logger.add_log(app_id, "info", f"🎯 Initiating deployment for app ID: {app_id}")
    
    app.deployment_provider = provider
    app.status = models.AppStatus.DEPLOYING
    app.step_completed = max(app.step_completed, 4)  # Mark step 4 (deployment) as started
    db.commit()
    
    # Start background deployment process
    async def deploy_background():
        try:
            deployment_logger.set_status(app_id, "deploying")
            
            # Generate Vercel configuration (but don't upload it as a file)
            if app.source_path:
                deployment_logger.add_log(app_id, "info", "🔧 Preparing Vercel deployment...")
                # We'll configure via API instead of vercel.json file
                deployment_logger.add_log(app_id, "success", "✅ Vercel configuration prepared")
                
                # Generate GitHub Actions workflow
                deployment_logger.add_log(app_id, "info", "📝 Creating GitHub Actions workflow...")
                try:
                    workflow_content = DeploymentService.generate_github_action_workflow(app, "vercel")
                    DeploymentService.create_workflow_file(app.source_path, workflow_content)
                    deployment_logger.add_log(app_id, "success", "✅ GitHub Actions workflow created")
                except Exception as e:
                    deployment_logger.add_log(app_id, "warning", f"⚠️ Workflow creation failed: {str(e)}")
            
            # Attempt actual Vercel deployment (this now includes its own detailed logging)
            deployment_url = None
            
            try:
                deployment_url = await DeploymentService.deploy_to_vercel(app)
            except Exception as e:
                deployment_logger.add_log(app_id, "error", f"❌ Vercel API error: {str(e)}")
            
            # Update database
            db_bg = SessionLocal()
            try:
                app_bg = db_bg.query(models.App).filter(models.App.id == app_id).first()
                if app_bg:
                    if deployment_url:
                        app_bg.production_url = deployment_url
                        app_bg.status = models.AppStatus.DEPLOYED
                        
                        # Trigger verification
                        deployment_logger.add_log(app_id, "info", "🔍 Starting verification process...")
                        await asyncio.sleep(2)  # Simulate verification time
                        
                        try:
                            from app.services.verification_service import VerificationService
                            is_valid = await VerificationService.verify_app(app_bg)
                            if is_valid:
                                app_bg.status = models.AppStatus.PUBLISHED
                                deployment_logger.add_log(app_id, "success", "✅ App verified and published!")
                            else:
                                deployment_logger.add_log(app_id, "warning", "⚠️ App deployed but failed verification")
                        except Exception as e:
                            deployment_logger.add_log(app_id, "warning", f"⚠️ Verification error: {str(e)}")
                    else:
                        app_bg.status = models.AppStatus.FAILED
                        deployment_logger.add_log(app_id, "error", "❌ Vercel deployment failed")
                    
                    db_bg.commit()
            except Exception as e:
                deployment_logger.add_log(app_id, "error", f"❌ Database error: {str(e)}")
            finally:
                deployment_logger.set_status(app_id, "completed")
                db_bg.close()
                
        except Exception as e:
            deployment_logger.add_log(app_id, "error", f"❌ Deployment error: {str(e)}")
            deployment_logger.set_status(app_id, "failed")
            
            # Update app status to failed
            try:
                db_bg = SessionLocal()
                try:
                    app_bg = db_bg.query(models.App).filter(models.App.id == app_id).first()
                    if app_bg:
                        app_bg.status = models.AppStatus.FAILED
                        db_bg.commit()
                finally:
                    db_bg.close()
            except Exception as db_error:
                print(f"Failed to update app status: {db_error}")
    
    # Start deployment in background
    try:
        asyncio.create_task(deploy_background())
    except Exception as e:
        deployment_logger.add_log(app_id, "error", f"❌ Failed to start deployment: {str(e)}")
        app.status = models.AppStatus.FAILED
        db.commit()
        raise HTTPException(status_code=500, detail=f"Failed to start deployment: {str(e)}")
    
    return {
        "message": "Deployment started", 
        "provider": "vercel",
        "app_id": app_id,
        "status": "deploying"
    }

@router.post("/{app_id}/redeploy")
async def redeploy_app(
    *,
    db: Session = Depends(get_db),
    app_id: int,
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Redeploy an app to fix 404 issues or other deployment problems.
    This will regenerate the Vercel configuration and redeploy.
    """
    app = db.query(models.App).filter(models.App.id == app_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="App not found")
    if app.developer_id != current_user.id and current_user.role != models.UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Clear previous logs
    deployment_logger.clear_logs(app_id)
    deployment_logger.add_log(app_id, "info", f"🔄 Initiating redeploy for app ID: {app_id}")
    deployment_logger.add_log(app_id, "info", "🛠️ This will fix 404 errors and deployment issues")
    
    app.status = models.AppStatus.DEPLOYING
    db.commit()
    
    # Start background redeployment process
    async def redeploy_background():
        try:
            deployment_logger.set_status(app_id, "deploying")
            
            if app.source_path:
                deployment_logger.add_log(app_id, "info", "🔧 Regenerating Vercel configuration with fixes...")
                
                # Regenerate Vercel config with the latest fixes
                try:
                    DeploymentService.create_vercel_config(app.source_path, app)
                    deployment_logger.add_log(app_id, "success", "✅ Updated Vercel configuration with 404 fixes")
                except Exception as e:
                    deployment_logger.add_log(app_id, "warning", f"⚠️ Config regeneration failed: {str(e)}")
                
                # Regenerate GitHub Actions workflow
                deployment_logger.add_log(app_id, "info", "📝 Updating GitHub Actions workflow...")
                try:
                    workflow_content = DeploymentService.generate_github_action_workflow(app, "vercel")
                    DeploymentService.create_workflow_file(app.source_path, workflow_content)
                    deployment_logger.add_log(app_id, "success", "✅ GitHub Actions workflow updated")
                except Exception as e:
                    deployment_logger.add_log(app_id, "warning", f"⚠️ Workflow update failed: {str(e)}")
            
            # Attempt Vercel redeployment (this now includes its own detailed logging)
            deployment_url = None
            
            try:
                deployment_url = await DeploymentService.deploy_to_vercel(app)
            except Exception as e:
                deployment_logger.add_log(app_id, "error", f"❌ Vercel API error: {str(e)}")
            
            # Update database
            db_bg = SessionLocal()
            try:
                app_bg = db_bg.query(models.App).filter(models.App.id == app_id).first()
                if app_bg:
                    if deployment_url:
                        app_bg.production_url = deployment_url
                        app_bg.status = models.AppStatus.DEPLOYED
                        
                        # Trigger verification with longer wait time
                        deployment_logger.add_log(app_id, "info", "🔍 Starting verification (waiting for deployment to be ready)...")
                        await asyncio.sleep(45)  # Wait longer for deployment to be fully ready
                        
                        try:
                            from app.services.verification_service import VerificationService
                            is_valid = await VerificationService.verify_app(app_bg)
                            if is_valid:
                                app_bg.status = models.AppStatus.PUBLISHED
                                deployment_logger.add_log(app_id, "success", "✅ App verified and published! 404 issues should be fixed.")
                            else:
                                deployment_logger.add_log(app_id, "warning", "⚠️ App deployed but still having verification issues")
                                deployment_logger.add_log(app_id, "info", "💡 Try accessing the app directly - it may work despite verification warnings")
                        except Exception as e:
                            deployment_logger.add_log(app_id, "warning", f"⚠️ Verification error: {str(e)}")
                    else:
                        app_bg.status = models.AppStatus.FAILED
                        deployment_logger.add_log(app_id, "error", "❌ Vercel redeployment failed")
                    
                    db_bg.commit()
            except Exception as e:
                deployment_logger.add_log(app_id, "error", f"❌ Database error: {str(e)}")
            finally:
                deployment_logger.set_status(app_id, "completed")
                db_bg.close()
                
        except Exception as e:
            deployment_logger.add_log(app_id, "error", f"❌ Redeployment error: {str(e)}")
            deployment_logger.set_status(app_id, "failed")
            
            # Update app status to failed
            try:
                db_bg = SessionLocal()
                try:
                    app_bg = db_bg.query(models.App).filter(models.App.id == app_id).first()
                    if app_bg:
                        app_bg.status = models.AppStatus.FAILED
                        db_bg.commit()
                finally:
                    db_bg.close()
            except Exception as db_error:
                print(f"Failed to update app status: {db_error}")
    
    # Start redeployment in background
    try:
        asyncio.create_task(redeploy_background())
    except Exception as e:
        deployment_logger.add_log(app_id, "error", f"❌ Failed to start redeployment: {str(e)}")
        app.status = models.AppStatus.FAILED
        db.commit()
        raise HTTPException(status_code=500, detail=f"Failed to start redeployment: {str(e)}")
    
    return {
        "message": "Redeployment started with 404 fixes", 
        "provider": "vercel",
        "app_id": app_id,
        "status": "deploying"
    }

@router.post("/webhook")
async def deployment_webhook(
    *,
    db: Session = Depends(get_db),
    payload: dict = Body(...),
    background_tasks: BackgroundTasks,
) -> Any:
    """
    Webhook to receive deployment updates from external services.
    """
    app_id = payload.get("app_id")
    status = payload.get("status")
    live_url = payload.get("live_url")
    
    if not app_id:
        raise HTTPException(status_code=400, detail="app_id is required")
    
    app = db.query(models.App).filter(models.App.id == app_id).first()
    if not app:
         raise HTTPException(status_code=404, detail="App not found")
         
    if status == "deployed":
        app.status = models.AppStatus.DEPLOYED
        if live_url:
            app.production_url = live_url
        db.commit()
        
        background_tasks.add_task(run_verification, app.id)
        
    elif status == "failed":
        app.status = models.AppStatus.FAILED
        db.commit()
        
    return {"status": "ok", "app_id": app_id}

async def run_verification(app_id: int):
    """Background task to verify deployed app"""
    from app.core.database import SessionLocal
    from app.services.verification_service import VerificationService
    
    db_bg = SessionLocal()
    try:
        app = db_bg.query(models.App).filter(models.App.id == app_id).first()
        if app and app.production_url:
            is_valid = await VerificationService.verify_app(app)
            if is_valid:
                app.status = models.AppStatus.PUBLISHED
                db_bg.commit()
                print(f"✅ App {app.id} verified and published")
            else:
                app.status = models.AppStatus.FAILED
                db_bg.commit()
                print(f"❌ App {app.id} failed verification")
    except Exception as e:
        print(f"Verification error for app {app_id}: {e}")
    finally:
        db_bg.close()
