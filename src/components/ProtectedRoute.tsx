import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext'; // Assuming AuthContext path
import { usePermissions } from '../hooks/usePermissions'; // Assuming usePermissions path
import { RolePermissions } from '../types/roles';
import { ROUTES } from '../routes';

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
  // Get user and authentication loading state
  const { user, loading: authLoading } = useAuth();

  // Get permission check function and permissions loading state
  // IMPORTANT: If your usePermissions hook does NOT provide a 'loading' state,
  // remove ': permissionsLoading' from the line below.
  const { can, loading: permissionsLoading } = usePermissions(); // <-- Focus here

  const location = useLocation();

  // 1. While authentication state is loading, render a loading indicator.
  if (authLoading) {
    // console.log("ProtectedRoute: Auth loading...");
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        {/* Loading indicator while authentication state is determined */}
      </div>
    );
  }

  // 2. If authentication loading is complete and there is no user, redirect to the login page.
  if (!user) {
    // console.log("ProtectedRoute: No user, redirecting to login.");
    return <Navigate to={ROUTES.LOGIN} state={{ from: location }} replace />;
  }

  // At this point, authLoading is false and user is not null (user is authenticated).

  // 3. If a required permission is specified for this route:
  if (requiredPermission) {
    // IMPORTANT: If your usePermissions hook does NOT provide a 'loading' state,
    // remove the 'permissionsLoading' check from the line below.
    // We wait for permissions to load before checking if the user 'can' access the route.
    if (permissionsLoading) { // <-- This is the key check
        // console.log(`ProtectedRoute: Permissions loading for ${requiredPermission.module}:${requiredPermission.action}...`);
         return (
             <div className="flex justify-center items-center min-h-screen">
                 <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-secondary"></div> {/* Use a different color if desired */}
                 {/* Loading indicator while permissions are being loaded */}
             </div>
         );
    }

    // Once permissions are loaded, check if the user has the required permission.
    const hasPermission = can( // <-- This check happens AFTER permissionsLoading is false
      requiredPermission.module,
      requiredPermission.action
    );

    // If the user does not have the required permission, redirect to the dashboard.
    if (!hasPermission) {
      console.warn(`Permission denied for user ${user.id} to access ${location.pathname}. Required: ${requiredPermission.module}:${requiredPermission.action}`);
      // console.log("ProtectedRoute: User lacks required permission, redirecting to dashboard.");
      return <Navigate to={ROUTES.DASHBOARD} replace />;
    }
  }

  // 4. If user is authenticated and has the necessary permissions (or no permissions required),
  // render the protected content (`children`).
  // console.log("ProtectedRoute: User authenticated and has permissions, rendering children.");
  return <>{children}</>;
};

export default ProtectedRoute;
