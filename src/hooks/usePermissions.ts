import { useAuth } from '../context/AuthContext';
import { DEFAULT_PERMISSIONS } from '../types/roles';
import type { RolePermissions, Permission } from '../types/roles';

export const usePermissions = () => {
  const { user } = useAuth();

  const can = (module: keyof RolePermissions, action: keyof Permission): boolean => {
    if (!user?.role) return false;

    // Check custom permissions first if they exist
    if (user.permissions?.[module]?.[action] !== undefined) {
      return user.permissions[module][action];
    }

    // Fall back to default role-based permissions
    return DEFAULT_PERMISSIONS[user.role][module][action];
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
  };
};