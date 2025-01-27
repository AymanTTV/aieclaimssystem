// src/types/roles.ts

export type Role = 'admin' | 'manager' | 'finance' | 'claims';

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
  personalInjury: Permission;
  finance: Permission;
  invoices: Permission; // Add this line
  users: Permission;
  customers: Permission;
  company: Permission;
}

export const DEFAULT_PERMISSIONS: Record<Role, RolePermissions> = {
  manager: {
    dashboard: { view: true, create: true, update: true, delete: true },
    vehicles: { view: true, create: true, update: true, delete: true },
    maintenance: { view: true, create: true, update: true, delete: true },
    rentals: { view: true, create: true, update: true, delete: true },
    accidents: { view: true, create: true, update: true, delete: true },
    claims: { view: true, create: true, update: true, delete: true },
    personalInjury: { view: true, create: true, update: true, delete: true },
    finance: { view: true, create: true, update: true, delete: true },
    invoices: { view: true, create: true, update: true, delete: true },
    users: { view: true, create: true, update: true, delete: true },
    customers: { view: true, create: true, update: true, delete: true },
    company: { view: true, create: true, update: true, delete: true }
  },
  admin: {
    dashboard: { view: true, create: true, update: true, delete: false },
    vehicles: { view: true, create: true, update: true, delete: false },
    maintenance: { view: true, create: true, update: true, delete: false },
    rentals: { view: true, create: true, update: true, delete: false },
    accidents: { view: true, create: true, update: true, delete: false },
    claims: { view: true, create: true, update: true, delete: false },
    personalInjury: { view: true, create: true, update: true, delete: false },
    invoices: { view: true, create: true, update: true, delete: true },
    finance: { view: true, create: false, update: false, delete: false },
    users: { view: true, create: false, update: false, delete: false },
    customers: { view: true, create: true, update: true, delete: false },
    company: { view: true, create: false, update: false, delete: false }
  },
  finance: {
    dashboard: { view: true, create: false, update: false, delete: false },
    vehicles: { view: true, create: false, update: false, delete: false },
    maintenance: { view: false, create: false, update: false, delete: false },
    rentals: { view: true, create: false, update: false, delete: false },
    accidents: { view: false, create: false, update: false, delete: false },
    claims: { view: true, create: false, update: false, delete: false },
    personalInjury: { view: false, create: false, update: false, delete: false },
    invoices: { view: true, create: true, update: true, delete: true },
    finance: { view: true, create: true, update: true, delete: false },
    users: { view: false, create: false, update: false, delete: false },
    customers: { view: true, create: false, update: false, delete: false },
    company: { view: true, create: false, update: false, delete: false }
  },
  claims: {
    dashboard: { view: true, create: false, update: false, delete: false },
    vehicles: { view: true, create: false, update: false, delete: false },
    maintenance: { view: false, create: false, update: false, delete: false },
    rentals: { view: true, create: false, update: false, delete: false },
    accidents: { view: true, create: true, update: true, delete: false },
    claims: { view: true, create: true, update: true, delete: false },
    personalInjury: { view: true, create: true, update: true, delete: false },
    invoices: { view: true, create: true, update: true, delete: true },
    finance: { view: false, create: false, update: false, delete: false },
    users: { view: false, create: false, update: false, delete: false },
    customers: { view: true, create: true, update: true, delete: false },
    company: { view: true, create: false, update: false, delete: false }
  }
};

export function getDefaultPermissions(role: Role): RolePermissions {
  return DEFAULT_PERMISSIONS[role];
}
