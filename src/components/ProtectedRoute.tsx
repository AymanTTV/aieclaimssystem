// src/components/ProtectedRoute.tsx
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePermissions } from '../hooks/usePermissions';
import type { RolePermissions } from '../types/roles';
import { ROUTES } from '../routes';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPermission?: {
    module: keyof RolePermissions;
    action: 'view' | 'create' | 'update' | 'delete';
  };
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredPermission }) => {
  const { user, loading: authLoading } = useAuth();

  // your usePermissions() might not have an explicit loading flag; guard defensively
  const perms = usePermissions() as any;
  const can = perms?.can ?? (() => true);
  const permissionsLoading = Boolean(perms?.loading);

  const location = useLocation();
  const inMemberArea = location.pathname.startsWith('/members');

  // 1) Wait for auth to resolve
  if (authLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  // 2) Not signed in → send to correct login
  if (!user) {
    return (
      <Navigate
        to={inMemberArea ? '/members/login' : ROUTES.LOGIN}
        state={{ from: location }}
        replace
      />
    );
  }

  // 3) Enforce role/area isolation in BOTH directions
  //    - Members are NOT allowed in admin area
  if (user.role === 'member' && !inMemberArea) {
    return <Navigate to="/members/dashboard" replace />;
  }
  //    - Non-members (admin/managers/etc.) are NOT allowed in member area
  if (inMemberArea && user.role !== 'member') {
    return <Navigate to={ROUTES.DASHBOARD} replace />;
  }

  // 4) If a specific permission is required, check it
  if (requiredPermission) {
    if (permissionsLoading) {
      return (
        <div className="flex justify-center items-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-secondary" />
        </div>
      );
    }
    const hasPermission = can(requiredPermission.module, requiredPermission.action);
    if (!hasPermission) {
      return <Navigate to={ROUTES.DASHBOARD} replace />;
    }
  }

  // 5) Auth OK (+ permission OK if required)
  return <>{children}</>;
};

export default ProtectedRoute;
