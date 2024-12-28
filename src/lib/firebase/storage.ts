import { storage } from './config';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import toast from 'react-hot-toast';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const uploadFile = async (file: File, path: string): Promise<string> => {
  // Validate file
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error('Invalid file type. Please upload a JPEG, PNG or WebP image');
  }
  if (file.size > MAX_SIZE) {
    throw new Error('File size must be less than 5MB');
  }

  let attempt = 0;
  
  while (attempt < MAX_RETRIES) {
    try {
      // Create storage reference with timestamp to avoid conflicts
      const timestamp = Date.now();
      const storageRef = ref(storage, `${path}_${timestamp}`);

      // Create upload task
      const uploadTask = uploadBytesResumable(storageRef, file, {
        contentType: file.type,
        customMetadata: {
          'Cache-Control': 'public,max-age=7200'
        }
      });

      // Wait for upload to complete
      await new Promise((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            console.log('Upload progress:', progress);
          },
          (error) => reject(error),
          () => resolve(uploadTask)
        );
      });

      // Get download URL
      const downloadURL = await getDownloadURL(storageRef);
      return downloadURL;

    } catch (error: any) {
      attempt++;
      console.error(`Upload attempt ${attempt} failed:`, error);
      
      if (attempt === MAX_RETRIES) {
        toast.error('Upload failed after multiple attempts');
        throw error;
      }

      // Wait before retrying
      await delay(RETRY_DELAY * attempt);
      toast.loading(`Retrying upload (attempt ${attempt + 1}/${MAX_RETRIES})...`);
    }
  }

  throw new Error('Upload failed after max retries');
};

export const validateFile = (file: File): boolean => {
  if (!ALLOWED_TYPES.includes(file.type)) {
    toast.error('Please upload a valid image file (JPEG, PNG, or WebP)');
    return false;
  }

  if (file.size > MAX_SIZE) {
    toast.error('File size should be less than 5MB');
    return false;
  }

  return true;
};