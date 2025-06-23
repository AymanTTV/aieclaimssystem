// src/types/roles.ts

export type Role = 'admin' | 'manager' | 'finance' | 'claims';

export interface Permission {
  view: boolean;
  create: boolean;
  update: boolean;
  recordPayment: boolean;
  delete: boolean;
  cards: boolean;
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
  invoices: Permission;
  pettyCash: Permission;
  share: Permission;
  driverPay: Permission;
  vdFinance: Permission;
  vdInvoice: Permission; 
  users: Permission;
  vatRecord: Permission;
  customers: Permission;
  company: Permission;
  products: Permission;
}

export const DEFAULT_PERMISSIONS: Record<Role, RolePermissions> = {
  manager: {
    dashboard:     { view: true,  create: true,  update: true,  delete: true,  cards: true },
    vehicles:      { view: true,  create: true,  update: true,  delete: true,  cards: true },
    maintenance:   { view: true,  create: true,  update: true,  delete: true,  cards: true },
    rentals:       { view: true,  create: true,  update: true,  delete: true,  cards: true },
    accidents:     { view: true,  create: true,  update: true,  delete: true,  cards: true },
    claims:        { view: true,  create: true,  update: true,  delete: true,  cards: true },
    personalInjury:{ view: true,  create: true,  update: true,  delete: true,  cards: true },
    finance:       { view: true,  create: true,  update: true,  delete: true,  cards: true },
    invoices:      { view: true,  create: true,  update: true,  delete: true,  cards: true },
    pettyCash:     { view: true,  create: true,  update: true,  delete: true,  cards: true },
    share:         { view: true,  create: true,  update: true,  delete: true,  cards: true },
    vdInvoice:  { view: true,  create: true,  update: true,  delete: true,  cards: true },

    driverPay:     { view: true, create: true, update: true, delete: true, recordPayment: true, cards: true },
    vdFinance:     { view: true,  create: true,  update: true,  delete: true,  cards: true },
    users:         { view: true,  create: true,  update: true,  delete: true,  cards: true },
    vatRecord:     { view: true,  create: true,  update: true,  delete: true,  cards: true },
    customers:     { view: true,  create: true,  update: true,  delete: true,  cards: true },
    company:       { view: true,  create: true,  update: true,  delete: true,  cards: true },
    products:      { view: true,  create: true,  update: true,  delete: true,  cards: true },
  },
  admin: {
    dashboard:     { view: true,  create: false, update: true,  delete: false, cards: true },
    vehicles:      { view: true,  create: false, update: true,  delete: false, cards: true },
    maintenance:   { view: true,  create: false, update: true,  delete: false, cards: true },
    rentals:       { view: true,  create: false, update: true,  delete: false, cards: true },
    accidents:     { view: true,  create: false, update: true,  delete: false, cards: true },
    claims:        { view: true,  create: false, update: true,  delete: false, cards: true },
    personalInjury:{ view: true,  create: false, update: true,  delete: false, cards: true },
    finance:       { view: true,  create: false, update: false, delete: false, cards: true },
    invoices:      { view: true,  create: true,  update: true,  delete: true,  cards: true },
    pettyCash:     { view: true,  create: true,  update: true,  delete: false, cards: true },
    share:         { view: true,  create: true,  update: true,  delete: false, cards: true },
    driverPay:     { view: true, create: true, update: true, delete: false, recordPayment: true, cards: true },
    vdInvoice:  { view: true,  create: true,  update: true,  delete: false, cards: true },
    vdFinance:     { view: true,  create: true,  update: true,  delete: false, cards: true },
    users:         { view: false, create: false, update: false, delete: false, cards: false },
    vatRecord:     { view: true,  create: true,  update: true,  delete: false, cards: true },
    customers:     { view: true,  create: false, update: false, delete: false, cards: true },
    company:       { view: true,  create: false, update: false, delete: false, cards: true },
    products:      { view: true,  create: false, update: false, delete: false, cards: true },
  },
  finance: {
    dashboard:     { view: true,  create: false, update: false, delete: false, cards: true },
    vehicles:      { view: true,  create: false, update: false, delete: false, cards: true },
    maintenance:   { view: false, create: false, update: false, delete: false, cards: false },
    rentals:       { view: true,  create: false, update: false, delete: false, cards: true },
    accidents:     { view: false, create: false, update: false, delete: false, cards: false },
    claims:        { view: true,  create: false, update: false, delete: false, cards: true },
    personalInjury:{ view: false, create: false, update: false, delete: false, cards: false },
    finance:       { view: true,  create: true,  update: true,  delete: false, cards: true },
    invoices:      { view: true,  create: true,  update: true,  delete: true,  cards: true },
    pettyCash:     { view: true,  create: true,  update: true,  delete: false, cards: true },
    share:         { view: true,  create: true,  update: true,  delete: false, cards: true },
    vdInvoice:  { view: true,  create: true,  update: true,  delete: false, cards: true },

    driverPay:     { view: true, create: true, update: true, delete: false, recordPayment: true, cards: true },
    vdFinance:     { view: true,  create: true,  update: true,  delete: false, cards: true },
    users:         { view: false, create: false, update: false, delete: false, cards: false },
    vatRecord:     { view: true,  create: true,  update: true,  delete: false, cards: true },
    customers:     { view: true,  create: false, update: false, delete: false, cards: true },
    company:       { view: true,  create: false, update: false, delete: false, cards: true },
    products:      { view: true,  create: false, update: false, delete: false, cards: true },
  },
  claims: {
    dashboard:     { view: true,  create: false, update: false, delete: false, cards: true },
    vehicles:      { view: true,  create: false, update: false, delete: false, cards: true },
    maintenance:   { view: false, create: false, update: false, delete: false, cards: false },
    rentals:       { view: true,  create: false, update: false, delete: false, cards: true },
    accidents:     { view: true,  create: true,  update: true,  delete: false, cards: true },
    claims:        { view: true,  create: true,  update: true,  delete: false, cards: true },
    personalInjury:{ view: true,  create: true,  update: true,  delete: false, cards: true },
    finance:       { view: false, create: false, update: false, delete: false, cards: false },
    invoices:      { view: true,  create: true,  update: true,  delete: true,  cards: true },
    pettyCash:     { view: false, create: false, update: false, delete: false, cards: false },
    share:         { view: false, create: false, update: false, delete: false, cards: false },
    driverPay:     { view: false, create: false, update: false, delete: false, recordPayment: false, cards: false },
    vdFinance:     { view: true,  create: true,  update: true,  delete: false, cards: true },
    users:         { view: false, create: false, update: false, delete: false, cards: false },
    vatRecord:     { view: false, create: false, update: false, delete: false, cards: false },
    vdInvoice:  { view: true,  create: true,  update: true,  delete: false, cards: true },
    customers:     { view: true,  create: true,  update: true,  delete: false, cards: true },
    company:       { view: true,  create: false, update: false, delete: false, cards: true },
    products:      { view: true,  create: false, update: false, delete: false, cards: true },
  },
};

export function getDefaultPermissions(role: Role): RolePermissions {
  return DEFAULT_PERMISSIONS[role];
}
