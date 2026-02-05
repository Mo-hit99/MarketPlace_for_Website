#!/usr/bin/env python3
"""
Maintenance script to ensure all apps have proper image directories
Run this script periodically to fix any missing image directories
"""
import sys
from pathlib import Path

# Add the app directory to Python path
sys.path.append(str(Path(__file__).parent.parent / "app"))

from app.utils.storage_utils import ensure_storage_directory

def create_minimal_png():
    """Create a minimal valid PNG image (1x1 pixel, gray)"""
    return bytes([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,  # PNG signature
        0x00, 0x00, 0x00, 0x0D,  # IHDR chunk length
        0x49, 0x48, 0x44, 0x52,  # IHDR
        0x00, 0x00, 0x00, 0x01,  # Width: 1
        0x00, 0x00, 0x00, 0x01,  # Height: 1
        0x08, 0x00, 0x00, 0x00, 0x00,  # Bit depth: 8, Color type: 0 (grayscale)
        0x37, 0x6E, 0xF9, 0x24,  # CRC
        0x00, 0x00, 0x00, 0x0A,  # IDAT chunk length
        0x49, 0x44, 0x41, 0x54,  # IDAT
        0x78, 0x9C, 0x62, 0x00, 0x00, 0x00, 0x02, 0x00, 0x01,  # Compressed data
        0xE2, 0x21, 0xBC, 0x33,  # CRC
        0x00, 0x00, 0x00, 0x00,  # IEND chunk length
        0x49, 0x45, 0x4E, 0x44,  # IEND
        0xAE, 0x42, 0x60, 0x82   # CRC
    ])

def ensure_all_app_image_directories():
    """Ensure all app directories have image directories"""
    print("=== Ensuring Image Directories for All Apps ===")
    
    uploads_dir = Path("backend/storage/uploads")
    if not uploads_dir.exists():
        print("No uploads directory found")
        return
    
    # Find all app directories
    app_dirs = [d for d in uploads_dir.iterdir() if d.is_dir() and d.name.isdigit()]
    
    if not app_dirs:
        print("No app directories found")
        return
    
    print(f"Found {len(app_dirs)} app directories: {[d.name for d in app_dirs]}")
    
    for app_dir in app_dirs:
        app_id = int(app_dir.name)
        images_dir = app_dir / "images"
        
        if not images_dir.exists():
            print(f"  App {app_id}: Creating missing images directory")
            try:
                ensure_storage_directory(app_id, "images")
                print(f"    ✅ Created images directory for app {app_id}")
            except Exception as e:
                print(f"    ❌ Failed to create images directory for app {app_id}: {e}")
        else:
            file_count = len([f for f in images_dir.iterdir() if f.is_file()])
            print(f"  App {app_id}: Images directory exists ({file_count} files)")

def create_placeholder_if_needed(app_id: int, image_names: list):
    """Create placeholder images if they don't exist"""
    try:
        images_dir = ensure_storage_directory(app_id, "images")
        png_data = create_minimal_png()
        
        created_count = 0
        for image_name in image_names:
            image_path = images_dir / image_name
            if not image_path.exists():
                image_path.write_bytes(png_data)
                created_count += 1
        
        if created_count > 0:
            print(f"    Created {created_count} placeholder images for app {app_id}")
        
    except Exception as e:
        print(f"    Error creating placeholders for app {app_id}: {e}")

def main():
    """Run maintenance"""
    print("🔧 Image Directory Maintenance\n")
    
    ensure_all_app_image_directories()
    
    print("\n✅ Maintenance completed!")

if __name__ == "__main__":
    main()