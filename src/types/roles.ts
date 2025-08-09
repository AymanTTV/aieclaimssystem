// src/types/roles.ts

export type Role = 'admin' | 'manager' | 'finance' | 'claims';

export interface Permission {
  view: boolean;
  create: boolean;
  update: boolean;
  recordPayment: boolean;
  delete: boolean;
  cards: boolean;
  share: boolean;
  // NEW: Rental Type Permissions
  mileage: boolean;
  daily: boolean;
  weekly: boolean;
  claim: boolean;
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
  incomeExpense: Permission; // Added
  skylineIncomeExpense: Permission; // Added
}

export const DEFAULT_PERMISSIONS: Record<Role, RolePermissions> = {
  manager: {
    dashboard:     { view: true,  create: true,  update: true,  delete: true,  cards: true, recordPayment: false, share: false, mileage: false, daily: false, weekly: false, claim: false },
    vehicles:      { view: true, create: true, update: true, delete: true, cards: true, mileage: true, recordPayment: false, share: false, daily: false, weekly: false, claim: false },
    maintenance:   { view: true,  create: true,  update: true,  delete: true,  cards: true, recordPayment: false, share: false, mileage: false, daily: false, weekly: false, claim: false },
    rentals:       { view: true,  create: true,  update: true,  delete: true,  cards: true, daily: true, weekly: true, claim: true, recordPayment: false, share: false, mileage: false },
    accidents:     { view: true,  create: true,  update: true,  delete: true,  cards: true, recordPayment: false, share: false, mileage: false, daily: false, weekly: false, claim: false },
    claims:        { view: true,  create: true,  update: true,  delete: true,  cards: true, recordPayment: false, share: false, mileage: false, daily: false, weekly: false, claim: false },
    personalInjury:{ view: true,  create: true,  update: true,  delete: true,  cards: true, recordPayment: false, share: false, mileage: false, daily: false, weekly: false, claim: false },
    finance:       { view: true,  create: true,  update: true,  delete: true,  cards: true, share: true, recordPayment: false, mileage: false, daily: false, weekly: false, claim: false },
    invoices:      { view: true,  create: true,  update: true,  delete: true,  cards: true, recordPayment: false, share: false, mileage: false, daily: false, weekly: false, claim: false },
    pettyCash:     { view: true,  create: true,  update: true,  delete: true,  cards: true, recordPayment: false, share: false, mileage: false, daily: false, weekly: false, claim: false },
    share:         { view: true,  create: true,  update: true,  delete: true,  cards: true, share: true, recordPayment: false, mileage: false, daily: false, weekly: false, claim: false },
    vdInvoice:     { view: true,  create: true,  update: true,  delete: true,  cards: true, recordPayment: false, share: false, mileage: false, daily: false, weekly: false, claim: false },
    driverPay:     { view: true, create: true, update: true, delete: true, recordPayment: true, cards: true, share: false, mileage: false, daily: false, weekly: false, claim: false },
    vdFinance:     { view: true,  create: true,  update: true,  delete: true,  cards: true, recordPayment: false, share: false, mileage: false, daily: false, weekly: false, claim: false },
    users:         { view: true,  create: true,  update: true,  delete: true,  cards: true, recordPayment: false, share: false, mileage: false, daily: false, weekly: false, claim: false },
    vatRecord:     { view: true,  create: true,  update: true,  delete: true,  cards: true, recordPayment: false, share: false, mileage: false, daily: false, weekly: false, claim: false },
    customers:     { view: true,  create: true,  update: true,  delete: true,  cards: true, recordPayment: false, share: false, mileage: false, daily: false, weekly: false, claim: false },
    company:       { view: true,  create: true,  update: true,  delete: true,  cards: true, recordPayment: false, share: false, mileage: false, daily: false, weekly: false, claim: false },
    products:      { view: true,  create: true,  update: true,  delete: true,  cards: true, recordPayment: false, share: false, mileage: false, daily: false, weekly: false, claim: false },
    incomeExpense: { view: true,  create: true,  update: true,  delete: true,  cards: true, recordPayment: false, share: false, mileage: false, daily: false, weekly: false, claim: false },
    skylineIncomeExpense: { view: true,  create: true,  update: true,  delete: true,  cards: true, recordPayment: false, share: false, mileage: false, daily: false, weekly: false, claim: false },
  },
  admin: {
    dashboard:     { view: true,  create: false, update: true,  delete: false, cards: true, recordPayment: false, share: false, mileage: false, daily: false, weekly: false, claim: false },
    vehicles:      { view: true,  create: false, update: true,  delete: false, cards: true, mileage: true, recordPayment: false, share: false, daily: false, weekly: false, claim: false },
    maintenance:   { view: true,  create: false, update: true,  delete: false, cards: true, recordPayment: false, share: false, mileage: false, daily: false, weekly: false, claim: false },
    rentals:       { view: true,  create: false, update: true,  delete: false, cards: true, daily: true, weekly: true, claim: true, recordPayment: false, share: false, mileage: false },
    accidents:     { view: true,  create: false, update: true,  delete: false, cards: true, recordPayment: false, share: false, mileage: false, daily: false, weekly: false, claim: false },
    claims:        { view: true,  create: false, update: true,  delete: false, cards: true, recordPayment: false, share: false, mileage: false, daily: false, weekly: false, claim: false },
    personalInjury:{ view: true,  create: false, update: true,  delete: false, cards: true, recordPayment: false, share: false, mileage: false, daily: false, weekly: false, claim: false },
    finance:       { view: true,  create: false, update: false, delete: false, cards: true, share: true, recordPayment: false, mileage: false, daily: false, weekly: false, claim: false },
    invoices:      { view: true,  create: true,  update: true,  delete: true,  cards: true, recordPayment: false, share: false, mileage: false, daily: false, weekly: false, claim: false },
    pettyCash:     { view: true,  create: true,  update: true,  delete: false, cards: true, recordPayment: false, share: false, mileage: false, daily: false, weekly: false, claim: false },
    share:         { view: true,  create: true,  update: true,  delete: false, cards: true, share: true, recordPayment: false, mileage: false, daily: false, weekly: false, claim: false },
    driverPay:     { view: true, create: true, update: true, delete: false, recordPayment: true, cards: true, share: false, mileage: false, daily: false, weekly: false, claim: false },
    vdInvoice:     { view: true,  create: true,  update: true,  delete: false, cards: true, recordPayment: false, share: false, mileage: false, daily: false, weekly: false, claim: false },
    vdFinance:     { view: true,  create: true,  update: true,  delete: false, cards: true, recordPayment: false, share: false, mileage: false, daily: false, weekly: false, claim: false },
    users:         { view: false, create: false, update: false, delete: false, cards: false, recordPayment: false, share: false, mileage: false, daily: false, weekly: false, claim: false },
    vatRecord:     { view: true,  create: true,  update: true,  delete: false, cards: true, recordPayment: false, share: false, mileage: false, daily: false, weekly: false, claim: false },
    customers:     { view: true,  create: false, update: false, delete: false, cards: true, recordPayment: false, share: false, mileage: false, daily: false, weekly: false, claim: false },
    company:       { view: true,  create: false, update: false, delete: false, cards: true, recordPayment: false, share: false, mileage: false, daily: false, weekly: false, claim: false },
    products:      { view: true,  create: false, update: false, delete: false, cards: true, recordPayment: false, share: false, mileage: false, daily: false, weekly: false, claim: false },
    incomeExpense: { view: true,  create: true,  update: true,  delete: true,  cards: true, recordPayment: false, share: false, mileage: false, daily: false, weekly: false, claim: false },
    skylineIncomeExpense: { view: true,  create: true,  update: true,  delete: true,  cards: true, recordPayment: false, share: false, mileage: false, daily: false, weekly: false, claim: false },
  },
  finance: {
    dashboard:     { view: true,  create: false, update: false, delete: false, cards: true, recordPayment: false, share: false, mileage: false, daily: false, weekly: false, claim: false },
    vehicles:      { view: true,  create: false, update: false, delete: false, cards: true, mileage: true, recordPayment: false, share: false, daily: false, weekly: false, claim: false },
    maintenance:   { view: false, create: false, update: false, delete: false, cards: false, recordPayment: false, share: false, mileage: false, daily: false, weekly: false, claim: false },
    rentals:       { view: true,  create: false, update: false, delete: false, cards: true, daily: false, weekly: false, claim: false, recordPayment: false, share: false, mileage: false },
    accidents:     { view: false, create: false, update: false, delete: false, cards: false, recordPayment: false, share: false, mileage: false, daily: false, weekly: false, claim: false },
    claims:        { view: true,  create: false, update: false, delete: false, cards: true, recordPayment: false, share: false, mileage: false, daily: false, weekly: false, claim: false },
    personalInjury:{ view: false, create: false, update: false, delete: false, cards: false, recordPayment: false, share: false, mileage: false, daily: false, weekly: false, claim: false },
    finance:       { view: true,  create: true,  update: true,  delete: false, cards: true, share: true, recordPayment: false, mileage: false, daily: false, weekly: false, claim: false },
    invoices:      { view: true,  create: true,  update: true,  delete: true,  cards: true, recordPayment: false, share: false, mileage: false, daily: false, weekly: false, claim: false },
    pettyCash:     { view: true,  create: true,  update: true,  delete: false, cards: true, recordPayment: false, share: false, mileage: false, daily: false, weekly: false, claim: false },
    share:         { view: true,  create: true,  update: true,  delete: false, cards: true, share: false, recordPayment: false, mileage: false, daily: false, weekly: false, claim: false },
    vdInvoice:     { view: true,  create: true,  update: true,  delete: false, cards: true, recordPayment: false, share: false, mileage: false, daily: false, weekly: false, claim: false },
    driverPay:     { view: true, create: true, update: true, delete: false, recordPayment: true, cards: true, share: false, mileage: false, daily: false, weekly: false, claim: false },
    vdFinance:     { view: true,  create: true,  update: true,  delete: false, cards: true, recordPayment: false, share: false, mileage: false, daily: false, weekly: false, claim: false },
    users:         { view: false, create: false, update: false, delete: false, cards: false, recordPayment: false, share: false, mileage: false, daily: false, weekly: false, claim: false },
    vatRecord:     { view: true,  create: true,  update: true,  delete: false, cards: true, recordPayment: false, share: false, mileage: false, daily: false, weekly: false, claim: false },
    customers:     { view: true,  create: false, update: false, delete: false, cards: true, recordPayment: false, share: false, mileage: false, daily: false, weekly: false, claim: false },
    company:       { view: true,  create: false, update: false, delete: false, cards: true, recordPayment: false, share: false, mileage: false, daily: false, weekly: false, claim: false },
    products:      { view: true,  create: false, update: false, delete: false, cards: true, recordPayment: false, share: false, mileage: false, daily: false, weekly: false, claim: false },
    incomeExpense: { view: true,  create: true,  update: true,  delete: true,  cards: true, recordPayment: false, share: false, mileage: false, daily: false, weekly: false, claim: false },
    skylineIncomeExpense: { view: true,  create: true,  update: true,  delete: true,  cards: true, recordPayment: false, share: false, mileage: false, daily: false, weekly: false, claim: false },
  },
  claims: {
    dashboard:     { view: true,  create: false, update: false, delete: false, cards: true, recordPayment: false, share: false, mileage: false, daily: false, weekly: false, claim: false },
    vehicles:      { view: true,  create: false, update: false, delete: false, cards: true, mileage: true, recordPayment: false, share: false, daily: false, weekly: false, claim: false },
    maintenance:   { view: false, create: false, update: false, delete: false, cards: false, recordPayment: false, share: false, mileage: false, daily: false, weekly: false, claim: false },
    rentals:       { view: true,  create: false, update: false, delete: false, cards: true, daily: false, weekly: false, claim: true, recordPayment: false, share: false, mileage: false },
    accidents:     { view: true,  create: true,  update: true,  delete: false, cards: true, recordPayment: false, share: false, mileage: false, daily: false, weekly: false, claim: false },
    claims:        { view: true,  create: true,  update: true,  delete: false, cards: true, recordPayment: false, share: false, mileage: false, daily: false, weekly: false, claim: false },
    personalInjury:{ view: true,  create: true,  update: true,  delete: false, cards: true, recordPayment: false, share: false, mileage: false, daily: false, weekly: false, claim: false },
    finance:       { view: false, create: false, update: false, delete: false, cards: false, share: false, recordPayment: false, mileage: false, daily: false, weekly: false, claim: false },
    invoices:      { view: true,  create: true,  update: true,  delete: true,  cards: true, recordPayment: false, share: false, mileage: false, daily: false, weekly: false, claim: false },
    pettyCash:     { view: false, create: false, update: false, delete: false, cards: false, recordPayment: false, share: false, mileage: false, daily: false, weekly: false, claim: false },
    share:         { view: false, create: false, update: false, delete: false, cards: false, share: false, recordPayment: false, mileage: false, daily: false, weekly: false, claim: false },
    driverPay:     { view: false, create: false, update: false, delete: false, recordPayment: false, cards: false, share: false, mileage: false, daily: false, weekly: false, claim: false },
    vdFinance:     { view: true,  create: true,  update: true,  delete: false, cards: true, recordPayment: false, share: false, mileage: false, daily: false, weekly: false, claim: false },
    users:         { view: false, create: false, update: false, delete: false, cards: false, recordPayment: false, share: false, mileage: false, daily: false, weekly: false, claim: false },
    vatRecord:     { view: false, create: false, update: false, delete: false, cards: false, recordPayment: false, share: false, mileage: false, daily: false, weekly: false, claim: false },
    vdInvoice:     { view: true,  create: true,  update: true,  delete: false, cards: true, recordPayment: false, share: false, mileage: false, daily: false, weekly: false, claim: false },
    customers:     { view: true,  create: true,  update: true,  delete: false, cards: true, recordPayment: false, share: false, mileage: false, daily: false, weekly: false, claim: false },
    company:       { view: true,  create: false, update: false, delete: false, cards: true, recordPayment: false, share: false, mileage: false, daily: false, weekly: false, claim: false },
    products:      { view: true,  create: false, update: false, delete: false, cards: true, recordPayment: false, share: false, mileage: false, daily: false, weekly: false, claim: false },
    incomeExpense: { view: false, create: false, update: false, delete: false, cards: false, recordPayment: false, share: false, mileage: false, daily: false, weekly: false, claim: false },
    skylineIncomeExpense: { view: false, create: false, update: false, delete: false, cards: false, recordPayment: false, share: false, mileage: false, daily: false, weekly: false, claim: false },
  },
};

export function getDefaultPermissions(role: Role): RolePermissions {
  return DEFAULT_PERMISSIONS[role];
}
