import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePermissions } from '../hooks/usePermissions';
import { RolePermissions } from '../types/roles';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPermission?: {
    module: keyof RolePermissions;
    action: 'view' | 'create' | 'update' | 'delete';
  };
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiredPermission 
}) => {
  const { user, loading } = useAuth();
  const { can } = usePermissions();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  if (requiredPermission) {
    const hasPermission = can(
      requiredPermission.module,
      requiredPermission.action
    );

    if (!hasPermission) {
      return <Navigate to="/" />;
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;