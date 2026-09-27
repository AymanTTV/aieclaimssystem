// src/components/users/SyncPermissionsModal.tsx
import React, { useState, useMemo, useEffect } from 'react';
import { 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldCheck, 
  Search, 
  X, 
  Check, 
  Layers, 
  ExternalLink,
  Copy,
  Sliders,
  Filter
} from 'lucide-react';
import { doc, writeBatch } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { User } from '../../types';
import { 
  RolePermissions, 
  Permission, 
  Role,
  DEFAULT_PERMISSIONS, 
  BASE_PERMISSIONS_BY_MODULE, 
  MODULE_ACTION_BAR_CATALOG 
} from '../../types/roles';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

export type PermissionAction = keyof Permission;

export interface MissingActionItem {
  id: string;
  moduleKey: keyof RolePermissions;
  pageName: string;
  routePath: string;
  action: PermissionAction;
  friendlyLabel: string;
  issueType: 'missing_in_user_schema' | 'missing_in_base_schema' | 'missing_in_defaults' | 'unassigned';
  severity: 'error' | 'warning' | 'info';
  remediation: string;
}

export interface SyncAuditReport {
  timestamp: Date;
  totalModulesScanned: number;
  totalActionsAudited: number;
  missingItems: MissingActionItem[];
  syncedModulesCount: number;
  moduleBreakdown: Array<{
    moduleKey: keyof RolePermissions;
    pageName: string;
    routePath: string;
    totalExpected: number;
    syncedCount: number;
    missingCount: number;
    actions: Array<{
      action: PermissionAction;
      friendlyLabel: string;
      isSynced: boolean;
      issueType?: string;
    }>;
  }>;
}

export const PAGE_DEFINITIONS: Record<keyof RolePermissions, { pageName: string; routePath: string }> = {
  dashboard: { pageName: 'Dashboard', routePath: '/' },
  vehicles: { pageName: 'Vehicles', routePath: '/vehicles' },
  utilisation: { pageName: 'Fleet Utilisation', routePath: '/utilisation' },
  maintenance: { pageName: 'Maintenance', routePath: '/maintenance' },
  rentals: { pageName: 'Rentals', routePath: '/rentals' },
  accidents: { pageName: 'Accidents', routePath: '/accidents' },
  claims: { pageName: 'Claims', routePath: '/claims' },
  vdFinance: { pageName: 'VD Finance', routePath: '/claims/vd-finance' },
  vdInvoice: { pageName: 'VD Invoice', routePath: '/claims/vd-invoice' },
  driverPay: { pageName: 'Driver Pay', routePath: '/skyline-caps/driver-pay' },
  pettyCash: { pageName: 'AIE Petty Cash', routePath: '/finance/petty-cash' },
  aiePettyCash: { pageName: 'Skyline Petty Cash', routePath: '/skyline-caps/aie-petty-cash' },
  incomeExpense: { pageName: 'AIE Income & Expense', routePath: '/income-expense' },
  skylineIncomeExpense: { pageName: 'Skyline Income & Expense', routePath: '/skyline-caps/income-expense' },
  finance: { pageName: 'Finance', routePath: '/finance' },
  invoices: { pageName: 'Invoices', routePath: '/finance/invoices' },
  vatRecord: { pageName: 'VAT Records', routePath: '/finance/vat-records' },
  customers: { pageName: 'Customers', routePath: '/customers' },
  members: { pageName: 'Members Broadcast', routePath: '/members' },
  users: { pageName: 'Users', routePath: '/users' },
  company: { pageName: 'Company & Managers', routePath: '/company-managers' },
  products: { pageName: 'Products', routePath: '/products' },
  waiting: { pageName: 'Waiting List', routePath: '/waiting' },
  whatsapp: { pageName: 'WhatsApp Communication', routePath: '/whatsapp-communication' },
  bulkEmail: { pageName: 'Bulk Email', routePath: '/bulk-email' },
  todo: { pageName: 'To-Do', routePath: '/todo' },
  trash: { pageName: 'Recycle Bin', routePath: '/trash' },
  settings: { pageName: 'System Settings', routePath: '/settings' },
  automation: { pageName: 'Automation Control', routePath: '/automation' },
  share: { pageName: 'Share System', routePath: '/share' },
  memberProfile: { pageName: 'Member Profile', routePath: '/members/profile' },
  memberRentals: { pageName: 'Member Rentals', routePath: '/members/rentals' },
  memberTransactions: { pageName: 'Member Transactions', routePath: '/members/transactions' },
  memberInvoices: { pageName: 'Member Invoices', routePath: '/members/invoices' },
};

export const ACTION_FRIENDLY_NAMES: Partial<Record<PermissionAction, string>> = {
  view: 'View Page',
  create: 'Create Record',
  update: 'Update / Edit',
  delete: 'Delete Record',
  recordPayment: 'Record Payment',
  cards: 'Summary Cards',
  share: 'Share System',
  mileage: 'Mileage Tracker',
  daily: 'Daily Rentals',
  weekly: 'Weekly Rentals',
  claim: 'Claim Rentals',
  export: 'Export Data (CSV/PDF)',
  import: 'Import Data',
  send: 'Dispatch / Send',
  owner: 'Vehicle Owner',
  lock: 'Lock Records',
  unlock: 'Unlock Records',
  syncStatus: 'Sync Status',
  sale: 'Process Sales',
  copyId: 'Copy ID',
  singleDoc: 'Single Document PDF',
  tableStatus: 'Table Status',
  complete: 'Complete Action',
  completed: 'Completed Records',
  categories: 'Manage Categories',
  groups: 'Manage Groups',
  departments: 'Manage Departments',
  recordsPermission: 'Records Permissions',
  availableVehicles: 'Available Vehicles Modal',
  completion: 'Mark Completion',
  discount: 'Apply Discounts',
  note: 'Internal Notes',
  state: 'Change State / Workflow',
  period: 'Pay Period',
  reoccurring: 'Recurring Rules',
  accounts: 'Accounts Ledger',
  assign: 'Bulk Assign Records',
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
  mondayAutoEmail: 'Monday Auto Email',
  bulkEmailScheduler: 'Bulk Email Scheduler',
  scheduler: 'Scheduler Preferences',
  toggleGlobal: 'Toggle Global Automation',
  whatsapp: 'WhatsApp Dispatch',
  email: 'Email Dispatch',
  template: 'Use Templates',
  templateCreate: 'Create Template',
  templateEdit: 'Edit Template',
  templateDelete: 'Delete Template (Protected)',
  reminderTemplate: 'Reminder Templates',
  messageTemplate: 'Message Templates',
  driverRisk: 'Driver Risk Analysis',
  renewalAnalysis: 'Renewal Dossier',
  showCompletedPaid: 'Show Paid / Completed Toggle',
  groupMessaging: 'Group Messaging',
  progressview: 'View Progress Tracker',
  progressedit: 'Edit Progress Tracker',
  mileageHistoryView: 'View Mileage History',
  mileageHistoryEdit: 'Edit Mileage History',
  mileageHistoryDelete: 'Delete Mileage History',
  viewPayment: 'View Payments',
  editPayment: 'Edit Payments',
  deletePayment: 'Delete Payments',
  restore: 'Restore from Recycle Bin',
  deletePermanently: 'Delete Permanently',
};

const MEMBER_PORTAL_KEYS: Array<keyof RolePermissions> = ['memberProfile', 'memberRentals', 'memberTransactions', 'memberInvoices'];
const isMemberPortalKey = (k: keyof RolePermissions) => MEMBER_PORTAL_KEYS.includes(k);

interface SyncPermissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeRole: User['role'];
  user?: User | null;
  customPermissions: RolePermissions;
  onPermissionsSynced?: (updatedPermissions: RolePermissions) => void;
}

export const SyncPermissionsModal: React.FC<SyncPermissionsModalProps> = ({
  isOpen,
  onClose,
  activeRole,
  user,
  customPermissions,
  onPermissionsSynced,
}) => {
  const { user: currentUser } = useAuth();
  const isManager = currentUser?.role === 'manager' || currentUser?.role === 'admin';

  const [query, setQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'missing' | 'synced'>('all');
  const [selectedModule, setSelectedModule] = useState<string>('all');
  const [isSyncing, setIsSyncing] = useState(false);
  const [auditReport, setAuditReport] = useState<SyncAuditReport | null>(null);

  // Cross-check audit function
  const runCrossCheckAudit = (): SyncAuditReport => {
    const missing: MissingActionItem[] = [];
    let totalActions = 0;
    let syncedModules = 0;

    const modulesToScan = (Object.keys(MODULE_ACTION_BAR_CATALOG) as Array<keyof RolePermissions>).filter((modKey) => {
      if (activeRole === 'member') return isMemberPortalKey(modKey);
      return !isMemberPortalKey(modKey);
    });

    const moduleBreakdown = modulesToScan.map((moduleKey) => {
      const pageDef = PAGE_DEFINITIONS[moduleKey] || { pageName: String(moduleKey), routePath: '' };
      const expectedActions = MODULE_ACTION_BAR_CATALOG[moduleKey] || [];
      const currentModulePerms = customPermissions[moduleKey] || {};
      const baseModulePerms = BASE_PERMISSIONS_BY_MODULE[moduleKey] || {};
      const roleDefaults = (DEFAULT_PERMISSIONS[activeRole as Role] || DEFAULT_PERMISSIONS.member)[moduleKey] || {};

      let modMissingCount = 0;
      let modSyncedCount = 0;

      const actionsAudit = expectedActions.map((action) => {
        totalActions++;
        const inUser = (currentModulePerms as Record<string, unknown>)[action] !== undefined;
        const inBase = (baseModulePerms as Record<string, unknown>)[action] !== undefined;
        const inDefaults = (roleDefaults as Record<string, unknown>)[action] !== undefined;
        const friendlyLabel = ACTION_FRIENDLY_NAMES[action] || String(action);

        let isSynced = true;
        let issueType: MissingActionItem['issueType'] = 'missing_in_user_schema';
        let severity: MissingActionItem['severity'] = 'warning';
        let remediation = 'Restore definition to active permissions matrix and sync with role defaults.';

        if (!inUser) {
          isSynced = false;
          issueType = 'missing_in_user_schema';
          severity = 'error';
          remediation = `Add action '${action}' to ${pageDef.pageName} permissions matrix from standard catalog.`;
        } else if (!inBase) {
          isSynced = false;
          issueType = 'missing_in_base_schema';
          severity = 'warning';
          remediation = `Action definition is used in action bar but missing in BASE_${String(moduleKey).toUpperCase()}.`;
        } else if (!inDefaults) {
          isSynced = false;
          issueType = 'missing_in_defaults';
          severity = 'info';
          remediation = `Action is defined in base schema but omitted from ${activeRole} defaults.`;
        }

        if (!isSynced) {
          modMissingCount++;
          missing.push({
            id: `${String(moduleKey)}-${String(action)}`,
            moduleKey,
            pageName: pageDef.pageName,
            routePath: pageDef.routePath,
            action,
            friendlyLabel,
            issueType,
            severity,
            remediation,
          });
        } else {
          modSyncedCount++;
        }

        return {
          action,
          friendlyLabel,
          isSynced,
          issueType: isSynced ? undefined : issueType,
        };
      });

      if (modMissingCount === 0) {
        syncedModules++;
      }

      return {
        moduleKey,
        pageName: pageDef.pageName,
        routePath: pageDef.routePath,
        totalExpected: expectedActions.length,
        syncedCount: modSyncedCount,
        missingCount: modMissingCount,
        actions: actionsAudit,
      };
    });

    return {
      timestamp: new Date(),
      totalModulesScanned: modulesToScan.length,
      totalActionsAudited: totalActions,
      missingItems: missing,
      syncedModulesCount: syncedModules,
      moduleBreakdown,
    };
  };

  // Run audit whenever modal opens or customPermissions change
  useEffect(() => {
    if (isOpen) {
      const rep = runCrossCheckAudit();
      setAuditReport(rep);
    }
  }, [isOpen, customPermissions, activeRole]);

  // Execute full automated sync & repair
  const handleAutoSyncAll = async () => {
    if (!isManager) {
      toast.error('Only administrators or managers can execute permissions synchronization');
      return;
    }

    setIsSyncing(true);
    const toastId = toast.loading('Synchronizing action bar definitions across modules...');

    try {
      const freshReport = runCrossCheckAudit();
      if (freshReport.missingItems.length === 0) {
        toast.success('All action bars are already 100% synchronized with permissions schema!', { id: toastId });
        setIsSyncing(false);
        return;
      }

      // Generate updated permissions object with restored keys
      const updatedPermissions: RolePermissions = JSON.parse(JSON.stringify(customPermissions));

      freshReport.missingItems.forEach((item) => {
        const modKey = item.moduleKey;
        if (!updatedPermissions[modKey]) {
          updatedPermissions[modKey] = { view: false } as Permission;
        }
        const currentMod = updatedPermissions[modKey] as Record<string, boolean>;

        // Resolve appropriate value: check role defaults first, fallback to true for manager/admin, false for others
        const roleDefaultVal = (DEFAULT_PERMISSIONS[activeRole as Role]?.[modKey] as Record<string, boolean> | undefined)?.[item.action];
        const resolvedValue = roleDefaultVal !== undefined ? Boolean(roleDefaultVal) : (activeRole === 'manager' || activeRole === 'admin');

        currentMod[item.action] = resolvedValue;
      });

      // Synchronize in Firestore batch
      const batch = writeBatch(db);
      const roleDocRef = doc(db, 'roleTemplates', activeRole);
      batch.set(
        roleDocRef,
        {
          role: activeRole,
          permissions: updatedPermissions,
          lastSyncedAt: new Date(),
          syncedBy: currentUser?.email || 'admin',
          missingActionDefinitionsFixed: freshReport.missingItems.length,
        },
        { merge: true }
      );

      // If editing a specific user, sync user record too
      if (user?.id) {
        batch.update(doc(db, 'users', user.id), {
          permissions: updatedPermissions,
          updatedAt: new Date(),
        });
      }

      await batch.commit();

      // Notify parent component
      if (onPermissionsSynced) {
        onPermissionsSynced(updatedPermissions);
      }

      // Re-run audit to verify 100% synchronization
      const verifiedReport = runCrossCheckAudit();
      setAuditReport(verifiedReport);

      toast.success(
        `✓ Successfully synchronized and restored ${freshReport.missingItems.length} action definition(s) across all modules!`,
        { id: toastId, duration: 5000 }
      );
    } catch (err) {
      console.error('Failed to auto-sync action bar permissions:', err);
      toast.error('Sync error: ' + (err instanceof Error ? err.message : 'Unknown error'), { id: toastId });
    } finally {
      setIsSyncing(false);
    }
  };

  // Sync a single missing definition
  const handleFixSingleItem = (item: MissingActionItem) => {
    if (!isManager) return;

    const updatedPermissions: RolePermissions = JSON.parse(JSON.stringify(customPermissions));
    const mod = (updatedPermissions[item.moduleKey] || { view: false }) as Record<string, boolean>;
    const roleDefaultVal = (DEFAULT_PERMISSIONS[activeRole as Role]?.[item.moduleKey] as Record<string, boolean> | undefined)?.[item.action];
    mod[item.action] = roleDefaultVal !== undefined ? Boolean(roleDefaultVal) : (activeRole === 'manager' || activeRole === 'admin');
    updatedPermissions[item.moduleKey] = mod as Permission;

    if (onPermissionsSynced) {
      onPermissionsSynced(updatedPermissions);
    }

    toast.success(`Restored definition '${item.action}' on ${item.pageName}`);
  };

  // Copy full audit report to clipboard
  const handleCopyReport = () => {
    if (!auditReport) return;
    const summary = {
      title: 'Action Bar Permissions Cross-Check & Sync Audit',
      timestamp: auditReport.timestamp.toISOString(),
      role: activeRole,
      modulesScanned: auditReport.totalModulesScanned,
      totalActionBarsAudited: auditReport.totalActionsAudited,
      syncedModules: `${auditReport.syncedModulesCount} / ${auditReport.totalModulesScanned}`,
      missingDefinitionsCount: auditReport.missingItems.length,
      discrepancies: auditReport.missingItems.map((m) => ({
        module: m.moduleKey,
        page: m.pageName,
        action: m.action,
        label: m.friendlyLabel,
        issue: m.issueType,
        solution: m.remediation,
      })),
    };

    navigator.clipboard.writeText(JSON.stringify(summary, null, 2));
    toast.success('Audit report JSON copied to clipboard!');
  };

  // Filtered module list for UI
  const filteredModules = useMemo(() => {
    if (!auditReport) return [];

    return auditReport.moduleBreakdown.filter((m) => {
      // Module filter
      if (selectedModule !== 'all' && m.moduleKey !== selectedModule) return false;

      // Status filter
      if (filterMode === 'missing' && m.missingCount === 0) return false;
      if (filterMode === 'synced' && m.missingCount > 0) return false;

      // Search query
      if (query.trim()) {
        const q = query.toLowerCase().trim();
        const matchesName = m.pageName.toLowerCase().includes(q) || m.moduleKey.toLowerCase().includes(q);
        const matchesActions = m.actions.some((a) => a.action.toLowerCase().includes(q) || a.friendlyLabel.toLowerCase().includes(q));
        if (!matchesName && !matchesActions) return false;
      }

      return true;
    });
  }, [auditReport, selectedModule, filterMode, query]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div className="relative w-full max-w-5xl max-h-[92vh] flex flex-col bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* 1. MODAL HEADER */}
        <div className="shrink-0 px-5 sm:px-6 py-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/20 text-indigo-300 ring-1 ring-indigo-400/30">
              <RefreshCw className={`w-5 h-5 ${isSyncing ? 'animate-spin text-indigo-400' : ''}`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold tracking-tight text-white">Action Bar Permissions Cross-Check & Sync</h2>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-bold bg-indigo-500/30 text-indigo-200 ring-1 ring-indigo-400/30">
                  Role: {activeRole.toUpperCase()}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5 font-medium">
                Cross-checks all defined action bars across every module (Claims, Finance, Rentals, Vehicles, etc.) against permissions schemas.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyReport}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer"
              title="Copy JSON Audit Report"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Copy Report</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 2. SUMMARY METRICS RIBBON */}
        {auditReport && (
          <div className="shrink-0 px-5 sm:px-6 py-3 bg-slate-50 border-b border-slate-200">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              
              <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Modules Scanned</span>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className="text-xl font-mono font-black text-slate-900">{auditReport.totalModulesScanned}</span>
                  <span className="text-xs text-slate-400 font-medium">application modules</span>
                </div>
              </div>

              <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Action Definitions Audited</span>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className="text-xl font-mono font-black text-blue-700">{auditReport.totalActionsAudited}</span>
                  <span className="text-xs text-slate-400 font-medium">total checks</span>
                </div>
              </div>

              <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Fully Synced Modules</span>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className="text-xl font-mono font-black text-emerald-700">
                    {auditReport.syncedModulesCount}
                    <span className="text-sm text-slate-400 font-normal">/{auditReport.totalModulesScanned}</span>
                  </span>
                  <span className="text-xs text-emerald-700 font-bold">
                    ({Math.round((auditReport.syncedModulesCount / auditReport.totalModulesScanned) * 100)}%)
                  </span>
                </div>
              </div>

              <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Missing Action Definitions</span>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className={`text-xl font-mono font-black ${auditReport.missingItems.length === 0 ? 'text-emerald-700' : 'text-amber-600'}`}>
                    {auditReport.missingItems.length}
                  </span>
                  {auditReport.missingItems.length === 0 ? (
                    <span className="inline-flex items-center gap-1 text-xs text-emerald-700 font-bold">
                      <CheckCircle2 className="w-3.5 h-3.5" /> 100% Synced
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs text-amber-700 font-bold">
                      <AlertTriangle className="w-3.5 h-3.5" /> Requires Sync
                    </span>
                  )}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* 3. TOOLBAR: SEARCH & FILTERS */}
        <div className="shrink-0 px-5 sm:px-6 py-2.5 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-2.5">
          
          <div className="flex flex-wrap items-center gap-2">
            {/* Filter buttons */}
            <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5">
              <button
                type="button"
                onClick={() => setFilterMode('all')}
                className={`px-2.5 py-1 text-xs font-bold rounded-md transition-colors cursor-pointer ${
                  filterMode === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All Action Bars ({auditReport?.totalModulesScanned || 0})
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('missing')}
                className={`px-2.5 py-1 text-xs font-bold rounded-md transition-colors cursor-pointer flex items-center gap-1 ${
                  filterMode === 'missing' ? 'bg-white text-rose-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>Missing Definitions Only</span>
                {auditReport && auditReport.missingItems.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-100 text-rose-800 font-mono font-black">
                    {auditReport.missingItems.length}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('synced')}
                className={`px-2.5 py-1 text-xs font-bold rounded-md transition-colors cursor-pointer ${
                  filterMode === 'synced' ? 'bg-white text-emerald-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Fully Synced ({auditReport?.syncedModulesCount || 0})
              </button>
            </div>

            {/* Jump to Module */}
            <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2.5 py-1">
              <Filter className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <select
                value={selectedModule}
                onChange={(e) => setSelectedModule(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer max-w-[180px]"
              >
                <option value="all">All Modules</option>
                {auditReport?.moduleBreakdown.map((m) => (
                  <option key={m.moduleKey} value={m.moduleKey}>
                    {m.pageName} ({m.missingCount > 0 ? `⚠️ ${m.missingCount} missing` : '✓ Synced'})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Search Input */}
            <div className="relative w-48 sm:w-60">
              <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search module or action key..."
                className="w-full pl-8 pr-7 py-1 text-xs rounded-lg border border-slate-300 bg-white font-medium placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="absolute right-2 top-1.5 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Re-scan button */}
            <button
              type="button"
              onClick={() => {
                const r = runCrossCheckAudit();
                setAuditReport(r);
                toast.success('Cross-check audit re-evaluated in real time!');
              }}
              className="px-2.5 py-1 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
              title="Re-run cross-check audit"
            >
              <RefreshCw className="w-3 h-3 text-slate-600" />
              <span className="hidden sm:inline">Re-Scan</span>
            </button>
          </div>

        </div>

        {/* 4. MAIN AUDIT REPORT CONTENT */}
        <div className="flex-1 overflow-y-auto min-h-0 p-4 sm:p-6 bg-slate-50/60 space-y-4">
          
          {/* Missing items alert banner if issues identified */}
          {auditReport && auditReport.missingItems.length > 0 ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-4 text-amber-900 shadow-2xs">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-bold text-amber-900">
                      Cross-Check Identified {auditReport.missingItems.length} Missing Action Definition(s)
                    </h3>
                    <p className="text-xs text-amber-800 mt-0.5">
                      The action bars defined in module interfaces (such as Claims, Finance, etc.) contain action keys that are not yet synchronized with the active schema or role template.
                    </p>
                  </div>
                </div>

                {isManager && (
                  <button
                    type="button"
                    onClick={handleAutoSyncAll}
                    disabled={isSyncing}
                    className="shrink-0 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-700 hover:bg-amber-800 text-white font-bold text-xs shadow-xs transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span>Sync & Restore All ({auditReport.missingItems.length})</span>
                  </button>
                )}
              </div>

              {/* Quick itemized chips */}
              <div className="mt-3 flex flex-wrap gap-1.5 pt-2 border-t border-amber-200/80">
                {auditReport.missingItems.map((item) => (
                  <div
                    key={item.id}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs bg-white border border-amber-300 text-amber-900 shadow-2xs"
                  >
                    <span className="font-bold text-slate-700">{item.pageName}:</span>
                    <span className="font-mono font-black text-amber-800">{item.action}</span>
                    <span className="text-[11px] text-slate-500">({item.friendlyLabel})</span>
                    {isManager && (
                      <button
                        type="button"
                        onClick={() => handleFixSingleItem(item)}
                        className="ml-1 px-1.5 py-0.5 text-[10px] font-black rounded bg-amber-100 hover:bg-amber-200 text-amber-900 transition-colors cursor-pointer"
                        title="Sync this definition"
                      >
                        Restore
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-4 text-emerald-900 shadow-2xs flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-emerald-900">
                    All Defined Action Bars Are 100% Synchronized
                  </h3>
                  <p className="text-xs text-emerald-800 mt-0.5">
                    Every action bar across all {auditReport?.totalModulesScanned || 0} modules strictly matches the permissions schema with zero missing definitions.
                  </p>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                ✓ Verified Clean
              </span>
            </div>
          )}

          {/* Module List with Action Bars */}
          <div className="space-y-3">
            {filteredModules.length === 0 ? (
              <div className="text-center py-10 bg-white rounded-xl border border-slate-200">
                <Search className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-700">No action bars matching filter</p>
                <p className="text-xs text-slate-400 mt-1">Try clearing your search query or reset filter settings.</p>
              </div>
            ) : (
              filteredModules.map((mod) => (
                <div
                  key={mod.moduleKey}
                  className={`rounded-xl border transition-all ${
                    mod.missingCount > 0
                      ? 'bg-white border-amber-300 ring-1 ring-amber-400/20'
                      : 'bg-white border-slate-200'
                  }`}
                >
                  {/* Module Item Header */}
                  <div className="px-4 py-2.5 bg-slate-50/80 border-b border-slate-200 rounded-t-xl flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900">{mod.pageName}</span>
                      <span className="font-mono text-xs text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                        {mod.routePath || `/${mod.moduleKey}`}
                      </span>
                      {mod.missingCount > 0 ? (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          <span>{mod.missingCount} Missing Definition{mod.missingCount > 1 ? 's' : ''}</span>
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                          <Check className="w-3 h-3 text-emerald-600 stroke-[3]" />
                          <span>All {mod.totalExpected} Actions Synced</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-slate-500 font-medium">Defined Actions:</span>
                      <span className="font-mono font-bold text-slate-800">
                        {mod.syncedCount}/{mod.totalExpected}
                      </span>
                    </div>
                  </div>

                  {/* Actions Grid for this Module */}
                  <div className="p-3 sm:p-4">
                    <div className="flex flex-wrap gap-1.5">
                      {mod.actions.map((act) => (
                        <div
                          key={act.action}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition-colors ${
                            act.isSynced
                              ? 'bg-slate-50 text-slate-700 border border-slate-200 font-medium'
                              : 'bg-rose-50 text-rose-800 border border-rose-300 font-bold ring-1 ring-rose-400/20'
                          }`}
                          title={act.isSynced ? `Action: ${act.action} (Synced)` : `Action: ${act.action} (${act.issueType})`}
                        >
                          {act.isSynced ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          ) : (
                            <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                          )}
                          <span className="font-mono">{act.action}</span>
                          <span className="text-[11px] text-slate-500 hidden sm:inline">({act.friendlyLabel})</span>

                          {!act.isSynced && isManager && (
                            <button
                              type="button"
                              onClick={() => {
                                const mItem = auditReport?.missingItems.find(
                                  (mi) => mi.moduleKey === mod.moduleKey && mi.action === act.action
                                );
                                if (mItem) handleFixSingleItem(mItem);
                              }}
                              className="ml-1 px-1.5 py-0.5 text-[10px] font-bold rounded bg-rose-200 hover:bg-rose-300 text-rose-900 transition-colors cursor-pointer"
                            >
                              Sync
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

        </div>

        {/* 5. MODAL BOTTOM BAR */}
        <div className="shrink-0 px-5 sm:px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>Last audited: {auditReport?.timestamp.toLocaleTimeString() || 'Just now'}</span>
            <span>•</span>
            <span>Cross-checks all module action bars vs permissions schema</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition-colors cursor-pointer shadow-2xs"
            >
              Close
            </button>

            {isManager && (
              <button
                type="button"
                onClick={handleAutoSyncAll}
                disabled={isSyncing}
                className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-xl transition-all shadow-xs cursor-pointer active:scale-95 disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>
                  {auditReport && auditReport.missingItems.length > 0
                    ? `Sync & Repair All Definitions (${auditReport.missingItems.length})`
                    : 'Sync Permissions (1-Click)'}
                </span>
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default SyncPermissionsModal;
