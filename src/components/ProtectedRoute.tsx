// src/components/ProtectedRoute.tsx
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePermissions } from '../hooks/usePermissions';
import type { RolePermissions } from '../types/roles';
import { ROUTES, ROUTE_PERMISSIONS } from '../routes';
import Layout from './Layout';
import { AccessDeniedOverlay } from './common/AccessDeniedOverlay';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPermission?: {
    module: keyof RolePermissions;
    action: 'view' | 'create' | 'update' | 'delete';
  };
  wrapInLayout?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiredPermission,
  wrapInLayout = true,
}) => {
  const { user, loading: authLoading } = useAuth();
  const perms = usePermissions();
  const can = perms?.can ?? (() => false);
  const permissionsLoading = Boolean((perms as any)?.loading);

  const location = useLocation();
  const inMemberArea = location.pathname.startsWith('/members');

  // Automatically resolve route permission if not passed as an explicit prop
  const effectivePermission = requiredPermission || (() => {
    const pathname = location.pathname;
    const matchingKey = Object.keys(ROUTE_PERMISSIONS).find(
      key => pathname === key || (key !== '/' && pathname.startsWith(key))
    ) as keyof typeof ROUTE_PERMISSIONS | undefined;
    return matchingKey ? (ROUTE_PERMISSIONS[matchingKey] as { module: keyof RolePermissions; action: 'view' | 'create' | 'update' | 'delete' }) : undefined;
  })();

  // 1) Wait for auth to resolve
  if (authLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-[#F8FAFC]">
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

  // 4) If a specific permission is required (or mapped by route), strictly check explicit allow
  if (effectivePermission) {
    if (permissionsLoading) {
      return (
        <div className="flex justify-center items-center min-h-screen bg-[#F8FAFC]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-secondary" />
        </div>
      );
    }

    const hasPermission = can(effectivePermission.module, effectivePermission.action);

    // If permission is unticked, false, or missing -> Trigger Global Access Denied Overlay
    // Completely prevents rendering of any underlying children/page content
    if (!hasPermission) {
      if (wrapInLayout && !inMemberArea) {
        return (
          <Layout>
            <AccessDeniedOverlay
              module={String(effectivePermission.module)}
              action={effectivePermission.action}
            />
          </Layout>
        );
      }

      return (
        <AccessDeniedOverlay
          module={String(effectivePermission.module)}
          action={effectivePermission.action}
          isStandalone={true}
        />
      );
    }
  }

  // 5) Auth OK (+ explicit permission OK if required)
  return <>{children}</>;
};

export default ProtectedRoute;
