import { ActionCodeSettings } from 'firebase/auth';

// Password reset configuration
export const passwordResetSettings: ActionCodeSettings = {
  // Redirect back to login page after password reset
  url: `${window.location.origin}/login`,
  // Don't handle the code in the app since we want Firebase to handle the reset flow
  handleCodeInApp: false
};

// Auth persistence settings
export const authPersistence = 'LOCAL';

// Auth error messages
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