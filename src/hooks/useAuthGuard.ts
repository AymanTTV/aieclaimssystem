import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const useAuthGuard = (requiredRole?: string) => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        navigate('/login');
      } else if (requiredRole && user.role !== requiredRole) {
        navigate('/');
      }
    }
  }, [user, loading, requiredRole, navigate]);

  return { user, loading };
};