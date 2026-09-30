// src/components/finance/ProfitPayoutModal.tsx
import React, { useState, useMemo, useEffect } from 'react';
import { Account, ProfitPayoutRecord, SharedOwnerShare, Transaction, Vehicle } from '../../types';
import {
  calculateVehicleProfitAndShare,
  executeProfitPayoutSettlement,
  fetchProfitPayoutHistory,
  VehicleProfitCalculation,
} from '../../services/sharedOwnershipPayout.service';
import { useFormattedDisplay } from '../../hooks/useFormattedDisplay';
import { useAuth, checkUserPermission } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import {
  DollarSign,
  TrendingUp,
  ArrowRightLeft,
  CheckCircle2,
  Calendar,
  Building2,
  User,
  History,
  AlertCircle,
  FileText,
  Clock,
  Car,
  PieChart,
  Percent,
  ShieldAlert,
} from 'lucide-react';
import FormField from '../ui/FormField';

interface ProfitPayoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: Account[];
  transactions: Transaction[];
  vehicles: Vehicle[];
  initialVehicleId?: string;
  initialAccountId?: string;
  initialTab?: 'payout' | 'history';
}

type PeriodPreset = 'this_month' | 'last_month' | 'this_quarter' | 'year_to_date' | 'all_time' | 'custom';

export const ProfitPayoutModal: React.FC<ProfitPayoutModalProps> = ({
  isOpen,
  onClose,
  accounts = [],
  transactions = [],
  vehicles = [],
  initialVehicleId,
  initialAccountId,
  initialTab = 'payout',
}) => {
  const { user } = useAuth();
  const { formatCurrency } = useFormattedDisplay();

  // Permission Check
  const canProcessProfitPayout = Boolean(
    typeof user?.hasPermission === 'function'
      ? user.hasPermission('can_process_profit_payout')
      : checkUserPermission(user, 'can_process_profit_payout')
  );

  const [activeTab, setActiveTab] = useState<'payout' | 'history'>(initialTab);
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [payoutHistory, setPayoutHistory] = useState<ProfitPayoutRecord[]>([]);

  // Find all vehicles or accounts that have shared ownership configured
  const coOwnedVehicles = useMemo(() => {
    return vehicles.filter(
      (v) =>
        v.isSharedOwnership ||
        (v.sharedOwnership && v.sharedOwnership.length > 0) ||
        (v.owner?.sharedOwnership && v.owner.sharedOwnership.length > 0)
    );
  }, [vehicles]);

  const coOwnedAccounts = useMemo(() => {
    return accounts.filter(
      (a) => a.isSharedOwnership || (a.sharedOwnership && a.sharedOwnership.length > 0)
    );
  }, [accounts]);

  // Selected Target strictly scoped
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>(
    initialVehicleId || (coOwnedVehicles[0]?.id ?? vehicles[0]?.id ?? '')
  );
  const [selectedAccountId, setSelectedAccountId] = useState<string>(
    initialAccountId || (coOwnedAccounts[0]?.id ?? accounts[0]?.id ?? '')
  );

  // Auto-resolve associated vehicle account
  const selectedVehicle = useMemo(() => {
    return vehicles.find((v) => v.id === selectedVehicleId);
  }, [vehicles, selectedVehicleId]);

  const vehicleAccount = useMemo(() => {
    if (!selectedVehicleId && !selectedVehicle) return null;
    return (
      accounts.find(
        (a) =>
          (selectedVehicleId && a.vehicleId === selectedVehicleId) ||
          (selectedVehicle?.registrationNumber &&
            a.name.toLowerCase().includes(selectedVehicle.registrationNumber.toLowerCase()))
      ) || null
    );
  }, [accounts, selectedVehicleId, selectedVehicle]);

  // Keep selectedAccountId in sync with selected vehicle's account
  useEffect(() => {
    if (vehicleAccount?.id && selectedAccountId !== vehicleAccount.id) {
      setSelectedAccountId(vehicleAccount.id);
    }
  }, [vehicleAccount]);

  // Period Preset State
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>('this_month');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');

  // Selected Company Account for internal transfer
  const defaultCompanyAccount = useMemo(() => {
    return (
      accounts.find((a) => a.name.toUpperCase().includes('AIE SKYLINE ACCOUNT')) ||
      accounts.find((a) => a.name.toUpperCase().includes('AIE SKYLINE')) ||
      accounts.find((a) => a.name.toUpperCase().includes('MAIN') || a.name.toUpperCase().includes('COMPANY')) ||
      accounts[0]
    );
  }, [accounts]);

  const [companyAccountId, setCompanyAccountId] = useState<string>(
    defaultCompanyAccount?.id || accounts[0]?.id || ''
  );

  // Payout Settlement Form
  const [payoutReference, setPayoutReference] = useState<string>(
    `PAYOUT-${Date.now().toString().slice(-6)}`
  );
  const [payoutDate, setPayoutDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [periodCoveredText, setPeriodCoveredText] = useState<string>('');
  const [clearOwingBalance, setClearOwingBalance] = useState<boolean>(true);
  const [notes, setNotes] = useState<string>('');

  // Calculate Date Range from preset
  const { dateFrom, dateTo } = useMemo(() => {
    const now = new Date();
    if (periodPreset === 'this_month') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      return { dateFrom: start, dateTo: end };
    }
    if (periodPreset === 'last_month') {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      return { dateFrom: start, dateTo: end };
    }
    if (periodPreset === 'this_quarter') {
      const quarter = Math.floor(now.getMonth() / 3);
      const start = new Date(now.getFullYear(), quarter * 3, 1);
      const end = new Date(now.getFullYear(), quarter * 3 + 3, 0, 23, 59, 59, 999);
      return { dateFrom: start, dateTo: end };
    }
    if (periodPreset === 'year_to_date') {
      const start = new Date(now.getFullYear(), 0, 1);
      const end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
      return { dateFrom: start, dateTo: end };
    }
    if (periodPreset === 'custom') {
      const start = customStartDate ? new Date(customStartDate) : null;
      const end = customEndDate ? new Date(`${customEndDate}T23:59:59`) : null;
      return { dateFrom: start, dateTo: end };
    }
    return { dateFrom: null, dateTo: null }; // all_time
  }, [periodPreset, customStartDate, customEndDate]);

  // Compute live profit & share distribution strictly for this vehicle account
  const profitData: VehicleProfitCalculation = useMemo(() => {
    return calculateVehicleProfitAndShare({
      vehicleId: selectedVehicleId || undefined,
      accountId: selectedAccountId || vehicleAccount?.id || undefined,
      startDate: dateFrom,
      endDate: dateTo,
      transactions,
      accounts,
      vehicles,
    });
  }, [selectedVehicleId, selectedAccountId, vehicleAccount, dateFrom, dateTo, transactions, accounts, vehicles]);

  // Synchronize auto period covered text
  useEffect(() => {
    if (periodPreset === 'this_month') {
      const monthStr = new Date().toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
      setPeriodCoveredText(`Profit Share Payout: ${monthStr}`);
    } else if (periodPreset === 'last_month') {
      const lastMonth = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1);
      const monthStr = lastMonth.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
      setPeriodCoveredText(`Profit Share Payout: ${monthStr}`);
    } else {
      setPeriodCoveredText(`Profit Share Payout: ${profitData.periodLabel}`);
    }
  }, [periodPreset, profitData.periodLabel]);

  // Sync company account id
  useEffect(() => {
    if (!companyAccountId && defaultCompanyAccount?.id) {
      setCompanyAccountId(defaultCompanyAccount.id);
    }
  }, [defaultCompanyAccount, companyAccountId]);

  // Load Payout History on tab open
  const loadHistory = async () => {
    setHistoryLoading(true);
    try {
      const logs = await fetchProfitPayoutHistory();
      setPayoutHistory(logs);
    } catch {
      // safe fallback
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadHistory();
    }
  }, [isOpen]);

  const handleExecutePayout = async () => {
    if (!canProcessProfitPayout) {
      toast.error('Unauthorized: You do not have permission to process profit payouts.');
      return;
    }
    if (profitData.netProfit <= 0) {
      toast.error('Cannot payout: Net profit for selected period must be greater than £0.00');
      return;
    }
    if (!companyAccountId) {
      toast.error('Please select a Company Account to receive the company share.');
      return;
    }
    if (!payoutReference.trim()) {
      toast.error('Please enter a payout reference number.');
      return;
    }

    setLoading(true);
    try {
      const compAcc = accounts.find((a) => a.id === companyAccountId);
      const res = await executeProfitPayoutSettlement({
        vehicleId: profitData.vehicleId,
        vehicleName: profitData.vehicleName,
        sourceAccountId: profitData.accountId || selectedAccountId || vehicleAccount?.id || 'source_acc',
        sourceAccountName: profitData.accountName || vehicleAccount?.name || 'Vehicle Account',
        companyAccountId,
        companyAccountName: compAcc?.name || 'AIE SKYLINE ACCOUNTS',
        grossBilled: profitData.revenue,
        expenses: profitData.expenses,
        totalProfit: profitData.netProfit,
        companySharePct: profitData.companySharePct,
        companyShareAmount: profitData.companyShareAmount,
        ownerName: profitData.ownerName,
        ownerSharePct: profitData.ownerSharePct,
        ownerShareAmount: profitData.ownerShareAmount,
        payoutReference: payoutReference.trim(),
        payoutDate: new Date(payoutDate),
        periodCovered: periodCoveredText.trim() || profitData.periodLabel,
        clearOwingBalance,
        clearedBalanceAmount: clearOwingBalance ? profitData.currentOwingBalance : 0,
        notes: notes.trim(),
        currentUser: {
          id: user?.id,
          name: user?.name || user?.email,
          email: user?.email,
        },
      });

      if (res.success) {
        toast.success(
          `Successfully processed profit payout! £${profitData.companyShareAmount} transferred to Company, £${profitData.ownerShareAmount} paid to ${profitData.ownerName}.`
        );
        await loadHistory();
        setActiveTab('history');
      } else {
        toast.error(res.message || 'Failed to process payout settlement');
      }
    } catch (err: any) {
      console.error('Error executing payout:', err);
      toast.error(err?.message || 'Error executing payout settlement');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] overflow-hidden">
        {/* MODAL HEADER */}
        <div className="px-6 py-5 border-b border-slate-200 bg-linear-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-500/20 border border-indigo-400/30 rounded-2xl text-indigo-300">
              <PieChart className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold tracking-tight">
                Vehicle Shared Ownership & Profit Payout
              </h2>
              <p className="text-xs text-indigo-200/80">
                Automated share splitting, company transfer, and co-owner payout settlement.
              </p>
            </div>
          </div>

          {/* TAB SWITCHER */}
          <div className="flex items-center gap-2">
            <div className="flex bg-slate-800/80 p-1 rounded-xl border border-slate-700">
              <button
                type="button"
                onClick={() => setActiveTab('payout')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'payout'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Distribute Payout
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('history');
                  loadHistory();
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'history'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <History className="w-3.5 h-3.5" />
                Audit Trail ({payoutHistory.length})
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>

        {/* MODAL CONTENT */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Permission Warning if not authorized */}
          {!canProcessProfitPayout && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3 text-amber-900">
              <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-amber-950">
                  Read-Only Access
                </h4>
                <p className="text-xs text-amber-800 mt-0.5">
                  You do not have permission to execute profit share payouts. Payout controls are disabled.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'payout' ? (
            <>
              {/* TARGET SELECTION & PERIOD FILTER */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                {/* Vehicle Account Selector */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Select Vehicle Account
                  </label>
                  <select
                    value={selectedVehicleId}
                    onChange={(e) => {
                      const vId = e.target.value;
                      setSelectedVehicleId(vId);
                      const veh = vehicles.find((v) => v.id === vId);
                      const acc = accounts.find(
                        (a) =>
                          (vId && a.vehicleId === vId) ||
                          (veh?.registrationNumber &&
                            a.name.toLowerCase().includes(veh.registrationNumber.toLowerCase()))
                      );
                      if (acc) {
                        setSelectedAccountId(acc.id);
                      }
                    }}
                    className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-xl font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {vehicles.map((v) => {
                      const isShared =
                        v.isSharedOwnership ||
                        (v.sharedOwnership && v.sharedOwnership.length > 0) ||
                        (v.owner?.sharedOwnership && v.owner.sharedOwnership.length > 0);
                      const linkedAcc = accounts.find(
                        (a) =>
                          a.vehicleId === v.id ||
                          (v.registrationNumber &&
                            a.name.toLowerCase().includes(v.registrationNumber.toLowerCase()))
                      );
                      return (
                        <option key={v.id} value={v.id}>
                          {v.make} {v.model} ({v.registrationNumber}) {linkedAcc ? `• Acc: ${linkedAcc.name}` : ''} {isShared ? '⭐ [Shared]' : ''}
                        </option>
                      );
                    })}
                  </select>
                  {vehicleAccount && (
                    <p className="text-[11px] text-slate-500 mt-1 font-medium">
                      Linked Vehicle Account: <strong className="text-slate-800">{vehicleAccount.name}</strong> (Balance: {formatCurrency(Number(vehicleAccount.balance || 0))})
                    </p>
                  )}
                </div>

                {/* Period Preset */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Accounting Period
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { id: 'this_month', label: 'This Month' },
                      { id: 'last_month', label: 'Last Month' },
                      { id: 'this_quarter', label: 'Quarter' },
                      { id: 'year_to_date', label: 'YTD' },
                      { id: 'all_time', label: 'All Time' },
                      { id: 'custom', label: 'Custom' },
                    ].map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setPeriodPreset(p.id as PeriodPreset)}
                        className={`py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer border ${
                          periodPreset === p.id
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                            : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom Date Pickers if selected */}
                {periodPreset === 'custom' && (
                  <div className="col-span-1 md:col-span-2 grid grid-cols-2 gap-3 pt-2">
                    <FormField
                      label="From Date"
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                    />
                    <FormField
                      label="To Date"
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                    />
                  </div>
                )}
              </div>

              {/* OWNERSHIP SPLIT BADGE BAR */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-indigo-50/70 border border-indigo-200 rounded-2xl">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 text-xs font-extrabold uppercase tracking-wider bg-indigo-600 text-white rounded-lg shadow-xs">
                    Configured Split
                  </span>
                  <div className="flex items-center gap-2 text-xs font-bold text-indigo-900">
                    {profitData.shares.map((s, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-0.5 rounded-full bg-white border border-indigo-200 shadow-2xs text-indigo-800"
                      >
                        {s.ownerName}: <strong className="text-indigo-950">{s.sharePercentage}%</strong>
                      </span>
                    ))}
                  </div>
                </div>

                <div className="text-xs text-slate-500 font-medium">
                  Covering: <strong className="text-slate-800">{profitData.periodLabel}</strong> ({profitData.matchedTransactionsCount} entries strictly scoped)
                </div>
              </div>

              {/* ONLY 3 CLEAN ACCOUNT SUMMARY CARDS */}
              <div>
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 text-xs flex items-center justify-center font-bold">1</span>
                  Vehicle Account Financial Summary ({profitData.periodLabel})
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Card 1: ACCOUNT TOTAL INCOME */}
                  <div className="bg-emerald-50/60 border border-emerald-200 rounded-2xl p-4 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-extrabold text-emerald-800 uppercase tracking-wider">
                        ACCOUNT TOTAL INCOME
                      </p>
                      <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-800 rounded-md">
                        Realized Cash
                      </span>
                    </div>
                    <p className="text-2xl font-black font-mono text-emerald-900 mt-1.5">
                      {formatCurrency(profitData.revenue)}
                    </p>
                    <p className="text-[11px] text-emerald-700 mt-0.5 font-medium">
                      Realized / Collected cash only
                    </p>
                  </div>

                  {/* Card 2: ACCOUNT TOTAL EXPENSES */}
                  <div className="bg-rose-50/60 border border-rose-200 rounded-2xl p-4 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-extrabold text-rose-800 uppercase tracking-wider">
                        ACCOUNT TOTAL EXPENSES
                      </p>
                      <span className="px-2 py-0.5 text-[10px] font-bold bg-rose-100 text-rose-800 rounded-md">
                        Actual Outflow
                      </span>
                    </div>
                    <p className="text-2xl font-black font-mono text-rose-900 mt-1.5">
                      {formatCurrency(profitData.expenses)}
                    </p>
                    <p className="text-[11px] text-rose-700 mt-0.5 font-medium">
                      Actual expenses incurred
                    </p>
                  </div>

                  {/* Card 3: ACCOUNT NET PROFIT */}
                  <div className={`border rounded-2xl p-4 shadow-xs ${
                    profitData.netProfit > 0
                      ? 'bg-indigo-50/70 border-indigo-300'
                      : 'bg-slate-100/80 border-slate-300'
                  }`}>
                    <div className="flex items-center justify-between">
                      <p className={`text-xs font-extrabold uppercase tracking-wider ${
                        profitData.netProfit > 0 ? 'text-indigo-900' : 'text-slate-700'
                      }`}>
                        ACCOUNT NET PROFIT
                      </p>
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md ${
                        profitData.netProfit > 0
                          ? 'bg-indigo-100 text-indigo-800'
                          : 'bg-slate-200 text-slate-700'
                      }`}>
                        Income - Expenses
                      </span>
                    </div>
                    <p className={`text-2xl font-black font-mono mt-1.5 ${
                      profitData.netProfit > 0
                        ? 'text-indigo-950'
                        : profitData.netProfit < 0
                        ? 'text-rose-700'
                        : 'text-slate-800'
                    }`}>
                      {formatCurrency(profitData.netProfit)}
                    </p>
                    <p className={`text-[11px] mt-0.5 font-semibold ${
                      profitData.netProfit > 0 ? 'text-indigo-700' : 'text-slate-500'
                    }`}>
                      {profitData.netProfit > 0
                        ? 'Distributable Net Profit'
                        : 'No distributable profit available'}
                    </p>
                  </div>
                </div>

                {/* Handle Negative / Zero Profit Warning */}
                {profitData.netProfit <= 0 && (
                  <div className="mt-3 p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3 text-amber-900 text-xs">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    <div>
                      <strong className="font-bold">No distributable profit available: </strong>
                      Vehicle Account Net Profit is {formatCurrency(profitData.netProfit)} (must be greater than £0.00). Profit share payout is disabled for this period.
                    </div>
                  </div>
                )}
              </div>

              {/* STEP 2: AUTOMATED SHARE SPLIT BREAKDOWN */}
              <div>
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 text-xs flex items-center justify-center font-bold">2</span>
                  Automated Share Splitting
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* COMPANY SHARE CARD */}
                  <div className="bg-white border-2 border-indigo-200 rounded-2xl p-5 shadow-xs relative overflow-hidden">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-indigo-50 text-indigo-700 rounded-xl">
                          <Building2 className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Company Share</p>
                          <h5 className="text-base font-bold text-slate-900">AIE Skyline Limited</h5>
                        </div>
                      </div>
                      <span className="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full font-extrabold text-sm">
                        {profitData.companySharePct}% Share
                      </span>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-baseline justify-between">
                      <span className="text-xs font-semibold text-slate-600">Company Transfer Amount:</span>
                      <span className="text-2xl font-black font-mono text-indigo-600">
                        {formatCurrency(profitData.companyShareAmount)}
                      </span>
                    </div>

                    <div className="mt-3">
                      <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                        Destination Company Account (Internal Transfer):
                      </label>
                      <select
                        value={companyAccountId}
                        onChange={(e) => setCompanyAccountId(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-800 font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      >
                        {accounts.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.name} ({formatCurrency(Number(a.balance || 0))})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* CO-OWNER / PARTNER SHARE CARD */}
                  <div className="bg-white border-2 border-emerald-200 rounded-2xl p-5 shadow-xs relative overflow-hidden">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl">
                          <User className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Partner Share</p>
                          <h5 className="text-base font-bold text-slate-900">{profitData.ownerName}</h5>
                        </div>
                      </div>
                      <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full font-extrabold text-sm">
                        {profitData.ownerSharePct}% Share
                      </span>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-baseline justify-between">
                      <span className="text-xs font-semibold text-slate-600">Partner Payout Amount:</span>
                      <span className="text-2xl font-black font-mono text-emerald-600">
                        {formatCurrency(profitData.ownerShareAmount)}
                      </span>
                    </div>

                    <div className="mt-3 p-2.5 bg-emerald-50/70 border border-emerald-200 rounded-xl flex items-center justify-between text-xs">
                      <span className="font-semibold text-emerald-900">Current "Owing to Owner" Balance:</span>
                      <span className="font-bold font-mono text-rose-700">
                        {formatCurrency(profitData.currentOwingBalance)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* STEP 3: SETTLEMENT & CLEAR ACCOUNT ACTION */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 text-xs flex items-center justify-center font-bold">3</span>
                  Clear Account / Record Settlement Details
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <FormField
                    label="Period Covered"
                    value={periodCoveredText}
                    onChange={(e) => setPeriodCoveredText(e.target.value)}
                    placeholder="e.g. Profit Share Payout: Sep 2026"
                    required
                  />

                  <FormField
                    label="Payout Reference #"
                    value={payoutReference}
                    onChange={(e) => setPayoutReference(e.target.value)}
                    placeholder="e.g. PAYOUT-2026-09"
                    required
                  />

                  <FormField
                    label="Date Paid"
                    type="date"
                    value={payoutDate}
                    onChange={(e) => setPayoutDate(e.target.value)}
                    required
                  />
                </div>

                {/* Option to clear / zero out owing balance */}
                <div className="flex items-start gap-3 p-3 bg-white rounded-xl border border-slate-200">
                  <input
                    type="checkbox"
                    id="clearOwingCheckbox"
                    checked={clearOwingBalance}
                    onChange={(e) => setClearOwingBalance(e.target.checked)}
                    className="mt-1 w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 cursor-pointer"
                  />
                  <label htmlFor="clearOwingCheckbox" className="text-xs text-slate-700 cursor-pointer">
                    <strong className="block text-slate-900 font-bold">
                      Zero out / Reconcile "Owing to Owner" balance
                    </strong>
                    Balance will be offset and zeroed out for this vehicle account, generating matching ledger reconciliation entries.
                  </label>
                </div>

                <FormField
                  label="Notes / Terms (Optional)"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Additional notes for partner statement..."
                />
              </div>
            </>
          ) : (
            /* AUDIT TRAIL / PAYOUT HISTORY TAB */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <History className="w-4 h-4 text-indigo-600" />
                  Profit Payout History & Audit Trail
                </h4>
                <button
                  type="button"
                  onClick={loadHistory}
                  disabled={historyLoading}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                >
                  {historyLoading ? 'Refreshing...' : 'Refresh Logs'}
                </button>
              </div>

              {payoutHistory.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
                  <Clock className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-600">No payout settlements recorded yet</p>
                  <p className="text-xs text-slate-400 mt-1">
                    When you execute profit distributions, full audit entries will be recorded here.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-200 rounded-2xl shadow-xs">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                        <th className="py-3 px-3.5">Date Paid</th>
                        <th className="py-3 px-3.5">Period Covered</th>
                        <th className="py-3 px-3.5">Vehicle / Account</th>
                        <th className="py-3 px-3.5 text-right">Income</th>
                        <th className="py-3 px-3.5 text-right">Expenses</th>
                        <th className="py-3 px-3.5 text-right">Net Profit</th>
                        <th className="py-3 px-3.5 text-right font-mono text-indigo-700">Company Share (£)</th>
                        <th className="py-3 px-3.5 text-right font-mono text-emerald-700">Owner Paid (£)</th>
                        <th className="py-3 px-3.5 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-800">
                      {payoutHistory.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-3 px-3.5 whitespace-nowrap font-medium">
                            {new Date(item.datePaid).toLocaleDateString('en-GB')}
                          </td>
                          <td className="py-3 px-3.5 font-semibold text-slate-900 whitespace-nowrap">
                            {item.periodCovered}
                            <span className="block text-[10px] text-slate-400 font-mono">
                              Ref: {item.payoutReference}
                            </span>
                          </td>
                          <td className="py-3 px-3.5 max-w-[180px] truncate" title={item.vehicleName || item.accountName}>
                            {item.vehicleName || item.accountName}
                          </td>
                          <td className="py-3 px-3.5 text-right font-mono text-slate-600">
                            {formatCurrency(item.grossBilled)}
                          </td>
                          <td className="py-3 px-3.5 text-right font-mono text-rose-600">
                            {formatCurrency(item.expenses)}
                          </td>
                          <td className="py-3 px-3.5 text-right font-mono font-bold text-slate-900">
                            {formatCurrency(item.totalProfit)}
                          </td>
                          <td className="py-3 px-3.5 text-right font-mono font-bold text-indigo-600 bg-indigo-50/30">
                            {formatCurrency(item.companyShareAmount)} ({item.companySharePct}%)
                          </td>
                          <td className="py-3 px-3.5 text-right font-mono font-bold text-emerald-600 bg-emerald-50/30">
                            {formatCurrency(item.ownerShareAmount)} ({item.ownerSharePct}%)
                          </td>
                          <td className="py-3 px-3.5 text-center whitespace-nowrap">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              <CheckCircle2 className="w-3 h-3" /> Paid & Cleared
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
          >
            Close
          </button>

          {activeTab === 'payout' && (
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <span className="text-xs text-slate-500 font-medium block">Total Payout Settlement:</span>
                <span className="text-sm font-black font-mono text-slate-900">
                  {formatCurrency(profitData.companyShareAmount + profitData.ownerShareAmount)}
                </span>
              </div>

              <button
                type="button"
                onClick={handleExecutePayout}
                disabled={loading || profitData.netProfit <= 0 || !canProcessProfitPayout}
                className="px-5 py-2.5 text-xs font-bold text-white bg-linear-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading ? (
                  'Executing Settlement...'
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Clear Account & Record Profit Payout
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
export default ProfitPayoutModal;
