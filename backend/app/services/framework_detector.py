import os
import json
import zipfile
from typing import Optional, Dict, Any
from app.models.app import FrameworkType

class FrameworkDetector:
    """Smart framework detection for uploaded applications"""
    
    @staticmethod
    def detect_framework(source_path: str) -> tuple[FrameworkType, Dict[str, Any]]:
        """
        Detect the framework type and return configuration details
        Returns: (framework_type, config_details)
        """
        
        if not os.path.exists(source_path):
            return FrameworkType.REACT, {"reason": "default", "confidence": 0}
        
        # Extract ZIP if needed
        if source_path.endswith('.zip'):
            extract_path = source_path.replace('.zip', '_extracted')
            os.makedirs(extract_path, exist_ok=True)
            
            try:
                with zipfile.ZipFile(source_path, 'r') as zip_ref:
                    zip_ref.extractall(extract_path)
                source_dir = extract_path
            except Exception as e:
                print(f"❌ Failed to extract ZIP: {e}")
                return FrameworkType.REACT, {"reason": "zip_error", "confidence": 0}
        else:
            source_dir = source_path
        
        print(f"🔍 Detecting framework in: {source_dir}")
        
        # Look for package.json
        package_json_path = None
        for root, dirs, files in os.walk(source_dir):
            if 'package.json' in files:
                package_json_path = os.path.join(root, 'package.json')
                break
        
        if package_json_path:
            return FrameworkDetector._analyze_package_json(package_json_path, source_dir)
        
        # Look for Python files
        python_files = []
        for root, dirs, files in os.walk(source_dir):
            for file in files:
                if file.endswith('.py'):
                    python_files.append(os.path.join(root, file))
        
        if python_files:
            return FrameworkDetector._analyze_python_project(python_files, source_dir)
        
        # Look for HTML files
        html_files = []
        for root, dirs, files in os.walk(source_dir):
            for file in files:
                if file.endswith(('.html', '.htm')):
                    html_files.append(os.path.join(root, file))
        
        if html_files:
            return FrameworkType.REACT, {
                "reason": "static_html", 
                "confidence": 70,
                "files": len(html_files),
                "deployment_type": "static"
            }
        
        # Default fallback
        return FrameworkType.REACT, {"reason": "default_fallback", "confidence": 30}
    
    @staticmethod
    def _analyze_package_json(package_json_path: str, source_dir: str) -> tuple[FrameworkType, Dict[str, Any]]:
        """Analyze package.json to determine framework"""
        
        try:
            with open(package_json_path, 'r', encoding='utf-8') as f:
                package_data = json.load(f)
            
            dependencies = package_data.get('dependencies', {})
            dev_dependencies = package_data.get('devDependencies', {})
            scripts = package_data.get('scripts', {})
            all_deps = {**dependencies, **dev_dependencies}
            
            print(f"📦 Found package.json with {len(all_deps)} dependencies")
            
            # Check for Next.js
            if 'next' in all_deps:
                return FrameworkType.NODE, {
                    "reason": "nextjs_detected",
                    "confidence": 95,
                    "framework": "nextjs",
                    "version": all_deps.get('next', 'unknown'),
                    "deployment_type": "nextjs"
                }
            
            # Check for React (Create React App or Vite)
            if 'react' in all_deps:
                # Check if it's Create React App
                if 'react-scripts' in all_deps:
                    return FrameworkType.REACT, {
                        "reason": "create_react_app",
                        "confidence": 90,
                        "framework": "create-react-app",
                        "deployment_type": "static",
                        "build_command": "npm run build",
                        "output_dir": "build"
                    }
                
                # Check if it's Vite
                if 'vite' in all_deps or '@vitejs/plugin-react' in all_deps:
                    return FrameworkType.REACT, {
                        "reason": "vite_react",
                        "confidence": 90,
                        "framework": "vite",
                        "deployment_type": "static",
                        "build_command": "vite build",
                        "output_dir": "dist"
                    }
                
                # Generic React project
                return FrameworkType.REACT, {
                    "reason": "react_generic",
                    "confidence": 80,
                    "framework": "react",
                    "deployment_type": "static",
                    "build_command": scripts.get('build', 'npm run build'),
                    "output_dir": "build"
                }
            
            # Check for Vue.js
            if 'vue' in all_deps:
                return FrameworkType.NODE, {
                    "reason": "vue_detected",
                    "confidence": 85,
                    "framework": "vue",
                    "deployment_type": "static"
                }
            
            # Check for Vite (without React)
            if 'vite' in all_deps:
                return FrameworkType.REACT, {
                    "reason": "vite_detected",
                    "confidence": 85,
                    "framework": "vite",
                    "deployment_type": "static",
                    "build_command": "vite build",
                    "output_dir": "dist"
                }
            
            # Check for Angular
            if '@angular/core' in all_deps:
                return FrameworkType.NODE, {
                    "reason": "angular_detected",
                    "confidence": 85,
                    "framework": "angular",
                    "deployment_type": "static"
                }
            
            # Check for Express/Node.js server
            if 'express' in all_deps or 'fastify' in all_deps or 'koa' in all_deps:
                return FrameworkType.NODE, {
                    "reason": "node_server",
                    "confidence": 85,
                    "framework": "nodejs",
                    "deployment_type": "server"
                }
            
            # Check for static site generators
            if 'gatsby' in all_deps:
                return FrameworkType.NODE, {
                    "reason": "gatsby_detected",
                    "confidence": 90,
                    "framework": "gatsby",
                    "deployment_type": "static"
                }
            
            # Generic Node.js project
            if len(all_deps) > 0:
                return FrameworkType.NODE, {
                    "reason": "nodejs_generic",
                    "confidence": 60,
                    "framework": "nodejs",
                    "deployment_type": "static"
                }
            
        except Exception as e:
            print(f"❌ Error reading package.json: {e}")
        
        # Fallback to static React
        return FrameworkType.REACT, {
            "reason": "package_json_fallback",
            "confidence": 50,
            "deployment_type": "static"
        }
    
    @staticmethod
    def _analyze_python_project(python_files: list, source_dir: str) -> tuple[FrameworkType, Dict[str, Any]]:
        """Analyze Python files to determine framework"""
        
        framework_indicators = {
            'django': ['django', 'manage.py', 'settings.py'],
            'flask': ['flask', 'app.py', 'application.py'],
            'fastapi': ['fastapi', 'main.py', 'uvicorn'],
            'streamlit': ['streamlit', 'st.'],
            'dash': ['dash', 'plotly']
        }
        
        detected_frameworks = {}
        
        # Check requirements.txt
        requirements_path = os.path.join(source_dir, 'requirements.txt')
        if os.path.exists(requirements_path):
            try:
                with open(requirements_path, 'r') as f:
                    requirements = f.read().lower()
                
                for framework, indicators in framework_indicators.items():
                    for indicator in indicators:
                        if indicator in requirements:
                            detected_frameworks[framework] = detected_frameworks.get(framework, 0) + 1
            except Exception as e:
                print(f"❌ Error reading requirements.txt: {e}")
        
        # Check Python file contents
        for file_path in python_files[:5]:  # Check first 5 Python files
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read().lower()
                
                for framework, indicators in framework_indicators.items():
                    for indicator in indicators:
                        if indicator in content:
                            detected_frameworks[framework] = detected_frameworks.get(framework, 0) + 1
            except Exception as e:
                print(f"❌ Error reading {file_path}: {e}")
        
        # Determine most likely framework
        if detected_frameworks:
            most_likely = max(detected_frameworks, key=detected_frameworks.get)
            confidence = min(90, detected_frameworks[most_likely] * 20)
            
            return FrameworkType.PYTHON, {
                "reason": f"{most_likely}_detected",
                "confidence": confidence,
                "framework": most_likely,
                "detected_frameworks": detected_frameworks,
                "deployment_type": "server"
            }
        
        # Generic Python project
        return FrameworkType.PYTHON, {
            "reason": "python_generic",
            "confidence": 70,
            "framework": "python",
            "deployment_type": "server"
        }
    
    @staticmethod
    def get_vercel_config(framework_type: FrameworkType, config_details: Dict[str, Any]) -> Dict[str, Any]:
        """Generate appropriate Vercel configuration based on detected framework"""
        
        base_config = {"version": 2}
        
        deployment_type = config_details.get("deployment_type", "static")
        framework = config_details.get("framework", "unknown")
        
        if deployment_type == "static":
            # Static site deployment
            if framework == "create-react-app":
                base_config.update({
                    "builds": [{"src": "package.json", "use": "@vercel/static-build"}],
                    "routes": [
                        {"handle": "filesystem"},
                        {"src": "/(.*)", "dest": "/index.html"}
                    ]
                })
            elif framework == "vite":
                base_config.update({
                    "builds": [{"src": "package.json", "use": "@vercel/static-build"}],
                    "routes": [
                        {"handle": "filesystem"},
                        {"src": "/(.*)", "dest": "/index.html"}
                    ]
                })
            else:
                # Generic static site
                base_config.update({
                    "builds": [{"src": "**", "use": "@vercel/static"}]
                })
        
        elif deployment_type == "server":
            if framework_type == FrameworkType.NODE:
                base_config.update({
                    "builds": [{"src": "package.json", "use": "@vercel/node"}]
                })
            elif framework_type == FrameworkType.PYTHON:
                base_config.update({
                    "builds": [{"src": "**/*.py", "use": "@vercel/python"}]
                })
        
        elif deployment_type == "nextjs":
            # Let Vercel handle Next.js automatically
            pass
        
        return base_config