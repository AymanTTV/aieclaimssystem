// src/components/maintenance/WorkshopMirrorGuard.tsx
import React from 'react';
import { 
  useWorkshopMirrorPermissions, 
  WorkshopMirrorPermissionType 
} from '../../hooks/useWorkshopMirrorPermissions';
import { AccessDeniedOverlay } from '../common/AccessDeniedOverlay';
import Layout from '../Layout';

export type WorkshopMirrorGuardBehavior = 'overlay' | 'hide' | 'fallback';

export interface WorkshopMirrorGuardProps {
  /** Permission to check: 'workshopTv' | 'publicMirror' | 'either' | 'both' */
  permission?: WorkshopMirrorPermissionType;
  /** Handling behavior when permission is not granted: 'overlay' | 'hide' | 'fallback' (defaults to 'overlay') */
  behavior?: WorkshopMirrorGuardBehavior;
  /** Custom fallback element to render if behavior is 'fallback' */
  fallback?: React.ReactNode;
  /** Custom title for Access Denied banner */
  title?: string;
  /** Custom explanatory description for Access Denied banner */
  description?: string;
  /** Whether to wrap the AccessDeniedOverlay inside the main app Layout */
  wrapInLayout?: boolean;
  /** Whether the AccessDeniedOverlay is full-screen standalone */
  isStandalone?: boolean;
  /** Target section or component to render when authorized */
  children: React.ReactNode;
}

/**
 * WorkshopMirrorGuard Component
 * 
 * Conditionally renders child content based on whether the user possesses
 * 'workshopTv' and/or 'publicMirror' permissions from AuthContext.
 * If disabled (false/undefined), it either renders an AccessDeniedOverlay,
 * hides the section, or renders a custom fallback.
 */
export const WorkshopMirrorGuard: React.FC<WorkshopMirrorGuardProps> = ({
  permission = 'either',
  behavior = 'overlay',
  fallback = null,
  title,
  description,
  wrapInLayout = false,
  isStandalone = false,
  children,
}) => {
  const { checkPermission, loading } = useWorkshopMirrorPermissions();

  if (loading) {
    if (behavior === 'hide') return null;
    return (
      <div className="flex items-center justify-center p-8 min-h-[200px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
      </div>
    );
  }

  const isAllowed = checkPermission(permission);

  if (isAllowed) {
    return <>{children}</>;
  }

  // Not allowed: Handle according to configured behavior
  if (behavior === 'hide') {
    return null;
  }

  if (behavior === 'fallback') {
    return <>{fallback}</>;
  }

  // behavior === 'overlay'
  const actionKey =
    permission === 'workshopTv'
      ? 'workshopTv'
      : permission === 'publicMirror'
      ? 'publicMirror'
      : 'workshopTv / publicMirror';

  const defaultTitle =
    permission === 'workshopTv'
      ? 'Access Denied — Workshop TV Board'
      : permission === 'publicMirror'
      ? 'Access Denied — Live Public Mirror'
      : 'Access Denied — Workshop Display & Mirror';

  const defaultDescription =
    permission === 'workshopTv'
      ? "Under the system's Universal Deny-by-Default policy, 'Workshop TV' auto-rotation board permission is set to false or unassigned in your user permissions matrix."
      : permission === 'publicMirror'
      ? "Under the system's Universal Deny-by-Default policy, 'Live Public Mirror' permission is set to false or unassigned in your user permissions matrix."
      : "Under the system's Universal Deny-by-Default policy, neither 'Workshop TV' nor 'Live Public Mirror' permission is enabled in your user permissions matrix.";

  const overlay = (
    <AccessDeniedOverlay
      module="maintenance"
      action={actionKey}
      title={title || defaultTitle}
      description={description || defaultDescription}
      isStandalone={isStandalone}
    />
  );

  if (wrapInLayout) {
    return <Layout>{overlay}</Layout>;
  }

  return overlay;
};

/**
 * withWorkshopMirrorGuard HOC
 * 
 * Higher-order component that wraps any React component with permission
 * inspection for Workshop TV and/or Live Public Mirror.
 * 
 * @example
 * export default withWorkshopMirrorGuard(WorkshopTVBoard, {
 *   permission: 'workshopTv',
 *   behavior: 'overlay',
 *   isStandalone: true,
 * });
 */
export function withWorkshopMirrorGuard<P extends object>(
  Component: React.ComponentType<P>,
  options?: Omit<WorkshopMirrorGuardProps, 'children'>
): React.FC<P> {
  const GuardedComponent: React.FC<P> = (props: P) => {
    return (
      <WorkshopMirrorGuard {...options}>
        <Component {...props} />
      </WorkshopMirrorGuard>
    );
  };

  const originalName = Component.displayName || Component.name || 'Component';
  GuardedComponent.displayName = `withWorkshopMirrorGuard(${originalName})`;

  return GuardedComponent;
}

export default WorkshopMirrorGuard;
