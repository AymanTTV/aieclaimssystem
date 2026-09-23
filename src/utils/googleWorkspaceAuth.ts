// src/utils/googleWorkspaceAuth.ts
import { initializeApp, getApps } from 'firebase/app';
import { GoogleAuthProvider, signInWithPopup, User as FirebaseUser, getAuth } from 'firebase/auth';
import { auth as fallbackAuth } from '../lib/firebase';
import firebaseConfig from '../../firebase-applet-config.json';
import toast from 'react-hot-toast';

export const GMAIL_SEND_SCOPE = 'https://www.googleapis.com/auth/gmail.send';

export const SYSTEM_SENDERS = {
  FLEET_ADMIN: 'admin@aieskyline.co.uk',
  CLAIMS: 'claims@aieclaims.co.uk',
} as const;

export type SenderCategory = 'fleet' | 'claims';

// Dedicated Firebase App for Google Workspace OAuth per AI Studio integration skill guidelines
const workspaceApp = getApps().find((a) => a.name === 'workspace-auth') ||
  (firebaseConfig?.apiKey ? initializeApp(firebaseConfig, 'workspace-auth') : null);

export const workspaceAuth = workspaceApp ? getAuth(workspaceApp) : fallbackAuth;

// In-memory token storage (Do NOT store in localStorage/sessionStorage per security requirements)
interface CachedToken {
  accessToken: string;
  email?: string;
  expiresAt: number;
}

let cachedAccessToken: string | null = null;
let cachedTokenEmail: string | null = null;
let cachedTokenExpiry = 0;

// Listeners for auth state changes
type AuthChangeListener = (connected: boolean, email: string | null) => void;
const listeners = new Set<AuthChangeListener>();

export function subscribeGoogleAuth(listener: AuthChangeListener): () => void {
  listeners.add(listener);
  listener(Boolean(cachedAccessToken && Date.now() < cachedTokenExpiry), cachedTokenEmail);
  return () => {
    listeners.delete(listener);
  };
}

function notifyListeners() {
  const isConnected = Boolean(cachedAccessToken && Date.now() < cachedTokenExpiry);
  listeners.forEach((fn) => fn(isConnected, cachedTokenEmail));
}

// Clear memory cache on sign-out from either auth instance
const clearCacheOnSignOut = (user: FirebaseUser | null) => {
  if (!user) {
    cachedAccessToken = null;
    cachedTokenEmail = null;
    cachedTokenExpiry = 0;
    notifyListeners();
  }
};

workspaceAuth.onAuthStateChanged(clearCacheOnSignOut);
if (fallbackAuth !== workspaceAuth) {
  fallbackAuth.onAuthStateChanged(clearCacheOnSignOut);
}

/**
 * Returns currently cached Google access token if valid
 */
export async function getGoogleAccessToken(): Promise<string | null> {
  if (cachedAccessToken && Date.now() < cachedTokenExpiry) {
    return cachedAccessToken;
  }
  return null;
}

/**
 * Returns current connected Google account email
 */
export function getConnectedGoogleEmail(): string | null {
  if (cachedAccessToken && Date.now() < cachedTokenExpiry) {
    return cachedTokenEmail;
  }
  return null;
}

/**
 * Returns current user from workspace auth or fallback auth
 */
export function getWorkspaceCurrentUser(): FirebaseUser | null {
  return workspaceAuth.currentUser || fallbackAuth.currentUser;
}

/**
 * Prompts Google Workspace Sign-In/Authorization popup with the Gmail send scope
 */
export async function connectGoogleWorkspace(targetSender?: string): Promise<{ accessToken: string; email: string }> {
  const provider = new GoogleAuthProvider();
  provider.addScope(GMAIL_SEND_SCOPE);
  provider.setCustomParameters({
    prompt: 'select_account',
    ...(targetSender ? { login_hint: targetSender } : {}),
  });

  try {
    let result;
    try {
      result = await signInWithPopup(workspaceAuth, provider);
    } catch (primaryErr: any) {
      if (primaryErr?.code === 'auth/unauthorized-domain' && workspaceAuth !== fallbackAuth) {
        console.warn('Workspace auth domain unauthorized on applet project, retrying with fallback...', primaryErr);
        result = await signInWithPopup(fallbackAuth, provider);
      } else {
        throw primaryErr;
      }
    }

    const credential = GoogleAuthProvider.credentialFromResult(result);

    if (!credential?.accessToken) {
      throw new Error('Failed to retrieve access token from Google.');
    }

    const email = result.user.email || targetSender || 'authenticated-user';
    cachedAccessToken = credential.accessToken;
    cachedTokenEmail = email;
    // Set expiry to 50 minutes (Google tokens typically last 60 minutes)
    cachedTokenExpiry = Date.now() + 50 * 60 * 1000;

    notifyListeners();
    toast.success(`Connected Google Workspace: ${email}`);

    return { accessToken: cachedAccessToken, email };
  } catch (error: any) {
    console.error('Google Workspace connection error:', error);
    if (error.code === 'auth/popup-closed-by-user') {
      throw new Error('Google Workspace authorization cancelled by user.');
    }
    if (error.code === 'auth/unauthorized-domain') {
      const currentHost = window.location.hostname;
      toast.error(`Domain "${currentHost}" needs to be authorized for Google Workspace OAuth.`);
      throw new Error(`Domain "${currentHost}" is not authorized for OAuth in Google Workspace/Firebase. Please authorize this domain or complete the OAuth setup.`);
    }
    throw error;
  }
}

/**
 * Disconnects the in-memory Google Workspace token
 */
export function disconnectGoogleWorkspace() {
  cachedAccessToken = null;
  cachedTokenEmail = null;
  cachedTokenExpiry = 0;
  notifyListeners();
  toast.success('Disconnected Google Workspace session.');
}

