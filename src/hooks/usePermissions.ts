// src/hooks/usePermissions.ts
import { useAuth } from '../context/AuthContext';
import { DEFAULT_PERMISSIONS } from '../types/roles';
import type { RolePermissions, Permission } from '../types/roles';

export const usePermissions = () => {
  const { user } = useAuth();

  const can = (module: keyof RolePermissions, action: keyof Permission): boolean => {
    if (!user?.role) return false;

    // Super-admin has full access to all system modules and actions
    if (user.role === 'admin') return true;

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

    // Cross-module aliasing for customers & members (The Members page uses 'customers' data / 'members' config)
    if (module === 'customers') {
      const memberPerms = user.permissions?.members;
      if (memberPerms && memberPerms[action] !== undefined) {
        return Boolean(memberPerms[action]);
      }
      if (action === 'whatsapp' && (customModulePerms?.send || memberPerms?.whatsapp || memberPerms?.send || user.permissions?.whatsapp?.send)) {
        return true;
      }
      if (action === 'email' && (customModulePerms?.send || memberPerms?.email || memberPerms?.send || user.permissions?.bulkEmail?.send)) {
        return true;
      }
      if (action === 'groupMessaging' && (customModulePerms?.view || memberPerms?.groupMessaging || memberPerms?.view)) {
        return true;
      }
    }

    if (module === 'members') {
      const customerPerms = user.permissions?.customers;
      if (customerPerms && customerPerms[action] !== undefined) {
        return Boolean(customerPerms[action]);
      }
      if (action === 'whatsapp' && (customModulePerms?.send || customerPerms?.whatsapp || customerPerms?.send || user.permissions?.whatsapp?.send)) {
        return true;
      }
      if (action === 'email' && (customModulePerms?.send || customerPerms?.email || customerPerms?.send || user.permissions?.bulkEmail?.send)) {
        return true;
      }
      if (action === 'groupMessaging' && (customModulePerms?.view || customerPerms?.groupMessaging || customerPerms?.view)) {
        return true;
      }
    }

    // 2) Fallback to defaults for the user’s role
    const rolePerms = DEFAULT_PERMISSIONS[user.role];
    const defaultModulePerms = rolePerms?.[module];
    if (defaultModulePerms && defaultModulePerms[action] !== undefined) {
      return Boolean(defaultModulePerms[action]);
    }

    // Fallback cross-check between customers <-> members defaults
    if (module === 'customers' && rolePerms?.members?.[action] !== undefined) {
      return Boolean(rolePerms.members[action]);
    }
    if (module === 'members' && rolePerms?.customers?.[action] !== undefined) {
      return Boolean(rolePerms.customers[action]);
    }

    if (module === 'rentals' && defaultModulePerms) {
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