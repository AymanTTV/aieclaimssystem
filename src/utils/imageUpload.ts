import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../lib/firebase';
import toast from 'react-hot-toast';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 100 * 1024 * 1024; // 5MB
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // 2 seconds

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const uploadImage = async (file: File, path: string): Promise<string> => {
  // Validate file type and size
  if (!validateImage(file)) {
    throw new Error('Invalid image file');
  }

  let attempts = 0;
  let lastError: Error | null = null;

  while (attempts < MAX_RETRIES) {
    try {
      // Create unique filename
      const timestamp = Date.now();
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
      const filename = `${timestamp}_${sanitizedName}`;
      
      // Create storage reference
      const storageRef = ref(storage, `${path}/${filename}`);

      // Upload with metadata including CORS headers
      const metadata = {
        contentType: file.type,
        cacheControl: 'public,max-age=7200',
        customMetadata: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
          'Access-Control-Max-Age': '86400',
        }
      };

      // Perform upload
      const snapshot = await uploadBytes(storageRef, file, metadata);
      
      // Get download URL with custom headers
      const downloadURL = await getDownloadURL(snapshot.ref);
      return downloadURL;

    } catch (error: any) {
      console.error('Upload attempt failed:', error);
      lastError = error;
      attempts++;
      
      if (attempts >= MAX_RETRIES) {
        break;
      }

      await delay(RETRY_DELAY * attempts);
    }
  }

  throw lastError || new Error('Upload failed after max retries');
};

export const validateImage = (file: File): boolean => {
  if (!ALLOWED_TYPES.includes(file.type)) {
    toast.error('Please upload a valid image file (JPEG, PNG, or WebP)');
    return false;
  }

  if (file.size > MAX_SIZE) {
    toast.error('Image size should be less than 5MB');
    return false;
  }

  return true;
};