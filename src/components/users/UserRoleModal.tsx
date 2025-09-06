// src/components/users/UserRoleModal.tsx

import React, { useMemo, useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { User } from '../../types';
import {
  DEFAULT_PERMISSIONS,
  type RolePermissions,
  type Permission, // for keyof below
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
];

// Map every module key to a friendly section title
const SECTION_TITLE_MAP: Record<keyof RolePermissions, string> = {
  dashboard: 'Dashboard',
  vehicles: 'Vehicles',
  maintenance: 'Maintenance',
  rentals: 'Rentals',
  accidents: 'Accidents',
  claims: 'Claims',
  personalInjury: 'Personal Injury',
  finance: 'Finance',
  invoices: 'Invoices',
  pettyCash: 'Petty Cash',
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

  // Admin actions on members
  members: 'Members (Admin Actions)',

  // Member-portal modules
  memberProfile: 'Member — Profile',
  memberRentals: 'Member — Rentals',
  memberTransactions: 'Member — Transactions',
  memberInvoices: 'Member — Invoices',
};

// Keys used by the member portal area
const MEMBER_PORTAL_KEYS: Array<keyof RolePermissions> = [
  'memberProfile',
  'memberRentals',
  'memberTransactions',
  'memberInvoices',
];

const isMemberPortalKey = (k: keyof RolePermissions) => MEMBER_PORTAL_KEYS.includes(k);

const UserRoleModal: React.FC<UserRoleModalProps> = ({ user, onClose }) => {
  const { user: currentUser } = useAuth();
  const isManager = currentUser?.role === 'manager' || currentUser?.role === 'admin';

  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState<User['role']>(user.role);

  // SAFE initial permissions: if user.permissions is missing, fall back to defaults for their role
  const safeInitial: RolePermissions = useMemo(
    () => (user.permissions || DEFAULT_PERMISSIONS[user.role]),
    [user.permissions, user.role]
  );

  const [customPermissions, setCustomPermissions] = useState<RolePermissions>(safeInitial);

  // UI niceties
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({}); // remember which sections are expanded

  // Decide which modules to render based on selected role & query
  const filteredEntries = useMemo(() => {
    const q = query.trim().toLowerCase();
    const entries = Object.entries(customPermissions) as [keyof RolePermissions, any][];

    // Show only relevant set for the selected role:
    // - If editing a MEMBER, only show member-portal modules
    // - If editing a non-member, show all except the member-portal modules (but DO include 'members' admin action)
    const roleFiltered = entries.filter(([key]) => {
      if (role === 'member') return isMemberPortalKey(key);
      // non-member roles → hide member-portal modules
      return !isMemberPortalKey(key) || key === 'members';
    });

    if (!q) return roleFiltered;

    return roleFiltered.filter(([key]) => SECTION_TITLE_MAP[key].toLowerCase().includes(q));
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

  const resetToRole = (newRole: User['role']) => {
    setRole(newRole);
    setCustomPermissions(DEFAULT_PERMISSIONS[newRole]);
  };

  const disabledClass = !isManager ? 'opacity-60 cursor-not-allowed' : '';

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs text-gray-500">Editing permissions for</div>
          <div className="mt-0.5 text-lg font-semibold text-gray-900">
            {user.name || user.email || 'User'}
          </div>
          <div className="mt-1 inline-flex items-center gap-2 text-sm">
            <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 px-2 py-0.5 text-gray-600">
              <ShieldCheck className="h-4 w-4" />
              Current role: <strong className="ml-1">{user.role}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Role selector + search */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="sm:col-span-1">
          <label className="block text-sm font-medium text-gray-700">Role</label>
          <div className={`mt-1 relative`}>
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
              <ShieldCheck className="h-4 w-4 text-gray-400" />
            </span>
            <select
              value={role}
              onChange={(e) => resetToRole(e.target.value as User['role'])}
              className={`block w-full rounded-lg border border-gray-300 bg-white pl-9 pr-3 py-2 text-sm shadow-sm focus:border-primary focus:ring-primary ${!isManager ? 'bg-gray-100 ' + disabledClass : ''}`}
              disabled={!isManager}
            >
              <option value="manager">Manager</option>
              <option value="admin">Admin</option>
              <option value="finance">Finance</option>
              <option value="claims">Claims</option>
              <option value="member">Member</option>
            </select>
          </div>
        </div>

        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700">Quick search</label>
          <div className="mt-1 relative">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
              <Search className="h-4 w-4 text-gray-400" />
            </span>
            <input
              type="text"
              placeholder="Filter modules (e.g., Rentals, Vehicles, Invoices)…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white pl-9 pr-3 py-2 text-sm shadow-sm focus:border-primary focus:ring-primary"
            />
          </div>
        </div>
      </div>

      {/* Permissions sections */}
      <div className="space-y-3">
        {filteredEntries.map(([module, permissions]) => {
          const title = SECTION_TITLE_MAP[module];
          const isOpen = expanded[module] ?? true; // default open
          const toggleOpen = () =>
            setExpanded((prev) => ({ ...prev, [module]: !isOpen }));

          // Build ordered action list for this module
          const entries = Object.entries(permissions || {}) as [PermissionAction, boolean][];
          const ordered = entries.sort(
            (a, b) => ACTION_ORDER.indexOf(a[0]) - ACTION_ORDER.indexOf(b[0])
          );

          return (
            <div key={module} className="rounded-xl border border-gray-200 bg-white shadow-sm">
              <button
                type="button"
                onClick={toggleOpen}
                className="flex w-full items-center justify-between px-4 py-3"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-900">{title}</span>
                  {/* quick glance chips */}
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
                {isOpen ? (
                  <ChevronUp className="h-5 w-5 text-gray-400" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-400" />
                )}
              </button>

              {isOpen && (
                <div className="border-t border-gray-100 px-4 py-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                    {ordered.map(([action, enabled]) => {
                      // hide rental-type flags except inside rentals
                      if (
                        module !== 'rentals' &&
                        (action === 'daily' || action === 'weekly' || action === 'claim')
                      ) {
                        return null;
                      }

                      const label =
                        FRIENDLY_LABELS[action] ||
                        action.charAt(0).toUpperCase() + action.slice(1);

                      return (
                        <label
                          key={action}
                          className={`group relative flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm transition hover:bg-white hover:shadow-sm ${!isManager ? 'opacity-60' : ''}`}
                        >
                          <input
                            type="checkbox"
                            className={`h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary ${!isManager ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                            checked={!!enabled}
                            onChange={() =>
                              toggleAction(module as keyof RolePermissions, action)
                            }
                            disabled={!isManager}
                          />
                          <span className="text-gray-800">{label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {filteredEntries.length === 0 && (
          <div className="rounded-lg border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">
            No modules match “{query}”.
          </div>
        )}
      </div>

      {/* Sticky footer actions */}
      <div className="sticky bottom-0 -mb-4 mt-6 bg-gradient-to-t from-white via-white/90 to-transparent pt-3">
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
            className={`inline-flex items-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm transition ${
              isManager ? 'hover:bg-primary-600' : 'opacity-60 cursor-not-allowed'
            }`}
          >
            {loading ? 'Updating…' : 'Update permissions'}
          </button>
        </div>
      </div>
    </form>
  );
};

export default UserRoleModal;
