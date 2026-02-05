"""
File Upload Service - Robust file handling for image uploads
"""
import os
import uuid
import aiofiles
from pathlib import Path
from typing import List, Optional, Tuple
from fastapi import UploadFile, HTTPException
from PIL import Image
import logging

logger = logging.getLogger(__name__)

class FileUploadService:
    """Service for handling file uploads with proper validation and storage"""
    
    # Allowed image types
    ALLOWED_IMAGE_TYPES = {
        'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 
        'image/webp', 'image/svg+xml', 'image/bmp'
    }
    
    # Maximum file sizes (in bytes)
    MAX_LOGO_SIZE = 2 * 1024 * 1024  # 2MB
    MAX_IMAGE_SIZE = 5 * 1024 * 1024  # 5MB
    
    @classmethod
    def validate_image_file(cls, file: UploadFile, is_logo: bool = False) -> None:
        """Validate uploaded image file"""
        # Check content type
        if not file.content_type or file.content_type not in cls.ALLOWED_IMAGE_TYPES:
            raise HTTPException(
                status_code=400, 
                detail=f"Invalid file type. Allowed types: {', '.join(cls.ALLOWED_IMAGE_TYPES)}"
            )
        
        # Check file size (if available)
        max_size = cls.MAX_LOGO_SIZE if is_logo else cls.MAX_IMAGE_SIZE
        file_type = "logo" if is_logo else "image"
        
        # Note: file.size might not be available for all uploads
        # We'll check size after reading the content
        
        logger.info(f"Validating {file_type}: {file.filename} ({file.content_type})")
    
    @classmethod
    def sanitize_filename(cls, filename: str) -> str:
        """Sanitize filename to prevent path traversal and other issues"""
        if not filename:
            return f"unnamed_{uuid.uuid4().hex[:8]}"
        
        # Remove path components
        filename = os.path.basename(filename)
        
        # Replace problematic characters
        filename = "".join(c for c in filename if c.isalnum() or c in "._-")
        
        # Ensure it's not empty after sanitization
        if not filename or filename.startswith('.'):
            filename = f"file_{uuid.uuid4().hex[:8]}.jpg"
        
        return filename
    
    @classmethod
    async def save_image_file(
        cls, 
        file: UploadFile, 
        app_id: int, 
        is_logo: bool = False,
        prefix: str = ""
    ) -> Tuple[str, int]:
        """
        Save uploaded image file to storage
        
        Returns:
            Tuple of (relative_path, file_size)
        """
        # Validate file
        cls.validate_image_file(file, is_logo)
        
        # Create directory with improved path resolution
        cwd = Path.cwd()
        logger.info(f"Current working directory: {cwd}")
        
        # Determine the correct storage path
        if cwd.name == "backend":
            images_dir = cwd / "storage" / "uploads" / str(app_id) / "images"
        else:
            # Try to find the backend directory
            backend_dir = None
            if (cwd / "backend").exists():
                backend_dir = cwd / "backend"
            elif "backend" in str(cwd):
                current = cwd
                while current.parent != current:
                    if current.name == "backend":
                        backend_dir = current
                        break
                    current = current.parent
            
            if backend_dir:
                images_dir = backend_dir / "storage" / "uploads" / str(app_id) / "images"
            else:
                images_dir = cwd / "backend" / "storage" / "uploads" / str(app_id) / "images"
        
        logger.info(f"Using images directory: {images_dir}")
        images_dir.mkdir(parents=True, exist_ok=True)
        
        # Sanitize filename
        original_filename = cls.sanitize_filename(file.filename or "image")
        
        # Add prefix if provided
        if prefix:
            name, ext = os.path.splitext(original_filename)
            filename = f"{prefix}_{name}{ext}"
        else:
            filename = original_filename
        
        # Ensure unique filename
        file_path = images_dir / filename
        counter = 1
        while file_path.exists():
            name, ext = os.path.splitext(original_filename)
            if prefix:
                filename = f"{prefix}_{name}_{counter}{ext}"
            else:
                filename = f"{name}_{counter}{ext}"
            file_path = images_dir / filename
            counter += 1
        
        try:
            # Read file content
            content = await file.read()
            
            # Check file size
            file_size = len(content)
            max_size = cls.MAX_LOGO_SIZE if is_logo else cls.MAX_IMAGE_SIZE
            file_type = "logo" if is_logo else "image"
            
            if file_size > max_size:
                raise HTTPException(
                    status_code=400,
                    detail=f"{file_type.title()} file too large. Maximum size: {max_size // (1024*1024)}MB"
                )
            
            if file_size == 0:
                raise HTTPException(status_code=400, detail="Empty file")
            
            # Validate image content (for non-SVG files)
            if file.content_type != 'image/svg+xml':
                try:
                    # Try to open with PIL to validate it's a real image
                    from io import BytesIO
                    img = Image.open(BytesIO(content))
                    img.verify()  # Verify it's a valid image
                except Exception as e:
                    logger.error(f"Invalid image content: {e}")
                    raise HTTPException(status_code=400, detail="Invalid image file")
            
            # Save file using aiofiles for better async handling
            async with aiofiles.open(file_path, 'wb') as f:
                await f.write(content)
            
            # Verify file was written
            if not file_path.exists() or file_path.stat().st_size != file_size:
                raise HTTPException(status_code=500, detail="Failed to save file")
            
            # Return relative path
            relative_path = f"storage/uploads/{app_id}/images/{filename}"
            
            logger.info(f"Successfully saved {file_type}: {relative_path} ({file_size} bytes)")
            return relative_path, file_size
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error saving file: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")
        finally:
            # Reset file position for potential reuse
            await file.seek(0)
    
    @classmethod
    async def save_multiple_images(
        cls, 
        files: List[UploadFile], 
        app_id: int
    ) -> List[Tuple[str, int]]:
        """
        Save multiple image files
        
        Returns:
            List of (relative_path, file_size) tuples
        """
        if not files:
            raise HTTPException(status_code=400, detail="No files provided")
        
        if len(files) > 10:  # Limit number of files
            raise HTTPException(status_code=400, detail="Too many files. Maximum 10 images allowed")
        
        results = []
        
        for i, file in enumerate(files):
            try:
                relative_path, file_size = await cls.save_image_file(file, app_id)
                results.append((relative_path, file_size))
            except Exception as e:
                logger.error(f"Failed to save file {i+1}/{len(files)}: {e}")
                # Clean up any successfully saved files
                for saved_path, _ in results:
                    try:
                        Path(saved_path).unlink(missing_ok=True)
                    except:
                        pass
                raise HTTPException(
                    status_code=500, 
                    detail=f"Failed to save file {i+1}: {str(e)}"
                )
        
        return results
    
    @classmethod
    def delete_image_file(cls, app_id: int, filename: str) -> bool:
        """Delete an image file"""
        try:
            # Use improved path resolution
            cwd = Path.cwd()
            
            if cwd.name == "backend":
                file_path = cwd / "storage" / "uploads" / str(app_id) / "images" / filename
            else:
                # Try to find the backend directory
                backend_dir = None
                if (cwd / "backend").exists():
                    backend_dir = cwd / "backend"
                elif "backend" in str(cwd):
                    current = cwd
                    while current.parent != current:
                        if current.name == "backend":
                            backend_dir = current
                            break
                        current = current.parent
                
                if backend_dir:
                    file_path = backend_dir / "storage" / "uploads" / str(app_id) / "images" / filename
                else:
                    file_path = cwd / "backend" / "storage" / "uploads" / str(app_id) / "images" / filename
            
            if file_path.exists():
                file_path.unlink()
                logger.info(f"Deleted image: {file_path}")
                return True
            return False
        except Exception as e:
            logger.error(f"Error deleting file {filename}: {e}")
            return False
    
    @classmethod
    def get_image_info(cls, app_id: int, filename: str) -> Optional[dict]:
        """Get information about an image file"""
        try:
            # Use improved path resolution
            cwd = Path.cwd()
            
            if cwd.name == "backend":
                file_path = cwd / "storage" / "uploads" / str(app_id) / "images" / filename
            else:
                # Try to find the backend directory
                backend_dir = None
                if (cwd / "backend").exists():
                    backend_dir = cwd / "backend"
                elif "backend" in str(cwd):
                    current = cwd
                    while current.parent != current:
                        if current.name == "backend":
                            backend_dir = current
                            break
                        current = current.parent
                
                if backend_dir:
                    file_path = backend_dir / "storage" / "uploads" / str(app_id) / "images" / filename
                else:
                    file_path = cwd / "backend" / "storage" / "uploads" / str(app_id) / "images" / filename
            
            if not file_path.exists():
                return None
            
            stat = file_path.stat()
            return {
                'filename': filename,
                'size': stat.st_size,
                'modified': stat.st_mtime,
                'path': str(file_path)
            }
        except Exception as e:
            logger.error(f"Error getting image info for {filename}: {e}")
            return None