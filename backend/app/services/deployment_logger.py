import asyncio
from typing import Dict, List, Optional
from datetime import datetime
import json

class DeploymentLogger:
    """Service to manage deployment logs for real-time updates"""
    
    def __init__(self):
        self.logs: Dict[int, List[dict]] = {}  # app_id -> logs
        self.deployment_status: Dict[int, str] = {}  # app_id -> status
    
    def add_log(self, app_id: int, level: str, message: str):
        """Add a log entry for an app deployment"""
        if app_id not in self.logs:
            self.logs[app_id] = []
        
        log_entry = {
            "timestamp": datetime.now().strftime("%H:%M:%S"),
            "level": level,
            "message": message
        }
        
        self.logs[app_id].append(log_entry)
        print(f"[App {app_id}] {level.upper()}: {message}")
    
    def get_logs(self, app_id: int) -> List[dict]:
        """Get all logs for an app"""
        return self.logs.get(app_id, [])
    
    def clear_logs(self, app_id: int):
        """Clear logs for an app"""
        if app_id in self.logs:
            del self.logs[app_id]
        if app_id in self.deployment_status:
            del self.deployment_status[app_id]
    
    def set_status(self, app_id: int, status: str):
        """Set deployment status for an app"""
        self.deployment_status[app_id] = status
    
    def get_status(self, app_id: int) -> Optional[str]:
        """Get deployment status for an app"""
        return self.deployment_status.get(app_id)
    
    async def simulate_deployment_logs(self, app_id: int, app_name: str):
        """Simulate deployment logs for demo purposes"""
        steps = [
            ("info", f"🚀 Starting deployment for '{app_name}'", 0.5),
            ("info", "📦 Preparing source files...", 1.0),
            ("success", "✅ Source files prepared successfully", 0.8),
            ("info", "🔍 Detecting framework type...", 0.6),
            ("success", "✅ Framework detected: React", 0.5),
            ("info", "📤 Uploading files to Vercel...", 2.0),
            ("success", "✅ Files uploaded successfully", 0.8),
            ("info", "🔧 Configuring build settings...", 1.0),
            ("success", "✅ Build configuration complete", 0.6),
            ("info", "🏗️ Starting build process...", 1.5),
            ("info", "📦 Installing dependencies...", 2.0),
            ("success", "✅ Dependencies installed", 0.8),
            ("info", "🔨 Building application...", 2.5),
            ("success", "✅ Build completed successfully", 1.0),
            ("info", "🌐 Deploying to Vercel edge network...", 2.0),
            ("success", "✅ Deployment successful!", 0.8),
            ("info", "🔍 Running health checks...", 1.0),
            ("success", "✅ Health checks passed", 0.6),
            ("success", "🎉 Application is now live!", 0.5),
        ]
        
        self.set_status(app_id, "deploying")
        
        for level, message, delay in steps:
            await asyncio.sleep(delay)
            self.add_log(app_id, level, message)
        
        self.set_status(app_id, "completed")

# Global instance
deployment_logger = DeploymentLogger()