import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Configure storage settings with increased timeout and retry limits
storage.maxOperationRetryTime = 60000; // 1 minute
storage.maxUploadRetryTime = 60000; // 1 minute

// Set custom metadata to handle CORS and caching
export const storageMetadata = {
  cacheControl: 'public,max-age=3600',
  contentType: 'image/jpeg',
  customMetadata: {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  }
};

// Helper function to handle image upload
export const uploadImage = async (file: File, path: string): Promise<string> => {
  try {
    // Compress image if needed (implement compression logic here)
    const imageRef = ref(storage, path);
    const snapshot = await uploadBytes(imageRef, file, {
      ...storageMetadata,
      contentType: file.type,
    });
    return await getDownloadURL(snapshot.ref);
  } catch (error: any) {
    if (error.code === 'storage/retry-limit-exceeded') {
      throw new Error('Image upload failed. Please try uploading a smaller image or check your internet connection.');
    }
    throw error;
  }
};

export default app;