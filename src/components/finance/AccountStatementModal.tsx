// src/components/finance/AccountStatementModal.tsx

import React, { useState, useMemo, useEffect } from 'react';
import { Account, Transaction } from '../../types';
import { useFormattedDisplay } from '../../hooks/useFormattedDisplay';
import { useAuth } from '../../context/AuthContext';
import {
  FileText,
  Download,
  Calendar,
  Building2,
  Wallet,
  ArrowRight,
  CheckCircle2,
  Loader2,
  Sparkles,
  Info,
  Clock,
  Layers,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Eye,
} from 'lucide-react';
import {
  format,
  startOfMonth,
  endOfMonth,
  subMonths,
  startOfQuarter,
  endOfQuarter,
  subQuarters,
  subDays,
  startOfYear,
  endOfYear,
  differenceInDays,
} from 'date-fns';
import { toast } from 'react-hot-toast';
import { pdf } from '@react-pdf/renderer';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import Modal from '../ui/Modal';
import {
  AccountStatementDocument,
  AccountStatementData,
  StatementTransactionItem,
} from '../pdf/documents/AccountStatementDocument';
import AccountStatementPreviewModal from './AccountStatementPreviewModal';
import companySignatureFallback from '../../assets/signiture.png';
import companyLogoFallback from '../../assets/logo.png';

interface AccountStatementModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: Account[];
  transactions: Transaction[];
  initialAccountId?: string;
  initialPeriodType?: 'monthly' | 'quarterly' | 'custom';
  initialStartDate?: string;
  initialEndDate?: string;
  initialOpenPreview?: boolean;
}

export const AccountStatementModal: React.FC<AccountStatementModalProps> = ({
  isOpen,
  onClose,
  accounts,
  transactions,
  initialAccountId,
  initialPeriodType = 'monthly',
  initialStartDate,
  initialEndDate,
  initialOpenPreview = false,
}) => {
  const { formatCurrency } = useFormattedDisplay();
  const { user } = useAuth();

  // Selected Account
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');

  // Period Configuration
  const [periodType, setPeriodType] = useState<'monthly' | 'quarterly' | 'custom'>(
    initialPeriodType
  );

  // Monthly State
  const now = useMemo(() => new Date(), []);
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth()); // 0-indexed

  // Quarterly State
  const [selectedQuarter, setSelectedQuarter] = useState<number>(() => {
    return Math.floor(now.getMonth() / 3) + 1; // 1, 2, 3, 4
  });

  // Custom Range State
  const [customStartDate, setCustomStartDate] = useState<string>(() => {
    return initialStartDate || format(startOfMonth(now), 'yyyy-MM-dd');
  });
  const [customEndDate, setCustomEndDate] = useState<string>(() => {
    return initialEndDate || format(endOfMonth(now), 'yyyy-MM-dd');
  });

  // Statement Options
  const [statementRef, setStatementRef] = useState<string>('');
  const [includeSignature, setIncludeSignature] = useState<boolean>(true);
  const [includeLedger, setIncludeLedger] = useState<boolean>(true);
  const [statementNotes, setStatementNotes] = useState<string>(
    'Official periodic account statement. Reconciled against double-entry General Ledger records.'
  );
  const [isGeneratingPDF, setIsGeneratingPDF] = useState<boolean>(false);
  const [showPreviewModal, setShowPreviewModal] = useState<boolean>(initialOpenPreview || false);
  const [companyDetails, setCompanyDetails] = useState<any>({
    fullName: 'AIE Skyline Limited',
    tradingName: 'AIE Skyline',
    officialAddress: 'Unit 4, Business Park, London, United Kingdom',
    phone: '+44 20 8123 4567',
    email: 'accounts@aieskyline.co.uk',
    signature: companySignatureFallback,
    logoUrl: companyLogoFallback,
  });

  // Fetch company details on mount
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const companyDoc = await getDoc(doc(db, 'companySettings', 'details'));
        if (companyDoc.exists() && isMounted) {
          const cData = companyDoc.data();
          setCompanyDetails((prev: any) => ({
            ...prev,
            ...cData,
            signature: cData.signature || cData.signatureUrl || companySignatureFallback,
            logoUrl: cData.logoUrl || cData.logo || companyLogoFallback,
          }));
        }
      } catch (err) {
        console.warn('Could not fetch companySettings, using defaults:', err);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  // Prepopulate initial account
  useEffect(() => {
    if (initialAccountId) {
      setSelectedAccountId(initialAccountId);
    } else if (accounts.length > 0 && !selectedAccountId) {
      setSelectedAccountId(accounts[0].id);
    }
  }, [initialAccountId, accounts]);

  // Synchronize when modal opens with new initial period/dates
  useEffect(() => {
    if (isOpen) {
      if (initialPeriodType) {
        setPeriodType(initialPeriodType);
      }
      if (initialStartDate) {
        setCustomStartDate(initialStartDate);
      }
      if (initialEndDate) {
        setCustomEndDate(initialEndDate);
      }
      if (initialOpenPreview !== undefined) {
        setShowPreviewModal(initialOpenPreview);
      }
    }
  }, [isOpen, initialPeriodType, initialStartDate, initialEndDate, initialOpenPreview]);

  // Selected Account Object
  const selectedAccount = useMemo(() => {
    if (selectedAccountId === 'all') {
      return {
        id: 'all',
        name: 'All Operating Accounts (Consolidated)',
        accountType: 'Consolidated General Ledger',
        balance: accounts.reduce((sum, a) => sum + (Number(a.balance) || 0), 0),
        currency: 'GBP (£)',
      };
    }
    return accounts.find((a) => a.id === selectedAccountId) || accounts[0] || null;
  }, [accounts, selectedAccountId]);

  // Compute calculated Date Range based on Period Type
  const { dateRangeStart, dateRangeEnd, periodLabel } = useMemo(() => {
    if (periodType === 'monthly') {
      const monthStart = new Date(selectedYear, selectedMonth, 1);
      const monthEnd = endOfMonth(monthStart);
      const label = `${format(monthStart, 'MMMM yyyy')}`;
      return {
        dateRangeStart: monthStart,
        dateRangeEnd: monthEnd,
        periodLabel: label,
      };
    } else if (periodType === 'quarterly') {
      const quarterStartMonth = (selectedQuarter - 1) * 3;
      const qStart = new Date(selectedYear, quarterStartMonth, 1);
      const qEnd = endOfQuarter(qStart);
      const label = `Q${selectedQuarter} ${selectedYear} (${format(qStart, '01 MMM')} – ${format(qEnd, 'dd MMM yyyy')})`;
      return {
        dateRangeStart: qStart,
        dateRangeEnd: qEnd,
        periodLabel: label,
      };
    } else {
      // Custom
      const s = customStartDate ? new Date(`${customStartDate}T00:00:00`) : startOfMonth(now);
      const e = customEndDate ? new Date(`${customEndDate}T23:59:59`) : endOfMonth(now);
      const label = `${format(s, 'dd MMM yyyy')} – ${format(e, 'dd MMM yyyy')}`;
      return {
        dateRangeStart: s,
        dateRangeEnd: e,
        periodLabel: label,
      };
    }
  }, [periodType, selectedYear, selectedMonth, selectedQuarter, customStartDate, customEndDate, now]);

  // Update auto statement reference when selection changes
  useEffect(() => {
    const accCode = selectedAccountId === 'all' ? 'CONS' : (selectedAccountId.slice(-4) || 'ACC').toUpperCase();
    let ref = '';
    if (periodType === 'monthly') {
      const mPad = String(selectedMonth + 1).padStart(2, '0');
      ref = `STMT-${selectedYear}-M${mPad}-${accCode}`;
    } else if (periodType === 'quarterly') {
      ref = `STMT-${selectedYear}-Q${selectedQuarter}-${accCode}`;
    } else {
      ref = `STMT-${format(dateRangeStart, 'yyyyMMdd')}-${accCode}`;
    }
    setStatementRef(ref);
  }, [periodType, selectedYear, selectedMonth, selectedQuarter, selectedAccountId, dateRangeStart]);

  // ── COMPUTATIONAL FINANCIAL ENGINE ──
  // Filter transactions and compute Opening Balance, Inflows, Outflows, and Closing Balance
  const statementCalculations = useMemo(() => {
    if (!selectedAccount) {
      return {
        openingBalance: 0,
        totalInflows: 0,
        totalOutflows: 0,
        netMovement: 0,
        closingBalance: 0,
        inflowCount: 0,
        outflowCount: 0,
        transactionsInPeriod: [] as StatementTransactionItem[],
        categoryBreakdown: {
          incomeByCategory: [],
          expensesByCategory: [],
        },
      };
    }

    const startTs = dateRangeStart.getTime();
    const endTs = dateRangeEnd.getTime();
    const accId = selectedAccount.id;

    // Helper to test if a transaction touches this account
    const touchesAccount = (tx: Transaction): { inScope: boolean; direction: 'credit' | 'debit' } => {
      if (accId === 'all') {
        const isExp = tx.type?.toLowerCase().includes('expense') || tx.entryType === 'DEBIT';
        return { inScope: true, direction: isExp ? 'debit' : 'credit' };
      }

      const isFrom = tx.accountsFrom?.includes(accId);
      const isTo = tx.accountsTo?.includes(accId);

      if (isFrom && isTo) {
        // Internal loop transfer on same account
        return { inScope: false, direction: 'credit' };
      }

      if (isFrom) {
        return { inScope: true, direction: 'debit' };
      }

      if (isTo) {
        return { inScope: true, direction: 'credit' };
      }

      // If neither accountsFrom nor accountsTo is set, check fallback attributes
      const isExpense = tx.type?.toLowerCase().includes('expense') || tx.entryType === 'DEBIT';
      return { inScope: false, direction: isExpense ? 'debit' : 'credit' };
    };

    // Calculate prior transactions to determine Opening Balance
    let priorNet = 0;
    let periodInflows = 0;
    let periodOutflows = 0;
    let inCount = 0;
    let outCount = 0;

    const inPeriodList: StatementTransactionItem[] = [];
    const incomeByCatMap = new Map<string, number>();
    const expenseByCatMap = new Map<string, number>();

    // Sort transactions chronologically
    const sorted = [...transactions].sort((a, b) => {
      const ta = new Date(a.date).getTime();
      const tb = new Date(b.date).getTime();
      return ta - tb;
    });

    for (const tx of sorted) {
      const { inScope, direction } = touchesAccount(tx);
      if (!inScope) continue;

      const txDate = new Date(tx.date);
      const txTs = txDate.getTime();
      const amount = Number(tx.amount || tx.netAmount || 0);

      if (txTs < startTs) {
        // Occurred BEFORE period
        if (direction === 'credit') priorNet += amount;
        else priorNet -= amount;
      } else if (txTs <= endTs) {
        // In the period!
        if (direction === 'credit') {
          periodInflows += amount;
          inCount++;
          const cat = tx.category || 'General Income';
          incomeByCatMap.set(cat, (incomeByCatMap.get(cat) || 0) + amount);
        } else {
          periodOutflows += amount;
          outCount++;
          const cat = tx.category || 'General Expense';
          expenseByCatMap.set(cat, (expenseByCatMap.get(cat) || 0) + amount);
        }

        inPeriodList.push({
          id: tx.id,
          date: txDate,
          reference: tx.referenceId || tx.paymentReference || (tx as any).invoiceNumber || tx.id.slice(-6).toUpperCase(),
          description: tx.description || tx.customerName || (direction === 'credit' ? 'Account Credit' : 'Account Debit'),
          category: tx.category || (direction === 'credit' ? 'Income' : 'Expense'),
          type: direction,
          amount,
          counterparty: tx.customerName || (tx as any).vendor || '',
          vehicleReg: (tx as any).vehicleReg || (tx as any).registration || (tx as any).vehiclePlate || '',
          vehicleName: (tx as any).vehicleName || (tx as any).vehicleModel || '',
        });
      }
    }

    // Opening Balance
    // If account has an explicit initial balance and we calculated historical, use realistic reconciled baseline
    const openingBalance = Number(priorNet.toFixed(2));
    const totalInflows = Number(periodInflows.toFixed(2));
    const totalOutflows = Number(periodOutflows.toFixed(2));
    const netMovement = Number((totalInflows - totalOutflows).toFixed(2));
    const closingBalance = Number((openingBalance + netMovement).toFixed(2));

    // Calculate running balance on items
    let curBal = openingBalance;
    const itemsWithBalance = inPeriodList.map((item) => {
      if (item.type === 'credit') curBal += item.amount;
      else curBal -= item.amount;
      return { ...item, runningBalance: Number(curBal.toFixed(2)) };
    });

    // Compute category percentages
    const incomeByCategory = Array.from(incomeByCatMap.entries())
      .map(([category, amount]) => ({
        category,
        amount: Number(amount.toFixed(2)),
        percentage: totalInflows > 0 ? Math.round((amount / totalInflows) * 100) : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    const expensesByCategory = Array.from(expenseByCatMap.entries())
      .map(([category, amount]) => ({
        category,
        amount: Number(amount.toFixed(2)),
        percentage: totalOutflows > 0 ? Math.round((amount / totalOutflows) * 100) : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    return {
      openingBalance,
      totalInflows,
      totalOutflows,
      netMovement,
      closingBalance,
      inflowCount: inCount,
      outflowCount: outCount,
      transactionsInPeriod: itemsWithBalance,
      categoryBreakdown: {
        incomeByCategory,
        expensesByCategory,
      },
    };
  }, [selectedAccount, transactions, dateRangeStart, dateRangeEnd]);

  // ── ACTIVE STATEMENT DATA (MEMOIZED FOR REAL-TIME PREVIEW & PDF GENERATION) ──
  const activeStatementData: AccountStatementData | null = useMemo(() => {
    if (!selectedAccount) return null;
    return {
      statementReference: statementRef || `STMT-${format(new Date(), 'yyyyMMdd')}`,
      statementPeriodType: periodType,
      periodLabel,
      dateFrom: dateRangeStart,
      dateTo: dateRangeEnd,
      generatedDate: new Date(),
      account: {
        id: selectedAccount.id,
        name: selectedAccount.name,
        accountType: selectedAccount.accountType,
        accountNumber:
          (selectedAccount as any).accountNumber ||
          companyDetails?.bankAccountNumber ||
          (companyDetails as any)?.accountNumber ||
          '30513162',
        sortCode:
          (selectedAccount as any).sortCode ||
          companyDetails?.bankSortCode ||
          (companyDetails as any)?.sortCode ||
          '20-00-00',
        vehicleName: (selectedAccount as any).vehicleName,
        vehicleReg: (selectedAccount as any).vehicleReg,
        currency: 'GBP (£)',
      },
      openingBalance: statementCalculations.openingBalance,
      totalInflows: statementCalculations.totalInflows,
      totalOutflows: statementCalculations.totalOutflows,
      netMovement: statementCalculations.netMovement,
      closingBalance: statementCalculations.closingBalance,
      inflowCount: statementCalculations.inflowCount,
      outflowCount: statementCalculations.outflowCount,
      transactions: statementCalculations.transactionsInPeriod,
      categoryBreakdown: statementCalculations.categoryBreakdown,
      notes: statementNotes,
      signatoryName: user?.name || 'Chief Financial Officer',
      signatoryRole: 'Director of Fleet Finance',
      includeSignature,
      includeLedger,
    };
  }, [
    selectedAccount,
    statementRef,
    periodType,
    periodLabel,
    dateRangeStart,
    dateRangeEnd,
    statementCalculations,
    statementNotes,
    user?.name,
    includeSignature,
    includeLedger,
  ]);

  // ── GENERATE AND DOWNLOAD PDF STATEMENT ──
  const handleGeneratePDF = async (overrideCompanyDetails?: any) => {
    if (!selectedAccount || !activeStatementData) {
      toast.error('Please select an account.');
      return;
    }

    setIsGeneratingPDF(true);
    const toastId = toast.loading(`Generating official ${periodLabel} statement...`);

    try {
      const detailsToUse =
        overrideCompanyDetails && typeof overrideCompanyDetails === 'object' && Object.keys(overrideCompanyDetails).length > 0
          ? overrideCompanyDetails
          : companyDetails;

      // Render PDF Blob using @react-pdf/renderer
      const blob = await pdf(
        <AccountStatementDocument data={activeStatementData} companyDetails={detailsToUse} />
      ).toBlob();

      // Trigger Download
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const safeAcc = selectedAccount.name.replace(/[^a-zA-Z0-9_-]/g, '_');
      const safeLabel = periodLabel.replace(/[^a-zA-Z0-9_-]/g, '_');
      link.download = `Account_Statement_${safeAcc}_${safeLabel}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('Account statement PDF downloaded successfully!', { id: toastId });
      setShowPreviewModal(false);
      onClose();
    } catch (err: any) {
      console.error('Error generating account statement PDF:', err);
      toast.error(`Failed to generate statement: ${err?.message || 'Unknown error'}`, {
        id: toastId,
      });
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Generate Account Statement"
      size="2xl"
    >
      <div className="space-y-6 text-left">
        {/* Modal Intro Banner */}
        <div className="bg-gradient-to-r from-indigo-900 to-slate-900 text-white rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                Official PDF Document
              </span>
              <span className="text-xs text-indigo-300 font-mono">
                {periodLabel}
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-bold mt-1 text-white tracking-tight">
              State-of-the-Art Account Statement Generator
            </h3>
            <p className="text-xs text-slate-300 mt-0.5">
              Generate certified financial account statements for monthly, quarterly, or custom date periods with opening/closing balances, categorized cashflow, itemized ledger, and digital signature.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white border border-white/10">
              <FileText className="w-5 h-5 text-indigo-300" />
            </div>
          </div>
        </div>

        {/* ── STEP 1: SELECT ACCOUNT ── */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 space-y-3 shadow-2xs">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <Wallet className="w-4 h-4 text-indigo-600" />
              <span>1. Select Account</span>
            </label>
            {selectedAccount && (
              <span className="text-xs font-bold font-mono text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                Live Balance: {formatCurrency(selectedAccount.balance)}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <select
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs font-bold bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
            >
              <option value="all">★ Consolidated (All Operating Accounts)</option>
              <optgroup label="Registered Operating Accounts">
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({formatCurrency(acc.balance)})
                  </option>
                ))}
              </optgroup>
            </select>

            <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200">
              <Info className="w-4 h-4 text-indigo-500 shrink-0" />
              <span>
                Statement will audit all verified credit and debit ledger movements for this account.
              </span>
            </div>
          </div>
        </div>

        {/* ── STEP 2: SELECT PERIOD (MONTHLY VS QUARTERLY) ── */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 space-y-4 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-indigo-600" />
              <span>2. Choose Statement Period Format</span>
            </label>

            {/* Period Type Toggle Buttons */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setPeriodType('monthly')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  periodType === 'monthly'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Monthly Statement
              </button>
              <button
                type="button"
                onClick={() => setPeriodType('quarterly')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  periodType === 'quarterly'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Quarterly Statement
              </button>
              <button
                type="button"
                onClick={() => setPeriodType('custom')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  periodType === 'custom'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Custom Range
              </button>
            </div>
          </div>

          {/* MONTHLY SELECTOR */}
          {periodType === 'monthly' && (
            <div className="space-y-3 bg-slate-50/70 p-4 rounded-xl border border-slate-200/80">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-slate-500 uppercase">Quick Shortcuts:</span>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedYear(now.getFullYear());
                    setSelectedMonth(now.getMonth());
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition cursor-pointer ${
                    selectedYear === now.getFullYear() && selectedMonth === now.getMonth()
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  This Month ({format(now, 'MMM yyyy')})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const lastM = subMonths(now, 1);
                    setSelectedYear(lastM.getFullYear());
                    setSelectedMonth(lastM.getMonth());
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition cursor-pointer ${
                    selectedYear === subMonths(now, 1).getFullYear() &&
                    selectedMonth === subMonths(now, 1).getMonth()
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Last Month ({format(subMonths(now, 1), 'MMM yyyy')})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const twoM = subMonths(now, 2);
                    setSelectedYear(twoM.getFullYear());
                    setSelectedMonth(twoM.getMonth());
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition cursor-pointer ${
                    selectedYear === subMonths(now, 2).getFullYear() &&
                    selectedMonth === subMonths(now, 2).getMonth()
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {format(subMonths(now, 2), 'MMM yyyy')}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Select Month
                  </label>
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs font-bold bg-white border border-slate-300 rounded-xl text-slate-800"
                  >
                    {months.map((m, idx) => (
                      <option key={m} value={idx}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Select Year
                  </label>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs font-bold bg-white border border-slate-300 rounded-xl text-slate-800"
                  >
                    {[2024, 2025, 2026, 2027].map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* QUARTERLY SELECTOR */}
          {periodType === 'quarterly' && (
            <div className="space-y-3 bg-slate-50/70 p-4 rounded-xl border border-slate-200/80">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600 uppercase">
                  Select Financial Quarter ({selectedYear}):
                </span>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="px-3 py-1 text-xs font-bold bg-white border border-slate-300 rounded-lg text-slate-800"
                >
                  {[2024, 2025, 2026, 2027].map((y) => (
                    <option key={y} value={y}>
                      Year {y}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {[
                  { q: 1, label: 'Q1 (Jan – Mar)', range: '01 Jan – 31 Mar' },
                  { q: 2, label: 'Q2 (Apr – Jun)', range: '01 Apr – 30 Jun' },
                  { q: 3, label: 'Q3 (Jul – Sep)', range: '01 Jul – 30 Sep' },
                  { q: 4, label: 'Q4 (Oct – Dec)', range: '01 Oct – 31 Dec' },
                ].map((item) => (
                  <button
                    key={item.q}
                    type="button"
                    onClick={() => setSelectedQuarter(item.q)}
                    className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                      selectedQuarter === item.q
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                        : 'bg-white hover:bg-slate-100 text-slate-800 border-slate-200'
                    }`}
                  >
                    <span className="block text-xs font-bold">{item.label}</span>
                    <span
                      className={`block text-[10px] mt-0.5 ${
                        selectedQuarter === item.q ? 'text-indigo-200' : 'text-slate-400'
                      }`}
                    >
                      {item.range}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* CUSTOM RANGE SELECTOR */}
          {periodType === 'custom' && (
            <div className="space-y-3.5 bg-slate-50/70 p-4 rounded-xl border border-slate-200/80">
              {/* Quick Custom Range Presets */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Quick Custom Presets:
                </span>
                <div className="flex flex-wrap items-center gap-1.5">
                  {[
                    { label: 'This Month', start: startOfMonth(now), end: endOfMonth(now) },
                    { label: 'Last Month', start: startOfMonth(subMonths(now, 1)), end: endOfMonth(subMonths(now, 1)) },
                    { label: 'Last 30 Days', start: subDays(now, 30), end: now },
                    { label: 'Last 60 Days', start: subDays(now, 60), end: now },
                    { label: 'Last 90 Days', start: subDays(now, 90), end: now },
                    { label: 'Year to Date (YTD)', start: startOfYear(now), end: now },
                    { label: 'Past 6 Months', start: subMonths(now, 6), end: now },
                    { label: 'Full Year 2026', start: new Date(2026, 0, 1), end: new Date(2026, 11, 31) },
                    { label: 'Previous Year 2025', start: new Date(2025, 0, 1), end: new Date(2025, 11, 31) },
                  ].map((preset) => {
                    const sStr = format(preset.start, 'yyyy-MM-dd');
                    const eStr = format(preset.end, 'yyyy-MM-dd');
                    const isSelected = customStartDate === sStr && customEndDate === eStr;
                    return (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => {
                          setCustomStartDate(sStr);
                          setCustomEndDate(eStr);
                        }}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                            : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Exact Date Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1 flex items-center justify-between">
                    <span>Start Date</span>
                    <span className="text-[10px] font-normal text-slate-400">Inclusive</span>
                  </label>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-bold bg-white border border-slate-300 rounded-xl text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1 flex items-center justify-between">
                    <span>End Date</span>
                    <span className="text-[10px] font-normal text-slate-400">Inclusive</span>
                  </label>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-bold bg-white border border-slate-300 rounded-xl text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Period Duration Pill & Status */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-200/80 text-xs">
                <div className="flex items-center gap-1.5 text-slate-600 font-medium">
                  <Clock className="w-3.5 h-3.5 text-indigo-500" />
                  <span>
                    Selected Span:{' '}
                    <strong className="text-slate-900 font-mono">
                      {(() => {
                        try {
                          const s = new Date(customStartDate);
                          const e = new Date(customEndDate);
                          if (e < s) return 'Invalid range (End date is before Start date)';
                          const days = Math.max(1, differenceInDays(e, s) + 1);
                          return `${days} days (${format(s, 'dd MMM yyyy')} to ${format(e, 'dd MMM yyyy')})`;
                        } catch {
                          return 'Custom period';
                        }
                      })()}
                    </strong>
                  </span>
                </div>
                {customStartDate && customEndDate && new Date(customEndDate) < new Date(customStartDate) && (
                  <button
                    type="button"
                    onClick={() => {
                      const temp = customStartDate;
                      setCustomStartDate(customEndDate);
                      setCustomEndDate(temp);
                    }}
                    className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 hover:bg-amber-100 transition cursor-pointer"
                  >
                    Swap Dates to Fix
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── STEP 3: LIVE COMPUTED STATEMENT PREVIEW (STRUCTURED BOXED ACCOUNT SUMMARY TABLE) ── */}
        <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl p-4 sm:p-5 space-y-3 shadow-2xs">
          <div className="flex items-center justify-between pb-2 border-b border-[#E2E8F0]">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span>Account Summary Table ({periodLabel})</span>
            </span>
            <span className="text-xs font-semibold text-slate-500">
              {statementCalculations.transactionsInPeriod.length} Activity Entries • {format(dateRangeStart, 'dd/MM/yyyy')} to {format(dateRangeEnd, 'dd/MM/yyyy')}
            </span>
          </div>

          {/* Boxed Account Summary Table matching PDF */}
          <div className="overflow-hidden rounded-xl border border-[#E2E8F0] bg-white">
            <div className="bg-[#F1F5F9] border-b border-[#E2E8F0] px-3.5 py-2 flex items-center justify-between text-xs font-bold text-slate-700 uppercase tracking-wider">
              <span>Account Financial Summary</span>
              <span className="text-[11px] font-mono text-slate-500 font-normal">
                Ledger Balanced &amp; Certified
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-[#E2E8F0]">
              {/* 1. Opening Balance */}
              <div className="p-3.5 bg-[#F8FAFC]/50">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Opening Balance
                </span>
                <span className="block text-base font-black font-mono text-slate-800 mt-1">
                  {formatCurrency(statementCalculations.openingBalance)}
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  As of {format(dateRangeStart, 'dd/MM/yyyy')}
                </span>
              </div>

              {/* 2. Total Money In (Credits / Income) */}
              <div className="p-3.5 bg-[#F8FAFC]/50">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                  Total Money In (Credits / Income)
                </span>
                <span className="block text-base font-black font-mono text-emerald-700 mt-1">
                  +{formatCurrency(statementCalculations.totalInflows)}
                </span>
                <span className="text-[10px] text-emerald-600 block mt-0.5">
                  {statementCalculations.inflowCount} Credits
                </span>
              </div>

              {/* 3. Total Money Out (Debits / Expenses) */}
              <div className="p-3.5 bg-[#F8FAFC]/50">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-rose-700">
                  Total Money Out (Debits / Expenses)
                </span>
                <span className="block text-base font-black font-mono text-rose-700 mt-1">
                  -{formatCurrency(statementCalculations.totalOutflows)}
                </span>
                <span className="text-[10px] text-rose-500 block mt-0.5">
                  {statementCalculations.outflowCount} Debits
                </span>
              </div>

              {/* 4. Closing / Running Balance */}
              <div className="p-3.5 bg-[#F8FAFC]/50">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-700">
                  Closing / Running Balance
                </span>
                <span
                  className={`block text-base font-black font-mono mt-1 ${
                    statementCalculations.closingBalance < 0
                      ? 'text-rose-700'
                      : 'text-indigo-900'
                  }`}
                >
                  {formatCurrency(statementCalculations.closingBalance)}
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5 font-medium">
                  Net: {statementCalculations.netMovement >= 0 ? '+' : ''}
                  {formatCurrency(statementCalculations.netMovement)}
                </span>
              </div>
            </div>
          </div>

          {/* Classic Bank Ledger Table Preview */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-indigo-600" />
                <span>Classic Bank Ledger Table ({statementCalculations.transactionsInPeriod.length} entries)</span>
              </span>
              <span className="text-[11px] text-slate-500 font-mono">
                Opening Balance: {formatCurrency(statementCalculations.openingBalance)}
              </span>
            </div>

            <div className="overflow-x-auto rounded-xl border border-[#CBD5E1] bg-white max-h-72 overflow-y-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#0F172A] text-white sticky top-0 z-10">
                  <tr>
                    <th className="py-2.5 px-3 font-bold uppercase tracking-wider text-[11px] w-[13%]">Date</th>
                    <th className="py-2.5 px-3 font-bold uppercase tracking-wider text-[11px] w-[32%]">Transaction Details</th>
                    <th className="py-2.5 px-3 font-bold uppercase tracking-wider text-[11px] w-[17%]">Reference / Vehicle</th>
                    <th className="py-2.5 px-3 font-bold uppercase tracking-wider text-[11px] text-right w-[12%]">Paid In (Credit)</th>
                    <th className="py-2.5 px-3 font-bold uppercase tracking-wider text-[11px] text-right w-[12%]">Paid Out (Debit)</th>
                    <th className="py-2.5 px-3 font-bold uppercase tracking-wider text-[11px] text-right w-[14%]">Running Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {statementCalculations.transactionsInPeriod.map((tx, idx) => {
                    const isCredit = tx.type === 'credit';
                    return (
                      <tr key={tx.id || idx} className={idx % 2 === 1 ? 'bg-[#F8FAFC] hover:bg-slate-100/80' : 'bg-white hover:bg-[#F8FAFC]'}>
                        <td className="py-2 px-3 text-slate-600 font-mono text-[11px] whitespace-nowrap">
                          {format(new Date(tx.date), 'dd/MM/yyyy')}
                        </td>
                        <td className="py-2 px-3">
                          <p className="font-bold text-slate-900 truncate text-xs">{tx.description}</p>
                          <p className="text-[10px] text-slate-500 truncate">{tx.category}</p>
                        </td>
                        <td className="py-2 px-3">
                          <span className="font-mono text-xs font-semibold text-slate-700">{tx.reference || '—'}</span>
                          {Boolean(tx.vehicleReg) && (
                            <span className="block text-[10px] text-slate-500 font-mono">Reg: {tx.vehicleReg}</span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-[#059669] text-xs">
                          {isCredit ? `+${formatCurrency(tx.amount)}` : <span className="text-slate-300 font-normal">—</span>}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-[#BE123C] text-xs">
                          {!isCredit ? `-${formatCurrency(tx.amount)}` : <span className="text-slate-300 font-normal">—</span>}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-xs text-slate-900">
                          {formatCurrency(tx.runningBalance || 0)}
                        </td>
                      </tr>
                    );
                  })}
                  {statementCalculations.transactionsInPeriod.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-slate-400 text-xs">
                        No transactions recorded in this statement period.
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot className="bg-[#F1F5F9] border-t-2 border-[#0F172A] font-bold text-xs text-slate-900 sticky bottom-0">
                  <tr>
                    <td colSpan={3} className="py-2.5 px-3">
                      Reconciled Closing Balance ({periodLabel})
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-[#059669]">
                      +{formatCurrency(statementCalculations.totalInflows)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-[#BE123C]">
                      -{formatCurrency(statementCalculations.totalOutflows)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-indigo-950 text-sm">
                      {formatCurrency(statementCalculations.closingBalance)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>

        {/* ── STEP 4: OPTIONS & SIGNATORY ── */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 space-y-3 shadow-2xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                Statement Reference Number
              </label>
              <input
                type="text"
                value={statementRef}
                onChange={(e) => setStatementRef(e.target.value)}
                placeholder="e.g. STMT-2026-M09-001"
                className="w-full px-3 py-2 text-xs font-mono font-bold bg-slate-50 border border-slate-300 rounded-xl text-slate-800"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                Signatory / Approver
              </label>
              <input
                type="text"
                value={user?.name || 'Chief Financial Controller'}
                disabled
                className="w-full px-3 py-2 text-xs font-bold bg-slate-100 border border-slate-200 rounded-xl text-slate-600"
              />
            </div>
          </div>

          <div className="pt-2 flex flex-wrap items-center gap-5 text-xs text-slate-700 border-t border-slate-100">
            <label className="flex items-center gap-2 cursor-pointer font-semibold select-none">
              <input
                type="checkbox"
                checked={includeSignature}
                onChange={(e) => setIncludeSignature(e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
              />
              <span>Include Authorized Company Digital Signature</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer font-semibold select-none">
              <input
                type="checkbox"
                checked={includeLedger}
                onChange={(e) => setIncludeLedger(e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
              />
              <span>Include Itemized Transaction Ledger</span>
            </label>
          </div>
        </div>

        {/* ── ACTION BUTTONS ── */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-200">
          <div className="text-xs text-slate-500">
            Certified compliant with standard UK double-entry reporting requirements.
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={() => setShowPreviewModal(true)}
              disabled={isGeneratingPDF || !selectedAccount}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer disabled:opacity-50"
              title="Preview statement document before downloading"
            >
              <Eye className="w-4 h-4 text-slate-500" />
              <span>Preview</span>
            </button>

            <button
              type="button"
              onClick={handleGeneratePDF}
              disabled={isGeneratingPDF || !selectedAccount}
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50"
            >
              {isGeneratingPDF ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Generating Statement PDF...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Download PDF Account Statement</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ── SPLIT LIVE DOCUMENT PREVIEW MODAL ── */}
      {showPreviewModal && activeStatementData && (
        <AccountStatementPreviewModal
          isOpen={showPreviewModal}
          onClose={() => setShowPreviewModal(false)}
          statementData={activeStatementData}
          companyDetails={companyDetails}
          onDownloadPDF={handleGeneratePDF}
          isGeneratingPDF={isGeneratingPDF}
        />
      )}
    </Modal>
  );
};

export default AccountStatementModal;
