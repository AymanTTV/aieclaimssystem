// src/components/finance/ProfitPayoutActionBar.tsx
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Account, Transaction } from '../../types';
import { useFormattedDisplay } from '../../hooks/useFormattedDisplay';
import { useAuth } from '../../context/AuthContext';
import {
  collection,
  doc,
  getDoc,
  writeBatch,
  Timestamp,
  serverTimestamp,
  onSnapshot,
  query,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { sanitizeForFirestore } from '../../services/unifiedSync.service';
import toast from 'react-hot-toast';
import {
  PieChart,
  Calendar,
  Building2,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  Wallet,
  ArrowRight,
  Receipt,
  ChevronDown,
  ChevronUp,
  History,
  FileCheck,
  Check,
  Loader2,
  Percent,
  TrendingUp,
  Info,
  Download,
  FileText,
} from 'lucide-react';
import { startOfMonth, endOfMonth, subMonths, startOfYear, format } from 'date-fns';
import { pdf } from '@react-pdf/renderer';
import { PayoutReceiptDocument, PayoutReceiptData } from '../pdf/documents/PayoutReceiptDocument';
import companySignatureFallback from '../../assets/signiture.png';
import companyLogoFallback from '../../assets/logo.png';
import Modal from '../ui/Modal';

// Robust, safe date conversion to prevent "RangeError: Invalid time value" across any Firestore/string/timestamp input
function toSafeDate(value: any): Date {
  if (!value) return new Date();
  if (value instanceof Date) {
    return isNaN(value.getTime()) ? new Date() : value;
  }
  if (typeof value?.toDate === 'function') {
    try {
      const d = value.toDate();
      if (d instanceof Date && !isNaN(d.getTime())) return d;
    } catch {}
  }
  if (typeof value === 'object') {
    const sec = value.seconds ?? value._seconds;
    if (typeof sec === 'number') {
      const d = new Date(sec * 1000);
      if (!isNaN(d.getTime())) return d;
    }
  }
  if (typeof value === 'number') {
    const d = new Date(value);
    if (!isNaN(d.getTime())) return d;
  }
  if (typeof value === 'string') {
    const s = value.trim();
    if (!s) return new Date();
    // Try YYYY-MM-DD
    const isoMatch = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
    if (isoMatch) {
      const y = parseInt(isoMatch[1], 10);
      const m = parseInt(isoMatch[2], 10) - 1;
      const d = parseInt(isoMatch[3], 10);
      const res = new Date(y, m, d);
      if (!isNaN(res.getTime())) return res;
    }
    // Try DD/MM/YYYY or DD-MM-YYYY
    const ukMatch = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
    if (ukMatch) {
      const d = parseInt(ukMatch[1], 10);
      const m = parseInt(ukMatch[2], 10) - 1;
      const y = parseInt(ukMatch[3], 10);
      const res = new Date(y, m, d);
      if (!isNaN(res.getTime())) return res;
    }
    try {
      const parsed = new Date(s);
      if (!isNaN(parsed.getTime())) return parsed;
    } catch {}
  }
  return new Date();
}

function safeFormat(value: any, formatPattern: string, fallback: string = '-'): string {
  try {
    const d = toSafeDate(value);
    if (!d || isNaN(d.getTime())) return fallback;
    return format(d, formatPattern);
  } catch {
    return fallback;
  }
}

interface ProfitPayoutActionBarProps {
  accounts: Account[];
  vehicles?: any[];
  transactions: Transaction[];
  onOpenPayoutModal?: (vehicleId?: string, accountId?: string, tab?: 'payout' | 'history') => void;
  onOpenManageAccounts?: () => void;
}

type PeriodPreset = 'this_month' | 'last_month' | 'ytd' | 'all_time';

export const ProfitPayoutActionBar: React.FC<ProfitPayoutActionBarProps> = ({
  accounts = [],
  transactions = [],
  onOpenManageAccounts,
}) => {
  const { formatCurrency } = useFormattedDisplay();
  const { user } = useAuth();

  // ── Identify Company vs Partner Accounts ──
  const companyAccount = useMemo(() => {
    const exact = accounts.find((acc) => {
      const n = (acc.name || '').trim().toUpperCase();
      return n === 'AIE SKYLINE ACCOUNTS' || n === 'AIE SKYLINE ACCOUNT' || n === 'AIE SKYLINE LIMITED';
    });
    if (exact) return exact;

    const partial = accounts.find((acc) =>
      (acc.name || '').trim().toUpperCase().includes('AIE SKYLINE')
    );
    if (partial) return partial;

    // Fallback if none found
    return (
      accounts[0] || {
        id: 'aie_default',
        name: 'AIE SKYLINE ACCOUNTS',
        balance: 0,
      }
    );
  }, [accounts]);

  // Partner / Shareholder Accounts (all accounts except the main company account)
  const partnerAccounts = useMemo(() => {
    return accounts.filter((acc) => {
      const n = (acc.name || '').trim().toUpperCase();
      return (
        !n.includes('AIE SKYLINE') &&
        acc.id !== companyAccount.id &&
        acc.accountType !== 'company'
      );
    });
  }, [accounts, companyAccount.id]);

  // All eligible accounts for selection (prefer partner accounts first, followed by others)
  const selectableAccounts = useMemo(() => {
    if (partnerAccounts.length > 0) return partnerAccounts;
    return accounts;
  }, [partnerAccounts, accounts]);

  // ── STEP 1: ACCOUNT & PERIOD SETUP STATE ──
  const [selectedAccountId, setSelectedAccountId] = useState<string>(() => {
    if (partnerAccounts.length > 0) return partnerAccounts[0].id;
    if (accounts.length > 0) return accounts[0].id;
    return '';
  });

  // Keep selectedAccountId synced if accounts load asynchronously
  useEffect(() => {
    if (!selectedAccountId && selectableAccounts.length > 0) {
      setSelectedAccountId(selectableAccounts[0].id);
    }
  }, [selectedAccountId, selectableAccounts]);

  const selectedAccount = useMemo(() => {
    return accounts.find((a) => a.id === selectedAccountId) || null;
  }, [accounts, selectedAccountId]);

  // Settlement Period Dates (defaults to current month)
  const [dateFrom, setDateFrom] = useState<string>(() => {
    try {
      return format(startOfMonth(new Date()), 'yyyy-MM-dd');
    } catch {
      return new Date().toISOString().split('T')[0];
    }
  });
  const [dateTo, setDateTo] = useState<string>(() => {
    try {
      return format(endOfMonth(new Date()), 'yyyy-MM-dd');
    } catch {
      return new Date().toISOString().split('T')[0];
    }
  });
  const [activePreset, setActivePreset] = useState<PeriodPreset | 'custom'>('this_month');

  // Linked Commission Split Inputs (Default: 30% Company, 70% Shareholder)
  const [companyCommissionPct, setCompanyCommissionPct] = useState<number>(30);
  const [shareholderPayoutPct, setShareholderPayoutPct] = useState<number>(70);

  const handleCompanyCommissionChange = (valStr: string) => {
    const val = Math.max(0, Math.min(100, Number(valStr) || 0));
    setCompanyCommissionPct(val);
    setShareholderPayoutPct(100 - val);
  };

  const handleShareholderPayoutChange = (valStr: string) => {
    const val = Math.max(0, Math.min(100, Number(valStr) || 0));
    setShareholderPayoutPct(val);
    setCompanyCommissionPct(100 - val);
  };

  const setSplitPreset = (comp: number, share: number) => {
    setCompanyCommissionPct(comp);
    setShareholderPayoutPct(share);
  };

  // Quick Period Presets handler
  const handlePeriodPreset = (preset: PeriodPreset) => {
    setActivePreset(preset);
    const now = new Date();
    try {
      if (preset === 'this_month') {
        setDateFrom(format(startOfMonth(now), 'yyyy-MM-dd'));
        setDateTo(format(endOfMonth(now), 'yyyy-MM-dd'));
      } else if (preset === 'last_month') {
        const prev = subMonths(now, 1);
        setDateFrom(format(startOfMonth(prev), 'yyyy-MM-dd'));
        setDateTo(format(endOfMonth(prev), 'yyyy-MM-dd'));
      } else if (preset === 'ytd') {
        setDateFrom(format(startOfYear(now), 'yyyy-MM-dd'));
        setDateTo(format(now, 'yyyy-MM-dd'));
      } else if (preset === 'all_time') {
        setDateFrom('2020-01-01');
        setDateTo(format(now, 'yyyy-MM-dd'));
      }
    } catch (err) {
      console.warn('Preset date calculation error:', err);
    }
  };

  // ── STEP 2: ACCOUNT P&L SUMMARY CALCULATION ──
  // 1. Filter all transactions associated with the selected account in the settlement period
  const accountTransactions = useMemo(() => {
    if (!selectedAccountId) return [];

    const fromDateObj = toSafeDate(dateFrom);
    fromDateObj.setHours(0, 0, 0, 0);
    const toDateObj = toSafeDate(dateTo);
    toDateObj.setHours(23, 59, 59, 999);

    const fromTime = fromDateObj.getTime();
    const toTime = toDateObj.getTime();

    const selectedAccName = (selectedAccount?.name || '').toLowerCase().trim();

    return transactions.filter((tx) => {
      // 1. Date Range Filter
      if (!tx.date) return false;
      const txDate = toSafeDate(tx.date);
      const txTime = txDate.getTime();
      if (isNaN(txTime) || txTime < fromTime || txTime > toTime) return false;
      if (tx.status === 'cancelled') return false;

      // 2. Check association with Selected Account
      const accsTo = Array.isArray(tx.accountsTo) ? tx.accountsTo : [];
      const accsFrom = Array.isArray(tx.accountsFrom) ? tx.accountsFrom : [];
      const singleTo = tx.accountTo;
      const singleFrom = tx.accountFrom;
      const directAccId = (tx as any).accountId || (tx as any).account || (tx as any).bankAccountId;

      const isAccIdMatch =
        accsTo.includes(selectedAccountId) ||
        accsFrom.includes(selectedAccountId) ||
        singleTo === selectedAccountId ||
        singleFrom === selectedAccountId ||
        directAccId === selectedAccountId;

      const isNameMatch = Boolean(
        selectedAccName &&
        (
          ((tx as any).relatedAccountName && (tx as any).relatedAccountName.toLowerCase().trim() === selectedAccName) ||
          ((tx as any).accountName && (tx as any).accountName.toLowerCase().trim() === selectedAccName) ||
          ((tx as any).accountFromName && (tx as any).accountFromName.toLowerCase().trim() === selectedAccName) ||
          ((tx as any).accountToName && (tx as any).accountToName.toLowerCase().trim() === selectedAccName)
        )
      );

      const isVehicleMatch = Boolean(
        (selectedAccount?.vehicleId && tx.vehicleId === selectedAccount.vehicleId) ||
        (selectedAccount?.vehicleRegistration && (
          (tx.vehicleName && tx.vehicleName.toLowerCase() === selectedAccount.vehicleRegistration.toLowerCase()) ||
          ((tx as any).vehicleReg && (tx as any).vehicleReg.toLowerCase() === selectedAccount.vehicleRegistration.toLowerCase())
        ))
      );

      return isAccIdMatch || isNameMatch || isVehicleMatch;
    });
  }, [transactions, selectedAccountId, selectedAccount, dateFrom, dateTo]);

  // 2. Robust Expense & Income Aggregation Reducer
  const { periodIncome, periodExpenses, netProfit, contributingTxns } = useMemo(() => {
    if (!accountTransactions || accountTransactions.length === 0) {
      return { periodIncome: 0, periodExpenses: 0, netProfit: 0, contributingTxns: [] };
    }

    const txnsList: Array<{ tx: Transaction; role: 'income' | 'expense'; amount: number }> = [];

    const summary = accountTransactions.reduce(
      (acc, item) => {
        // 1. Extract values safely
        const rawAmount = Number((item as any).amount || (item as any).billed || (item as any).customerBilled || (item as any).grossBilling || item.paidAmount || (item as any).paid || 0);
        const amount = Math.abs(rawAmount);
        const rawDealerCost = (item as any).dealerCost != null 
          ? Number((item as any).dealerCost) 
          : ((item as any).subcontractorCost != null ? Number((item as any).subcontractorCost) : 0);
        const dealerCost = Math.abs(rawDealerCost);

        // 2. Standardize string checks (handle case sensitivity)
        const type = (item.type || (item as any).transactionType || '').toUpperCase();
        const entryType = (item.entryType || '').toUpperCase();

        // 3. Bucket Income vs Expenses
        if (type === 'INCOME' || entryType === 'CREDIT') {
          acc.totalIncome += amount;
          txnsList.push({ tx: item, role: 'income', amount });

          // If there is a dealer/subcontractor cost attached to this income, it's an expense
          if (dealerCost > 0) {
            acc.totalExpenses += dealerCost;
            txnsList.push({
              tx: {
                ...item,
                id: `${item.id}_cost`,
                description: `${item.description || 'Income entry'} (Dealer / Subcontractor Cost)`,
                category: 'Dealer Cost',
              },
              role: 'expense',
              amount: dealerCost,
            });
          }
        } else if (
          type.includes('EXPENSE') || 
          entryType === 'DEBIT' || 
          type === 'LOAN' ||
          type.includes('MAINTENANCE') ||
          type.includes('COST') ||
          type.includes('PURCHASE') ||
          item.accountsFrom?.includes(selectedAccountId)
        ) {
          // It's an expense or debit row
          const totalRowExpense = amount + dealerCost;
          acc.totalExpenses += totalRowExpense;
          txnsList.push({ tx: item, role: 'expense', amount: totalRowExpense });
        } else {
          // Fallback based on directional ledger flow
          if (item.accountsFrom?.includes(selectedAccountId)) {
            const totalRowExpense = amount + dealerCost;
            acc.totalExpenses += totalRowExpense;
            txnsList.push({ tx: item, role: 'expense', amount: totalRowExpense });
          } else {
            acc.totalIncome += amount;
            txnsList.push({ tx: item, role: 'income', amount });
            if (dealerCost > 0) {
              acc.totalExpenses += dealerCost;
              txnsList.push({
                tx: { ...item, id: `${item.id}_cost`, description: `${item.description || 'Entry'} (Dealer Cost)` },
                role: 'expense',
                amount: dealerCost,
              });
            }
          }
        }

        return acc;
      },
      { totalIncome: 0, totalExpenses: 0 }
    );

    const totalIncome = Number(summary.totalIncome.toFixed(2));
    const totalExpenses = Number(summary.totalExpenses.toFixed(2));
    const net = Number((totalIncome - totalExpenses).toFixed(2));

    return {
      periodIncome: totalIncome,
      periodExpenses: totalExpenses,
      netProfit: net,
      contributingTxns: txnsList,
    };
  }, [accountTransactions, selectedAccountId]);

  // ── STEP 3: PAYOUT & TRANSFER AMOUNTS ──
  const netProfitToSplit = Math.max(0, netProfit);
  const companyCommissionAmount = useMemo(() => {
    if (netProfitToSplit <= 0) return 0;
    return Number(((netProfitToSplit * companyCommissionPct) / 100).toFixed(2));
  }, [netProfitToSplit, companyCommissionPct]);

  const shareholderPayoutAmount = useMemo(() => {
    if (netProfitToSplit <= 0) return 0;
    // Difference ensures exact penny matching with no rounding leak
    return Number((netProfitToSplit - companyCommissionAmount).toFixed(2));
  }, [netProfitToSplit, companyCommissionAmount]);

  // UI state for transactions breakdown drawer
  const [showTxBreakdown, setShowTxBreakdown] = useState<boolean>(false);

  // Settlement Confirmation Modal State
  const [showSettleModal, setShowSettleModal] = useState<boolean>(false);
  const [settlementDate, setSettlementDate] = useState<string>(() => {
    try {
      return format(new Date(), 'yyyy-MM-dd');
    } catch {
      return new Date().toISOString().split('T')[0];
    }
  });
  const [settlementNotes, setSettlementNotes] = useState<string>('');
  const [isSettling, setIsSettling] = useState<boolean>(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState<boolean>(false);

  // ── PDF GENERATION: DOWNLOAD PAYOUT SUMMARY ──
  const handleDownloadPayoutSummary = async () => {
    if (!selectedAccount) {
      toast.error('Please select an account first');
      return;
    }

    setIsGeneratingPDF(true);
    const toastId = toast.loading('Generating professional Payout Summary PDF...');

    try {
      // 1. Fetch company details with automatic company signature inclusion
      let companyDetails: any = {
        fullName: 'AIE Skyline Limited',
        tradingName: 'AIE Skyline',
        officialAddress: 'Unit 4, Business Park, London, UK',
        phone: '+44 20 8123 4567',
        email: 'info@aieskyline.co.uk',
        signature: companySignatureFallback,
        logoUrl: companyLogoFallback,
      };

      try {
        const companyDoc = await getDoc(doc(db, 'companySettings', 'details'));
        if (companyDoc.exists()) {
          const cData = companyDoc.data();
          companyDetails = {
            ...companyDetails,
            ...cData,
            // Ensure company signature image is always included automatically
            signature: cData.signature || cData.signatureUrl || companySignatureFallback,
            logoUrl: cData.logoUrl || cData.logo || companyLogoFallback,
          };
        }
      } catch (err) {
        console.warn('Could not fetch companySettings/details, using defaults:', err);
      }

      // 2. Prepare receipt data matching PayoutReceiptData interface
      const dateFromDisplay = safeFormat(dateFrom, 'dd/MM/yyyy');
      const dateToDisplay = safeFormat(dateTo, 'dd/MM/yyyy');
      const partnerAccountName = selectedAccount.name;

      const receiptData: PayoutReceiptData = {
        payoutReference: `PAYOUT-SUM-${safeFormat(new Date(), 'yyyyMMdd')}-${selectedAccount.id.slice(-4).toUpperCase()}`,
        payoutDate: new Date(),
        periodCovered: `${dateFromDisplay} to ${dateToDisplay}`,
        sourceAccountName: partnerAccountName,
        companyAccountName: companyAccount.name,
        grossBilled: periodIncome,
        expenses: periodExpenses,
        netProfit: netProfitToSplit,
        companySharePct: companyCommissionPct,
        companyShareAmount: companyCommissionAmount,
        ownerName: partnerAccountName,
        ownerSharePct: shareholderPayoutPct,
        ownerShareAmount: shareholderPayoutAmount,
        createdBy: user?.name || user?.email || 'Finance Manager',
        notes: `Account-level commission split settlement summary for ${partnerAccountName} covering ${dateFromDisplay} to ${dateToDisplay}. Calculated Company Commission: ${companyCommissionPct}%, Shareholder Payout: ${shareholderPayoutPct}%.`,
      };

      // 3. Render document using @react-pdf/renderer
      const blob = await pdf(
        <PayoutReceiptDocument data={receiptData} companyDetails={companyDetails} />
      ).toBlob();

      // 4. Trigger download
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const safeAccountName = partnerAccountName.replace(/[^a-zA-Z0-9_-]/g, '_');
      link.download = `Payout_Summary_${safeAccountName}_${safeFormat(dateFrom, 'yyyy-MM-dd')}_to_${safeFormat(dateTo, 'yyyy-MM-dd')}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('Payout summary PDF downloaded successfully!', { id: toastId });
    } catch (error: any) {
      console.error('Error generating Payout Summary PDF:', error);
      toast.error(`Failed to generate PDF: ${error?.message || 'Unknown error'}`, { id: toastId });
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  // State and handler for downloading historical settlement receipt
  const [downloadingReceiptId, setDownloadingReceiptId] = useState<string | null>(null);

  const handleDownloadHistoricalReceipt = async (item: any) => {
    setDownloadingReceiptId(item.id);
    const toastId = toast.loading(`Generating receipt for ${item.accountName || 'Settlement'}...`);
    try {
      let companyDetails: any = {
        fullName: 'AIE Skyline Limited',
        tradingName: 'AIE Skyline',
        officialAddress: 'Unit 4, Business Park, London, UK',
        phone: '+44 20 8123 4567',
        email: 'info@aieskyline.co.uk',
        signature: companySignatureFallback,
        logoUrl: companyLogoFallback,
      };

      try {
        const companyDoc = await getDoc(doc(db, 'companySettings', 'details'));
        if (companyDoc.exists()) {
          const cData = companyDoc.data();
          companyDetails = {
            ...companyDetails,
            ...cData,
            signature: cData.signature || cData.signatureUrl || companySignatureFallback,
            logoUrl: cData.logoUrl || cData.logo || companyLogoFallback,
          };
        }
      } catch (err) {
        console.warn('Could not fetch companySettings/details:', err);
      }

      const datePaidVal = item.datePaid || item.createdAt || new Date();
      const receiptData: PayoutReceiptData = {
        payoutReference: item.payoutReference || `SETTLE-${item.id.slice(-6).toUpperCase()}`,
        payoutDate: toSafeDate(datePaidVal),
        periodCovered: item.periodCovered || 'Settlement Period',
        sourceAccountName: item.accountName || 'Partner Account',
        companyAccountName: item.companyAccountName || 'AIE SKYLINE ACCOUNTS',
        grossBilled: Number(item.grossBilled || item.totalIncome || 0),
        expenses: Number(item.expenses || item.totalExpenses || 0),
        netProfit: Number(item.totalProfit || item.netProfit || 0),
        companySharePct: Number(item.companySharePct || 30),
        companyShareAmount: Number(item.companyShareAmount || 0),
        ownerName: item.ownerName || item.accountName || 'Partner Co-Owner',
        ownerSharePct: Number(item.ownerSharePct || 70),
        ownerShareAmount: Number(item.ownerShareAmount || 0),
        createdBy: item.createdBy || 'Finance Manager',
        notes: item.notes || `Profit payout receipt for ${item.accountName || 'Partner Account'}.`,
      };

      const blob = await pdf(
        <PayoutReceiptDocument data={receiptData} companyDetails={companyDetails} />
      ).toBlob();

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const refSafe = (item.payoutReference || item.id || 'settlement').replace(/[^a-zA-Z0-9_-]/g, '_');
      link.download = `Payout_Receipt_${refSafe}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('Payout receipt downloaded successfully!', { id: toastId });
    } catch (err: any) {
      console.error('Error generating historical receipt PDF:', err);
      toast.error(`Failed to download receipt: ${err?.message || 'Unknown error'}`, { id: toastId });
    } finally {
      setDownloadingReceiptId(null);
    }
  };

  // Payout History Live Subscription State
  const [payoutHistory, setPayoutHistory] = useState<any[]>([]);
  const [payoutLogs, setPayoutLogs] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);
  const [historyTab, setHistoryTab] = useState<'settlements' | 'logs'>('settlements');

  useEffect(() => {
    setLoadingHistory(true);
    const qHistory = query(collection(db, 'payout_history'), orderBy('createdAt', 'desc'), limit(25));
    const unsubHistory = onSnapshot(
      qHistory,
      (snapshot) => {
        const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        setPayoutHistory(list);
        setLoadingHistory(false);
      },
      (err) => {
        console.warn('Payout history onSnapshot error:', err);
        setLoadingHistory(false);
      }
    );

    // Live subscription to new 'payout_logs' audit collection
    const qLogs = query(collection(db, 'payout_logs'), orderBy('timestamp', 'desc'), limit(30));
    const unsubLogs = onSnapshot(
      qLogs,
      (snapshot) => {
        const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        setPayoutLogs(list);
      },
      (err) => {
        console.warn('Payout logs onSnapshot error:', err);
      }
    );

    return () => {
      unsubHistory();
      unsubLogs();
    };
  }, []);

  // ── STEP 4: BACKEND & FIRESTORE SETTLEMENT ACTION ──
  const handleExecuteSettlement = async () => {
    if (!selectedAccount) {
      toast.error('Please select an account to settle');
      return;
    }
    if (netProfitToSplit <= 0) {
      toast.error('Net Profit to split must be greater than £0.00');
      return;
    }

    setIsSettling(true);
    const toastId = toast.loading('Recording payout & settling account in Finance Ledger...');

    try {
      const payoutTimestamp = toSafeDate(settlementDate);
      const dateFromDisplay = safeFormat(dateFrom, 'dd/MM/yyyy');
      const dateToDisplay = safeFormat(dateTo, 'dd/MM/yyyy');
      const partnerAccountName = selectedAccount.name;

      // 1. Submit API request to backend ledger route
      try {
        await fetch('/api/finance/shared-ownership/commission-payout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            partnerAccountId: selectedAccount.id,
            partnerAccountName,
            companyAccountId: companyAccount.id,
            companyAccountName: companyAccount.name,
            dateFrom: dateFromDisplay,
            dateTo: dateToDisplay,
            totalIncome: periodIncome,
            totalExpenses: periodExpenses,
            netProfit: netProfitToSplit,
            companyCommissionPct,
            companyCommissionAmount,
            shareholderPayoutPct,
            shareholderPayoutAmount,
            payoutDate: payoutTimestamp.toISOString(),
            notes: settlementNotes,
            userId: user?.id || (user as any)?.uid || 'unknown_user',
            userEmail: user?.email || '',
            createdBy: user?.name || user?.email || 'Finance Admin',
          }),
        });
      } catch (apiErr) {
        console.warn('Server API notification warning:', apiErr);
      }

      // 2. Direct Firestore Ledger Commit (Batch for absolute real-time persistence)
      const batch = writeBatch(db);
      const txCol = collection(db, 'transactions');

      // (A) Debit/Expense entry on Partner Account for Shareholder Payout
      // Description: "Shareholder Payout: [Date From] to [Date To]"
      const shareholderTxRef = doc(txCol);
      const shareholderTxData = sanitizeForFirestore({
        type: 'expense',
        transactionType: 'EXPENSE',
        entryType: 'DEBIT',
        category: 'Shareholder Payout',
        amount: shareholderPayoutAmount,
        netAmount: shareholderPayoutAmount,
        vatAmount: 0,
        description: `Shareholder Payout: ${dateFromDisplay} to ${dateToDisplay}`,
        customerName: partnerAccountName,
        accountFrom: selectedAccount.id,
        accountsFrom: [selectedAccount.id],
        paymentMethod: 'bank_transfer',
        paymentReference: `PAYOUT-${Date.now().toString().slice(-6)}`,
        status: 'completed',
        paymentStatus: 'paid',
        date: Timestamp.fromDate(payoutTimestamp),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: user?.name || user?.email || 'Finance Admin',
        notes: settlementNotes || undefined,
      });
      batch.set(shareholderTxRef, shareholderTxData);

      // (B) Debit/Expense entry on Partner Account for Company Commission
      // Description: "Company Commission: [Account Name]"
      const commissionDebitTxRef = doc(txCol);
      const commissionDebitTxData = sanitizeForFirestore({
        type: 'expense',
        transactionType: 'EXPENSE',
        entryType: 'DEBIT',
        category: 'Company Commission',
        amount: companyCommissionAmount,
        netAmount: companyCommissionAmount,
        vatAmount: 0,
        description: `Company Commission: ${partnerAccountName}`,
        customerName: companyAccount.name,
        accountFrom: selectedAccount.id,
        accountsFrom: [selectedAccount.id],
        accountTo: companyAccount.id,
        accountsTo: [companyAccount.id],
        paymentMethod: 'bank_transfer',
        paymentReference: `COMM-DEB-${Date.now().toString().slice(-6)}`,
        status: 'completed',
        paymentStatus: 'paid',
        date: Timestamp.fromDate(payoutTimestamp),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: user?.name || user?.email || 'Finance Admin',
        notes: settlementNotes || undefined,
      });
      batch.set(commissionDebitTxRef, commissionDebitTxData);

      // (C) Matching Credit/Income entry on Main AIE Skyline Account
      // Description: "Company Commission: [Account Name]"
      const commissionCreditTxRef = doc(txCol);
      const commissionCreditTxData = sanitizeForFirestore({
        type: 'income',
        transactionType: 'INCOME',
        entryType: 'CREDIT',
        category: 'Company Commission',
        amount: companyCommissionAmount,
        netAmount: companyCommissionAmount,
        vatAmount: 0,
        description: `Company Commission: ${partnerAccountName}`,
        customerName: partnerAccountName,
        accountTo: companyAccount.id,
        accountsTo: [companyAccount.id],
        accountFrom: selectedAccount.id,
        accountsFrom: [selectedAccount.id],
        paymentMethod: 'bank_transfer',
        paymentReference: `COMM-CRD-${Date.now().toString().slice(-6)}`,
        status: 'completed',
        paymentStatus: 'paid',
        date: Timestamp.fromDate(payoutTimestamp),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: user?.name || user?.email || 'Finance Admin',
        notes: settlementNotes || undefined,
      });
      batch.set(commissionCreditTxRef, commissionCreditTxData);

      // (D) Adjust Account balances in Firestore
      const partnerAccDocRef = doc(db, 'accounts', selectedAccount.id);
      const currentPartnerBalance = Number(selectedAccount.balance) || 0;
      const totalDebitedFromPartner = shareholderPayoutAmount + companyCommissionAmount;
      batch.update(partnerAccDocRef, {
        balance: currentPartnerBalance - totalDebitedFromPartner,
        updatedAt: serverTimestamp(),
      });

      if (companyAccount.id && companyAccount.id !== 'aie_default') {
        const companyAccDocRef = doc(db, 'accounts', companyAccount.id);
        const currentCompanyBalance = Number(companyAccount.balance) || 0;
        batch.update(companyAccDocRef, {
          balance: currentCompanyBalance + companyCommissionAmount,
          updatedAt: serverTimestamp(),
        });
      }

      // (E) Record audit entry in 'payout_history'
      const payoutHistoryRef = doc(collection(db, 'payout_history'));
      const payoutHistoryData = sanitizeForFirestore({
        accountId: selectedAccount.id,
        accountName: partnerAccountName,
        datePaid: Timestamp.fromDate(payoutTimestamp),
        periodCovered: `${dateFromDisplay} to ${dateToDisplay}`,
        grossBilled: periodIncome,
        expenses: periodExpenses,
        totalProfit: netProfitToSplit,
        companySharePct: companyCommissionPct,
        companyShareAmount: companyCommissionAmount,
        companyAccountId: companyAccount.id,
        companyAccountName: companyAccount.name,
        ownerSharePct: shareholderPayoutPct,
        ownerShareAmount: shareholderPayoutAmount,
        ownerName: partnerAccountName,
        payoutReference: `SETTLE-${Date.now().toString().slice(-6)}`,
        shareholderTxId: shareholderTxRef.id,
        commissionDebitTxId: commissionDebitTxRef.id,
        commissionCreditTxId: commissionCreditTxRef.id,
        notes: settlementNotes || '',
        status: 'completed',
        createdAt: serverTimestamp(),
        createdBy: user?.name || user?.email || 'Finance Admin',
      });
      batch.set(payoutHistoryRef, payoutHistoryData);

      // (F) Record strict audit log in 'payout_logs' collection
      const payoutLogRef = doc(collection(db, 'payout_logs'));
      const actionDescription = `Profit Distribution Payout Settled for ${partnerAccountName}: ${formatCurrency(shareholderPayoutAmount)} payout to shareholder (${shareholderPayoutPct}%), ${formatCurrency(companyCommissionAmount)} commission to ${companyAccount.name} (${companyCommissionPct}%) for period ${dateFromDisplay} to ${dateToDisplay}.`;

      const payoutLogData = sanitizeForFirestore({
        userId: user?.id || (user as any)?.uid || 'unknown_user',
        timestamp: serverTimestamp(),
        actionDescription,
        action: 'PROFIT_DISTRIBUTION_PAYOUT_SETTLED',
        accountId: selectedAccount.id,
        accountName: partnerAccountName,
        companyAccountId: companyAccount.id,
        companyAccountName: companyAccount.name,
        periodCovered: `${dateFromDisplay} to ${dateToDisplay}`,
        dateFrom: dateFromDisplay,
        dateTo: dateToDisplay,
        totalIncome: periodIncome,
        totalExpenses: periodExpenses,
        netProfit: netProfitToSplit,
        shareholderPayoutAmount,
        shareholderPayoutPct,
        companyCommissionAmount,
        companyCommissionPct,
        shareholderTxId: shareholderTxRef.id,
        commissionDebitTxId: commissionDebitTxRef.id,
        commissionCreditTxId: commissionCreditTxRef.id,
        payoutHistoryId: payoutHistoryRef.id,
        payoutDate: Timestamp.fromDate(payoutTimestamp),
        userName: user?.name || user?.email || 'Finance Admin',
        userEmail: user?.email || '',
        userRole: user?.role || 'user',
        notes: settlementNotes || undefined,
        createdAt: serverTimestamp(),
      });
      batch.set(payoutLogRef, payoutLogData);

      await batch.commit();

      toast.success(
        `Settlement recorded! ${formatCurrency(shareholderPayoutAmount)} paid to shareholder and ${formatCurrency(companyCommissionAmount)} transferred to AIE Skyline.`,
        { id: toastId, duration: 6000 }
      );

      setShowSettleModal(false);
      setSettlementNotes('');
    } catch (err: any) {
      console.error('Settlement error:', err);
      toast.error(`Settlement failed: ${err?.message || 'Database error'}`, { id: toastId });
    } finally {
      setIsSettling(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ── HEADER BANNER ── */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white shadow-md border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-semibold border border-indigo-400/30">
              <PieChart className="w-3.5 h-3.5" />
              <span>Account-Level Commission Payout</span>
            </div>
            <h2 className="text-xl md:text-2xl font-black tracking-tight text-white">
              Profit Distribution &amp; Commission Settlement
            </h2>
            <p className="text-sm text-slate-300 max-w-2xl">
              Calculate total net profit for a partner account over a settlement period, automatically compute the company commission split, and record the payout in the Finance Ledger.
            </p>
          </div>
          {onOpenManageAccounts && (
            <button
              type="button"
              onClick={onOpenManageAccounts}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-xs font-bold text-slate-200 border border-slate-700 transition cursor-pointer self-start md:self-auto"
            >
              <Building2 className="w-4 h-4 text-indigo-400" />
              Manage Accounts
            </button>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          1. STEP 1: ACCOUNT & PERIOD SETUP (Top Section)
         ══════════════════════════════════════════════════════════════════ */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 sm:p-6 space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-black">
              1
            </span>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Step 1: Account &amp; Period Setup
            </h3>
          </div>
          <span className="text-xs text-slate-400 font-medium">Define Settlement Scope</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Select Account */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Select Account
            </label>
            <div className="relative">
              <select
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
                className="w-full h-11 pl-3.5 pr-10 text-sm font-medium rounded-xl border border-slate-300 bg-slate-50/50 hover:bg-white focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 text-slate-900 transition cursor-pointer"
              >
                {selectableAccounts.length === 0 ? (
                  <option value="">No Accounts Available</option>
                ) : (
                  selectableAccounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} — Current Balance: {formatCurrency(acc.balance || 0)}
                    </option>
                  ))
                )}
              </select>
            </div>
            {selectedAccount && (
              <p className="text-[11px] text-slate-500 flex items-center justify-between pt-1">
                <span>Account: <strong className="text-slate-800">{selectedAccount.name}</strong></span>
                <span>Ledger Balance: <strong className={selectedAccount.balance >= 0 ? 'text-emerald-700' : 'text-rose-700'}>{formatCurrency(selectedAccount.balance || 0)}</strong></span>
              </p>
            )}
          </div>

          {/* Date Range Pickers & Quick Presets */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Settlement Period
              </label>
              {/* Presets */}
              <div className="flex items-center gap-1 text-[11px]">
                <button
                  type="button"
                  onClick={() => handlePeriodPreset('this_month')}
                  className={`px-2 py-0.5 rounded-md font-semibold transition cursor-pointer ${
                    activePreset === 'this_month'
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  This Month
                </button>
                <button
                  type="button"
                  onClick={() => handlePeriodPreset('last_month')}
                  className={`px-2 py-0.5 rounded-md font-semibold transition cursor-pointer ${
                    activePreset === 'last_month'
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  Last Month
                </button>
                <button
                  type="button"
                  onClick={() => handlePeriodPreset('ytd')}
                  className={`px-2 py-0.5 rounded-md font-semibold transition cursor-pointer ${
                    activePreset === 'ytd'
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  YTD
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="block text-[10px] text-slate-400 font-medium mb-1">Date From</span>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => {
                    setDateFrom(e.target.value);
                    setActivePreset('custom');
                  }}
                  className="w-full h-11 px-3 text-xs font-medium rounded-xl border border-slate-300 bg-slate-50/50 hover:bg-white focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 text-slate-900 transition"
                />
              </div>
              <div>
                <span className="block text-[10px] text-slate-400 font-medium mb-1">Date To</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => {
                    setDateTo(e.target.value);
                    setActivePreset('custom');
                  }}
                  className="w-full h-11 px-3 text-xs font-medium rounded-xl border border-slate-300 bg-slate-50/50 hover:bg-white focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 text-slate-900 transition"
                />
              </div>
            </div>
          </div>

          {/* Linked Commission Split Inputs */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Commission Split
              </label>
              <div className="flex items-center gap-1 text-[10px]">
                <button
                  type="button"
                  onClick={() => setSplitPreset(30, 70)}
                  className={`px-1.5 py-0.5 rounded font-bold transition cursor-pointer ${
                    companyCommissionPct === 30 ? 'bg-indigo-100 text-indigo-700' : 'text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  30/70
                </button>
                <button
                  type="button"
                  onClick={() => setSplitPreset(20, 80)}
                  className={`px-1.5 py-0.5 rounded font-bold transition cursor-pointer ${
                    companyCommissionPct === 20 ? 'bg-indigo-100 text-indigo-700' : 'text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  20/80
                </button>
                <button
                  type="button"
                  onClick={() => setSplitPreset(50, 50)}
                  className={`px-1.5 py-0.5 rounded font-bold transition cursor-pointer ${
                    companyCommissionPct === 50 ? 'bg-indigo-100 text-indigo-700' : 'text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  50/50
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Company Commission Input */}
              <div>
                <span className="block text-[10px] text-slate-500 font-semibold mb-1 flex items-center justify-between">
                  <span>Company Commission</span>
                  <span className="text-indigo-600 font-bold">AIE Skyline</span>
                </span>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={companyCommissionPct}
                    onChange={(e) => handleCompanyCommissionChange(e.target.value)}
                    className="w-full h-11 pl-3 pr-8 text-sm font-bold text-slate-900 rounded-xl border border-slate-300 bg-slate-50/50 focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs pointer-events-none">
                    %
                  </span>
                </div>
              </div>

              {/* Shareholder Payout Input */}
              <div>
                <span className="block text-[10px] text-slate-500 font-semibold mb-1 flex items-center justify-between">
                  <span>Shareholder Payout</span>
                  <span className="text-emerald-600 font-bold">Partner</span>
                </span>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={shareholderPayoutPct}
                    onChange={(e) => handleShareholderPayoutChange(e.target.value)}
                    className="w-full h-11 pl-3 pr-8 text-sm font-bold text-slate-900 rounded-xl border border-slate-300 bg-slate-50/50 focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs pointer-events-none">
                    %
                  </span>
                </div>
              </div>
            </div>
            <p className="text-[11px] text-slate-400 text-right">
              Total Split: <strong className="text-slate-700">{companyCommissionPct + shareholderPayoutPct}%</strong>
            </p>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          2. STEP 2: ACCOUNT P&L SUMMARY (Middle Section)
         ══════════════════════════════════════════════════════════════════ */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-black">
              2
            </span>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Step 2: Account P&amp;L Summary
            </h3>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500 font-mono hidden sm:inline">
              {safeFormat(dateFrom, 'dd MMM yyyy')} — {safeFormat(dateTo, 'dd MMM yyyy')}
            </span>
            <button
              type="button"
              disabled={!selectedAccount || isGeneratingPDF}
              onClick={handleDownloadPayoutSummary}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg border border-indigo-200/80 transition cursor-pointer disabled:opacity-50"
              title="Download Payout Summary PDF"
            >
              {isGeneratingPDF ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              <span className="hidden sm:inline">Download Payout Summary</span>
            </button>
          </div>
        </div>

        {/* Receipt-Style Statement Breakdown */}
        <div className="p-5 sm:p-6 bg-slate-50/60">
          <div className="max-w-2xl mx-auto bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 sm:p-6 space-y-4">
            {/* Receipt Header */}
            <div className="flex items-center justify-between border-b border-dashed border-slate-200 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">
                    Account Settlement Statement
                  </h4>
                  <p className="text-xs text-slate-500 font-medium">
                    Target: <strong className="text-slate-800">{selectedAccount?.name || 'Selected Account'}</strong>
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                  Cash Basis
                </span>
                <p className="text-[10px] text-slate-400 mt-1">
                  {contributingTxns.length} transactions in period
                </p>
              </div>
            </div>

            {/* Receipt Line Items */}
            <div className="space-y-3 py-2 text-sm">
              {/* Income Line */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-700">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="font-medium">Total Account Income (for the period):</span>
                </div>
                <span className="font-mono font-bold text-emerald-700 text-base">
                  +{formatCurrency(periodIncome)}
                </span>
              </div>

              {/* Expenses Line */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-700">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  <span className="font-medium">Less Account Expenses (for the period):</span>
                </div>
                <span className="font-mono font-bold text-rose-700 text-base">
                  -{formatCurrency(periodExpenses)}
                </span>
              </div>

              {/* Divider */}
              <div className="border-t border-slate-200 pt-3" />

              {/* Net Profit to Split Line */}
              <div className="flex items-center justify-between pt-1">
                <div>
                  <span className="text-base font-black text-slate-900 block">
                    Net Profit to Split:
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Total Income less Total Expenses
                  </span>
                </div>
                <div className="text-right">
                  <span
                    className={`font-mono text-2xl sm:text-3xl font-black block tracking-tight ${
                      netProfit > 0 ? 'text-emerald-700' : 'text-slate-700'
                    }`}
                  >
                    {formatCurrency(netProfit)}
                  </span>
                  {netProfit <= 0 && (
                    <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                      No positive profit to distribute
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Toggle to view contributing transactions */}
            {contributingTxns.length > 0 && (
              <div className="border-t border-dashed border-slate-200 pt-3">
                <button
                  type="button"
                  onClick={() => setShowTxBreakdown(!showTxBreakdown)}
                  className="w-full flex items-center justify-between text-xs font-semibold text-indigo-700 hover:text-indigo-900 transition py-1 cursor-pointer"
                >
                  <span>
                    {showTxBreakdown ? 'Hide' : 'View'} Contributing Transactions ({contributingTxns.length})
                  </span>
                  {showTxBreakdown ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {showTxBreakdown && (
                  <div className="mt-3 max-h-60 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl bg-slate-50/50 p-2">
                    {contributingTxns.map(({ tx, role, amount }, idx) => {
                      return (
                        <div key={tx.id || idx} className="py-2 px-2 flex items-center justify-between text-xs">
                          <div>
                            <span className="font-semibold text-slate-800 block truncate max-w-xs">
                              {tx.description || tx.category || 'Transaction'}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {safeFormat(tx.date, 'dd MMM yyyy')} • {tx.category || tx.type}
                            </span>
                          </div>
                          <span
                            className={`font-mono font-bold ${
                              role === 'income' ? 'text-emerald-700' : 'text-rose-700'
                            }`}
                          >
                            {role === 'income' ? '+' : '-'}{formatCurrency(amount)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          3. STEP 3: PAYOUT & TRANSFER ACTION (Bottom Section)
         ══════════════════════════════════════════════════════════════════ */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 sm:p-6 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-black">
              3
            </span>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Step 3: Payout &amp; Transfer Action
            </h3>
          </div>
          <span className="text-xs text-slate-400 font-medium">Automatic Settlement Split</span>
        </div>

        {/* Visual Dual Split Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* ACTION 1: Company Commission */}
          <div className="bg-gradient-to-br from-indigo-50/70 to-slate-50/70 border border-indigo-200/80 rounded-2xl p-5 flex flex-col justify-between hover:border-indigo-300 transition-all shadow-2xs">
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-indigo-950 uppercase tracking-wide">
                      Company Commission
                    </h4>
                    <span className="text-xs font-bold text-indigo-700">
                      {companyCommissionPct}% Share
                    </span>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                  {companyCommissionPct}%
                </span>
              </div>

              <div className="mt-4">
                <span className="text-3xl font-black font-mono text-indigo-950 block tracking-tight">
                  {formatCurrency(companyCommissionAmount)}
                </span>
                <p className="text-xs font-semibold text-indigo-700 mt-1 flex items-center gap-1.5">
                  <ArrowRight className="w-3.5 h-3.5" />
                  Action: Transfer to AIE Skyline Account
                </p>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-indigo-100 text-[11px] text-slate-500 flex items-center justify-between">
              <span>Beneficiary Account:</span>
              <strong className="text-indigo-900 font-bold">{companyAccount.name}</strong>
            </div>
          </div>

          {/* ACTION 2: Shareholder Payout */}
          <div className="bg-gradient-to-br from-emerald-50/70 to-slate-50/70 border border-emerald-200/80 rounded-2xl p-5 flex flex-col justify-between hover:border-emerald-300 transition-all shadow-2xs">
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-emerald-950 uppercase tracking-wide">
                      Shareholder Payout
                    </h4>
                    <span className="text-xs font-bold text-emerald-700">
                      {shareholderPayoutPct}% Share
                    </span>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  {shareholderPayoutPct}%
                </span>
              </div>

              <div className="mt-4">
                <span className="text-3xl font-black font-mono text-emerald-950 block tracking-tight">
                  {formatCurrency(shareholderPayoutAmount)}
                </span>
                <p className="text-xs font-semibold text-emerald-700 mt-1 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Action: Mark as Paid to Shareholder
                </p>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-emerald-100 text-[11px] text-slate-500 flex items-center justify-between">
              <span>Partner Account:</span>
              <strong className="text-emerald-900 font-bold">{selectedAccount?.name || 'Shareholder'}</strong>
            </div>
          </div>
        </div>

        {/* Primary Action Buttons */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-slate-500">
            {netProfitToSplit > 0 ? (
              <span className="flex items-center gap-1.5 text-slate-600">
                <Info className="w-4 h-4 text-indigo-500 shrink-0" />
                Clicking will debit the partner account and credit company commission in the Finance Ledger.
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-amber-700 font-medium">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                Select an account and date range with positive net profit to settle.
              </span>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
            {/* Download Payout Summary Button */}
            <button
              type="button"
              disabled={!selectedAccount || isGeneratingPDF}
              onClick={handleDownloadPayoutSummary}
              className={`w-full sm:w-auto px-5 py-3.5 rounded-xl font-bold text-sm border transition-all flex items-center justify-center gap-2 cursor-pointer ${
                selectedAccount && !isGeneratingPDF
                  ? 'bg-white hover:bg-slate-50 text-indigo-700 border-indigo-200 shadow-xs hover:border-indigo-300'
                  : 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
              }`}
              title="Download professional PDF receipt of current payout summary"
            >
              {isGeneratingPDF ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                  <span>Generating PDF...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 text-indigo-600" />
                  <span>Download Payout Summary</span>
                </>
              )}
            </button>

            {/* Record Payout & Settle Account Button */}
            <button
              type="button"
              disabled={!selectedAccount || netProfitToSplit <= 0 || isSettling}
              onClick={() => setShowSettleModal(true)}
              className={`w-full sm:w-auto px-7 py-3.5 rounded-xl font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer ${
                selectedAccount && netProfitToSplit > 0 && !isSettling
                  ? 'bg-emerald-600 hover:bg-emerald-500 active:scale-98 text-white shadow-emerald-600/20'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
              }`}
            >
              <Wallet className="w-4 h-4" />
              <span>Record Payout &amp; Settle Account</span>
            </button>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          SETTLEMENT CONFIRMATION MODAL
         ══════════════════════════════════════════════════════════════════ */}
      <Modal
        isOpen={showSettleModal}
        onClose={() => !isSettling && setShowSettleModal(false)}
        title="Confirm Account Commission Settlement"
        size="lg"
      >
        <div className="space-y-5">
          <div className="bg-indigo-50/70 border border-indigo-200 rounded-xl p-4 text-xs text-indigo-950 space-y-1">
            <p className="font-bold text-sm">
              Settling {selectedAccount?.name}
            </p>
            <p className="text-indigo-800">
              Period: {safeFormat(dateFrom, 'dd/MM/yyyy')} to {safeFormat(dateTo, 'dd/MM/yyyy')}
            </p>
            <p className="text-indigo-900 font-mono font-bold pt-1">
              Net Profit to Settle: {formatCurrency(netProfitToSplit)}
            </p>
          </div>

          {/* Ledger Actions Review */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Finance Ledger Actions to be Recorded:
            </h4>

            {/* Action 1 */}
            <div className="border border-slate-200 rounded-xl p-3 bg-white space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-900">1. Shareholder Payout Entry</span>
                <span className="font-mono font-bold text-rose-700">
                  -{formatCurrency(shareholderPayoutAmount)} (Debit)
                </span>
              </div>
              <p className="text-[11px] text-slate-600">
                <strong>Account:</strong> {selectedAccount?.name}
              </p>
              <p className="text-[11px] text-slate-500 font-mono">
                <strong>Description:</strong> Shareholder Payout: {safeFormat(dateFrom, 'dd/MM/yyyy')} to {safeFormat(dateTo, 'dd/MM/yyyy')}
              </p>
            </div>

            {/* Action 2 */}
            <div className="border border-slate-200 rounded-xl p-3 bg-white space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-900">2. Company Commission Entry</span>
                <span className="font-mono font-bold text-rose-700">
                  -{formatCurrency(companyCommissionAmount)} (Debit)
                </span>
              </div>
              <p className="text-[11px] text-slate-600">
                <strong>Account:</strong> {selectedAccount?.name}
              </p>
              <p className="text-[11px] text-slate-500 font-mono">
                <strong>Description:</strong> Company Commission: {selectedAccount?.name}
              </p>
            </div>

            {/* Action 3 */}
            <div className="border border-indigo-200 rounded-xl p-3 bg-indigo-50/40 space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-indigo-950">3. Company Income Transfer Match</span>
                <span className="font-mono font-bold text-emerald-700">
                  +{formatCurrency(companyCommissionAmount)} (Credit)
                </span>
              </div>
              <p className="text-[11px] text-indigo-900">
                <strong>Account:</strong> {companyAccount.name}
              </p>
              <p className="text-[11px] text-indigo-800 font-mono">
                <strong>Description:</strong> Company Commission: {selectedAccount?.name}
              </p>
            </div>
          </div>

          {/* Form Options */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Settlement / Payment Date
              </label>
              <input
                type="date"
                value={settlementDate}
                onChange={(e) => setSettlementDate(e.target.value)}
                className="w-full h-10 px-3 text-xs font-medium rounded-xl border border-slate-300 bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Optional Notes / Reference
              </label>
              <input
                type="text"
                placeholder="e.g. Settled via bank transfer"
                value={settlementNotes}
                onChange={(e) => setSettlementNotes(e.target.value)}
                className="w-full h-10 px-3 text-xs font-medium rounded-xl border border-slate-300 bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100"
              />
            </div>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              disabled={isSettling}
              onClick={() => setShowSettleModal(false)}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isSettling}
              onClick={handleExecuteSettlement}
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 active:scale-98 text-white shadow-sm transition flex items-center gap-2 cursor-pointer"
            >
              {isSettling ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Processing Settlement...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Confirm &amp; Settle Account</span>
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* ══════════════════════════════════════════════════════════════════
          SETTLEMENT & PAYOUT AUDIT HISTORY (payout_history & payout_logs)
         ══════════════════════════════════════════════════════════════════ */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-indigo-600" />
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Settlement &amp; Payout Audit Trail
            </h4>
          </div>
          
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setHistoryTab('settlements')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                historyTab === 'settlements'
                  ? 'bg-white text-indigo-600 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Settlements ({payoutHistory.length})
            </button>
            <button
              type="button"
              onClick={() => setHistoryTab('logs')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                historyTab === 'logs'
                  ? 'bg-white text-indigo-600 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <FileCheck className="w-3.5 h-3.5" />
              <span>Audit Logs [payout_logs] ({payoutLogs.length})</span>
            </button>
          </div>
        </div>

        {loadingHistory ? (
          <div className="p-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
            <span>Loading audit history...</span>
          </div>
        ) : historyTab === 'settlements' ? (
          payoutHistory.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              No settlement payouts recorded yet. When you settle an account, the record will appear here.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/70 border-b border-slate-100 text-slate-500 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="py-2.5 px-4">Date</th>
                    <th className="py-2.5 px-4">Account</th>
                    <th className="py-2.5 px-4">Period</th>
                    <th className="py-2.5 px-4 text-right">Net Profit</th>
                    <th className="py-2.5 px-4 text-right">Commission</th>
                    <th className="py-2.5 px-4 text-right">Shareholder Payout</th>
                    <th className="py-2.5 px-4 text-center">Status</th>
                    <th className="py-2.5 px-4 text-center">Receipt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {payoutHistory.map((item) => {
                    const dateVal = item.datePaid || item.createdAt || item.date;
                    const isDownloadingThis = downloadingReceiptId === item.id;
                    return (
                      <tr key={item.id} className="hover:bg-slate-50/60 transition">
                        <td className="py-2.5 px-4 text-slate-700 font-medium">
                          {safeFormat(dateVal, 'dd MMM yyyy')}
                        </td>
                        <td className="py-2.5 px-4 font-bold text-slate-900">
                          {item.accountName || 'Partner'}
                        </td>
                        <td className="py-2.5 px-4 text-slate-500 text-[11px]">
                          {item.periodCovered || 'Settlement'}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-800">
                          {formatCurrency(item.totalProfit || 0)}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono font-bold text-indigo-700">
                          {formatCurrency(item.companyShareAmount || 0)} ({item.companySharePct || 30}%)
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono font-bold text-emerald-700">
                          {formatCurrency(item.ownerShareAmount || 0)} ({item.ownerSharePct || 70}%)
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            Settled
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => handleDownloadHistoricalReceipt(item)}
                            disabled={isDownloadingThis}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg border border-indigo-200 transition cursor-pointer disabled:opacity-50"
                            title="Download PDF Receipt with company signature"
                          >
                            {isDownloadingThis ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Download className="w-3 h-3" />
                            )}
                            <span>PDF</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        ) : (
          /* AUDIT LOGS VIEW ('payout_logs' collection) */
          payoutLogs.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              No audit logs recorded in <code className="px-1 py-0.5 bg-slate-100 rounded text-slate-600 font-mono">payout_logs</code> yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/70 border-b border-slate-100 text-slate-500 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="py-2.5 px-4">Timestamp</th>
                    <th className="py-2.5 px-4">User</th>
                    <th className="py-2.5 px-4">Action</th>
                    <th className="py-2.5 px-4">Action Description</th>
                    <th className="py-2.5 px-4">Account</th>
                    <th className="py-2.5 px-4 text-right">Payout Amounts</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-sans">
                  {payoutLogs.map((log) => {
                    const timeVal = log.timestamp || log.createdAt;
                    return (
                      <tr key={log.id} className="hover:bg-slate-50/60 transition">
                        <td className="py-2.5 px-4 text-slate-700 font-mono text-[11px] whitespace-nowrap">
                          {safeFormat(timeVal, 'dd MMM yyyy HH:mm:ss')}
                        </td>
                        <td className="py-2.5 px-4">
                          <span className="font-bold text-slate-900 block">
                            {log.userName || 'Finance Admin'}
                          </span>
                          <span className="font-mono text-[10px] text-slate-400 block truncate max-w-[140px]" title={log.userId}>
                            ID: {log.userId || 'N/A'}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800">
                            {log.action || 'SETTLED'}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-slate-700 text-xs max-w-md">
                          <p className="line-clamp-2 leading-relaxed">
                            {log.actionDescription || 'Settlement processed.'}
                          </p>
                          {log.periodCovered && (
                            <span className="text-[10px] text-slate-400 block mt-0.5 font-mono">
                              Period: {log.periodCovered}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-4 font-semibold text-slate-800">
                          {log.accountName || 'Partner Account'}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono text-[11px] whitespace-nowrap">
                          <div className="text-emerald-700 font-bold">
                            Shareholder: {formatCurrency(log.shareholderPayoutAmount || 0)}
                          </div>
                          <div className="text-indigo-600 font-medium">
                            Commission: {formatCurrency(log.companyCommissionAmount || 0)}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>
    </div>
  );
};

export default ProfitPayoutActionBar;
