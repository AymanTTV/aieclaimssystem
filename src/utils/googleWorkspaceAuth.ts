// src/utils/googleWorkspaceAuth.ts
import { GoogleAuthProvider, signInWithPopup, User as FirebaseUser } from 'firebase/auth';
import { auth } from '../lib/firebase';
import toast from 'react-hot-toast';

export const GMAIL_SEND_SCOPE = 'https://www.googleapis.com/auth/gmail.send';

export const SYSTEM_SENDERS = {
  FLEET_ADMIN: 'admin@aieskyline.co.uk',
  CLAIMS: 'claims@aieclaims.co.uk',
} as const;

export type SenderCategory = 'fleet' | 'claims';

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

// Clear memory cache on sign-out
auth.onAuthStateChanged((user: FirebaseUser | null) => {
  if (!user) {
    cachedAccessToken = null;
    cachedTokenEmail = null;
    cachedTokenExpiry = 0;
    notifyListeners();
  }
});

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
    const result = await signInWithPopup(auth, provider);
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
