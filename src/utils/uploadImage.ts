import { uploadFile, validateFile } from '../lib/firebase/storage';
import toast from 'react-hot-toast';

interface UploadOptions {
  maxRetries?: number;
  showProgress?: boolean;
  allowedTypes?: string[];
  maxSize?: number;
}

const DEFAULT_OPTIONS: UploadOptions = {
  maxRetries: 3,
  showProgress: true,
  allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
  maxSize: 5 * 1024 * 1024 // 5MB
};

/**
 * Uploads an image file to Firebase Storage
 * @param file The image file to upload
 * @param path The storage path where the file should be saved
 * @param options Upload configuration options
 * @returns Promise resolving to the download URL
 */
export const uploadImage = async (
  file: File, 
  path: string,
  options: UploadOptions = DEFAULT_OPTIONS
): Promise<string> => {
  // Validate file before upload
  if (!validateFile(file)) {
    throw new Error('Invalid file');
  }

  try {
    // Sanitize path to prevent invalid characters
    const sanitizedPath = sanitizeStoragePath(path);
    
    // Upload file and get download URL
    const downloadURL = await uploadFile(file, sanitizedPath, options);
    return downloadURL;

  } catch (error) {
    console.error('Error uploading image:', error);
    toast.error('Failed to upload image. Please try again.');
    throw error;
  }
};

/**
 * Sanitizes a storage path by removing invalid characters
 */
const sanitizeStoragePath = (path: string): string => {
  return path
    .replace(/[^a-zA-Z0-9/.-]/g, '_') // Replace invalid chars with underscore
    .replace(/\/+/g, '/') // Remove duplicate slashes
    .replace(/^\/|\/$/g, ''); // Remove leading/trailing slashes
};

export { validateFile };