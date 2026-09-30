// src/components/finance/ProfitPayoutActionBar.tsx
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Account, Transaction, Vehicle, SharedOwnerShare } from '../../types';
import { useFormattedDisplay } from '../../hooks/useFormattedDisplay';
import { ProfitPayoutController, VehicleProfitPeriodResult } from '../../services/ProfitPayoutController';
import { useAuth } from '../../context/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import toast from 'react-hot-toast';
import {
  PieChart,
  ArrowRightLeft,
  History,
  Users,
  Sparkles,
  ChevronRight,
  TrendingUp,
  Calculator,
  ChevronDown,
  Building2,
  UserCheck,
  CheckCircle2,
  Calendar,
  AlertCircle,
  Car,
  RefreshCw,
  Wallet,
  Check,
  Lock,
  X,
  FileCheck,
  ShieldCheck,
} from 'lucide-react';
import { startOfMonth, endOfMonth, subMonths, startOfYear, format } from 'date-fns';

interface ProfitPayoutActionBarProps {
  accounts: Account[];
  vehicles: Vehicle[];
  transactions: Transaction[];
  onOpenPayoutModal: (vehicleId?: string, accountId?: string, tab?: 'payout' | 'history') => void;
  onOpenManageAccounts: () => void;
}

type PeriodPreset = 'this_month' | 'last_month' | 'ytd' | 'all_time';

export const ProfitPayoutActionBar: React.FC<ProfitPayoutActionBarProps> = ({
  accounts = [],
  vehicles = [],
  transactions = [],
  onOpenPayoutModal,
  onOpenManageAccounts,
}) => {
  const { formatCurrency } = useFormattedDisplay();
  const { currentUser } = useAuth();

  // 1. Identify all co-owned vehicles & accounts
  const sharedVehicles = useMemo(() => {
    return vehicles.filter(
      (v) =>
        v.isSharedOwnership ||
        (v.sharedOwnership && v.sharedOwnership.length > 0) ||
        (v.owner?.sharedOwnership && v.owner.sharedOwnership.length > 0)
    );
  }, [vehicles]);

  const sharedAccounts = useMemo(() => {
    return accounts.filter(
      (a) => a.isSharedOwnership || (a.sharedOwnership && a.sharedOwnership.length > 0)
    );
  }, [accounts]);

  // Default selection
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>(() => {
    if (sharedVehicles.length > 0) return sharedVehicles[0].id;
    return 'all';
  });

  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>('this_month');
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [isCalculating, setIsCalculating] = useState<boolean>(false);
  const [calculationResult, setCalculationResult] = useState<VehicleProfitPeriodResult | null>(null);

  // Live fetched ownership model state
  const [fetchedOwnershipModel, setFetchedOwnershipModel] = useState<SharedOwnerShare[] | null>(null);
  const [isLoadingModel, setIsLoadingModel] = useState<boolean>(false);

  // Inline Commit & Settlement Drawer State
  const [showCommitDrawer, setShowCommitDrawer] = useState<boolean>(false);
  const [isCommitting, setIsCommitting] = useState<boolean>(false);
  const [commitSuccessMessage, setCommitSuccessMessage] = useState<string | null>(null);

  // Settlement Form State
  const [payoutReference, setPayoutReference] = useState<string>('');
  const [payoutDate, setPayoutDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [clearOwingBalance, setClearOwingBalance] = useState<boolean>(true);
  const [selectedSourceAccountId, setSelectedSourceAccountId] = useState<string>('');
  const [selectedCompanyAccountId, setSelectedCompanyAccountId] = useState<string>('');
  const [settlementNotes, setSettlementNotes] = useState<string>('');

  // Derive date bounds from period preset
  const dateRange = useMemo(() => {
    const now = new Date();
    switch (periodPreset) {
      case 'this_month':
        return { start: startOfMonth(now), end: endOfMonth(now), label: 'This Month' };
      case 'last_month': {
        const lastMonth = subMonths(now, 1);
        return { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth), label: 'Last Month' };
      }
      case 'ytd':
        return { start: startOfYear(now), end: now, label: 'Year to Date' };
      case 'all_time':
      default:
        return { start: null, end: null, label: 'All Time' };
    }
  }, [periodPreset]);

  // Keep selected vehicle valid if list changes
  useEffect(() => {
    if (selectedVehicleId !== 'all' && !sharedVehicles.some((v) => v.id === selectedVehicleId)) {
      if (sharedVehicles.length > 0) {
        setSelectedVehicleId(sharedVehicles[0].id);
      } else {
        setSelectedVehicleId('all');
      }
    }
  }, [sharedVehicles, selectedVehicleId]);

  // Active Vehicle
  const activeVehicle = useMemo(() => {
    return sharedVehicles.find((v) => v.id === selectedVehicleId);
  }, [sharedVehicles, selectedVehicleId]);

  // 1. Fetch vehicle's live ownership model
  const fetchVehicleOwnershipModel = useCallback(async (vId?: string) => {
    if (!vId || vId === 'all') {
      setFetchedOwnershipModel(null);
      return;
    }

    setIsLoadingModel(true);
    try {
      // First check local prop
      const localVeh = vehicles.find((v) => v.id === vId);
      if (localVeh?.sharedOwnership && localVeh.sharedOwnership.length > 0) {
        setFetchedOwnershipModel(localVeh.sharedOwnership);
        setIsLoadingModel(false);
        return;
      }
      if (localVeh?.owner?.sharedOwnership && localVeh.owner.sharedOwnership.length > 0) {
        setFetchedOwnershipModel(localVeh.owner.sharedOwnership);
        setIsLoadingModel(false);
        return;
      }

      // Query live Firestore doc to ensure freshest configuration
      const docSnap = await getDoc(doc(db, 'vehicles', vId));
      if (docSnap.exists()) {
        const data = docSnap.data();
        const liveShares = data.sharedOwnership || data.owner?.sharedOwnership;
        if (Array.isArray(liveShares) && liveShares.length > 0) {
          setFetchedOwnershipModel(liveShares);
        } else {
          setFetchedOwnershipModel(null);
        }
      } else {
        setFetchedOwnershipModel(null);
      }
    } catch (err) {
      console.warn('Error fetching live vehicle ownership model:', err);
      setFetchedOwnershipModel(null);
    } finally {
      setIsLoadingModel(false);
    }
  }, [vehicles]);

  // Fetch ownership model when selected vehicle changes
  useEffect(() => {
    fetchVehicleOwnershipModel(selectedVehicleId);
  }, [selectedVehicleId, fetchVehicleOwnershipModel]);

  // 2. Trigger calculation logic
  const runCalculation = useCallback(() => {
    setIsCalculating(true);
    setCommitSuccessMessage(null);

    const vehicleId = selectedVehicleId !== 'all' ? selectedVehicleId : undefined;
    const targetVehicle = sharedVehicles.find((v) => v.id === vehicleId);

    const customSplit = fetchedOwnershipModel || targetVehicle?.sharedOwnership || targetVehicle?.owner?.sharedOwnership;

    const result = ProfitPayoutController.calculateNetProfit({
      vehicleId,
      startDate: dateRange.start,
      endDate: dateRange.end,
      transactions,
      accounts,
      vehicles,
      customSplit: customSplit && customSplit.length > 0 ? customSplit : undefined,
    });

    setCalculationResult(result);
    setIsExpanded(true);

    // Auto-prepare default reference code
    const reg = targetVehicle?.registrationNumber || 'SHARED';
    const periodCode = format(new Date(), 'yyyy-MMM').toUpperCase();
    const defaultRef = `PAYOUT-${periodCode}-${reg}`;
    setPayoutReference(defaultRef);

    // Auto-select accounts
    const sourceAcc =
      accounts.find((a) => a.id === targetVehicle?.owner?.accountId) ||
      accounts.find((a) => a.vehicleId === vehicleId) ||
      accounts.find((a) => a.name.toLowerCase().includes(reg.toLowerCase())) ||
      accounts[0];

    const companyAcc =
      accounts.find(
        (a) =>
          a.name.toUpperCase().includes('AIE SKYLINE') ||
          a.name.toUpperCase().includes('COMPANY') ||
          a.name.toUpperCase().includes('MAIN')
      ) || accounts[0];

    if (sourceAcc) setSelectedSourceAccountId(sourceAcc.id);
    if (companyAcc) setSelectedCompanyAccountId(companyAcc.id);

    setTimeout(() => {
      setIsCalculating(false);
    }, 200);
  }, [selectedVehicleId, sharedVehicles, fetchedOwnershipModel, dateRange, transactions, accounts, vehicles]);

  // Recalculate on dependency changes
  useEffect(() => {
    runCalculation();
  }, [selectedVehicleId, periodPreset, transactions, vehicles, accounts, fetchedOwnershipModel, runCalculation]);

  // 3. Commit Payout & Mark Period as Cleared
  const handleCommitPayoutSettlement = async () => {
    if (!calculationResult) return;
    if (!payoutReference.trim()) {
      toast.error('Please enter a valid payout reference.');
      return;
    }

    const sourceAccount = accounts.find((a) => a.id === selectedSourceAccountId) || accounts[0];
    const companyAccount = accounts.find((a) => a.id === selectedCompanyAccountId) || accounts[0];

    if (!sourceAccount) {
      toast.error('Please select a valid source account.');
      return;
    }

    setIsCommitting(true);

    try {
      const vId = selectedVehicleId !== 'all' ? selectedVehicleId : undefined;
      const targetVehicle = sharedVehicles.find((v) => v.id === vId);

      const result = await ProfitPayoutController.executeProfitPayoutAtomicTransaction({
        vehicleId: vId,
        vehicleName: calculationResult.vehicleName || targetVehicle?.registrationNumber,
        sourceAccountId: sourceAccount.id,
        sourceAccountName: sourceAccount.name,
        companyAccountId: companyAccount?.id || 'aie_default',
        companyAccountName: companyAccount?.name || 'AIE SKYLINE ACCOUNTS',
        grossBilled: calculationResult.grossBilled,
        expenses: calculationResult.expenses,
        totalProfit: calculationResult.netProfit,
        companySharePct: calculationResult.companySharePct,
        companyShareAmount: calculationResult.companyShareAmount,
        ownerName: calculationResult.ownerName,
        ownerSharePct: calculationResult.ownerSharePct,
        ownerShareAmount: calculationResult.ownerShareAmount,
        payoutReference: payoutReference.trim(),
        payoutDate: new Date(payoutDate),
        periodCovered: `${dateRange.label} (${calculationResult.periodLabel})`,
        clearOwingBalance,
        clearedBalanceAmount: calculationResult.currentOwingBalance > 0 ? calculationResult.currentOwingBalance : 0,
        notes: settlementNotes,
        currentUser: {
          id: currentUser?.uid,
          name: currentUser?.displayName || currentUser?.email || 'Finance Manager',
          email: currentUser?.email || undefined,
        },
      });

      if (result.success) {
        toast.success(`Profit share payout committed successfully! Ref: ${payoutReference}`);
        setCommitSuccessMessage(
          `Period marked as cleared! Successfully transferred ${formatCurrency(calculationResult.companyShareAmount)} to ${companyAccount?.name || 'Company Account'} and paid ${formatCurrency(calculationResult.ownerShareAmount)} to ${calculationResult.ownerName}.`
        );
        setShowCommitDrawer(false);

        // Notify app
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('finance_updated'));
          window.dispatchEvent(new CustomEvent('accounts_updated'));
        }

        // Re-run calculation to reflect cleared balances
        runCalculation();
      } else {
        toast.error(result.error || 'Failed to commit payout settlement.');
      }
    } catch (err: any) {
      console.error('Error committing profit payout:', err);
      toast.error(err?.message || 'Error executing atomic payout settlement');
    } finally {
      setIsCommitting(false);
    }
  };

  const totalSharedCount = Math.max(sharedAccounts.length, sharedVehicles.length);

  // Resolved ownership display
  const currentShares = useMemo(() => {
    if (calculationResult?.shares && calculationResult.shares.length > 0) {
      return calculationResult.shares;
    }
    if (fetchedOwnershipModel && fetchedOwnershipModel.length > 0) {
      return fetchedOwnershipModel;
    }
    if (activeVehicle?.sharedOwnership && activeVehicle.sharedOwnership.length > 0) {
      return activeVehicle.sharedOwnership;
    }
    return [
      { ownerName: 'AIE Skyline Limited', sharePercentage: 60, isCompany: true },
      { ownerName: activeVehicle?.owner?.name || 'Partner Co-Owner', sharePercentage: 40, isCompany: false },
    ];
  }, [calculationResult, fetchedOwnershipModel, activeVehicle]);

  return (
    <div className="bg-linear-to-r from-slate-950 via-slate-900 to-indigo-950 rounded-2xl p-4 sm:p-5 text-white shadow-xl border border-indigo-900/60 mb-6 transition-all duration-300">
      {/* TOP BAR: Header, Selectors & Primary Action Buttons */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-4 border-b border-indigo-900/40">
        {/* Title & Status Badge */}
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-indigo-500/20 border border-indigo-400/30 rounded-2xl text-indigo-400 shrink-0 shadow-inner">
            <PieChart className="w-6 h-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
                Vehicle Shared Ownership & Profit Distribution
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                Automated Splitter
              </span>
              {totalSharedCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                  {totalSharedCount} Co-Owned {totalSharedCount === 1 ? 'Asset' : 'Assets'}
                </span>
              )}
            </div>
            <p className="text-xs text-indigo-200/80 mt-0.5">
              Fetches ownership model, calculates net profit, and commits company transfers vs. partner payouts.
            </p>
          </div>
        </div>

        {/* Right Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto shrink-0 justify-end">
          <button
            type="button"
            onClick={() => onOpenPayoutModal(undefined, undefined, 'history')}
            className="px-3 py-2 text-xs font-bold text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-800 border border-slate-700 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
          >
            <History className="w-3.5 h-3.5 text-slate-400" />
            Payout History
          </button>

          <button
            type="button"
            onClick={onOpenManageAccounts}
            className="px-3 py-2 text-xs font-bold text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-800 border border-slate-700 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
          >
            <Users className="w-3.5 h-3.5 text-indigo-400" />
            Configure Shares
          </button>

          <button
            type="button"
            onClick={runCalculation}
            disabled={isCalculating}
            className="px-3.5 py-2 text-xs font-extrabold text-indigo-100 hover:text-white bg-indigo-700/60 hover:bg-indigo-600/80 border border-indigo-500/40 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-xs disabled:opacity-50"
            title="Recalculate profit share based on latest ledger entries"
          >
            <Calculator className={`w-3.5 h-3.5 text-indigo-300 ${isCalculating ? 'animate-spin' : ''}`} />
            {isCalculating ? 'Calculating...' : 'Recalculate'}
          </button>

          <button
            type="button"
            onClick={() => {
              setShowCommitDrawer(true);
              setIsExpanded(true);
            }}
            className="px-4 py-2 text-xs font-extrabold text-white bg-linear-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-400 rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Commit Payout & Clear Period
            <ChevronRight className="w-3.5 h-3.5 opacity-80" />
          </button>
        </div>
      </div>

      {/* FILTER, OWNERSHIP MODEL & PERIOD SELECTOR STRIP */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-3.5 pb-2">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Vehicle Selector */}
          <div className="flex items-center gap-1.5 bg-slate-900/90 border border-slate-700/80 rounded-xl px-2.5 py-1.5 shadow-inner">
            <Car className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Asset:</span>
            <select
              value={selectedVehicleId}
              onChange={(e) => setSelectedVehicleId(e.target.value)}
              className="bg-transparent text-xs font-bold text-white focus:outline-hidden cursor-pointer pr-2"
            >
              {sharedVehicles.length === 0 ? (
                <option value="all" className="bg-slate-900 text-white">
                  All Vehicles (Default 60/40 Split)
                </option>
              ) : (
                <>
                  <option value="all" className="bg-slate-900 text-white">
                    All Shared Vehicles ({sharedVehicles.length})
                  </option>
                  {sharedVehicles.map((v) => {
                    const shares = v.sharedOwnership || v.owner?.sharedOwnership || [];
                    const shareText =
                      shares.length > 0
                        ? shares.map((s) => `${s.sharePercentage}% ${s.ownerName.split(' ')[0]}`).join('/')
                        : 'Co-Owned';
                    return (
                      <option key={v.id} value={v.id} className="bg-slate-900 text-white">
                        {v.registrationNumber} {v.make ? `(${v.make} ${v.model || ''})` : ''} — {shareText}
                      </option>
                    );
                  })}
                </>
              )}
            </select>
          </div>

          {/* Period Selector */}
          <div className="flex items-center gap-1.5 bg-slate-900/90 border border-slate-700/80 rounded-xl px-2.5 py-1.5 shadow-inner">
            <Calendar className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Period:</span>
            <select
              value={periodPreset}
              onChange={(e) => setPeriodPreset(e.target.value as PeriodPreset)}
              className="bg-transparent text-xs font-bold text-white focus:outline-hidden cursor-pointer pr-2"
            >
              <option value="this_month" className="bg-slate-900 text-white">This Month</option>
              <option value="last_month" className="bg-slate-900 text-white">Last Month</option>
              <option value="ytd" className="bg-slate-900 text-white">Year to Date (YTD)</option>
              <option value="all_time" className="bg-slate-900 text-white">All Time</option>
            </select>
          </div>

          {/* LIVE FETCHED OWNERSHIP MODEL BADGE */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-indigo-950/70 text-indigo-300 border border-indigo-800/70 shadow-xs">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
            <span className="text-slate-400">Ownership Model:</span>
            {isLoadingModel ? (
              <span className="text-xs text-indigo-300 animate-pulse">Loading model...</span>
            ) : (
              <span className="text-white font-extrabold">
                {currentShares.map((s) => `${s.sharePercentage}% ${s.ownerName}`).join(' / ')}
              </span>
            )}
          </div>
        </div>

        {/* Toggle Summary Breakdown Visibility */}
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-xs font-semibold text-indigo-300 hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
        >
          <span>{isExpanded ? 'Hide Proposed Transfers' : 'Show Proposed Transfers'}</span>
          <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* COMMIT SUCCESS BANNER */}
      {commitSuccessMessage && (
        <div className="mt-3 p-3.5 bg-emerald-950/80 border border-emerald-500/40 rounded-xl text-emerald-200 text-xs flex items-center justify-between gap-3 shadow-inner">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{commitSuccessMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => onOpenPayoutModal(undefined, undefined, 'history')}
            className="text-[11px] font-bold text-emerald-300 hover:text-white underline shrink-0 cursor-pointer"
          >
            View Audit History
          </button>
        </div>
      )}

      {/* SUMMARY VIEW OF PROPOSED TRANSFERS FOR EACH OWNER */}
      {isExpanded && calculationResult && (
        <div className="mt-3 pt-3.5 border-t border-slate-800/80">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 items-stretch">
            {/* 1. Net Profit Engine Metric Card */}
            <div className="md:col-span-4 bg-slate-900/90 rounded-xl p-3.5 border border-slate-800 flex flex-col justify-between shadow-inner">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                  Net Profit Calculation
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-indigo-300 border border-slate-700">
                  {dateRange.label}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 py-1.5 border-y border-slate-800/80 my-1">
                <div>
                  <p className="text-[10px] text-slate-400 font-medium">Gross Billed</p>
                  <p className="text-xs sm:text-sm font-bold text-white">{formatCurrency(calculationResult.grossBilled)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-medium">Expenses</p>
                  <p className="text-xs sm:text-sm font-bold text-rose-400">-{formatCurrency(calculationResult.expenses)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-emerald-400 font-medium">Net Profit</p>
                  <p className="text-xs sm:text-sm font-extrabold text-emerald-400">{formatCurrency(calculationResult.netProfit)}</p>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2">
                <span>Matched: {calculationResult.matchedTransactionsCount} entries</span>
                <span className="text-indigo-300 font-semibold">
                  Net Margin: {calculationResult.grossBilled > 0 ? `${((calculationResult.netProfit / calculationResult.grossBilled) * 100).toFixed(1)}%` : '0%'}
                </span>
              </div>
            </div>

            {/* 2. Proposed Transfers for Each Owner (Company Share vs. Partner Share) */}
            <div className="md:col-span-8 flex flex-col justify-between bg-slate-900/70 rounded-xl p-3.5 border border-indigo-900/40 shadow-inner">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-indigo-300 flex items-center gap-1.5">
                  <ArrowRightLeft className="w-3.5 h-3.5 text-indigo-400" />
                  Summary of Proposed Transfers
                </span>
                <span className="text-[11px] text-slate-400">
                  Split Integrity: <strong className="text-white">100%</strong>
                </span>
              </div>

              {/* Individual Owner Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-2.5">
                {/* COMPANY SHARE CARD */}
                <div className="bg-linear-to-br from-indigo-950/80 to-slate-900/90 rounded-xl p-3 border border-indigo-700/50 shadow-xs relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-xl pointer-events-none" />
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 uppercase">
                        {calculationResult.companySharePct}% Company Share
                      </span>
                      <h4 className="text-xs font-bold text-white mt-1.5 flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5 text-indigo-400" />
                        AIE SKYLINE ACCOUNTS
                      </h4>
                      <p className="text-[11px] text-indigo-200/70">
                        Action: <strong className="text-indigo-300">Internal Transfer</strong>
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">Proposed Transfer</span>
                      <span className="text-base sm:text-lg font-extrabold text-indigo-300">
                        {formatCurrency(calculationResult.companyShareAmount)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* CO-OWNER / PARTNER SHARE CARD */}
                <div className="bg-linear-to-br from-emerald-950/80 to-slate-900/90 rounded-xl p-3 border border-emerald-700/50 shadow-xs relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-xl pointer-events-none" />
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 uppercase">
                        {calculationResult.ownerSharePct}% Partner Share
                      </span>
                      <h4 className="text-xs font-bold text-white mt-1.5 flex items-center gap-1">
                        <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                        {calculationResult.ownerName}
                      </h4>
                      <p className="text-[11px] text-emerald-200/70">
                        Action: <strong className="text-emerald-300">Direct Profit Payout</strong>
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">Proposed Payout</span>
                      <span className="text-base sm:text-lg font-extrabold text-emerald-300">
                        {formatCurrency(calculationResult.ownerShareAmount)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Progress Distribution Bar & Commit Action Trigger */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-slate-800">
                {/* Segmented Split Bar */}
                <div className="w-full sm:w-2/3">
                  <div className="flex items-center justify-between text-[10px] font-semibold text-slate-400 mb-1">
                    <span className="text-indigo-300">Company: {calculationResult.companySharePct}%</span>
                    <span className="text-emerald-300">Partner: {calculationResult.ownerSharePct}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden flex">
                    <div
                      className="bg-indigo-500 h-full transition-all duration-300"
                      style={{ width: `${calculationResult.companySharePct}%` }}
                    />
                    <div
                      className="bg-emerald-500 h-full transition-all duration-300"
                      style={{ width: `${calculationResult.ownerSharePct}%` }}
                    />
                  </div>
                </div>

                {/* Commit Payout & Clear Period Button */}
                <button
                  type="button"
                  onClick={() => setShowCommitDrawer(!showCommitDrawer)}
                  className="w-full sm:w-auto px-4 py-2 text-xs font-extrabold text-white bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md shrink-0"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {showCommitDrawer ? 'Close Settlement Form' : 'Commit Payout & Clear Period'}
                </button>
              </div>
            </div>
          </div>

          {/* INLINE COMMIT SETTLEMENT & CLEAR PERIOD DRAWER */}
          {showCommitDrawer && (
            <div className="mt-4 p-4 bg-slate-900 border border-emerald-500/40 rounded-xl shadow-2xl transition-all duration-300">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-emerald-400" />
                  <h4 className="text-sm font-bold text-white">
                    Confirm Profit Payout & Mark Period as Cleared
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCommitDrawer(false)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                {/* Payout Reference */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">
                    Payout Reference *
                  </label>
                  <input
                    type="text"
                    value={payoutReference}
                    onChange={(e) => setPayoutReference(e.target.value)}
                    placeholder="e.g. PAYOUT-2026-SEP-A1"
                    className="w-full px-3 py-1.5 text-xs bg-slate-800 border border-slate-700 rounded-lg text-white font-mono focus:outline-hidden focus:border-indigo-400"
                  />
                </div>

                {/* Payout Date */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">
                    Payout Settlement Date *
                  </label>
                  <input
                    type="date"
                    value={payoutDate}
                    onChange={(e) => setPayoutDate(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-hidden focus:border-indigo-400 cursor-pointer"
                  />
                </div>

                {/* Source Vehicle Account */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">
                    Source Vehicle Account
                  </label>
                  <select
                    value={selectedSourceAccountId}
                    onChange={(e) => setSelectedSourceAccountId(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-hidden focus:border-indigo-400 cursor-pointer"
                  >
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Company Destination Account */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">
                    Company Destination Account
                  </label>
                  <select
                    value={selectedCompanyAccountId}
                    onChange={(e) => setSelectedCompanyAccountId(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-hidden focus:border-indigo-400 cursor-pointer"
                  >
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Settlement Options & Confirmation */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-3 border-t border-slate-800">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300 select-none">
                  <input
                    type="checkbox"
                    checked={clearOwingBalance}
                    onChange={(e) => setClearOwingBalance(e.target.checked)}
                    className="rounded-sm border-slate-700 bg-slate-800 text-emerald-500 focus:ring-emerald-400 w-4 h-4 cursor-pointer"
                  />
                  <span>
                    Zero out / reconcile <strong>Owing to Owners</strong> balance for this period ({formatCurrency(calculationResult.currentOwingBalance)})
                  </span>
                </label>

                <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    onClick={() => setShowCommitDrawer(false)}
                    className="px-3 py-1.5 text-xs font-bold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-all cursor-pointer"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={handleCommitPayoutSettlement}
                    disabled={isCommitting}
                    className="px-4 py-2 text-xs font-extrabold text-white bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 rounded-xl shadow-lg transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
                  >
                    {isCommitting ? (
                      'Committing Settlement...'
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        Execute Payout & Mark Period Cleared
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ProfitPayoutActionBar;
