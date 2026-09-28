import { Role } from '../types';

export const ROLE_PERMISSIONS = {
  admin: {}, // Strict Deny-by-Default: Admin has no automatic permissions unless explicitly assigned
  manager: {
    vehicles: ['view', 'create', 'update'],
    maintenance: ['view', 'create', 'update'],
    rentals: ['view', 'create', 'update'],
    finance: ['view', 'create'],
    users: ['view']
  },
  customer: {
    vehicles: ['view'],
    rentals: ['view', 'create'],
    maintenance: [],
    finance: [],
    users: []
  }
};

export const hasPermission = (role: Role, module: string, action: string): boolean => {
  return ROLE_PERMISSIONS[role]?.[module]?.includes(action) || false;
};