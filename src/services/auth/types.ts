import { User } from '../../types';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthError {
  code: string;
  message: string;
}

export interface AuthResponse {
  user: User | null;
  error?: AuthError;
}

export interface AuthState {
  user: User | null;
  loading: boolean;
  error: Error | null;
}