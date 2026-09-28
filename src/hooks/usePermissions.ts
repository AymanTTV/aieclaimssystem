// src/hooks/usePermissions.ts
import { useAuth } from '../context/AuthContext';
import type { RolePermissions, Permission } from '../types/roles';

export const usePermissions = () => {
  const { user } = useAuth();

  const can = (module: keyof RolePermissions, action: keyof Permission): boolean => {
    if (!user) return false;

    // Strict Universal Explicit-Allow (Deny-by-Default):
    // NO AUTOMATIC PERMISSIONS FOR ANYONE. No user, role, admin, or MANAGER gets automatic access.
    // Access is granted ONLY if the user's specific permission switch is explicitly set to true.
    const userModulePerms = user.permissions?.[module];
    if (userModulePerms && userModulePerms[action] === true) {
      return true;
    }

    // Support High Risk Registry matrix key aliases and edit/update mapping
    if (
      module === 'highRisk' ||
      (module as string) === 'highRiskRegistry' ||
      (module as string) === 'high_risk_registry' ||
      (module as string) === 'High Risk Registry'
    ) {
      const p = user.permissions;
      if (p) {
        const hr = (p as any).highRisk || (p as any).highRiskRegistry || (p as any)['high_risk_registry'] || (p as any)['High Risk Registry'];
        if (hr) {
          if (hr[action] === true) return true;
          if ((action as string) === 'update' && hr.edit === true) return true;
          if ((action as string) === 'edit' && hr.update === true) return true;
        }
      }
      return false;
    }

    // Cross-module explicit mappings for customer/member communication aliases
    if (module === 'customers') {
      const memberPerms = user.permissions?.members;
      if (memberPerms && memberPerms[action] === true) return true;
    }
    if (module === 'members') {
      const customerPerms = user.permissions?.customers;
      if (customerPerms && customerPerms[action] === true) return true;
    }

    // If unticked, missing, false, or undefined -> Strictly Deny Access
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
    isManager: false, // Universal Explicit-Allow: No manager bypass anywhere
    isAdmin:   false, // Universal Explicit-Allow: No admin bypass anywhere
    isSuperAdmin: user?.role?.toLowerCase() === 'superadmin',
    isSupervisor: user?.role?.toLowerCase() === 'supervisor',
    isStaff:      user?.role?.toLowerCase() === 'staff',
    isAccountant: user?.role?.toLowerCase() === 'accountant',
    isFinance: user?.role?.toLowerCase() === 'finance',
    isClaims:  user?.role?.toLowerCase() === 'claims',
    isCompany: user?.role?.toLowerCase() === 'company', 
    isMember:  user?.role?.toLowerCase() === 'member',
    role: user?.role ?? null,
    permissions: user?.permissions ?? null,
  };
};