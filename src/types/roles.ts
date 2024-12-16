export type Role = 'admin' | 'manager' | 'driver';

export interface Permission {
  view: boolean;
  create: boolean;
  update: boolean;
  delete: boolean;
}

export interface RolePermissions {
  dashboard: Permission;
  vehicles: Permission;
  maintenance: Permission;
  rentals: Permission;
  accidents: Permission;
  claims: Permission;
  finance: Permission;
  users: Permission;
  customers: Permission;
}

export const DEFAULT_PERMISSIONS: Record<Role, RolePermissions> = {
  admin: {
    dashboard: { view: true, create: true, update: true, delete: true },
    vehicles: { view: true, create: true, update: true, delete: true },
    maintenance: { view: true, create: true, update: true, delete: true },
    rentals: { view: true, create: true, update: true, delete: true },
    accidents: { view: true, create: true, update: true, delete: true },
    claims: { view: true, create: true, update: true, delete: true },
    finance: { view: true, create: true, update: true, delete: true },
    users: { view: true, create: true, update: true, delete: true },
    customers: { view: true, create: true, update: true, delete: true }
  },
  manager: {
    dashboard: { view: true, create: false, update: false, delete: false },
    vehicles: { view: true, create: true, update: true, delete: false },
    maintenance: { view: true, create: true, update: true, delete: false },
    rentals: { view: true, create: true, update: true, delete: false },
    accidents: { view: true, create: true, update: true, delete: false },
    claims: { view: true, create: true, update: true, delete: false },
    finance: { view: true, create: true, update: true, delete: false },
    users: { view: true, create: false, update: false, delete: false },
    customers: { view: true, create: true, update: true, delete: false }
  },
  driver: {
    dashboard: { view: true, create: false, update: false, delete: false },
    vehicles: { view: true, create: false, update: false, delete: false },
    maintenance: { view: true, create: true, update: false, delete: false },
    rentals: { view: true, create: false, update: false, delete: false },
    accidents: { view: true, create: true, update: false, delete: false },
    claims: { view: true, create: true, update: false, delete: false },
    finance: { view: false, create: false, update: false, delete: false },
    users: { view: false, create: false, update: false, delete: false },
    customers: { view: false, create: false, update: false, delete: false }
  }
};

export const hasPermission = (
  role: Role,
  module: keyof RolePermissions,
  action: keyof Permission
): boolean => {
  return DEFAULT_PERMISSIONS[role][module][action];
};

export const getDefaultPermissions = (role: Role): RolePermissions => {
  return DEFAULT_PERMISSIONS[role];
};

export const isModuleVisible = (role: Role, module: keyof RolePermissions): boolean => {
  return DEFAULT_PERMISSIONS[role][module].view;
};