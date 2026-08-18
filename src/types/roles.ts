// src/types/roles.ts

// ▶ Roles
export type Role = 'admin' | 'manager' | 'finance' | 'claims' | 'member' | 'company';

// ▶ One permission object per module
export interface Permission {
  view: boolean;
  create?: boolean;
  update?: boolean;
  recordPayment?: boolean;
  delete?: boolean;
  cards?: boolean;
  share?: boolean;
  
  // Rental Type Permissions
  mileage?: boolean;
  daily?: boolean;
  weekly?: boolean;
  claim?: boolean;

  // Extra data I/O permissions
  export?: boolean;
  import?: boolean;
  send?: boolean;

  // Vehicle Owner column + DriverPay lock/unlock
  owner?: boolean;
  lock?: boolean;
  unlock?: boolean;

  // --- NEW PERMISSIONS ADDED ---
  syncStatus?: boolean;
  sale?: boolean;
  copyId?: boolean;
  singleDoc?: boolean;
  tableStatus?: boolean;
  complete?: boolean;
  completed?: boolean;
  categories?: boolean;
  groups?: boolean;
  availableVehicles?: boolean;
  completion?: boolean;
  discount?: boolean;
  note?: boolean;
  state?: boolean;
  period?: boolean;
  reoccurring?: boolean;
  accounts?: boolean;
  assign?: boolean;
  signatureReq?: boolean;
  clearHistory?: boolean;
  
  // Mileage History Permissions
  mileageHistoryView?: boolean;
  mileageHistoryEdit?: boolean;
  mileageHistoryDelete?: boolean;
  
  // Payment specific permissions
  viewPayment?: boolean;
  editPayment?: boolean;
  deletePayment?: boolean;
  
  // WhatsApp & Email targets
  targetFinance?: boolean;
  targetRental?: boolean;
  targetMaintenance?: boolean;
  targetInvoice?: boolean;
  targetClaim?: boolean;
  targetCustom?: boolean;

  quickContact?: boolean;
  reminder?: boolean;

  // Trash specific
  restore?: boolean;
  deletePermanently?: boolean;
}

// ▶ All modules used across the app
export interface RolePermissions {
  dashboard: Permission;
  vehicles: Permission;
  utilisation: Permission;             
  maintenance: Permission;          
  rentals: Permission;              
  accidents: Permission;            
  claims: Permission;               
  vdFinance: Permission;            
  vdInvoice: Permission;            
  driverPay: Permission;            
  pettyCash: Permission;            
  aiePettyCash: Permission;         
  incomeExpense: Permission;        
  skylineIncomeExpense: Permission; 
  finance: Permission;              
  invoices: Permission;             
  vatRecord: Permission;            
  share: Permission;                
  members: Permission;
  customers: Permission;            
  products: Permission;             
  whatsapp: Permission;
  bulkEmail: Permission;
  waiting: Permission; 
  company: Permission;              
  trash: Permission; 
  users: Permission;                
  todo: Permission;
  settings: Permission;
  automation: Permission; 
  memberProfile: Permission;
  memberRentals: Permission;
  memberTransactions: Permission;
  memberInvoices: Permission;
}

// ------------------------- TEMPLATES TO ENSURE ALL KEYS RENDER -------------------------

const BASE_DASHBOARD = { view: false };
const BASE_VEHICLES = { view: false, create: false, update: false, delete: false, cards: false, mileage: false, recordPayment: false, export: false, owner: false, syncStatus: false, sale: false, copyId: false, singleDoc: false, mileageHistoryView: false, mileageHistoryEdit: false, mileageHistoryDelete: false };
const BASE_UTILISATION = { view: false, export: true, singleDoc: true };
const BASE_MAINTENANCE = { view: false, create: false, update: false, delete: false, cards: false, recordPayment: false, export: false, tableStatus: false, complete: false, completed: false, singleDoc: false, categories: false };
const BASE_RENTALS = { view: false, create: false, update: false, delete: false, cards: false, daily: false, weekly: false, claim: false, recordPayment: false, export: false, syncStatus: false, singleDoc: false, availableVehicles: false, completion: false, discount: false, note: false, viewPayment: false, editPayment: false, deletePayment: false };
const BASE_ACCIDENTS = { view: false, create: false, update: false, delete: false, cards: false, export: false, singleDoc: false, state: false };
const BASE_CLAIMS = { view: false, create: false, update: false, delete: false, cards: false, export: false, state: false, note: false, singleDoc: false };
const BASE_VD_FINANCE = { view: false, create: false, update: false, delete: false, cards: false, export: false, import: false, categories: false, groups: false, singleDoc: false, recordPayment: false };
const BASE_VD_INVOICE = { view: false, create: false, update: false, delete: false, cards: false, singleDoc: false };
const BASE_DRIVER_PAY = { view: false, create: false, update: false, delete: false, recordPayment: false, cards: false, export: false, lock: false, unlock: false, singleDoc: false, period: false };
const BASE_PETTY_CASH = { view: false, create: false, update: false, delete: false, cards: false, export: false, import: false, categories: false, groups: false, singleDoc: false };
const BASE_INCOME_EXPENSE = { view: false, create: false, update: false, delete: false, cards: false, share: false, categories: false, reoccurring: false, singleDoc: false };
const BASE_FINANCE = { view: false, create: false, update: false, delete: false, cards: false, recordPayment: false, export: false, accounts: false, categories: false, groups: false, reoccurring: false, assign: false, singleDoc: false };
const BASE_INVOICES = { view: false, create: false, update: false, delete: false, cards: false, recordPayment: false, export: false, categories: false, singleDoc: false };
const BASE_VAT_RECORD = { view: false, create: false, update: false, delete: false, cards: false, export: false, groups: false, categories: false, reoccurring: false, state: false, singleDoc: false };
const BASE_SHARE = { view: false, create: false, update: false, delete: false, cards: false, share: false, export: false, import: false, categories: false, reoccurring: false, singleDoc: false };
const BASE_MEMBERS = { view: false, create: false, update: false, delete: false, cards: false, assign: false, signatureReq: false, singleDoc: false };
const BASE_CUSTOMERS = { view: false, create: false, update: false, delete: false, cards: false, export: false };
const BASE_PRODUCTS = { view: false, create: false, update: false, delete: false, cards: false, export: false, categories: false };
const BASE_COMMUNICATION = { view: false, send: false, clearHistory: false, targetFinance: false, targetRental: false, targetMaintenance: false, targetInvoice: false, targetClaim: false, targetCustom: false };
const BASE_WAITING = { view: false, create: false, update: false, delete: false, export: false, categories: false, groups: false, quickContact: false, reminder: false };
const BASE_COMPANY = { view: false, create: false, update: false, delete: false, cards: false };
const BASE_TRASH = { view: false, cards: false, restore: false, deletePermanently: false };
const BASE_USERS = { view: false, create: false, update: false, delete: false, cards: false };
const BASE_TODO = { view: false, create: false, update: false, delete: false, export: false, categories: false, groups: false };
const BASE_SETTINGS = { view: false, update: false };
const BASE_AUTOMATION = { view: false, create: false, update: false, delete: false }; 
const BASE_PORTAL = { view: false, update: false };

// ------------------------- DEFAULTS -------------------------

export const DEFAULT_PERMISSIONS: Record<Role, RolePermissions> = {
  // ---------------- MANAGER ----------------
  manager: {
    dashboard: { ...BASE_DASHBOARD, view: true },
    vehicles: { ...BASE_VEHICLES, view: true, create: true, update: true, delete: true, cards: true, mileage: true, export: true, owner: true, syncStatus: true, sale: true, copyId: true, singleDoc: true, mileageHistoryView: true, mileageHistoryEdit: true, mileageHistoryDelete: true },
    utilisation: { ...BASE_UTILISATION, view: true },
    maintenance: { ...BASE_MAINTENANCE, view: true, create: true, update: true, delete: true, cards: true, export: true, tableStatus: true, complete: true, completed: true, singleDoc: true, categories: true },
    rentals: { ...BASE_RENTALS, view: true, create: true, update: true, delete: true, cards: true, daily: true, weekly: true, claim: true, export: true, syncStatus: true, singleDoc: true, availableVehicles: true, completion: true, discount: true, note: true, recordPayment: true, viewPayment: true, editPayment: true, deletePayment: true },
    accidents: { ...BASE_ACCIDENTS, view: true, create: true, update: true, delete: true, cards: true, export: true, singleDoc: true, state: true },
    claims: { ...BASE_CLAIMS, view: true, create: true, update: true, delete: true, cards: true, export: true, state: true, note: true, singleDoc: true },
    vdFinance: { ...BASE_VD_FINANCE, view: true, create: true, update: true, delete: true, cards: true, export: true, import: true, categories: true, groups: true, singleDoc: true, recordPayment: true },
    vdInvoice: { ...BASE_VD_INVOICE, view: true, create: true, update: true, delete: true, cards: true, singleDoc: true },
    driverPay: { ...BASE_DRIVER_PAY, view: true, create: true, update: true, delete: true, recordPayment: true, cards: true, export: true, lock: true, unlock: true, singleDoc: true, period: true },
    pettyCash: { ...BASE_PETTY_CASH, view: true, create: true, update: true, delete: true, cards: true, export: true, import: true, categories: true, groups: true, singleDoc: true },
    aiePettyCash: { ...BASE_PETTY_CASH, view: true, create: true, update: true, delete: true, cards: true, export: true, import: true, categories: true, groups: true, singleDoc: true },
    incomeExpense: { ...BASE_INCOME_EXPENSE, view: true, create: true, update: true, delete: true, cards: true, categories: true, reoccurring: true, singleDoc: true },
    skylineIncomeExpense: { ...BASE_INCOME_EXPENSE, view: true, create: true, update: true, delete: true, cards: true, categories: true, reoccurring: true, singleDoc: true },
    finance: { ...BASE_FINANCE, view: true, create: true, update: true, delete: true, cards: true, export: true, accounts: true, categories: true, groups: true, reoccurring: true, assign: true, singleDoc: true },
    invoices: { ...BASE_INVOICES, view: true, create: true, update: true, delete: true, cards: true, export: true, categories: true, singleDoc: true },
    vatRecord: { ...BASE_VAT_RECORD, view: true, create: true, update: true, delete: true, cards: true, export: true, groups: true, categories: true, reoccurring: true, state: true, singleDoc: true },
    share: { ...BASE_SHARE, view: true, create: true, update: true, delete: true, cards: true, share: true, export: true, import: true, categories: true, reoccurring: true, singleDoc: true },
    members: { ...BASE_MEMBERS, view: true, update: true, cards: true, assign: true, signatureReq: true, singleDoc: true },
    customers: { ...BASE_CUSTOMERS, view: true, create: true, update: true, delete: true, cards: true, export: true },
    products: { ...BASE_PRODUCTS, view: true, create: true, update: true, delete: true, cards: true, export: true, categories: true },
    whatsapp: { ...BASE_COMMUNICATION, view: true, send: true, clearHistory: true, targetFinance: true, targetRental: true, targetMaintenance: true, targetInvoice: true, targetClaim: true, targetCustom: true },
    bulkEmail: { ...BASE_COMMUNICATION, view: true, send: true, clearHistory: true, targetFinance: true, targetRental: true, targetMaintenance: true, targetInvoice: true, targetClaim: true, targetCustom: true },
    waiting: { ...BASE_WAITING, view: true, create: true, update: true, delete: true, export: true, categories: true, groups: true, quickContact: true, reminder: true },
    company: { ...BASE_COMPANY, view: true, create: true, update: true, delete: true, cards: true },
    trash: { ...BASE_TRASH, view: true, cards: true, restore: true, deletePermanently: true },
    users: { ...BASE_USERS, view: true, create: true, update: true, delete: true, cards: true },
    todo: { ...BASE_TODO, view: true, create: true, update: true, delete: true, export: true, categories: true, groups: true },
    settings: { ...BASE_SETTINGS, view: true, update: true },
    automation: { ...BASE_AUTOMATION, view: true, create: true, update: true, delete: true }, 
    memberProfile: { ...BASE_PORTAL },
    memberRentals: { ...BASE_PORTAL },
    memberTransactions: { ...BASE_PORTAL },
    memberInvoices: { ...BASE_PORTAL },
  },

  // ---------------- ADMIN ----------------
  admin: {
    dashboard: { ...BASE_DASHBOARD, view: true },
    vehicles: { ...BASE_VEHICLES, view: true, cards: true, mileage: true, export: true, copyId: true, singleDoc: true, mileageHistoryView: true, mileageHistoryEdit: true, mileageHistoryDelete: true },
    maintenance: { ...BASE_MAINTENANCE, view: true, cards: true, export: true, tableStatus: true, completed: true, singleDoc: true },
    utilisation: { ...BASE_UTILISATION, view: true },
    rentals: { ...BASE_RENTALS, view: true, cards: true, daily: true, weekly: true, claim: true, export: true, singleDoc: true, availableVehicles: true, note: true, recordPayment: true, viewPayment: true, editPayment: true, deletePayment: true },
    accidents: { ...BASE_ACCIDENTS, view: true, cards: true, export: true, singleDoc: true },
    claims: { ...BASE_CLAIMS, view: true, cards: true, export: true, note: true, singleDoc: true },
    vdFinance: { ...BASE_VD_FINANCE, view: true, create: true, cards: true, export: true, import: true, singleDoc: true, recordPayment: true },
    vdInvoice: { ...BASE_VD_INVOICE, view: true, create: true, cards: true, singleDoc: true },
    driverPay: { ...BASE_DRIVER_PAY, view: true, create: true, update: true, delete: true, recordPayment: true, cards: true, export: true, lock: true, unlock: true, singleDoc: true, period: true },
    pettyCash: { ...BASE_PETTY_CASH, view: true, create: true, cards: true, export: true, import: true, singleDoc: true },
    aiePettyCash: { ...BASE_PETTY_CASH, view: true, create: true, cards: true, export: true, import: true, singleDoc: true },
    incomeExpense: { ...BASE_INCOME_EXPENSE, view: true, create: true, cards: true, singleDoc: true },
    skylineIncomeExpense: { ...BASE_INCOME_EXPENSE, view: true, create: true, cards: true, singleDoc: true },
    finance: { ...BASE_FINANCE, view: true, cards: true, export: true, singleDoc: true },
    invoices: { ...BASE_INVOICES, view: true, create: true, cards: true, export: true, singleDoc: true },
    vatRecord: { ...BASE_VAT_RECORD, view: true, create: true, cards: true, export: true, singleDoc: true },
    share: { ...BASE_SHARE, view: true, create: true, cards: true, share: true, export: true, import: true, singleDoc: true },
    members: { ...BASE_MEMBERS, view: true, create: true, cards: true, singleDoc: true },
    customers: { ...BASE_CUSTOMERS, view: true, cards: true, export: true },
    products: { ...BASE_PRODUCTS, view: true, cards: true, export: true },
    whatsapp: { ...BASE_COMMUNICATION, view: true, send: true, targetFinance: true, targetRental: true, targetMaintenance: true, targetInvoice: true, targetClaim: true, targetCustom: true },
    bulkEmail: { ...BASE_COMMUNICATION },
    waiting: { ...BASE_WAITING, view: true, create: true, export: true, quickContact: true, reminder: true },
    company: { ...BASE_COMPANY, view: true, update: true, cards: true },
    trash: { ...BASE_TRASH, view: true, cards: true },
    users: { ...BASE_USERS },
    todo: { ...BASE_TODO, view: true, create: true, export: true, categories: true, groups: true },
    settings: { ...BASE_SETTINGS, view: true },
    automation: { ...BASE_AUTOMATION, view: true, create: true, update: true, delete: true },
    memberProfile: { ...BASE_PORTAL },
    memberRentals: { ...BASE_PORTAL },
    memberTransactions: { ...BASE_PORTAL },
    memberInvoices: { ...BASE_PORTAL },
  },

  // ---------------- FINANCE ----------------
  finance: {
    dashboard: { ...BASE_DASHBOARD },
    vehicles: { ...BASE_VEHICLES },
    utilisation: { ...BASE_UTILISATION },
    maintenance: { ...BASE_MAINTENANCE },
    rentals: { ...BASE_RENTALS, viewPayment: true, recordPayment: true },
    accidents: { ...BASE_ACCIDENTS },
    claims: { ...BASE_CLAIMS },
    vdFinance: { ...BASE_VD_FINANCE },
    vdInvoice: { ...BASE_VD_INVOICE },
    driverPay: { ...BASE_DRIVER_PAY },
    pettyCash: { ...BASE_PETTY_CASH },
    aiePettyCash: { ...BASE_PETTY_CASH },
    incomeExpense: { ...BASE_INCOME_EXPENSE },
    skylineIncomeExpense: { ...BASE_INCOME_EXPENSE },
    finance: { ...BASE_FINANCE },
    invoices: { ...BASE_INVOICES },
    vatRecord: { ...BASE_VAT_RECORD },
    share: { ...BASE_SHARE },
    members: { ...BASE_MEMBERS },
    customers: { ...BASE_CUSTOMERS },
    products: { ...BASE_PRODUCTS },
    whatsapp: { ...BASE_COMMUNICATION },
    bulkEmail: { ...BASE_COMMUNICATION },
    waiting: { ...BASE_WAITING },
    company: { ...BASE_COMPANY },
    trash: { ...BASE_TRASH },
    users: { ...BASE_USERS },
    todo: { ...BASE_TODO },
    settings: { ...BASE_SETTINGS, view: true },
    automation: { ...BASE_AUTOMATION }, 
    memberProfile: { ...BASE_PORTAL },
    memberRentals: { ...BASE_PORTAL },
    memberTransactions: { ...BASE_PORTAL },
    memberInvoices: { ...BASE_PORTAL },
  },

  // ---------------- CLAIMS ----------------
  claims: {
    dashboard: { ...BASE_DASHBOARD },
    vehicles: { ...BASE_VEHICLES },
    utilisation: { ...BASE_UTILISATION },
    maintenance: { ...BASE_MAINTENANCE },
    rentals: { ...BASE_RENTALS },
    accidents: { ...BASE_ACCIDENTS },
    claims: { ...BASE_CLAIMS },
    vdFinance: { ...BASE_VD_FINANCE },
    vdInvoice: { ...BASE_VD_INVOICE },
    driverPay: { ...BASE_DRIVER_PAY },
    pettyCash: { ...BASE_PETTY_CASH },
    aiePettyCash: { ...BASE_PETTY_CASH },
    incomeExpense: { ...BASE_INCOME_EXPENSE },
    skylineIncomeExpense: { ...BASE_INCOME_EXPENSE },
    finance: { ...BASE_FINANCE },
    invoices: { ...BASE_INVOICES },
    vatRecord: { ...BASE_VAT_RECORD },
    share: { ...BASE_SHARE },
    members: { ...BASE_MEMBERS },
    customers: { ...BASE_CUSTOMERS },
    products: { ...BASE_PRODUCTS },
    whatsapp: { ...BASE_COMMUNICATION },
    bulkEmail: { ...BASE_COMMUNICATION },
    waiting: { ...BASE_WAITING },
    company: { ...BASE_COMPANY },
    trash: { ...BASE_TRASH },
    users: { ...BASE_USERS },
    todo: { ...BASE_TODO },
    settings: { ...BASE_SETTINGS },
    automation: { ...BASE_AUTOMATION }, 
    memberProfile: { ...BASE_PORTAL },
    memberRentals: { ...BASE_PORTAL },
    memberTransactions: { ...BASE_PORTAL },
    memberInvoices: { ...BASE_PORTAL },
  },

  // ---------------- COMPANY (New Role) ----------------
  company: {
    dashboard: { ...BASE_DASHBOARD },
    vehicles: { ...BASE_VEHICLES },
    utilisation: { ...BASE_UTILISATION },
    maintenance: { ...BASE_MAINTENANCE },
    rentals: { ...BASE_RENTALS },
    accidents: { ...BASE_ACCIDENTS },
    claims: { ...BASE_CLAIMS },
    vdFinance: { ...BASE_VD_FINANCE },
    vdInvoice: { ...BASE_VD_INVOICE },
    driverPay: { ...BASE_DRIVER_PAY },
    pettyCash: { ...BASE_PETTY_CASH },
    aiePettyCash: { ...BASE_PETTY_CASH },
    incomeExpense: { ...BASE_INCOME_EXPENSE },
    skylineIncomeExpense: { ...BASE_INCOME_EXPENSE },
    finance: { ...BASE_FINANCE },
    invoices: { ...BASE_INVOICES },
    vatRecord: { ...BASE_VAT_RECORD },
    share: { ...BASE_SHARE },
    members: { ...BASE_MEMBERS },
    customers: { ...BASE_CUSTOMERS },
    products: { ...BASE_PRODUCTS },
    whatsapp: { ...BASE_COMMUNICATION },
    bulkEmail: { ...BASE_COMMUNICATION },
    waiting: { ...BASE_WAITING },
    company: { ...BASE_COMPANY },
    trash: { ...BASE_TRASH },
    users: { ...BASE_USERS },
    todo: { ...BASE_TODO },
    settings: { ...BASE_SETTINGS },
    automation: { ...BASE_AUTOMATION }, 
    memberProfile: { ...BASE_PORTAL },
    memberRentals: { ...BASE_PORTAL },
    memberTransactions: { ...BASE_PORTAL },
    memberInvoices: { ...BASE_PORTAL },
  },

  // ---------------- MEMBER (portal user) ----------------
  member: {
    dashboard: { ...BASE_DASHBOARD },
    vehicles: { ...BASE_VEHICLES },
    utilisation: { ...BASE_UTILISATION },
    maintenance: { ...BASE_MAINTENANCE },
    rentals: { ...BASE_RENTALS },
    accidents: { ...BASE_ACCIDENTS },
    claims: { ...BASE_CLAIMS },
    vdFinance: { ...BASE_VD_FINANCE },
    vdInvoice: { ...BASE_VD_INVOICE },
    driverPay: { ...BASE_DRIVER_PAY },
    pettyCash: { ...BASE_PETTY_CASH },
    aiePettyCash: { ...BASE_PETTY_CASH },
    incomeExpense: { ...BASE_INCOME_EXPENSE },
    skylineIncomeExpense: { ...BASE_INCOME_EXPENSE },
    finance: { ...BASE_FINANCE },
    invoices: { ...BASE_INVOICES },
    vatRecord: { ...BASE_VAT_RECORD },
    share: { ...BASE_SHARE },
    members: { ...BASE_MEMBERS },
    customers: { ...BASE_CUSTOMERS },
    products: { ...BASE_PRODUCTS },
    whatsapp: { ...BASE_COMMUNICATION },
    bulkEmail: { ...BASE_COMMUNICATION },
    waiting: { ...BASE_WAITING },
    company: { ...BASE_COMPANY },
    trash: { ...BASE_TRASH },
    users: { ...BASE_USERS },
    todo: { ...BASE_TODO },
    settings: { ...BASE_SETTINGS },
    automation: { ...BASE_AUTOMATION },
    memberProfile: { ...BASE_PORTAL },
    memberRentals: { ...BASE_PORTAL },
    memberTransactions: { ...BASE_PORTAL },
    memberInvoices: { ...BASE_PORTAL },
  },
};

export function getDefaultPermissions(role: Role): RolePermissions {
  return DEFAULT_PERMISSIONS[role] || DEFAULT_PERMISSIONS['member'];
}