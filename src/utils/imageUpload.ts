import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage, storageMetadata } from '../lib/firebase/config';
import toast from 'react-hot-toast';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // 2 seconds

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const uploadImage = async (file: File, path: string): Promise<string> => {
  // Validate file type
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error('Please upload a JPEG, PNG or WebP image');
  }

  // Validate file size
  if (file.size > MAX_SIZE) {
    throw new Error('Image size must be less than 5MB');
  }

  let attempts = 0;
  let lastError: Error | null = null;

  while (attempts < MAX_RETRIES) {
    try {
      // Create a unique filename
      const timestamp = Date.now();
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
      const filename = `${timestamp}_${sanitizedName}`;
      
      // Create storage reference
      const storageRef = ref(storage, `${path}/${filename}`);

      // Upload with metadata
      const snapshot = await uploadBytes(storageRef, file, {
        ...storageMetadata,
        contentType: file.type,
      });
      
      // Get download URL
      const downloadURL = await getDownloadURL(snapshot.ref);
      return downloadURL;

    } catch (error: any) {
      lastError = error;
      attempts++;
      
      if (attempts >= MAX_RETRIES) {
        break;
      }

      // Wait before retrying
      await delay(RETRY_DELAY * attempts);
      console.log(`Retrying upload, attempt ${attempts + 1} of ${MAX_RETRIES}`);
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