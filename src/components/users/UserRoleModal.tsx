// src/components/users/UserRoleModal.tsx

import React, { useMemo, useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { User } from '../../types';
import {
  DEFAULT_PERMISSIONS,
  type RolePermissions,
  type Permission,
} from '../../types/roles';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import {
  ShieldCheck,
  Search,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  XCircle,
  Sparkles,
  CheckSquare,
  Square
} from 'lucide-react';

interface UserRoleModalProps {
  user: User;
  onClose: () => void;
}

type PermissionAction = keyof Permission;

const FRIENDLY_LABELS: Partial<Record<PermissionAction, string>> = {
  view: 'View',
  create: 'Create',
  update: 'Update',
  delete: 'Delete',
  recordPayment: 'Record payment',
  cards: 'Summary cards',
  share: 'Share',
  mileage: 'Mileage',
  daily: 'Daily rentals',
  weekly: 'Weekly rentals',
  claim: 'Claim rentals',
  export: 'Export',
  import: 'Import',
  send: 'Send/Communicate',
  owner: 'Owner Data',
  lock: 'Lock Records',
  unlock: 'Unlock Records',
  syncStatus: 'Sync Status',
  sale: 'Process Sales',
  copyId: 'Copy IDs',
  singleDoc: 'Single Document Gen',
  tableStatus: 'Edit Status in Table',
  complete: 'Complete Action',
  completed: 'View Completed Records',
  categories: 'Manage Categories',
  groups: 'Manage Groups',
  availableVehicles: 'View Available Vehicles',
  completion: 'Log Completion',
  discount: 'Apply Discounts',
  note: 'Manage Notes',
  state: 'Change State',
  period: 'Manage Period',
  reoccurring: 'Manage Recurring',
  accounts: 'Manage Accounts',
  assign: 'Assign Records',
  signatureReq: 'Request Signatures',
  clearHistory: 'Clear History',
  targetFinance: 'Target Finance',
  targetRental: 'Target Rental',
  targetMaintenance: 'Target Maintenance',
  targetInvoice: 'Target Invoice',
  targetClaim: 'Target Claim',
  targetCustom: 'Target Custom',
  quickContact: 'Quick Contact',
  reminder: 'Send Reminders',
  restore: 'Restore from Trash',
  deletePermanently: 'Delete Permanently',
};

const ACTION_ORDER: PermissionAction[] = [
  'view',
  'create',
  'update',
  'delete',
  'recordPayment',
  'cards',
  'share',
  'mileage',
  'daily',
  'weekly',
  'claim',
  'export',
  'import',
  'send',
  'owner',
  'lock',
  'unlock',
  'syncStatus',
  'sale',
  'copyId',
  'singleDoc',
  'tableStatus',
  'complete',
  'completed',
  'categories',
  'groups',
  'availableVehicles',
  'completion',
  'discount',
  'note',
  'state',
  'period',
  'reoccurring',
  'accounts',
  'assign',
  'signatureReq',
  'clearHistory',
  'targetFinance',
  'targetRental',
  'targetMaintenance',
  'targetInvoice',
  'targetClaim',
  'targetCustom',
  'quickContact',
  'reminder',
  'restore',
  'deletePermanently'
];

const SECTION_TITLE_MAP: Partial<Record<keyof RolePermissions, string>> = {
  dashboard: 'Dashboard',
  vehicles: 'Vehicles',
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
  'dashboard',
  'vehicles',
  'maintenance',
  'rentals',
  'customers', 
  'finance',
  'invoices',
  'claims',
  'users',
  'accidents',
  'pettyCash',
  'aiePettyCash',
  'share',
  'driverPay',
  'vdFinance',
  'vdInvoice',
  'vatRecord',
  'company',
  'products',
  'incomeExpense',
  'skylineIncomeExpense',
  'members',
  'waiting',
  'whatsapp',
  'bulkEmail',
  'todo',
  'trash',
  'settings',
  'memberProfile',
  'memberRentals',
  'memberTransactions',
  'memberInvoices',
];

const MEMBER_PORTAL_KEYS: Array<keyof RolePermissions> = [
  'memberProfile',
  'memberRentals',
  'memberTransactions',
  'memberInvoices',
];

const isMemberPortalKey = (k: keyof RolePermissions) => MEMBER_PORTAL_KEYS.includes(k);

const labelFor = (k: keyof RolePermissions) =>
  SECTION_TITLE_MAP[k] ??
  String(k).replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase()).trim();

const orderIndex = (k: PermissionAction) => {
  const i = ACTION_ORDER.indexOf(k);
  return i === -1 ? 999 : i;
};

const UserRoleModal: React.FC<UserRoleModalProps> = ({ user, onClose }) => {
  const { user: currentUser } = useAuth();
  const isManager = currentUser?.role === 'manager' || currentUser?.role === 'admin';

  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState<User['role']>(user.role);

  const safeInitial: RolePermissions = useMemo(
    () => user.permissions || DEFAULT_PERMISSIONS[user.role],
    [user.permissions, user.role]
  );

  const [customPermissions, setCustomPermissions] = useState<RolePermissions>(safeInitial);
  const [query, setQuery] = useState('');
  
  // ✅ Modules are now collapsed by default (empty object)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const filteredAndSortedEntries = useMemo(() => {
    const q = (query ?? '').trim().toLowerCase();
    const entries = Object.entries(customPermissions || {}) as [keyof RolePermissions, any][];

    const roleFiltered = entries.filter(([key]) => {
      if (role === 'member') return isMemberPortalKey(key);
      return !isMemberPortalKey(key) || key === 'members';
    });
    
    const searchFiltered = !q
      ? roleFiltered
      : roleFiltered.filter(([key]) => labelFor(key).toLowerCase().includes(q));

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
    if (!isManager) {
      toast.error('Only managers/admins can modify user permissions');
      return;
    }
    setLoading(true);
    try {
      await updateDoc(doc(db, 'users', user.id), {
        role,
        permissions: customPermissions,
        updatedAt: new Date(),
      });
      toast.success('User permissions updated');
      onClose();
    } catch (error) {
      console.error('Error updating user permissions:', error);
      toast.error('Failed to update user permissions');
    } finally {
      setLoading(false);
    }
  };

  const toggleAction = (module: keyof RolePermissions, action: PermissionAction) => {
    if (!isManager) return;
    setCustomPermissions((prev) => ({
      ...prev,
      [module]: {
        ...prev[module],
        [action]: !prev[module]?.[action],
      },
    }));
  };

  // ✅ GLOBAL Bulk Toggle
  const handleGlobalBulkToggle = (value: boolean) => {
    if (!isManager) return;
    setCustomPermissions((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((moduleKey) => {
        const mk = moduleKey as keyof RolePermissions;
        if (next[mk]) {
            const mod = { ...next[mk] } as any;
            Object.keys(mod).forEach((actionKey) => {
            mod[actionKey] = value;
            });
            next[mk] = mod;
        }
      });
      return next;
    });
    toast.success(value ? 'All modules selected' : 'All modules cleared');
  };

  // ✅ MODULE SPECIFIC Bulk Toggle
  const handleModuleBulkToggle = (moduleKey: keyof RolePermissions, value: boolean) => {
    if (!isManager) return;
    setCustomPermissions((prev) => {
      const next = { ...prev };
      const mod = { ...next[moduleKey] } as any;
      if (mod) {
        Object.keys(mod).forEach((actionKey) => {
          mod[actionKey] = value;
        });
        next[moduleKey] = mod;
      }
      return next;
    });
  };

  const resetToRole = (newRole: User['role']) => {
    setRole(newRole);
    setCustomPermissions(DEFAULT_PERMISSIONS[newRole]);
  };

  const disabledClass = !isManager ? 'opacity-60 cursor-not-allowed' : '';

  return (
    <form onSubmit={handleSubmit} className="flex max-h-[85vh] flex-col space-y-6">
      
      {/* Header Block */}
      <div className="shrink-0 space-y-4 pt-2">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-xs text-gray-500">Editing permissions for</div>
            <div className="mt-0.5 text-lg font-semibold text-gray-900">
              {user.name || user.email || 'User'}
            </div>
            <div className="mt-1 inline-flex items-center gap-2 text-sm">
              <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 px-2 py-0.5 text-gray-600">
                <ShieldCheck className="h-4 w-4" />
                Current role: <strong className="ml-1 capitalize">{user.role}</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Role Selector & Global Actions */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-12 items-end">
          <div className="sm:col-span-4">
            <label className="block text-sm font-medium text-gray-700">System Role Map</label>
            <div className="mt-1 relative">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
                <ShieldCheck className="h-4 w-4 text-gray-400" />
              </span>
              <select
                value={role}
                onChange={(e) => resetToRole(e.target.value as User['role'])}
                className={`block w-full rounded-lg border border-gray-300 bg-white pl-9 pr-3 py-2 text-sm shadow-sm focus:border-primary focus:ring-primary ${disabledClass}`}
                disabled={!isManager}
              >
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
                <option value="finance">Finance</option>
                <option value="claims">Claims</option>
                <option value="company">Company</option>
                <option value="member">Member</option>
              </select>
            </div>
          </div>

          <div className="sm:col-span-5">
            <label className="block text-sm font-medium text-gray-700">Quick search</label>
            <div className="mt-1 relative">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
                <Search className="h-4 w-4 text-gray-400" />
              </span>
              <input
                type="text"
                placeholder="Filter modules..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white pl-9 pr-3 py-2 text-sm shadow-sm focus:border-primary focus:ring-primary"
              />
            </div>
          </div>

          {/* Global Bulk Toggles */}
          {isManager && (
            <div className="sm:col-span-3 flex gap-2 pb-0.5">
              <button
                type="button"
                onClick={() => handleGlobalBulkToggle(true)}
                className="flex-1 flex justify-center items-center gap-1 px-2 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors"
                title="Select all permissions globally"
              >
                <CheckSquare className="w-3.5 h-3.5" /> All
              </button>
              <button
                type="button"
                onClick={() => handleGlobalBulkToggle(false)}
                className="flex-1 flex justify-center items-center gap-1 px-2 py-2 text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
                title="Clear all permissions globally"
              >
                <Square className="w-3.5 h-3.5" /> Clear
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Permissions List (Scrollable) */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-2">
        {filteredAndSortedEntries.map(([module, permissions]) => {
          const title = labelFor(module);
          
          // ✅ Defaults to FALSE (closed) instead of true
          const isOpen = expanded[module as string] ?? false; 
          
          const toggleOpen = () => setExpanded((prev) => ({ ...prev, [module as string]: !isOpen }));

          const entries = Object.entries(permissions || {}) as [PermissionAction, boolean][];
          const ordered = entries.sort((a, b) => orderIndex(a[0]) - orderIndex(b[0]));

          return (
            <div key={String(module)} className="rounded-xl border border-gray-200 bg-white shadow-sm transition-all duration-200">
              <button
                type="button"
                onClick={toggleOpen}
                className="flex w-full items-center justify-between px-4 py-3 focus:outline-none"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-900">{title}</span>
                  {permissions?.view ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
                      <CheckCircle2 className="h-3.5 w-3.5" /> View
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
                      <XCircle className="h-3.5 w-3.5" /> No view
                    </span>
                  )}
                  {permissions?.export && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                      <Sparkles className="h-3.5 w-3.5" /> Export
                    </span>
                  )}
                </div>
                <div className="p-1 text-gray-400 hover:text-gray-600">
                  {isOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                </div>
              </button>

              {isOpen && (
                <div className="border-t border-gray-100 px-4 py-3 bg-gray-50/30 rounded-b-xl">
                  
                  {/* Module Specific Bulk Actions */}
                  {isManager && ordered.length > 1 && (
                    <div className="flex justify-end gap-3 mb-3 pb-3 border-b border-gray-200/60">
                      <button 
                        type="button" 
                        onClick={() => handleModuleBulkToggle(module as keyof RolePermissions, true)} 
                        className="text-xs font-semibold text-emerald-600 hover:text-emerald-800 flex items-center gap-1 transition-colors"
                      >
                        <CheckSquare className="w-3.5 h-3.5"/> Select All
                      </button>
                      <button 
                        type="button" 
                        onClick={() => handleModuleBulkToggle(module as keyof RolePermissions, false)} 
                        className="text-xs font-semibold text-red-600 hover:text-red-800 flex items-center gap-1 transition-colors"
                      >
                        <Square className="w-3.5 h-3.5"/> Clear All
                      </button>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                    {ordered.map(([action, enabled]) => {
                      // Small safety filter to prevent rentals keys leaking visually
                      if (module !== 'rentals' && (action === 'daily' || action === 'weekly' || action === 'claim')) {
                        return null;
                      }

                      const label = FRIENDLY_LABELS[action] || action.charAt(0).toUpperCase() + action.slice(1);

                      return (
                        <label
                          key={action}
                          className={`group relative flex items-center gap-2.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm transition hover:bg-blue-50/50 hover:border-blue-200 hover:shadow-sm ${
                            !isManager ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
                          }`}
                        >
                          <input
                            type="checkbox"
                            className={`h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary transition-colors ${
                              !isManager ? 'cursor-not-allowed' : 'cursor-pointer'
                            }`}
                            checked={!!enabled}
                            onChange={() => toggleAction(module as keyof RolePermissions, action)}
                            disabled={!isManager}
                          />
                          <span className="text-gray-800 font-medium select-none">{label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {filteredAndSortedEntries.length === 0 && (
          <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center">
            <p className="text-sm font-medium text-gray-900">No matching modules</p>
            <p className="text-sm text-gray-500 mt-1">Try adjusting your search query.</p>
          </div>
        )}
      </div>

      {/* Sticky footer actions */}
      <div className="shrink-0 border-t border-gray-200 bg-white pt-4 pb-1">
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
          >
            Cancel
          </button>
        <button
            type="submit"
            disabled={loading || !isManager}
            className={`inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition ${
              isManager ? 'hover:bg-blue-700' : 'opacity-60 cursor-not-allowed'
            }`}
          >
            {loading ? 'Saving...' : 'Save Permissions'}
          </button>
        </div>
      </div>
    </form>
  );
};

export default UserRoleModal;