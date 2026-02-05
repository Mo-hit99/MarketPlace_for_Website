/**
 * Utility functions for handling app images
 */

/**
 * Get the full URL for an app image
 */
export const getImageUrl = (appId: number, imagePath: string): string => {
  if (!imagePath) return '';
  
  // Extract filename from path
  const filename = imagePath.split('/').pop();
  if (!filename) return '';
  
  // Construct full URL
  const baseUrl = 'http://localhost:8000/api/v1';
  return `${baseUrl}/apps/${appId}/images/${filename}`;
};

/**
 * Get the full URL for an app logo
 */
export const getLogoUrl = (appId: number, logoPath?: string): string => {
  if (!logoPath) return '';
  return getImageUrl(appId, logoPath);
};

/**
 * Get placeholder image URL when no image is available
 */
export const getPlaceholderImageUrl = (width: number = 200, height: number = 200): string => {
  return `data:image/svg+xml;base64,${btoa(`
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${width}" height="${height}" fill="#f3f4f6"/>
      <text x="50%" y="50%" font-family="Arial" font-size="14" fill="#9ca3af" text-anchor="middle" dy=".3em">
        No Image
      </text>
    </svg>
  `)}`;
};

/**
 * Validate if a file is a valid image
 */
export const isValidImageFile = (file: File): boolean => {
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
  return validTypes.includes(file.type);
};

/**
 * Get file size in human readable format
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Debug function to log image loading issues
 */
export const debugImageLoad = (appId: number, imagePath: string, error?: any) => {
  console.group(`🖼️ Image Debug - App ${appId}`);
  console.log('Original path:', imagePath);
  console.log('Constructed URL:', getImageUrl(appId, imagePath));
  if (error) {
    console.error('Error:', error);
  }
  console.groupEnd();
};