// src/components/users/UserRoleModal.tsx
import React, { useMemo, useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { User } from '../../types';
import { DEFAULT_PERMISSIONS, normalizePermissions, type RolePermissions, type Permission } from '../../types/roles';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { 
  ShieldCheck, 
  Search, 
  ChevronDown, 
  ChevronUp, 
  CheckCircle2, 
  XCircle, 
  CheckSquare, 
  Square,
  MessageCircle,
  Mail,
  Send,
  Bell,
  Lock,
  ShieldAlert,
  Calendar,
  Sparkles,
  FileEdit,
  Trash2,
  PlusCircle,
  AlertTriangle
} from 'lucide-react';

interface UserRoleModalProps { 
  user: User; 
  onClose: () => void; 
}

type PermissionAction = keyof Permission;

const FRIENDLY_LABELS: Partial<Record<PermissionAction, string>> = {
  view: 'View', create: 'Create', update: 'Update', delete: 'Delete', recordPayment: 'Record Payment', cards: 'Summary Cards', share: 'Share',
  mileage: 'Mileage', daily: 'Daily Rentals', weekly: 'Weekly Rentals', claim: 'Claim Rentals', export: 'Export', import: 'Import', send: 'Dispatch / Send Communications',
  owner: 'Owner Data', lock: 'Lock Records', unlock: 'Unlock Records', syncStatus: 'Sync Status', sale: 'Process Sales', copyId: 'Copy IDs', singleDoc: 'Single Document Gen',
  tableStatus: 'Edit Status in Table', complete: 'Complete Action', completed: 'View Completed Records', categories: 'Manage Categories', groups: 'Manage Groups',
  departments: 'Departments', recordsPermission: 'Records Permission',
  availableVehicles: 'View Available Vehicles', completion: 'Log Completion', discount: 'Apply Discounts', note: 'Manage Notes', state: 'Change State',
  period: 'Manage Period', reoccurring: 'Manage Recurring', accounts: 'Manage Accounts', assign: 'Assign Records', signatureReq: 'Request Signatures',
  clearHistory: 'Clear History', targetFinance: 'Target Finance', targetRental: 'Target Rental', targetMaintenance: 'Target Maintenance', targetInvoice: 'Target Invoice',
  targetClaim: 'Target Claim', targetCustom: 'Target Custom', quickContact: 'Quick Contact', reminder: 'Send Reminders',
  mondayAutoEmail: 'Monday Auto Email',
  bulkEmailScheduler: 'Bulk Email Scheduler Access',
  whatsapp: 'WhatsApp Send / Dispatch',
  email: 'Email Send / Dispatch',
  template: 'Select & Use Templates',
  templateCreate: 'Create New Templates',
  templateEdit: 'Edit Existing Templates',
  templateDelete: 'Delete Templates (Protected)',
  reminderTemplate: 'Reminder Templates Management',
  messageTemplate: 'Message Templates Management',
  driverRisk: 'Driver Risk Analysis', 
  renewalAnalysis: 'Renewal Dossier Analysis', 
  showCompletedPaid: 'Show Completed / Paid', 
  groupMessaging: 'Group Messaging',
  progressview: 'View Progress', 
  progressedit: 'Edit Progress',
  mileageHistoryView: 'View Mileage History', 
  mileageHistoryEdit: 'Edit Mileage History', 
  mileageHistoryDelete: 'Delete Mileage History',
  viewPayment: 'View Payments', 
  editPayment: 'Edit Payments', 
  deletePayment: 'Delete Payments',
  restore: 'Restore from Trash', 
  deletePermanently: 'Delete Permanently',
};

const ACTION_ORDER: PermissionAction[] = [
  'view', 'create', 'update', 'delete', 'recordPayment', 'cards', 'share', 'mileage', 'daily', 'weekly', 'claim', 
  'export', 'import', 'owner', 'lock', 'unlock', 'syncStatus', 'sale', 'copyId', 'singleDoc', 'tableStatus', 
  'complete', 'completed', 'categories', 'groups', 'departments', 'recordsPermission', 'availableVehicles', 
  'completion', 'discount', 'note', 'state', 'period', 'reoccurring', 'accounts', 'assign', 'signatureReq', 
  'clearHistory', 'targetFinance', 'targetRental', 'targetMaintenance', 'targetInvoice', 'targetClaim', 
  'targetCustom', 'quickContact', 'driverRisk', 'renewalAnalysis', 'showCompletedPaid', 'groupMessaging', 
  'progressview', 'progressedit', 'mileageHistoryView', 'mileageHistoryEdit', 'mileageHistoryDelete', 
  'viewPayment', 'editPayment', 'deletePayment', 'restore', 'deletePermanently',
  // Communication
  'whatsapp', 'email', 'send', 'reminder', 'mondayAutoEmail', 'bulkEmailScheduler',
  // Template Management
  'template', 'templateCreate', 'templateEdit', 'templateDelete', 'reminderTemplate', 'messageTemplate'
];

const SECTION_TITLE_MAP: Partial<Record<keyof RolePermissions, string>> = {
  dashboard: 'Dashboard', 
  vehicles: 'Vehicles', 
  utilisation: 'Utilisation', 
  maintenance: 'Maintenance', 
  rentals: 'Rentals', 
  accidents: 'Accidents', 
  claims: 'Claims', 
  finance: 'Finance', 
  invoices: 'Invoices', 
  pettyCash: 'AiePettyCash', 
  aiePettyCash: 'SkylinePettyCash', 
  share: 'Share', 
  driverPay: 'Driver Pay', 
  vdFinance: 'VD Finance', 
  vdInvoice: 'VD Invoice', 
  users: 'Users', 
  vatRecord: 'VAT Record', 
  customers: 'Customers', 
  company: 'Company & Managers', 
  products: 'Products', 
  incomeExpense: 'Income & Expense', 
  skylineIncomeExpense: 'Skyline Income & Expense', 
  members: 'Members (Admin Actions)', 
  waiting: 'Waiting List', 
  whatsapp: 'WhatsApp', 
  bulkEmail: 'Bulk Email', 
  trash: 'Recycle Bin', 
  todo: 'Todo List', 
  settings: 'Settings', 
  memberProfile: 'Member — Profile', 
  memberRentals: 'Member — Rentals', 
  memberTransactions: 'Member — Transactions', 
  memberInvoices: 'Member — Invoices',
};

const MODULE_ORDER: Array<keyof RolePermissions> = [
  'rentals', 'claims', 'maintenance', 'invoices', 'vdInvoice', 'driverPay', 'members',
  'dashboard', 'vehicles', 'utilisation', 'customers', 'finance', 'users', 'accidents', 
  'pettyCash', 'aiePettyCash', 'share', 'vdFinance', 'vatRecord', 'company', 'products', 
  'incomeExpense', 'skylineIncomeExpense', 'waiting', 'whatsapp', 'bulkEmail', 'todo', 
  'trash', 'settings', 'memberProfile', 'memberRentals', 'memberTransactions', 'memberInvoices',
];

const COMMUNICATION_MODULES: Array<keyof RolePermissions> = [
  'rentals',
  'claims',
  'maintenance',
  'vdInvoice',
  'driverPay',
  'invoices',
  'members',
];

const COMMUNICATION_ACTIONS: PermissionAction[] = [
  'whatsapp',
  'email',
  'send',
  'reminder',
  'mondayAutoEmail',
  'bulkEmailScheduler',
];

const TEMPLATE_ACTIONS: PermissionAction[] = [
  'template',
  'templateCreate',
  'templateEdit',
  'templateDelete',
  'reminderTemplate',
  'messageTemplate',
];

const FLEET_MODULES: Array<keyof RolePermissions> = [
  'vehicles', 'utilisation', 'maintenance', 'rentals', 'accidents', 'claims'
];

const FINANCE_MODULES: Array<keyof RolePermissions> = [
  'finance', 'invoices', 'vdFinance', 'vdInvoice', 'driverPay', 'pettyCash', 'aiePettyCash', 'incomeExpense', 'skylineIncomeExpense', 'vatRecord'
];

const MEMBER_PORTAL_KEYS: Array<keyof RolePermissions> = ['memberProfile', 'memberRentals', 'memberTransactions', 'memberInvoices'];
const isMemberPortalKey = (k: keyof RolePermissions) => MEMBER_PORTAL_KEYS.includes(k);
const labelFor = (k: keyof RolePermissions) => SECTION_TITLE_MAP[k] ?? String(k).replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase()).trim();
const orderIndex = (k: PermissionAction) => { const i = ACTION_ORDER.indexOf(k); return i === -1 ? 999 : i; };

const getActionLabel = (module: keyof RolePermissions, action: PermissionAction): string => {
  const modTitle = labelFor(module);
  if (action === 'whatsapp') return `WhatsApp Send (${modTitle})`;
  if (action === 'email') return `Email Send (${modTitle})`;
  if (action === 'send') return `Dispatch / Send (${modTitle})`;
  if (action === 'reminder') return `Send Reminders (${modTitle})`;
  if (action === 'mondayAutoEmail') return `Monday Auto Email (${modTitle})`;
  if (action === 'bulkEmailScheduler') return `Bulk Email Scheduler (${modTitle})`;
  if (action === 'template') return `Select & Use Templates (${modTitle})`;
  if (action === 'templateCreate') return `Create Templates (${modTitle})`;
  if (action === 'templateEdit') return `Edit Templates (${modTitle})`;
  if (action === 'templateDelete') return `Delete Templates (${modTitle} - Protected)`;
  if (action === 'reminderTemplate') return `Reminder Templates (${modTitle})`;
  if (action === 'messageTemplate') return `Message Templates (${modTitle})`;
  return FRIENDLY_LABELS[action] || action.charAt(0).toUpperCase() + action.slice(1);
};

const UserRoleModal: React.FC<UserRoleModalProps> = ({ user, onClose }) => {
  const { user: currentUser } = useAuth();
  const isManager = currentUser?.role === 'manager' || currentUser?.role === 'admin';

  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState<User['role']>(user.role);
  const [filterTab, setFilterTab] = useState<'all' | 'comms' | 'fleet' | 'finance'>('all');
  
  const safeInitial: RolePermissions = useMemo(() => {
    return normalizePermissions(user.role, user.permissions);
  }, [user.permissions, user.role]);
  
  const [customPermissions, setCustomPermissions] = useState<RolePermissions>(safeInitial);
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const filteredAndSortedEntries = useMemo(() => {
    const q = (query ?? '').trim().toLowerCase();
    const entries = Object.entries(customPermissions || {}) as [keyof RolePermissions, any][];
    
    // Portal role filter
    const roleFiltered = entries.filter(([key]) => {
      if (role === 'member') return isMemberPortalKey(key);
      return !isMemberPortalKey(key) || key === 'members';
    });

    // Tab filter
    const tabFiltered = roleFiltered.filter(([key]) => {
      if (filterTab === 'comms') return COMMUNICATION_MODULES.includes(key);
      if (filterTab === 'fleet') return FLEET_MODULES.includes(key);
      if (filterTab === 'finance') return FINANCE_MODULES.includes(key);
      return true;
    });

    // Search filter
    const searchFiltered = !q ? tabFiltered : tabFiltered.filter(([key]) => labelFor(key).toLowerCase().includes(q));

    return searchFiltered.sort(([moduleA], [moduleB]) => {
        const indexA = MODULE_ORDER.indexOf(moduleA);
        const indexB = MODULE_ORDER.indexOf(moduleB);
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        return indexA - indexB;
    });
  }, [customPermissions, role, query, filterTab]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isManager) return toast.error('Only managers/admins can modify user permissions');
    setLoading(true);
    try {
      await updateDoc(doc(db, 'users', user.id), { role, permissions: customPermissions, updatedAt: new Date() });
      toast.success('User permissions matrix updated successfully');
      onClose();
    } catch (error) {
      console.error('Failed to update permissions:', error);
      toast.error('Failed to update permissions');
    } finally {
      setLoading(false);
    }
  };

  const toggleAction = (module: keyof RolePermissions, action: PermissionAction) => {
    if (!isManager) return;
    setCustomPermissions((prev) => {
      const currentVal = Boolean(prev[module]?.[action]);
      const newVal = !currentVal;
      const updatedModule = { ...prev[module], [action]: newVal };

      // Keep bulkEmailScheduler and mondayAutoEmail in sync for rentals
      if (module === 'rentals') {
        if (action === 'bulkEmailScheduler') {
          updatedModule.mondayAutoEmail = newVal;
        } else if (action === 'mondayAutoEmail') {
          updatedModule.bulkEmailScheduler = newVal;
        }
      }

      return { ...prev, [module]: updatedModule };
    });
  };

  const handleGlobalBulkToggle = (value: boolean) => {
    if (!isManager) return;
    setCustomPermissions((prev) => {
      const next = { ...prev };
      (Object.keys(next) as Array<keyof RolePermissions>).forEach((mk) => {
        if (next[mk]) {
          const mod = { ...next[mk] } as any;
          Object.keys(mod).forEach((ak) => {
            mod[ak] = value;
          });
          next[mk] = mod;
        }
      });
      return next;
    });
    toast.success(value ? 'All modules and actions selected' : 'All permissions cleared');
  };

  const handleModuleBulkToggle = (moduleKey: keyof RolePermissions, value: boolean) => {
    if (!isManager) return;
    setCustomPermissions((prev) => {
      const next = { ...prev };
      const mod = { ...(next[moduleKey] || {}) } as any;
      Object.keys(mod).forEach((ak) => {
        mod[ak] = value;
      });
      next[moduleKey] = mod;
      return next;
    });
  };

  // Cross-module Communication Presets across all 7 modules
  const handleBulkCommsPreset = (allowSend: boolean, allowTemplateManage: boolean, allowDelete: boolean) => {
    if (!isManager) return;
    setCustomPermissions((prev) => {
      const next = { ...prev };
      COMMUNICATION_MODULES.forEach((mk) => {
        if (next[mk]) {
          const mod = { ...next[mk] } as any;
          mod.whatsapp = allowSend;
          mod.email = allowSend;
          mod.send = allowSend;
          mod.reminder = allowSend;
          mod.mondayAutoEmail = allowSend;
          if (mk === 'rentals') {
            mod.bulkEmailScheduler = allowSend;
          }
          mod.template = allowSend || allowTemplateManage;
          mod.templateCreate = allowTemplateManage;
          mod.templateEdit = allowTemplateManage;
          mod.templateDelete = allowDelete;
          mod.reminderTemplate = allowTemplateManage;
          mod.messageTemplate = allowTemplateManage;
          next[mk] = mod;
        }
      });
      return next;
    });

    if (allowTemplateManage && allowDelete) {
      toast.success('Full communication & template powers granted across all 7 modules');
    } else if (allowSend && !allowTemplateManage) {
      toast.success('Send-Only enabled for all 7 modules (Template editing & deletion locked)');
    } else if (!allowSend && !allowTemplateManage) {
      toast.success('All communications and templates cleared across 7 modules');
    } else {
      toast.success('Communication matrix adjusted');
    }
  };

  // Module-specific preset
  const handleModuleCommsPreset = (
    moduleKey: keyof RolePermissions,
    allowSend: boolean,
    allowTemplateManage: boolean,
    allowDelete: boolean
  ) => {
    if (!isManager) return;
    setCustomPermissions((prev) => {
      const next = { ...prev };
      const mod = { ...(next[moduleKey] || {}) } as any;
      mod.whatsapp = allowSend;
      mod.email = allowSend;
      mod.send = allowSend;
      mod.reminder = allowSend;
      mod.mondayAutoEmail = allowSend;
      if (moduleKey === 'rentals') {
        mod.bulkEmailScheduler = allowSend;
      }
      mod.template = allowSend || allowTemplateManage;
      mod.templateCreate = allowTemplateManage;
      mod.templateEdit = allowTemplateManage;
      mod.templateDelete = allowDelete;
      mod.reminderTemplate = allowTemplateManage;
      mod.messageTemplate = allowTemplateManage;
      next[moduleKey] = mod;
      return next;
    });
    const modTitle = labelFor(moduleKey);
    toast.success(`Updated ${modTitle} communication presets`);
  };

  const resetToRole = (newRole: User['role']) => {
    setRole(newRole);
    setCustomPermissions(normalizePermissions(newRole));
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 h-full overflow-hidden bg-white text-slate-900 user-role-modal">
      
      {/* HEADER CONTROLS (PINNED AT TOP) */}
      <div className="shrink-0 p-5 sm:p-6 space-y-4 bg-white border-b border-gray-200">
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
           <div>
             <div className="flex items-center gap-2">
               <ShieldCheck className="w-6 h-6 text-primary" />
               <h2 className="text-xl font-black text-slate-900 tracking-tight">Access Control & Permissions Matrix</h2>
             </div>
             <p className="text-sm font-semibold text-slate-600 mt-0.5">
               Fine-grained overrides for: <strong className="text-slate-900 font-black">{user.name}</strong> ({user.email})
             </p>
           </div>

           <div className="bg-slate-100 p-1.5 rounded-xl border border-slate-300 flex items-center gap-2 w-full sm:w-auto text-sm shadow-2xs">
              <label className="font-black text-slate-900 py-1 pl-2 text-xs uppercase tracking-wider">Base Role:</label>
              <select 
                value={role} 
                onChange={(e) => resetToRole(e.target.value as User['role'])} 
                className="bg-white text-slate-900 border border-slate-300 rounded-lg shadow-2xs focus:ring-2 focus:ring-primary text-sm px-3 py-1 font-bold disabled:opacity-50 cursor-pointer" 
                disabled={!isManager}
              >
                <option value="manager">Manager (Full Access)</option>
                <option value="admin">Admin</option>
                <option value="finance">Finance</option>
                <option value="claims">Claims</option>
                <option value="company">Company</option>
                <option value="member">Member</option>
              </select>
           </div>
        </div>

        {/* Global Quick Action Toolbars */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-slate-100">
          {/* Category Filter Tabs */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold overflow-x-auto max-w-full">
            <button
              type="button"
              onClick={() => setFilterTab('all')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                filterTab === 'all' ? 'bg-white text-slate-900 shadow-2xs font-black' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Modules ({filteredAndSortedEntries.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterTab('comms')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                filterTab === 'comms' ? 'bg-emerald-600 text-white shadow-2xs font-black' : 'text-slate-700 hover:text-slate-900 hover:bg-slate-200'
              }`}
            >
              <MessageCircle className="w-3.5 h-3.5" />
              WhatsApp, Email & Templates (7 Modules)
            </button>
            <button
              type="button"
              onClick={() => setFilterTab('fleet')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                filterTab === 'fleet' ? 'bg-white text-slate-900 shadow-2xs font-black' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Fleet & Vehicles
            </button>
            <button
              type="button"
              onClick={() => setFilterTab('finance')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                filterTab === 'finance' ? 'bg-white text-slate-900 shadow-2xs font-black' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Finance & Billing
            </button>
          </div>

          {/* Quick Communication Presets across all 7 modules */}
          {isManager && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-black text-slate-500 uppercase tracking-wider hidden sm:inline">7-Module Presets:</span>
              <button
                type="button"
                onClick={() => handleBulkCommsPreset(true, false, false)}
                title="Grant Send/Dispatch, WhatsApp, Email, Reminders & Monday Auto Email across all 7 modules, while locking template editing and deletion"
                className="px-2.5 py-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5 text-emerald-700" />
                Allow Send Only (Lock Templates)
              </button>
              <button
                type="button"
                onClick={() => handleBulkCommsPreset(true, true, true)}
                title="Grant full communication and template management including create, edit, and delete"
                className="px-2.5 py-1.5 text-xs font-bold text-indigo-800 bg-indigo-50 hover:bg-indigo-100 border border-indigo-300 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
              >
                <ShieldAlert className="w-3.5 h-3.5 text-indigo-700" />
                Full Communication & Templates
              </button>
              <button
                type="button"
                onClick={() => handleBulkCommsPreset(false, false, false)}
                title="Deny all WhatsApp, Email, and Template permissions across the 7 modules"
                className="px-2.5 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5 text-slate-600" />
                Lock All 7 Comms
              </button>
            </div>
          )}
        </div>

        {/* Search & Global Toggle */}
        <div className="flex flex-col sm:flex-row gap-3 items-center">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search module name or specific capability (e.g., WhatsApp, Email, Monday, Template)..." 
              value={query} 
              onChange={(e) => setQuery(e.target.value)} 
              className="w-full rounded-xl border border-slate-300 bg-white pl-10 pr-4 py-2 text-sm text-slate-900 font-semibold placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-primary focus:border-primary transition-colors shadow-2xs" 
            />
          </div>
          {isManager && (
            <div className="flex gap-2 w-full sm:w-auto shrink-0">
              <button 
                type="button" 
                onClick={() => handleGlobalBulkToggle(true)} 
                className="px-4 py-2 text-xs font-black text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <CheckSquare className="w-4 h-4 text-white stroke-[2.5]" /> Select All
              </button>
              <button 
                type="button" 
                onClick={() => handleGlobalBulkToggle(false)} 
                className="px-4 py-2 text-xs font-black text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Square className="w-4 h-4 text-white stroke-[2.5]" /> Clear All
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ACCORDION LIST (SINGLE SCROLL CONTAINER) */}
      <div className="flex-1 overflow-y-auto min-h-0 p-4 sm:p-6 space-y-4 bg-slate-50/70 custom-scrollbar">
        {filteredAndSortedEntries.map(([module, permissions]) => {
          const title = labelFor(module);
          const isOpen = expanded[module as string] ?? (filterTab === 'comms' || filteredAndSortedEntries.length <= 4); 
          const entries = Object.entries(permissions || {}) as [PermissionAction, boolean][];
          
          const isCommModule = COMMUNICATION_MODULES.includes(module);

          // Group actions logically
          const commActions = entries.filter(([action]) => COMMUNICATION_ACTIONS.includes(action));
          const templateActions = entries.filter(([action]) => TEMPLATE_ACTIONS.includes(action));
          const generalActions = entries.filter(([action]) => 
            !COMMUNICATION_ACTIONS.includes(action) && !TEMPLATE_ACTIONS.includes(action)
          ).sort((a, b) => orderIndex(a[0]) - orderIndex(b[0]));

          const hasCommOrTemplate = commActions.length > 0 || templateActions.length > 0;

          // Communication active counters
          const activeCommCount = commActions.filter(([, v]) => v).length;
          const activeTemplateCount = templateActions.filter(([, v]) => v).length;

          return (
            <div 
              key={String(module)} 
              className={`rounded-2xl border transition-all duration-200 ${
                isOpen 
                  ? 'border-primary/40 bg-white shadow-md' 
                  : 'border-slate-200 bg-white hover:border-slate-300 shadow-2xs'
              }`}
            >
              {/* Card Header Button */}
              <button 
                type="button" 
                onClick={() => setExpanded((prev) => ({ ...prev, [module as string]: !isOpen }))} 
                className="flex w-full items-center justify-between p-4 sm:p-4.5 focus:outline-none rounded-2xl cursor-pointer"
              >
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-base font-black text-slate-900 tracking-tight">{title}</span>
                  
                  {/* Status badges */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    {permissions?.view ? (
                      <span className="inline-flex items-center gap-1 bg-emerald-50 px-2.5 py-0.5 rounded-md text-[11px] uppercase font-black text-emerald-800 border border-emerald-300">
                        <CheckCircle2 className="h-3 w-3 text-emerald-700 stroke-[2.5]" /> View Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 bg-slate-100 px-2.5 py-0.5 rounded-md text-[11px] uppercase font-black text-slate-600 border border-slate-300">
                        <XCircle className="h-3 w-3 text-slate-500 stroke-[2.5]" /> No View
                      </span>
                    )}

                    {isCommModule && (
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold border ${
                        activeCommCount > 0 
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300' 
                          : 'bg-slate-100 text-slate-500 border-slate-200'
                      }`}>
                        <MessageCircle className="w-3 h-3" />
                        Comms: {activeCommCount}/{commActions.length}
                      </span>
                    )}

                    {isCommModule && (
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold border ${
                        activeTemplateCount > 0 
                          ? 'bg-indigo-50 text-indigo-800 border-indigo-300' 
                          : 'bg-slate-100 text-slate-500 border-slate-200'
                      }`}>
                        <FileEdit className="w-3 h-3" />
                        Templates: {activeTemplateCount}/{templateActions.length}
                      </span>
                    )}
                  </div>
                </div>

                <div className={`p-1.5 rounded-full transition-colors ${isOpen ? 'bg-primary/10 text-primary' : 'bg-slate-100 text-slate-700'}`}>
                  {isOpen ? <ChevronUp className="h-5 w-5 stroke-[2.5]" /> : <ChevronDown className="h-5 w-5 stroke-[2.5]" />}
                </div>
              </button>

              {/* Card Body */}
              {isOpen && (
                <div className="border-t border-slate-200 p-4 sm:p-5 bg-slate-50/70 rounded-b-2xl space-y-5">
                  
                  {/* Module Action Controls */}
                  {isManager && (
                    <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200">
                      <div className="flex flex-wrap items-center gap-2">
                        {isCommModule && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleModuleCommsPreset(module, true, false, false)}
                              className="text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 px-2.5 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                            >
                              <Send className="w-3 h-3 text-emerald-700" />
                              Send Only (Lock Templates)
                            </button>
                            <button
                              type="button"
                              onClick={() => handleModuleCommsPreset(module, true, true, true)}
                              className="text-xs font-bold text-indigo-800 bg-indigo-50 hover:bg-indigo-100 border border-indigo-300 px-2.5 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                            >
                              <ShieldAlert className="w-3 h-3 text-indigo-700" />
                              Full Templates
                            </button>
                            <button
                              type="button"
                              onClick={() => handleModuleCommsPreset(module, false, false, false)}
                              className="text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 px-2.5 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                            >
                              <Lock className="w-3 h-3 text-slate-500" />
                              Lock Comms
                            </button>
                          </>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        <button 
                          type="button" 
                          onClick={() => handleModuleBulkToggle(module as keyof RolePermissions, true)} 
                          className="text-xs font-black text-blue-700 hover:text-blue-900 underline flex items-center gap-1 cursor-pointer"
                        >
                          Select All {title}
                        </button>
                        <span className="text-slate-300 font-bold">|</span>
                        <button 
                          type="button" 
                          onClick={() => handleModuleBulkToggle(module as keyof RolePermissions, false)} 
                          className="text-xs font-black text-rose-600 hover:text-rose-800 underline flex items-center gap-1 cursor-pointer"
                        >
                          Clear {title}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* SECTION 1: WHATSAPP, EMAIL & COMMUNICATIONS (IF PRESENT) */}
                  {commActions.length > 0 && (
                    <div className="space-y-2.5 bg-emerald-50/40 p-3.5 sm:p-4 rounded-xl border border-emerald-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
                            <MessageCircle className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="text-xs font-black text-emerald-950 uppercase tracking-wider">
                              WhatsApp, Email & Communication Permissions ({title})
                            </h4>
                            <p className="text-[11px] font-medium text-emerald-800">
                              Authorize sending messages, generating client links, sending reminders, and Monday auto emails.
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-3 gap-2.5 pt-1">
                        {commActions.map(([action, enabled]) => {
                          const label = getActionLabel(module as keyof RolePermissions, action);
                          const isSpecial = action === 'mondayAutoEmail' || action === 'bulkEmailScheduler';

                          return (
                            <button
                              key={action} 
                              type="button"
                              disabled={!isManager}
                              onClick={() => toggleAction(module as keyof RolePermissions, action)}
                              className={`relative flex items-center justify-between w-full px-3 py-2.5 rounded-xl border-2 text-xs sm:text-sm transition-all focus:outline-none ${
                                !isManager ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:shadow-2xs'
                              } ${
                                enabled 
                                  ? 'bg-emerald-50 border-emerald-600 ring-2 ring-emerald-500/20 shadow-2xs' 
                                  : 'bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                              }`}
                            >
                              <div className="flex items-center gap-2 text-left mr-2 min-w-0">
                                {action === 'whatsapp' && <MessageCircle className={`w-4 h-4 shrink-0 ${enabled ? 'text-emerald-700' : 'text-slate-400'}`} />}
                                {action === 'email' && <Mail className={`w-4 h-4 shrink-0 ${enabled ? 'text-emerald-700' : 'text-slate-400'}`} />}
                                {action === 'send' && <Send className={`w-4 h-4 shrink-0 ${enabled ? 'text-emerald-700' : 'text-slate-400'}`} />}
                                {action === 'reminder' && <Bell className={`w-4 h-4 shrink-0 ${enabled ? 'text-emerald-700' : 'text-slate-400'}`} />}
                                {isSpecial && <Calendar className={`w-4 h-4 shrink-0 ${enabled ? 'text-emerald-700' : 'text-slate-400'}`} />}
                                <span className="font-bold text-slate-900 tracking-tight truncate">{label}</span>
                              </div>
                              <div className={`h-5 w-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                                enabled 
                                  ? 'bg-emerald-600 border-emerald-600 text-white' 
                                  : 'bg-white border-slate-300'
                              }`}>
                                {enabled && <CheckSquare className="h-3.5 w-3.5 text-white stroke-[2.5]" />}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* SECTION 2: TEMPLATE MANAGEMENT (PROTECTED PERMISSIONS) */}
                  {templateActions.length > 0 && (
                    <div className="space-y-2.5 bg-indigo-50/40 p-3.5 sm:p-4 rounded-xl border border-indigo-200">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
                            <ShieldAlert className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="text-xs font-black text-indigo-950 uppercase tracking-wider flex items-center gap-1.5">
                              Template Management Permissions ({title})
                              <span className="text-[10px] font-black bg-indigo-200 text-indigo-900 px-2 py-0.5 rounded uppercase">
                                Protected
                              </span>
                            </h4>
                            <p className="text-[11px] font-medium text-indigo-800">
                              Fine-grained authority: Only users granted these rights can create, edit, or delete communication templates.
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-3 gap-2.5 pt-1">
                        {templateActions.map(([action, enabled]) => {
                          const label = getActionLabel(module as keyof RolePermissions, action);
                          const isDelete = action === 'templateDelete';

                          return (
                            <button
                              key={action} 
                              type="button"
                              disabled={!isManager}
                              onClick={() => toggleAction(module as keyof RolePermissions, action)}
                              className={`relative flex items-center justify-between w-full px-3 py-2.5 rounded-xl border-2 text-xs sm:text-sm transition-all focus:outline-none ${
                                !isManager ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:shadow-2xs'
                              } ${
                                enabled 
                                  ? isDelete 
                                    ? 'bg-rose-50 border-rose-600 ring-2 ring-rose-500/20 shadow-2xs' 
                                    : 'bg-indigo-50 border-indigo-600 ring-2 ring-indigo-500/20 shadow-2xs' 
                                  : 'bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                              }`}
                            >
                              <div className="flex items-center gap-2 text-left mr-2 min-w-0">
                                {isDelete ? (
                                  <Trash2 className={`w-4 h-4 shrink-0 ${enabled ? 'text-rose-600' : 'text-slate-400'}`} />
                                ) : action === 'templateCreate' ? (
                                  <PlusCircle className={`w-4 h-4 shrink-0 ${enabled ? 'text-indigo-600' : 'text-slate-400'}`} />
                                ) : (
                                  <FileEdit className={`w-4 h-4 shrink-0 ${enabled ? 'text-indigo-600' : 'text-slate-400'}`} />
                                )}
                                <div className="min-w-0">
                                  <span className="font-bold text-slate-900 tracking-tight block truncate">{label}</span>
                                  {isDelete && (
                                    <span className="text-[10px] font-extrabold text-rose-700 block">
                                      Critical: Permanent Deletion
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className={`h-5 w-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                                enabled 
                                  ? isDelete ? 'bg-rose-600 border-rose-600 text-white' : 'bg-indigo-600 border-indigo-600 text-white' 
                                  : 'bg-white border-slate-300'
                              }`}>
                                {enabled && <CheckSquare className="h-3.5 w-3.5 text-white stroke-[2.5]" />}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* SECTION 3: GENERAL MODULE PERMISSIONS */}
                  {generalActions.length > 0 && (
                    <div className="space-y-2">
                      {hasCommOrTemplate && (
                        <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider pt-1">
                          General {title} Operations
                        </h4>
                      )}
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2.5">
                        {generalActions.map(([action, enabled]) => {
                          if (module !== 'rentals' && (action === 'daily' || action === 'weekly' || action === 'claim')) return null;
                          const label = getActionLabel(module as keyof RolePermissions, action);

                          return (
                            <button
                              key={action} 
                              type="button"
                              disabled={!isManager}
                              onClick={() => toggleAction(module as keyof RolePermissions, action)}
                              className={`relative flex items-center justify-between w-full px-3 py-2.5 rounded-xl border-2 text-xs sm:text-sm transition-all focus:outline-none ${
                                !isManager ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:shadow-2xs'
                              } ${
                                enabled 
                                  ? 'bg-blue-50 border-blue-600 ring-2 ring-blue-500/20 shadow-2xs' 
                                  : 'bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                              }`}
                            >
                              <span className="font-bold text-slate-900 tracking-tight text-left mr-2 truncate">{label}</span>
                              <div className={`h-5 w-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                                enabled 
                                  ? 'bg-blue-600 border-blue-600 text-white' 
                                  : 'bg-white border-slate-300'
                              }`}>
                                {enabled && <CheckSquare className="h-3.5 w-3.5 text-white stroke-[2.5]" />}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* FOOTER (PINNED AT BOTTOM) */}
      <div className="shrink-0 p-4 sm:p-5 bg-white border-t border-slate-200 rounded-b-2xl">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs font-semibold text-slate-500 text-center sm:text-left">
            Permissions are synced live to user roles. Changes take effect on the user's next action.
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button 
              type="button" 
              onClick={onClose} 
              className="px-5 py-2.5 rounded-xl font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 transition-colors cursor-pointer text-sm"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={loading || !isManager} 
              className="px-8 py-2.5 rounded-xl font-black text-white bg-emerald-600 hover:bg-emerald-700 shadow-md transition-all disabled:opacity-50 cursor-pointer text-sm flex items-center gap-2"
            >
              <ShieldCheck className="w-4 h-4 text-white" />
              {loading ? 'Saving Matrix...' : 'Save Permissions Matrix'}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
};

export default UserRoleModal;
