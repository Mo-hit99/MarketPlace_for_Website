from fastapi import APIRouter
from app.api.api_v1.endpoints import auth, apps, deployments, subscriptions, access


api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(apps.router, prefix="/apps", tags=["apps"])
api_router.include_router(deployments.router, prefix="/deployments", tags=["deployments"])
api_router.include_router(subscriptions.router, prefix="/subscriptions", tags=["subscriptions"])
api_router.include_router(access.router, prefix="/access", tags=["access"])
