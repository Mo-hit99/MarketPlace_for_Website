"""
Storage utilities for consistent path resolution across the application
"""
from pathlib import Path
import logging

logger = logging.getLogger(__name__)

def get_storage_path(app_id: int, subdir: str = "images") -> Path:
    """
    Get the storage path for a given app ID and subdirectory.
    
    Args:
        app_id: The application ID
        subdir: The subdirectory within the app's storage (default: "images")
    
    Returns:
        Path object pointing to the storage directory
    """
    cwd = Path.cwd()
    logger.debug(f"Current working directory: {cwd}")
    
    # Determine the correct storage path based on working directory
    if cwd.name == "backend":
        # Running from backend directory
        storage_dir = cwd / "storage" / "uploads" / str(app_id) / subdir
    else:
        # Try to find the backend directory
        backend_dir = None
        
        # Check if backend exists in current directory
        if (cwd / "backend").exists():
            backend_dir = cwd / "backend"
        # Check if we're in a subdirectory of backend
        elif "backend" in str(cwd):
            # Navigate up to find backend directory
            current = cwd
            while current.parent != current:
                if current.name == "backend":
                    backend_dir = current
                    break
                current = current.parent
        
        if backend_dir:
            storage_dir = backend_dir / "storage" / "uploads" / str(app_id) / subdir
        else:
            # Fallback: assume backend is in current directory
            storage_dir = cwd / "backend" / "storage" / "uploads" / str(app_id) / subdir
    
    logger.debug(f"Resolved storage path: {storage_dir}")
    return storage_dir

def ensure_storage_directory(app_id: int, subdir: str = "images") -> Path:
    """
    Ensure the storage directory exists and is writable.
    
    Args:
        app_id: The application ID
        subdir: The subdirectory within the app's storage (default: "images")
    
    Returns:
        Path object pointing to the created storage directory
        
    Raises:
        OSError: If the directory cannot be created or is not writable
    """
    storage_dir = get_storage_path(app_id, subdir)
    
    try:
        # Create directory if it doesn't exist
        storage_dir.mkdir(parents=True, exist_ok=True)
        logger.info(f"Storage directory ensured: {storage_dir}")
        
        # Test write permissions
        test_file = storage_dir / ".write_test"
        test_file.write_text("test")
        test_file.unlink()
        logger.debug(f"Write permissions verified for: {storage_dir}")
        
        return storage_dir
        
    except Exception as e:
        logger.error(f"Failed to ensure storage directory {storage_dir}: {e}")
        raise OSError(f"Cannot create or write to storage directory: {storage_dir}") from e

def get_file_path(app_id: int, filename: str, subdir: str = "images") -> Path:
    """
    Get the full path to a file in the app's storage.
    
    Args:
        app_id: The application ID
        filename: The filename
        subdir: The subdirectory within the app's storage (default: "images")
    
    Returns:
        Path object pointing to the file
    """
    storage_dir = get_storage_path(app_id, subdir)
    return storage_dir / filename

def get_relative_path(app_id: int, filename: str, subdir: str = "images") -> str:
    """
    Get the relative path for storing in the database.
    
    Args:
        app_id: The application ID
        filename: The filename
        subdir: The subdirectory within the app's storage (default: "images")
    
    Returns:
        Relative path string for database storage
    """
    return f"storage/uploads/{app_id}/{subdir}/{filename}"