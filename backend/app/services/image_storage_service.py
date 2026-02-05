"""
Image Storage Service - Alternative robust approach for file uploads
"""
import os
import uuid
import tempfile
from pathlib import Path
from typing import List, Optional, Tuple, BinaryIO
from fastapi import UploadFile, HTTPException
import shutil
import logging

from app.utils.storage_utils import ensure_storage_directory, get_file_path, get_relative_path

logger = logging.getLogger(__name__)

class ImageStorageService:
    """
    Robust image storage service using temporary files and atomic operations
    """
    
    # Configuration
    ALLOWED_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp'}
    ALLOWED_MIME_TYPES = {
        'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 
        'image/webp', 'image/svg+xml', 'image/bmp'
    }
    MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
    MAX_FILES_PER_UPLOAD = 10
    
    @classmethod
    def validate_image(cls, file: UploadFile) -> None:
        """Validate uploaded image file"""
        # Check content type
        if not file.content_type or file.content_type not in cls.ALLOWED_MIME_TYPES:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid file type: {file.content_type}. Allowed: {', '.join(cls.ALLOWED_MIME_TYPES)}"
            )
        
        # Check file extension
        if file.filename:
            ext = Path(file.filename).suffix.lower()
            if ext not in cls.ALLOWED_EXTENSIONS:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid file extension: {ext}. Allowed: {', '.join(cls.ALLOWED_EXTENSIONS)}"
                )
    
    @classmethod
    def sanitize_filename(cls, filename: str) -> str:
        """Create a safe filename"""
        if not filename:
            return f"image_{uuid.uuid4().hex[:8]}.jpg"
        
        # Get base name and extension
        path = Path(filename)
        name = path.stem
        ext = path.suffix.lower()
        
        # Sanitize name
        safe_name = "".join(c for c in name if c.isalnum() or c in "._-")
        if not safe_name:
            safe_name = f"image_{uuid.uuid4().hex[:8]}"
        
        # Ensure valid extension
        if ext not in cls.ALLOWED_EXTENSIONS:
            ext = '.jpg'
        
        return f"{safe_name}{ext}"
    
    @classmethod
    def ensure_directory(cls, app_id: int) -> Path:
        """Ensure the images directory exists"""
        return ensure_storage_directory(app_id, "images")
    
    @classmethod
    def save_uploaded_file(cls, file: UploadFile, app_id: int, prefix: str = "") -> Tuple[str, int]:
        """
        Save uploaded file using temporary file approach for atomic operations
        
        Returns:
            Tuple of (relative_path, file_size)
        """
        # Validate the file
        cls.validate_image(file)
        
        # Ensure directory exists
        images_dir = cls.ensure_directory(app_id)
        
        # Create safe filename
        safe_filename = cls.sanitize_filename(file.filename or "image.jpg")
        if prefix:
            name, ext = os.path.splitext(safe_filename)
            safe_filename = f"{prefix}_{name}{ext}"
        
        # Ensure unique filename
        final_path = images_dir / safe_filename
        counter = 1
        while final_path.exists():
            name, ext = os.path.splitext(safe_filename)
            if prefix:
                final_path = images_dir / f"{prefix}_{name}_{counter}{ext}"
            else:
                final_path = images_dir / f"{name}_{counter}{ext}"
            counter += 1
        
        try:
            # Use temporary file for atomic operation
            with tempfile.NamedTemporaryFile(delete=False) as temp_file:
                # Copy uploaded file to temporary file
                file.file.seek(0)  # Ensure we're at the beginning
                shutil.copyfileobj(file.file, temp_file)
                temp_path = temp_file.name
            
            # Get file size
            file_size = os.path.getsize(temp_path)
            
            # Validate file size
            if file_size > cls.MAX_FILE_SIZE:
                os.unlink(temp_path)  # Clean up temp file
                raise HTTPException(
                    status_code=400,
                    detail=f"File too large: {file_size} bytes. Maximum: {cls.MAX_FILE_SIZE} bytes"
                )
            
            if file_size == 0:
                os.unlink(temp_path)  # Clean up temp file
                raise HTTPException(status_code=400, detail="Empty file")
            
            # Atomic move from temp to final location
            shutil.move(temp_path, final_path)
            
            # Verify the file was written correctly
            if not final_path.exists():
                raise HTTPException(status_code=500, detail="File verification failed - file does not exist")
                
            actual_size = final_path.stat().st_size
            if actual_size != file_size:
                raise HTTPException(status_code=500, detail="File verification failed - size mismatch")
            
            # Return relative path
            relative_path = get_relative_path(app_id, final_path.name, "images")
            
            logger.info(f"Successfully saved image: {relative_path} ({file_size} bytes)")
            return relative_path, file_size
            
        except HTTPException:
            raise
        except Exception as e:
            # Clean up temp file if it exists
            try:
                if 'temp_path' in locals():
                    os.unlink(temp_path)
            except:
                pass
            
            logger.error(f"Error saving file: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")
        finally:
            # Reset file position
            try:
                file.file.seek(0)
            except:
                pass
    
    @classmethod
    def save_multiple_files(cls, files: List[UploadFile], app_id: int) -> List[Tuple[str, int]]:
        """
        Save multiple files with rollback on failure
        
        Returns:
            List of (relative_path, file_size) tuples
        """
        if not files:
            raise HTTPException(status_code=400, detail="No files provided")
        
        if len(files) > cls.MAX_FILES_PER_UPLOAD:
            raise HTTPException(
                status_code=400, 
                detail=f"Too many files. Maximum: {cls.MAX_FILES_PER_UPLOAD}"
            )
        
        saved_files = []
        
        try:
            for i, file in enumerate(files):
                logger.info(f"Processing file {i+1}/{len(files)}: {file.filename}")
                relative_path, file_size = cls.save_uploaded_file(file, app_id)
                saved_files.append((relative_path, file_size))
            
            return saved_files
            
        except Exception as e:
            # Rollback: delete any files that were successfully saved
            logger.error(f"Upload failed, rolling back {len(saved_files)} files")
            for relative_path, _ in saved_files:
                try:
                    file_path = Path(relative_path)
                    if file_path.exists():
                        file_path.unlink()
                        logger.info(f"Rolled back: {relative_path}")
                except Exception as cleanup_error:
                    logger.error(f"Failed to cleanup {relative_path}: {cleanup_error}")
            
            raise
    
    @classmethod
    def save_logo(cls, file: UploadFile, app_id: int) -> Tuple[str, int]:
        """Save logo file with logo prefix"""
        return cls.save_uploaded_file(file, app_id, prefix="logo")
    
    @classmethod
    def delete_file(cls, app_id: int, filename: str) -> bool:
        """Delete a file"""
        try:
            file_path = get_file_path(app_id, filename, "images")
            
            if file_path.exists():
                file_path.unlink()
                logger.info(f"Deleted file: {file_path}")
                return True
            return False
        except Exception as e:
            logger.error(f"Error deleting file {filename}: {e}")
            return False
    
    @classmethod
    def get_file_info(cls, app_id: int, filename: str) -> Optional[dict]:
        """Get file information"""
        try:
            file_path = get_file_path(app_id, filename, "images")
            
            if not file_path.exists():
                return None
            
            stat = file_path.stat()
            return {
                'filename': filename,
                'size': stat.st_size,
                'path': str(file_path),
                'exists': True
            }
        except Exception as e:
            logger.error(f"Error getting file info for {filename}: {e}")
            return None