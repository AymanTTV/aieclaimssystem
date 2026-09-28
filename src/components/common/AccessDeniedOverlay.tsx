// src/components/common/AccessDeniedOverlay.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ShieldAlert, 
  ArrowLeft, 
  Home, 
  LogOut, 
  Lock, 
  HelpCircle, 
  ChevronDown, 
  ChevronUp,
  UserCheck,
  ShieldCheck,
  ExternalLink,
  X
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { auth } from '../../lib/firebase';
import { ROUTES } from '../../routes';

export interface AccessDeniedOverlayProps {
  module?: string;
  action?: string;
  title?: string;
  description?: string;
  isStandalone?: boolean;
  isModal?: boolean;
  onClose?: () => void;
}

// Friendly page names for modules
const MODULE_NAMES: Record<string, string> = {
  dashboard: 'Executive Dashboard',
  vehicles: 'Fleet & Vehicle Management',
  utilisation: 'Fleet Utilisation Analytics',
  maintenance: 'Service & Maintenance Records',
  rentals: 'Rental Agreements & Contracts',
  accidents: 'Accident Reports & Claims',
  claims: 'Insurance & Damage Claims',
  vdFinance: 'Vehicle Damage Finance',
  vdInvoice: 'Vehicle Damage Invoices',
  driverPay: 'Skyline Cabs Driver Pay',
  pettyCash: 'Finance Petty Cash',
  aiePettyCash: 'Skyline Petty Cash',
  incomeExpense: 'General Income & Expense',
  skylineIncomeExpense: 'Skyline Income & Expense',
  finance: 'Corporate Finance Overview',
  invoices: 'Billing & Customer Invoices',
  vatRecord: 'VAT Accounting Records',
  share: 'Document & Record Sharing',
  members: 'Members & Drivers Directory',
  customers: 'Customer Accounts',
  products: 'Parts & Products Inventory',
  whatsapp: 'WhatsApp Communications',
  bulkEmail: 'Bulk Email Dispatcher',
  waiting: 'Waiting List Management',
  company: 'Company & Managers',
  trash: 'Recycle Bin & Data Purge',
  users: 'User Accounts & Access Matrix',
  todo: 'Operational To-Do Tasks',
  settings: 'System Configuration',
  automation: 'Central Automation Control',
  highRisk: 'High-Risk Driver Database',
  memberProfile: 'Member Portal Profile',
  memberRentals: 'Member Portal Rentals',
  memberTransactions: 'Member Portal Transactions',
  memberInvoices: 'Member Portal Invoices',
};

export const AccessDeniedOverlay: React.FC<AccessDeniedOverlayProps> = ({
  module = 'general',
  action = 'view',
  title = 'Access Denied — Restricted Module',
  description,
  isStandalone = false,
  isModal = false,
  onClose,
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);

  const friendlyModuleName = MODULE_NAMES[module] || module.replace(/([A-Z])/g, ' $1').trim();

  // Inspect the raw flag in user permissions matrix
  const modulePerms = (user?.permissions as any)?.[module];
  const matrixFlagValue = modulePerms ? String(modulePerms[action]) : 'undefined';

  const handleLogout = async () => {
    try {
      await auth.signOut();
      navigate(ROUTES.LOGIN);
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const handleGoBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate(ROUTES.DASHBOARD);
    }
  };

  const containerClasses = isModal
    ? "w-full"
    : isStandalone
    ? "min-h-screen w-full flex items-center justify-center p-4 sm:p-6 bg-slate-900/95 backdrop-blur-md"
    : "w-full py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center min-h-[75vh]";

  return (
    <div className={containerClasses} data-testid="access-denied-overlay">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-rose-100 overflow-hidden transition-all duration-200">
        
        {/* Top Warning Banner */}
        <div className="bg-gradient-to-r from-rose-600 via-red-600 to-rose-700 px-6 py-5 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white/15 backdrop-blur-sm rounded-xl border border-white/20">
              <ShieldAlert className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="text-xs uppercase tracking-widest font-mono font-bold text-rose-200">
                Security Policy Enforcement
              </span>
              <h1 className="text-lg sm:text-xl font-black text-white leading-tight">
                {title}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-black/20 rounded-full border border-white/10 text-[11px] font-mono font-semibold text-rose-100">
              <Lock className="w-3.5 h-3.5 text-rose-300" />
              <span>HTTP 403</span>
            </div>
            {isModal && onClose && (
              <button
                type="button"
                onClick={onClose}
                className="p-1 rounded-lg bg-black/20 hover:bg-black/40 text-white transition-colors"
                title="Dismiss"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-8 space-y-6">
          
          {/* Main Informational Notice */}
          <div className="flex items-start gap-4 p-4 rounded-xl bg-rose-50/80 border border-rose-200/80">
            <div className="p-2 bg-rose-100 text-rose-700 rounded-lg shrink-0 mt-0.5">
              <Lock className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h2 className="text-sm font-bold text-rose-950">
                Explicit Permission Toggle Required
              </h2>
              <p className="text-xs sm:text-sm text-rose-800 leading-relaxed">
                {description || (
                  <>
                    Under the system's <strong>Universal Explicit-Allow (Deny-by-Default)</strong> security policy, access to{' '}
                    <span className="font-semibold text-rose-950 underline decoration-rose-400">
                      {friendlyModuleName}
                    </span>{' '}
                    is denied. Every feature requires an explicit toggle switched to enabled in your user profile permissions matrix.
                  </>
                )}
              </p>
            </div>
          </div>

          {/* Access Request Details Card */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 border border-slate-200/80 rounded-xl p-4 text-xs">
            <div>
              <span className="text-slate-500 font-medium block">Target Module</span>
              <span className="font-bold text-slate-800 text-sm font-mono flex items-center gap-1.5 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                {module}
              </span>
            </div>

            <div>
              <span className="text-slate-500 font-medium block">Action Requested</span>
              <span className="font-bold text-slate-800 text-sm font-mono uppercase tracking-wide mt-0.5 block">
                {action}
              </span>
            </div>

            <div className="pt-2 border-t border-slate-200/60">
              <span className="text-slate-500 font-medium block">Matrix Flag State</span>
              <span className="font-bold text-rose-700 font-mono text-xs flex items-center gap-1 mt-0.5">
                <span className="px-1.5 py-0.5 rounded bg-rose-100 border border-rose-300">
                  {matrixFlagValue}
                </span>
                <span className="text-slate-400 font-normal">
                  ({matrixFlagValue === 'undefined' ? 'Unassigned' : 'Explicitly False'})
                </span>
              </span>
            </div>

            <div className="pt-2 border-t border-slate-200/60">
              <span className="text-slate-500 font-medium block">Assigned Role</span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-200 text-slate-800 uppercase tracking-wider mt-0.5">
                {user?.role || 'None'}
              </span>
            </div>
          </div>

          {/* Collapsible Technical & Diagnostics Info */}
          <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
            <button
              onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
              className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <span className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-slate-400" />
                How to resolve this access restriction
              </span>
              {showTechnicalDetails ? (
                <ChevronUp className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              )}
            </button>

            {showTechnicalDetails && (
              <div className="px-4 py-3 bg-slate-50/70 border-t border-slate-200 text-xs text-slate-600 space-y-2.5">
                <p>
                  To view this page, an authorized administrator or manager must navigate to:
                </p>
                <div className="p-2.5 bg-slate-900 text-slate-100 rounded-lg font-mono text-[11px] overflow-x-auto shadow-inner">
                  User Management &rarr; Edit Permissions &rarr; {friendlyModuleName} &rarr; Enable "{action}"
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500 pt-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Role templates no longer auto-grant bypasses. Explicit matrix values are required.</span>
                </div>
              </div>
            )}
          </div>

          {/* Action Button Controls */}
          <div className="pt-2 flex flex-col-reverse sm:flex-row items-center justify-between gap-3">
            <button
              onClick={handleLogout}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 text-slate-600 hover:text-slate-900 hover:bg-slate-100 text-xs sm:text-sm font-semibold transition-all"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>

            <div className="w-full sm:w-auto flex items-center gap-2">
              {isModal && onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-semibold shadow-xs transition-all"
                >
                  <X className="w-4 h-4" />
                  Dismiss
                </button>
              )}

              <button
                onClick={handleGoBack}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-semibold shadow-xs transition-all"
              >
                <ArrowLeft className="w-4 h-4" />
                Go Back
              </button>

              <button
                onClick={() => {
                  if (onClose) onClose();
                  navigate(ROUTES.DASHBOARD);
                }}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs sm:text-sm font-bold shadow-md shadow-indigo-600/20 transition-all"
              >
                <Home className="w-4 h-4" />
                Dashboard
              </button>
            </div>
          </div>

        </div>

        {/* Footer info note */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
          <span>Protected Route Guard • Active</span>
          <span className="font-mono">Timestamp: {new Date().toISOString().split('T')[0]}</span>
        </div>

      </div>
    </div>
  );
};

export default AccessDeniedOverlay;
