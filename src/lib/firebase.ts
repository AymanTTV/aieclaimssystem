// src/lib/firebase.ts
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
// 1. ✅ ADDED initializeFirestore here:
import { getFirestore, initializeFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const auth = getAuth(app);

// 2. ✅ THE MAGIC FIX: Force Long Polling to bypass cross-domain browser blocks
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true
});

export const storage = getStorage(app);

// IMPORTANT: must match your deployed Cloud Functions region
export const functions = getFunctions(app, 'europe-west2');

// Configure storage settings (optional)
storage.maxOperationRetryTime = 120000; // 2 minutes
storage.maxUploadRetryTime = 120000;    // 2 minutes

// Storage metadata with CORS headers
export const storageMetadata = {
  cacheControl: 'public,max-age=7200',
  contentType: 'image/jpeg',
  customMetadata: {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  }
};

export default app;