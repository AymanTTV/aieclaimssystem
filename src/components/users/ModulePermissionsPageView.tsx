// src/components/users/ModulePermissionsPageView.tsx
import React, { useState, useMemo } from 'react';
import { 
  RolePermissions, 
  Permission, 
  Role,
  MODULE_ACTION_BAR_CATALOG,
  DEFAULT_PERMISSIONS
} from '../../types/roles';
import { User } from '../../types';
import { 
  Search, 
  Check, 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Shield, 
  CheckSquare, 
  Square, 
  SlidersHorizontal,
  ExternalLink,
  Car,
  Activity,
  Wrench,
  Key,
  AlertOctagon,
  ShieldAlert,
  FileText,
  DollarSign,
  Receipt,
  CreditCard,
  Wallet,
  TrendingUp,
  Landmark,
  FileCheck,
  Share2,
  Users as UsersIcon,
  UserCheck,
  Building2,
  Package,
  Clock,
  MessageSquare,
  Mail,
  Trash2,
  Settings,
  Zap,
  User as UserIcon,
  LayoutGrid,
  List,
  Sparkles,
  ArrowRight,
  Filter,
  Layers,
  ChevronDown,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react';
import toast from 'react-hot-toast';

export type PermissionAction = keyof Permission;

export interface ModuleCategoryDef {
  id: string;
  label: string;
  icon: string;
  badgeClass: string;
  modules: Array<keyof RolePermissions>;
}

export const MODULE_CATEGORIES: ModuleCategoryDef[] = [
  {
    id: 'fleet',
    label: 'Fleet & Operations',
    icon: 'Car',
    badgeClass: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    modules: ['vehicles', 'utilisation', 'maintenance', 'rentals', 'accidents', 'claims', 'highRisk', 'vdFinance', 'vdInvoice'],
  },
  {
    id: 'finance',
    label: 'Finance & Invoicing',
    icon: 'DollarSign',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    modules: ['finance', 'invoices', 'driverPay', 'pettyCash', 'aiePettyCash', 'incomeExpense', 'skylineIncomeExpense', 'vatRecord'],
  },
  {
    id: 'communications',
    label: 'Communications & CRM',
    icon: 'MessageSquare',
    badgeClass: 'bg-blue-100 text-blue-800 border-blue-200',
    modules: ['customers', 'members', 'whatsapp', 'bulkEmail', 'waiting', 'share'],
  },
  {
    id: 'admin',
    label: 'System & Governance',
    icon: 'Shield',
    badgeClass: 'bg-purple-100 text-purple-800 border-purple-200',
    modules: ['dashboard', 'users', 'company', 'products', 'todo', 'trash', 'settings', 'automation'],
  },
  {
    id: 'member',
    label: 'Member Portal',
    icon: 'User',
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-200',
    modules: ['memberProfile', 'memberRentals', 'memberTransactions', 'memberInvoices'],
  },
];

export const PAGE_DEFINITIONS: Record<keyof RolePermissions, { pageName: string; routePath: string; description: string; categoryId: string }> = {
  dashboard: { pageName: 'Dashboard', routePath: '/', description: 'Central analytics, fleet utilization KPIs, and executive summaries.', categoryId: 'admin' },
  vehicles: { pageName: 'Vehicles', routePath: '/vehicles', description: 'Fleet vehicle inventory, specifications, mileage logs, and vehicle owner records.', categoryId: 'fleet' },
  utilisation: { pageName: 'Fleet Utilisation', routePath: '/utilisation', description: 'Fleet utilization metrics, active deployment tracking, and mileage statistics.', categoryId: 'fleet' },
  maintenance: { pageName: 'Maintenance', routePath: '/maintenance', description: 'Work orders, vehicle servicing, mechanical repairs, MOT schedules, and inspections.', categoryId: 'fleet' },
  rentals: { pageName: 'Rentals', routePath: '/rentals', description: 'Rental bookings, agreements, driver allocations, rate management, and payment records.', categoryId: 'fleet' },
  accidents: { pageName: 'Accidents', routePath: '/accidents', description: 'Accident incident reports, claim initiations, underwriter dossiers, and vehicle damage logs.', categoryId: 'fleet' },
  claims: { pageName: 'Claims', routePath: '/claims', description: 'Insurance claims, legal handling, credit hire tracking, and progress management.', categoryId: 'fleet' },
  highRisk: { pageName: 'High Risk Registry', routePath: '/high-risk', description: 'Cross-fleet high-risk driver verification, risk scoring, adverse flags, and partner search.', categoryId: 'fleet' },
  vdFinance: { pageName: 'VD Finance', routePath: '/claims/vd-finance', description: 'Vehicle Damage financial accounts, ledger records, and recovery tracking.', categoryId: 'fleet' },
  vdInvoice: { pageName: 'VD Invoice', routePath: '/claims/vd-invoice', description: 'Vehicle Damage billing, credit hire invoices, and communication dispatches.', categoryId: 'fleet' },
  driverPay: { pageName: 'Driver Pay', routePath: '/skyline-caps/driver-pay', description: 'Driver earnings, period settlements, locked pay runs, and WhatsApp payslips.', categoryId: 'finance' },
  pettyCash: { pageName: 'AIE Petty Cash', routePath: '/finance/petty-cash', description: 'Petty cash receipts, cash floats, branch expenses, and reconciliation.', categoryId: 'finance' },
  aiePettyCash: { pageName: 'Skyline Petty Cash', routePath: '/skyline-caps/aie-petty-cash', description: 'Skyline caps petty cash registers, daily floats, and branch reconciliations.', categoryId: 'finance' },
  incomeExpense: { pageName: 'AIE Income & Expense', routePath: '/income-expense', description: 'Operational income, expense vouchers, recurring items, and category allocations.', categoryId: 'finance' },
  skylineIncomeExpense: { pageName: 'Skyline Income & Expense', routePath: '/skyline-caps/income-expense', description: 'Skyline business financial cash flow, recurring expense rules, and exports.', categoryId: 'finance' },
  finance: { pageName: 'Finance', routePath: '/finance', description: 'Core finance ledger, chart of accounts, business intelligence, and accounting vouchers.', categoryId: 'finance' },
  invoices: { pageName: 'Invoices', routePath: '/finance/invoices', description: 'Invoices register, billing schedules, payment receipts, and automated payment reminders.', categoryId: 'finance' },
  vatRecord: { pageName: 'VAT Records', routePath: '/finance/vat-records', description: 'VAT compliance, tax breakdowns, recurring filings, and HMRC tax reports.', categoryId: 'finance' },
  share: { pageName: 'Share System', routePath: '/share', description: 'Share System landing portal, public share link generation, social previews, and QR codes.', categoryId: 'communications' },
  customers: { pageName: 'Customers', routePath: '/customers', description: 'Customer directory, contact details, corporate clients, and group messaging.', categoryId: 'communications' },
  members: { pageName: 'Members Broadcast', routePath: '/members', description: 'Member accounts, broadcast dispatches, digital agreements, and driver profiles.', categoryId: 'communications' },
  users: { pageName: 'Users', routePath: '/users', description: 'System user accounts, role definitions, access matrix, and security permissions.', categoryId: 'admin' },
  company: { pageName: 'Company & Managers', routePath: '/company-managers', description: 'Corporate entity settings, branch details, and company manager allocations.', categoryId: 'admin' },
  products: { pageName: 'Products', routePath: '/products', description: 'Product catalog, parts inventory, category pricing, and item master.', categoryId: 'admin' },
  waiting: { pageName: 'Waiting List', routePath: '/waiting', description: 'Vehicle reservation waitlist, prospective customer queue, and reminder dispatches.', categoryId: 'communications' },
  whatsapp: { pageName: 'WhatsApp Communication', routePath: '/whatsapp-communication', description: 'Unified WhatsApp communications, chat history, and template dispatching.', categoryId: 'communications' },
  bulkEmail: { pageName: 'Bulk Email', routePath: '/bulk-email', description: 'Bulk email broadcasting, delivery logs, communication categories, and campaigns.', categoryId: 'communications' },
  todo: { pageName: 'To-Do', routePath: '/todo', description: 'Task manager, administrative reminders, group assignments, and operational checklists.', categoryId: 'admin' },
  trash: { pageName: 'Recycle Bin', routePath: '/trash', description: 'Soft-deleted entities, recovery tools, and permanent record purge controls.', categoryId: 'admin' },
  settings: { pageName: 'System Settings', routePath: '/settings', description: 'Global organization parameters, security preferences, and environment configurations.', categoryId: 'admin' },
  automation: { pageName: 'Automation Control', routePath: '/automation', description: 'Scheduled jobs, Monday Auto Email routines, dynamic tags, and scheduler controls.', categoryId: 'admin' },
  memberProfile: { pageName: 'Member Profile', routePath: '/members/profile', description: 'Portal user personal profile, account credentials, and contact details.', categoryId: 'member' },
  memberRentals: { pageName: 'Member Rentals', routePath: '/members/rentals', description: 'Portal user active and past rental contracts and vehicle history.', categoryId: 'member' },
  memberTransactions: { pageName: 'Member Transactions', routePath: '/members/transactions', description: 'Portal user financial transaction register and payment receipts.', categoryId: 'member' },
  memberInvoices: { pageName: 'Member Invoices', routePath: '/members/invoices', description: 'Portal user invoices, billing balances, and statement downloads.', categoryId: 'member' },
};

export const MODULE_ORDER: Array<keyof RolePermissions> = [
  'dashboard', 'vehicles', 'utilisation', 'maintenance', 'rentals', 'accidents', 'claims', 'highRisk',
  'vdFinance', 'vdInvoice', 'finance', 'invoices', 'driverPay', 'pettyCash', 'aiePettyCash',
  'incomeExpense', 'skylineIncomeExpense', 'vatRecord', 'share', 'customers', 'members', 'users',
  'company', 'products', 'waiting', 'whatsapp', 'bulkEmail', 'todo', 'trash', 'settings',
  'automation', 'memberProfile', 'memberRentals', 'memberTransactions', 'memberInvoices'
];

export const PERMISSION_METADATA: Record<PermissionAction, { label: string; description: string; category: string }> = {
  view: { label: 'View Page', description: 'Allows access to browse and view this module page and its records.', category: 'Core Access' },
  create: { label: 'Create Record', description: 'Allows creating new entries and saving new records.', category: 'Core Access' },
  update: { label: 'Update / Edit', description: 'Allows modifying existing records and updating details.', category: 'Core Access' },
  delete: { label: 'Delete Record', description: 'Allows archiving or deleting records from this module.', category: 'Core Access' },
  cards: { label: 'Summary Cards', description: 'Displays top KPI statistics, metrics, and summary card counters.', category: 'Core Access' },
  
  export: { label: 'Export Data (CSV/PDF)', description: 'Enables downloading tables as CSV, Excel, or PDF documents.', category: 'Data & Documents' },
  import: { label: 'Import Data', description: 'Allows uploading spreadsheets or CSV files to bulk-import records.', category: 'Data & Documents' },
  singleDoc: { label: 'Single Document PDF', description: 'Enables generating, printing, and downloading individual PDF contracts or invoices.', category: 'Data & Documents' },
  copyId: { label: 'Copy ID', description: 'Allows one-click copying of unique record identifier strings to the clipboard.', category: 'Data & Documents' },

  whatsapp: { label: 'WhatsApp Dispatch', description: 'Allows sending direct WhatsApp notifications and documents to contacts.', category: 'Communications' },
  email: { label: 'Email Dispatch', description: 'Allows dispatching emails and communication notices directly to recipients.', category: 'Communications' },
  send: { label: 'Dispatch / Send', description: 'Enables the main send and dispatch actions for communication channels.', category: 'Communications' },
  reminder: { label: 'Send Reminders', description: 'Allows triggering payment, servicing, or return reminders.', category: 'Communications' },
  mondayAutoEmail: { label: 'Monday Auto Email', description: 'Enables automatic Monday morning email dispatches and reminders.', category: 'Communications' },
  bulkEmailScheduler: { label: 'Bulk Email Scheduler', description: 'Allows configuring scheduled bulk email campaigns and delivery windows.', category: 'Communications' },
  groupMessaging: { label: 'Group Messaging', description: 'Allows sending broadcast announcements and news flashes to multiple recipients.', category: 'Communications' },
  quickContact: { label: 'Quick Contact', description: 'Enables one-click phone, email, or WhatsApp quick-contact buttons.', category: 'Communications' },
  clearHistory: { label: 'Clear History', description: 'Allows clearing or archiving dispatched communication history logs.', category: 'Communications' },
  targetFinance: { label: 'Target Finance', description: 'Allows directing communications to finance recipients.', category: 'Communications' },
  targetRental: { label: 'Target Rental', description: 'Allows directing communications to rental clients.', category: 'Communications' },
  targetMaintenance: { label: 'Target Maintenance', description: 'Allows directing communications to repair workshops.', category: 'Communications' },
  targetInvoice: { label: 'Target Invoice', description: 'Allows directing communications to billing contacts.', category: 'Communications' },
  targetClaim: { label: 'Target Claim', description: 'Allows directing communications to claim handlers.', category: 'Communications' },
  targetCustom: { label: 'Target Custom', description: 'Allows entering ad-hoc custom recipient addresses.', category: 'Communications' },

  template: { label: 'Use Templates', description: 'Allows selecting and populating predefined message templates.', category: 'Templates' },
  templateCreate: { label: 'Create Template', description: 'Allows designing and saving new reusable communication templates.', category: 'Templates' },
  templateEdit: { label: 'Edit Template', description: 'Allows modifying existing templates, subject lines, and tags.', category: 'Templates' },
  templateDelete: { label: 'Delete Template (Protected)', description: 'Protected action permitting the permanent deletion of templates.', category: 'Templates' },
  reminderTemplate: { label: 'Reminder Templates', description: 'Allows managing specialized automated reminder template configurations.', category: 'Templates' },
  messageTemplate: { label: 'Message Templates', description: 'Allows managing SMS and WhatsApp formatted message templates.', category: 'Templates' },
  scheduler: { label: 'Scheduler Preferences', description: 'Allows adjusting automated cron timers, day, and time triggers.', category: 'Templates' },
  toggleGlobal: { label: 'Toggle Global Automation', description: 'Allows enabling or pausing global automated background workflows.', category: 'Templates' },

  recordPayment: { label: 'Record Payment', description: 'Allows logging received or sent payment transactions.', category: 'Financial & Operations' },
  viewPayment: { label: 'View Payments', description: 'Allows inspecting payment logs, receipts, and allocation history.', category: 'Financial & Operations' },
  editPayment: { label: 'Edit Payments', description: 'Allows amending payment amounts, methods, or dates.', category: 'Financial & Operations' },
  deletePayment: { label: 'Delete Payments', description: 'Allows voiding or deleting recorded payment entries.', category: 'Financial & Operations' },
  accounts: { label: 'Accounts Ledger', description: 'Enables managing the chart of accounts, bank transfers, and ledgers.', category: 'Financial & Operations' },
  period: { label: 'Pay Period', description: 'Allows filtering and generating settlements by specific pay periods.', category: 'Financial & Operations' },
  reoccurring: { label: 'Recurring Rules', description: 'Allows creating and managing automated recurring billing or expense schedules.', category: 'Financial & Operations' },
  discount: { label: 'Apply Discounts', description: 'Allows entering promotional adjustments and line-item discounts.', category: 'Financial & Operations' },
  showCompletedPaid: { label: 'Show Paid / Completed Toggle', description: 'Allows filtering or viewing archived paid/settled items.', category: 'Financial & Operations' },

  mileage: { label: 'Mileage Tracker', description: 'Enables recording and updating odometer mileage readings.', category: 'Fleet & Operations' },
  mileageHistoryView: { label: 'View Mileage History', description: 'Allows reviewing complete audit trails of vehicle odometer readings.', category: 'Fleet & Operations' },
  mileageHistoryEdit: { label: 'Edit Mileage History', description: 'Allows correcting previous mileage log entries.', category: 'Fleet & Operations' },
  mileageHistoryDelete: { label: 'Delete Mileage History', description: 'Allows removing invalid mileage audit entries.', category: 'Fleet & Operations' },
  owner: { label: 'Vehicle Owner', description: 'Allows configuring owner allocations and private vehicle owner records.', category: 'Fleet & Operations' },
  daily: { label: 'Daily Rentals', description: 'Allows managing short-term daily rental tariffs and bookings.', category: 'Fleet & Operations' },
  weekly: { label: 'Weekly Rentals', description: 'Allows managing weekly rental rates and long-term allocations.', category: 'Fleet & Operations' },
  claim: { label: 'Claim Rentals', description: 'Allows creating replacement credit-hire rentals linked to claims.', category: 'Fleet & Operations' },
  availableVehicles: { label: 'Available Vehicles Modal', description: 'Opens the vehicle availability matrix to locate unassigned cars.', category: 'Fleet & Operations' },
  completion: { label: 'Mark Completion', description: 'Allows transitioning active rentals or maintenance jobs to completed.', category: 'Fleet & Operations' },
  complete: { label: 'Complete Action', description: 'Allows approving and finalizing maintenance repairs.', category: 'Fleet & Operations' },
  completed: { label: 'Completed Records', description: 'Allows viewing historical completed records and archive lists.', category: 'Fleet & Operations' },
  sale: { label: 'Process Sales', description: 'Allows marking fleet vehicles as sold and processing sale proceeds.', category: 'Fleet & Operations' },
  syncStatus: { label: 'Sync Status', description: 'Enables manual resynchronization of status tags across linked files.', category: 'Fleet & Operations' },
  lock: { label: 'Lock Records', description: 'Allows locking financial pay runs to prevent any subsequent tampering.', category: 'Fleet & Operations' },
  unlock: { label: 'Unlock Records', description: 'Allows managers to unlock previously finalized pay periods.', category: 'Fleet & Operations' },
  tableStatus: { label: 'Table Status', description: 'Allows configuring and filtering by custom table workflow statuses.', category: 'Fleet & Operations' },
  signatureReq: { label: 'Request Signatures', description: 'Allows requesting digital electronic signatures on documents.', category: 'Fleet & Operations' },

  recordsPermission: { label: 'Records Permissions', description: 'Restricts or opens confidential record security classifications.', category: 'Governance & Workflow' },
  groups: { label: 'Manage Groups', description: 'Allows managing corporate groups and grouping records.', category: 'Governance & Workflow' },
  departments: { label: 'Manage Departments', description: 'Allows allocating records to corporate operational departments.', category: 'Governance & Workflow' },
  assign: { label: 'Bulk Assign Records', description: 'Allows bulk reassigning records to handlers, teams, or managers.', category: 'Governance & Workflow' },
  note: { label: 'Internal Notes', description: 'Allows viewing, adding, and managing confidential internal record notes.', category: 'Governance & Workflow' },
  state: { label: 'Change State', description: 'Allows transitioning claims or transactions through workflow lifecycle states.', category: 'Governance & Workflow' },
  progressview: { label: 'View Progress Tracker', description: 'Allows viewing the visual progress roadmap of insurance proceedings.', category: 'Governance & Workflow' },
  progressedit: { label: 'Edit Progress Tracker', description: 'Allows advancing or updating milestone stages in the progress roadmap.', category: 'Governance & Workflow' },
  categories: { label: 'Manage Categories', description: 'Allows creating and managing categorization taxonomies.', category: 'Governance & Workflow' },
  driverRisk: { label: 'Driver Risk Analysis', description: 'Enables underwriting driver risk analysis scoring and dossiers.', category: 'Governance & Workflow' },
  renewalAnalysis: { label: 'Renewal Dossier', description: 'Enables generating insurance renewal analysis portfolios.', category: 'Governance & Workflow' },
  restore: { label: 'Restore from Recycle Bin', description: 'Allows restoring deleted items back to active state.', category: 'Governance & Workflow' },
  deletePermanently: { label: 'Delete Permanently', description: 'Permits permanently and irretrievably destroying archived items.', category: 'Governance & Workflow' },
  share: { label: 'Share System Link', description: 'Enables sharing system links with social preview cards and QR codes.', category: 'Governance & Workflow' },
};

export const getModuleIcon = (modKey: keyof RolePermissions, className: string = 'w-5 h-5') => {
  switch (modKey) {
    case 'dashboard': return <Activity className={`${className} text-blue-600`} />;
    case 'vehicles': return <Car className={`${className} text-indigo-600`} />;
    case 'utilisation': return <Activity className={`${className} text-teal-600`} />;
    case 'maintenance': return <Wrench className={`${className} text-amber-600`} />;
    case 'rentals': return <Key className={`${className} text-emerald-600`} />;
    case 'accidents': return <AlertOctagon className={`${className} text-rose-600`} />;
    case 'claims': return <FileText className={`${className} text-purple-600`} />;
    case 'highRisk': return <ShieldAlert className={`${className} text-red-600`} />;
    case 'vdFinance': return <DollarSign className={`${className} text-emerald-600`} />;
    case 'vdInvoice': return <Receipt className={`${className} text-blue-600`} />;
    case 'driverPay': return <CreditCard className={`${className} text-indigo-600`} />;
    case 'pettyCash':
    case 'aiePettyCash': return <Wallet className={`${className} text-amber-600`} />;
    case 'incomeExpense':
    case 'skylineIncomeExpense': return <TrendingUp className={`${className} text-emerald-600`} />;
    case 'finance': return <Landmark className={`${className} text-blue-700`} />;
    case 'invoices': return <FileCheck className={`${className} text-indigo-600`} />;
    case 'vatRecord': return <Receipt className={`${className} text-rose-600`} />;
    case 'share': return <Share2 className={`${className} text-[#423fbd]`} />;
    case 'customers': return <UsersIcon className={`${className} text-teal-600`} />;
    case 'members': return <UserCheck className={`${className} text-blue-600`} />;
    case 'users': return <Shield className={`${className} text-indigo-600`} />;
    case 'company': return <Building2 className={`${className} text-purple-600`} />;
    case 'products': return <Package className={`${className} text-amber-600`} />;
    case 'waiting': return <Clock className={`${className} text-rose-600`} />;
    case 'whatsapp': return <MessageSquare className={`${className} text-emerald-600`} />;
    case 'bulkEmail': return <Mail className={`${className} text-blue-600`} />;
    case 'todo': return <CheckSquare className={`${className} text-indigo-600`} />;
    case 'trash': return <Trash2 className={`${className} text-rose-600`} />;
    case 'settings': return <Settings className={`${className} text-slate-600`} />;
    case 'automation': return <Zap className={`${className} text-amber-600`} />;
    case 'memberProfile': return <UserIcon className={`${className} text-blue-600`} />;
    case 'memberRentals': return <Key className={`${className} text-emerald-600`} />;
    case 'memberTransactions': return <CreditCard className={`${className} text-teal-600`} />;
    case 'memberInvoices': return <Receipt className={`${className} text-indigo-600`} />;
    default: return <SlidersHorizontal className={`${className} text-slate-600`} />;
  }
};

const MEMBER_PORTAL_KEYS: Array<keyof RolePermissions> = ['memberProfile', 'memberRentals', 'memberTransactions', 'memberInvoices'];
const isMemberPortalKey = (k: keyof RolePermissions) => MEMBER_PORTAL_KEYS.includes(k);

export interface ModulePermissionsPageViewProps {
  role: User['role'];
  onRoleChange?: (role: User['role']) => void;
  user?: User | null;
  customPermissions: RolePermissions;
  onChangePermission: (moduleKey: keyof RolePermissions, actionKey: PermissionAction, value: boolean) => void;
  onToggleModuleAll: (moduleKey: keyof RolePermissions, value: boolean) => void;
  isManager: boolean;
  selectedModule?: keyof RolePermissions;
  onSelectModule?: (moduleKey: keyof RolePermissions) => void;
  onSave?: () => void;
  saving?: boolean;
}

export const ModulePermissionsPageView: React.FC<ModulePermissionsPageViewProps> = ({
  role,
  onRoleChange,
  user,
  customPermissions,
  onChangePermission,
  onToggleModuleAll,
  isManager,
  selectedModule: externalSelectedModule,
  onSelectModule: externalOnSelectModule,
  onSave,
  saving = false,
}) => {
  // Navigation & View Mode: 'grid' (bird's-eye view of all modules) or 'detail' (deep dive into selected module)
  const [navViewMode, setNavViewMode] = useState<'detail' | 'grid'>('detail');
  const [internalSelectedModule, setInternalSelectedModule] = useState<keyof RolePermissions>('vehicles');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [moduleSearch, setModuleSearch] = useState('');
  const [permissionSearch, setPermissionSearch] = useState('');
  const [filterPermissionCategory, setFilterPermissionCategory] = useState<string>('all');
  const [showSidebar, setShowSidebar] = useState(true);

  const activeModuleKey = externalSelectedModule || internalSelectedModule;
  const setActiveModule = (modKey: keyof RolePermissions) => {
    if (externalOnSelectModule) {
      externalOnSelectModule(modKey);
    } else {
      setInternalSelectedModule(modKey);
    }
    setNavViewMode('detail');
  };

  // Applicable modules for the active role
  const applicableModules = useMemo(() => {
    return MODULE_ORDER.filter((modKey) => {
      if (role === 'member') return isMemberPortalKey(modKey);
      return !isMemberPortalKey(modKey);
    });
  }, [role]);

  // Active categories for the role
  const activeCategories = useMemo(() => {
    return MODULE_CATEGORIES.filter((cat) => {
      if (role === 'member') return cat.id === 'member';
      return cat.id !== 'member';
    });
  }, [role]);

  // Filtered module list based on category and search
  const filteredModules = useMemo(() => {
    let list = applicableModules;

    if (selectedCategory !== 'all') {
      const cat = MODULE_CATEGORIES.find((c) => c.id === selectedCategory);
      if (cat) {
        list = list.filter((m) => cat.modules.includes(m));
      }
    }

    if (moduleSearch.trim()) {
      const q = moduleSearch.toLowerCase().trim();
      list = list.filter((modKey) => {
        const def = PAGE_DEFINITIONS[modKey];
        return def?.pageName.toLowerCase().includes(q) || modKey.toLowerCase().includes(q) || def?.routePath.toLowerCase().includes(q);
      });
    }

    return list;
  }, [applicableModules, selectedCategory, moduleSearch]);

  // Current page definition
  const currentModuleDef = PAGE_DEFINITIONS[activeModuleKey] || {
    pageName: String(activeModuleKey),
    routePath: `/${activeModuleKey}`,
    description: 'Application feature module and records.',
    categoryId: 'fleet',
  };

  // Actions for current module from catalog or current permissions
  const moduleActions = useMemo(() => {
    const catalogActions = MODULE_ACTION_BAR_CATALOG[activeModuleKey] || [];
    const currentModPerms = customPermissions[activeModuleKey] || {};
    const keysFromPerms = Object.keys(currentModPerms) as PermissionAction[];
    const unionSet = new Set<PermissionAction>([...catalogActions, ...keysFromPerms]);
    return Array.from(unionSet).filter((act) => !(act === 'share' && activeModuleKey !== 'users'));
  }, [activeModuleKey, customPermissions]);

  // Calculate stats for current module
  const currentModuleStats = useMemo(() => {
    const modPerms = (customPermissions[activeModuleKey] || {}) as Record<string, boolean>;
    const granted = moduleActions.filter((act) => Boolean(modPerms[act])).length;
    const total = moduleActions.length;
    const isViewEnabled = Boolean(modPerms.view);
    const percent = total > 0 ? Math.round((granted / total) * 100) : 0;
    return { granted, total, isViewEnabled, percent };
  }, [activeModuleKey, customPermissions, moduleActions]);

  // Helper to compute stats for ANY module (for grid & sidebar)
  const getModuleStats = (modKey: keyof RolePermissions) => {
    const modPerms = (customPermissions[modKey] || {}) as Record<string, boolean>;
    const rawActions = MODULE_ACTION_BAR_CATALOG[modKey] || Object.keys(modPerms);
    const actions = rawActions.filter((act) => !(act === 'share' && modKey !== 'users'));
    const granted = actions.filter((act) => Boolean(modPerms[act as PermissionAction])).length;
    const total = actions.length;
    const isView = Boolean(modPerms.view);
    const percent = total > 0 ? Math.round((granted / total) * 100) : 0;
    return { granted, total, isView, percent };
  };

  // Filtered permissions for the current module's page
  const filteredPermissions = useMemo(() => {
    return moduleActions.filter((act) => {
      const meta = PERMISSION_METADATA[act] || {
        label: String(act),
        description: `Enables ${String(act)} action.`,
        category: 'Other Actions',
      };

      if (filterPermissionCategory !== 'all' && meta.category !== filterPermissionCategory) return false;

      if (permissionSearch.trim()) {
        const q = permissionSearch.toLowerCase().trim();
        const matchesAct = act.toLowerCase().includes(q);
        const matchesLabel = meta.label.toLowerCase().includes(q);
        const matchesDesc = meta.description.toLowerCase().includes(q);
        if (!matchesAct && !matchesLabel && !matchesDesc) return false;
      }

      return true;
    });
  }, [moduleActions, filterPermissionCategory, permissionSearch]);

  // Group filtered permissions by category
  const groupedPermissions = useMemo(() => {
    const groups: Record<string, PermissionAction[]> = {};
    filteredPermissions.forEach((act) => {
      const cat = PERMISSION_METADATA[act]?.category || 'Other Operations';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(act);
    });
    return groups;
  }, [filteredPermissions]);

  // Categories present in this module
  const moduleCategories = useMemo(() => {
    const cats = new Set<string>();
    moduleActions.forEach((act) => {
      cats.add(PERMISSION_METADATA[act]?.category || 'Other Operations');
    });
    return Array.from(cats);
  }, [moduleActions]);

  // Module pagination controls
  const currentIndex = applicableModules.indexOf(activeModuleKey);
  const prevModuleName = currentIndex > 0 ? PAGE_DEFINITIONS[applicableModules[currentIndex - 1]]?.pageName : null;
  const nextModuleName = currentIndex < applicableModules.length - 1 ? PAGE_DEFINITIONS[applicableModules[currentIndex + 1]]?.pageName : null;

  const handlePrevModule = () => {
    if (currentIndex > 0) {
      setActiveModule(applicableModules[currentIndex - 1]);
    }
  };
  const handleNextModule = () => {
    if (currentIndex < applicableModules.length - 1) {
      setActiveModule(applicableModules[currentIndex + 1]);
    }
  };

  const handleInvertPermissions = () => {
    if (!isManager) return;
    const modPerms = (customPermissions[activeModuleKey] || {}) as Record<string, boolean>;
    moduleActions.forEach((act) => {
      onChangePermission(activeModuleKey, act, !Boolean(modPerms[act]));
    });
    toast.success(`Inverted permissions for ${currentModuleDef.pageName}`);
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 h-full bg-slate-50 border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
      
      {/* ── TOP MASTER BAR: CATEGORY FILTER CHIPS & MODULE JUMP SELECTOR ── */}
      <div className="shrink-0 p-3 sm:p-4 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
        
        {/* Left: View Mode Toggle & Category Chips */}
        <div className="flex flex-wrap items-center gap-2">
          
          {/* Mode Switcher: All Modules Grid vs Module Page */}
          <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200">
            <button
              type="button"
              onClick={() => setNavViewMode('grid')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                navViewMode === 'grid'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="See all 34 modules laid out in a clear visual grid"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>All Modules ({applicableModules.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setNavViewMode('detail')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                navViewMode === 'detail'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Deep-dive into the currently selected module's permission list"
            >
              <List className="w-3.5 h-3.5" />
              <span>{currentModuleDef.pageName} Page</span>
            </button>
          </div>

          <div className="h-4 w-px bg-slate-200 hidden sm:block" />

          {/* Category Filter Chips */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setSelectedCategory('all')}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                selectedCategory === 'all'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              All Categories
            </button>
            {activeCategories.map((cat) => {
              const count = cat.modules.filter((m) => applicableModules.includes(m)).length;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                    selectedCategory === cat.id
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  <span>{cat.label}</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                    selectedCategory === cat.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

        </div>

        {/* Right: Quick Module Jump Dropdown Selector & Role Switcher */}
        <div className="flex flex-wrap items-center gap-2">
          
          {/* Quick Module Jump Selector */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1 shadow-2xs">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider shrink-0">Jump To:</span>
            <select
              value={activeModuleKey}
              onChange={(e) => setActiveModule(e.target.value as keyof RolePermissions)}
              className="bg-transparent text-xs font-bold text-slate-900 focus:outline-none cursor-pointer pr-1"
            >
              {activeCategories.map((cat) => {
                const catMods = cat.modules.filter((m) => applicableModules.includes(m));
                if (catMods.length === 0) return null;
                return (
                  <optgroup key={cat.id} label={cat.label}>
                    {catMods.map((modKey) => {
                      const def = PAGE_DEFINITIONS[modKey];
                      const stats = getModuleStats(modKey);
                      return (
                        <option key={modKey} value={modKey}>
                          {def?.pageName} ({def?.routePath}) — {stats.granted}/{stats.total}
                        </option>
                      );
                    })}
                  </optgroup>
                );
              })}
            </select>
          </div>

          {/* Role Switcher (if onRoleChange passed) */}
          {onRoleChange && isManager && (
            <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded-xl px-2.5 py-1 text-xs shadow-2xs">
              <span className="text-[10px] text-slate-400 font-bold uppercase">Role:</span>
              <select
                value={role}
                onChange={(e) => onRoleChange(e.target.value as User['role'])}
                className="bg-transparent font-bold text-slate-800 focus:outline-none cursor-pointer"
              >
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
                <option value="finance">Finance</option>
                <option value="claims">Claims</option>
                <option value="company">Company</option>
                <option value="member">Member</option>
              </select>
            </div>
          )}

        </div>

      </div>

      {/* ════════════════════════════════════════════════════════════════════════════════
          VIEW 1: "ALL MODULES GRID" (CLEAR, BIRD'S-EYE OVERVIEW OF ALL 34 MODULES)
         ════════════════════════════════════════════════════════════════════════════════ */}
      {navViewMode === 'grid' && (
        <div className="flex-1 overflow-y-auto min-h-0 p-4 sm:p-6 bg-slate-50 space-y-6">
          
          {/* Top Search & Filter Bar */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-black text-slate-900">Module Directory</span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-indigo-100 text-indigo-800">
                {filteredModules.length} Modules Available
              </span>
            </div>

            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={moduleSearch}
                onChange={(e) => setModuleSearch(e.target.value)}
                placeholder="Search modules by name, route, or keyword..."
                className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
              />
              {moduleSearch && (
                <button
                  type="button"
                  onClick={() => setModuleSearch('')}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Categorized Grid Sections */}
          {activeCategories.map((cat) => {
            const catModules = filteredModules.filter((m) => cat.modules.includes(m));
            if (catModules.length === 0) return null;

            return (
              <div key={cat.id} className="space-y-3">
                {/* Category Header */}
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">{cat.label}</h3>
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-bold bg-slate-200/80 text-slate-700">
                      {catModules.length} module{catModules.length > 1 ? 's' : ''}
                    </span>
                  </div>
                </div>

                {/* Modules Cards Grid - Expands to utilize full browser width */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3.5">
                  {catModules.map((modKey) => {
                    const def = PAGE_DEFINITIONS[modKey];
                    const stats = getModuleStats(modKey);
                    const isCurrent = modKey === activeModuleKey;

                    return (
                      <div
                        key={modKey}
                        onClick={() => setActiveModule(modKey)}
                        className={`group relative rounded-2xl border p-4 bg-white hover:bg-indigo-50/20 transition-all duration-150 cursor-pointer flex flex-col justify-between shadow-2xs hover:shadow-md hover:border-indigo-300 ${
                          isCurrent ? 'ring-2 ring-indigo-500 border-indigo-400' : 'border-slate-200'
                        }`}
                      >
                        <div>
                          {/* Card Top: Icon & Route & Status */}
                          <div className="flex items-start justify-between gap-2.5 mb-2.5">
                            <div className="flex items-center gap-2.5">
                              <div className="p-2.5 bg-slate-100 group-hover:bg-indigo-100 rounded-xl transition-colors">
                                {getModuleIcon(modKey, 'w-6 h-6')}
                              </div>
                              <div>
                                <h4 className="text-sm font-black text-slate-900 group-hover:text-indigo-600 transition-colors">
                                  {def?.pageName}
                                </h4>
                                <span className="text-[11px] font-mono text-slate-400">
                                  {def?.routePath}
                                </span>
                              </div>
                            </div>

                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 ${
                              stats.isView
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : 'bg-slate-100 text-slate-500 border border-slate-200'
                            }`}>
                              {stats.isView ? <Check className="w-2.5 h-2.5 stroke-[3]" /> : <X className="w-2.5 h-2.5 stroke-[3]" />}
                              {stats.isView ? 'Active' : 'Disabled'}
                            </span>
                          </div>

                          {/* Description */}
                          <p className="text-xs text-slate-500 line-clamp-2 font-medium mb-3">
                            {def?.description}
                          </p>
                        </div>

                        {/* Card Bottom: Progress Bar & Open Link */}
                        <div className="pt-2 border-t border-slate-100 space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-400 font-medium">Permissions:</span>
                            <span className="font-mono font-bold text-slate-800">
                              {stats.granted} of {stats.total} ({stats.percent}%)
                            </span>
                          </div>

                          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                stats.percent === 100
                                  ? 'bg-emerald-500'
                                  : stats.percent > 0
                                  ? 'bg-indigo-600'
                                  : 'bg-slate-300'
                              }`}
                              style={{ width: `${stats.percent}%` }}
                            />
                          </div>

                          <div className="flex items-center justify-between pt-1">
                            <span className="text-[11px] font-bold text-indigo-600 group-hover:text-indigo-700 flex items-center gap-1">
                              Configure Page Permissions <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                            </span>
                          </div>
                        </div>

                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════════════
          VIEW 2: "SINGLE MODULE PAGE" (DEDICATED PAGE & FULL PERMISSION LIST)
         ════════════════════════════════════════════════════════════════════════════════ */}
      {navViewMode === 'detail' && (
        <div className="flex-1 flex flex-col lg:flex-row min-h-0 bg-slate-50 overflow-hidden">
          
          {/* ── LEFT SIDEBAR: QUICK MODULE SWITCHER LIST (ALL 34 MODULES VISIBLE ON FULL SIDE WITHOUT SCROLLING) ── */}
          {showSidebar && (
            <div className="w-full lg:w-[400px] xl:w-[460px] 2xl:w-[500px] shrink-0 bg-white border-b lg:border-b-0 lg:border-r border-slate-200 flex flex-col min-h-0 select-none h-full">
              
              {/* Sidebar Header & Search */}
              <div className="p-1 px-2 border-b border-slate-100 bg-slate-50/80 shrink-0 flex items-center justify-between gap-1.5 h-8">
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
                    All Modules
                  </span>
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-indigo-100 text-indigo-700">
                    {filteredModules.length}
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium hidden sm:inline">
                    (No scrolling)
                  </span>
                </div>

                <div className="relative flex-1 max-w-[170px]">
                  <Search className="absolute left-1.5 top-1 h-3 w-3 text-slate-400" />
                  <input
                    type="text"
                    value={moduleSearch}
                    onChange={(e) => setModuleSearch(e.target.value)}
                    placeholder="Quick filter..."
                    className="w-full pl-5 pr-4 py-0.5 text-[10.5px] rounded border border-slate-200 bg-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium leading-none"
                  />
                  {moduleSearch && (
                    <button
                      type="button"
                      onClick={() => setModuleSearch('')}
                      className="absolute right-1 top-0.5 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Multi-Column Grid of All Modules (3-column on xl, 2-column on lg) - Fits full left side without scrolling */}
              <div className="p-1 grid grid-cols-2 xl:grid-cols-3 gap-0.5 overflow-hidden select-none flex-1 content-start">
                {filteredModules.map((modKey) => {
                  const def = PAGE_DEFINITIONS[modKey];
                  const isSelected = modKey === activeModuleKey;
                  const stats = getModuleStats(modKey);

                  return (
                    <button
                      key={modKey}
                      type="button"
                      onClick={() => setActiveModule(modKey)}
                      className={`text-left px-1.5 py-0.5 rounded transition-all flex items-center justify-between gap-1 cursor-pointer group text-[10.5px] h-[25px] ${
                        isSelected
                          ? 'bg-indigo-600 text-white font-bold shadow-2xs'
                          : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900 bg-white/80 border border-slate-200/60'
                      }`}
                      title={`${def?.pageName} (${def?.routePath}) • ${stats.granted}/${stats.total} permissions`}
                    >
                      <div className="flex items-center gap-1 min-w-0">
                        <span className="shrink-0">{getModuleIcon(modKey, 'w-3 h-3')}</span>
                        <span className="truncate font-semibold text-[10.5px] leading-tight">
                          {def?.pageName}
                        </span>
                      </div>

                      <span className={`px-1 py-0.2 rounded text-[8.5px] font-mono font-bold shrink-0 ${
                        isSelected
                          ? 'bg-white/20 text-white'
                          : stats.granted > 0
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-slate-100 text-slate-400'
                      }`}>
                        {stats.granted}
                      </span>
                    </button>
                  );
                })}
              </div>

            </div>
          )}

          {/* ── RIGHT MAIN PANEL: SELECTED MODULE'S PERMISSIONS PAGE ── */}
          <div className="flex-1 flex flex-col min-h-0 bg-white overflow-hidden">
            
            {/* Top Navigation & Jump Toolbar */}
            <div className="shrink-0 p-3 sm:p-4 bg-slate-900 text-white border-b border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-3">
              
              {/* Left: View All Modules Button & Current Module Identity */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setNavViewMode('grid')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black bg-white/10 hover:bg-white/20 text-indigo-300 border border-white/10 transition-colors shadow-2xs cursor-pointer"
                  title="Return to the grid of all 34 modules"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">All Modules Grid</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowSidebar(!showSidebar)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-colors shadow-2xs cursor-pointer border ${
                    showSidebar 
                      ? 'bg-white/10 hover:bg-white/20 text-slate-200 border-white/10' 
                      : 'bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-500'
                  }`}
                  title={showSidebar ? "Hide sidebar rail to expand permissions to full width" : "Show sidebar rail"}
                >
                  {showSidebar ? <PanelLeftClose className="w-3.5 h-3.5" /> : <PanelLeftOpen className="w-3.5 h-3.5" />}
                  <span className="hidden sm:inline">{showSidebar ? "Full Width" : "Sidebar"}</span>
                </button>

                <div className="h-5 w-px bg-white/10 hidden sm:block" />

                <div className="flex items-center gap-2">
                  <div className="p-2 bg-white/10 rounded-xl">
                    {getModuleIcon(activeModuleKey, 'w-5 h-5')}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base sm:text-lg font-black text-white tracking-tight">
                        {currentModuleDef.pageName} Page
                      </h2>
                      <span className="font-mono text-xs text-indigo-300 bg-white/10 px-2 py-0.5 rounded-md">
                        {currentModuleDef.routePath}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-300 hidden sm:block">
                      {currentModuleStats.granted} of {currentModuleStats.total} permissions granted ({currentModuleStats.percent}%)
                    </span>
                  </div>
                </div>
              </div>

              {/* Right: Previous / Next Module Stepper & Master Page Actions */}
              <div className="flex flex-wrap items-center gap-2">
                
                {/* Previous Module */}
                <button
                  type="button"
                  onClick={handlePrevModule}
                  disabled={currentIndex <= 0}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-slate-200 disabled:opacity-30 disabled:pointer-events-none cursor-pointer transition-colors border border-white/10"
                  title={prevModuleName ? `Go to ${prevModuleName}` : ''}
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">{prevModuleName || 'Prev'}</span>
                </button>

                <span className="text-[11px] font-mono text-slate-400 px-1 font-bold">
                  {currentIndex + 1} / {applicableModules.length}
                </span>

                {/* Next Module */}
                <button
                  type="button"
                  onClick={handleNextModule}
                  disabled={currentIndex >= applicableModules.length - 1}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-slate-200 disabled:opacity-30 disabled:pointer-events-none cursor-pointer transition-colors border border-white/10"
                  title={nextModuleName ? `Go to ${nextModuleName}` : ''}
                >
                  <span className="hidden md:inline">{nextModuleName || 'Next'}</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>

                {/* Master Page Enable / Clear Controls */}
                {isManager && (
                  <div className="flex items-center gap-1.5 border-l border-white/10 pl-2">
                    <button
                      type="button"
                      onClick={() => onToggleModuleAll(activeModuleKey, true)}
                      className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors cursor-pointer shadow-2xs"
                      title={`Enable all permissions on ${currentModuleDef.pageName}`}
                    >
                      <CheckSquare className="w-3.5 h-3.5 inline mr-1" />
                      <span>Enable Page</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onToggleModuleAll(activeModuleKey, false)}
                      className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-rose-300 border border-white/10 transition-colors cursor-pointer"
                      title={`Clear all permissions on ${currentModuleDef.pageName}`}
                    >
                      <Square className="w-3.5 h-3.5 inline mr-1" />
                      <span>Clear Page</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleInvertPermissions}
                      className="px-2 py-1.5 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-slate-300 border border-white/10 transition-colors cursor-pointer"
                      title="Invert permissions on this page"
                    >
                      Invert
                    </button>
                  </div>
                )}

              </div>

            </div>

            {/* Filter & Search Bar for this Module's Permission List */}
            <div className="shrink-0 px-4 sm:px-6 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs font-bold text-slate-500">Action Group:</span>
                <button
                  type="button"
                  onClick={() => setFilterPermissionCategory('all')}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                    filterPermissionCategory === 'all'
                      ? 'bg-slate-900 text-white shadow-2xs'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  All ({moduleActions.length})
                </button>
                {moduleCategories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setFilterPermissionCategory(cat)}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                      filterPermissionCategory === cat
                        ? 'bg-indigo-600 text-white shadow-2xs'
                        : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  value={permissionSearch}
                  onChange={(e) => setPermissionSearch(e.target.value)}
                  placeholder={`Search ${currentModuleDef.pageName} actions...`}
                  className="w-full pl-8 pr-7 py-1 text-xs rounded-lg border border-slate-300 bg-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
                />
                {permissionSearch && (
                  <button
                    type="button"
                    onClick={() => setPermissionSearch('')}
                    className="absolute right-2 top-1.5 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* ── LIST OF PERMISSIONS FOR THIS MODULE'S PAGE ── */}
            <div className="flex-1 overflow-y-auto min-h-0 p-4 sm:p-6 bg-slate-50/50 space-y-5">
              {Object.keys(groupedPermissions).length === 0 ? (
                <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 shadow-2xs">
                  <Search className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <h3 className="text-sm font-bold text-slate-800">No actions found</h3>
                  <p className="text-xs text-slate-500 mt-1">Try clearing your search query or reset category filter.</p>
                </div>
              ) : (
                Object.entries(groupedPermissions).map(([category, actions]) => (
                  <div key={category} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
                    
                    {/* Category Header */}
                    <div className="px-4 py-2.5 bg-slate-100/70 border-b border-slate-200 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-indigo-600" />
                        <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">{category}</h3>
                        <span className="text-[11px] font-mono text-slate-400">({actions.length} action{actions.length > 1 ? 's' : ''})</span>
                      </div>

                      <span className="text-[11px] font-medium text-slate-500">
                        {actions.filter((a) => Boolean((customPermissions[activeModuleKey] as any)?.[a])).length} of {actions.length} enabled
                      </span>
                    </div>

                    {/* Flexible Grid of Permissions in this Category - Expands to Fill Full Available Width */}
                    <div className="p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
                      {actions.map((actionKey) => {
                        const isGranted = Boolean((customPermissions[activeModuleKey] as any)?.[actionKey]);
                        const meta = PERMISSION_METADATA[actionKey] || {
                          label: String(actionKey),
                          description: `Controls ${String(actionKey)} capability on this page.`,
                          category,
                        };

                        return (
                          <div
                            key={actionKey}
                            onClick={() => isManager && onChangePermission(activeModuleKey, actionKey, !isGranted)}
                            className={`p-3 rounded-xl border flex flex-col justify-between transition-all cursor-pointer select-none group ${
                              isGranted
                                ? 'bg-emerald-50/40 border-emerald-300 ring-1 ring-emerald-500/20 shadow-2xs hover:bg-emerald-50/60'
                                : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/80'
                            }`}
                          >
                            <div className="space-y-1.5">
                              {/* Top: Toggle switch, Title & Granted/Revoked Status */}
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                  <label className="relative inline-flex items-center cursor-pointer shrink-0" onClick={(e) => e.stopPropagation()}>
                                    <input
                                      type="checkbox"
                                      checked={isGranted}
                                      onChange={(e) => isManager && onChangePermission(activeModuleKey, actionKey, e.target.checked)}
                                      disabled={!isManager}
                                      className="sr-only peer"
                                    />
                                    <div className="w-8 h-4.5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-emerald-600 peer-disabled:opacity-50"></div>
                                  </label>
                                  <span className={`text-xs font-black truncate ${isGranted ? 'text-emerald-950' : 'text-slate-800'}`}>
                                    {meta.label}
                                  </span>
                                </div>

                                <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold shrink-0 ${
                                  isGranted ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                                }`}>
                                  {isGranted ? 'Granted' : 'Revoked'}
                                </span>
                              </div>

                              {/* Action Identifier Code Badge */}
                              <div className="flex items-center gap-1.5">
                                <span className="px-1.5 py-0.2 rounded font-mono text-[9.5px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                  {actionKey}
                                </span>
                              </div>

                              {/* Description */}
                              <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                                {meta.description}
                              </p>
                            </div>

                            {/* Bottom 1-Click Action Button */}
                            {isManager && (
                              <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between">
                                <span className="text-[10px] font-semibold text-slate-400">
                                  Click to {isGranted ? 'revoke' : 'grant'}
                                </span>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded transition-colors ${
                                  isGranted
                                    ? 'bg-rose-50 text-rose-700 group-hover:bg-rose-100'
                                    : 'bg-emerald-50 text-emerald-700 group-hover:bg-emerald-100'
                                }`}>
                                  {isGranted ? 'Revoke' : 'Grant'}
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                  </div>
                ))
              )}
            </div>

            {/* Bottom Bar with Save / Summary */}
            {onSave && isManager && (
              <div className="shrink-0 px-4 sm:px-6 py-3 bg-white border-t border-slate-200 flex items-center justify-between gap-3">
                <div className="text-xs text-slate-500">
                  Editing permissions for role: <strong className="text-slate-800 uppercase">{role}</strong>
                  {user?.name && <span> (User: {user.name})</span>}
                </div>

                <button
                  type="button"
                  onClick={onSave}
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-xl transition-all shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 stroke-[2.5]" />
                      <span>Save All Changes</span>
                    </>
                  )}
                </button>
              </div>
            )}

          </div>

        </div>
      )}

    </div>
  );
};

export default ModulePermissionsPageView;
