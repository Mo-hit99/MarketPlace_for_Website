import { useState, useRef } from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import api from '../services/api';
import { getImageUrl, isValidImageFile, formatFileSize, debugImageLoad } from '../utils/imageUtils';

interface ImageUploadProps {
  appId: number;
  images: string[];
  logoUrl?: string;
  onImagesUpdate: (images: string[]) => void;
  onLogoUpdate: (logoUrl: string) => void;
}

export const ImageUpload = ({ 
  appId, 
  images, 
  logoUrl, 
  onImagesUpdate, 
  onLogoUpdate 
}: ImageUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (files: FileList) => {
    if (!files.length) return;

    // Validate files
    const invalidFiles = Array.from(files).filter(file => !isValidImageFile(file));
    if (invalidFiles.length > 0) {
      alert(`Invalid file types: ${invalidFiles.map(f => f.name).join(', ')}`);
      return;
    }

    // Check file sizes (max 5MB per file)
    const largeFiles = Array.from(files).filter(file => file.size > 5 * 1024 * 1024);
    if (largeFiles.length > 0) {
      alert(`Files too large (max 5MB): ${largeFiles.map(f => `${f.name} (${formatFileSize(f.size)})`).join(', ')}`);
      return;
    }

    setUploading(true);
    const formData = new FormData();
    
    Array.from(files).forEach(file => {
      formData.append('files', file);
    });

    try {
      console.log(`📤 Uploading ${files.length} images for app ${appId}`);
      const response = await api.post(`/apps/${appId}/images`, formData);
      
      console.log('✅ Upload successful:', response.data);
      onImagesUpdate([...images, ...response.data.images]);
    } catch (error: any) {
      console.error('❌ Error uploading images:', error);
      debugImageLoad(appId, 'upload-error', error);
      
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to upload images';
      alert(`Upload failed: ${errorMessage}`);
    } finally {
      setUploading(false);
    }
  };

  const handleLogoUpload = async (file: File) => {
    // Validate file
    if (!isValidImageFile(file)) {
      alert('Invalid file type. Please select an image file.');
      return;
    }

    // Check file size (max 2MB for logo)
    if (file.size > 2 * 1024 * 1024) {
      alert(`Logo file too large (max 2MB): ${formatFileSize(file.size)}`);
      return;
    }

    setUploadingLogo(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      console.log(`📤 Uploading logo for app ${appId}:`, file.name);
      const response = await api.post(`/apps/${appId}/logo`, formData);
      
      console.log('✅ Logo upload successful:', response.data);
      onLogoUpdate(response.data.logo_url);
    } catch (error: any) {
      console.error('❌ Error uploading logo:', error);
      debugImageLoad(appId, 'logo-upload-error', error);
      
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to upload logo';
      alert(`Logo upload failed: ${errorMessage}`);
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleDeleteImage = async (imagePath: string) => {
    const imageName = imagePath.split('/').pop();
    if (!imageName) return;

    try {
      await api.delete(`/apps/${appId}/images/${imageName}`);
      onImagesUpdate(images.filter(img => img !== imagePath));
    } catch (error) {
      console.error('Error deleting image:', error);
      alert('Failed to delete image');
    }
  };

  return (
    <div className="space-y-6">
      {/* Logo Upload */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-3">App Logo</h3>
        <div className="flex items-center space-x-4">
          {logoUrl && (
            <div className="relative">
              <img
                src={getImageUrl(appId, logoUrl)}
                alt="App logo"
                className="w-16 h-16 rounded-lg object-cover"
                onError={(e) => {
                  console.error('Logo failed to load:', logoUrl);
                  debugImageLoad(appId, logoUrl);
                  e.currentTarget.style.display = 'none';
                }}
                onLoad={() => console.log('✅ Logo loaded successfully')}
              />
            </div>
          )}
          
          <button
            onClick={() => logoInputRef.current?.click()}
            disabled={uploadingLogo}
            className="btn-secondary"
          >
            {uploadingLogo ? (
              <div className="w-4 h-4 border-2 border-gray-500 border-t-transparent rounded-full animate-spin mr-2" />
            ) : (
              <Upload className="h-4 w-4 mr-2" />
            )}
            {logoUrl ? 'Change Logo' : 'Upload Logo'}
          </button>
          
          <input
            ref={logoInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleLogoUpload(file);
            }}
          />
        </div>
      </div>

      {/* Screenshots Upload */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-3">Screenshots</h3>
        
        {/* Upload Button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="btn-secondary mb-4"
        >
          {uploading ? (
            <div className="w-4 h-4 border-2 border-gray-500 border-t-transparent rounded-full animate-spin mr-2" />
          ) : (
            <ImageIcon className="h-4 w-4 mr-2" />
          )}
          Upload Screenshots
        </button>
        
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            const files = e.target.files;
            if (files) handleImageUpload(files);
          }}
        />

        {/* Image Grid */}
        {images.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {images.map((image, index) => (
              <div key={index} className="relative group">
                <img
                  src={getImageUrl(appId, image)}
                  alt={`Screenshot ${index + 1}`}
                  className="w-full h-32 object-cover rounded-lg"
                  onError={(e) => {
                    console.error(`Screenshot ${index + 1} failed to load:`, image);
                    debugImageLoad(appId, image);
                    e.currentTarget.style.display = 'none';
                  }}
                  onLoad={() => console.log(`✅ Screenshot ${index + 1} loaded successfully`)}
                />
                <button
                  onClick={() => handleDeleteImage(image)}
                  className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {images.length === 0 && (
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <ImageIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No screenshots uploaded yet</p>
            <p className="text-sm text-gray-400">Upload images to showcase your app</p>
          </div>
        )}
      </div>
    </div>
  );
};