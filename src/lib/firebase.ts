// src/lib/firebase.ts
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, ActionCodeSettings } from 'firebase/auth';
import { 
  getFirestore, 
  initializeFirestore,
  setLogLevel 
} from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';

const rawStorageBucket = import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'mock-storage-bucket';
const storageBucket = rawStorageBucket.replace(/^gs:\/\//, '');

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'mock-api-key',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'mock-auth-domain',
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'mock-project-id',
  storageBucket: storageBucket,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || 'mock-sender-id',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || 'mock-app-id',
};

// 1. Initialize Firebase app exactly once (prevents duplicate app initialization)
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// 2. Suppress low-level internal retry logs and transient offline notices so benign network fluctuations don't alarm user
try {
  setLogLevel('silent');
} catch {
  // Ignore if setLogLevel is not supported in the environment
}

// 3. Initialize Firestore safely and reliably across all environments (including iframes, private browsing, and public mirror)
export const db = (() => {
  try {
    return initializeFirestore(app, {
      experimentalAutoDetectLongPolling: true,
    });
  } catch {
    return getFirestore(app);
  }
})();
export const auth = getAuth(app);
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