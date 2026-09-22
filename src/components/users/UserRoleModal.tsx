// src/components/users/UserRoleModal.tsx
import React, { useMemo, useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { User } from '../../types';
import { DEFAULT_PERMISSIONS, normalizePermissions, type RolePermissions, type Permission } from '../../types/roles';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { ShieldCheck, Search, ChevronDown, ChevronUp, CheckCircle2, XCircle, Sparkles, CheckSquare, Square } from 'lucide-react';

interface UserRoleModalProps { user: User; onClose: () => void; }

// ... Keep your existing constants (FRIENDLY_LABELS, ACTION_ORDER, SECTION_TITLE_MAP, MODULE_ORDER, MEMBER_PORTAL_KEYS, helpers) ...
type PermissionAction = keyof Permission;

const FRIENDLY_LABELS: Partial<Record<PermissionAction, string>> = {
  view: 'View', create: 'Create', update: 'Update', delete: 'Delete', recordPayment: 'Record payment', cards: 'Summary cards', share: 'Share',
  mileage: 'Mileage', daily: 'Daily rentals', weekly: 'Weekly rentals', claim: 'Claim rentals', export: 'Export', import: 'Import', send: 'Send/Communicate',
  owner: 'Owner Data', lock: 'Lock Records', unlock: 'Unlock Records', syncStatus: 'Sync Status', sale: 'Process Sales', copyId: 'Copy IDs', singleDoc: 'Single Document Gen',
  tableStatus: 'Edit Status in Table', complete: 'Complete Action', completed: 'View Completed Records', categories: 'Manage Categories', groups: 'Manage Groups',
  departments: 'Departments', recordsPermission: 'Records Permission',
  availableVehicles: 'View Available Vehicles', completion: 'Log Completion', discount: 'Apply Discounts', note: 'Manage Notes', state: 'Change State',
  period: 'Manage Period', reoccurring: 'Manage Recurring', accounts: 'Manage Accounts', assign: 'Assign Records', signatureReq: 'Request Signatures',
  clearHistory: 'Clear History', targetFinance: 'Target Finance', targetRental: 'Target Rental', targetMaintenance: 'Target Maintenance', targetInvoice: 'Target Invoice',
  targetClaim: 'Target Claim', targetCustom: 'Target Custom', quickContact: 'Quick Contact', reminder: 'Send Reminders',
  mondayAutoEmail: 'Bulk Email Scheduler Access',
  bulkEmailScheduler: 'Bulk Email Scheduler Access',
  whatsapp: 'WhatsApp Messaging (Send / Dispatch)',
  email: 'Email Messaging (Send / Dispatch)',
  template: 'Message Templates',
  templateEdit: 'Edit Templates (Email & Reminder Template Management)',
  driverRisk: 'Driver Risk Analysis', renewalAnalysis: 'Renewal Dossier Analysis', showCompletedPaid: 'Show Completed / Paid', groupMessaging: 'Group Messaging',
  progressview: 'View Progress', progressedit: 'Edit Progress',
  mileageHistoryView: 'View Mileage History', mileageHistoryEdit: 'Edit Mileage History', mileageHistoryDelete: 'Delete Mileage History',
  viewPayment: 'View Payments', editPayment: 'Edit Payments', deletePayment: 'Delete Payments',
  restore: 'Restore from Trash', deletePermanently: 'Delete Permanently',
};

const ACTION_ORDER: PermissionAction[] = [
  'view', 'create', 'update', 'delete', 'recordPayment', 'cards', 'share', 'mileage', 'daily', 'weekly', 'claim', 'export', 'import', 'send', 'owner', 'lock', 'unlock', 'syncStatus', 'sale', 'copyId', 'singleDoc', 'tableStatus', 'complete', 'completed', 'categories', 'groups', 'departments', 'recordsPermission', 'availableVehicles', 'completion', 'discount', 'note', 'state', 'period', 'reoccurring', 'accounts', 'assign', 'signatureReq', 'clearHistory', 'targetFinance', 'targetRental', 'targetMaintenance', 'targetInvoice', 'targetClaim', 'targetCustom', 'quickContact', 'reminder', 'bulkEmailScheduler', 'mondayAutoEmail', 'whatsapp', 'email', 'template', 'templateEdit', 'driverRisk', 'renewalAnalysis', 'showCompletedPaid', 'groupMessaging', 'progressview', 'progressedit', 'mileageHistoryView', 'mileageHistoryEdit', 'mileageHistoryDelete', 'viewPayment', 'editPayment', 'deletePayment', 'restore', 'deletePermanently'
];

const SECTION_TITLE_MAP: Partial<Record<keyof RolePermissions, string>> = {
  dashboard: 'Dashboard', vehicles: 'Vehicles', utilisation: 'Utilisation', maintenance: 'Maintenance', rentals: 'Rentals', accidents: 'Accidents', claims: 'Claims', finance: 'Finance', invoices: 'Invoices', pettyCash: 'AiePettyCash', aiePettyCash: 'SkylinePettyCash', share: 'Share', driverPay: 'Driver Pay', vdFinance: 'VD Finance', vdInvoice: 'VD Invoice', users: 'Users', vatRecord: 'VAT Record', customers: 'Customers', company: 'Company & Managers', products: 'Products', incomeExpense: 'Income & Expense', skylineIncomeExpense: 'Skyline Income & Expense', members: 'Members (Admin Actions)', waiting: 'Waiting List', whatsapp: 'WhatsApp', bulkEmail: 'Bulk Email', trash: 'Recycle Bin', todo: 'Todo List', settings: 'Settings', memberProfile: 'Member — Profile', memberRentals: 'Member — Rentals', memberTransactions: 'Member — Transactions', memberInvoices: 'Member — Invoices',
};

const MODULE_ORDER: Array<keyof RolePermissions> = [
  'dashboard', 'vehicles', 'utilisation', 'maintenance', 'rentals', 'customers', 'finance', 'invoices', 'claims', 'users', 'accidents', 'pettyCash', 'aiePettyCash', 'share', 'driverPay', 'vdFinance', 'vdInvoice', 'vatRecord', 'company', 'products', 'incomeExpense', 'skylineIncomeExpense', 'members', 'waiting', 'whatsapp', 'bulkEmail', 'todo', 'trash', 'settings', 'memberProfile', 'memberRentals', 'memberTransactions', 'memberInvoices',
];

const MEMBER_PORTAL_KEYS: Array<keyof RolePermissions> = ['memberProfile', 'memberRentals', 'memberTransactions', 'memberInvoices'];
const isMemberPortalKey = (k: keyof RolePermissions) => MEMBER_PORTAL_KEYS.includes(k);
const labelFor = (k: keyof RolePermissions) => SECTION_TITLE_MAP[k] ?? String(k).replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase()).trim();
const orderIndex = (k: PermissionAction) => { const i = ACTION_ORDER.indexOf(k); return i === -1 ? 999 : i; };

const getActionLabel = (module: keyof RolePermissions, action: PermissionAction): string => {
  if (module === 'rentals') {
    if (action === 'whatsapp') return 'WhatsApp Messaging (Send / Dispatch)';
    if (action === 'email') return 'Email Messaging (Send / Dispatch)';
    if (action === 'templateEdit') return 'Edit Templates (Email & Reminder Template Management)';
    if (action === 'bulkEmailScheduler' || action === 'mondayAutoEmail') return 'Bulk Email Scheduler Access';
    if (action === 'template') return 'Message Templates';
    if (action === 'reminder') return 'Send Reminders';
  }
  return FRIENDLY_LABELS[action] || action.charAt(0).toUpperCase() + action.slice(1);
};

const UserRoleModal: React.FC<UserRoleModalProps> = ({ user, onClose }) => {
  const { user: currentUser } = useAuth();
  const isManager = currentUser?.role === 'manager' || currentUser?.role === 'admin';

  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState<User['role']>(user.role);
  const safeInitial: RolePermissions = useMemo(() => {
    return normalizePermissions(user.role, user.permissions);
  }, [user.permissions, user.role]);
  
  const [customPermissions, setCustomPermissions] = useState<RolePermissions>(safeInitial);
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const filteredAndSortedEntries = useMemo(() => {
    const q = (query ?? '').trim().toLowerCase();
    const entries = Object.entries(customPermissions || {}) as [keyof RolePermissions, any][];
    const roleFiltered = entries.filter(([key]) => {
      if (role === 'member') return isMemberPortalKey(key);
      return !isMemberPortalKey(key) || key === 'members';
    });
    const searchFiltered = !q ? roleFiltered : roleFiltered.filter(([key]) => labelFor(key).toLowerCase().includes(q));
    return searchFiltered.sort(([moduleA], [moduleB]) => {
        const indexA = MODULE_ORDER.indexOf(moduleA);
        const indexB = MODULE_ORDER.indexOf(moduleB);
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        return indexA - indexB;
    });
  }, [customPermissions, role, query]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isManager) return toast.error('Only managers/admins can modify user permissions');
    setLoading(true);
    try {
      await updateDoc(doc(db, 'users', user.id), { role, permissions: customPermissions, updatedAt: new Date() });
      toast.success('User permissions updated');
      onClose();
    } catch (error) {
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
          if (mk === 'rentals') {
            mod.bulkEmailScheduler = value;
            mod.mondayAutoEmail = value;
            mod.whatsapp = value;
            mod.email = value;
            mod.templateEdit = value;
            mod.template = value;
          }
          next[mk] = mod;
        }
      });
      return next;
    });
    toast.success(value ? 'All modules selected' : 'All modules cleared');
  };

  const handleModuleBulkToggle = (moduleKey: keyof RolePermissions, value: boolean) => {
    if (!isManager) return;
    setCustomPermissions((prev) => {
      const next = { ...prev };
      const mod = { ...(next[moduleKey] || {}) } as any;
      Object.keys(mod).forEach((ak) => {
        mod[ak] = value;
      });
      if (moduleKey === 'rentals') {
        mod.bulkEmailScheduler = value;
        mod.mondayAutoEmail = value;
        mod.whatsapp = value;
        mod.email = value;
        mod.templateEdit = value;
        mod.template = value;
      }
      next[moduleKey] = mod;
      return next;
    });
  };

  const resetToRole = (newRole: User['role']) => {
    setRole(newRole);
    setCustomPermissions(normalizePermissions(newRole));
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 h-full overflow-hidden bg-white text-black user-role-modal">
      
      {/* HEADER CONTROLS (PINNED AT TOP) */}
      <div className="shrink-0 p-5 sm:p-6 space-y-4 bg-white border-b border-gray-200">
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
           <div>
             <h2 className="text-xl font-black text-black tracking-tight">Access Control Matrix</h2>
             <p className="text-sm font-semibold text-black mt-1">Editing overrides for: <strong className="text-black font-black">{user.name}</strong></p>
           </div>
           <div className="bg-gray-100 p-1.5 rounded-xl border border-gray-300 flex items-center gap-2 w-full sm:w-auto text-sm">
              <label className="font-black text-black py-1 pl-2 text-sm">Base Role:</label>
              <select 
                value={role} 
                onChange={(e) => resetToRole(e.target.value as User['role'])} 
                className="bg-white text-black border border-gray-300 rounded-lg shadow-xs focus:ring-2 focus:ring-primary text-sm px-3 py-1 font-bold disabled:opacity-50 cursor-pointer" 
                disabled={!isManager}
              >
                <option value="manager" className="text-black bg-white">Manager</option>
                <option value="admin" className="text-black bg-white">Admin</option>
                <option value="finance" className="text-black bg-white">Finance</option>
                <option value="claims" className="text-black bg-white">Claims</option>
                <option value="company" className="text-black bg-white">Company</option>
                <option value="member" className="text-black bg-white">Member</option>
              </select>
           </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 items-center">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-black" />
            <input 
              type="text" 
              placeholder="Filter specific modules..." 
              value={query} 
              onChange={(e) => setQuery(e.target.value)} 
              className="w-full rounded-xl border border-gray-300 bg-white pl-10 pr-4 py-2 text-sm text-black font-semibold placeholder:text-gray-500 focus:bg-white focus:ring-2 focus:ring-primary focus:border-primary transition-colors shadow-xs" 
            />
          </div>
          {isManager && (
            <div className="flex gap-2 w-full sm:w-auto shrink-0">
              <button 
                type="button" 
                onClick={() => handleGlobalBulkToggle(true)} 
                className="btn-white-text flex-1 sm:flex-none px-4 py-2 text-xs font-black text-white bg-black hover:bg-gray-800 rounded-xl transition-colors shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <CheckSquare className="w-4 h-4 text-white stroke-[2.5]" /> Allow All
              </button>
              <button 
                type="button" 
                onClick={() => handleGlobalBulkToggle(false)} 
                className="btn-white-text flex-1 sm:flex-none px-4 py-2 text-xs font-black text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Square className="w-4 h-4 text-white stroke-[2.5]" /> Deny All
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ACCORDION LIST (SINGLE SCROLL CONTAINER) */}
      <div className="flex-1 overflow-y-auto min-h-0 p-4 sm:p-6 space-y-3.5 bg-gray-50/70 custom-scrollbar">
        {filteredAndSortedEntries.map(([module, permissions]) => {
          const title = labelFor(module);
          const isOpen = expanded[module as string] ?? false; 
          const entries = Object.entries(permissions || {}) as [PermissionAction, boolean][];
          const ordered = entries.sort((a, b) => orderIndex(a[0]) - orderIndex(b[0]));

          return (
            <div key={String(module)} className={`rounded-2xl border transition-all duration-200 ${isOpen ? 'border-primary/40 bg-white shadow-md' : 'border-gray-200 bg-white hover:border-gray-300 shadow-xs'}`}>
              <button 
                type="button" 
                onClick={() => setExpanded((prev) => ({ ...prev, [module as string]: !isOpen }))} 
                className="flex w-full items-center justify-between p-4 focus:outline-none rounded-2xl cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <span className="text-base font-black text-black tracking-tight">{title}</span>
                  <div className="flex gap-1.5">
                    {permissions?.view ? (
                      <span className="inline-flex items-center gap-1 bg-emerald-100 px-2.5 py-0.5 rounded-md text-[11px] uppercase font-black text-black border border-emerald-300">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-800 stroke-[2.5]" /> View
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 bg-gray-100 px-2.5 py-0.5 rounded-md text-[11px] uppercase font-black text-black border border-gray-300">
                        <XCircle className="h-3.5 w-3.5 text-gray-700 stroke-[2.5]" /> No view
                      </span>
                    )}
                  </div>
                </div>
                <div className={`p-1.5 rounded-full transition-colors ${isOpen ? 'bg-primary/10 text-primary' : 'bg-gray-100 text-black'}`}>
                  {isOpen ? <ChevronUp className="h-5 w-5 stroke-[2.5]" /> : <ChevronDown className="h-5 w-5 stroke-[2.5]" />}
                </div>
              </button>

              {isOpen && (
                <div className="border-t border-gray-200 p-5 bg-gray-50 rounded-b-2xl">
                  {isManager && ordered.length > 1 && (
                    <div className="flex justify-end gap-3 mb-4 pb-3 border-b border-gray-200">
                      <button 
                        type="button" 
                        onClick={() => handleModuleBulkToggle(module as keyof RolePermissions, true)} 
                        className="text-xs font-black text-blue-700 hover:text-blue-900 underline flex items-center gap-1 cursor-pointer"
                      >
                        Select All {title}
                      </button>
                      <span className="text-gray-400 font-bold">|</span>
                      <button 
                        type="button" 
                        onClick={() => handleModuleBulkToggle(module as keyof RolePermissions, false)} 
                        className="text-xs font-black text-red-600 hover:text-red-800 underline flex items-center gap-1 cursor-pointer"
                      >
                        Clear {title}
                      </button>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                    {ordered.map(([action, enabled]) => {
                      if (module !== 'rentals' && (action === 'daily' || action === 'weekly' || action === 'claim')) return null;
                      if (module === 'rentals' && action === 'mondayAutoEmail') return null;
                      const label = getActionLabel(module as keyof RolePermissions, action);

                      return (
                        <button
                          key={action} 
                          type="button"
                          disabled={!isManager}
                          onClick={() => toggleAction(module as keyof RolePermissions, action)}
                          className={`relative flex items-center justify-between w-full px-3 py-2.5 rounded-xl border-2 text-sm transition-all focus:outline-none ${
                            !isManager ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:shadow-xs'
                          } ${
                            enabled 
                              ? 'bg-blue-50 border-blue-600 ring-2 ring-blue-500/20 shadow-xs' 
                              : 'bg-white border-gray-300 hover:bg-gray-100 hover:border-gray-400'
                          }`}
                        >
                          <span className="font-black text-black tracking-tight text-left mr-2">{label}</span>
                          <div className={`h-5 w-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                            enabled 
                              ? 'bg-blue-600 border-blue-600 text-white' 
                              : 'bg-white border-gray-400'
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
          );
        })}
      </div>

      {/* FOOTER (PINNED AT BOTTOM) */}
      <div className="shrink-0 p-4 sm:p-5 bg-white border-t border-gray-200 rounded-b-2xl">
        <div className="flex justify-end gap-3">
          <button 
            type="button" 
            onClick={onClose} 
            className="px-5 py-2.5 rounded-xl font-black text-black bg-gray-100 hover:bg-gray-200 border border-gray-300 transition-colors cursor-pointer"
          >
            Cancel Changes
          </button>
          <button 
            type="submit" 
            disabled={loading || !isManager} 
            className="btn-white-text px-8 py-2.5 rounded-xl font-black text-white bg-green-600 hover:bg-green-700 shadow-md transition-colors disabled:opacity-50 cursor-pointer"
          >
            {loading ? 'Saving...' : 'Save Matrix'}
          </button>
        </div>
      </div>
    </form>
  );
};

export default UserRoleModal;