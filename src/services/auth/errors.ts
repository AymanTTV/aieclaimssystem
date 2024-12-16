export const AUTH_ERRORS = {
  INVALID_CREDENTIALS: {
    code: 'auth/invalid-credential',
    message: 'Invalid email or password'
  },
  USER_NOT_FOUND: {
    code: 'auth/user-not-found',
    message: 'User not found'
  },
  WRONG_PASSWORD: {
    code: 'auth/wrong-password',
    message: 'Invalid password'
  },
  TOO_MANY_REQUESTS: {
    code: 'auth/too-many-requests',
    message: 'Too many failed attempts. Please try again later'
  },
  USER_DISABLED: {
    code: 'auth/user-disabled',
    message: 'This account has been disabled'
  },
  DEFAULT: {
    code: 'auth/unknown',
    message: 'An error occurred during authentication'
  }
} as const;

export const getAuthErrorMessage = (errorCode: string): string => {
  const error = Object.values(AUTH_ERRORS).find(e => e.code === errorCode);
  return error?.message || AUTH_ERRORS.DEFAULT.message;
};