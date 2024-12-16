import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { login, logout, createUserAccount } from './api';
import { LoginCredentials, AuthState } from './types';
import { User } from '../../types';
import toast from 'react-hot-toast';

export const useAuth = () => {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: false,
    error: null
  });

  const navigate = useNavigate();

  const handleLogin = useCallback(async (credentials: LoginCredentials) => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const response = await login(credentials);
      
      if (response.error) {
        throw new Error(response.error.message);
      }

      if (response.user) {
        setState({ user: response.user, loading: false, error: null });
        navigate('/');
        toast.success('Welcome back!');
      }
    } catch (error: any) {
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: error instanceof Error ? error : new Error('Login failed')
      }));
      toast.error(error.message);
    }
  }, [navigate]);

  const handleLogout = useCallback(async () => {
    try {
      await logout();
      setState({ user: null, loading: false, error: null });
      navigate('/login');
      toast.success('Logged out successfully');
    } catch (error) {
      toast.error('Failed to logout');
    }
  }, [navigate]);

  const handleCreateAccount = useCallback(async (
    email: string,
    password: string,
    userData: Partial<User>
  ) => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const response = await createUserAccount(email, password, userData);
      
      if (response.error) {
        throw new Error(response.error.message);
      }

      if (response.user) {
        setState({ user: response.user, loading: false, error: null });
        navigate('/');
        toast.success('Account created successfully!');
      }
    } catch (error: any) {
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: error instanceof Error ? error : new Error('Failed to create account')
      }));
      toast.error(error.message);
    }
  }, [navigate]);

  return {
    ...state,
    login: handleLogin,
    logout: handleLogout,
    createAccount: handleCreateAccount
  };
};