// src/lib/firebase.ts
import { initializeApp } from 'firebase/app';
import { getAuth, ActionCodeSettings } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
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

// 1. Initialize Firebase app exactly once
const app = initializeApp(firebaseConfig);

// 2. Initialize core services using standard, optimized methods
export const auth = getAuth(app);
export const db = getFirestore(app); // Removes the buggy long-polling
export const functions = getFunctions(app, 'europe-west2');
export const storage = getStorage(app);

// 3. Apply Storage Settings
storage.maxOperationRetryTime = 60000; // Reduced to 60 seconds
storage.maxUploadRetryTime = 60000;    // Reduced to 60 seconds

export const storageMetadata = {
  cacheControl: 'public,max-age=7200',
  contentType: 'auto',
  customMetadata: {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, PUT, POST, DELETE, HEAD, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '3600'
  }
};

// 4. Auth Settings
export const passwordResetSettings: ActionCodeSettings = {
  url: `${window.location.origin}/login`, 
  handleCodeInApp: false 
};

export const authPersistence = 'LOCAL';

export const AUTH_ERROR_MESSAGES = {
  'auth/user-not-found': 'No account found with this email address',
  'auth/wrong-password': 'Invalid password',
  'auth/invalid-email': 'Invalid email address',
  'auth/too-many-requests': 'Too many attempts. Please try again later',
  'auth/email-already-in-use': 'An account already exists with this email',
  'auth/weak-password': 'Password should be at least 6 characters',
  'auth/unauthorized-continue-uri': 'Invalid reset link configuration',
  'default': 'An error occurred. Please try again'
};

export default app;