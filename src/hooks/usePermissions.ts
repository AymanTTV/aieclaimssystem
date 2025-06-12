// src/hooks/usePermissions.ts
import { useAuth } from '../context/AuthContext';
import { DEFAULT_PERMISSIONS } from '../types/roles';
import type { RolePermissions, Permission } from '../types/roles';

export const usePermissions = () => {
  const { user } = useAuth();

  const can = (module: keyof RolePermissions, action: keyof Permission): boolean => {
    if (!user?.role) {
      return false;
    }

    // 1️⃣ Check for a custom override on the user object
    const customModulePerms = user.permissions?.[module];
    if (customModulePerms && customModulePerms[action] !== undefined) {
      return Boolean(customModulePerms[action]);
    }

    // 2️⃣ Fall back to default permissions for the user’s role
    const rolePerms = DEFAULT_PERMISSIONS[user.role];
    const defaultModulePerms = rolePerms?.[module];
    if (!defaultModulePerms) {
      // module simply isn’t defined → deny by default
      return false;
    }

    return Boolean(defaultModulePerms[action]);
  };

  const canAny = (module: keyof RolePermissions, actions: Array<keyof Permission>): boolean => {
    return actions.some(action => can(module, action));
  };

  const canAll = (module: keyof RolePermissions, actions: Array<keyof Permission>): boolean => {
    return actions.every(action => can(module, action));
  };

  return {
    can,
    canAny,
    canAll,
    isManager: user?.role === 'manager',
    isAdmin:   user?.role === 'admin',
    isFinance: user?.role === 'finance',
  };
};
