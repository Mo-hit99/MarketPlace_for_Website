import os
import zipfile
import shutil
from fastapi import UploadFile, HTTPException
from app.models.app import FrameworkType
from pathlib import Path
import json

UPLOAD_DIR = "storage/uploads"

class AppService:
    @staticmethod
    async def save_upload(file: UploadFile, app_id: int) -> str:
        upload_path = Path(UPLOAD_DIR) / str(app_id)
        if upload_path.exists():
            shutil.rmtree(upload_path)
        upload_path.mkdir(parents=True, exist_ok=True)
        
        file_location = upload_path / "source.zip"
        with open(file_location, "wb+") as file_object:
            shutil.copyfileobj(file.file, file_object)
            
        return str(file_location)

    @staticmethod
    def extract_zip(zip_path: str, extract_to: str):
        with zipfile.ZipFile(zip_path, 'r') as zip_ref:
            zip_ref.extractall(extract_to)

    @staticmethod
    def detect_framework(source_path: str) -> FrameworkType:
        # Check for package.json
        package_json_path = Path(source_path) / "package.json"
        if package_json_path.exists():
            try:
                with open(package_json_path, 'r') as f:
                    data = json.load(f)
                    dependencies = data.get("dependencies", {})
                    if "react" in dependencies:
                        return FrameworkType.REACT
                    return FrameworkType.NODE
            except:
                return FrameworkType.NODE # Default to Node if parse fails but file exists
        
        # Check for Python
        if (Path(source_path) / "requirements.txt").exists() or \
           (Path(source_path) / "pyproject.toml").exists():
            return FrameworkType.PYTHON
            
        return FrameworkType.UNKNOWN

    @staticmethod
    def process_upload(app_id: int) -> tuple[str, FrameworkType]:
        """
        Extracts zip and detects framework.
        Returns (source_path, framework_type).
        """
        base_path = Path(UPLOAD_DIR) / str(app_id)
        zip_path = base_path / "source.zip"
        extract_path = base_path / "source"
        
        if extract_path.exists():
            shutil.rmtree(extract_path)
        extract_path.mkdir()
        
        try:
            AppService.extract_zip(str(zip_path), str(extract_path))
        except zipfile.BadZipFile:
             raise HTTPException(status_code=400, detail="Invalid ZIP file")
             
        # Detect framework
        # We might need to handle nested folders if user zipped the folder itself
        # Simplified: Check root and first level children
        framework = AppService.detect_framework(str(extract_path))
        if framework == FrameworkType.UNKNOWN:
            # check one level deeper
            for child in extract_path.iterdir():
                if child.is_dir():
                    framework = AppService.detect_framework(str(child))
                    if framework != FrameworkType.UNKNOWN:
                        return str(child), framework
                        
        return str(extract_path), framework
