// src/types/roles.ts

// ▶ Roles
export type Role = 'admin' | 'manager' | 'finance' | 'claims' | 'member' | 'company' | 'superadmin' | 'supervisor' | 'staff' | 'accountant';

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
  departments?: boolean; // ADDED
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
  progressview?: boolean; 
  progressedit?: boolean; 
  recordsPermission?: boolean; // ADDED
  
  // Mileage History Permissions
  mileageHistoryView?: boolean;
  mileageHistoryEdit?: boolean;
  mileageHistoryDelete?: boolean;
  
  // Payment specific permissions
  viewPayment?: boolean;
  editPayment?: boolean;
  deletePayment?: boolean;
  can_delete_payments?: boolean;
  manage_maintenance_finance?: boolean;
  canManageProfitDistribution?: boolean;
  canAccessCommissionSplits?: boolean;
  allowDocumentOverrides?: boolean;
  
  // WhatsApp & Email targets
  targetFinance?: boolean;
  targetRental?: boolean;
  targetMaintenance?: boolean;
  targetInvoice?: boolean;
  targetClaim?: boolean;
  targetCustom?: boolean;

  quickContact?: boolean;
  reminder?: boolean;
  mondayAutoEmail?: boolean; // Monday auto email toggle / dispatch
  bulkEmailScheduler?: boolean; // Bulk Email Scheduler access toggle
  scheduler?: boolean;       // Scheduler Preferences access
  toggleGlobal?: boolean;    // Toggle Global Automation
  whatsapp?: boolean;        // WhatsApp sender/action
  email?: boolean;           // Email sender/action
  template?: boolean;        // Template change/management
  templateEdit?: boolean;    // Template edit permission (Read-only if false)
  templateCreate?: boolean;  // Create new templates
  templateDelete?: boolean;  // Delete templates (Protected)
  reminderTemplate?: boolean;// Manage reminder templates
  messageTemplate?: boolean; // Manage message templates
  driverRisk?: boolean;      // Driver Risk analysis
  renewalAnalysis?: boolean; // NEW: Renewal Underwriter Dossier
  showCompletedPaid?: boolean; // NEW: Show Completed/Paid toggle
  groupMessaging?: boolean;  // NEW: Group Messaging / News Flash
  workshopTv?: boolean;      // Workshop TV Display Mirror
  publicMirror?: boolean;    // Real-Time Live Public Mirror

  // Dynamic T&C Mapping Engine permissions
  manageDynamicTerms?: boolean; // Manage Dynamic T&Cs (Full access to create, edit, and delete legal templates in T&C Manager)

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
  highRisk: Permission;
  memberProfile: Permission;
  memberRentals: Permission;
  memberTransactions: Permission;
  memberInvoices: Permission;
  canManageProfitDistribution?: boolean;
  canAccessCommissionSplits?: boolean;
  allowDocumentOverrides?: boolean;
}

// ------------------------- TEMPLATES TO ENSURE ALL KEYS RENDER -------------------------

const BASE_DASHBOARD = { view: false, cards: false };
const BASE_HIGH_RISK = { view: false, create: false, update: false, delete: false, cards: false, export: false, import: false, share: false };
const BASE_VEHICLES = { view: false, create: false, update: false, delete: false, cards: false, mileage: false, recordPayment: false, export: false, owner: false, syncStatus: false, sale: false, copyId: false, singleDoc: false, mileageHistoryView: false, mileageHistoryEdit: false, mileageHistoryDelete: false, groups: false, departments: false, assign: false, recordsPermission: false };
const BASE_UTILISATION = { view: false, cards: false, export: false, singleDoc: false };
const BASE_MAINTENANCE = { view: false, create: false, update: false, delete: false, cards: false, recordPayment: false, viewPayment: false, editPayment: false, deletePayment: false, can_delete_payments: false, manage_maintenance_finance: false, export: false, tableStatus: false, complete: false, completed: false, singleDoc: false, categories: false, whatsapp: false, email: false, send: false, reminder: false, mondayAutoEmail: false, template: false, templateCreate: false, templateEdit: false, templateDelete: false, reminderTemplate: false, messageTemplate: false, workshopTv: false, publicMirror: false };
const BASE_RENTALS = { view: false, create: false, update: false, delete: false, cards: false, daily: false, weekly: false, claim: false, recordPayment: false, export: false, syncStatus: false, singleDoc: false, availableVehicles: false, completion: false, discount: false, note: false, viewPayment: false, editPayment: false, deletePayment: false, reminder: false, mondayAutoEmail: false, bulkEmailScheduler: false, whatsapp: false, email: false, send: false, template: false, templateCreate: false, templateEdit: false, templateDelete: false, reminderTemplate: false, messageTemplate: false };
const BASE_ACCIDENTS = { view: false, create: false, update: false, delete: false, cards: false, export: false, import: false, singleDoc: false, state: false, driverRisk: false, renewalAnalysis: false };
const BASE_CLAIMS = { view: false, create: false, update: false, delete: false, cards: false, export: false, state: false, note: false, singleDoc: false, progressview: false, progressedit: false, groups: false, departments: false, assign: false, recordsPermission: false, email: false, whatsapp: false, send: false, reminder: false, mondayAutoEmail: false, template: false, templateCreate: false, templateEdit: false, templateDelete: false, reminderTemplate: false, messageTemplate: false }; 
const BASE_VD_FINANCE = { view: false, create: false, update: false, delete: false, cards: false, export: false, import: false, categories: false, groups: false, departments: false, assign: false, recordsPermission: false, singleDoc: false, recordPayment: false };
const BASE_VD_INVOICE = { view: false, create: false, update: false, delete: false, cards: false, singleDoc: false, whatsapp: false, email: false, send: false, reminder: false, mondayAutoEmail: false, template: false, templateCreate: false, templateEdit: false, templateDelete: false, reminderTemplate: false, messageTemplate: false };
const BASE_DRIVER_PAY = { view: false, create: false, update: false, delete: false, recordPayment: false, cards: false, export: false, lock: false, unlock: false, singleDoc: false, period: false, whatsapp: false, email: false, send: false, reminder: false, mondayAutoEmail: false, template: false, templateCreate: false, templateEdit: false, templateDelete: false, reminderTemplate: false, messageTemplate: false };
const BASE_PETTY_CASH = { view: false, create: false, update: false, delete: false, cards: false, export: false, import: false, categories: false, groups: false, singleDoc: false };
const BASE_INCOME_EXPENSE = { view: false, create: false, update: false, delete: false, cards: false, categories: false, reoccurring: false, singleDoc: false, export: false, share: false, import: false };
const BASE_FINANCE = { view: false, create: false, update: false, delete: false, cards: false, recordPayment: false, export: false, import: false, accounts: false, categories: false, groups: false, departments: false, reoccurring: false, assign: false, recordsPermission: false, singleDoc: false, canManageProfitDistribution: false, canAccessCommissionSplits: false };
const BASE_INVOICES = { view: false, create: false, update: false, delete: false, cards: false, recordPayment: false, export: false, import: false, accounts: false, categories: false, groups: false, departments: false, assign: false, recordsPermission: false, singleDoc: false, showCompletedPaid: false, whatsapp: false, email: false, send: false, reminder: false, mondayAutoEmail: false, template: false, templateCreate: false, templateEdit: false, templateDelete: false, reminderTemplate: false, messageTemplate: false };
const BASE_VAT_RECORD = { view: false, create: false, update: false, delete: false, cards: false, export: false, groups: false, categories: false, reoccurring: false, state: false, singleDoc: false };
const BASE_SHARE = { view: false, create: false, update: false, delete: false, cards: false, export: false, import: false, categories: false, reoccurring: false, singleDoc: false, share: false };
const BASE_MEMBERS = { view: false, create: false, update: false, delete: false, cards: false, assign: false, signatureReq: false, singleDoc: false, groupMessaging: false, whatsapp: false, email: false, send: false, reminder: false, mondayAutoEmail: false, template: false, templateCreate: false, templateEdit: false, templateDelete: false, reminderTemplate: false, messageTemplate: false };
const BASE_CUSTOMERS = { view: false, create: false, update: false, delete: false, cards: false, export: false, groupMessaging: false, whatsapp: false, email: false, send: false, template: false, reminder: false };
const BASE_PRODUCTS = { view: false, create: false, update: false, delete: false, cards: false, export: false, import: false, categories: false };
const BASE_COMMUNICATION = { view: false, send: false, delete: false, template: false, clearHistory: false, targetFinance: false, targetRental: false, targetMaintenance: false, targetInvoice: false, targetClaim: false, targetCustom: false };
const BASE_WAITING = { view: false, create: false, update: false, delete: false, export: false, categories: false, groups: false, quickContact: false, reminder: false };
const BASE_COMPANY = { view: false, create: false, update: false, delete: false, cards: false, whatsapp: false, email: false, signatureReq: false };
const BASE_TRASH = { view: false, cards: false, restore: false, deletePermanently: false };
const BASE_USERS = { view: false, create: false, update: false, delete: false, cards: false, share: false };
const BASE_TODO = { view: false, create: false, update: false, delete: false, export: false, categories: false, groups: false, assign: false };
const BASE_SETTINGS = { view: false, update: false, manageDynamicTerms: false };
const BASE_AUTOMATION = { view: false, create: false, update: false, delete: false, mondayAutoEmail: false, scheduler: false, toggleGlobal: false, templateCreate: false, templateEdit: false, templateDelete: false }; 
const BASE_PORTAL = { view: false, update: false };

// ------------------------- DEFAULTS -------------------------

export const DEFAULT_PERMISSIONS: Record<Role, RolePermissions> = {
  // ---------------- MANAGER (ALL PERMISSIONS ENABLED BY DEFAULT) ----------------
  manager: {
    dashboard: { ...BASE_DASHBOARD, view: true, cards: true },
    vehicles: { ...BASE_VEHICLES, view: true, create: true, update: true, delete: true, cards: true, mileage: true, recordPayment: true, export: true, owner: true, syncStatus: true, sale: true, copyId: true, singleDoc: true, mileageHistoryView: true, mileageHistoryEdit: true, mileageHistoryDelete: true, groups: true, departments: true, assign: true, recordsPermission: true },
    utilisation: { ...BASE_UTILISATION, view: true, cards: true, export: true, singleDoc: true },
    maintenance: { ...BASE_MAINTENANCE, view: true, create: true, update: true, delete: true, cards: true, recordPayment: true, viewPayment: true, editPayment: true, deletePayment: true, can_delete_payments: true, manage_maintenance_finance: true, export: true, tableStatus: true, complete: true, completed: true, singleDoc: true, categories: true, whatsapp: true, email: true, send: true, reminder: true, mondayAutoEmail: true, template: true, templateCreate: true, templateEdit: true, templateDelete: true, reminderTemplate: true, messageTemplate: true, workshopTv: true, publicMirror: true },
    rentals: { ...BASE_RENTALS, view: true, create: true, update: true, delete: true, cards: true, daily: true, weekly: true, claim: true, recordPayment: true, export: true, syncStatus: true, singleDoc: true, availableVehicles: true, completion: true, discount: true, note: true, viewPayment: true, editPayment: true, deletePayment: true, reminder: true, mondayAutoEmail: true, bulkEmailScheduler: true, whatsapp: true, email: true, send: true, template: true, templateCreate: true, templateEdit: true, templateDelete: true, reminderTemplate: true, messageTemplate: true },
    accidents: { ...BASE_ACCIDENTS, view: true, create: true, update: true, delete: true, cards: true, export: true, import: true, singleDoc: true, state: true, driverRisk: true, renewalAnalysis: true },
    claims: { ...BASE_CLAIMS, view: true, create: true, update: true, delete: true, cards: true, export: true, state: true, note: true, singleDoc: true, progressview: true, progressedit: true, groups: true, departments: true, assign: true, recordsPermission: true, email: true, whatsapp: true, send: true, reminder: true, mondayAutoEmail: true, template: true, templateCreate: true, templateEdit: true, templateDelete: true, reminderTemplate: true, messageTemplate: true },
    vdFinance: { ...BASE_VD_FINANCE, view: true, create: true, update: true, delete: true, cards: true, export: true, import: true, categories: true, groups: true, departments: true, assign: true, recordsPermission: true, singleDoc: true, recordPayment: true },
    vdInvoice: { ...BASE_VD_INVOICE, view: true, create: true, update: true, delete: true, cards: true, singleDoc: true, whatsapp: true, email: true, send: true, reminder: true, mondayAutoEmail: true, template: true, templateCreate: true, templateEdit: true, templateDelete: true, reminderTemplate: true, messageTemplate: true },
    driverPay: { ...BASE_DRIVER_PAY, view: true, create: true, update: true, delete: true, recordPayment: true, cards: true, export: true, lock: true, unlock: true, singleDoc: true, period: true, whatsapp: true, email: true, send: true, reminder: true, mondayAutoEmail: true, template: true, templateCreate: true, templateEdit: true, templateDelete: true, reminderTemplate: true, messageTemplate: true },
    pettyCash: { ...BASE_PETTY_CASH, view: true, create: true, update: true, delete: true, cards: true, export: true, import: true, categories: true, groups: true, singleDoc: true },
    aiePettyCash: { ...BASE_PETTY_CASH, view: true, create: true, update: true, delete: true, cards: true, export: true, import: true, categories: true, groups: true, singleDoc: true },
    incomeExpense: { ...BASE_INCOME_EXPENSE, view: true, create: true, update: true, delete: true, cards: true, categories: true, reoccurring: true, singleDoc: true, export: true, share: true, import: true },
    skylineIncomeExpense: { ...BASE_INCOME_EXPENSE, view: true, create: true, update: true, delete: true, cards: true, categories: true, reoccurring: true, singleDoc: true, export: true, share: true, import: true },
    finance: { ...BASE_FINANCE, view: true, create: true, update: true, delete: true, cards: true, recordPayment: true, export: true, import: true, accounts: true, categories: true, groups: true, departments: true, reoccurring: true, assign: true, recordsPermission: true, singleDoc: true, canManageProfitDistribution: true },
    invoices: { ...BASE_INVOICES, view: true, create: true, update: true, delete: true, cards: true, recordPayment: true, export: true, import: true, accounts: true, categories: true, groups: true, departments: true, assign: true, recordsPermission: true, singleDoc: true, showCompletedPaid: true, whatsapp: true, email: true, send: true, reminder: true, mondayAutoEmail: true, template: true, templateCreate: true, templateEdit: true, templateDelete: true, reminderTemplate: true, messageTemplate: true },
    vatRecord: { ...BASE_VAT_RECORD, view: true, create: true, update: true, delete: true, cards: true, export: true, groups: true, categories: true, reoccurring: true, state: true, singleDoc: true },
    share: { ...BASE_SHARE, view: true, create: true, update: true, delete: true, cards: true, export: true, import: true, categories: true, reoccurring: true, singleDoc: true, share: true },
    members: { ...BASE_MEMBERS, view: true, create: true, update: true, delete: true, cards: true, assign: true, signatureReq: true, singleDoc: true, groupMessaging: true, whatsapp: true, email: true, send: true, reminder: true, mondayAutoEmail: true, template: true, templateCreate: true, templateEdit: true, templateDelete: true, reminderTemplate: true, messageTemplate: true },
    customers: { ...BASE_CUSTOMERS, view: true, create: true, update: true, delete: true, cards: true, export: true, groupMessaging: true, whatsapp: true, email: true, send: true, template: true, reminder: true },
    products: { ...BASE_PRODUCTS, view: true, create: true, update: true, delete: true, cards: true, export: true, import: true, categories: true },
    whatsapp: { ...BASE_COMMUNICATION, view: true, delete: true, template: true, send: true, clearHistory: true, targetFinance: true, targetRental: true, targetMaintenance: true, targetInvoice: true, targetClaim: true, targetCustom: true },
    bulkEmail: { ...BASE_COMMUNICATION, view: true, delete: true, template: true, send: true, clearHistory: true, targetFinance: true, targetRental: true, targetMaintenance: true, targetInvoice: true, targetClaim: true, targetCustom: true },
    waiting: { ...BASE_WAITING, view: true, create: true, update: true, delete: true, export: true, categories: true, groups: true, quickContact: true, reminder: true },
    company: { ...BASE_COMPANY, view: true, create: true, update: true, delete: true, cards: true, whatsapp: true, email: true, signatureReq: true },
    trash: { ...BASE_TRASH, view: true, cards: true, restore: true, deletePermanently: true },
    users: { ...BASE_USERS, view: true, create: true, update: true, delete: true, cards: true, share: true },
    todo: { ...BASE_TODO, view: true, create: true, update: true, delete: true, export: true, categories: true, groups: true, assign: true },
    settings: { ...BASE_SETTINGS, view: true, update: true, manageDynamicTerms: true },
    automation: { ...BASE_AUTOMATION, view: true, create: true, update: true, delete: true, mondayAutoEmail: true, scheduler: true, toggleGlobal: true, templateCreate: true, templateEdit: true, templateDelete: true }, 
    highRisk: { ...BASE_HIGH_RISK, view: true, create: true, update: true, delete: true, cards: true, export: true, import: true, share: true },
    memberProfile: { view: true, update: true },
    memberRentals: { view: true, update: true },
    memberTransactions: { view: true, update: true },
    memberInvoices: { view: true, update: true },
    canManageProfitDistribution: true,
    canAccessCommissionSplits: true,
    allowDocumentOverrides: true,
  },

  // ---------------- ADMIN (STANDARD OPERATIONAL DEFAULTS) ----------------
  admin: {
    dashboard: { ...BASE_DASHBOARD, view: true, cards: true },
    vehicles: { ...BASE_VEHICLES, view: true, create: true, update: true, cards: true, mileage: true, export: true, owner: true, syncStatus: true, sale: true, copyId: true, singleDoc: true, mileageHistoryView: true, mileageHistoryEdit: true, groups: true, departments: true, assign: true, recordsPermission: true },
    utilisation: { ...BASE_UTILISATION, view: true, cards: true, export: true, singleDoc: true },
    maintenance: { ...BASE_MAINTENANCE, view: true, create: true, update: true, cards: true, recordPayment: true, viewPayment: true, editPayment: true, deletePayment: true, can_delete_payments: true, manage_maintenance_finance: true, export: true, tableStatus: true, complete: true, completed: true, singleDoc: true, categories: true, whatsapp: true, email: true, send: true, reminder: true, mondayAutoEmail: true, template: true, templateCreate: true, templateEdit: true, reminderTemplate: true, messageTemplate: true, workshopTv: true, publicMirror: true },
    rentals: { ...BASE_RENTALS, view: true, create: true, update: true, cards: true, daily: true, weekly: true, claim: true, export: true, syncStatus: true, singleDoc: true, availableVehicles: true, completion: true, discount: true, note: true, recordPayment: true, viewPayment: true, editPayment: true, reminder: true, mondayAutoEmail: true, bulkEmailScheduler: true, whatsapp: true, email: true, send: true, template: true, templateCreate: true, templateEdit: true, reminderTemplate: true, messageTemplate: true },
    accidents: { ...BASE_ACCIDENTS, view: true, create: true, update: true, cards: true, export: true, import: true, singleDoc: true, state: true, driverRisk: true, renewalAnalysis: true },
    claims: { ...BASE_CLAIMS, view: true, create: true, update: true, cards: true, export: true, state: true, note: true, singleDoc: true, progressview: true, progressedit: true, groups: true, departments: true, assign: true, recordsPermission: true, email: true, whatsapp: true, send: true, reminder: true, mondayAutoEmail: true, template: true, templateCreate: true, templateEdit: true, reminderTemplate: true, messageTemplate: true },
    vdFinance: { ...BASE_VD_FINANCE, view: true, create: true, update: true, cards: true, export: true, import: true, categories: true, groups: true, departments: true, assign: true, recordsPermission: true, singleDoc: true, recordPayment: true },
    vdInvoice: { ...BASE_VD_INVOICE, view: true, create: true, update: true, cards: true, singleDoc: true, whatsapp: true, email: true, send: true, reminder: true, mondayAutoEmail: true, template: true, templateCreate: true, templateEdit: true, reminderTemplate: true, messageTemplate: true },
    driverPay: { ...BASE_DRIVER_PAY, view: true, create: true, update: true, recordPayment: true, cards: true, export: true, lock: true, unlock: true, singleDoc: true, period: true, whatsapp: true, email: true, send: true, reminder: true, mondayAutoEmail: true, template: true, templateCreate: true, templateEdit: true, reminderTemplate: true, messageTemplate: true },
    pettyCash: { ...BASE_PETTY_CASH, view: true, create: true, update: true, cards: true, export: true, import: true, categories: true, groups: true, singleDoc: true },
    aiePettyCash: { ...BASE_PETTY_CASH, view: true, create: true, update: true, cards: true, export: true, import: true, categories: true, groups: true, singleDoc: true },
    incomeExpense: { ...BASE_INCOME_EXPENSE, view: true, create: true, update: true, cards: true, categories: true, reoccurring: true, singleDoc: true, export: true, share: true, import: true },
    skylineIncomeExpense: { ...BASE_INCOME_EXPENSE, view: true, create: true, update: true, cards: true, categories: true, reoccurring: true, singleDoc: true, export: true, share: true, import: true },
    finance: { ...BASE_FINANCE, view: true, create: true, update: true, cards: true, recordPayment: true, export: true, import: true, accounts: true, categories: true, groups: true, departments: true, reoccurring: true, assign: true, recordsPermission: true, singleDoc: true, canManageProfitDistribution: true },
    invoices: { ...BASE_INVOICES, view: true, create: true, update: true, cards: true, recordPayment: true, export: true, import: true, accounts: true, categories: true, groups: true, departments: true, assign: true, recordsPermission: true, singleDoc: true, showCompletedPaid: true, whatsapp: true, email: true, send: true, reminder: true, mondayAutoEmail: true, template: true, templateCreate: true, templateEdit: true, reminderTemplate: true, messageTemplate: true },
    vatRecord: { ...BASE_VAT_RECORD, view: true, create: true, update: true, cards: true, export: true, groups: true, categories: true, reoccurring: true, state: true, singleDoc: true },
    share: { ...BASE_SHARE, view: true, create: true, update: true, cards: true, export: true, import: true, categories: true, reoccurring: true, singleDoc: true, share: true },
    members: { ...BASE_MEMBERS, view: true, create: true, update: true, cards: true, assign: true, signatureReq: true, singleDoc: true, groupMessaging: true, whatsapp: true, email: true, send: true, reminder: true, mondayAutoEmail: true, template: true, templateCreate: true, templateEdit: true, reminderTemplate: true, messageTemplate: true },
    customers: { ...BASE_CUSTOMERS, view: true, create: true, update: true, cards: true, export: true, groupMessaging: true, whatsapp: true, email: true, send: true, template: true, reminder: true },
    products: { ...BASE_PRODUCTS, view: true, create: true, update: true, cards: true, export: true, import: true, categories: true },
    whatsapp: { ...BASE_COMMUNICATION, view: true, send: true, template: true, clearHistory: true, targetFinance: true, targetRental: true, targetMaintenance: true, targetInvoice: true, targetClaim: true, targetCustom: true },
    bulkEmail: { ...BASE_COMMUNICATION, view: true, send: true, template: true, clearHistory: true, targetFinance: true, targetRental: true, targetMaintenance: true, targetInvoice: true, targetClaim: true, targetCustom: true },
    waiting: { ...BASE_WAITING, view: true, create: true, update: true, export: true, categories: true, groups: true, quickContact: true, reminder: true },
    company: { ...BASE_COMPANY, view: true, create: true, update: true, cards: true, whatsapp: true, email: true, signatureReq: true },
    trash: { ...BASE_TRASH, view: true, cards: true, restore: true },
    users: { ...BASE_USERS, view: true, create: true, update: true, cards: true, share: true },
    todo: { ...BASE_TODO, view: true, create: true, update: true, export: true, categories: true, groups: true, assign: true },
    settings: { ...BASE_SETTINGS, view: true, update: true, manageDynamicTerms: true },
    automation: { ...BASE_AUTOMATION, view: true, create: true, update: true, mondayAutoEmail: true, scheduler: true, toggleGlobal: true, templateCreate: true, templateEdit: true },
    highRisk: { ...BASE_HIGH_RISK, view: true, create: true, update: true, cards: true, export: true, import: true, share: true },
    memberProfile: { ...BASE_PORTAL, view: true, update: true },
    memberRentals: { ...BASE_PORTAL, view: true, update: true },
    memberTransactions: { ...BASE_PORTAL, view: true, update: true },
    memberInvoices: { ...BASE_PORTAL, view: true, update: true },
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
    highRisk: { ...BASE_HIGH_RISK, view: true },
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
    highRisk: { ...BASE_HIGH_RISK, view: true, create: true },
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
    highRisk: { ...BASE_HIGH_RISK, view: true },
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
    highRisk: { ...BASE_HIGH_RISK, view: false },
    memberProfile: { ...BASE_PORTAL },
    memberRentals: { ...BASE_PORTAL },
    memberTransactions: { ...BASE_PORTAL },
    memberInvoices: { ...BASE_PORTAL },
  },

  // ---------------- SUPER ADMIN (Requires Explicit Matrix Assignment) ----------------
  superadmin: {
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
    settings: { ...BASE_SETTINGS, view: true, update: true, manageDynamicTerms: true },
    automation: { ...BASE_AUTOMATION },
    highRisk: { ...BASE_HIGH_RISK, view: false },
    memberProfile: { ...BASE_PORTAL },
    memberRentals: { ...BASE_PORTAL },
    memberTransactions: { ...BASE_PORTAL },
    memberInvoices: { ...BASE_PORTAL },
    canManageProfitDistribution: true,
    canAccessCommissionSplits: true,
    allowDocumentOverrides: true,
  },

  // ---------------- SUPERVISOR (Requires Explicit Matrix Assignment) ----------------
  supervisor: {
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
    highRisk: { ...BASE_HIGH_RISK, view: false },
    memberProfile: { ...BASE_PORTAL },
    memberRentals: { ...BASE_PORTAL },
    memberTransactions: { ...BASE_PORTAL },
    memberInvoices: { ...BASE_PORTAL },
  },

  // ---------------- STAFF (Requires Explicit Matrix Assignment) ----------------
  staff: {
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
    highRisk: { ...BASE_HIGH_RISK, view: false },
    memberProfile: { ...BASE_PORTAL },
    memberRentals: { ...BASE_PORTAL },
    memberTransactions: { ...BASE_PORTAL },
    memberInvoices: { ...BASE_PORTAL },
  },

  // ---------------- ACCOUNTANT (Requires Explicit Matrix Assignment) ----------------
  accountant: {
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
    highRisk: { ...BASE_HIGH_RISK, view: false },
    memberProfile: { ...BASE_PORTAL },
    memberRentals: { ...BASE_PORTAL },
    memberTransactions: { ...BASE_PORTAL },
    memberInvoices: { ...BASE_PORTAL },
  },
};

export const BASE_PERMISSIONS_BY_MODULE: Record<keyof RolePermissions, Permission> = {
  dashboard: BASE_DASHBOARD,
  vehicles: BASE_VEHICLES,
  utilisation: BASE_UTILISATION,
  maintenance: BASE_MAINTENANCE,
  rentals: BASE_RENTALS,
  accidents: BASE_ACCIDENTS,
  claims: BASE_CLAIMS,
  vdFinance: BASE_VD_FINANCE,
  vdInvoice: BASE_VD_INVOICE,
  driverPay: BASE_DRIVER_PAY,
  pettyCash: BASE_PETTY_CASH,
  aiePettyCash: BASE_PETTY_CASH,
  incomeExpense: BASE_INCOME_EXPENSE,
  skylineIncomeExpense: BASE_INCOME_EXPENSE,
  finance: BASE_FINANCE,
  invoices: BASE_INVOICES,
  vatRecord: BASE_VAT_RECORD,
  share: BASE_SHARE,
  members: BASE_MEMBERS,
  customers: BASE_CUSTOMERS,
  products: BASE_PRODUCTS,
  whatsapp: BASE_COMMUNICATION,
  bulkEmail: BASE_COMMUNICATION,
  waiting: BASE_WAITING,
  company: BASE_COMPANY,
  trash: BASE_TRASH,
  users: BASE_USERS,
  todo: BASE_TODO,
  settings: BASE_SETTINGS,
  automation: BASE_AUTOMATION,
  highRisk: BASE_HIGH_RISK,
  memberProfile: BASE_PORTAL,
  memberRentals: BASE_PORTAL,
  memberTransactions: BASE_PORTAL,
  memberInvoices: BASE_PORTAL,
};

export function getDefaultPermissions(role?: Role): RolePermissions {
  if (role && DEFAULT_PERMISSIONS[role]) {
    const result = {} as RolePermissions;
    (Object.keys(BASE_PERMISSIONS_BY_MODULE) as Array<keyof RolePermissions>).forEach((moduleKey) => {
      result[moduleKey] = { ...(DEFAULT_PERMISSIONS[role][moduleKey] || BASE_PERMISSIONS_BY_MODULE[moduleKey]) };
    });
    return result;
  }
  const result = {} as RolePermissions;
  (Object.keys(BASE_PERMISSIONS_BY_MODULE) as Array<keyof RolePermissions>).forEach((moduleKey) => {
    result[moduleKey] = { ...(BASE_PERMISSIONS_BY_MODULE[moduleKey] || { view: false }) };
  });
  return result;
}

// Complete catalog of action bar permissions required by each module's UI
export const MODULE_ACTION_BAR_CATALOG: Record<keyof RolePermissions, Array<keyof Permission>> = {
  dashboard: ['view', 'cards'],
  vehicles: [
    'view', 'create', 'update', 'delete', 'cards', 'mileage', 'recordPayment', 'export', 'owner',
    'syncStatus', 'sale', 'copyId', 'singleDoc', 'mileageHistoryView', 'mileageHistoryEdit',
    'mileageHistoryDelete', 'groups', 'departments', 'assign', 'recordsPermission'
  ],
  utilisation: ['view', 'cards', 'export', 'singleDoc'],
  maintenance: [
    'view', 'create', 'update', 'delete', 'cards', 'recordPayment', 'viewPayment', 'editPayment', 'deletePayment',
    'can_delete_payments', 'manage_maintenance_finance', 'export', 'tableStatus',
    'complete', 'completed', 'singleDoc', 'categories', 'whatsapp', 'email', 'send',
    'reminder', 'mondayAutoEmail', 'template', 'templateCreate', 'templateEdit', 'templateDelete',
    'reminderTemplate', 'messageTemplate', 'workshopTv', 'publicMirror'
  ],
  rentals: [
    'view', 'create', 'update', 'delete', 'cards', 'daily', 'weekly', 'claim',
    'export', 'syncStatus', 'singleDoc', 'availableVehicles', 'completion', 'discount',
    'note', 'recordPayment', 'viewPayment', 'editPayment', 'deletePayment', 'reminder',
    'mondayAutoEmail', 'bulkEmailScheduler', 'whatsapp', 'email', 'send', 'template',
    'templateCreate', 'templateEdit', 'templateDelete', 'reminderTemplate', 'messageTemplate'
  ],
  accidents: [
    'view', 'create', 'update', 'delete', 'cards', 'export', 'import', 'singleDoc',
    'state', 'driverRisk', 'renewalAnalysis'
  ],
  claims: [
    'view', 'create', 'update', 'delete', 'cards', 'export', 'state', 'note',
    'singleDoc', 'progressview', 'progressedit', 'groups', 'departments', 'assign',
    'recordsPermission', 'email', 'whatsapp', 'send', 'reminder', 'mondayAutoEmail',
    'template', 'templateCreate', 'templateEdit', 'templateDelete', 'reminderTemplate', 'messageTemplate'
  ],
  vdFinance: [
    'view', 'create', 'update', 'delete', 'cards', 'export', 'import', 'categories',
    'groups', 'departments', 'assign', 'recordsPermission', 'singleDoc', 'recordPayment'
  ],
  vdInvoice: [
    'view', 'create', 'update', 'delete', 'cards', 'singleDoc', 'whatsapp', 'email',
    'send', 'reminder', 'mondayAutoEmail', 'template', 'templateCreate', 'templateEdit',
    'templateDelete', 'reminderTemplate', 'messageTemplate'
  ],
  driverPay: [
    'view', 'create', 'update', 'delete', 'recordPayment', 'cards', 'export',
    'lock', 'unlock', 'singleDoc', 'period', 'whatsapp', 'email', 'send',
    'reminder', 'mondayAutoEmail', 'template', 'templateCreate', 'templateEdit',
    'templateDelete', 'reminderTemplate', 'messageTemplate'
  ],
  pettyCash: [
    'view', 'create', 'update', 'delete', 'cards', 'export', 'import',
    'categories', 'groups', 'singleDoc'
  ],
  aiePettyCash: [
    'view', 'create', 'update', 'delete', 'cards', 'export', 'import',
    'categories', 'groups', 'singleDoc'
  ],
  incomeExpense: [
    'view', 'create', 'update', 'delete', 'cards', 'categories',
    'reoccurring', 'singleDoc', 'export', 'share', 'import'
  ],
  skylineIncomeExpense: [
    'view', 'create', 'update', 'delete', 'cards', 'categories',
    'reoccurring', 'singleDoc', 'export', 'share', 'import'
  ],
  finance: [
    'view', 'create', 'update', 'delete', 'cards', 'recordPayment', 'export', 'import', 'accounts',
    'categories', 'groups', 'departments', 'reoccurring', 'assign', 'recordsPermission', 'singleDoc', 'canManageProfitDistribution'
  ],
  invoices: [
    'view', 'create', 'update', 'delete', 'cards', 'recordPayment', 'export', 'import', 'accounts', 'categories',
    'groups', 'departments', 'assign', 'recordsPermission', 'singleDoc', 'showCompletedPaid',
    'whatsapp', 'email', 'send', 'reminder', 'mondayAutoEmail', 'template', 'templateCreate',
    'templateEdit', 'templateDelete', 'reminderTemplate', 'messageTemplate'
  ],
  vatRecord: [
    'view', 'create', 'update', 'delete', 'cards', 'export', 'groups',
    'categories', 'reoccurring', 'state', 'singleDoc'
  ],
  share: [
    'view', 'create', 'update', 'delete', 'cards', 'export',
    'import', 'categories', 'reoccurring', 'singleDoc', 'share'
  ],
  members: [
    'view', 'create', 'update', 'delete', 'cards', 'assign', 'signatureReq',
    'singleDoc', 'groupMessaging', 'whatsapp', 'email', 'send', 'reminder',
    'mondayAutoEmail', 'template', 'templateCreate', 'templateEdit', 'templateDelete',
    'reminderTemplate', 'messageTemplate'
  ],
  customers: [
    'view', 'create', 'update', 'delete', 'cards', 'export', 'groupMessaging',
    'whatsapp', 'email', 'send', 'template', 'reminder'
  ],
  products: ['view', 'create', 'update', 'delete', 'cards', 'export', 'import', 'categories'],
  whatsapp: [
    'view', 'delete', 'template', 'send', 'clearHistory', 'targetFinance', 'targetRental',
    'targetMaintenance', 'targetInvoice', 'targetClaim', 'targetCustom'
  ],
  bulkEmail: [
    'view', 'delete', 'template', 'send', 'clearHistory', 'targetFinance', 'targetRental',
    'targetMaintenance', 'targetInvoice', 'targetClaim', 'targetCustom'
  ],
  waiting: ['view', 'create', 'update', 'delete', 'export', 'categories', 'groups', 'quickContact', 'reminder'],
  company: ['view', 'create', 'update', 'delete', 'cards', 'whatsapp', 'email', 'signatureReq'],
  trash: ['view', 'cards', 'restore', 'deletePermanently'],
  users: ['view', 'create', 'update', 'delete', 'cards', 'share'],
  todo: ['view', 'create', 'update', 'delete', 'export', 'categories', 'groups', 'assign'],
  settings: ['view', 'update', 'manageDynamicTerms'],
  automation: [
    'view', 'create', 'update', 'delete', 'mondayAutoEmail', 'scheduler',
    'toggleGlobal', 'templateCreate', 'templateEdit', 'templateDelete'
  ],
  highRisk: ['view', 'create', 'update', 'delete', 'cards', 'export', 'import', 'share'],
  memberProfile: ['view', 'update'],
  memberRentals: ['view', 'update'],
  memberTransactions: ['view', 'update'],
  memberInvoices: ['view', 'update'],
};

export function normalizePermissions(
  role: Role,
  savedPermissions?: Partial<RolePermissions> | null
): RolePermissions {
  const result = {} as RolePermissions;
  const roleDefault = DEFAULT_PERMISSIONS[role] || DEFAULT_PERMISSIONS.admin || {};

  (Object.keys(BASE_PERMISSIONS_BY_MODULE) as Array<keyof RolePermissions>).forEach((moduleKey) => {
    const baseModule = BASE_PERMISSIONS_BY_MODULE[moduleKey] || { view: false };
    const defaultModule = roleDefault[moduleKey] || baseModule;
    const userSavedModule = savedPermissions?.[moduleKey];

    // If user has saved permissions specifically for this module, merge with baseModule.
    // If no saved permissions were provided at all, inherit defaults (manager gets all true, admin gets admin defaults).
    let activeModule: Permission;
    if (savedPermissions !== undefined && savedPermissions !== null) {
      if (userSavedModule) {
        activeModule = { ...baseModule, ...userSavedModule };
      } else {
        activeModule = { ...baseModule };
      }
    } else {
      activeModule = { ...defaultModule };
    }

    // If rentals specifically: sync bulkEmailScheduler and mondayAutoEmail if one exists
    if (moduleKey === 'rentals') {
      if (activeModule.mondayAutoEmail !== undefined && activeModule.bulkEmailScheduler === undefined) {
        activeModule.bulkEmailScheduler = activeModule.mondayAutoEmail;
      } else if (activeModule.bulkEmailScheduler !== undefined && activeModule.mondayAutoEmail === undefined) {
        activeModule.mondayAutoEmail = activeModule.bulkEmailScheduler;
      }
    }

    result[moduleKey] = activeModule;
  });

  return result;
}