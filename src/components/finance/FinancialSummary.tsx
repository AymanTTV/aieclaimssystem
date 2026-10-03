// src/components/finance/FinancialSummary.tsx
import React, { useMemo, useState } from 'react';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Wallet,
  Banknote,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Search,
  FileText,
  Building2,
  Percent,
  FileSpreadsheet,
} from 'lucide-react';
import { useFormattedDisplay } from '../../hooks/useFormattedDisplay';
import { usePermissions } from '../../hooks/usePermissions';
import { Account, Transaction } from '../../types';
import { calculateDeduplicatedSummaryMetrics } from '../../utils/profitCalculator';

interface FinancialSummaryProps {
  totalIncome?: number;
  totalIncomeNet?: number;
  totalIncomeVat?: number;
  totalExpenses?: number;
  totalExpenseNet?: number;
  totalExpenseVat?: number;
  netIncome?: number;
  netIncomeNet?: number;
  totalVatLiability?: number;
  profitMargin?: number | string;
  totalOwingFromOwners: number;
  totalOwingFromAccounts: number;
  accounts: Account[];
  transactions: Transaction[];
  // Display Mode: 'all' | 'top_cards_only' | 'accounts_only'
  displayMode?: 'all' | 'top_cards_only' | 'accounts_only';
  onOpenStatementModal?: (accountId?: string) => void;
  // Dynamic summary metrics
  summaryMetrics?: {
    totalIncome?: number;
    totalExpenses?: number;
    totalOutstanding?: number;
    dealerCost?: number;
    subcontractorCost?: number;
    netProfit: number;
    grossBilling?: number;
    totalReceived?: number;
  };
  // Dual-mode Subcontractor & Standard Expense Tracking
  totalRevenue?: number;
  totalCombinedExpenses?: number;
  standardExpenses?: number;
  verifiedSubcontractorExpenses?: number;
  totalSubcontractorExpenses?: number;
  totalSubcontractorNetProfit?: number;
  subcontractorProfitMargin?: number;
}

const FinancialSummary: React.FC<FinancialSummaryProps> = ({
  totalIncome = 0,
  totalIncomeNet = 0,
  totalIncomeVat = 0,
  totalExpenses = 0,
  totalExpenseNet = 0,
  totalExpenseVat = 0,
  netIncome = 0,
  netIncomeNet = 0,
  totalVatLiability = 0,
  totalOwingFromOwners,
  totalOwingFromAccounts,
  accounts = [],
  transactions = [],
  displayMode = 'all',
  onOpenStatementModal,
  summaryMetrics: propSummaryMetrics,
  totalRevenue,
  totalCombinedExpenses,
  standardExpenses,
  verifiedSubcontractorExpenses,
  totalSubcontractorExpenses,
  totalSubcontractorNetProfit,
  subcontractorProfitMargin,
}) => {
  const { formatCurrency } = useFormattedDisplay();
  const { can } = usePermissions();

  // Standard 3-Card Profit & Loss (P&L) Summary Metrics calculation:
  // 1. TOTAL INCOME: Sum of all rows marked as 'INCOME' (or Credit)
  // 2. TOTAL EXPENSES: Sum of all rows marked as 'EXPENSE' (or Debit) + all subcontractor/dealer costs
  // 3. NET PROFIT: (Total Income) - Math.abs(Total Expenses)
  const computedSummaryMetrics = useMemo(() => {
    return calculateDeduplicatedSummaryMetrics(transactions);
  }, [transactions]);

  const activeSummaryMetrics = useMemo(() => {
    const metrics = propSummaryMetrics || computedSummaryMetrics;
    const inc = Number(metrics.totalIncome ?? (metrics as any).grossBilling ?? totalIncome ?? 0);
    const exp = Math.abs(Number(metrics.totalExpenses ?? totalExpenses ?? 0));
    const dealer = Number((metrics as any).subcontractorCost ?? (metrics as any).dealerCost ?? 0);
    // Formula strictly: Net Profit = Total Income - Math.abs(Total Expenses)
    // Never copy Total Expenses into Net Profit!
    const profit = Number((inc - exp).toFixed(2));

    return {
      totalIncome: inc,
      totalExpenses: exp,
      dealerCost: dealer,
      subcontractorCost: dealer,
      netProfit: profit,
      grossBilling: inc,
      totalReceived: (metrics as any).totalReceived ?? inc,
    };
  }, [propSummaryMetrics, computedSummaryMetrics, totalIncome, totalExpenses]);

  const dynamicProfitMargin =
    activeSummaryMetrics.totalIncome > 0
      ? ((activeSummaryMetrics.netProfit / activeSummaryMetrics.totalIncome) * 100).toFixed(1)
      : '0.0';

  const effectiveRevenue = totalRevenue !== undefined ? totalRevenue : totalIncome;
  const effectiveTotalExpenses =
    totalCombinedExpenses !== undefined
      ? totalCombinedExpenses
      : totalExpenses;
  const effectiveStandardExpenses =
    standardExpenses !== undefined
      ? standardExpenses
      : Math.max(0, effectiveTotalExpenses - (totalSubcontractorExpenses || 0));
  const effectiveSubExpenses =
    verifiedSubcontractorExpenses !== undefined
      ? verifiedSubcontractorExpenses
      : (totalSubcontractorExpenses !== undefined ? totalSubcontractorExpenses : 0);

  const effectiveSubNetProfit =
    totalSubcontractorNetProfit !== undefined
      ? totalSubcontractorNetProfit
      : effectiveRevenue - effectiveTotalExpenses;

  const effectiveSubMargin =
    subcontractorProfitMargin !== undefined
      ? subcontractorProfitMargin
      : effectiveRevenue > 0
      ? (effectiveSubNetProfit / effectiveRevenue) * 100
      : 0;

  const [showOtherBalances, setShowOtherBalances] = useState(() => displayMode === 'accounts_only');
  const [showAllOtherAccounts, setShowAllOtherAccounts] = useState(false);
  const [accountSearch, setAccountSearch] = useState('');
  const [showOutstandingDebts, setShowOutstandingDebts] = useState<boolean>(() => {
    if (displayMode === 'accounts_only') return true;
    try {
      const saved = localStorage.getItem('finance_show_debts_operating');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });

  // Calculates balances based on CURRENT filtered view
  const accountBalances = useMemo(() => {
    if (!accounts || accounts.length === 0) return [];

    const balances = new Map<string, number>();
    const accountNames = new Map<string, string>();

    accounts.forEach((acc) => {
      balances.set(acc.id, 0);
      accountNames.set(acc.id, acc.name);
    });

    transactions.forEach((txn) => {
      const fullAmount = Number(txn.amount) || 0;

      if (txn.type === 'income') {
        if (txn.accountsTo && txn.accountsTo.length > 0) {
          txn.accountsTo.forEach((accId) => {
            if (balances.has(accId)) {
              balances.set(accId, (balances.get(accId) || 0) + fullAmount);
            }
          });
        } else {
          const defaultAccount = accounts.find(
            (a) => a.name === 'AIE SKYLINE ACCOUNT' || a.name === 'AIE Skyline Limited' || a.name === 'AIE SKYLINE ACCOUNTS'
          );
          if (defaultAccount && balances.has(defaultAccount.id)) {
            balances.set(defaultAccount.id, (balances.get(defaultAccount.id) || 0) + fullAmount);
          }
        }
      } else if (txn.type === 'expense') {
        if (txn.accountsFrom && txn.accountsFrom.length > 0) {
          txn.accountsFrom.forEach((accId) => {
            if (balances.has(accId)) {
              balances.set(accId, (balances.get(accId) || 0) - fullAmount);
            }
          });
        } else {
          const defaultAccount = accounts.find(
            (a) => a.name === 'AIE SKYLINE ACCOUNT' || a.name === 'AIE Skyline Limited' || a.name === 'AIE SKYLINE ACCOUNTS'
          );
          if (defaultAccount && balances.has(defaultAccount.id)) {
            balances.set(defaultAccount.id, (balances.get(defaultAccount.id) || 0) - fullAmount);
          }
        }
      }
    });

    const unsorted = Array.from(balances.entries()).map(([id, balance]) => ({
      id,
      name: accountNames.get(id)!,
      balance,
    }));

    const negatives = unsorted.filter((a) => a.balance < 0).sort((a, b) => a.balance - b.balance);
    const positives = unsorted.filter((a) => a.balance > 0).sort((a, b) => b.balance - a.balance);
    const zeros = unsorted.filter((a) => a.balance === 0);

    return [...negatives, ...positives, ...zeros];
  }, [accounts, transactions]);

  // Extract AIE Skyline Account specifically for the featured summary card
  const aieSkylineData = useMemo(() => {
    const exact = accountBalances.find((acc) => {
      const n = (acc.name || '').trim().toUpperCase();
      return n === 'AIE SKYLINE ACCOUNTS' || n === 'AIE SKYLINE ACCOUNT' || n === 'AIE SKYLINE LIMITED';
    });
    if (exact) {
      return {
        id: exact.id,
        label: exact.name.toUpperCase(),
        balance: exact.balance,
      };
    }

    const partial = accountBalances.find((acc) =>
      (acc.name || '').trim().toUpperCase().includes('AIE SKYLINE')
    );
    if (partial) {
      return {
        id: partial.id,
        label: partial.name.toUpperCase(),
        balance: partial.balance,
      };
    }

    return {
      id: 'aie_default',
      label: 'AIE SKYLINE ACCOUNTS',
      balance: 0,
    };
  }, [accountBalances]);

  if (!can('finance', 'cards')) return null;

  const aieBalance = aieSkylineData.balance;

  const secondarySummaryCards = [
    {
      key: 'owing_owners',
      label: 'Owing from Owners',
      value: formatCurrency(totalOwingFromOwners),
      tone: 'text-[#DC2626]',
      icon: <Wallet className="w-5 h-5 text-[#DC2626]" />,
      iconBg: 'bg-rose-50 border-rose-200 text-[#DC2626]',
    },
    {
      key: 'owing_accounts',
      label: 'Owing from Accounts',
      value: formatCurrency(totalOwingFromAccounts),
      tone: 'text-[#DC2626]',
      icon: <AlertCircle className="w-5 h-5 text-[#DC2626]" />,
      iconBg: 'bg-rose-50 border-rose-200 text-[#DC2626]',
    },
    {
      key: 'aie_skyline',
      label: aieSkylineData.label,
      value: formatCurrency(aieBalance),
      tone: aieBalance > 0 ? 'text-[#059669]' : aieBalance < 0 ? 'text-[#DC2626]' : 'text-slate-700',
      icon: <Banknote className={`w-5 h-5 ${aieBalance > 0 ? 'text-[#059669]' : aieBalance < 0 ? 'text-[#DC2626]' : 'text-indigo-600'}`} />,
      iconBg: aieBalance > 0 ? 'bg-emerald-50 border-emerald-200 text-[#059669]' : aieBalance < 0 ? 'bg-rose-50 border-rose-200 text-[#DC2626]' : 'bg-indigo-50 border-indigo-200 text-indigo-600',
    },
  ];

  // Other accounts (excluding the AIE Skyline account featured above)
  const otherAccountCards = accountBalances
    .filter((acc) => {
      if (acc.id === aieSkylineData.id) return false;
      const n = (acc.name || '').trim().toUpperCase();
      if (n.includes('AIE SKYLINE')) return false;
      return true;
    })
    .map((acc) => ({
      key: acc.id,
      label: acc.name,
      value: formatCurrency(acc.balance),
      tone: acc.balance > 0 ? 'text-[#059669]' : acc.balance < 0 ? 'text-[#DC2626]' : 'text-slate-600',
      icon: <Banknote className={`w-5 h-5 ${acc.balance > 0 ? 'text-[#059669]' : acc.balance < 0 ? 'text-[#DC2626]' : 'text-indigo-600'}`} />,
      iconBg: acc.balance > 0 ? 'bg-emerald-50 border-emerald-200 text-[#059669]' : acc.balance < 0 ? 'bg-rose-50 border-rose-200 text-[#DC2626]' : 'bg-indigo-50 border-indigo-200 text-indigo-600',
    }))
    .filter((card) => {
      const searchLower = accountSearch.trim().toLowerCase();
      if (searchLower) return card.label.toLowerCase().includes(searchLower);
      return true;
    });

  const VISIBLE_LIMIT = 8;
  const displayedOtherCards = showAllOtherAccounts
    ? otherAccountCards
    : otherAccountCards.slice(0, VISIBLE_LIMIT);

  // TOP 3-CARD PERFORMANCE SUMMARY DASHBOARD (P&L Tracking Model)
  const topThreeCards = (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
          Company Performance Overview
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* CARD 1: TOTAL INCOME */}
        <div className="bg-emerald-50/50 border border-emerald-200 rounded-2xl shadow-xs p-4 sm:p-5 hover:border-emerald-300 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
                TOTAL INCOME
              </span>
              <div className="w-8 h-8 rounded-xl bg-emerald-100/90 border border-emerald-300/80 text-emerald-800 shadow-2xs flex items-center justify-center font-bold text-sm">
                £
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl sm:text-3xl font-black font-mono text-emerald-700 block tracking-tight">
                {formatCurrency(activeSummaryMetrics.totalIncome)}
              </span>
              <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                Income / Credit
              </span>
            </div>
          </div>
        </div>

        {/* CARD 2: TOTAL EXPENSES */}
        <div className="bg-rose-50/50 border border-rose-200 rounded-2xl shadow-xs p-4 sm:p-5 hover:border-rose-300 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-rose-800 uppercase tracking-wider">
                TOTAL EXPENSES
              </span>
              <div className="w-8 h-8 rounded-xl bg-rose-100/90 border border-rose-300/80 text-rose-800 shadow-2xs flex items-center justify-center font-bold text-sm">
                £
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl sm:text-3xl font-black font-mono text-rose-700 block tracking-tight">
                {activeSummaryMetrics.totalExpenses > 0 ? `-${formatCurrency(activeSummaryMetrics.totalExpenses)}` : formatCurrency(0)}
              </span>
              <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                Debit &amp; Subcontractor Costs
              </span>
            </div>
          </div>
        </div>

        {/* CARD 3: NET PROFIT */}
        <div className={`border rounded-2xl shadow-xs p-4 sm:p-5 transition-all flex flex-col justify-between ${
          activeSummaryMetrics.netProfit >= 0
            ? 'bg-emerald-50 border-emerald-300 hover:border-emerald-400'
            : 'bg-rose-50 border-rose-300 hover:border-rose-400'
        }`}>
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className={`text-xs font-bold uppercase tracking-wider ${
                activeSummaryMetrics.netProfit >= 0 ? 'text-emerald-800' : 'text-rose-800'
              }`}>
                NET PROFIT
              </span>
              <div className="flex items-center gap-1.5">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                  activeSummaryMetrics.netProfit >= 0
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                    : 'bg-rose-100 text-rose-800 border-rose-200'
                }`}>
                  {activeSummaryMetrics.netProfit >= 0 ? (
                    <TrendingUp className="w-3 h-3 mr-0.5" />
                  ) : (
                    <TrendingDown className="w-3 h-3 mr-0.5" />
                  )}
                  {activeSummaryMetrics.netProfit > 0 ? '+' : ''}{dynamicProfitMargin}%
                </span>
                <div className={`w-8 h-8 rounded-xl border shadow-2xs flex items-center justify-center font-bold text-sm ${
                  activeSummaryMetrics.netProfit >= 0
                    ? 'bg-emerald-100 border-emerald-300 text-emerald-800'
                    : 'bg-rose-100 border-rose-300 text-rose-800'
                }`}>
                  {activeSummaryMetrics.netProfit >= 0 ? (
                    <TrendingUp className="w-4 h-4" />
                  ) : (
                    <TrendingDown className="w-4 h-4" />
                  )}
                </div>
              </div>
            </div>
            <div className="mt-3">
              <span className={`text-2xl sm:text-3xl font-black font-mono block tracking-tight ${
                activeSummaryMetrics.netProfit >= 0 ? 'text-emerald-800' : 'text-rose-700'
              }`}>
                {activeSummaryMetrics.netProfit > 0 ? '+' : ''}{formatCurrency(activeSummaryMetrics.netProfit)}
              </span>
              <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                activeSummaryMetrics.netProfit >= 0
                  ? 'bg-emerald-200/70 text-emerald-900'
                  : 'bg-rose-200/70 text-rose-900'
              }`}>
                Total Income - Total Expenses
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // OUTSTANDING DEBTS & OPERATING ACCOUNT + OTHER ACCOUNT BALANCES
  const debtsAndAccountsSection = (
    <div className="space-y-6">
      {/* ROW 2: Under Summary Cards: Owing from Owners, Owing from Accounts, AIE SKYLINE ACCOUNTS (Collapsible) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs">
        <div className="flex items-center justify-between mb-3 p-1">
          <button
            type="button"
            onClick={() => {
              setShowOutstandingDebts((prev) => {
                const next = !prev;
                try {
                  localStorage.setItem('finance_show_debts_operating', String(next));
                } catch {}
                return next;
              });
            }}
            className="flex items-center gap-2 cursor-pointer group select-none text-left"
          >
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider group-hover:text-slate-900 transition-colors">
              Outstanding Debts & Operating Account
            </h3>
            <span className="p-1 rounded-lg bg-slate-100 group-hover:bg-slate-200 text-slate-600 transition-colors">
              {showOutstandingDebts ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </span>
            {!showOutstandingDebts && (
              <span className="hidden sm:inline-block text-[11px] font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md ml-1">
                Hidden • Click to expand
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              setShowOutstandingDebts((prev) => {
                const next = !prev;
                try {
                  localStorage.setItem('finance_show_debts_operating', String(next));
                } catch {}
                return next;
              });
            }}
            className="text-xs font-bold text-slate-500 hover:text-indigo-600 transition-colors cursor-pointer px-2.5 py-1 rounded-lg hover:bg-slate-100"
          >
            {showOutstandingDebts ? 'Hide Section' : 'Show (3 Cards)'}
          </button>
        </div>

        {showOutstandingDebts && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 animate-in fade-in duration-150">
            {secondarySummaryCards.map((c) => (
              <div
                key={c.key}
                className="bg-slate-50/70 rounded-2xl shadow-2xs p-4 sm:p-5 border border-slate-200 hover:border-slate-300 text-slate-900 flex items-center justify-between transition-all group relative"
              >
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider truncate">{c.label}</p>
                  <p className={`mt-1 text-xl sm:text-2xl font-black font-mono tracking-tight ${c.tone}`}>
                    {c.value}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {c.key === 'aie_skyline' && onOpenStatementModal && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenStatementModal(aieSkylineData.id !== 'aie_default' ? aieSkylineData.id : undefined);
                      }}
                      className="opacity-80 sm:opacity-0 group-hover:opacity-100 p-2 rounded-xl bg-white hover:bg-indigo-50 text-indigo-600 border border-slate-200 hover:border-indigo-300 shadow-2xs transition-all cursor-pointer"
                      title="Generate certified Account Statement PDF"
                    >
                      <FileText className="w-4 h-4" />
                    </button>
                  )}
                  <div className={`p-2.5 rounded-xl border shadow-xs ${c.iconBg}`}>{c.icon}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ROW 3: Expandable Other Account Balances (if other accounts exist) */}
      {otherAccountCards.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3 gap-2">
            <button
              type="button"
              className="flex items-center cursor-pointer hover:bg-slate-100 p-1.5 rounded-xl transition-colors w-full sm:w-auto text-left"
              onClick={() => setShowOtherBalances(!showOtherBalances)}
            >
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mr-2">
                Other Account Balances ({otherAccountCards.length})
              </h3>
              {showOtherBalances ? (
                <ChevronUp className="w-4 h-4 text-slate-500" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-500" />
              )}
            </button>

            {showOtherBalances && (
              <div className="flex items-center gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                <div className="relative flex-grow sm:flex-grow-0">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="Search accounts..."
                    value={accountSearch}
                    onChange={(e) => setAccountSearch(e.target.value)}
                    className="block w-full sm:w-56 pl-9 pr-3 py-1.5 text-sm border-[1.5px] border-[#CBD5E1] rounded-xl bg-white text-[#0F172A] placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                {otherAccountCards.length > VISIBLE_LIMIT && (
                  <button
                    type="button"
                    onClick={() => setShowAllOtherAccounts(!showAllOtherAccounts)}
                    className="text-xs text-blue-600 font-semibold hover:text-blue-700 flex items-center whitespace-nowrap cursor-pointer"
                  >
                    {showAllOtherAccounts ? 'Show Less' : `Show All (${otherAccountCards.length})`}
                    {showAllOtherAccounts ? (
                      <ChevronUp className="w-3 h-3 ml-1" />
                    ) : (
                      <ChevronDown className="w-3 h-3 ml-1" />
                    )}
                  </button>
                )}
              </div>
            )}
          </div>

          {showOtherBalances && (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
              {displayedOtherCards.map((c) => (
                <div
                  key={c.key}
                  className="bg-slate-50/70 rounded-2xl shadow-2xs p-4 sm:p-5 border border-slate-200 hover:border-slate-300 text-slate-900 flex items-center justify-between transition-all group relative"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider truncate">
                      {c.label}
                    </p>
                    <p className={`mt-1 text-xl sm:text-2xl font-black font-mono tracking-tight ${c.tone}`}>
                      {c.value}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {onOpenStatementModal && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenStatementModal(c.key);
                        }}
                        className="opacity-80 sm:opacity-0 group-hover:opacity-100 p-2 rounded-xl bg-white hover:bg-indigo-50 text-indigo-600 border border-slate-200 hover:border-indigo-300 shadow-2xs transition-all cursor-pointer"
                        title={`Generate certified Account Statement for ${c.label}`}
                      >
                        <FileText className="w-4 h-4" />
                      </button>
                    )}
                    <div className={`p-2.5 rounded-xl border shadow-xs ${c.iconBg}`}>{c.icon}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );

  if (displayMode === 'top_cards_only') {
    return (
      <div className="space-y-4 mb-2">
        {topThreeCards}
      </div>
    );
  }

  if (displayMode === 'accounts_only') {
    return (
      <div className="space-y-6">
        {debtsAndAccountsSection}
      </div>
    );
  }

  return (
    <div className="space-y-6 mb-6">
      {topThreeCards}
      {debtsAndAccountsSection}
    </div>
  );
};

export default FinancialSummary;
