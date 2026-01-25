import os
import httpx
import asyncio
import base64
import zipfile
from typing import Optional, Dict, Any
from pathlib import Path
from app.models.app import FrameworkType, App
from app.core.config import settings
from app.services.framework_detector import FrameworkDetector
from app.services.deployment_logger import deployment_logger

class DeploymentService:
    @staticmethod
    async def deploy_to_vercel(app: App) -> Optional[str]:
        """
        Deploy app to Vercel using their deployment API with smart framework detection
        """
        app_id = app.id
        
        if not settings.VERCEL_TOKEN:
            deployment_logger.add_log(app_id, "error", "⚠️ VERCEL_TOKEN not configured - cannot deploy to Vercel")
            return None
        
        deployment_logger.add_log(app_id, "info", "🔑 Vercel token configured, proceeding with deployment")
        
        headers = {
            "Authorization": f"Bearer {settings.VERCEL_TOKEN}",
            "Content-Type": "application/json"
        }
        
        try:
            # Step 1: Detect framework type
            deployment_logger.add_log(app_id, "info", f"🔍 Detecting framework for app {app.id}...")
            detected_framework, config_details = FrameworkDetector.detect_framework(app.source_path)
            
            deployment_logger.add_log(app_id, "success", f"📊 Framework Detection Complete:")
            deployment_logger.add_log(app_id, "info", f"   • Detected: {detected_framework}")
            deployment_logger.add_log(app_id, "info", f"   • Confidence: {config_details.get('confidence', 0)}%")
            deployment_logger.add_log(app_id, "info", f"   • Framework: {config_details.get('framework', 'unknown')}")
            deployment_logger.add_log(app_id, "info", f"   • Deployment Type: {config_details.get('deployment_type', 'static')}")
            
            # Update app framework if detection is confident
            if config_details.get('confidence', 0) > 70:
                app.framework = detected_framework
                deployment_logger.add_log(app_id, "success", f"✅ Updated app framework to: {detected_framework}")
            
            # Step 2: Prepare files for deployment
            deployment_logger.add_log(app_id, "info", "📦 Preparing files for deployment...")
            files = await DeploymentService._prepare_files_for_vercel(app)
            if not files:
                deployment_logger.add_log(app_id, "error", "❌ No files found for deployment")
                return None
            
            deployment_logger.add_log(app_id, "success", f"✅ Prepared {len(files)} files for deployment")
            
            # Step 3: Create deployment configuration
            deployment_logger.add_log(app_id, "info", "⚙️ Creating deployment configuration...")
            sanitized_name = app.name.lower()
            sanitized_name = ''.join(c if c.isalnum() else '-' for c in sanitized_name)
            sanitized_name = sanitized_name.strip('-')[:50]
            
            if not sanitized_name:
                sanitized_name = "saas-app"
            
            deployment_data = {
                "name": f"app-{app.id}-{sanitized_name}",
                "files": files,
                "target": "production"
            }
            
            # Step 4: Add framework-specific configuration
            deployment_type = config_details.get('deployment_type', 'static')
            framework = config_details.get('framework', 'unknown')
            
            deployment_logger.add_log(app_id, "info", f"🔧 Configuring for {framework} ({deployment_type})")
            
            # Always provide projectSettings to avoid Vercel API errors
            project_settings = {}
            
            if deployment_type == "static":
                if framework == "vite":
                    deployment_logger.add_log(app_id, "info", "📦 Configuring Vite build settings")
                    project_settings = {
                        "framework": "vite",
                        "buildCommand": "vite build",
                        "outputDirectory": "dist",
                        "installCommand": "npm install"
                    }
                elif framework == "create-react-app":
                    deployment_logger.add_log(app_id, "info", "📦 Configuring Create React App settings")
                    project_settings = {
                        "framework": "create-react-app", 
                        "buildCommand": "npm run build",
                        "outputDirectory": "build",
                        "installCommand": "npm install"
                    }
                else:
                    deployment_logger.add_log(app_id, "info", "📦 Configuring static site settings")
                    project_settings = {
                        "framework": None,
                        "buildCommand": "npm run build",
                        "outputDirectory": "dist",
                        "installCommand": "npm install"
                    }
                
            elif deployment_type == "nextjs":
                deployment_logger.add_log(app_id, "info", "📦 Configuring Next.js settings")
                project_settings = {
                    "framework": "nextjs",
                    "buildCommand": "npm run build",
                    "outputDirectory": ".next",
                    "installCommand": "npm install"
                }
                
            elif deployment_type == "server":
                if detected_framework == FrameworkType.NODE:
                    deployment_logger.add_log(app_id, "info", "📦 Configuring Node.js server settings")
                    project_settings = {
                        "framework": "nodejs",
                        "buildCommand": "npm run build",
                        "installCommand": "npm install"
                    }
                elif detected_framework == FrameworkType.PYTHON:
                    deployment_logger.add_log(app_id, "info", "📦 Configuring Python application settings")
                    project_settings = {
                        "framework": "python",
                        "buildCommand": "pip install -r requirements.txt",
                        "installCommand": "pip install -r requirements.txt"
                    }
            
            # Add projectSettings to deployment data
            deployment_data["projectSettings"] = project_settings
            
            async with httpx.AsyncClient(timeout=60.0) as client:
                deployment_logger.add_log(app_id, "info", f"🚀 Starting Vercel deployment...")
                deployment_logger.add_log(app_id, "info", f"📊 Uploading {len(files)} files...")
                
                response = await client.post(
                    "https://api.vercel.com/v13/deployments",
                    headers=headers,
                    json=deployment_data
                )
                
                deployment_logger.add_log(app_id, "info", f"📡 Vercel API Response: {response.status_code}")
                
                if response.status_code in [200, 201]:
                    result = response.json()
                    deployment_url = result.get("url")
                    if deployment_url:
                        full_url = f"https://{deployment_url}"
                        deployment_logger.add_log(app_id, "success", f"✅ Vercel deployment successful!")
                        deployment_logger.add_log(app_id, "success", f"🌐 Live URL: {full_url}")
                        
                        # Log deployment details
                        deployment_id = result.get("id", "unknown")
                        deployment_logger.add_log(app_id, "info", f"📋 Deployment ID: {deployment_id}")
                        deployment_logger.add_log(app_id, "info", f"🎯 Framework: {framework} ({deployment_type})")
                        deployment_logger.add_log(app_id, "success", "🎉 Application is now live and accessible!")
                        
                        return full_url
                    else:
                        deployment_logger.add_log(app_id, "error", "❌ Deployment created but no URL returned")
                        deployment_logger.add_log(app_id, "info", f"📄 Response: {result}")
                        return None
                else:
                    error_text = response.text
                    deployment_logger.add_log(app_id, "error", f"❌ Vercel deployment failed: {response.status_code}")
                    deployment_logger.add_log(app_id, "error", f"📄 Error details: {error_text}")
                    
                    # Try to parse error for more details
                    try:
                        error_json = response.json()
                        if "error" in error_json:
                            error_msg = error_json["error"].get("message", "Unknown error")
                            deployment_logger.add_log(app_id, "error", f"🔍 Specific error: {error_msg}")
                    except:
                        pass
                    
                    return None
                    
        except Exception as e:
            deployment_logger.add_log(app_id, "error", f"❌ Vercel deployment error: {e}")
            import traceback
            traceback.print_exc()
            return None

    @staticmethod
    def _get_vercel_framework(framework: FrameworkType) -> str:
        """Map framework types to Vercel's accepted values"""
        framework_mapping = {
            FrameworkType.REACT: "create-react-app",
            FrameworkType.NODE: "nextjs",
            FrameworkType.PYTHON: "python"
        }
        return framework_mapping.get(framework, "static")

    @staticmethod
    async def _prepare_files_for_vercel(app: App) -> Optional[list]:
        """Prepare files from uploaded ZIP for Vercel deployment"""
        app_id = app.id
        
        if not app.source_path or not os.path.exists(app.source_path):
            deployment_logger.add_log(app_id, "error", f"❌ Source path not found: {app.source_path}")
            return None
        
        files = []
        
        try:
            # If source_path is a ZIP file, extract it first
            if app.source_path.endswith('.zip'):
                deployment_logger.add_log(app_id, "info", "📦 Extracting ZIP file...")
                extract_path = app.source_path.replace('.zip', '_extracted')
                os.makedirs(extract_path, exist_ok=True)
                
                with zipfile.ZipFile(app.source_path, 'r') as zip_ref:
                    zip_ref.extractall(extract_path)
                
                source_dir = extract_path
                deployment_logger.add_log(app_id, "success", "✅ ZIP file extracted successfully")
            else:
                source_dir = app.source_path
            
            deployment_logger.add_log(app_id, "info", f"📁 Scanning directory: {source_dir}")
            
            # Walk through all files and prepare them for Vercel
            for root, dirs, filenames in os.walk(source_dir):
                # Skip common directories that shouldn't be deployed
                dirs[:] = [d for d in dirs if d not in ['.git', 'node_modules', '__pycache__', '.venv', 'venv', '.next']]
                
                for filename in filenames:
                    file_path = os.path.join(root, filename)
                    relative_path = os.path.relpath(file_path, source_dir)
                    
                    # Skip certain file types and problematic files
                    if filename.startswith('.') and filename not in ['.env.example', '.gitignore']:
                        continue
                    
                    # Skip vercel.json to avoid conflicts (we'll configure via API)
                    if filename.lower() == 'vercel.json':
                        deployment_logger.add_log(app_id, "warning", f"⚠️ Skipping vercel.json to avoid conflicts: {relative_path}")
                        continue
                    
                    # Skip large files
                    try:
                        file_size = os.path.getsize(file_path)
                        if file_size > 10 * 1024 * 1024:  # Skip files larger than 10MB
                            deployment_logger.add_log(app_id, "warning", f"⚠️ Skipping large file: {relative_path} ({file_size} bytes)")
                            continue
                    except:
                        continue
                    
                    try:
                        # Read file content
                        with open(file_path, 'rb') as f:
                            content = f.read()
                        
                        # Use forward slashes for Vercel
                        vercel_path = relative_path.replace('\\', '/')
                        
                        # Determine if file should be base64 encoded or plain text
                        text_extensions = {'.json', '.js', '.ts', '.jsx', '.tsx', '.html', '.htm', '.css', '.scss', '.sass', '.less', '.md', '.txt', '.xml', '.svg', '.yml', '.yaml', '.toml', '.ini', '.cfg', '.conf'}
                        file_extension = os.path.splitext(filename)[1].lower()
                        
                        if file_extension in text_extensions:
                            # Send as plain text for text files
                            try:
                                text_content = content.decode('utf-8')
                                
                                # Validate JSON files
                                if filename.endswith('.json'):
                                    try:
                                        import json
                                        json.loads(text_content)
                                        deployment_logger.add_log(app_id, "success", f"✅ Valid JSON: {vercel_path}")
                                    except json.JSONDecodeError as json_error:
                                        deployment_logger.add_log(app_id, "error", f"❌ Invalid JSON file {vercel_path}: {json_error}")
                                        continue
                                
                                files.append({
                                    "file": vercel_path,
                                    "data": text_content
                                })
                                
                            except UnicodeDecodeError:
                                # If can't decode as UTF-8, treat as binary
                                encoded_content = base64.b64encode(content).decode('utf-8')
                                files.append({
                                    "file": vercel_path,
                                    "data": encoded_content,
                                    "encoding": "base64"
                                })
                        else:
                            # Encode binary files as base64
                            encoded_content = base64.b64encode(content).decode('utf-8')
                            files.append({
                                "file": vercel_path,
                                "data": encoded_content,
                                "encoding": "base64"
                            })
                        
                    except Exception as e:
                        deployment_logger.add_log(app_id, "warning", f"⚠️ Skipping file {relative_path}: {e}")
                        continue
            
            # Ensure we have an index.html for static sites
            has_index = any(f["file"] in ["index.html", "index.htm"] for f in files)
            has_package_json = any(f["file"] == "package.json" for f in files)
            
            # Create index.html for ALL apps that don't have one (not just React)
            if not has_index:
                deployment_logger.add_log(app_id, "info", "📄 Creating default index.html...")
                # Create a default index.html
                default_html = """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SaaS App</title>
    <style>
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
            text-align: center; 
            padding: 50px; 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            margin: 0;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .container { 
            background: white;
            padding: 2rem;
            border-radius: 1rem;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            max-width: 600px; 
        }
        h1 { color: #333; }
        p { color: #666; line-height: 1.6; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🚀 SaaS Application</h1>
        <p>Your application has been successfully deployed!</p>
        <p>This is a default page. Upload your own index.html to customize.</p>
    </div>
</body>
</html>"""
                
                files.append({
                    "file": "index.html",
                    "data": default_html
                })
                deployment_logger.add_log(app_id, "success", "✅ Added default index.html")
            
            # Add a basic package.json if missing for React apps
            if not has_package_json and app.framework == FrameworkType.REACT:
                deployment_logger.add_log(app_id, "info", "📄 Creating default package.json for React app...")
                default_package_json = {
                    "name": f"app-{app.id}",
                    "version": "1.0.0",
                    "private": True,
                    "scripts": {
                        "build": "echo 'Static build complete'",
                        "start": "echo 'Static site ready'"
                    },
                    "dependencies": {},
                    "devDependencies": {}
                }
                import json
                package_content = json.dumps(default_package_json, indent=2, ensure_ascii=False)
                
                files.append({
                    "file": "package.json",
                    "data": package_content
                })
                deployment_logger.add_log(app_id, "success", "✅ Added default package.json")
            
            deployment_logger.add_log(app_id, "success", f"📊 Prepared {len(files)} files for Vercel deployment")
            
            # Log first few files for debugging
            deployment_logger.add_log(app_id, "info", "📋 Files to deploy:")
            for i, file_info in enumerate(files[:3]):
                deployment_logger.add_log(app_id, "info", f"  • {file_info['file']}")
            if len(files) > 3:
                deployment_logger.add_log(app_id, "info", f"  • ... and {len(files) - 3} more files")
            
            return files if files else None
            
        except Exception as e:
            deployment_logger.add_log(app_id, "error", f"❌ Error preparing files: {e}")
            import traceback
            traceback.print_exc()
            return None

    @staticmethod
    async def deploy_to_render(app: App) -> Optional[str]:
        """
        Deploy app to Render - Simplified for demo
        """
        print("⚠️  Render deployment disabled - focusing on Vercel only")
        return None

    @staticmethod
    def generate_github_action_workflow(app: App, provider: str) -> str:
        """
        Generates the content of .github/workflows/deploy.yml
        """
        if provider != "vercel":
            return ""
        
        workflow_content = f"""name: Deploy to Vercel

on:
  push:
    branches: [ main ]
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
"""
        
        if app.framework == FrameworkType.NODE or app.framework == FrameworkType.REACT:
            workflow_content += """
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install Dependencies
        run: npm ci
      
      - name: Build
        run: npm run build
"""
        elif app.framework == FrameworkType.PYTHON:
            workflow_content += """
      - name: Setup Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'
          cache: 'pip'
      
      - name: Install Dependencies
        run: pip install -r requirements.txt
"""

        workflow_content += f"""
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{{{ secrets.VERCEL_TOKEN }}}}
          vercel-org-id: ${{{{ secrets.VERCEL_ORG_ID }}}}
          vercel-project-id: ${{{{ secrets.VERCEL_PROJECT_ID }}}}
          working-directory: ./
          vercel-args: '--prod'
"""
        
        # Add callback to platform
        workflow_content += f"""
      - name: Callback to Platform
        if: success()
        run: |
          curl -X POST "http://localhost:8000/api/v1/deployments/webhook" \\
          -H "Content-Type: application/json" \\
          -d '{{"app_id": {app.id}, "status": "deployed", "live_url": "${{{{ steps.deploy.outputs.preview-url || 'https://deployed-app.com' }}"}}"}}' || true
"""
        return workflow_content

    @staticmethod
    def create_workflow_file(app_source_path: str, content: str):
         github_dir = os.path.join(app_source_path, ".github", "workflows")
         os.makedirs(github_dir, exist_ok=True)
         with open(os.path.join(github_dir, "deploy.yml"), "w") as f:
             f.write(content)

    @staticmethod
    def create_vercel_config(app_source_path: str, app: App):
        """Create vercel.json configuration with proper validation"""
        try:
            # Sanitize app name for Vercel (only lowercase letters, numbers, hyphens)
            sanitized_name = app.name.lower()
            sanitized_name = ''.join(c if c.isalnum() else '-' for c in sanitized_name)
            sanitized_name = sanitized_name.strip('-')[:50]  # Limit length and remove leading/trailing hyphens
            
            if not sanitized_name:
                sanitized_name = "saas-app"
            
            config = {
                "version": 2,
                "name": f"app-{app.id}-{sanitized_name}"
            }
            
            if app.framework == FrameworkType.REACT:
                config["builds"] = [
                    {
                        "src": "package.json",
                        "use": "@vercel/static-build",
                        "config": {
                            "distDir": "dist"
                        }
                    }
                ]
                config["routes"] = [
                    {
                        "handle": "filesystem"
                    },
                    {
                        "src": "/(.*)",
                        "dest": "/index.html"
                    }
                ]
            elif app.framework == FrameworkType.NODE:
                config["builds"] = [
                    {
                        "src": "package.json", 
                        "use": "@vercel/node"
                    }
                ]
            elif app.framework == FrameworkType.PYTHON:
                config["builds"] = [
                    {
                        "src": "*.py",
                        "use": "@vercel/python"
                    }
                ]
            else:
                # For UNKNOWN or static sites, use static deployment with proper routing
                config["builds"] = [
                    {
                        "src": "**/*",
                        "use": "@vercel/static"
                    }
                ]
                config["routes"] = [
                    {
                        "handle": "filesystem"
                    },
                    {
                        "src": "/(.*)",
                        "dest": "/index.html"
                    }
                ]
            
            # Validate JSON before writing
            import json
            json_string = json.dumps(config, indent=2, ensure_ascii=False)
            
            # Validate by parsing it back
            parsed_config = json.loads(json_string)
            
            # Write to file
            vercel_json_path = os.path.join(app_source_path, "vercel.json")
            with open(vercel_json_path, "w", encoding='utf-8') as f:
                f.write(json_string)
            
            print(f"✅ Created valid vercel.json for app {app.id}")
            print(f"📄 Config: {json_string}")
            
        except Exception as e:
            print(f"❌ Failed to create vercel.json: {e}")
            # Create a minimal fallback config
            try:
                fallback_config = {
                    "version": 2
                }
                import json
                with open(os.path.join(app_source_path, "vercel.json"), "w", encoding='utf-8') as f:
                    json.dump(fallback_config, f, indent=2)
                print(f"✅ Created fallback vercel.json")
            except Exception as fallback_error:
                print(f"❌ Even fallback config failed: {fallback_error}")
                raise
