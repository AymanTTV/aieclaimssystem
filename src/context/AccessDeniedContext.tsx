// src/context/AccessDeniedContext.tsx
import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { usePermissions } from '../hooks/usePermissions';
import { ROUTE_PERMISSIONS, ROUTES } from '../routes';
import { AccessDeniedOverlay } from '../components/common/AccessDeniedOverlay';
import type { RolePermissions, Permission } from '../types/roles';

export interface AccessDeniedDetail {
  module: string;
  action: string;
  title?: string;
  description?: string;
  source?: 'route' | 'feature';
  targetPath?: string;
}

interface AccessDeniedContextType {
  isDenied: boolean;
  deniedDetails: AccessDeniedDetail | null;
  triggerAccessDenied: (details: AccessDeniedDetail) => void;
  clearAccessDenied: () => void;
  checkPermission: (module: string, action: string) => boolean;
}

const AccessDeniedContext = createContext<AccessDeniedContextType>({
  isDenied: false,
  deniedDetails: null,
  triggerAccessDenied: () => {},
  clearAccessDenied: () => {},
  checkPermission: () => false,
});

export const useAccessDenied = () => useContext(AccessDeniedContext);

interface AccessDeniedProviderProps {
  children: React.ReactNode;
}

/**
 * Global Access Denied Provider & Monitor
 * 
 * Actively monitors:
 * 1. User authentication and permissions via AuthContext
 * 2. Active route location and route-permission mapping
 * 3. Feature-level triggers where explicit matrix permission is 'false' or 'undefined'
 */
export const AccessDeniedProvider: React.FC<AccessDeniedProviderProps> = ({ children }) => {
  const { user, loading: authLoading } = useAuth();
  const { can } = usePermissions();
  const location = useLocation();
  const navigate = useNavigate();

  const [deniedDetails, setDeniedDetails] = useState<AccessDeniedDetail | null>(null);

  const clearAccessDenied = useCallback(() => {
    setDeniedDetails(null);
  }, []);

  const triggerAccessDenied = useCallback((details: AccessDeniedDetail) => {
    setDeniedDetails(details);
  }, []);

  // Helper to evaluate explicit matrix permission for any module/action
  const checkPermission = useCallback(
    (moduleName: string, actionName: string): boolean => {
      if (!user) return false;
      return can(moduleName as keyof RolePermissions, actionName as keyof Permission);
    },
    [user, can]
  );

  // Monitor route changes against user's permission matrix
  useEffect(() => {
    // Skip checking while auth state is resolving or on public/member-only routes
    if (authLoading || !user) {
      clearAccessDenied();
      return;
    }

    const currentPath = location.pathname;

    // Skip public authentication and external portal routes
    const isPublic = [
      ROUTES.LOGIN,
      ROUTES.ADMIN_SETUP,
      '/sign',
      '/doc',
      '/view-document',
      '/partner',
      '/partner-search',
      '/members/login',
      '/members/register',
      '/members/forgot-password',
      '/members/reset-password',
    ].some(pub => currentPath.startsWith(pub));

    if (isPublic) {
      clearAccessDenied();
      return;
    }

    // Identify required permission for the current path
    const matchingKey = Object.keys(ROUTE_PERMISSIONS).find(
      key => currentPath === key || (key !== '/' && currentPath.startsWith(key))
    ) as keyof typeof ROUTE_PERMISSIONS | undefined;

    if (matchingKey) {
      const routeRule = ROUTE_PERMISSIONS[matchingKey];
      const hasPermission = can(
        routeRule.module as keyof RolePermissions,
        routeRule.action as keyof Permission
      );

      // If user's permissions matrix explicitly has the flag set to 'false' or 'undefined'
      if (!hasPermission) {
        setDeniedDetails({
          module: routeRule.module,
          action: routeRule.action,
          title: `Access Denied — ${routeRule.module.toUpperCase()}`,
          description: `Your permission matrix explicitly has '${routeRule.action}' on module '${routeRule.module}' set to false or undefined. Access is denied under the Universal Deny-by-Default security policy.`,
          source: 'route',
          targetPath: currentPath,
        });
        return;
      }
    }

    // If current path is allowed, clear any stale route-level denial
    if (deniedDetails?.source === 'route') {
      clearAccessDenied();
    }
  }, [location.pathname, user, authLoading, can, clearAccessDenied]);

  const value = useMemo(
    () => ({
      isDenied: Boolean(deniedDetails),
      deniedDetails,
      triggerAccessDenied,
      clearAccessDenied,
      checkPermission,
    }),
    [deniedDetails, triggerAccessDenied, clearAccessDenied, checkPermission]
  );

  return (
    <AccessDeniedContext.Provider value={value}>
      {children}

      {/* Global Feature-Level Access Denied Modal Overlay */}
      {deniedDetails && deniedDetails.source === 'feature' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl">
            <AccessDeniedOverlay
              module={deniedDetails.module}
              action={deniedDetails.action}
              title={deniedDetails.title}
              description={deniedDetails.description}
              isModal={true}
              onClose={clearAccessDenied}
            />
          </div>
        </div>
      )}
    </AccessDeniedContext.Provider>
  );
};

/**
 * FeatureGuard Component
 * Declarative component to wrap features/buttons. If the user's matrix has
 * the required permission set to 'false' or 'undefined', it triggers the
 * global Access Denied overlay or renders the fallback.
 */
interface FeatureGuardProps {
  module: string;
  action: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  triggerModalOnDenied?: boolean;
}

export const FeatureGuard: React.FC<FeatureGuardProps> = ({
  module,
  action,
  children,
  fallback = null,
  triggerModalOnDenied = false,
}) => {
  const { checkPermission, triggerAccessDenied } = useAccessDenied();
  const hasPermission = checkPermission(module, action);

  if (!hasPermission) {
    if (triggerModalOnDenied) {
      return (
        <div
          onClickCapture={(e) => {
            e.preventDefault();
            e.stopPropagation();
            triggerAccessDenied({
              module,
              action,
              title: `Access Denied: ${module}`,
              description: `This feature requires explicit '${action}' permission on '${module}'. Your user permission matrix has this set to false or undefined.`,
              source: 'feature',
            });
          }}
          className="cursor-not-allowed opacity-60"
        >
          {fallback || children}
        </div>
      );
    }
    return <>{fallback}</>;
  }

  return <>{children}</>;
};
