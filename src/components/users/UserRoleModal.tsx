// src/components/users/UserRoleModal.tsx
import React, { useMemo, useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { User } from '../../types';
import { DEFAULT_PERMISSIONS, type RolePermissions, type Permission } from '../../types/roles';
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
  availableVehicles: 'View Available Vehicles', completion: 'Log Completion', discount: 'Apply Discounts', note: 'Manage Notes', state: 'Change State',
  period: 'Manage Period', reoccurring: 'Manage Recurring', accounts: 'Manage Accounts', assign: 'Assign Records', signatureReq: 'Request Signatures',
  clearHistory: 'Clear History', targetFinance: 'Target Finance', targetRental: 'Target Rental', targetMaintenance: 'Target Maintenance', targetInvoice: 'Target Invoice',
  targetClaim: 'Target Claim', targetCustom: 'Target Custom', quickContact: 'Quick Contact', reminder: 'Send Reminders', restore: 'Restore from Trash', deletePermanently: 'Delete Permanently',
};

const ACTION_ORDER: PermissionAction[] = [
  'view', 'create', 'update', 'delete', 'recordPayment', 'cards', 'share', 'mileage', 'daily', 'weekly', 'claim', 'export', 'import', 'send', 'owner', 'lock', 'unlock', 'syncStatus', 'sale', 'copyId', 'singleDoc', 'tableStatus', 'complete', 'completed', 'categories', 'groups', 'availableVehicles', 'completion', 'discount', 'note', 'state', 'period', 'reoccurring', 'accounts', 'assign', 'signatureReq', 'clearHistory', 'targetFinance', 'targetRental', 'targetMaintenance', 'targetInvoice', 'targetClaim', 'targetCustom', 'quickContact', 'reminder', 'restore', 'deletePermanently'
];

const SECTION_TITLE_MAP: Partial<Record<keyof RolePermissions, string>> = {
  dashboard: 'Dashboard', vehicles: 'Vehicles', maintenance: 'Maintenance', rentals: 'Rentals', accidents: 'Accidents', claims: 'Claims', finance: 'Finance', invoices: 'Invoices', pettyCash: 'AiePettyCash', aiePettyCash: 'SkylinePettyCash', share: 'Share', driverPay: 'Driver Pay', vdFinance: 'VD Finance', vdInvoice: 'VD Invoice', users: 'Users', vatRecord: 'VAT Record', customers: 'Customers', company: 'Company & Managers', products: 'Products', incomeExpense: 'Income & Expense', skylineIncomeExpense: 'Skyline Income & Expense', members: 'Members (Admin Actions)', waiting: 'Waiting List', whatsapp: 'WhatsApp', bulkEmail: 'Bulk Email', trash: 'Recycle Bin', todo: 'Todo List', settings: 'Settings', memberProfile: 'Member — Profile', memberRentals: 'Member — Rentals', memberTransactions: 'Member — Transactions', memberInvoices: 'Member — Invoices',
};

const MODULE_ORDER: Array<keyof RolePermissions> = [
  'dashboard', 'vehicles', 'maintenance', 'rentals', 'customers', 'finance', 'invoices', 'claims', 'users', 'accidents', 'pettyCash', 'aiePettyCash', 'share', 'driverPay', 'vdFinance', 'vdInvoice', 'vatRecord', 'company', 'products', 'incomeExpense', 'skylineIncomeExpense', 'members', 'waiting', 'whatsapp', 'bulkEmail', 'todo', 'trash', 'settings', 'memberProfile', 'memberRentals', 'memberTransactions', 'memberInvoices',
];

const MEMBER_PORTAL_KEYS: Array<keyof RolePermissions> = ['memberProfile', 'memberRentals', 'memberTransactions', 'memberInvoices'];
const isMemberPortalKey = (k: keyof RolePermissions) => MEMBER_PORTAL_KEYS.includes(k);
const labelFor = (k: keyof RolePermissions) => SECTION_TITLE_MAP[k] ?? String(k).replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase()).trim();
const orderIndex = (k: PermissionAction) => { const i = ACTION_ORDER.indexOf(k); return i === -1 ? 999 : i; };

const UserRoleModal: React.FC<UserRoleModalProps> = ({ user, onClose }) => {
  const { user: currentUser } = useAuth();
  const isManager = currentUser?.role === 'manager' || currentUser?.role === 'admin';

  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState<User['role']>(user.role);
  const safeInitial: RolePermissions = useMemo(() => user.permissions || DEFAULT_PERMISSIONS[user.role], [user.permissions, user.role]);
  
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
    setCustomPermissions((prev) => ({ ...prev, [module]: { ...prev[module], [action]: !prev[module]?.[action] } }));
  };

  const handleGlobalBulkToggle = (value: boolean) => {
    if (!isManager) return;
    setCustomPermissions((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((mk) => {
        if (next[mk as keyof RolePermissions]) {
            const mod = { ...next[mk as keyof RolePermissions] } as any;
            Object.keys(mod).forEach((ak) => mod[ak] = value);
            next[mk as keyof RolePermissions] = mod;
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
      const mod = { ...next[moduleKey] } as any;
      if (mod) {
        Object.keys(mod).forEach((ak) => mod[ak] = value);
        next[moduleKey] = mod;
      }
      return next;
    });
  };

  const resetToRole = (newRole: User['role']) => {
    setRole(newRole);
    setCustomPermissions(DEFAULT_PERMISSIONS[newRole]);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full max-h-[85vh] bg-gray-50/30 rounded-2xl">
      
      {/* HEADER CONTROLS */}
      <div className="shrink-0 p-6 space-y-5 bg-white border-b border-gray-100 rounded-t-2xl">
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
           <div>
             <h2 className="text-xl font-black text-gray-900 tracking-tight">Access Control Matrix</h2>
             <p className="text-sm text-gray-500 mt-1">Editing overrides for: <strong className="text-gray-800">{user.name}</strong></p>
           </div>
           <div className="bg-gray-100 p-1.5 rounded-lg border border-gray-200 flex gap-2 w-full sm:w-auto text-sm">
              <label className="font-bold text-gray-700 py-1 pl-2">Base Role:</label>
              <select value={role} onChange={(e) => resetToRole(e.target.value as User['role'])} className="bg-white rounded border-gray-300 shadow-sm focus:ring-primary text-sm px-2 font-bold disabled:opacity-50" disabled={!isManager}>
                <option value="manager">Manager</option><option value="admin">Admin</option><option value="finance">Finance</option><option value="claims">Claims</option><option value="company">Company</option><option value="member">Member</option>
              </select>
           </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 items-center">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input type="text" placeholder="Filter specific modules..." value={query} onChange={(e) => setQuery(e.target.value)} className="w-full rounded-xl border-gray-300 bg-gray-50 pl-10 pr-4 py-2 text-sm focus:bg-white focus:ring-primary focus:border-primary transition-colors" />
          </div>
          {isManager && (
            <div className="flex gap-2 w-full sm:w-auto shrink-0">
              <button type="button" onClick={() => handleGlobalBulkToggle(true)} className="flex-1 sm:flex-none px-4 py-2 text-xs font-bold text-white bg-gray-800 hover:bg-gray-900 rounded-xl transition-colors shadow-sm flex items-center justify-center gap-1.5"><CheckSquare className="w-4 h-4" /> Allow All</button>
              <button type="button" onClick={() => handleGlobalBulkToggle(false)} className="flex-1 sm:flex-none px-4 py-2 text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl transition-colors shadow-sm flex items-center justify-center gap-1.5"><Square className="w-4 h-4" /> Deny All</button>
            </div>
          )}
        </div>
      </div>

      {/* ACCORDION LIST */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
        {filteredAndSortedEntries.map(([module, permissions]) => {
          const title = labelFor(module);
          const isOpen = expanded[module as string] ?? false; 
          const entries = Object.entries(permissions || {}) as [PermissionAction, boolean][];
          const ordered = entries.sort((a, b) => orderIndex(a[0]) - orderIndex(b[0]));

          return (
            <div key={String(module)} className={`rounded-2xl border transition-all duration-200 ${isOpen ? 'border-primary/20 bg-white shadow-md' : 'border-gray-200 bg-white hover:border-gray-300 shadow-sm'}`}>
              <button type="button" onClick={() => setExpanded((prev) => ({ ...prev, [module as string]: !isOpen }))} className="flex w-full items-center justify-between p-4 focus:outline-none rounded-2xl">
                <div className="flex items-center gap-3">
                  <span className={`text-base font-bold ${isOpen ? 'text-primary' : 'text-gray-800'}`}>{title}</span>
                  <div className="flex gap-1.5">
                    {permissions?.view ? (
                      <span className="inline-flex items-center gap-1 bg-green-50 px-2 py-0.5 rounded-md text-[10px] uppercase font-bold text-green-700 border border-green-100"><CheckCircle2 className="h-3 w-3" /> View</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 bg-gray-100 px-2 py-0.5 rounded-md text-[10px] uppercase font-bold text-gray-500 border border-gray-200"><XCircle className="h-3 w-3" /> No view</span>
                    )}
                  </div>
                </div>
                <div className={`p-1 rounded-full transition-colors ${isOpen ? 'bg-primary/10 text-primary' : 'bg-gray-50 text-gray-400'}`}>
                  {isOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                </div>
              </button>

              {isOpen && (
                <div className="border-t border-gray-100 p-5 bg-gray-50/50 rounded-b-2xl">
                  {isManager && ordered.length > 1 && (
                    <div className="flex justify-end gap-3 mb-4 pb-3 border-b border-gray-200/50">
                      <button type="button" onClick={() => handleModuleBulkToggle(module as keyof RolePermissions, true)} className="text-xs font-bold text-primary hover:text-primary-700 flex items-center gap-1">Select All {title}</button>
                      <span className="text-gray-300">|</span>
                      <button type="button" onClick={() => handleModuleBulkToggle(module as keyof RolePermissions, false)} className="text-xs font-bold text-gray-500 hover:text-red-600 flex items-center gap-1">Clear {title}</button>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                    {ordered.map(([action, enabled]) => {
                      if (module !== 'rentals' && (action === 'daily' || action === 'weekly' || action === 'claim')) return null;
                      const label = FRIENDLY_LABELS[action] || action.charAt(0).toUpperCase() + action.slice(1);

                      return (
                        <button
                          key={action} type="button"
                          disabled={!isManager}
                          onClick={() => toggleAction(module as keyof RolePermissions, action)}
                          className={`relative flex items-center justify-between w-full px-3 py-2.5 rounded-xl border text-sm transition-all focus:outline-none ${!isManager ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:shadow-sm'} ${enabled ? 'bg-blue-50 border-blue-200 text-blue-900 shadow-sm ring-1 ring-blue-100' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                        >
                          <span className="font-bold tracking-tight">{label}</span>
                          <div className={`h-5 w-5 rounded border flex items-center justify-center transition-colors ${enabled ? 'bg-primary border-primary text-white' : 'bg-white border-gray-300'}`}>
                            {enabled && <CheckSquare className="h-3.5 w-3.5" />}
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

      {/* FOOTER */}
      <div className="shrink-0 p-5 bg-white border-t border-gray-100 rounded-b-2xl">
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors">Cancel Changes</button>
          <button type="submit" disabled={loading || !isManager} className="px-8 py-2.5 rounded-xl font-black text-white bg-green-600 hover:bg-green-700 shadow-sm transition-colors disabled:opacity-50">
            {loading ? 'Saving...' : 'Save Matrix'}
          </button>
        </div>
      </div>
    </form>
  );
};

export default UserRoleModal;