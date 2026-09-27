// src/components/users/UserRoleModal.tsx
import React, { useMemo, useState } from 'react';
import { doc, updateDoc, writeBatch, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { User } from '../../types';
import { 
  normalizePermissions, 
  type RolePermissions, 
  type Permission, 
  BASE_PERMISSIONS_BY_MODULE, 
  MODULE_ACTION_BAR_CATALOG, 
  DEFAULT_PERMISSIONS 
} from '../../types/roles';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { SyncPermissionsModal } from './SyncPermissionsModal';
import { 
  Search, 
  CheckSquare, 
  X, 
  Check, 
  FileText, 
  Zap, 
  RefreshCw, 
  ShieldCheck, 
  TrendingUp, 
  Folder, 
  BarChart2, 
  Mail, 
  DollarSign, 
  Wrench, 
  Settings, 
  Car, 
  Activity, 
  Key, 
  AlertOctagon, 
  Receipt, 
  CreditCard, 
  Wallet, 
  Landmark, 
  FileCheck, 
  Share2, 
  Users as UsersIcon, 
  UserCheck, 
  Building2, 
  Package, 
  Clock, 
  MessageSquare, 
  Trash2, 
  User as UserIcon, 
  SlidersHorizontal,
  Upload,
  Download,
  Link,
  Shield,
  ShieldAlert,
  Layers,
  ChevronRight,
  Info
} from 'lucide-react';

export interface UserRoleModalProps { 
  user?: User | null; 
  initialRole?: User['role'];
  onClose: () => void; 
}

export type PermissionAction = keyof Permission;

export const PAGE_DEFINITIONS: Record<keyof RolePermissions, { pageName: string; routePath: string; description: string }> = {
  dashboard: { pageName: 'Dashboard', routePath: '/', description: 'Central analytics, fleet utilization KPIs, and executive summaries.' },
  vehicles: { pageName: 'Vehicles', routePath: '/vehicles', description: 'Fleet vehicle inventory, specifications, mileage logs, and vehicle owner records.' },
  utilisation: { pageName: 'Fleet Utilisation', routePath: '/utilisation', description: 'Fleet utilization metrics, active deployment tracking, and mileage statistics.' },
  maintenance: { pageName: 'Maintenance', routePath: '/maintenance', description: 'Work orders, vehicle servicing, mechanical repairs, MOT schedules, and inspections.' },
  rentals: { pageName: 'Rentals', routePath: '/rentals', description: 'Rental bookings, agreements, driver allocations, rate tariffs, and payment records.' },
  accidents: { pageName: 'Accidents', routePath: '/accidents', description: 'Accident incident reports, claim initiations, underwriter dossiers, and vehicle damage logs.' },
  claims: { pageName: 'Claims', routePath: '/claims', description: 'Insurance claims, legal handling, credit hire tracking, and progress management.' },
  highRisk: { pageName: 'High Risk Registry', routePath: '/high-risk', description: 'Cross-fleet high-risk driver verification, risk scoring, adverse flags, and partner search.' },
  vdFinance: { pageName: 'VD Finance', routePath: '/claims/vd-finance', description: 'Vehicle Damage financial accounts, ledger records, and recovery tracking.' },
  vdInvoice: { pageName: 'VD Invoice', routePath: '/claims/vd-invoice', description: 'Vehicle Damage billing, credit hire invoices, and communication dispatches.' },
  driverPay: { pageName: 'Driver Pay', routePath: '/skyline-caps/driver-pay', description: 'Driver earnings, period settlements, locked pay runs, and WhatsApp payslips.' },
  pettyCash: { pageName: 'AIE Petty Cash', routePath: '/finance/petty-cash', description: 'Petty cash receipts, cash floats, branch expenses, and reconciliation.' },
  aiePettyCash: { pageName: 'Skyline Petty Cash', routePath: '/skyline-caps/aie-petty-cash', description: 'Skyline caps petty cash registers, daily floats, and branch reconciliations.' },
  incomeExpense: { pageName: 'AIE Income & Expense', routePath: '/income-expense', description: 'Operational income, expense vouchers, recurring items, and category allocations.' },
  skylineIncomeExpense: { pageName: 'Skyline Income & Expense', routePath: '/skyline-caps/income-expense', description: 'Skyline business financial cash flow, recurring expense rules, and exports.' },
  finance: { pageName: 'Finance', routePath: '/finance', description: 'Core finance ledger, chart of accounts, business intelligence, and accounting vouchers.' },
  invoices: { pageName: 'Invoices', routePath: '/finance/invoices', description: 'Invoices register, billing schedules, payment receipts, and automated payment reminders.' },
  vatRecord: { pageName: 'VAT Records', routePath: '/finance/vat-records', description: 'VAT compliance, tax breakdowns, recurring filings, and HMRC tax reports.' },
  share: { pageName: 'Share System', routePath: '/share', description: 'Share System landing portal, public share link generation, social previews, and QR codes.' },
  customers: { pageName: 'Customers', routePath: '/customers', description: 'Customer directory, contact details, corporate clients, and group messaging.' },
  members: { pageName: 'Members Broadcast', routePath: '/members', description: 'Member accounts, broadcast dispatches, digital agreements, and driver profiles.' },
  users: { pageName: 'Users', routePath: '/users', description: 'System user accounts, role definitions, access matrix, and security permissions.' },
  company: { pageName: 'Company & Managers', routePath: '/company-managers', description: 'Corporate entity settings, branch details, and company manager allocations.' },
  products: { pageName: 'Products', routePath: '/products', description: 'Product catalog, parts inventory, category pricing, and item master.' },
  waiting: { pageName: 'Waiting List', routePath: '/waiting', description: 'Vehicle reservation waitlist, prospective customer queue, and reminder dispatches.' },
  whatsapp: { pageName: 'WhatsApp Communication', routePath: '/whatsapp-communication', description: 'Unified WhatsApp communications, chat history, and template dispatching.' },
  bulkEmail: { pageName: 'Bulk Email', routePath: '/bulk-email', description: 'Bulk email broadcasting, delivery logs, communication categories, and campaigns.' },
  todo: { pageName: 'To-Do', routePath: '/todo', description: 'Task manager, administrative reminders, group assignments, and operational checklists.' },
  trash: { pageName: 'Recycle Bin', routePath: '/trash', description: 'Soft-deleted entities, recovery tools, and permanent record purge controls.' },
  settings: { pageName: 'System Settings', routePath: '/settings', description: 'Global organization parameters, security preferences, and environment configurations.' },
  automation: { pageName: 'Automation Control', routePath: '/automation', description: 'Scheduled jobs, Monday Auto Email routines, dynamic tags, and scheduler controls.' },
  memberProfile: { pageName: 'Member Profile', routePath: '/members/profile', description: 'Portal user personal profile, account credentials, and contact details.' },
  memberRentals: { pageName: 'Member Rentals', routePath: '/members/rentals', description: 'Portal user active and past rental contracts and vehicle history.' },
  memberTransactions: { pageName: 'Member Transactions', routePath: '/members/transactions', description: 'Portal user financial transaction register and payment receipts.' },
  memberInvoices: { pageName: 'Member Invoices', routePath: '/members/invoices', description: 'Portal user invoices, billing balances, and statement downloads.' },
};

export const MODULE_ORDER: Array<keyof RolePermissions> = [
  'dashboard', 'vehicles', 'utilisation', 'maintenance', 'rentals', 'accidents', 'claims', 'highRisk',
  'vdFinance', 'vdInvoice', 'driverPay', 'pettyCash', 'aiePettyCash', 'incomeExpense',
  'skylineIncomeExpense', 'finance', 'invoices', 'vatRecord', 'share', 'customers',
  'members', 'users', 'company', 'products', 'waiting', 'whatsapp', 'bulkEmail',
  'todo', 'trash', 'settings', 'automation', 'memberProfile', 'memberRentals',
  'memberTransactions', 'memberInvoices'
];

const MEMBER_PORTAL_KEYS: Array<keyof RolePermissions> = ['memberProfile', 'memberRentals', 'memberTransactions', 'memberInvoices'];
const isMemberPortalKey = (k: keyof RolePermissions) => MEMBER_PORTAL_KEYS.includes(k);

export const FRIENDLY_LABELS: Record<string, string> = {
  view: 'View Page',
  create: 'Create Record',
  update: 'Edit / Update',
  delete: 'Delete Record',
  cards: 'Summary Cards',
  complete: 'Complete Action',
  completed: 'Completed Records',
  completion: 'Mark Completion',
  tableStatus: 'Table Status',
  singleDoc: 'Single Document PDF',
  signatureReq: 'Request Signatures',
  copyId: 'Copy Record ID',
  recordsPermission: 'Records Permissions',
  import: 'Import (CSV/Excel)',
  export: 'Export (PDF/Excel)',
  share: 'Share System',
  whatsapp: 'WhatsApp Dispatch',
  email: 'Email Dispatch',
  send: 'Dispatch / Send',
  reminder: 'Send Reminders',
  quickContact: 'Quick Contact',
  clearHistory: 'Clear History',
  recordPayment: 'Record Payment',
  viewPayment: 'View Payments',
  editPayment: 'Edit Payments',
  deletePayment: 'Delete Payments',
  accounts: 'Accounts Ledger',
  period: 'Pay Period',
  reoccurring: 'Recurring Rules',
  discount: 'Apply Discounts',
  showCompletedPaid: 'Show Paid / Completed',
  mileage: 'Mileage Tracker',
  mileageHistoryView: 'View Mileage History',
  mileageHistoryEdit: 'Edit Mileage History',
  mileageHistoryDelete: 'Delete Mileage History',
  owner: 'Vehicle Owner',
  daily: 'Daily Rentals',
  weekly: 'Weekly Rentals',
  claim: 'Claim Rentals',
  availableVehicles: 'Available Vehicles',
  sale: 'Process Sales',
  syncStatus: 'Sync Status',
  lock: 'Lock Records',
  unlock: 'Unlock Records',
  mondayAutoEmail: 'Monday Auto Email',
  bulkEmailScheduler: 'Bulk Email Scheduler',
  scheduler: 'Scheduler Preferences',
  toggleGlobal: 'Toggle Global Automation',
  template: 'Use Templates',
  templateCreate: 'Create Template',
  templateEdit: 'Edit Template',
  templateDelete: 'Delete Template (Protected)',
  reminderTemplate: 'Reminder Templates',
  messageTemplate: 'Message Templates',
  driverRisk: 'Driver Risk Analysis',
  renewalAnalysis: 'Renewal Dossier',
  groupMessaging: 'Group Messaging',
  groups: 'Manage Groups',
  departments: 'Manage Departments',
  assign: 'Bulk Assign Records',
  note: 'Internal Notes',
  state: 'Change State',
  progressview: 'View Progress Tracker',
  progressedit: 'Edit Progress Tracker',
  categories: 'Manage Categories',
  restore: 'Restore Records',
  deletePermanently: 'Delete Permanently',
  targetFinance: 'Target Finance',
  targetRental: 'Target Rental',
  targetMaintenance: 'Target Maintenance',
  targetInvoice: 'Target Invoice',
  targetClaim: 'Target Claim',
  targetCustom: 'Target Custom',
};

export const ACTION_DESCRIPTIONS: Record<string, string> = {
  view: 'Allows navigating to and viewing this page and its data table.',
  create: 'Allows creating new entries and saving new records.',
  update: 'Allows modifying existing records and saving changes.',
  delete: 'Allows deleting or archiving records from this module.',
  cards: 'Displays top KPI statistics, metrics, and summary counters.',
  complete: 'Allows marking items, repairs, or agreements as completed.',
  completion: 'Allows transitioning active rentals or maintenance jobs to completed.',
  tableStatus: 'Allows updating or filtering records by custom workflow statuses.',
  singleDoc: 'Allows generating, printing, and downloading individual PDF contracts or invoices.',
  signatureReq: 'Enables requesting digital electronic signatures on documents.',
  copyId: 'Allows one-click copying of unique record identifier strings.',
  recordsPermission: 'Restricts or opens confidential record security classifications.',
  import: 'Allows uploading spreadsheets or CSV files to bulk-import data.',
  export: 'Allows downloading tables as CSV, Excel, or PDF documents.',
  share: 'Enables generating public share links, social previews, and QR codes.',
  whatsapp: 'Allows dispatching direct WhatsApp notifications and documents.',
  email: 'Allows dispatching emails and communication notices directly.',
  send: 'Enables the main send and dispatch actions for communication channels.',
  reminder: 'Allows triggering payment, servicing, or return reminders.',
  quickContact: 'Enables one-click phone, email, or WhatsApp quick-contact buttons.',
  clearHistory: 'Allows clearing or archiving dispatched communication history logs.',
  recordPayment: 'Allows logging received or sent payment transactions.',
  viewPayment: 'Allows inspecting payment logs, receipts, and allocation history.',
  editPayment: 'Allows amending payment amounts, methods, or dates.',
  deletePayment: 'Allows voiding or deleting recorded payment entries.',
  accounts: 'Enables managing the chart of accounts, bank transfers, and ledgers.',
  period: 'Allows filtering and generating settlements by specific pay periods.',
  reoccurring: 'Allows creating and managing automated recurring billing schedules.',
  discount: 'Allows entering promotional adjustments and line-item discounts.',
  showCompletedPaid: 'Allows filtering or viewing archived paid/settled items.',
  mileage: 'Enables recording and updating odometer mileage readings.',
  mileageHistoryView: 'Allows reviewing complete audit trails of vehicle odometer readings.',
  mileageHistoryEdit: 'Allows correcting previous mileage log entries.',
  mileageHistoryDelete: 'Allows removing invalid mileage audit entries.',
  owner: 'Allows configuring owner allocations and private vehicle owner records.',
  daily: 'Allows managing short-term daily rental tariffs and bookings.',
  weekly: 'Allows managing weekly rental rates and long-term allocations.',
  claim: 'Allows creating replacement credit-hire rentals linked to claims.',
  availableVehicles: 'Opens the vehicle availability matrix to locate unassigned cars.',
  sale: 'Allows marking fleet vehicles as sold and processing sale proceeds.',
  syncStatus: 'Enables manual resynchronization of status tags across linked files.',
  lock: 'Allows locking financial pay runs to prevent any subsequent tampering.',
  unlock: 'Allows managers to unlock previously finalized pay periods.',
  mondayAutoEmail: 'Enables automatic Monday morning email dispatches and reminders.',
  bulkEmailScheduler: 'Allows configuring scheduled bulk email campaigns and delivery windows.',
  scheduler: 'Allows adjusting automated cron timers, day, and time triggers.',
  toggleGlobal: 'Allows enabling or pausing global automated background workflows.',
  template: 'Allows selecting and populating predefined message templates.',
  templateCreate: 'Allows designing and saving new reusable communication templates.',
  templateEdit: 'Allows modifying existing templates, subject lines, and tags.',
  templateDelete: 'Protected action permitting the permanent deletion of templates.',
  reminderTemplate: 'Allows managing specialized automated reminder template configurations.',
  messageTemplate: 'Allows managing SMS and WhatsApp formatted message templates.',
  driverRisk: 'Enables underwriting driver risk analysis scoring and dossiers.',
  renewalAnalysis: 'Enables generating insurance renewal analysis portfolios.',
  groupMessaging: 'Allows sending broadcast announcements to multiple recipients.',
  groups: 'Allows managing corporate groups and grouping records.',
  departments: 'Allows allocating records to corporate operational departments.',
  assign: 'Allows bulk reassigning records to handlers, teams, or managers.',
  note: 'Allows viewing, adding, and managing confidential internal record notes.',
  state: 'Allows transitioning claims or transactions through workflow lifecycle states.',
  progressview: 'Allows viewing the visual progress roadmap of insurance proceedings.',
  progressedit: 'Allows advancing or updating milestone stages in the progress roadmap.',
  categories: 'Allows creating and managing categorization taxonomies.',
  restore: 'Allows restoring deleted items back to active state.',
  deletePermanently: 'Permits permanently and irretrievably destroying archived items.',
};

export const getModuleIcon = (modKey: keyof RolePermissions, className: string = 'w-4 h-4') => {
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

export const UserRoleModal: React.FC<UserRoleModalProps> = ({ user, initialRole, onClose }) => {
  const { user: currentUser } = useAuth();
  const isManager = currentUser?.role === 'manager' || currentUser?.role === 'admin';

  const [loading, setLoading] = useState(false);
  const [roleSaving, setRoleSaving] = useState(false);
  const [role, setRole] = useState<User['role']>(user?.role || initialRole || 'admin');
  
  // Active selected module in the left sidebar
  const [selectedModule, setSelectedModule] = useState<keyof RolePermissions>('vehicles');
  
  // Global search input for filtering/highlighting
  const [searchQuery, setSearchQuery] = useState('');

  // Sync Permissions modal state
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);

  // Safe initial permissions
  const safeInitial: RolePermissions = useMemo(() => {
    const targetRole = user?.role || initialRole || 'admin';
    return normalizePermissions(targetRole, user?.permissions);
  }, [user?.permissions, user?.role, initialRole]);

  const [customPermissions, setCustomPermissions] = useState<RolePermissions>(safeInitial);

  // Overall statistics
  const stats = useMemo(() => {
    let totalGranted = 0;
    let totalPossible = 0;
    let totalPages = 0;
    let activePages = 0;

    Object.entries(customPermissions || {}).forEach(([modKey, modPerms]) => {
      if (!modPerms) return;
      if (role === 'member' && !isMemberPortalKey(modKey as keyof RolePermissions)) return;
      if (role !== 'member' && isMemberPortalKey(modKey as keyof RolePermissions)) return;

      totalPages++;
      const actions = Object.entries(modPerms).filter(([actKey]) => !(actKey === 'share' && modKey !== 'users'));
      let pageActiveCount = 0;

      actions.forEach(([, val]) => {
        totalPossible++;
        if (val) {
          totalGranted++;
          pageActiveCount++;
        }
      });

      if (pageActiveCount > 0) activePages++;
    });

    const percent = totalPossible > 0 ? Math.round((totalGranted / totalPossible) * 100) : 0;
    return { totalGranted, totalPossible, totalPages, activePages, percent };
  }, [customPermissions, role]);

  // List of all applicable system page modules
  const allModules = useMemo(() => {
    return MODULE_ORDER.filter((key) => {
      if (role === 'member') return isMemberPortalKey(key);
      return !isMemberPortalKey(key);
    });
  }, [role]);

  // Toggle single action on a module
  const toggleAction = (modKey: keyof RolePermissions, action: PermissionAction) => {
    if (!isManager) {
      toast.error('Only administrators and managers can alter permission states');
      return;
    }
    setCustomPermissions((prev) => {
      const currentVal = Boolean(prev[modKey]?.[action]);
      const newVal = !currentVal;
      const updatedModule = { ...prev[modKey], [action]: newVal };

      // Keep bulkEmailScheduler and mondayAutoEmail synchronized for rentals
      if (modKey === 'rentals') {
        if (action === 'bulkEmailScheduler') updatedModule.mondayAutoEmail = newVal;
        if (action === 'mondayAutoEmail') updatedModule.bulkEmailScheduler = newVal;
      }

      return { ...prev, [modKey]: updatedModule };
    });
  };

  // Quick action: Select All permissions for current module
  const handleSelectAllModule = (modKey: keyof RolePermissions) => {
    if (!isManager) return;
    setCustomPermissions((prev) => {
      const current = prev[modKey] || {};
      const updated: Record<string, boolean> = {};
      Object.keys(current).forEach((k) => {
        updated[k] = true;
      });
      return { ...prev, [modKey]: updated as Permission };
    });
    const pageName = PAGE_DEFINITIONS[modKey]?.pageName || String(modKey);
    toast.success(`Enabled all permissions for ${pageName}`);
  };

  // Quick action: Read Only for current module
  const handleReadOnlyModule = (modKey: keyof RolePermissions) => {
    if (!isManager) return;
    setCustomPermissions((prev) => {
      const current = prev[modKey] || {};
      const updated: Record<string, boolean> = {};
      Object.keys(current).forEach((k) => {
        // Read only allows view, summary cards, and singleDoc (if defined)
        if (k === 'view' || k === 'cards' || k === 'singleDoc') {
          updated[k] = true;
        } else {
          updated[k] = false;
        }
      });
      return { ...prev, [modKey]: updated as Permission };
    });
    const pageName = PAGE_DEFINITIONS[modKey]?.pageName || String(modKey);
    toast.success(`Set ${pageName} to Read-Only access`);
  };

  // Quick action: Clear All permissions for current module
  const handleClearAllModule = (modKey: keyof RolePermissions) => {
    if (!isManager) return;
    setCustomPermissions((prev) => {
      const current = prev[modKey] || {};
      const updated: Record<string, boolean> = {};
      Object.keys(current).forEach((k) => {
        updated[k] = false;
      });
      return { ...prev, [modKey]: updated as Permission };
    });
    const pageName = PAGE_DEFINITIONS[modKey]?.pageName || String(modKey);
    toast.success(`Cleared all permissions for ${pageName}`);
  };

  // Reset to default role template
  const handleRoleTemplateChange = (newRole: User['role']) => {
    setRole(newRole);
    setCustomPermissions(normalizePermissions(newRole));
    toast.success(`Switched role template to: ${newRole.toUpperCase()}`);
  };

  // 1-Click assign to role template in Firestore
  const handleAssignToRole = async () => {
    if (!isManager) return toast.error('Only managers/admins can modify role templates');
    setRoleSaving(true);

    try {
      const batch = writeBatch(db);
      let updatedUserCount = 0;

      // 1. Save role template document in Firestore
      const roleDocRef = doc(db, 'roleTemplates', role);
      batch.set(roleDocRef, {
        role,
        permissions: customPermissions,
        updatedAt: new Date(),
        updatedBy: currentUser?.email || 'admin',
      }, { merge: true });

      // 2. Batch update all users assigned this role
      const usersQuery = query(collection(db, 'users'), where('role', '==', role));
      const usersSnap = await getDocs(usersQuery);
      usersSnap.docs.forEach((uDoc) => {
        batch.update(uDoc.ref, {
          permissions: customPermissions,
          updatedAt: new Date(),
        });
        updatedUserCount++;
      });

      // 3. If editing a specific user doc, ensure it is updated
      if (user?.id) {
        const userRef = doc(db, 'users', user.id);
        batch.update(userRef, {
          role,
          permissions: customPermissions,
          updatedAt: new Date(),
        });
        if (updatedUserCount === 0) updatedUserCount = 1;
      }

      await batch.commit();

      toast.success(
        `Role "${role.toUpperCase()}" assigned & synced to ${updatedUserCount} user account(s) in 1 click!`,
        { duration: 5000 }
      );

      if (user?.id) {
        onClose();
      }
    } catch (error) {
      console.error('Failed to assign permissions to role:', error);
      toast.error('Failed to assign permissions: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setRoleSaving(false);
    }
  };

  // Primary save handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isManager) return toast.error('Only managers/admins can modify user permissions');

    if (!user?.id) {
      await handleAssignToRole();
      return;
    }

    setLoading(true);
    try {
      await updateDoc(doc(db, 'users', user.id), {
        role,
        permissions: customPermissions,
        updatedAt: new Date(),
      });
      toast.success('User permissions matrix updated successfully');
      onClose();
    } catch (error) {
      console.error('Failed to update permissions:', error);
      toast.error('Failed to update permissions');
    } finally {
      setLoading(false);
    }
  };

  // Data for the active selected module
  const activeModuleDef = PAGE_DEFINITIONS[selectedModule] || {
    pageName: String(selectedModule),
    routePath: `/${selectedModule}`,
    description: 'System page access permissions.',
  };

  const activeModulePerms = (customPermissions[selectedModule] || {}) as Record<string, boolean>;
  // Remove the "Share System" action button/toggle from every single page except the User Management page ('users')
  const activeModuleEntries = Object.entries(activeModulePerms).filter(([k]) => {
    if (k === 'share' && selectedModule !== 'users') {
      return false;
    }
    return true;
  });
  const activeModuleGrantedCount = activeModuleEntries.filter(([, v]) => v).length;
  const activeModuleTotalCount = activeModuleEntries.length;

  // Categorize actions for the selected module into 4 structured sections:
  // a. Core CRUD
  const CORE_ACTION_KEYS = ['view', 'create', 'update', 'delete', 'cards', 'complete', 'completed', 'completion', 'tableStatus'];
  // b. Document Permissions
  const DOC_ACTION_KEYS = ['singleDoc', 'signatureReq', 'copyId', 'recordsPermission'];
  // c. Data Transport & Sharing
  const TRANSPORT_ACTION_KEYS = ['import', 'export', 'share', 'whatsapp', 'email', 'send', 'reminder', 'quickContact', 'clearHistory'];

  const coreActions = activeModuleEntries.filter(([k]) => CORE_ACTION_KEYS.includes(k));
  const docActions = activeModuleEntries.filter(([k]) => DOC_ACTION_KEYS.includes(k));
  const transportActions = activeModuleEntries.filter(([k]) => TRANSPORT_ACTION_KEYS.includes(k));
  const customPageActions = activeModuleEntries.filter(([k]) => 
    !CORE_ACTION_KEYS.includes(k) && 
    !DOC_ACTION_KEYS.includes(k) && 
    !TRANSPORT_ACTION_KEYS.includes(k)
  );

  const normalizedQuery = searchQuery.trim().toLowerCase();

  return (
    <div className="flex flex-col h-full bg-[#F8FAFC] text-slate-800 select-none overflow-hidden font-sans">
      
      {/* ════════════════════════════════════════════════════════════════════════════════
          1. TOP GLOBAL HEADER (Role Selector, Search, Stats, User Badge, Close)
         ════════════════════════════════════════════════════════════════════════════════ */}
      <header className="shrink-0 bg-white border-b border-slate-200/90 px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3 shadow-2xs z-10">
        
        {/* Left: Title & User Profile Summary */}
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-700 flex items-center justify-center text-white shadow-xs shrink-0">
            <ShieldCheck className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-extrabold text-slate-900 tracking-tight truncate">
                Access Permissions & Role Matrix
              </h2>
              {user ? (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 uppercase tracking-wide">
                  Editing User
                </span>
              ) : (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 uppercase tracking-wide">
                  Role Template
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 font-medium truncate">
              {user ? (
                <span>
                  Target: <strong className="text-slate-800">{user.name}</strong> ({user.email})
                </span>
              ) : (
                <span>Configure organizational permission templates across all 30 system modules</span>
              )}
            </p>
          </div>
        </div>

        {/* Center / Right: Role Template Selector, Global Search, Stats & Actions */}
        <div className="flex items-center flex-wrap gap-2.5 ml-auto">
          
          {/* Global Search Input */}
          <div className="relative w-48 sm:w-60">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search permissions..."
              className="w-full pl-9 pr-7 py-1.5 text-xs bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Role Template Selector */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Role:</span>
            <select
              value={role}
              disabled={!isManager}
              onChange={(e) => handleRoleTemplateChange(e.target.value as User['role'])}
              className="text-xs font-bold text-indigo-700 bg-transparent focus:outline-none cursor-pointer uppercase"
            >
              <option value="admin">Admin</option>
              <option value="manager">Manager</option>
              <option value="finance">Finance</option>
              <option value="claims">Claims</option>
              <option value="company">Company</option>
              <option value="member">Member</option>
            </select>
          </div>

          {/* Live Permission Counters */}
          <div className="hidden lg:flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1">
            <div className="text-[11px] font-medium text-slate-600">
              Active: <strong className="font-bold text-indigo-600 font-mono">{stats.totalGranted}</strong> / {stats.totalPossible}
            </div>
            <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
            <div className="text-[11px] font-medium text-slate-600">
              Pages: <strong className="font-bold text-emerald-600 font-mono">{stats.activePages}</strong> / {stats.totalPages}
            </div>
          </div>

          {/* Audit / Cross-Check Modal Trigger */}
          <button
            type="button"
            onClick={() => setIsSyncModalOpen(true)}
            className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-2xs cursor-pointer"
            title="Scan for missing schema definitions"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
            <span>Audit</span>
          </button>

          {/* Close Modal Button */}
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer ml-1"
            title="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* ════════════════════════════════════════════════════════════════════════════════
          2. MAIN STAGE: FULL-HEIGHT SINGLE-COLUMN SIDEBAR + EXPANDED MATRIX PANEL
         ════════════════════════════════════════════════════════════════════════════════ */}
      <div className="flex-1 min-h-0 flex overflow-hidden">
        
        {/* ── LEFT PANEL: SINGLE-COLUMN ALL MODULES SIDEBAR (Width: 22% - 25%) ── */}
        <aside className="w-64 sm:w-72 lg:w-80 shrink-0 bg-white border-r border-slate-200 flex flex-col h-full z-0">
          
          {/* Sidebar Header: Clean title, count badge, NO top search/filter input */}
          <div className="shrink-0 px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-600" />
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                ALL MODULES ({allModules.length})
              </span>
            </div>
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100 font-mono">
              {stats.activePages}/{allModules.length} Active
            </span>
          </div>

          {/* Single-Column Module List: Compact rows with Page Icon, Name, Active Count Badge */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100/80">
            {allModules.map((modKey) => {
              const def = PAGE_DEFINITIONS[modKey] || { pageName: String(modKey), routePath: '' };
              const isSelected = selectedModule === modKey;
              const perms = (customPermissions[modKey] || {}) as Record<string, boolean>;
              const validEntries = Object.entries(perms).filter(([k]) => !(k === 'share' && modKey !== 'users'));
              const granted = validEntries.filter(([, v]) => v).length;
              const total = validEntries.length;

              // Check if query matches this module or its actions
              const matchesSearch = normalizedQuery
                ? def.pageName.toLowerCase().includes(normalizedQuery) ||
                  String(modKey).toLowerCase().includes(normalizedQuery) ||
                  validEntries.some(([k]) => {
                    const label = FRIENDLY_LABELS[k] || k;
                    return k.toLowerCase().includes(normalizedQuery) || label.toLowerCase().includes(normalizedQuery);
                  })
                : true;

              if (!matchesSearch) return null;

              return (
                <button
                  key={String(modKey)}
                  type="button"
                  onClick={() => setSelectedModule(modKey)}
                  className={`w-full text-left px-3.5 py-2.5 flex items-center justify-between gap-2.5 transition-all cursor-pointer group ${
                    isSelected
                      ? 'bg-indigo-50/90 text-indigo-900 border-l-4 border-l-[#4F46E5] shadow-2xs font-bold'
                      : 'text-slate-700 hover:bg-slate-50/90 hover:text-slate-900 border-l-4 border-l-transparent'
                  }`}
                >
                  {/* Left: Icon & Module Name */}
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className={`shrink-0 transition-transform ${isSelected ? 'scale-110' : 'group-hover:scale-105'}`}>
                      {getModuleIcon(modKey, 'w-4 h-4')}
                    </span>
                    <span className={`text-xs truncate ${isSelected ? 'font-black text-indigo-900' : 'font-semibold text-slate-800'}`}>
                      {def.pageName}
                    </span>
                  </div>

                  {/* Right: Active Count Badge */}
                  <div className="flex items-center gap-1 shrink-0">
                    <span
                      className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md border ${
                        isSelected
                          ? 'bg-white text-indigo-700 border-indigo-200'
                          : granted > 0
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-slate-100 text-slate-400 border-slate-200'
                      }`}
                    >
                      {granted}/{total}
                    </span>
                    <ChevronRight className={`w-3.5 h-3.5 transition-transform ${isSelected ? 'text-indigo-600 translate-x-0.5' : 'text-slate-300 group-hover:text-slate-400'}`} />
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        {/* ── RIGHT PANEL: EXPANDED ACTION MATRIX & PERMISSION CONTROLS (Width: 75% - 78%) ── */}
        <main className="flex-1 min-h-0 overflow-y-auto bg-[#F8FAFC] p-4 sm:p-6 space-y-4">
          
          {/* Module Header Bar with Quick Action Controls */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            
            {/* Title & Route Path */}
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0">
                {getModuleIcon(selectedModule, 'w-5 h-5')}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-extrabold text-slate-900 tracking-tight truncate">
                    {activeModuleDef.pageName} Module
                  </h3>
                  <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                    {activeModuleDef.routePath}
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium mt-0.5 line-clamp-1">
                  {activeModuleDef.description}
                </p>
              </div>
            </div>

            {/* Quick Action Buttons: [Select All] | [Read Only] | [Clear All] */}
            {isManager && (
              <div className="flex items-center gap-1.5 shrink-0 self-end md:self-center">
                <button
                  type="button"
                  onClick={() => handleSelectAllModule(selectedModule)}
                  className="px-3 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors cursor-pointer shadow-2xs"
                  title="Enable all permissions for this module"
                >
                  Select All
                </button>
                <button
                  type="button"
                  onClick={() => handleReadOnlyModule(selectedModule)}
                  className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors cursor-pointer shadow-2xs"
                  title="Set module to view-only access"
                >
                  Read Only
                </button>
                <button
                  type="button"
                  onClick={() => handleClearAllModule(selectedModule)}
                  className="px-3 py-1.5 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors cursor-pointer shadow-2xs"
                  title="Clear all permissions for this module"
                >
                  Clear All
                </button>
              </div>
            )}
          </div>

          {/* ════════════════════════════════════════════════════════════════════════════════
              SECTION A: ACTION BAR & CORE CRUD
             ════════════════════════════════════════════════════════════════════════════════ */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-indigo-600" />
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-900">
                  Action Bar & Core CRUD
                </h4>
              </div>
              <span className="text-[11px] text-slate-400 font-medium">
                Standard records creation, modification, and deletion
              </span>
            </div>

            {coreActions.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5">
                {coreActions.map(([actionKey, isEnabled]) => {
                  const label = FRIENDLY_LABELS[actionKey] || actionKey;
                  const desc = ACTION_DESCRIPTIONS[actionKey] || '';
                  const isHighlighted = normalizedQuery && (
                    label.toLowerCase().includes(normalizedQuery) ||
                    actionKey.toLowerCase().includes(normalizedQuery)
                  );

                  return (
                    <div
                      key={actionKey}
                      onClick={() => toggleAction(selectedModule, actionKey as PermissionAction)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start justify-between gap-2.5 select-none ${
                        isEnabled
                          ? 'bg-indigo-50/70 border-indigo-200 ring-1 ring-indigo-400/30'
                          : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/60'
                      } ${isHighlighted ? 'ring-2 ring-amber-400' : ''}`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-xs font-bold ${isEnabled ? 'text-indigo-950' : 'text-slate-800'}`}>
                            {label}
                          </span>
                        </div>
                        {desc && (
                          <p className="text-[11px] text-slate-500 font-medium mt-0.5 line-clamp-2 leading-tight">
                            {desc}
                          </p>
                        )}
                      </div>

                      {/* Custom Toggle Switch */}
                      <div className="shrink-0 pt-0.5">
                        <div
                          className={`w-9 h-5 rounded-full transition-colors relative p-0.5 ${
                            isEnabled ? 'bg-indigo-600' : 'bg-slate-200'
                          }`}
                        >
                          <div
                            className={`w-4 h-4 rounded-full bg-white transition-transform flex items-center justify-center ${
                              isEnabled ? 'translate-x-4 shadow-xs' : 'translate-x-0'
                            }`}
                          >
                            {isEnabled && <Check className="w-2.5 h-2.5 text-indigo-600 stroke-[3]" />}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic py-2">
                No core CRUD actions configured for this module.
              </p>
            )}
          </div>

          {/* ════════════════════════════════════════════════════════════════════════════════
              SECTION B: DOCUMENT PERMISSIONS (DOCS)
             ════════════════════════════════════════════════════════════════════════════════ */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-600" />
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-900">
                  Document Permissions (Docs)
                </h4>
              </div>
              <span className="text-[11px] text-slate-400 font-medium">
                Single PDF generation, digital signature requests, and identifiers
              </span>
            </div>

            {docActions.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5">
                {docActions.map(([actionKey, isEnabled]) => {
                  const label = FRIENDLY_LABELS[actionKey] || actionKey;
                  const desc = ACTION_DESCRIPTIONS[actionKey] || '';
                  const isHighlighted = normalizedQuery && (
                    label.toLowerCase().includes(normalizedQuery) ||
                    actionKey.toLowerCase().includes(normalizedQuery)
                  );

                  return (
                    <div
                      key={actionKey}
                      onClick={() => toggleAction(selectedModule, actionKey as PermissionAction)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start justify-between gap-2.5 select-none ${
                        isEnabled
                          ? 'bg-emerald-50/70 border-emerald-200 ring-1 ring-emerald-400/30'
                          : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/60'
                      } ${isHighlighted ? 'ring-2 ring-amber-400' : ''}`}
                    >
                      <div className="min-w-0">
                        <span className={`text-xs font-bold ${isEnabled ? 'text-emerald-950' : 'text-slate-800'}`}>
                          {label}
                        </span>
                        {desc && (
                          <p className="text-[11px] text-slate-500 font-medium mt-0.5 line-clamp-2 leading-tight">
                            {desc}
                          </p>
                        )}
                      </div>

                      {/* Custom Toggle Switch */}
                      <div className="shrink-0 pt-0.5">
                        <div
                          className={`w-9 h-5 rounded-full transition-colors relative p-0.5 ${
                            isEnabled ? 'bg-emerald-600' : 'bg-slate-200'
                          }`}
                        >
                          <div
                            className={`w-4 h-4 rounded-full bg-white transition-transform flex items-center justify-center ${
                              isEnabled ? 'translate-x-4 shadow-xs' : 'translate-x-0'
                            }`}
                          >
                            {isEnabled && <Check className="w-2.5 h-2.5 text-emerald-600 stroke-[3]" />}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic py-2">
                No specialized document permissions are assigned to this page.
              </p>
            )}
          </div>

          {/* ════════════════════════════════════════════════════════════════════════════════
              SECTION C: DATA TRANSPORT & SHARING
             ════════════════════════════════════════════════════════════════════════════════ */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Share2 className="w-4 h-4 text-blue-600" />
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-900">
                  Data Transport & Sharing
                </h4>
              </div>
              <span className="text-[11px] text-slate-400 font-medium">
                Import CSV, Export PDF/Excel, Share Link, and Communications
              </span>
            </div>

            {transportActions.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5">
                {transportActions.map(([actionKey, isEnabled]) => {
                  const label = FRIENDLY_LABELS[actionKey] || actionKey;
                  const desc = ACTION_DESCRIPTIONS[actionKey] || '';
                  const isHighlighted = normalizedQuery && (
                    label.toLowerCase().includes(normalizedQuery) ||
                    actionKey.toLowerCase().includes(normalizedQuery)
                  );

                  return (
                    <div
                      key={actionKey}
                      onClick={() => toggleAction(selectedModule, actionKey as PermissionAction)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start justify-between gap-2.5 select-none ${
                        isEnabled
                          ? 'bg-blue-50/70 border-blue-200 ring-1 ring-blue-400/30'
                          : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/60'
                      } ${isHighlighted ? 'ring-2 ring-amber-400' : ''}`}
                    >
                      <div className="min-w-0">
                        <span className={`text-xs font-bold ${isEnabled ? 'text-blue-950' : 'text-slate-800'}`}>
                          {label}
                        </span>
                        {desc && (
                          <p className="text-[11px] text-slate-500 font-medium mt-0.5 line-clamp-2 leading-tight">
                            {desc}
                          </p>
                        )}
                      </div>

                      {/* Custom Toggle Switch */}
                      <div className="shrink-0 pt-0.5">
                        <div
                          className={`w-9 h-5 rounded-full transition-colors relative p-0.5 ${
                            isEnabled ? 'bg-blue-600' : 'bg-slate-200'
                          }`}
                        >
                          <div
                            className={`w-4 h-4 rounded-full bg-white transition-transform flex items-center justify-center ${
                              isEnabled ? 'translate-x-4 shadow-xs' : 'translate-x-0'
                            }`}
                          >
                            {isEnabled && <Check className="w-2.5 h-2.5 text-blue-600 stroke-[3]" />}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic py-2">
                No data transport or communications options are configured for this module.
              </p>
            )}
          </div>

          {/* ════════════════════════════════════════════════════════════════════════════════
              SECTION D: PAGE-SPECIFIC ACTIONS
             ════════════════════════════════════════════════════════════════════════════════ */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-500" />
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-900">
                  Page-Specific Actions
                </h4>
              </div>
              <span className="text-[11px] text-slate-400 font-medium">
                Tailored workflows, financial controls, and domain-specific operations
              </span>
            </div>

            {customPageActions.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5">
                {customPageActions.map(([actionKey, isEnabled]) => {
                  const label = FRIENDLY_LABELS[actionKey] || actionKey;
                  const desc = ACTION_DESCRIPTIONS[actionKey] || '';
                  const isHighlighted = normalizedQuery && (
                    label.toLowerCase().includes(normalizedQuery) ||
                    actionKey.toLowerCase().includes(normalizedQuery)
                  );

                  return (
                    <div
                      key={actionKey}
                      onClick={() => toggleAction(selectedModule, actionKey as PermissionAction)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start justify-between gap-2.5 select-none ${
                        isEnabled
                          ? 'bg-amber-50/70 border-amber-200 ring-1 ring-amber-400/30'
                          : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/60'
                      } ${isHighlighted ? 'ring-2 ring-amber-400' : ''}`}
                    >
                      <div className="min-w-0">
                        <span className={`text-xs font-bold ${isEnabled ? 'text-amber-950' : 'text-slate-800'}`}>
                          {label}
                        </span>
                        {desc && (
                          <p className="text-[11px] text-slate-500 font-medium mt-0.5 line-clamp-2 leading-tight">
                            {desc}
                          </p>
                        )}
                      </div>

                      {/* Custom Toggle Switch */}
                      <div className="shrink-0 pt-0.5">
                        <div
                          className={`w-9 h-5 rounded-full transition-colors relative p-0.5 ${
                            isEnabled ? 'bg-amber-500' : 'bg-slate-200'
                          }`}
                        >
                          <div
                            className={`w-4 h-4 rounded-full bg-white transition-transform flex items-center justify-center ${
                              isEnabled ? 'translate-x-4 shadow-xs' : 'translate-x-0'
                            }`}
                          >
                            {isEnabled && <Check className="w-2.5 h-2.5 text-amber-600 stroke-[3]" />}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-4 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <Info className="w-5 h-5 text-slate-400 mx-auto mb-1.5" />
                <p className="text-xs text-slate-600 font-medium">
                  All available actions for {activeModuleDef.pageName} are configured in the Core, Document, and Data Transport sections above.
                </p>
              </div>
            )}
          </div>

        </main>
      </div>

      {/* ════════════════════════════════════════════════════════════════════════════════
          3. STICKY BOTTOM FOOTER (Summary Text, Cancel, 1-Click Role, Save)
         ════════════════════════════════════════════════════════════════════════════════ */}
      <footer className="shrink-0 bg-white border-t border-slate-200 px-4 sm:px-6 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md z-10">
        
        {/* Left: Dynamic Summary Text */}
        <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
          <Info className="w-4 h-4 text-slate-400 shrink-0" />
          <span>
            Permissions are grouped by application page and sync live to the user account upon saving.
          </span>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={loading || roleSaving}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          
          {isManager && (
            <>
              {/* 1-Click Assign to Role Template */}
              <button
                type="button"
                onClick={handleAssignToRole}
                disabled={loading || roleSaving}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-xl transition-colors shadow-xs cursor-pointer disabled:opacity-50"
                title={`Assign these permissions directly to role: ${role.toUpperCase()}`}
              >
                {roleSaving ? (
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Zap className="w-3.5 h-3.5 fill-current text-amber-300" />
                )}
                <span>Assign to Role ({role.toUpperCase()}) in 1-Click</span>
              </button>

              {/* Primary Save Button */}
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading || roleSaving}
                className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-xl transition-colors shadow-xs cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 stroke-[2.5]" />
                    <span>Save Permissions Matrix</span>
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </footer>

      {/* SYNC PERMISSIONS CROSS-CHECK & AUDIT MODAL */}
      <SyncPermissionsModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        activeRole={role}
        user={user}
        customPermissions={customPermissions}
        onPermissionsSynced={(updated) => {
          setCustomPermissions(updated);
        }}
      />
    </div>
  );
};

export default UserRoleModal;
