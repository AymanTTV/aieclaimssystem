// src/components/finance/TransactionDetails.tsx
import React, { useState, useEffect } from 'react';
import { Transaction, Vehicle, Customer, Account } from '../../types';
import { format, isValid } from 'date-fns';
import StatusBadge from '../ui/StatusBadge';
import {
  Receipt,
  Car,
  User,
  Mail,
  Phone,
  Link2,
  RefreshCw,
  StopCircle,
  ArrowRight,
  ArrowLeft,
  ArrowRightLeft,
  CreditCard,
  Clock,
  FileText,
  Layers,
  ChevronLeft,
  ChevronRight,
  Copy,
  Check,
  Building,
  Tag,
  Calendar,
  AlertCircle,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Percent,
  Edit2,
  CheckCircle2
} from 'lucide-react';
import { useFormattedDisplay } from '../../hooks/useFormattedDisplay';
import { Timestamp, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import toast from 'react-hot-toast';
import { calculateProfitMetrics, calculateRealizedProfit } from '../../utils/profitCalculator';
import { syncTransactionRecord } from '../../services/unifiedSync.service';
import {
  getOrderCandidateVariants,
  isMaintenanceOrderMatch,
} from '../../utils/maintenanceFinanceLink';

export type TransactionDetailTab =
  | 'overview'
  | 'account_flow'
  | 'payment_schedule'
  | 'customer_vehicle'
  | 'notes_audit'
  | 'all';

interface TransactionDetailsProps {
  transaction: Transaction;
  vehicle?: Vehicle;
  customer?: Customer;
  accounts: Account[];
  groups?: { id: string; name: string }[];
  departments?: { id: string; name: string }[];
}

const TransactionDetails: React.FC<TransactionDetailsProps> = ({
  transaction,
  vehicle,
  customer,
  accounts = [],
  groups = [],
  departments = [],
}) => {
  const { formatCurrency } = useFormattedDisplay();
  const [activeTab, setActiveTab] = useState<TransactionDetailTab>('overview');
  const [loadingStop, setLoadingStop] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  // Subcontractor Cost & Profit Tracking State
  const linkedLog = transaction.linkedMaintenanceRecord;
  const hasLinkedLogProfit = Boolean(
    linkedLog &&
      (linkedLog.isProfitEdited === true ||
        linkedLog.isEdited === true ||
        (linkedLog.dealerCost !== undefined && Number(linkedLog.dealerCost) > 0) ||
        (linkedLog.subcontractorCost !== undefined &&
          Number(linkedLog.subcontractorCost) > 0 &&
          Number(linkedLog.subcontractorCost) !== Number(linkedLog.cost ?? linkedLog.customerBilled)))
  );

  const hasEditedProfit =
    transaction.isProfitEdited === true ||
    transaction.isEdited === true ||
    hasLinkedLogProfit;

  const initialBilled =
    transaction.customerBilled !== undefined
      ? Number(transaction.customerBilled)
      : linkedLog?.customerBilled !== undefined
      ? Number(linkedLog.customerBilled)
      : Math.abs(transaction.amount);

  const resolvedDealerCost =
    transaction.dealerCost !== undefined
      ? Number(transaction.dealerCost)
      : transaction.subcontractorCost !== undefined
      ? Number(transaction.subcontractorCost)
      : linkedLog?.dealerCost !== undefined
      ? Number(linkedLog.dealerCost)
      : linkedLog?.subcontractorCost !== undefined
      ? Number(linkedLog.subcontractorCost)
      : undefined;

  const initialSubCost = hasEditedProfit
    ? (resolvedDealerCost !== undefined ? resolvedDealerCost : initialBilled)
    : initialBilled;

  const [subCost, setSubCost] = useState<number>(initialSubCost);
  const [billedAmt, setBilledAmt] = useState<number>(initialBilled);
  const [isEditingProfit, setIsEditingProfit] = useState(false);
  const [inputSubCost, setInputSubCost] = useState<string>(initialSubCost.toString());
  const [inputBilled, setInputBilled] = useState<string>(initialBilled.toString());
  const [savingProfit, setSavingProfit] = useState(false);

  // Sync state if transaction or linkedLog updates
  useEffect(() => {
    setSubCost(initialSubCost);
    setInputSubCost(initialSubCost.toString());
    setBilledAmt(initialBilled);
    setInputBilled(initialBilled.toString());
  }, [initialSubCost, initialBilled]);

  // Dynamically resolve from Firestore if not yet enriched
  useEffect(() => {
    if (hasEditedProfit) return;

    let isMounted = true;
    const resolveLinked = async () => {
      const orderNum = transaction.orderId || transaction.orderNumber;
      const refId = transaction.referenceId || (transaction as any).linkedInvoiceRef;
      if (!orderNum && !refId) return;

      try {
        const { getDoc, getDocs, collection, query, where, doc } = await import('firebase/firestore');
        let found: any = null;

        if (refId) {
          const snap = await getDoc(doc(db, 'maintenanceLogs', refId));
          if (snap.exists()) found = snap.data();
        }
        if (!found && orderNum) {
          const variants = getOrderCandidateVariants(orderNum);
          for (const variant of variants) {
            if (found) break;
            const q1 = query(collection(db, 'maintenanceLogs'), where('orderNumber', '==', variant));
            const s1 = await getDocs(q1);
            if (!s1.empty) {
              found = s1.docs[0].data();
              break;
            }
            const q2 = query(collection(db, 'maintenanceLogs'), where('orderId', '==', variant));
            const s2 = await getDocs(q2);
            if (!s2.empty) {
              found = s2.docs[0].data();
              break;
            }
          }
        }

        if (isMounted && found) {
          const isFoundEdited =
            found.isProfitEdited === true ||
            found.isEdited === true ||
            found.dealerCost !== undefined ||
            (found.subcontractorCost !== undefined &&
              found.subcontractorCost !== (found.cost ?? found.customerBilled));

          if (isFoundEdited) {
            const dCost = Number(found.dealerCost ?? found.subcontractorCost ?? initialBilled);
            const bAmt = Number(transaction.customerBilled ?? transaction.amount ?? found.customerBilled ?? found.cost);
            setSubCost(dCost);
            setInputSubCost(dCost.toString());
            setBilledAmt(bAmt);
            setInputBilled(bAmt.toString());
          }
        }
      } catch (err) {
        console.warn('Error resolving linked maintenance in TransactionDetails:', err);
      }
    };

    resolveLinked();
    return () => { isMounted = false; };
  }, [transaction.id, transaction.orderId, transaction.orderNumber, transaction.referenceId, hasEditedProfit, initialBilled]);

  const profitMetrics = hasEditedProfit || isEditingProfit || subCost !== billedAmt
    ? calculateProfitMetrics(
        isEditingProfit ? (parseFloat(inputBilled) || 0) : billedAmt,
        isEditingProfit ? (parseFloat(inputSubCost) || 0) : subCost
      )
    : { customerBilled: initialBilled, subcontractorCost: initialBilled, netProfit: 0, profitMarginPercent: 0 };

  const handleSaveProfit = async () => {
    setSavingProfit(true);
    try {
      const parsedSub = Math.max(0, parseFloat(inputSubCost) || 0);
      const parsedBilled = Math.max(0, parseFloat(inputBilled) || 0);
      const metrics = calculateProfitMetrics(parsedBilled, parsedSub);

      await syncTransactionRecord(transaction.id, {
        subcontractorCost: metrics.subcontractorCost,
        dealerCost: metrics.subcontractorCost,
        customerBilled: metrics.customerBilled,
        netProfit: metrics.netProfit,
        profitMarginPercent: metrics.profitMarginPercent,
        isProfitEdited: true,
        isEdited: true,
      });

      setSubCost(metrics.subcontractorCost);
      setBilledAmt(metrics.customerBilled);
      setIsEditingProfit(false);
      toast.success('Subcontractor cost & profit metrics saved successfully');
    } catch (err: any) {
      console.error('Failed to update profit:', err);
      toast.error('Failed to update profit metrics');
    } finally {
      setSavingProfit(false);
    }
  };

  const formatDate = (date: Date | Timestamp | null | undefined): string => {
    if (!date) return 'N/A';
    let dateObj: Date | null = null;
    try {
      if ((date as any)?.toDate) {
        dateObj = (date as any).toDate();
      } else if (date instanceof Date) {
        dateObj = date;
      } else {
        dateObj = new Date(date as string);
      }
      return dateObj && isValid(dateObj) ? format(dateObj, 'dd/MM/yyyy HH:mm') : 'Invalid Date';
    } catch (error) {
      console.error('Error formatting date:', error, date);
      return 'Invalid Date';
    }
  };

  const getAccountNames = (ids?: string[]): string => {
    if (!ids || ids.length === 0) return 'Unassigned';
    return ids
      .map((id) => accounts.find((a) => a.id === id)?.name || 'Unknown Account')
      .join(', ');
  };

  const handleStopRecurring = async () => {
    if (
      !confirm(
        'Are you sure you want to stop this recurring series? No future transactions will be generated.'
      )
    )
      return;

    setLoadingStop(true);
    try {
      const txnRef = doc(db, 'transactions', transaction.id);
      await updateDoc(txnRef, {
        nextRecurringDate: null,
      });
      toast.success('Recurring series stopped successfully.');
    } catch (error) {
      console.error('Error stopping recurrence:', error);
      toast.error('Failed to stop recurrence.');
    } finally {
      setLoadingStop(false);
    }
  };

  const handleCopyId = () => {
    navigator.clipboard.writeText(transaction.id);
    setCopiedId(true);
    toast.success('Transaction ID copied to clipboard');
    setTimeout(() => setCopiedId(false), 2000);
  };

  // Group & Department names
  const resolvedGroupName =
    transaction.groupName && transaction.groupName !== transaction.groupId
      ? transaction.groupName
      : groups.find((g) => g.id === transaction.groupId)?.name ||
        transaction.groupId ||
        'Unassigned';

  const resolvedDepartmentName =
    transaction.departmentName ||
    departments.find((d) => d.id === transaction.departmentId)?.name ||
    'Unassigned';

  const isIncome = transaction.type === 'income';

  // Navigation tab definitions
  const tabs: {
    id: TransactionDetailTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string | number;
  }[] = [
    { id: 'overview', label: 'Overview', icon: Receipt },
    {
      id: 'account_flow',
      label: 'Account Flow',
      icon: ArrowRightLeft,
      badge: isIncome ? 'In' : 'Out',
    },
    {
      id: 'payment_schedule',
      label: 'Payment & Schedule',
      icon: CreditCard,
      badge: transaction.isRecurring ? 'Recurring' : undefined,
    },
    {
      id: 'customer_vehicle',
      label: 'Customer & Vehicle',
      icon: UsersIconOrCar,
      badge: customer || transaction.customerName || vehicle || transaction.vehicleName ? 'Linked' : undefined,
    },
    { id: 'notes_audit', label: 'Notes & Audit', icon: Clock },
    { id: 'all', label: 'All Details', icon: Layers },
  ];

  function UsersIconOrCar(props: { className?: string }) {
    if (vehicle || transaction.vehicleName) {
      return <Car {...props} />;
    }
    return <User {...props} />;
  }

  const currentTabIndex = tabs.findIndex((t) => t.id === activeTab);

  const handlePrevTab = () => {
    if (currentTabIndex > 0) {
      setActiveTab(tabs[currentTabIndex - 1].id);
    }
  };

  const handleNextTab = () => {
    if (currentTabIndex < tabs.length - 1) {
      setActiveTab(tabs[currentTabIndex + 1].id);
    }
  };

  // ──────────────────────────────────────────────────────────────────────────
  // SUB-SECTION RENDERERS
  // ──────────────────────────────────────────────────────────────────────────

  const renderOverviewContent = () => (
    <div className="space-y-4">
      {/* Highlight Metric Card */}
      <div className="bg-gradient-to-br from-slate-50 to-blue-50/40 rounded-xl p-4 sm:p-5 border border-slate-200/80 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <StatusBadge status={transaction.type} />
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                {transaction.category}
              </span>
              {transaction.isRecurring && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1">
                  <RefreshCw className="w-3 h-3 text-indigo-600" />
                  Recurring
                </span>
              )}
            </div>
            <p className="mt-2 text-2xl sm:text-3xl font-black font-mono tracking-tight text-slate-900">
              <span className={isIncome ? 'text-emerald-600' : 'text-rose-600'}>
                {formatCurrency(transaction.amount)}
              </span>
            </p>
          </div>

          {(transaction.netAmount! > 0 || transaction.vatAmount! > 0) && (
            <div className="bg-white/80 backdrop-blur-xs p-3 rounded-lg border border-slate-200/80 text-xs text-slate-700 space-y-1 sm:text-right shrink-0">
              <div className="flex justify-between sm:justify-end gap-3">
                <span className="text-slate-500 font-medium">Net Amount:</span>
                <span className="font-semibold text-slate-900">
                  {formatCurrency(transaction.netAmount || 0)}
                </span>
              </div>
              <div className="flex justify-between sm:justify-end gap-3">
                <span className="text-slate-500 font-medium">VAT:</span>
                <span className="font-semibold text-slate-900">
                  {formatCurrency(transaction.vatAmount || 0)}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Dealer / Subcontractor Cost & Profit Tracking Card */}
      <div className="bg-white border-2 border-indigo-200/90 rounded-xl p-4 shadow-2xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-indigo-100">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
              <DollarSign className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Dealer / Subcontractor Cost & Profit Tracking
              </h4>
              <p className="text-[11px] text-slate-500">
                Internal financial tracking of dealer charge, billed amount, and real-time margin
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isEditingProfit ? (
              <button
                type="button"
                onClick={() => setIsEditingProfit(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg border border-indigo-200 transition-colors cursor-pointer"
              >
                <Edit2 className="w-3.5 h-3.5" />
                Adjust Cost
              </button>
            ) : (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setInputSubCost(subCost.toString());
                    setInputBilled(billedAmt.toString());
                    setIsEditingProfit(false);
                  }}
                  className="px-2.5 py-1 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={savingProfit}
                  onClick={handleSaveProfit}
                  className="inline-flex items-center gap-1 px-3 py-1 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {savingProfit ? 'Saving...' : 'Save'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Breakdown Metric Tiles */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
          {/* Tile 1: Subcontractor / Dealer Cost */}
          <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              Base Dealer Cost
            </span>
            {isEditingProfit ? (
              <div className="relative mt-1">
                <span className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none text-slate-400 text-xs">
                  £
                </span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={inputSubCost}
                  onChange={(e) => setInputSubCost(e.target.value)}
                  className="w-full pl-5 pr-2 py-1 bg-white border border-indigo-300 rounded text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            ) : (
              <p className="text-base font-black font-mono text-slate-800 mt-0.5">
                {formatCurrency(subCost)}
              </p>
            )}
            <span className="text-[10px] text-slate-500 mt-0.5 block">Dealer/Garage expense</span>
          </div>

          {/* Tile 2: Customer Billed */}
          <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              Billed Customer
            </span>
            {isEditingProfit ? (
              <div className="relative mt-1">
                <span className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none text-slate-400 text-xs">
                  £
                </span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={inputBilled}
                  onChange={(e) => setInputBilled(e.target.value)}
                  className="w-full pl-5 pr-2 py-1 bg-white border border-indigo-300 rounded text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            ) : (
              <p className="text-base font-black font-mono text-slate-800 mt-0.5">
                {formatCurrency(billedAmt)}
              </p>
            )}
            <span className="text-[10px] text-slate-500 mt-0.5 block">Gross client total</span>
          </div>

          {/* Tile 3: Net Profit (Realized Cash-Basis) */}
          {(() => {
            const currentPaidVal = Number(
              transaction.paid !== undefined
                ? transaction.paid
                : transaction.paidAmount !== undefined
                ? transaction.paidAmount
                : transaction.paymentStatus === 'paid'
                ? profitMetrics.customerBilled
                : 0
            );
            const realized = calculateRealizedProfit(
              profitMetrics.customerBilled,
              profitMetrics.subcontractorCost,
              currentPaidVal,
              transaction.paymentStatus
            );
            const displayProfit = isEditingProfit ? profitMetrics.netProfit : realized.realizedProfit;
            const displayMargin = isEditingProfit ? profitMetrics.profitMarginPercent : realized.realizedMargin;
            const isDirectTx = profitMetrics.subcontractorCost <= 0;
            const isUncollected = !isEditingProfit && !isDirectTx && realized.isUnpaid;

            return (
              <>
                <div
                  className={`p-2.5 rounded-lg border flex flex-col justify-between ${
                    isDirectTx
                      ? 'bg-slate-50 border-slate-200'
                      : displayProfit >= 0
                      ? 'bg-emerald-50/80 border-emerald-200'
                      : 'bg-rose-50/80 border-rose-200'
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] font-bold uppercase">
                    <span className={isDirectTx ? 'text-slate-600' : displayProfit >= 0 ? 'text-emerald-800' : 'text-rose-800'}>
                      {isDirectTx ? 'Net Profit / Mark-Up' : isUncollected ? 'Realized Profit' : 'Net Profit'}
                    </span>
                    {isDirectTx ? (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-200 text-slate-700">Direct</span>
                    ) : displayProfit >= 0 ? (
                      <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <TrendingDown className="w-3.5 h-3.5 text-rose-600" />
                    )}
                  </div>
                  <p
                    className={`text-base font-black font-mono mt-0.5 ${
                      isDirectTx ? 'text-slate-700' : displayProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'
                    }`}
                  >
                    {isDirectTx ? '£0.00' : `${displayProfit >= 0 ? '+' : ''}${formatCurrency(displayProfit)}`}
                  </p>
                  <span className="text-[10px] text-slate-500">
                    {isDirectTx ? 'N/A (Direct Transaction)' : isUncollected ? 'Uncollected (Cash Pending)' : 'Collected – Dealer Cost'}
                  </span>
                </div>

                {/* Tile 4: Profit Margin */}
                <div
                  className={`p-2.5 rounded-lg border flex flex-col justify-between ${
                    isDirectTx
                      ? 'bg-slate-50 border-slate-200'
                      : displayMargin >= 0
                      ? 'bg-indigo-50/80 border-indigo-200'
                      : 'bg-rose-50/80 border-rose-200'
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] font-bold uppercase">
                    <span
                      className={isDirectTx ? 'text-slate-600' : displayMargin >= 0 ? 'text-indigo-800' : 'text-rose-800'}
                    >
                      Profit Margin
                    </span>
                    <Percent className="w-3.5 h-3.5 text-indigo-600" />
                  </div>
                  <p
                    className={`text-base font-black font-mono mt-0.5 ${
                      isDirectTx ? 'text-slate-700' : displayMargin >= 0 ? 'text-indigo-700' : 'text-rose-700'
                    }`}
                  >
                    {isDirectTx ? '0.0%' : `${displayMargin.toFixed(1)}%`}
                  </p>
                  <span className="text-[10px] text-slate-500">
                    {isDirectTx ? 'N/A (Direct Transaction)' : isUncollected ? '0.0% (Unpaid)' : 'Margin on collected'}
                  </span>
                </div>
              </>
            );
          })()}
        </div>
      </div>

      {/* Grid of Key Info */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            Transaction Date
          </div>
          <p className="mt-1.5 text-sm font-semibold text-slate-900">
            {formatDate(transaction.date)}
          </p>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider">
            <Building className="w-3.5 h-3.5 text-slate-400" />
            Finance Group
          </div>
          <p className="mt-1.5 text-sm font-semibold text-slate-900 truncate">
            {resolvedGroupName}
          </p>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider">
            <Tag className="w-3.5 h-3.5 text-slate-400" />
            Department
          </div>
          <p className="mt-1.5 text-sm font-semibold text-slate-900 truncate">
            {resolvedDepartmentName}
          </p>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider">
            <CreditCard className="w-3.5 h-3.5 text-slate-400" />
            Payment Status
          </div>
          <div className="mt-1.5">
            <StatusBadge status={transaction.paymentStatus || 'paid'} />
          </div>
        </div>
      </div>

      {/* Linked Info banner if present */}
      {(transaction.referenceId || transaction.linkedInvoiceRef || transaction.invoiceNumber) && (
        <div className="p-4 bg-indigo-50/90 border border-indigo-200 rounded-xl flex items-start gap-3 shadow-2xs">
          <Link2 className="h-5 w-5 text-indigo-600 shrink-0 mt-0.5" />
          <div className="text-xs flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-black text-indigo-950 text-sm">Linked Invoice Full Record</h4>
              {transaction.invoiceNumber && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-indigo-100 text-indigo-800 border border-indigo-300">
                  <FileText className="w-3.5 h-3.5 mr-1 text-indigo-600" />
                  #{transaction.invoiceNumber}
                </span>
              )}
              {(transaction.orderNumber || transaction.orderId) && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-mono font-medium bg-slate-100 text-slate-700 border border-slate-300">
                  Order #{transaction.orderNumber || transaction.orderId}
                </span>
              )}
            </div>
            <div className="mt-1.5 grid grid-cols-1 sm:grid-cols-3 gap-2 text-indigo-900">
              <p>
                <span className="text-indigo-600 font-medium">Invoice Number:</span>{' '}
                <span className="font-mono font-bold">{transaction.invoiceNumber || 'Pending / Ref ID'}</span>
              </p>
              <p>
                <span className="text-indigo-600 font-medium">Customer Billed:</span>{' '}
                <span className="font-mono font-bold">{formatCurrency(transaction.customerBilled ?? transaction.amount)}</span>
              </p>
              <p>
                <span className="text-indigo-600 font-medium">Doc Ref:</span>{' '}
                <span className="font-mono font-bold truncate inline-block max-w-[120px] align-bottom" title={transaction.linkedInvoiceRef || transaction.referenceId}>
                  {transaction.linkedInvoiceRef || transaction.referenceId || 'N/A'}
                </span>
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderAccountFlowContent = () => (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-2xs space-y-4">
        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
          <ArrowRightLeft className="w-4 h-4 text-indigo-600" />
          Financial Accounts & Flow Direction
        </h4>

        {isIncome ? (
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3.5 bg-emerald-50/90 border border-emerald-200 rounded-xl">
              <div className="shrink-0 bg-emerald-100 p-2 rounded-lg text-emerald-700 mt-0.5">
                <ArrowLeft className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
                  Money In (Credited To)
                </span>
                <p className="text-sm font-bold text-emerald-950 mt-0.5">
                  {transaction.accountsTo && transaction.accountsTo.length > 0
                    ? getAccountNames(transaction.accountsTo)
                    : 'Unassigned'}
                </p>
                <p className="text-xs text-emerald-700 mt-0.5">
                  Amount credited: <span className="font-mono font-bold">{formatCurrency(transaction.amount)}</span>
                </p>
              </div>
            </div>

            {(transaction.relatedAccountName || (transaction.accountsFrom && transaction.accountsFrom.length > 0)) && (
              <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                <span className="font-bold text-slate-500 uppercase tracking-wider">
                  Transfer Source (Debited From)
                </span>
                <span className="text-sm font-semibold text-slate-800">
                  {transaction.relatedAccountName || getAccountNames(transaction.accountsFrom)}
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3.5 bg-rose-50/90 border border-rose-200 rounded-xl">
              <div className="shrink-0 bg-rose-100 p-2 rounded-lg text-rose-700 mt-0.5">
                <ArrowRight className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[11px] font-bold text-rose-800 uppercase tracking-wider">
                  Money Out (Debited From)
                </span>
                <p className="text-sm font-bold text-rose-950 mt-0.5">
                  {transaction.accountsFrom && transaction.accountsFrom.length > 0
                    ? getAccountNames(transaction.accountsFrom)
                    : 'Unassigned'}
                </p>
                <p className="text-xs text-rose-700 mt-0.5">
                  Amount debited: <span className="font-mono font-bold">{formatCurrency(transaction.amount)}</span>
                </p>
              </div>
            </div>

            {(transaction.relatedAccountName || (transaction.accountsTo && transaction.accountsTo.length > 0)) && (
              <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                <span className="font-bold text-slate-500 uppercase tracking-wider">
                  Transfer Destination (Credited To)
                </span>
                <span className="text-sm font-semibold text-slate-800">
                  {transaction.relatedAccountName || getAccountNames(transaction.accountsTo)}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  const renderPaymentScheduleContent = () => (
    <div className="space-y-4">
      {/* Payment Details Box */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-2xs space-y-3">
        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-indigo-600" />
          Payment Specifications
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm pt-1">
          <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-100">
            <span className="text-xs font-semibold text-slate-500 uppercase">Payment Status</span>
            <StatusBadge status={transaction.paymentStatus} />
          </div>

          <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-100">
            <span className="text-xs font-semibold text-slate-500 uppercase">Total Transaction Amount</span>
            <span className="font-mono font-bold text-slate-900">{formatCurrency(transaction.amount)}</span>
          </div>

          {transaction.paidAmount !== undefined && transaction.paidAmount > 0 && (
            <div className="flex justify-between items-center p-3 bg-emerald-50/60 rounded-lg border border-emerald-100">
              <span className="text-xs font-semibold text-emerald-800 uppercase">Paid Amount</span>
              <span className="font-mono font-bold text-emerald-700">{formatCurrency(transaction.paidAmount)}</span>
            </div>
          )}

          {transaction.remainingAmount !== undefined && transaction.remainingAmount > 0 && (
            <div className="flex justify-between items-center p-3 bg-amber-50/60 rounded-lg border border-amber-100">
              <span className="text-xs font-semibold text-amber-800 uppercase">Remaining Balance</span>
              <span className="font-mono font-bold text-amber-700">{formatCurrency(transaction.remainingAmount)}</span>
            </div>
          )}

          <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-100">
            <span className="text-xs font-semibold text-slate-500 uppercase">Payment Method</span>
            <span className="font-semibold text-slate-800 capitalize">
              {transaction.paymentMethod ? transaction.paymentMethod.replace('_', ' ') : 'Standard / N/A'}
            </span>
          </div>

          <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-100">
            <span className="text-xs font-semibold text-slate-500 uppercase">Payment Reference</span>
            <span className="font-mono text-xs font-semibold text-slate-800">
              {transaction.paymentReference || 'None'}
            </span>
          </div>
        </div>
      </div>

      {/* Recurring Schedule */}
      {transaction.isRecurring ? (
        <div
          className={`p-4 sm:p-5 rounded-xl border ${
            transaction.nextRecurringDate
              ? 'bg-indigo-50/80 border-indigo-200'
              : 'bg-slate-50 border-slate-200'
          }`}
        >
          <div className="flex flex-col sm:flex-row justify-between items-start gap-3">
            <div className="flex items-start">
              <RefreshCw
                className={`h-5 w-5 mr-3 shrink-0 mt-0.5 ${
                  transaction.nextRecurringDate ? 'text-indigo-600' : 'text-slate-400'
                }`}
              />
              <div>
                <h4
                  className={`text-sm font-bold ${
                    transaction.nextRecurringDate ? 'text-indigo-900' : 'text-slate-800'
                  }`}
                >
                  {transaction.nextRecurringDate ? 'Active Recurring Series' : 'Completed Recurring Series'}
                </h4>
                <div className="text-xs space-y-1 mt-1.5">
                  <p className={transaction.nextRecurringDate ? 'text-indigo-800' : 'text-slate-600'}>
                    Frequency: <span className="font-bold capitalize">{transaction.recurringFrequency || 'Monthly'}</span>
                  </p>
                  {transaction.nextRecurringDate ? (
                    <p className="text-indigo-800 font-semibold">
                      Next Due Date: <span className="font-mono">{formatDate(transaction.nextRecurringDate)}</span>
                    </p>
                  ) : (
                    <p className="text-slate-500 italic">This recurring schedule has been completed or ended.</p>
                  )}
                </div>
              </div>
            </div>

            {transaction.nextRecurringDate && (
              <button
                type="button"
                onClick={handleStopRecurring}
                disabled={loadingStop}
                className="inline-flex items-center px-3.5 py-2 text-xs font-bold text-red-700 bg-white border border-red-300 rounded-lg hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 shadow-2xs transition-colors shrink-0 cursor-pointer disabled:opacity-50"
              >
                <StopCircle className="h-4 w-4 mr-1.5 text-red-600" />
                {loadingStop ? 'Stopping...' : 'Stop Recurrence'}
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-slate-400 shrink-0" />
          <span>This is a one-time transaction (not set on a recurring schedule).</span>
        </div>
      )}
    </div>
  );

  const renderCustomerVehicleContent = () => (
    <div className="space-y-4">
      {/* Customer Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-2xs">
        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2 mb-3">
          <User className="w-4 h-4 text-indigo-600" />
          Customer Information
        </h4>

        {customer ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div className="sm:col-span-2 bg-slate-50 p-3 rounded-lg border border-slate-100">
              <span className="text-xs font-semibold text-slate-500 uppercase block">Name</span>
              <span className="text-base font-bold text-slate-900">{customer.name}</span>
            </div>

            {customer.mobile && (
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                <span className="text-xs font-semibold text-slate-500 uppercase block">Mobile</span>
                <a
                  href={`tel:${customer.mobile}`}
                  className="font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1.5 mt-0.5"
                >
                  <Phone className="h-3.5 w-3.5" />
                  {customer.mobile}
                </a>
              </div>
            )}

            {customer.email && (
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                <span className="text-xs font-semibold text-slate-500 uppercase block">Email</span>
                <a
                  href={`mailto:${customer.email}`}
                  className="font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1.5 mt-0.5 truncate"
                >
                  <Mail className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{customer.email}</span>
                </a>
              </div>
            )}
          </div>
        ) : transaction.customerName ? (
          <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-100">
            <span className="text-xs font-semibold text-slate-500 uppercase block">Customer Name</span>
            <span className="text-sm font-bold text-slate-900 mt-1 block">
              {transaction.customerName}
            </span>
          </div>
        ) : (
          <p className="text-xs text-slate-500 italic py-2">No customer assigned to this transaction.</p>
        )}
      </div>

      {/* Vehicle Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-2xs">
        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2 mb-3">
          <Car className="w-4 h-4 text-indigo-600" />
          Vehicle Information
        </h4>

        {vehicle ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
              <span className="text-xs font-semibold text-slate-500 uppercase block">Make & Model</span>
              <span className="text-sm font-bold text-slate-900 mt-0.5 block">
                {vehicle.make} {vehicle.model}
              </span>
            </div>

            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
              <span className="text-xs font-semibold text-slate-500 uppercase block">Registration</span>
              <span className="inline-block mt-1 px-2.5 py-1 bg-amber-300 text-slate-900 font-mono font-black text-xs rounded border border-amber-400 shadow-2xs tracking-wider">
                {vehicle.registrationNumber}
              </span>
            </div>

            {vehicle.owner && (
              <div className="sm:col-span-2 bg-slate-50 p-3 rounded-lg border border-slate-100">
                <span className="text-xs font-semibold text-slate-500 uppercase block">Vehicle Owner</span>
                <span className="text-sm font-semibold text-slate-800 mt-0.5 block">
                  {vehicle.owner.isDefault ? 'AIE Skyline' : vehicle.owner.name}
                </span>
              </div>
            )}
          </div>
        ) : transaction.vehicleName ? (
          <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-100">
            <span className="text-xs font-semibold text-slate-500 uppercase block">Vehicle Reference</span>
            <span className="text-sm font-bold text-slate-900 mt-1 block">
              {transaction.vehicleName}
            </span>
          </div>
        ) : (
          <p className="text-xs text-slate-500 italic py-2">No vehicle assigned to this transaction.</p>
        )}
      </div>
    </div>
  );

  const renderNotesAuditContent = () => (
    <div className="space-y-4">
      {/* Description */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-2xs">
        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2 mb-2.5">
          <FileText className="w-4 h-4 text-indigo-600" />
          Transaction Notes & Description
        </h4>
        <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 text-sm text-slate-800 whitespace-pre-wrap leading-relaxed min-h-[60px]">
          {transaction.description ? transaction.description : <span className="text-slate-400 italic">No notes provided for this transaction.</span>}
        </div>
      </div>

      {/* Audit Metadata */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-2xs space-y-3">
        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
          <Clock className="w-4 h-4 text-indigo-600" />
          Audit Trail & System Metadata
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
            <span className="font-bold text-slate-500 uppercase block">Created By</span>
            <span className="text-sm font-semibold text-slate-800 mt-0.5 block">
              {transaction.createdBy || 'System / Unknown'}
            </span>
            <span className="text-slate-500 text-[11px] mt-0.5 block">
              {formatDate(transaction.createdAt)}
            </span>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
            <span className="font-bold text-slate-500 uppercase block">Last Updated</span>
            <span className="text-sm font-semibold text-slate-800 mt-0.5 block">
              {transaction.updatedBy || transaction.createdBy || 'Unknown'}
            </span>
            <span className="text-slate-500 text-[11px] mt-0.5 block">
              {transaction.updatedAt ? formatDate(transaction.updatedAt) : 'No updates recorded'}
            </span>
          </div>
        </div>

        {/* Transaction ID */}
        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs">
          <div className="min-w-0 pr-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase block">Transaction Database ID</span>
            <span className="font-mono text-slate-800 truncate block mt-0.5 select-all">
              {transaction.id}
            </span>
          </div>
          <button
            type="button"
            onClick={handleCopyId}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-md transition-colors shrink-0 cursor-pointer shadow-2xs"
            title="Copy ID"
          >
            {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
            <span>{copiedId ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col flex-1 h-full min-h-0 overflow-hidden text-slate-900 bg-white">
      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* TOP SUMMARY STRIP                                                   */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <div className="px-4 py-3 sm:px-6 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div
            className={`p-2.5 rounded-xl border shadow-2xs ${
              isIncome
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                : 'bg-rose-50 border-rose-200 text-rose-700'
            }`}
          >
            <Receipt className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-bold text-slate-900">{transaction.category}</h3>
              <StatusBadge status={transaction.type} />
              <StatusBadge status={transaction.paymentStatus || 'paid'} />
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Ref: <span className="font-mono font-semibold">{transaction.referenceId || transaction.id.slice(0, 8)}</span>
              {' · '}
              <span>{formatDate(transaction.date)}</span>
            </p>
          </div>
        </div>

        <div className="text-right">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Amount ({isIncome ? 'Income' : 'Expense'})
          </span>
          <span
            className={`text-xl sm:text-2xl font-black font-mono tracking-tight ${
              isIncome ? 'text-emerald-600' : 'text-rose-600'
            }`}
          >
            {formatCurrency(transaction.amount)}
          </span>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 1. MODAL NAVIGATION BAR (PINNED AT THE TOP - ZERO SCROLLING)        */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 sm:grid-cols-6 w-full border-b border-slate-200 shrink-0 bg-slate-100/70 select-none divide-x divide-slate-200">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center justify-center gap-1.5 py-3 px-2 border-b-2 text-xs sm:text-sm transition-all cursor-pointer truncate ${
                isActive
                  ? 'border-blue-600 text-blue-700 font-extrabold bg-white shadow-xs'
                  : 'border-transparent text-slate-600 font-semibold hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0 pointer-events-none" />
              <span className="truncate">{tab.label}</span>
              {tab.badge !== undefined && (
                <span
                  className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold shrink-0 ${
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 2. TAB BODY CONTENT (SCROLLABLE)                                   */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <div className="p-4 sm:p-6 overflow-y-auto flex-1 min-h-0 space-y-6">
        {activeTab === 'overview' && renderOverviewContent()}
        {activeTab === 'account_flow' && renderAccountFlowContent()}
        {activeTab === 'payment_schedule' && renderPaymentScheduleContent()}
        {activeTab === 'customer_vehicle' && renderCustomerVehicleContent()}
        {activeTab === 'notes_audit' && renderNotesAuditContent()}

        {activeTab === 'all' && (
          <div className="space-y-6">
            <div className="border-b border-slate-200 pb-3">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-3">1. Overview</h3>
              {renderOverviewContent()}
            </div>
            <div className="border-b border-slate-200 pb-3">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-3">2. Account Flow</h3>
              {renderAccountFlowContent()}
            </div>
            <div className="border-b border-slate-200 pb-3">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-3">3. Payment & Schedule</h3>
              {renderPaymentScheduleContent()}
            </div>
            <div className="border-b border-slate-200 pb-3">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-3">4. Customer & Vehicle</h3>
              {renderCustomerVehicleContent()}
            </div>
            <div className="pb-2">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-3">5. Notes & Audit</h3>
              {renderNotesAuditContent()}
            </div>
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 3. MODAL FOOTER (TAB NAVIGATION CONTROLS)                           */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
        <button
          type="button"
          onClick={handlePrevTab}
          disabled={currentTabIndex === 0}
          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-2xs cursor-pointer"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span>Previous</span>
        </button>

        <span className="text-xs font-semibold text-slate-500">
          Tab {currentTabIndex + 1} of {tabs.length}
        </span>

        <button
          type="button"
          onClick={handleNextTab}
          disabled={currentTabIndex === tabs.length - 1}
          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-2xs cursor-pointer"
        >
          <span>Next</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

export default TransactionDetails;
