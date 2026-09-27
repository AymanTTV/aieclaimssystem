// src/components/finance/FleetBIReportModal.tsx
import React, { useState, useMemo } from 'react';
import {
  X,
  TrendingUp,
  TrendingDown,
  DollarSign,
  AlertTriangle,
  Car,
  Users,
  Wallet,
  Calendar,
  Copy,
  Check,
  Printer,
  Sparkles,
  PieChart,
  FileSpreadsheet,
  ArrowUpRight,
  ArrowDownRight,
  ShieldAlert,
} from 'lucide-react';
import { Transaction, Account } from '../../types';
import { Vehicle } from '../../types/vehicle';
import { differenceInDays } from 'date-fns';
import toast from 'react-hot-toast';

interface FleetBIReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: Transaction[];
  vehicles: Vehicle[];
  accounts: Account[];
  totalOwingFromOwners: number;
  totalOwingFromAccounts: number;
}

export const FleetBIReportModal: React.FC<FleetBIReportModalProps> = ({
  isOpen,
  onClose,
  transactions,
  vehicles,
  accounts,
  totalOwingFromOwners,
  totalOwingFromAccounts,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'vehicles' | 'receivables' | 'expenses' | 'raw_ingest'>('overview');
  const [copied, setCopied] = useState(false);
  const [rawInputText, setRawInputText] = useState('');
  const [customParsedTxns, setCustomParsedTxns] = useState<Transaction[] | null>(null);

  // Use custom parsed if provided, otherwise live transactions
  const activeTxns = useMemo(() => {
    return customParsedTxns || transactions;
  }, [customParsedTxns, transactions]);

  // Format currency helper
  const fmt = (val: number | undefined | null) => {
    const num = Number(val) || 0;
    return `£${num.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // 1. EXECUTIVE FINANCIAL OVERVIEW CALCULATIONS
  const overview = useMemo(() => {
    let grossIncome = 0;
    let netIncome = 0;
    let incomeVat = 0;

    let grossExpense = 0;
    let netExpense = 0;
    let expenseVat = 0;

    activeTxns.forEach((t) => {
      const amt = Number(t.amount) || 0;
      const net = Number(t.netAmount) || amt;
      const vat = Number(t.vatAmount) || 0;

      if (t.type === 'income') {
        grossIncome += amt;
        netIncome += net;
        incomeVat += vat;
      } else if (t.type === 'expense') {
        grossExpense += amt;
        netExpense += net;
        expenseVat += vat;
      }
    });

    const netProfitGross = grossIncome - grossExpense;
    const netProfitNet = netIncome - netExpense;
    const marginGross = grossIncome > 0 ? (netProfitGross / grossIncome) * 100 : 0;
    const marginNet = netIncome > 0 ? (netProfitNet / netIncome) * 100 : 0;
    const vatLiability = incomeVat - expenseVat;

    // Total uncollected debts (from transactions unpaid + owner debt)
    let unpaidTxnTotal = 0;
    activeTxns.forEach((t) => {
      if (t.type === 'income' && (t.paymentStatus === 'unpaid' || t.paymentStatus === 'partially_paid')) {
        const remaining = t.remainingAmount !== undefined ? Number(t.remainingAmount) : Number(t.amount) - (Number(t.paidAmount) || 0);
        if (remaining > 0) unpaidTxnTotal += remaining;
      }
    });

    const totalReceivables = totalOwingFromOwners + totalOwingFromAccounts + unpaidTxnTotal;

    return {
      grossIncome,
      netIncome,
      incomeVat,
      grossExpense,
      netExpense,
      expenseVat,
      netProfitGross,
      netProfitNet,
      marginGross,
      marginNet,
      vatLiability,
      unpaidTxnTotal,
      totalReceivables,
    };
  }, [activeTxns, totalOwingFromOwners, totalOwingFromAccounts]);

  // 2. VEHICLE PROFITABILITY & ROI MATRIX
  const vehicleStats = useMemo(() => {
    const map = new Map<
      string,
      {
        id: string;
        reg: string;
        name: string;
        income: number;
        expense: number;
        costDrivers: Record<string, number>;
      }
    >();

    // Seed from known vehicles
    vehicles.forEach((v) => {
      map.set(v.id, {
        id: v.id,
        reg: v.registrationNumber || 'Unknown Reg',
        name: `${v.make || ''} ${v.model || ''}`.trim() || v.registrationNumber || 'Fleet Vehicle',
        income: 0,
        expense: 0,
        costDrivers: {},
      });
    });

    activeTxns.forEach((t) => {
      const vId = t.vehicleId;
      const vReg = (t.vehicleName || '').trim();
      const key = vId || vReg || 'unallocated';

      if (!map.has(key)) {
        map.set(key, {
          id: key,
          reg: vReg || (vId ? 'ID: ' + vId.slice(0, 6) : 'Unallocated Fleet'),
          name: t.vehicleName || 'General / Unallocated',
          income: 0,
          expense: 0,
          costDrivers: {},
        });
      }

      const entry = map.get(key)!;
      const amt = Number(t.amount) || 0;
      const cat = (t.category || 'General').trim();

      if (t.type === 'income') {
        entry.income += amt;
      } else if (t.type === 'expense') {
        entry.expense += amt;
        entry.costDrivers[cat] = (entry.costDrivers[cat] || 0) + amt;
      }
    });

    const list = Array.from(map.values())
      .filter((v) => v.income > 0 || v.expense > 0)
      .map((v) => {
        const netProfit = v.income - v.expense;
        const margin = v.income > 0 ? (netProfit / v.income) * 100 : v.expense > 0 ? -100 : 0;
        // Find primary cost driver
        let primaryDriver = 'None';
        let maxCost = 0;
        Object.entries(v.costDrivers).forEach(([cat, val]) => {
          if (val > maxCost) {
            maxCost = val;
            primaryDriver = cat;
          }
        });
        return {
          ...v,
          netProfit,
          margin,
          primaryDriver,
          primaryDriverCost: maxCost,
        };
      });

    const sortedByProfit = [...list].sort((a, b) => b.netProfit - a.netProfit);
    const top5Profitable = sortedByProfit.slice(0, 5);
    const lossMaking = list.filter((v) => v.netProfit < 0).sort((a, b) => a.netProfit - b.netProfit);

    const sortedByExpense = [...list].sort((a, b) => b.expense - a.expense);
    const highestExpenseVehicle = sortedByExpense[0] || null;
    const lowestExpenseVehicle = [...list]
      .filter((v) => v.income > 0)
      .sort((a, b) => a.expense - b.expense)[0] || null;

    return {
      all: list,
      top5Profitable,
      lossMaking,
      highestExpenseVehicle,
      lowestExpenseVehicle,
    };
  }, [vehicles, activeTxns]);

  // 3. AGED RECEIVABLES & DEBTOR REPORT
  const receivables = useMemo(() => {
    const today = new Date();
    interface DebtItem {
      id: string;
      debtorName: string;
      reg: string;
      date: Date;
      daysOverdue: number;
      amount: number;
      category: string;
      bucket: 'Current (0-30d)' | 'Overdue (31-60d)' | 'Critical (61d+)';
    }

    const items: DebtItem[] = [];

    activeTxns.forEach((t) => {
      if (t.type === 'income' && (t.paymentStatus === 'unpaid' || t.paymentStatus === 'partially_paid')) {
        const remaining =
          t.remainingAmount !== undefined
            ? Number(t.remainingAmount)
            : Number(t.amount) - (Number(t.paidAmount) || 0);

        if (remaining > 0) {
          const txnDate = t.date ? new Date(t.date) : today;
          const days = Math.max(0, differenceInDays(today, txnDate));
          let bucket: 'Current (0-30d)' | 'Overdue (31-60d)' | 'Critical (61d+)' = 'Current (0-30d)';
          if (days > 60) bucket = 'Critical (61d+)';
          else if (days > 30) bucket = 'Overdue (31-60d)';

          items.push({
            id: t.id,
            debtorName: t.customerName || t.vehicleOwner?.name || 'Unassigned Debtor',
            reg: t.vehicleName || 'N/A',
            date: txnDate,
            daysOverdue: days,
            amount: remaining,
            category: t.category || 'Rental / Service',
            bucket,
          });
        }
      }
    });

    const bucketCurrent = items.filter((i) => i.bucket === 'Current (0-30d)');
    const bucket30 = items.filter((i) => i.bucket === 'Overdue (31-60d)');
    const bucket60 = items.filter((i) => i.bucket === 'Critical (61d+)');

    const sumCurrent = bucketCurrent.reduce((sum, i) => sum + i.amount, 0);
    const sum30 = bucket30.reduce((sum, i) => sum + i.amount, 0);
    const sum60 = bucket60.reduce((sum, i) => sum + i.amount, 0);

    return {
      items: items.sort((a, b) => b.daysOverdue - a.daysOverdue),
      bucketCurrent,
      bucket30,
      bucket60,
      sumCurrent,
      sum30,
      sum60,
    };
  }, [activeTxns]);

  // 4. FLEET EXPENSE BREAKDOWN
  const expenseBreakdown = useMemo(() => {
    const catMap = new Map<string, { category: string; amount: number; count: number }>();
    let totalFleetExpense = 0;

    activeTxns.forEach((t) => {
      if (t.type === 'expense') {
        const amt = Number(t.amount) || 0;
        totalFleetExpense += amt;
        const cat = (t.category || 'General Operating').trim();
        const existing = catMap.get(cat) || { category: cat, amount: 0, count: 0 };
        existing.amount += amt;
        existing.count += 1;
        catMap.set(cat, existing);
      }
    });

    const sortedCategories = Array.from(catMap.values())
      .map((c) => ({
        ...c,
        percentage: totalFleetExpense > 0 ? (c.amount / totalFleetExpense) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    return {
      totalFleetExpense,
      categories: sortedCategories,
    };
  }, [activeTxns]);

  // GENERATE COMPLETE MARKDOWN EXPORT
  const markdownReport = useMemo(() => {
    return `# FLEET FINANCIAL & BUSINESS INTELLIGENCE REPORT
**Generated:** ${new Date().toLocaleDateString('en-GB')} ${new Date().toLocaleTimeString('en-GB')}
**Data Source:** ${customParsedTxns ? 'Custom Imported Dataset' : 'Live Fleet Production Database'}

---

## 1. EXECUTIVE FINANCIAL OVERVIEW

| Financial Metric | Gross Value | Net Value (Ex. VAT) | Notes / Breakdown |
|---|---|---|---|
| **Total Fleet Income** | ${fmt(overview.grossIncome)} | ${fmt(overview.netIncome)} | VAT Collected: ${fmt(overview.incomeVat)} |
| **Total Fleet Expenses** | ${fmt(overview.grossExpense)} | ${fmt(overview.netExpense)} | VAT Paid: ${fmt(overview.expenseVat)} |
| **Net Operating Profit** | **${fmt(overview.netProfitGross)}** | **${fmt(overview.netProfitNet)}** | **Gross Margin: ${overview.marginGross.toFixed(1)}%** |
| **Total VAT Liability** | ${fmt(overview.vatLiability)} | - | Output VAT vs. Input VAT |
| **Owing from Owners** | **${fmt(totalOwingFromOwners)}** | - | Balance owed by vehicle owners |
| **Owing from Accounts** | ${fmt(totalOwingFromAccounts)} | - | Unsettled account balances |
| **Unpaid Customer Invoices** | ${fmt(overview.unpaidTxnTotal)} | - | Outstanding accounts receivable |
| **Total Gross Exposure** | **${fmt(overview.totalReceivables)}** | - | Cumulative outstanding liquidity |

---

## 2. VEHICLE PROFITABILITY & ROI MATRIX

### Top 5 Profit Champions
| Vehicle Registration / Make | Income | Expenses | Net Profit | Profit Margin | Primary Cost Driver |
|---|---|---|---|---|---|
${
  vehicleStats.top5Profitable.length > 0
    ? vehicleStats.top5Profitable
        .map(
          (v) =>
            `| **${v.reg}** (${v.name}) | ${fmt(v.income)} | ${fmt(v.expense)} | **${fmt(v.netProfit)}** | ${v.margin.toFixed(1)}% | ${v.primaryDriver} (${fmt(v.primaryDriverCost)}) |`
        )
        .join('\n')
    : '| *No vehicle transactions recorded* | - | - | - | - | - |'
}

### Loss-Making Vehicles (Action Required)
| Vehicle Registration / Make | Income | Expenses | Deficit (Loss) | Margin | Primary Cost Driver |
|---|---|---|---|---|---|
${
  vehicleStats.lossMaking.length > 0
    ? vehicleStats.lossMaking
        .map(
          (v) =>
            `| ⚠️ **${v.reg}** (${v.name}) | ${fmt(v.income)} | ${fmt(v.expense)} | **${fmt(v.netProfit)}** | ${v.margin.toFixed(1)}% | ${v.primaryDriver} (${fmt(v.primaryDriverCost)}) |`
        )
        .join('\n')
    : '| *No vehicles running at a negative margin* | - | - | - | - | - |'
}

### Expense Leadership
- **Highest Expense Driver:** ${vehicleStats.highestExpenseVehicle ? `**${vehicleStats.highestExpenseVehicle.reg}** (${fmt(vehicleStats.highestExpenseVehicle.expense)}) — Top driver: ${vehicleStats.highestExpenseVehicle.primaryDriver}` : 'N/A'}
- **Lowest Expense Leader:** ${vehicleStats.lowestExpenseVehicle ? `**${vehicleStats.lowestExpenseVehicle.reg}** (${fmt(vehicleStats.lowestExpenseVehicle.expense)}) with ${fmt(vehicleStats.lowestExpenseVehicle.income)} revenue` : 'N/A'}

---

## 3. AGED RECEIVABLES & DEBTOR REPORT

| Aging Category | Item Count | Total Value | Risk Severity |
|---|---|---|---|
| **Current (0 – 30 Days)** | ${receivables.bucketCurrent.length} | ${fmt(receivables.sumCurrent)} | Normal Cashflow |
| **Overdue (31 – 60 Days)** | ${receivables.bucket30.length} | ${fmt(receivables.sum30)} | Moderate Risk (Issue Follow-up) |
| **Critical Overdue (61+ Days)** | ${receivables.bucket60.length} | ${fmt(receivables.sum60)} | 🚨 Critical / High Risk (Escalate) |
| **Total Uncollected Debts** | **${receivables.items.length}** | **${fmt(receivables.sumCurrent + receivables.sum30 + receivables.sum60)}** | Action Required |

### Priority Collection Directive (Overdue > 30 Days)
| Debtor / Customer | Vehicle Reg | Days Overdue | Amount Due | Category |
|---|---|---|---|---|
${
  receivables.items.filter((i) => i.daysOverdue > 30).slice(0, 10).length > 0
    ? receivables.items
        .filter((i) => i.daysOverdue > 30)
        .slice(0, 10)
        .map(
          (i) =>
            `| **${i.debtorName}** | ${i.reg} | ${i.daysOverdue} days | **${fmt(i.amount)}** | ${i.category} |`
        )
        .join('\n')
    : '| *No invoices currently overdue past 30 days* | - | - | - | - |'
}

---

## 4. FLEET EXPENSE BREAKDOWN

| Expense Category | Transaction Count | Total Spend | % of Total Fleet OPEX |
|---|---|---|---|
${
  expenseBreakdown.categories.length > 0
    ? expenseBreakdown.categories
        .map(
          (c) =>
            `| **${c.category}** | ${c.count} | ${fmt(c.amount)} | ${c.percentage.toFixed(1)}% |`
        )
        .join('\n')
    : '| *No expense records found* | - | - | - |'
}
| **TOTAL FLEET OPEX** | - | **${fmt(expenseBreakdown.totalFleetExpense)}** | **100.0%** |

---

## 5. STRATEGIC FLEET OPTIMIZATION RECOMMENDATIONS

1. **Owner Debt Recovery (£${totalOwingFromOwners.toLocaleString()} exposure):**
   - Implement automated weekly debit settlements or offset rental income against outstanding balances before payouts.
2. **Deficit Vehicle Remediation:**
   - Audit the ${vehicleStats.lossMaking.length} negative-margin vehicles. Investigate recurring mechanical failures vs. idle periods to decide whether to repair, re-hire, or decommission.
3. **Overdue Aging Escalation:**
   - Immediately dispatch formal payment demand notifications for the **${fmt(receivables.sum60)}** trapped in 60+ day aged debt.
4. **Expense Category Rationalization:**
   - Top expenditure ${expenseBreakdown.categories[0] ? `("${expenseBreakdown.categories[0].category}" at ${expenseBreakdown.categories[0].percentage.toFixed(1)}%)` : ''} should be reviewed for volume discounts or renegotiated vendor contracts.
`;
  }, [
    customParsedTxns,
    overview,
    fmt,
    totalOwingFromOwners,
    totalOwingFromAccounts,
    vehicleStats,
    receivables,
    expenseBreakdown,
  ]);

  const handleCopyMarkdown = () => {
    navigator.clipboard.writeText(markdownReport);
    setCopied(true);
    toast.success('Complete Markdown Report copied to clipboard!');
    setTimeout(() => setCopied(false), 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  // Parse raw pasted CSV / JSON text
  const handleParseRawInput = () => {
    if (!rawInputText.trim()) {
      setCustomParsedTxns(null);
      toast.success('Reset to live fleet data');
      return;
    }

    try {
      // 1. Try JSON array
      if (rawInputText.trim().startsWith('[') || rawInputText.trim().startsWith('{')) {
        const parsed = JSON.parse(rawInputText.trim());
        const arr = Array.isArray(parsed) ? parsed : [parsed];
        const formatted: Transaction[] = arr.map((item, idx) => ({
          id: item.id || `custom-${idx}`,
          type: item.type?.toLowerCase() === 'income' ? 'income' : 'expense',
          amount: parseFloat(item.amount || item.Amount || 0),
          netAmount: parseFloat(item.netAmount || item.net || item.amount || 0),
          vatAmount: parseFloat(item.vatAmount || item.vat || 0),
          category: item.category || item.Category || 'General',
          description: item.description || item.Description || '',
          date: item.date ? new Date(item.date) : new Date(),
          vehicleName: item.vehicleName || item.vehicleReg || item.reg || item.vehicle || '',
          customerName: item.customerName || item.customer || item.owner || '',
          paymentStatus: item.paymentStatus || item.status || 'paid',
          createdAt: new Date(),
          createdBy: 'import',
        }));
        setCustomParsedTxns(formatted);
        toast.success(`Successfully parsed ${formatted.length} transactions from JSON!`);
        setActiveTab('overview');
        return;
      }

      // 2. Try CSV lines
      const lines = rawInputText.trim().split('\n');
      if (lines.length > 1) {
        const header = lines[0].split(',').map((h) => h.trim().toLowerCase());
        const parsedList: Transaction[] = [];

        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(',').map((c) => c.trim().replace(/^["']|["']$/g, ''));
          if (cols.length < 2) continue;

          const row: Record<string, string> = {};
          header.forEach((h, idx) => {
            row[h] = cols[idx] || '';
          });

          const typeStr = (row.type || cols[1] || '').toLowerCase();
          const amtStr = row.amount || cols[2] || '0';
          const amt = parseFloat(amtStr.replace(/[^0-9.-]/g, '')) || 0;

          parsedList.push({
            id: `csv-${i}`,
            type: typeStr.includes('inc') ? 'income' : 'expense',
            amount: amt,
            netAmount: parseFloat(row.net || '') || amt,
            vatAmount: parseFloat(row.vat || '') || 0,
            category: row.category || cols[3] || 'General',
            description: row.description || cols[4] || '',
            date: row.date ? new Date(row.date) : new Date(),
            vehicleName: row.vehicle || row.reg || row.vehiclereg || '',
            customerName: row.customer || row.debtor || row.owner || '',
            paymentStatus: (row.status || '').includes('unpaid') ? 'unpaid' : 'paid',
            createdAt: new Date(),
            createdBy: 'csv-parser',
          });
        }

        if (parsedList.length > 0) {
          setCustomParsedTxns(parsedList);
          toast.success(`Parsed ${parsedList.length} transactions from CSV!`);
          setActiveTab('overview');
          return;
        }
      }

      toast.error('Could not identify CSV or JSON structure. Please check columns.');
    } catch (err: any) {
      toast.error('Failed to parse input: ' + err.message);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden text-slate-900 animate-in fade-in zoom-in-95 duration-200">
        
        {/* HEADER BAR */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-500/20 border border-indigo-400/30 rounded-2xl">
              <Sparkles className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black tracking-tight">Fleet Financial & BI Analytics Engine</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {customParsedTxns ? 'Isolated Import Mode' : 'Live Fleet View'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Independent Analytical Reports • Zero Database Mutation • Instant ROI & Debtor Audit
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyMarkdown}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-bold text-white transition-all cursor-pointer"
              title="Copy formatted Markdown report to clipboard"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-300" />}
              <span>{copied ? 'Copied!' : 'Copy Markdown'}</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-bold text-white transition-all cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-slate-300" />
              <span>Print</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* TAB NAVIGATION */}
        <div className="flex items-center gap-1 px-6 pt-3 border-b border-slate-200 bg-slate-50/80 text-xs font-bold">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2.5 border-b-2 transition-all cursor-pointer ${
              activeTab === 'overview'
                ? 'border-indigo-600 text-indigo-700 bg-white shadow-2xs rounded-t-xl'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            1. Executive Overview
          </button>
          <button
            onClick={() => setActiveTab('vehicles')}
            className={`px-4 py-2.5 border-b-2 transition-all cursor-pointer ${
              activeTab === 'vehicles'
                ? 'border-indigo-600 text-indigo-700 bg-white shadow-2xs rounded-t-xl'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            2. Vehicle Profitability & ROI
          </button>
          <button
            onClick={() => setActiveTab('receivables')}
            className={`px-4 py-2.5 border-b-2 transition-all cursor-pointer ${
              activeTab === 'receivables'
                ? 'border-indigo-600 text-indigo-700 bg-white shadow-2xs rounded-t-xl'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            3. Aged Receivables ({receivables.items.length})
          </button>
          <button
            onClick={() => setActiveTab('expenses')}
            className={`px-4 py-2.5 border-b-2 transition-all cursor-pointer ${
              activeTab === 'expenses'
                ? 'border-indigo-600 text-indigo-700 bg-white shadow-2xs rounded-t-xl'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            4. Fleet OPEX Breakdown
          </button>
          <button
            onClick={() => setActiveTab('raw_ingest')}
            className={`px-4 py-2.5 border-b-2 transition-all cursor-pointer ${
              activeTab === 'raw_ingest'
                ? 'border-indigo-600 text-indigo-700 bg-white shadow-2xs rounded-t-xl'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            📥 Ingest Raw Dump (CSV/JSON)
          </button>
        </div>

        {/* MODAL CONTENT BODY */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50/40">
          
          {/* TAB 1: EXECUTIVE FINANCIAL OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              {/* Primary KPI Ribbon */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Gross Income</span>
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="text-2xl font-black font-mono text-emerald-600 mt-2">{fmt(overview.grossIncome)}</div>
                  <div className="text-[11px] text-slate-500 mt-1">Ex. VAT: {fmt(overview.netIncome)}</div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Gross Expenses</span>
                    <TrendingDown className="w-4 h-4 text-rose-600" />
                  </div>
                  <div className="text-2xl font-black font-mono text-rose-600 mt-2">{fmt(overview.grossExpense)}</div>
                  <div className="text-[11px] text-slate-500 mt-1">Ex. VAT: {fmt(overview.netExpense)}</div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Net Profit</span>
                    <DollarSign className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className={`text-2xl font-black font-mono mt-2 ${overview.netProfitGross >= 0 ? 'text-blue-600' : 'text-rose-600'}`}>
                    {fmt(overview.netProfitGross)}
                  </div>
                  <div className="text-[11px] font-semibold text-slate-600 mt-1">
                    Margin: {overview.marginGross.toFixed(1)}% (Net: {fmt(overview.netProfitNet)})
                  </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Receivables</span>
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                  </div>
                  <div className="text-2xl font-black font-mono text-amber-600 mt-2">{fmt(overview.totalReceivables)}</div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    Owner debt + uncollected invoices
                  </div>
                </div>
              </div>

              {/* Outstanding Debt & Operating Account Matrix */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-rose-200 bg-rose-50/20 shadow-xs">
                  <div className="flex items-center gap-2 text-rose-700 mb-2">
                    <Wallet className="w-4 h-4" />
                    <h3 className="text-xs font-bold uppercase tracking-wider">Owing from Owners</h3>
                  </div>
                  <div className="text-2xl font-black font-mono text-rose-700">{fmt(totalOwingFromOwners)}</div>
                  <p className="text-xs text-slate-600 mt-2">
                    Direct balance owed by individual vehicle partners and asset owners.
                  </p>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-amber-200 bg-amber-50/20 shadow-xs">
                  <div className="flex items-center gap-2 text-amber-700 mb-2">
                    <ShieldAlert className="w-4 h-4" />
                    <h3 className="text-xs font-bold uppercase tracking-wider">Owing from Accounts</h3>
                  </div>
                  <div className="text-2xl font-black font-mono text-amber-700">{fmt(totalOwingFromAccounts)}</div>
                  <p className="text-xs text-slate-600 mt-2">
                    Pending reconciliations from linked corporate accounts.
                  </p>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-indigo-200 bg-indigo-50/20 shadow-xs">
                  <div className="flex items-center gap-2 text-indigo-700 mb-2">
                    <PieChart className="w-4 h-4" />
                    <h3 className="text-xs font-bold uppercase tracking-wider">Net VAT Liability</h3>
                  </div>
                  <div className={`text-2xl font-black font-mono ${overview.vatLiability >= 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                    {fmt(overview.vatLiability)}
                  </div>
                  <p className="text-xs text-slate-600 mt-2">
                    Collected ({fmt(overview.incomeVat)}) − Paid ({fmt(overview.expenseVat)})
                  </p>
                </div>
              </div>

              {/* Executive Summary Table */}
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 font-bold text-xs uppercase tracking-wider text-slate-700">
                  Detailed Executive Statement
                </div>
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-2.5 font-bold uppercase">Statement Category</th>
                      <th className="px-4 py-2.5 font-bold uppercase">Gross Value</th>
                      <th className="px-4 py-2.5 font-bold uppercase">Net Value (Ex. VAT)</th>
                      <th className="px-4 py-2.5 font-bold uppercase">Analytical Context</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr>
                      <td className="px-4 py-3 font-semibold text-slate-800">Fleet Operations Revenue</td>
                      <td className="px-4 py-3 font-mono font-bold text-emerald-700">{fmt(overview.grossIncome)}</td>
                      <td className="px-4 py-3 font-mono">{fmt(overview.netIncome)}</td>
                      <td className="px-4 py-3 text-slate-500">Output VAT recognized: {fmt(overview.incomeVat)}</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 font-semibold text-slate-800">Fleet Operational Expenditure (OPEX)</td>
                      <td className="px-4 py-3 font-mono font-bold text-rose-700">{fmt(overview.grossExpense)}</td>
                      <td className="px-4 py-3 font-mono">{fmt(overview.netExpense)}</td>
                      <td className="px-4 py-3 text-slate-500">Input VAT deductible: {fmt(overview.expenseVat)}</td>
                    </tr>
                    <tr className="bg-slate-50/60 font-bold">
                      <td className="px-4 py-3 text-slate-900">Net Operating Position</td>
                      <td className="px-4 py-3 font-mono text-blue-700">{fmt(overview.netProfitGross)}</td>
                      <td className="px-4 py-3 font-mono text-blue-700">{fmt(overview.netProfitNet)}</td>
                      <td className="px-4 py-3 text-slate-700">Operating Margin: {overview.marginGross.toFixed(1)}%</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: VEHICLE PROFITABILITY & ROI MATRIX */}
          {activeTab === 'vehicles' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              {/* Highlight cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-2xl border border-emerald-200 bg-emerald-50/20 shadow-xs">
                  <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs uppercase tracking-wider mb-2">
                    <ArrowUpRight className="w-4 h-4 text-emerald-600" />
                    Top Profit Leader
                  </div>
                  {vehicleStats.top5Profitable[0] ? (
                    <div>
                      <div className="text-xl font-black font-mono text-emerald-700">
                        {vehicleStats.top5Profitable[0].reg}
                      </div>
                      <p className="text-xs text-slate-600 mt-0.5">{vehicleStats.top5Profitable[0].name}</p>
                      <div className="flex items-center gap-4 mt-3 text-xs font-mono">
                        <div>Income: <span className="font-bold">{fmt(vehicleStats.top5Profitable[0].income)}</span></div>
                        <div>Net: <span className="font-bold text-emerald-700">{fmt(vehicleStats.top5Profitable[0].netProfit)}</span></div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-slate-400">No vehicle data</div>
                  )}
                </div>

                <div className="bg-white p-4 rounded-2xl border border-rose-200 bg-rose-50/20 shadow-xs">
                  <div className="flex items-center gap-2 text-rose-800 font-bold text-xs uppercase tracking-wider mb-2">
                    <ArrowDownRight className="w-4 h-4 text-rose-600" />
                    Highest Cost Driver
                  </div>
                  {vehicleStats.highestExpenseVehicle ? (
                    <div>
                      <div className="text-xl font-black font-mono text-rose-700">
                        {vehicleStats.highestExpenseVehicle.reg}
                      </div>
                      <p className="text-xs text-slate-600 mt-0.5">{vehicleStats.highestExpenseVehicle.name}</p>
                      <div className="flex items-center gap-4 mt-3 text-xs font-mono">
                        <div>Total OPEX: <span className="font-bold text-rose-700">{fmt(vehicleStats.highestExpenseVehicle.expense)}</span></div>
                        <div>Primary Cost: <span className="font-bold">{vehicleStats.highestExpenseVehicle.primaryDriver}</span></div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-slate-400">No vehicle data</div>
                  )}
                </div>
              </div>

              {/* Table: Top 5 Profitable */}
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                <div className="px-5 py-3.5 bg-emerald-50/50 border-b border-slate-200 flex items-center justify-between">
                  <span className="font-bold text-xs uppercase tracking-wider text-emerald-900">
                    Top 5 Most Profitable Vehicles (Net Margin)
                  </span>
                  <span className="text-xs text-emerald-700 font-semibold">Ranked by Income − Expense</span>
                </div>
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-2.5 font-bold uppercase">Vehicle</th>
                      <th className="px-4 py-2.5 font-bold uppercase">Gross Income</th>
                      <th className="px-4 py-2.5 font-bold uppercase">Gross Expense</th>
                      <th className="px-4 py-2.5 font-bold uppercase">Net Profit</th>
                      <th className="px-4 py-2.5 font-bold uppercase">Margin %</th>
                      <th className="px-4 py-2.5 font-bold uppercase">Key Expense Driver</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {vehicleStats.top5Profitable.map((v, idx) => (
                      <tr key={v.id} className="hover:bg-slate-50/60">
                        <td className="px-4 py-3 font-bold text-slate-900">
                          #{idx + 1} {v.reg} <span className="font-normal text-slate-500">({v.name})</span>
                        </td>
                        <td className="px-4 py-3 font-mono font-semibold text-emerald-700">{fmt(v.income)}</td>
                        <td className="px-4 py-3 font-mono text-slate-700">{fmt(v.expense)}</td>
                        <td className="px-4 py-3 font-mono font-black text-emerald-700">{fmt(v.netProfit)}</td>
                        <td className="px-4 py-3 font-mono font-bold text-slate-800">{v.margin.toFixed(1)}%</td>
                        <td className="px-4 py-3 text-slate-600">{v.primaryDriver} ({fmt(v.primaryDriverCost)})</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Table: Loss-Making Vehicles */}
              {vehicleStats.lossMaking.length > 0 && (
                <div className="bg-white rounded-2xl border border-rose-200 overflow-hidden shadow-xs">
                  <div className="px-5 py-3.5 bg-rose-50 border-b border-rose-200 flex items-center justify-between">
                    <span className="font-bold text-xs uppercase tracking-wider text-rose-900 flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-rose-600" />
                      Loss-Making Assets ({vehicleStats.lossMaking.length} Vehicles in Deficit)
                    </span>
                    <span className="text-xs text-rose-700 font-semibold">Immediate Review Required</span>
                  </div>
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-2.5 font-bold uppercase">Vehicle</th>
                        <th className="px-4 py-2.5 font-bold uppercase">Income</th>
                        <th className="px-4 py-2.5 font-bold uppercase">Expense</th>
                        <th className="px-4 py-2.5 font-bold uppercase">Net Deficit</th>
                        <th className="px-4 py-2.5 font-bold uppercase">Primary Cost Driver</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {vehicleStats.lossMaking.map((v) => (
                        <tr key={v.id} className="hover:bg-rose-50/30">
                          <td className="px-4 py-3 font-bold text-slate-900">
                            {v.reg} <span className="font-normal text-slate-500">({v.name})</span>
                          </td>
                          <td className="px-4 py-3 font-mono">{fmt(v.income)}</td>
                          <td className="px-4 py-3 font-mono text-rose-700 font-bold">{fmt(v.expense)}</td>
                          <td className="px-4 py-3 font-mono font-black text-rose-700">{fmt(v.netProfit)}</td>
                          <td className="px-4 py-3 text-slate-700 font-semibold">
                            {v.primaryDriver} ({fmt(v.primaryDriverCost)})
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: AGED RECEIVABLES & DEBTOR REPORT */}
          {activeTab === 'receivables' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              {/* Aging Summary Buckets */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                  <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                    <span>Current (0 – 30 Days)</span>
                    <span className="text-emerald-600">{receivables.bucketCurrent.length} Invoices</span>
                  </div>
                  <div className="text-2xl font-black font-mono text-slate-900">{fmt(receivables.sumCurrent)}</div>
                  <p className="text-[11px] text-slate-500 mt-1">Standard payment processing term</p>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-amber-200 bg-amber-50/20 shadow-xs">
                  <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-amber-700 mb-1">
                    <span>Overdue (31 – 60 Days)</span>
                    <span>{receivables.bucket30.length} Invoices</span>
                  </div>
                  <div className="text-2xl font-black font-mono text-amber-700">{fmt(receivables.sum30)}</div>
                  <p className="text-[11px] text-amber-800 mt-1">Requires 1st formal reminder</p>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-rose-200 bg-rose-50/20 shadow-xs">
                  <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-rose-700 mb-1">
                    <span>Critical Overdue (61+ Days)</span>
                    <span>{receivables.bucket60.length} Invoices</span>
                  </div>
                  <div className="text-2xl font-black font-mono text-rose-700">{fmt(receivables.sum60)}</div>
                  <p className="text-[11px] text-rose-800 mt-1">🚨 High default risk / Escalate</p>
                </div>
              </div>

              {/* Detailed Debtor List */}
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <span className="font-bold text-xs uppercase tracking-wider text-slate-700">
                    Aged Debtor Audit & Collection Schedule
                  </span>
                  <span className="text-xs text-slate-500 font-semibold">
                    {receivables.items.length} uncollected items
                  </span>
                </div>
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-2.5 font-bold uppercase">Customer / Debtor</th>
                      <th className="px-4 py-2.5 font-bold uppercase">Vehicle</th>
                      <th className="px-4 py-2.5 font-bold uppercase">Overdue Aging</th>
                      <th className="px-4 py-2.5 font-bold uppercase">Amount Due</th>
                      <th className="px-4 py-2.5 font-bold uppercase">Risk Tier</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {receivables.items.length > 0 ? (
                      receivables.items.map((i) => (
                        <tr key={i.id} className="hover:bg-slate-50/60">
                          <td className="px-4 py-3 font-bold text-slate-900">{i.debtorName}</td>
                          <td className="px-4 py-3 font-mono text-slate-700">{i.reg}</td>
                          <td className="px-4 py-3 font-mono">
                            <span className="font-bold">{i.daysOverdue}</span> days ago
                          </td>
                          <td className="px-4 py-3 font-mono font-bold text-rose-700">{fmt(i.amount)}</td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                i.daysOverdue > 60
                                  ? 'bg-rose-100 text-rose-800'
                                  : i.daysOverdue > 30
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-emerald-100 text-emerald-800'
                              }`}
                            >
                              {i.bucket}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                          No outstanding invoices or debts found in current dataset.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: FLEET EXPENSE BREAKDOWN */}
          {activeTab === 'expenses' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <span className="font-bold text-xs uppercase tracking-wider text-slate-700">
                    Expense Distribution by Operational Category
                  </span>
                  <span className="text-xs font-bold text-slate-900 font-mono">
                    Total OPEX: {fmt(expenseBreakdown.totalFleetExpense)}
                  </span>
                </div>
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-2.5 font-bold uppercase">Expense Category</th>
                      <th className="px-4 py-2.5 font-bold uppercase">Total Spend</th>
                      <th className="px-4 py-2.5 font-bold uppercase">% of Fleet OPEX</th>
                      <th className="px-4 py-2.5 font-bold uppercase">Visual Share</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {expenseBreakdown.categories.map((c) => (
                      <tr key={c.category} className="hover:bg-slate-50/60">
                        <td className="px-4 py-3 font-bold text-slate-800">{c.category}</td>
                        <td className="px-4 py-3 font-mono font-bold text-slate-900">{fmt(c.amount)}</td>
                        <td className="px-4 py-3 font-mono text-slate-600">{c.percentage.toFixed(1)}%</td>
                        <td className="px-4 py-3 w-48">
                          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                            <div
                              className="bg-indigo-600 h-2 rounded-full"
                              style={{ width: `${Math.min(100, Math.max(2, c.percentage))}%` }}
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 5: INGEST RAW DATA */}
          {activeTab === 'raw_ingest' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                <h3 className="text-sm font-bold text-slate-800 mb-1 flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
                  Paste Raw Fleet Financial Data (CSV / JSON)
                </h3>
                <p className="text-xs text-slate-500 mb-3">
                  Paste raw exported rows or JSON logs to run this 4-module analytics report in an isolated sandbox without altering your database.
                </p>

                <textarea
                  rows={8}
                  value={rawInputText}
                  onChange={(e) => setRawInputText(e.target.value)}
                  placeholder={`Date, Type, Amount, Category, Description, Vehicle, Customer, Status\n2026-09-01, Income, 1200, Rental, Weekly hire, AB12 CDE, Acme Logistics, paid\n2026-09-03, Expense, 450, Repairs, Brake pads replacement, AB12 CDE, , paid`}
                  className="w-full font-mono text-xs p-3 border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800"
                />

                <div className="flex items-center justify-between mt-3">
                  <button
                    type="button"
                    onClick={() => {
                      setRawInputText('');
                      setCustomParsedTxns(null);
                      toast.success('Reset to live fleet data');
                    }}
                    className="text-xs font-semibold text-slate-500 hover:text-rose-600"
                  >
                    Clear & Revert to Live Fleet
                  </button>

                  <button
                    type="button"
                    onClick={handleParseRawInput}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
                  >
                    Ingest & Compute Reports
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* FOOTER ACTIONS */}
        <div className="px-6 py-3.5 bg-white border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div>
            Active dataset: <span className="font-bold text-slate-800">{activeTxns.length} transactions</span>
            {customParsedTxns && <span className="ml-2 text-indigo-600 font-bold">(Isolated Dataset)</span>}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyMarkdown}
              className="px-3.5 py-1.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold transition-colors cursor-pointer"
            >
              Copy Full Markdown
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold transition-colors cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
