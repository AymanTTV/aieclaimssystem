// src/hooks/usePermissions.ts
import { useAuth } from '../context/AuthContext';
import { DEFAULT_PERMISSIONS } from '../types/roles';
import type { RolePermissions, Permission } from '../types/roles';

export const usePermissions = () => {
  const { user } = useAuth();

  const can = (module: keyof RolePermissions, action: keyof Permission): boolean => {
    if (!user?.role) return false;

    // 1) Custom override saved on the user doc
    const customModulePerms = user.permissions?.[module];
    if (customModulePerms) {
      if (customModulePerms[action] !== undefined) {
        return Boolean(customModulePerms[action]);
      }
      if (module === 'rentals') {
        if (action === 'bulkEmailScheduler' && customModulePerms.mondayAutoEmail !== undefined) {
          return Boolean(customModulePerms.mondayAutoEmail);
        }
        if (action === 'mondayAutoEmail' && customModulePerms.bulkEmailScheduler !== undefined) {
          return Boolean(customModulePerms.bulkEmailScheduler);
        }
      }
    }

    // 2) Fallback to defaults for the user’s role
    const rolePerms = DEFAULT_PERMISSIONS[user.role];
    const defaultModulePerms = rolePerms?.[module];
    if (!defaultModulePerms) return false;

    if (defaultModulePerms[action] !== undefined) {
      return Boolean(defaultModulePerms[action]);
    }
    if (module === 'rentals') {
      if (action === 'bulkEmailScheduler' && defaultModulePerms.mondayAutoEmail !== undefined) {
        return Boolean(defaultModulePerms.mondayAutoEmail);
      }
      if (action === 'mondayAutoEmail' && defaultModulePerms.bulkEmailScheduler !== undefined) {
        return Boolean(defaultModulePerms.bulkEmailScheduler);
      }
    }

    return false;
  };

  const canAny = (module: keyof RolePermissions, actions: Array<keyof Permission>): boolean =>
    actions.some(action => can(module, action));

  const canAll = (module: keyof RolePermissions, actions: Array<keyof Permission>): boolean =>
    actions.every(action => can(module, action));

  return {
    can,
    canAny,
    canAll,
    isManager: user?.role === 'manager',
    isAdmin:   user?.role === 'admin',
    isFinance: user?.role === 'finance',
    isClaims:  user?.role === 'claims',
    isCompany: user?.role === 'company', 
    isMember:  user?.role === 'member',
    role: user?.role ?? null,
    permissions: user?.permissions ?? null,
  };
};