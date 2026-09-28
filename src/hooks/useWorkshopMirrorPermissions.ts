// src/hooks/useWorkshopMirrorPermissions.ts
import { useCallback, useMemo, useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAccessDenied } from '../context/AccessDeniedContext';

export type WorkshopMirrorPermissionType = 'workshopTv' | 'publicMirror' | 'either' | 'both';

export interface WorkshopMirrorPermissions {
  /** True if user has explicit 'workshopTv' permission on 'maintenance' */
  canWorkshopTv: boolean;
  /** True if user has explicit 'publicMirror' permission on 'maintenance' */
  canPublicMirror: boolean;
  /** True if user has either workshopTv or publicMirror permission */
  canEither: boolean;
  /** True if user has both workshopTv and publicMirror permissions */
  canBoth: boolean;
  /** Auth loading state from AuthContext */
  loading: boolean;
  /** Authenticated user from AuthContext */
  user: any;
  /** Reactive permissions epoch version counter */
  permissionsEpoch: number;
  /** Helper to evaluate specified permission requirement */
  checkPermission: (type?: WorkshopMirrorPermissionType) => boolean;
  /** Triggers the global Access Denied overlay for Workshop TV */
  triggerWorkshopTvAccessDenied: (customTitle?: string, customDesc?: string) => void;
  /** Triggers the global Access Denied overlay for Live Public Mirror */
  triggerPublicMirrorAccessDenied: (customTitle?: string, customDesc?: string) => void;
  /**
   * Asserts Workshop TV permission; if disabled (false/undefined), triggers
   * the global Access Denied overlay and optionally runs onDenied callback.
   */
  assertWorkshopTv: (options?: { onDenied?: () => void; title?: string; description?: string }) => boolean;
  /**
   * Asserts Live Public Mirror permission; if disabled (false/undefined), triggers
   * the global Access Denied overlay and optionally runs onDenied callback.
   */
  assertPublicMirror: (options?: { onDenied?: () => void; title?: string; description?: string }) => boolean;
}

/**
 * Custom hook to verify if the authenticated user has explicit permission
 * for 'Workshop TV' or 'Live Public Mirror' in the maintenance permissions matrix.
 * Listens for real-time Firestore updates and matrix toggle events to guarantee
 * instant UI re-renders whenever switches are toggled.
 */
export const useWorkshopMirrorPermissions = (): WorkshopMirrorPermissions => {
  const { user, loading, permissionsEpoch } = useAuth();
  const { triggerAccessDenied } = useAccessDenied();

  // Local sync tick to guarantee re-render when matrix toggles dispatch events
  const [localTick, setLocalTick] = useState(0);

  useEffect(() => {
    const handlePermissionsUpdated = () => {
      setLocalTick((prev) => prev + 1);
    };

    window.addEventListener('user_permissions_updated', handlePermissionsUpdated);
    return () => {
      window.removeEventListener('user_permissions_updated', handlePermissionsUpdated);
    };
  }, []);

  // Strict Deny-by-Default check via user matrix:
  // Must be strictly boolean true to grant access.
  // Missing, false, "false", null, or undefined -> strictly DENIED.
  const canWorkshopTv = useMemo(() => {
    if (!user) return false;
    const maintenance = user.permissions?.maintenance;
    return maintenance?.workshopTv === true;
  }, [user, user?.permissions?.maintenance?.workshopTv, permissionsEpoch, localTick]);

  const canPublicMirror = useMemo(() => {
    if (!user) return false;
    const maintenance = user.permissions?.maintenance;
    return maintenance?.publicMirror === true;
  }, [user, user?.permissions?.maintenance?.publicMirror, permissionsEpoch, localTick]);

  const canEither = canWorkshopTv || canPublicMirror;
  const canBoth = canWorkshopTv && canPublicMirror;

  const checkPermission = useCallback(
    (type: WorkshopMirrorPermissionType = 'either'): boolean => {
      switch (type) {
        case 'workshopTv':
          return canWorkshopTv;
        case 'publicMirror':
          return canPublicMirror;
        case 'both':
          return canBoth;
        case 'either':
        default:
          return canEither;
      }
    },
    [canWorkshopTv, canPublicMirror, canBoth, canEither]
  );

  const triggerWorkshopTvAccessDenied = useCallback(
    (customTitle?: string, customDesc?: string) => {
      triggerAccessDenied({
        module: 'maintenance',
        action: 'workshopTv',
        title: customTitle || 'Access Denied — Workshop TV Board',
        description:
          customDesc ||
          "Under the system's Universal Deny-by-Default policy, 'Workshop TV' display mirror permission is disabled (false or unassigned). Contact a manager to enable this in the User Permissions matrix.",
        source: 'feature',
      });
    },
    [triggerAccessDenied]
  );

  const triggerPublicMirrorAccessDenied = useCallback(
    (customTitle?: string, customDesc?: string) => {
      triggerAccessDenied({
        module: 'maintenance',
        action: 'publicMirror',
        title: customTitle || 'Access Denied — Live Public Mirror',
        description:
          customDesc ||
          "Under the system's Universal Deny-by-Default policy, 'Live Public Mirror' permission is disabled (false or unassigned). Contact a manager to enable this in the User Permissions matrix.",
        source: 'feature',
      });
    },
    [triggerAccessDenied]
  );

  const assertWorkshopTv = useCallback(
    (options?: { onDenied?: () => void; title?: string; description?: string }): boolean => {
      if (!canWorkshopTv) {
        triggerWorkshopTvAccessDenied(options?.title, options?.description);
        options?.onDenied?.();
        return false;
      }
      return true;
    },
    [canWorkshopTv, triggerWorkshopTvAccessDenied]
  );

  const assertPublicMirror = useCallback(
    (options?: { onDenied?: () => void; title?: string; description?: string }): boolean => {
      if (!canPublicMirror) {
        triggerPublicMirrorAccessDenied(options?.title, options?.description);
        options?.onDenied?.();
        return false;
      }
      return true;
    },
    [canPublicMirror, triggerPublicMirrorAccessDenied]
  );

  return {
    canWorkshopTv,
    canPublicMirror,
    canEither,
    canBoth,
    loading,
    user,
    permissionsEpoch,
    checkPermission,
    triggerWorkshopTvAccessDenied,
    triggerPublicMirrorAccessDenied,
    assertWorkshopTv,
    assertPublicMirror,
  };
};

export default useWorkshopMirrorPermissions;
