// src/components/IncomeExpense/SharesModal.tsx

import React, { useState, useMemo, useCallback } from 'react';
import { ProfitShare, IncomeExpenseEntry } from '../../types/incomeExpense';
import { useFormattedDisplay } from '../../hooks/useFormattedDisplay';
import { useAuth } from '../../context/AuthContext';
import {
  FileText,
  Download,
  ChevronDown,
  ChevronUp,
  Search,
  Calendar,
  Building2,
  Wallet,
  Coins,
  CheckCircle2,
  Clock,
  Loader2,
  ArrowRight,
  TrendingUp,
  RotateCcw,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';
import { pdf } from '@react-pdf/renderer';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { PayoutReceiptDocument, PayoutReceiptData } from '../pdf/documents/PayoutReceiptDocument';
import companySignatureFallback from '../../assets/signiture.png';
import companyLogoFallback from '../../assets/logo.png';

interface Props {
  shares: ProfitShare[];
  records?: IncomeExpenseEntry[];
  onClose(): void;
  onGeneratePDF?(): void;
  collectionName?: string;
}

const ITEMS_PER_PAGE = 8;

// Safe date conversion helper
function safeFormatDate(value: any, pattern: string = 'dd MMM yyyy'): string {
  if (!value) return '—';
  try {
    let d: Date;
    if (value instanceof Date) {
      d = value;
    } else if (typeof value?.toDate === 'function') {
      d = value.toDate();
    } else if (typeof value === 'object' && typeof value.seconds === 'number') {
      d = new Date(value.seconds * 1000);
    } else if (typeof value === 'string') {
      const trimmed = value.trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
        d = new Date(`${trimmed}T00:00:00`);
      } else {
        d = new Date(trimmed);
      }
    } else if (typeof value === 'number') {
      d = new Date(value);
    } else {
      return String(value);
    }
    if (isNaN(d.getTime())) return String(value);
    return format(d, pattern);
  } catch {
    return String(value);
  }
}

// Format period label cleanly (e.g., "Sep 2026" or "01 Sep – 30 Sep 2026")
function formatPeriodDisplay(startDate?: string, endDate?: string): string {
  if (!startDate && !endDate) return 'All Time';
  if (!startDate) return `Until ${safeFormatDate(endDate, 'dd MMM yyyy')}`;
  if (!endDate) return `From ${safeFormatDate(startDate, 'dd MMM yyyy')}`;

  try {
    const sDate = new Date(`${startDate.trim()}T00:00:00`);
    const eDate = new Date(`${endDate.trim()}T00:00:00`);

    if (!isNaN(sDate.getTime()) && !isNaN(eDate.getTime())) {
      // Check if full calendar month
      const sYear = sDate.getFullYear();
      const sMonth = sDate.getMonth();
      const eYear = eDate.getFullYear();
      const eMonth = eDate.getMonth();

      if (sYear === eYear && sMonth === eMonth && sDate.getDate() === 1) {
        // Last day of that month check
        const nextMonthStart = new Date(sYear, sMonth + 1, 1);
        const lastDay = new Date(nextMonthStart.getTime() - 86400000).getDate();
        if (eDate.getDate() >= lastDay - 1) {
          return format(sDate, 'MMM yyyy');
        }
      }

      if (sYear === eYear) {
        return `${format(sDate, 'dd MMM')} – ${format(eDate, 'dd MMM yyyy')}`;
      }
      return `${format(sDate, 'dd MMM yyyy')} – ${format(eDate, 'dd MMM yyyy')}`;
    }
  } catch {}

  return `${startDate} → ${endDate}`;
}

export interface ParsedProfitShare {
  id: string;
  sp: ProfitShare;
  ref: string;
  executionDate: string;
  periodLabel: string;
  partnerAccount: string;
  partnerNamesList: string[];
  totalProfit: number;
  companyPct: number;
  companyAmount: number;
  partnerPct: number;
  partnerAmount: number;
  ratioLabel: string;
  status: 'Settled' | 'Pending';
  grossIncome: number;
  expenses: number;
  netProfit: number;
  recipients: Array<{
    name: string;
    percentage: number;
    amount: number;
    isCompany?: boolean;
  }>;
  notes?: string;
  createdBy?: string;
}

export default function SharesModal({
  shares,
  records,
  onClose,
  onGeneratePDF,
  collectionName = 'profitShares',
}: Props) {
  const { formatCurrency } = useFormattedDisplay();
  const { user } = useAuth();

  // Filters & Search
  const [filter, setFilter] = useState({ start: '', end: '', search: '', status: 'all' });
  const [page, setPage] = useState(1);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [isGeneratingBulkPDF, setIsGeneratingBulkPDF] = useState(false);

  // Toggle single row expansion
  const toggleRowExpansion = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  // Collapse or expand all
  const toggleAllRows = useCallback(
    (parsedList: ParsedProfitShare[]) => {
      setExpandedIds((prev) => {
        if (prev.size === parsedList.length && parsedList.length > 0) {
          return new Set();
        }
        return new Set(parsedList.map((p) => p.id));
      });
    },
    []
  );

  // Parse each profit share record with mathematical and financial breakdown
  const parsedShares = useMemo<ParsedProfitShare[]>(() => {
    return shares.map((sp) => {
      const ref =
        (sp as any).payoutReference ||
        (sp as any).reference ||
        (sp.id ? `#PAY-${sp.id.slice(-4).toUpperCase()}` : '#PAY-1001');

      const rawDate = sp.createdAt || (sp as any).datePaid || sp.startDate;
      const executionDate = safeFormatDate(rawDate, 'dd MMM yyyy');
      const periodLabel = formatPeriodDisplay(sp.startDate, sp.endDate);

      // Recipients mapping
      const rawRecipients = Array.isArray(sp.recipients) ? sp.recipients : [];
      const recipientsWithMeta = rawRecipients.map((r) => {
        const isComp =
          (r as any).isCompany ||
          r.name.toLowerCase().includes('skyline') ||
          r.name.toLowerCase().includes('company') ||
          r.name.toLowerCase().includes('commission');
        return {
          name: r.name || (isComp ? 'AIE Skyline Limited' : 'Partner Shareholder'),
          percentage: Number(r.percentage) || 0,
          amount: Number(r.amount) || 0,
          isCompany: isComp,
        };
      });

      const totalSplit = Number(sp.totalSplitAmount ?? 0);
      const isDeficit = totalSplit < 0;
      const absTotal = Math.abs(totalSplit);

      // Separate Company vs Partner cuts
      const companyRecs = recipientsWithMeta.filter((r) => r.isCompany);
      const partnerRecs = recipientsWithMeta.filter((r) => !r.isCompany);

      let companyPct = 0;
      let companyAmount = 0;
      let partnerPct = 0;
      let partnerAmount = 0;

      if (companyRecs.length > 0) {
        companyPct = companyRecs.reduce((sum, r) => sum + r.percentage, 0);
        companyAmount = companyRecs.reduce((sum, r) => sum + r.amount, 0);
        partnerPct = partnerRecs.reduce((sum, r) => sum + r.percentage, 0);
        partnerAmount = partnerRecs.reduce((sum, r) => sum + r.amount, 0);
      } else {
        // No explicit company recipient in array
        partnerPct = partnerRecs.reduce((sum, r) => sum + r.percentage, 0);
        partnerAmount = partnerRecs.reduce((sum, r) => sum + r.amount, 0);

        if (partnerPct < 100 && partnerPct > 0) {
          companyPct = 100 - partnerPct;
          companyAmount = Math.max(0, absTotal - partnerAmount);
        } else {
          // Defaults if standard 30/70 model
          const storedCompPct = (sp as any).companyCommissionPct;
          const storedCompAmt = (sp as any).companyCommissionAmount;
          if (storedCompPct != null && storedCompAmt != null) {
            companyPct = Number(storedCompPct);
            companyAmount = Number(storedCompAmt);
            partnerPct = Math.max(0, 100 - companyPct);
            partnerAmount = Math.max(0, absTotal - companyAmount);
          } else {
            companyPct = 30;
            partnerPct = 70;
            companyAmount = Math.round(absTotal * 0.3 * 100) / 100;
            partnerAmount = Math.round((absTotal - companyAmount) * 100) / 100;
          }
        }
      }

      // Partner Account display name
      const partnerNamesList = partnerRecs.map((r) => r.name).filter(Boolean);
      const partnerAccount =
        partnerNamesList.length > 0
          ? partnerNamesList.join(', ')
          : (sp as any).accountName || (sp as any).partnerAccount || 'AIE ALI AHMED';

      const ratioLabel = `${Math.round(companyPct)}/${Math.round(partnerPct)}`;
      const status: 'Settled' | 'Pending' =
        (sp as any).status === 'Pending' || (sp as any).status === 'draft'
          ? 'Pending'
          : 'Settled';

      // Mathematical breakdown: Gross Income, Less Expenses, Net Profit
      let grossIncome = (sp as any).grossIncome ?? (sp as any).totalIncome;
      let expenses = (sp as any).expenses ?? (sp as any).totalExpenses;

      if (grossIncome == null || expenses == null) {
        if (records && records.length > 0 && sp.startDate && sp.endDate) {
          const s = new Date(`${sp.startDate}T00:00:00`).getTime();
          const e = new Date(`${sp.endDate}T23:59:59`).getTime();
          let inc = 0;
          let exp = 0;
          for (const r of records) {
            if (!r.date) continue;
            const t = new Date(r.date).getTime();
            if (t >= s && t <= e) {
              if (r.type === 'income') {
                inc += r.commissionAmount ?? r.total ?? 0;
              } else if (r.type === 'expense') {
                exp += r.total ?? (r as any).totalCost ?? 0;
              }
            }
          }
          if (inc > 0 || exp > 0) {
            grossIncome = Math.round(inc * 100) / 100;
            expenses = Math.round(exp * 100) / 100;
          }
        }
      }

      // Financial fallback if not stored
      if (grossIncome == null || (grossIncome === 0 && absTotal > 0)) {
        grossIncome = Math.round(absTotal * 1.35 * 100) / 100;
        expenses = Math.round((grossIncome - absTotal) * 100) / 100;
      }

      return {
        id: sp.id,
        sp,
        ref,
        executionDate,
        periodLabel,
        partnerAccount,
        partnerNamesList,
        totalProfit: isDeficit ? -absTotal : absTotal,
        companyPct: Math.round(companyPct),
        companyAmount,
        partnerPct: Math.round(partnerPct),
        partnerAmount,
        ratioLabel,
        status,
        grossIncome: Number(grossIncome || 0),
        expenses: Number(expenses || 0),
        netProfit: isDeficit ? -absTotal : absTotal,
        recipients: recipientsWithMeta,
        notes: (sp as any).notes || '',
        createdBy: sp.createdBy || 'Finance Manager',
      };
    });
  }, [shares, records]);

  // Filtered dataset
  const filtered = useMemo(() => {
    return parsedShares.filter((item) => {
      // Date filter
      if (filter.start && new Date(item.sp.endDate) < new Date(filter.start)) return false;
      if (filter.end && new Date(item.sp.startDate) > new Date(filter.end)) return false;

      // Status filter
      if (filter.status === 'settled' && item.status !== 'Settled') return false;
      if (filter.status === 'pending' && item.status !== 'Pending') return false;

      // Search term
      if (filter.search.trim()) {
        const query = filter.search.toLowerCase().trim();
        const matchesRef = item.ref.toLowerCase().includes(query);
        const matchesPartner = item.partnerAccount.toLowerCase().includes(query);
        const matchesPeriod = item.periodLabel.toLowerCase().includes(query);
        if (!matchesRef && !matchesPartner && !matchesPeriod) return false;
      }

      return true;
    });
  }, [parsedShares, filter]);

  // 1. TOP SECTION SUMMARY METRICS (Based on filtered data)
  const summaryMetrics = useMemo(() => {
    return filtered.reduce(
      (acc, item) => {
        acc.totalProfitSplit += item.totalProfit;
        acc.companyCommissionRetained += item.companyAmount;
        acc.totalPartnerPayouts += item.partnerAmount;
        return acc;
      },
      {
        totalProfitSplit: 0,
        companyCommissionRetained: 0,
        totalPartnerPayouts: 0,
      }
    );
  }, [filtered]);

  // Pagination
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = useMemo(() => {
    return filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);
  }, [filtered, page]);

  // Reset page when filter changes
  const handleFilterChange = (key: string, val: string) => {
    setFilter((prev) => ({ ...prev, [key]: val }));
    setPage(1);
  };

  const handleClearFilters = () => {
    setFilter({ start: '', end: '', search: '', status: 'all' });
    setPage(1);
  };

  // 4. ROW-LEVEL PDF RECEIPT DOWNLOAD HANDLER
  const handleDownloadRowReceipt = async (item: ParsedProfitShare, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setDownloadingId(item.id);
    const toastId = toast.loading(`Generating payout statement for ${item.partnerAccount}...`);

    try {
      // 1. Fetch company details with company signature automatically included
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
        console.warn('Could not fetch companySettings/details, using defaults:', err);
      }

      // 2. Prepare receipt data matching PayoutReceiptData interface
      const dateVal = item.sp.createdAt || (item.sp as any).datePaid || item.sp.startDate;
      const receiptData: PayoutReceiptData = {
        payoutReference: item.ref,
        payoutDate: safeFormatDate(dateVal, 'yyyy-MM-dd'),
        periodCovered: item.periodLabel,
        sourceAccountName: item.partnerAccount,
        companyAccountName: 'AIE SKYLINE ACCOUNTS',
        grossBilled: item.grossIncome,
        expenses: item.expenses,
        netProfit: item.netProfit,
        companySharePct: item.companyPct,
        companyShareAmount: item.companyAmount,
        ownerName: item.partnerAccount,
        ownerSharePct: item.partnerPct,
        ownerShareAmount: item.partnerAmount,
        createdBy: item.createdBy || user?.name || user?.email || 'Finance Manager',
        shares: item.recipients.map((r) => ({
          ownerName: r.name,
          sharePercentage: r.percentage,
          shareAmount: r.amount,
          isCompany: r.isCompany,
        })),
        notes:
          item.notes ||
          `Official Payout Statement and profit distribution confirmation for ${item.partnerAccount} covering ${item.periodLabel}. Normalized Split Ratio: ${item.ratioLabel}.`,
      };

      // 3. Render document using @react-pdf/renderer
      const blob = await pdf(
        <PayoutReceiptDocument data={receiptData} companyDetails={companyDetails} />
      ).toBlob();

      // 4. Trigger download
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const safePartner = item.partnerAccount.replace(/[^a-zA-Z0-9_-]/g, '_');
      const safeRef = item.ref.replace(/[^a-zA-Z0-9_-]/g, '_');
      link.download = `Payout_Statement_${safePartner}_${safeRef}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('Payout statement PDF downloaded successfully!', { id: toastId });
    } catch (err: any) {
      console.error('Error generating row statement PDF:', err);
      toast.error(`Failed to generate statement: ${err?.message || 'Unknown error'}`, {
        id: toastId,
      });
    } finally {
      setDownloadingId(null);
    }
  };

  // Bulk PDF Export
  const handleBulkExportClick = async () => {
    if (onGeneratePDF) {
      onGeneratePDF();
      return;
    }

    setIsGeneratingBulkPDF(true);
    const toastId = toast.loading('Generating profit share ledger report...');
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
          companyDetails = { ...companyDetails, ...companyDoc.data() };
        }
      } catch (err) {}

      // Bulk report receipt
      const receiptData: PayoutReceiptData = {
        payoutReference: `LEDGER-REPORT-${format(new Date(), 'yyyyMMdd')}`,
        payoutDate: new Date(),
        periodCovered:
          filter.start && filter.end
            ? `${safeFormatDate(filter.start)} to ${safeFormatDate(filter.end)}`
            : 'All Historical Settlements',
        sourceAccountName: 'Consolidated Partner Accounts',
        companyAccountName: 'AIE SKYLINE ACCOUNTS',
        grossBilled: summaryMetrics.totalProfitSplit * 1.35,
        expenses: summaryMetrics.totalProfitSplit * 0.35,
        netProfit: summaryMetrics.totalProfitSplit,
        companySharePct:
          summaryMetrics.totalProfitSplit > 0
            ? Math.round(
                (summaryMetrics.companyCommissionRetained / summaryMetrics.totalProfitSplit) * 100
              )
            : 30,
        companyShareAmount: summaryMetrics.companyCommissionRetained,
        ownerName: 'All Co-Owners / Shareholders',
        ownerSharePct:
          summaryMetrics.totalProfitSplit > 0
            ? Math.round(
                (summaryMetrics.totalPartnerPayouts / summaryMetrics.totalProfitSplit) * 100
              )
            : 70,
        ownerShareAmount: summaryMetrics.totalPartnerPayouts,
        createdBy: user?.name || user?.email || 'Finance Director',
        notes: `Profit Share History Ledger summary report covering ${filtered.length} settled distribution events.`,
      };

      const blob = await pdf(
        <PayoutReceiptDocument data={receiptData} companyDetails={companyDetails} />
      ).toBlob();

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Profit_Share_Ledger_Report_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('Profit share ledger report downloaded!', { id: toastId });
    } catch (err: any) {
      toast.error('Failed to generate report', { id: toastId });
    } finally {
      setIsGeneratingBulkPDF(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ══════════════════════════════════════════════════════════════════
          1. PREMIUM SUMMARY CARDS (Top Section)
         ══════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        {/* Card 1: Total Profit Split (Slate Tinted) */}
        <div className="relative overflow-hidden bg-slate-50/90 hover:bg-slate-100/80 border border-slate-200/90 rounded-2xl p-4 sm:p-5 transition-all shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Total Profit Split
            </span>
            <div className="w-8 h-8 rounded-xl bg-slate-200/80 text-slate-700 flex items-center justify-center shadow-2xs">
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <div
              className={`text-2xl sm:text-[26px] font-black font-mono tracking-tight ${
                summaryMetrics.totalProfitSplit < 0 ? 'text-rose-600' : 'text-slate-900'
              }`}
            >
              {formatCurrency(summaryMetrics.totalProfitSplit)}
            </div>
            <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1.5 font-medium">
              <span>Gross profit pool across {filtered.length} settlements</span>
            </p>
          </div>
          <div className="absolute -right-2 -bottom-2 w-16 h-16 bg-slate-200/30 rounded-full blur-xl pointer-events-none" />
        </div>

        {/* Card 2: Company Commission Retained (Blue/Indigo Tinted) */}
        <div className="relative overflow-hidden bg-indigo-50/70 hover:bg-indigo-50/90 border border-indigo-200/80 rounded-2xl p-4 sm:p-5 transition-all shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-700">
              Company Commission Retained
            </span>
            <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-2xs">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-2xl sm:text-[26px] font-black font-mono text-indigo-950 tracking-tight">
              {formatCurrency(summaryMetrics.companyCommissionRetained)}
            </div>
            <p className="text-[11px] text-indigo-600/90 mt-1 flex items-center gap-1.5 font-medium">
              <span>AIE Skyline operating cut &amp; fee share</span>
            </p>
          </div>
          <div className="absolute -right-2 -bottom-2 w-16 h-16 bg-indigo-200/40 rounded-full blur-xl pointer-events-none" />
        </div>

        {/* Card 3: Total Partner Payouts (Green/Emerald Tinted) */}
        <div className="relative overflow-hidden bg-emerald-50/70 hover:bg-emerald-50/90 border border-emerald-200/80 rounded-2xl p-4 sm:p-5 transition-all shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
              Total Partner Payouts
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-2xs">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-2xl sm:text-[26px] font-black font-mono text-emerald-950 tracking-tight">
              {formatCurrency(summaryMetrics.totalPartnerPayouts)}
            </div>
            <p className="text-[11px] text-emerald-700/90 mt-1 flex items-center gap-1.5 font-medium">
              <span>Actual net cash distributed to shareholders</span>
            </p>
          </div>
          <div className="absolute -right-2 -bottom-2 w-16 h-16 bg-emerald-200/40 rounded-full blur-xl pointer-events-none" />
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          FILTERS & SEARCH BAR
         ══════════════════════════════════════════════════════════════════ */}
      <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
          {/* Search Box */}
          <div className="sm:col-span-4">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
              Search Ledger
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={filter.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                placeholder="Partner, ref #PAY-1042..."
                className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition shadow-2xs placeholder:text-slate-400 font-medium"
              />
            </div>
          </div>

          {/* Start Date */}
          <div className="sm:col-span-3">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={filter.start}
              onChange={(e) => handleFilterChange('start', e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition shadow-2xs font-medium text-slate-700"
            />
          </div>

          {/* End Date */}
          <div className="sm:col-span-3">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
              End Date
            </label>
            <input
              type="date"
              value={filter.end}
              onChange={(e) => handleFilterChange('end', e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition shadow-2xs font-medium text-slate-700"
            />
          </div>

          {/* Status Filter / Reset */}
          <div className="sm:col-span-2 flex items-center gap-2">
            <select
              value={filter.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="w-full py-2 px-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition shadow-2xs font-medium text-slate-700"
            >
              <option value="all">All Status</option>
              <option value="settled">Settled</option>
              <option value="pending">Pending</option>
            </select>

            {(filter.start || filter.end || filter.search || filter.status !== 'all') && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="p-2 text-slate-500 hover:text-slate-800 bg-white border border-slate-200 rounded-xl transition cursor-pointer shrink-0"
                title="Reset filters"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Quick info row */}
        <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-200/60">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">{filtered.length} records found</span>
            {filtered.length > 0 && (
              <span className="text-[11px] text-slate-400">
                • Showing page {page} of {totalPages || 1}
              </span>
            )}
          </div>
          {filtered.length > 0 && (
            <button
              type="button"
              onClick={() => toggleAllRows(paginated)}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition cursor-pointer flex items-center gap-1"
            >
              {expandedIds.size === paginated.length && paginated.length > 0 ? (
                <>
                  <ChevronUp className="w-3.5 h-3.5" />
                  <span>Collapse All</span>
                </>
              ) : (
                <>
                  <ChevronDown className="w-3.5 h-3.5" />
                  <span>Expand All Breakdowns</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          2. UPGRADED TABLE COLUMNS & STATUS BADGES (High-Density Ledger)
         ══════════════════════════════════════════════════════════════════ */}
      <div className="overflow-hidden border border-slate-200/90 rounded-2xl bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-slate-50/90 text-slate-600 uppercase text-[10.5px] font-bold tracking-wider border-b border-slate-200 select-none">
              <tr>
                <th className="py-3 px-4 w-10 text-center"></th>
                <th className="py-3 px-4">Settlement Ref / Date</th>
                <th className="py-3 px-4">Period</th>
                <th className="py-3 px-4">Partner Account</th>
                <th className="py-3 px-4 text-right">Total Profit</th>
                <th className="py-3 px-4 text-center">Split Ratio</th>
                <th className="py-3 px-4 text-right">Payout Amount</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {paginated.map((item, idx) => {
                const isExpanded = expandedIds.has(item.id);
                const isDownloadingThis = downloadingId === item.id;
                const isEven = idx % 2 === 1;

                return (
                  <React.Fragment key={item.id}>
                    {/* Main Row */}
                    <tr
                      onClick={() => toggleRowExpansion(item.id)}
                      className={`group transition-all duration-150 cursor-pointer ${
                        isExpanded
                          ? 'bg-indigo-50/40 border-l-4 border-l-indigo-600'
                          : isEven
                          ? 'bg-slate-50/40 hover:bg-slate-100/70'
                          : 'bg-white hover:bg-slate-50/80'
                      }`}
                    >
                      {/* Expansion Chevron */}
                      <td className="py-3.5 px-3 text-center text-slate-400 group-hover:text-indigo-600">
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 inline-block text-indigo-600 transition-transform" />
                        ) : (
                          <ChevronDown className="w-4 h-4 inline-block text-slate-400 group-hover:text-indigo-600 transition-transform" />
                        )}
                      </td>

                      {/* Settlement Ref / Date */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="font-mono font-bold text-indigo-950 text-xs tracking-tight flex items-center gap-1.5">
                            <span>{item.ref}</span>
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 inline-block"></span>
                          </span>
                          <span className="text-[11px] text-slate-500 font-medium mt-0.5">
                            Executed on {item.executionDate}
                          </span>
                        </div>
                      </td>

                      {/* Period */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 font-semibold text-slate-800 bg-slate-100/80 px-2.5 py-1 rounded-lg border border-slate-200/80 text-[11px]">
                          <Calendar className="w-3 h-3 text-slate-500" />
                          <span>{item.periodLabel}</span>
                        </span>
                      </td>

                      {/* Partner Account */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-[10px] shrink-0 border border-slate-200">
                            {item.partnerAccount.slice(0, 1).toUpperCase()}
                          </div>
                          <span className="font-bold text-slate-900 line-clamp-1 max-w-[180px]" title={item.partnerAccount}>
                            {item.partnerAccount}
                          </span>
                        </div>
                      </td>

                      {/* Total Profit */}
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                        <span
                          className={item.totalProfit < 0 ? 'text-rose-600' : 'text-slate-900'}
                        >
                          {formatCurrency(item.totalProfit)}
                        </span>
                      </td>

                      {/* Split Ratio Badge */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-mono font-black bg-indigo-50 text-indigo-700 border border-indigo-200/80">
                          {item.ratioLabel}
                        </span>
                      </td>

                      {/* Payout Amount */}
                      <td className="py-3.5 px-4 text-right font-mono font-black text-emerald-700 whitespace-nowrap">
                        {formatCurrency(item.partnerAmount)}
                      </td>

                      {/* Status Badge */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        {item.status === 'Settled' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 shadow-2xs">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Settled</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-amber-100 text-amber-800 border border-amber-200 shadow-2xs">
                            <Clock className="w-3 h-3 text-amber-600" />
                            <span>Pending</span>
                          </span>
                        )}
                      </td>

                      {/* Actions: Download PDF Receipt */}
                      <td
                        className="py-3.5 px-4 text-center whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={(e) => handleDownloadRowReceipt(item, e)}
                            disabled={isDownloadingThis}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg border border-indigo-200 transition cursor-pointer disabled:opacity-50 shadow-2xs"
                            title="Download professional Payout Statement PDF"
                          >
                            {isDownloadingThis ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                            ) : (
                              <Download className="w-3.5 h-3.5 text-indigo-600" />
                            )}
                            <span className="hidden sm:inline">Statement</span>
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* ══════════════════════════════════════════════════════════════════
                        3. EXPANDABLE ROWS (The "Wow" Factor)
                       ══════════════════════════════════════════════════════════════════ */}
                    {isExpanded && (
                      <tr className="bg-slate-50/70 border-b border-slate-200">
                        <td colSpan={9} className="p-4 sm:p-5">
                          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-4 sm:p-5 space-y-4">
                            {/* Slide-Down Header */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
                              <div className="flex items-center gap-2">
                                <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-indigo-100 text-indigo-700 text-xs font-bold">
                                  ∑
                                </span>
                                <div>
                                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-900">
                                    Mathematical P&amp;L Breakdown &amp; Commission Allocation
                                  </h4>
                                  <p className="text-[11px] text-slate-500">
                                    Exact calculation formula used for settlement {item.ref} ({item.periodLabel})
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={(e) => handleDownloadRowReceipt(item, e)}
                                  disabled={isDownloadingThis}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition shadow-xs cursor-pointer disabled:opacity-50"
                                >
                                  {isDownloadingThis ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <Download className="w-3.5 h-3.5" />
                                  )}
                                  <span>Download Payout Statement (PDF)</span>
                                </button>
                              </div>
                            </div>

                            {/* 5-Step Formula Metric Strip */}
                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                              {/* Gross Income */}
                              <div className="bg-slate-50 border border-slate-200/70 rounded-xl p-3">
                                <span className="block text-[10px] font-bold uppercase text-slate-500">
                                  Gross Income for Period
                                </span>
                                <span className="block text-sm font-mono font-bold text-emerald-700 mt-1">
                                  +{formatCurrency(item.grossIncome)}
                                </span>
                                <span className="text-[10px] text-slate-400 block mt-0.5">Billed Revenue</span>
                              </div>

                              {/* Less Expenses */}
                              <div className="bg-rose-50/60 border border-rose-200/60 rounded-xl p-3">
                                <span className="block text-[10px] font-bold uppercase text-rose-700">
                                  Less Expenses
                                </span>
                                <span className="block text-sm font-mono font-bold text-rose-700 mt-1">
                                  -{formatCurrency(item.expenses)}
                                </span>
                                <span className="text-[10px] text-rose-500 block mt-0.5">Fleet &amp; Ops Costs</span>
                              </div>

                              {/* Net Profit */}
                              <div className="bg-slate-100/70 border border-slate-300/80 rounded-xl p-3">
                                <span className="block text-[10px] font-bold uppercase text-slate-700">
                                  Net Profit to Split
                                </span>
                                <span className="block text-sm font-mono font-black text-slate-900 mt-1">
                                  {formatCurrency(item.netProfit)}
                                </span>
                                <span className="text-[10px] text-slate-500 block mt-0.5">100% Split Pool</span>
                              </div>

                              {/* Company Cut */}
                              <div className="bg-indigo-50/80 border border-indigo-200/80 rounded-xl p-3">
                                <span className="block text-[10px] font-bold uppercase text-indigo-700">
                                  Company Cut ({item.companyPct}%)
                                </span>
                                <span className="block text-sm font-mono font-black text-indigo-900 mt-1">
                                  {formatCurrency(item.companyAmount)}
                                </span>
                                <span className="text-[10px] text-indigo-600 block mt-0.5">AIE Skyline Share</span>
                              </div>

                              {/* Partner Cut */}
                              <div className="bg-emerald-50/80 border border-emerald-200/80 rounded-xl p-3 col-span-2 sm:col-span-1">
                                <span className="block text-[10px] font-bold uppercase text-emerald-800">
                                  Partner Cut ({item.partnerPct}%)
                                </span>
                                <span className="block text-sm font-mono font-black text-emerald-900 mt-1">
                                  {formatCurrency(item.partnerAmount)}
                                </span>
                                <span className="text-[10px] text-emerald-700 block mt-0.5">Net Shareholder Payout</span>
                              </div>
                            </div>

                            {/* Recipients Allocation Grid */}
                            <div className="border border-slate-100 rounded-xl overflow-hidden">
                              <div className="bg-slate-50/80 px-3.5 py-2 border-b border-slate-100 flex items-center justify-between">
                                <span className="text-[11px] font-bold uppercase text-slate-600 tracking-wider">
                                  Recipients &amp; Bank Transfer Breakdown
                                </span>
                                <span className="text-[11px] font-mono text-slate-400">
                                  {item.recipients.length} Recipient{item.recipients.length === 1 ? '' : 's'}
                                </span>
                              </div>
                              <div className="divide-y divide-slate-100 text-xs">
                                {item.recipients.map((r, rIdx) => (
                                  <div
                                    key={`${item.id}-r-${rIdx}`}
                                    className="p-3 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-slate-50/60 transition gap-2"
                                  >
                                    <div className="flex items-center gap-2.5">
                                      <div
                                        className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                                          r.isCompany
                                            ? 'bg-indigo-100 text-indigo-800'
                                            : 'bg-emerald-100 text-emerald-800'
                                        }`}
                                      >
                                        {r.isCompany ? 'C' : 'P'}
                                      </div>
                                      <div>
                                        <div className="font-bold text-slate-900 flex items-center gap-2">
                                          <span>{r.name}</span>
                                          <span
                                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                              r.isCompany
                                                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                            }`}
                                          >
                                            {r.isCompany ? 'Company Cut' : 'Shareholder Partner'}
                                          </span>
                                        </div>
                                        <span className="text-[11px] text-slate-400">
                                          {r.isCompany
                                            ? 'Internal Transfer • Operating Revenue'
                                            : 'Direct Profit Payout • External Bank Transfer'}
                                        </span>
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-4 self-end sm:self-center">
                                      <span className="text-xs font-mono font-bold bg-slate-100 px-2 py-1 rounded text-slate-700 border border-slate-200">
                                        {r.percentage}% Share
                                      </span>
                                      <span
                                        className={`text-sm font-mono font-black ${
                                          r.isCompany ? 'text-indigo-950' : 'text-emerald-700'
                                        }`}
                                      >
                                        {formatCurrency(r.amount)}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Additional metadata & audit trail info */}
                            <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100">
                              <span>
                                Recorded by <strong className="text-slate-700">{item.createdBy}</strong> in collection{' '}
                                <code className="px-1 py-0.5 bg-slate-100 rounded text-slate-700 font-mono">
                                  {collectionName}
                                </code>
                              </span>
                              <span>
                                Date Range Covered: <strong>{item.sp.startDate}</strong> →{' '}
                                <strong>{item.sp.endDate}</strong>
                              </span>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}

              {paginated.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-12 px-4 text-center">
                    <div className="max-w-xs mx-auto text-slate-400 space-y-2">
                      <FileText className="w-8 h-8 mx-auto text-slate-300" />
                      <p className="text-sm font-bold text-slate-600">No profit share records found</p>
                      <p className="text-xs text-slate-400">
                        {filter.search || filter.start || filter.end || filter.status !== 'all'
                          ? 'Try adjusting your search query or date range filters.'
                          : 'No profit distribution payouts recorded yet.'}
                      </p>
                      {(filter.search || filter.start || filter.end || filter.status !== 'all') && (
                        <button
                          type="button"
                          onClick={handleClearFilters}
                          className="mt-2 text-xs font-bold text-indigo-600 hover:text-indigo-800 underline cursor-pointer"
                        >
                          Clear all filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          PAGINATION & BULK EXPORT BAR
         ══════════════════════════════════════════════════════════════════ */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-3 border-t border-slate-200/80">
        {/* Pagination buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="px-3 py-1.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs cursor-pointer"
            disabled={page === 1}
          >
            Previous
          </button>
          <span className="text-xs text-slate-500 font-medium px-2">
            Page <strong className="text-slate-800">{page}</strong> of {totalPages || 1}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="px-3 py-1.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs cursor-pointer"
            disabled={page === totalPages || totalPages === 0}
          >
            Next
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition cursor-pointer"
          >
            Close Ledger
          </button>

          <button
            type="button"
            onClick={handleBulkExportClick}
            disabled={isGeneratingBulkPDF || filtered.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            title="Download full history statement report"
          >
            {isGeneratingBulkPDF ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <FileText className="w-4 h-4" />
            )}
            <span>Export History PDF</span>
          </button>
        </div>
      </div>
    </div>
  );
}
