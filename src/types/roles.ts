// src/types/roles.ts

// ▶ Roles
export type Role = 'admin' | 'manager' | 'finance' | 'claims' | 'member';

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
  export?: boolean; // enable data export when true
  import?: boolean; // (not used now) leave undefined unless you decide to allow it
  send?: boolean;

  // NEW: Vehicle Owner column + DriverPay lock/unlock
  owner?: boolean;
  lock?: boolean;
  unlock?: boolean;
}

// ▶ All modules used across the app (admin + member portal)
export interface RolePermissions {
  // ADMIN-SIDE MODULES
  dashboard: Permission;
  vehicles: Permission;             // export (+ owner)
  maintenance: Permission;          // export
  rentals: Permission;              // export
  accidents: Permission;            // export
  claims: Permission;               // export
  //personalInjury: Permission;       // (no import/export requested)
  finance: Permission;              // export
  invoices: Permission;             // export
  
  driverPay: Permission;            // export (+ lock/unlock)
  vdFinance: Permission;            // export
  vdInvoice: Permission;            // none
  users: Permission;                // none
  vatRecord: Permission;            // export
  customers: Permission;            // export
  company: Permission;              // none
  products: Permission;             // export
  incomeExpense: Permission;        // none
  skylineIncomeExpense: Permission; // none
  pettyCash: Permission;            // export
  aiePettyCash: Permission;         // export (AIE petty cash)
  share: Permission;                // export

  // Admin actions on Members (e.g., delete/remove/suspend, edit)
  members: Permission;
  waiting: Permission; // NEW MODULE
  todo: Permission;
  bulkEmail: Permission;
  whatsapp: Permission;

  // MEMBER-PORTAL MODULES (visible/used only when role === 'member')
  memberProfile: Permission;
  memberRentals: Permission;
  memberTransactions: Permission;
  memberInvoices: Permission;
}

// ------------------------- DEFAULTS -------------------------

export const DEFAULT_PERMISSIONS: Record<Role, RolePermissions> = {
  // ---------------- MANAGER ----------------
  // (Kept exactly as your old file, just added vehicles.owner + driverPay.lock/unlock)
  manager: {
    dashboard:     { view: true } as any,
    whatsapp:      { view: true, send: true } as any,
    bulkEmail:     { view: true, send: true } as any,

    vehicles:      { view: true, create: true, update: true, delete: true, cards: true, mileage: true, recordPayment: false, export: true, owner: true } as any,
    maintenance:   { view: true, create: true, update: true, delete: true, cards: true, recordPayment: false, export: true } as any,
    rentals:       { view: true, create: true, update: true, delete: true, cards: true, daily: true, weekly: true, claim: true, recordPayment: false, export: true } as any,
    accidents:     { view: true, create: true, update: true, delete: true, cards: true, export: true } as any,
    claims:        { view: true, create: true, update: true, delete: true, cards: true, export: true } as any,
    // personalInjury:{ view: true, create: true, update: true, delete: true, cards: true, recordPayment: false } as any,
    todo: { view: true, create: true, update: true, delete: true, export: true } as any,
    finance:       { view: true, create: true, update: true, delete: true, cards: true, recordPayment: false, export: true } as any,
    invoices:      { view: true, create: true, update: true, delete: true, cards: true, recordPayment: false, export: true } as any,
    pettyCash:     { view: true, create: true, update: true, delete: true, cards: true, export: true } as any,
    aiePettyCash:  { view: true, create: true, update: true, delete: true, cards: true, export: true } as any,
    share:         { view: true, create: true, update: true, delete: true, cards: true, share: true, export: true } as any,

    driverPay:     { view: true, create: true, update: true, delete: true, recordPayment: true, cards: true, export: true, lock: true, unlock: true } as any,

    waiting:       { view: true, create: true, update: true, delete: true, export: true } as any,
    vdFinance:     { view: true, create: true, update: true, delete: true, cards: true, export: true } as any,
    vdInvoice:     { view: true, create: true, update: true, delete: true, cards: true } as any, // no import/export

    users:         { view: true, create: true, update: true, delete: true, cards: true } as any,
    vatRecord:     { view: true, create: true, update: true, delete: true, cards: true, export: true } as any,
    customers:     { view: true, create: true, update: true, delete: true, cards: true, export: true } as any,
    company:       { view: true, create: true, update: true, delete: true, cards: true } as any,
    products:      { view: true, create: true, update: true, delete: true, cards: true, export: true } as any,

    incomeExpense:        { view: true, create: true, update: true, delete: true, cards: true, share: false } as any,
    skylineIncomeExpense: { view: true, create: true, update: true, delete: true, cards: true, share: false } as any,

    // Admin actions on members
    members:       { view: true, create: false, update: true, delete: false, cards: true } as any,

    // Member-portal modules (manager doesn’t use them)
    memberProfile:      { view: false } as any,
    memberRentals:      { view: false } as any,
    memberTransactions: { view: false } as any,
    memberInvoices:     { view: false } as any,
  },

  // ---------------- ADMIN ----------------
  // Same modules as old file, but update/delete are FALSE everywhere by default
  admin: {
    dashboard:     { view: true } as any,
    whatsapp:      { view: true, send: true } as any,
    bulkEmail:     { view: false, send: false } as any,
    waiting:       { view: true, create: true, update: false, delete: false, export: true } as any,
    todo: { view: true, create: true, update: false, delete: false, export: true } as any,
    vehicles:      { view: true, create: false, update: false, delete: false, cards: true, mileage: true, recordPayment: false, export: true, owner: false } as any,
    maintenance:   { view: true, create: false, update: false, delete: false, cards: true, recordPayment: false, export: true } as any,
    rentals:       { view: true, create: false, update: false, delete: false, cards: true, daily: true, weekly: true, claim: true, recordPayment: false, export: true } as any,
    accidents:     { view: true, create: false, update: false, delete: false, cards: true, export: true } as any,
    claims:        { view: true, create: false, update: false, delete: false, cards: true, export: true } as any,
    //personalInjury:{ view: true, create: false, update: false, delete: false, cards: true, recordPayment: false } as any,

    finance:       { view: true, create: false, update: false, delete: false, cards: true, recordPayment: false, export: true } as any,
    invoices:      { view: true, create: true, update: false, delete: false, cards: true, recordPayment: false, export: true } as any,
    pettyCash:     { view: true, create: true, update: false, delete: false, cards: true, export: true } as any,
    aiePettyCash:  { view: true, create: true, update: false, delete: false, cards: true, export: true } as any,
    share:         { view: true, create: true, update: false, delete: false, cards: true, share: true, export: true } as any,

    driverPay:     { view: true, create: true, update: false, delete: false, recordPayment: true, cards: true, export: true, lock: false, unlock: false } as any,

    vdFinance:     { view: true, create: true, update: false, delete: false, cards: true, export: true } as any,
    vdInvoice:     { view: true, create: true, update: false, delete: false, cards: true } as any, // no import/export

    users:         { view: false, create: false, update: false, delete: false, cards: false } as any,
    vatRecord:     { view: true, create: true, update: false, delete: false, cards: true, export: true } as any,
    customers:     { view: true, create: false, update: false, delete: false, cards: true, export: true } as any,
    company:       { view: true, create: false, update: false, delete: false, cards: true } as any,
    products:      { view: true, create: false, update: false, delete: false, cards: true, export: true } as any,

    incomeExpense:        { view: true, create: true, update: false, delete: false, cards: true, share: false } as any,
    skylineIncomeExpense: { view: true, create: true, update: false, delete: false, cards: true, share: false } as any,

    // Admin actions on members (admin can create but not update/delete by default rule)
    members:       { view: true, create: true, update: false, delete: false, cards: true } as any,

    // Member-portal modules (admin doesn’t use them)
    memberProfile:      { view: false } as any,
    memberRentals:      { view: false } as any,
    memberTransactions: { view: false } as any,
    memberInvoices:     { view: false } as any,
  },

  // ---------------- FINANCE ----------------
  // All permissions FALSE by default (only relevant keys listed)
  finance: {
    dashboard:     { view: false } as any,
    waiting:       { view: false } as any,
    whatsapp:      { view: false, send: false } as any,
    bulkEmail:     { view: false, send: false } as any,
    todo: { view: false } as any,
    vehicles:      { view: false, mileage: false, export: false, owner: false } as any,
    maintenance:   { view: false, export: false } as any,
    rentals:       { view: false, daily: false, weekly: false, claim: false, export: false } as any,
    accidents:     { view: false, export: false } as any,
    claims:        { view: false, export: false } as any,
    //personalInjury:{ view: false } as any,

    finance:       { view: false, create: false, update: false, delete: false, export: false } as any,
    invoices:      { view: false, create: false, update: false, delete: false, export: false } as any,
    pettyCash:     { view: false, create: false, update: false, delete: false, export: false } as any,
    aiePettyCash:  { view: false, create: false, update: false, delete: false, export: false } as any,
    share:         { view: false, share: false, export: false } as any,

    driverPay:     { view: false, create: false, update: false, delete: false, recordPayment: false, export: false, lock: false, unlock: false } as any,

    vdFinance:     { view: false, create: false, update: false, delete: false, export: false } as any,
    vdInvoice:     { view: false, create: false, update: false, delete: false } as any,

    users:         { view: false } as any,
    vatRecord:     { view: false, create: false, update: false, delete: false, export: false } as any,
    customers:     { view: false, export: false } as any,
    company:       { view: false } as any,
    products:      { view: false, export: false } as any,

    incomeExpense:        { view: false } as any,
    skylineIncomeExpense: { view: false } as any,

    // Admin actions on members
    members:       { view: false } as any,

    // Member-portal modules
    memberProfile:      { view: false, update: false } as any,
    memberRentals:      { view: false } as any,
    memberTransactions: { view: false } as any,
    memberInvoices:     { view: false } as any,
  },

  // ---------------- CLAIMS ----------------
  // All permissions FALSE by default (only relevant keys listed)
  claims: {
    dashboard:     { view: false } as any,
    bulkEmail:     { view: false, send: false } as any,
    waiting:       { view: false } as any,
    whatsapp:      { view: false, send: false } as any,
    todo: { view: false } as any,
    vehicles:      { view: false, mileage: false, export: false, owner: false } as any,
    maintenance:   { view: false, export: false } as any,
    rentals:       { view: false, daily: false, weekly: false, claim: false, export: false } as any,
    accidents:     { view: false, create: false, update: false, delete: false, export: false } as any,
    claims:        { view: false, create: false, update: false, delete: false, export: false } as any,
    //personalInjury:{ view: false, create: false, update: false, delete: false } as any,

    finance:       { view: false, export: false } as any,
    invoices:      { view: false, create: false, update: false, delete: false, export: false } as any,
    pettyCash:     { view: false, export: false } as any,
    aiePettyCash:  { view: false, export: false } as any,
    share:         { view: false, share: false, export: false } as any,

    driverPay:     { view: false, create: false, update: false, delete: false, recordPayment: false, export: false, lock: false, unlock: false } as any,

    vdFinance:     { view: false, create: false, update: false, delete: false, export: false } as any,
    vdInvoice:     { view: false, create: false, update: false, delete: false } as any,

    users:         { view: false } as any,
    vatRecord:     { view: false, create: false, update: false, delete: false, export: false } as any,
    customers:     { view: false, create: false, update: false, delete: false, export: false } as any,
    company:       { view: false } as any,
    products:      { view: false, export: false } as any,

    incomeExpense:        { view: false } as any,
    skylineIncomeExpense: { view: false } as any,

    // Admin actions on members
    members:       { view: false } as any,

    // Member-portal modules
    memberProfile:      { view: false } as any,
    memberRentals:      { view: false } as any,
    memberTransactions: { view: false } as any,
    memberInvoices:     { view: false } as any,
  },

  // ---------------- MEMBER (portal user) ----------------
  // All permissions FALSE by default (only relevant keys listed)
  member: {
    // Admin-side modules — all OFF for members
    bulkEmail:     { view: false } as any,
    waiting:       { view: false } as any,
    todo: { view: false } as any,
    whatsapp:      { view: false } as any,
    dashboard:     { view: false } as any,
    vehicles:      { view: false, owner: false } as any,
    maintenance:   { view: false } as any,
    rentals:       { view: false } as any,
    accidents:     { view: false } as any,
    claims:        { view: false } as any,
    //:{ view: false } as any,
    finance:       { view: false } as any,
    invoices:      { view: false } as any,
    pettyCash:     { view: false } as any,
    aiePettyCash:  { view: false } as any,
    share:         { view: false } as any,
    driverPay:     { view: false, lock: false, unlock: false } as any,
    vdFinance:     { view: false } as any,
    vdInvoice:     { view: false } as any,
    users:         { view: false } as any,
    vatRecord:     { view: false } as any,
    customers:     { view: false } as any,
    company:       { view: false } as any,
    products:      { view: false } as any,
    incomeExpense: { view: false } as any,
    skylineIncomeExpense: { view: false } as any,

    // Admin actions on members — members cannot manage other members
    members:       { view: false } as any,

    // Member-portal modules — OFF (you had them ON before; per your latest rule all false by default)
    memberProfile:      { view: false, update: false } as any,
    memberRentals:      { view: false } as any,
    memberTransactions: { view: false } as any,
    memberInvoices:     { view: false } as any,
  },
};

// Convenience helper (kept for compatibility with your code)
export function getDefaultPermissions(role: Role): RolePermissions {
  return DEFAULT_PERMISSIONS[role];
}
