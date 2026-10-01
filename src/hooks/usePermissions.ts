// src/hooks/usePermissions.ts
import { useAuth } from '../context/AuthContext';
import type { RolePermissions, Permission } from '../types/roles';

export const usePermissions = () => {
  const { user } = useAuth();

  const can = (module: keyof RolePermissions, action: keyof Permission): boolean => {
    if (!user) return false;

    // Direct check for payment deletion / maintenance finance privileges on user profile
    if (action === 'deletePayment' || action === ('can_delete_payments' as any)) {
      if (
        user.can_delete_payments === true ||
        user.manage_maintenance_finance === true ||
        (user as any)['can_delete_payments'] === true ||
        (user as any)['manage_maintenance_finance'] === true
      ) {
        return true;
      }
    }
    if (action === ('manage_maintenance_finance' as any)) {
      if (
        user.manage_maintenance_finance === true ||
        (user as any)['manage_maintenance_finance'] === true
      ) {
        return true;
      }
    }
    if (action === 'canManageProfitDistribution' || action === ('canAccessCommissionSplits' as any)) {
      if (
        user.canManageProfitDistribution === true ||
        user.canAccessCommissionSplits === true ||
        (user as any)['canManageProfitDistribution'] === true ||
        (user as any)['canAccessCommissionSplits'] === true ||
        user.permissions?.finance?.canManageProfitDistribution === true ||
        (user.permissions as any)?.canManageProfitDistribution === true ||
        ['superadmin', 'owner'].includes(user.role?.toLowerCase() || '')
      ) {
        return true;
      }
    }

    // Strict Universal Explicit-Allow (Deny-by-Default):
    // Access is granted ONLY if the user's specific permission switch is explicitly set to true.
    const userModulePerms = user.permissions?.[module];
    if (userModulePerms && userModulePerms[action] === true) {
      return true;
    }

    // Payment delete aliases across maintenance and finance
    if (module === 'maintenance') {
      if (action === 'deletePayment' || action === ('can_delete_payments' as any)) {
        if (
          userModulePerms?.can_delete_payments === true ||
          userModulePerms?.manage_maintenance_finance === true ||
          userModulePerms?.deletePayment === true ||
          (userModulePerms as any)?.['can_delete_payments'] === true ||
          (userModulePerms as any)?.['manage_maintenance_finance'] === true ||
          user.permissions?.finance?.can_delete_payments === true ||
          user.permissions?.finance?.manage_maintenance_finance === true ||
          user.permissions?.finance?.deletePayment === true
        ) {
          return true;
        }
      }
      if (action === ('manage_maintenance_finance' as any)) {
        if (
          userModulePerms?.manage_maintenance_finance === true ||
          (userModulePerms as any)?.['manage_maintenance_finance'] === true ||
          user.permissions?.finance?.manage_maintenance_finance === true
        ) {
          return true;
        }
      }
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
    canDeletePayments: Boolean(
      user?.can_delete_payments === true ||
      user?.manage_maintenance_finance === true ||
      (user as any)?.can_delete_payments === true ||
      (user as any)?.manage_maintenance_finance === true ||
      user?.permissions?.maintenance?.can_delete_payments === true ||
      user?.permissions?.maintenance?.manage_maintenance_finance === true ||
      user?.permissions?.maintenance?.deletePayment === true ||
      (user?.permissions?.maintenance as any)?.['can_delete_payments'] === true ||
      (user?.permissions?.maintenance as any)?.['manage_maintenance_finance'] === true ||
      user?.permissions?.finance?.can_delete_payments === true ||
      user?.permissions?.finance?.manage_maintenance_finance === true ||
      user?.permissions?.finance?.deletePayment === true ||
      (user?.permissions as any)?.can_delete_payments === true ||
      (user?.permissions as any)?.manage_maintenance_finance === true
    ),
    canManageMaintenanceFinance: Boolean(
      user?.manage_maintenance_finance === true ||
      (user as any)?.manage_maintenance_finance === true ||
      user?.permissions?.maintenance?.manage_maintenance_finance === true ||
      (user?.permissions?.maintenance as any)?.['manage_maintenance_finance'] === true ||
      user?.permissions?.finance?.manage_maintenance_finance === true ||
      (user?.permissions as any)?.manage_maintenance_finance === true
    ),
    canManageProfitDistribution: Boolean(
      user?.canManageProfitDistribution === true ||
      user?.canAccessCommissionSplits === true ||
      (user as any)?.canManageProfitDistribution === true ||
      (user as any)?.canAccessCommissionSplits === true ||
      user?.permissions?.finance?.canManageProfitDistribution === true ||
      user?.permissions?.finance?.canAccessCommissionSplits === true ||
      (user?.permissions as any)?.canManageProfitDistribution === true ||
      ['superadmin', 'owner'].includes(user?.role?.toLowerCase() || '')
    ),
    role: user?.role ?? null,
    permissions: user?.permissions ?? null,
  };
};