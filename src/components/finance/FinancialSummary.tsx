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
} from 'lucide-react';
import { useFormattedDisplay } from '../../hooks/useFormattedDisplay';
import { usePermissions } from '../../hooks/usePermissions';
import { Account, Transaction } from '../../types';

interface FinancialSummaryProps {
  totalIncome: number;
  totalIncomeNet?: number;
  totalIncomeVat?: number;
  totalExpenses: number;
  totalExpenseNet?: number;
  totalExpenseVat?: number;
  netIncome: number;
  netIncomeNet?: number;
  totalVatLiability?: number;
  profitMargin: number;
  totalOwingFromOwners: number;
  totalOwingFromAccounts: number;
  accounts: Account[];
  transactions: Transaction[];
}

const FinancialSummary: React.FC<FinancialSummaryProps> = ({
  totalIncome,
  totalIncomeNet = 0,
  totalIncomeVat = 0,
  totalExpenses,
  totalExpenseNet = 0,
  totalExpenseVat = 0,
  netIncome,
  netIncomeNet = 0,
  totalVatLiability = 0,
  totalOwingFromOwners,
  totalOwingFromAccounts,
  accounts = [],
  transactions = [],
}) => {
  const { formatCurrency } = useFormattedDisplay();
  const { can } = usePermissions();

  const [showOtherBalances, setShowOtherBalances] = useState(false);
  const [showAllOtherAccounts, setShowAllOtherAccounts] = useState(false);
  const [accountSearch, setAccountSearch] = useState('');
  const [showOutstandingDebts, setShowOutstandingDebts] = useState<boolean>(() => {
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

  const mainStats = [
    {
      key: 'income',
      label: 'Income (Gross)',
      value: formatCurrency(totalIncome),
      tone: 'text-slate-900',
      icon: <TrendingUp className="w-5 h-5 text-emerald-600" />,
      iconBg: 'bg-emerald-50 border-emerald-200 text-emerald-600',
      subtext: `Net: ${formatCurrency(totalIncomeNet)} | VAT: ${formatCurrency(totalIncomeVat)}`,
    },
    {
      key: 'expenses',
      label: 'Expenses (Gross)',
      value: formatCurrency(totalExpenses),
      tone: 'text-slate-900',
      icon: <TrendingDown className="w-5 h-5 text-rose-600" />,
      iconBg: 'bg-rose-50 border-rose-200 text-rose-600',
      subtext: `Net: ${formatCurrency(totalExpenseNet)} | VAT: ${formatCurrency(totalExpenseVat)}`,
    },
    {
      key: 'net',
      label: 'Net Profit (Gross)',
      value: formatCurrency(netIncome),
      tone: netIncome >= 0 ? 'text-emerald-600' : 'text-rose-600',
      icon: <DollarSign className="w-5 h-5 text-blue-600" />,
      iconBg: 'bg-blue-50 border-blue-200 text-blue-600',
      subtext: `Net Profit (Ex. VAT): ${formatCurrency(netIncomeNet)}`,
    },
    {
      key: 'vat_liability',
      label: 'VAT Liability',
      value: formatCurrency(totalVatLiability),
      tone: totalVatLiability > 0 ? 'text-amber-600' : 'text-emerald-600',
      icon: <FileText className="w-5 h-5 text-amber-600" />,
      iconBg: 'bg-amber-50 border-amber-200 text-amber-600',
      subtext: `Collected: ${formatCurrency(totalIncomeVat)} | Paid: ${formatCurrency(totalExpenseVat)}`,
    },
  ];

  // Secondary summary cards requested directly under summary cards:
  // 1. Owing from Owners
  // 2. Owing from Accounts
  // 3. AIE SKYLINE ACCOUNTS
  const aieBalance = aieSkylineData.balance;
  const aieTone = aieBalance > 0 ? 'text-emerald-600' : aieBalance < 0 ? 'text-[#DC2626]' : 'text-slate-700';
  const aieIconBg = aieBalance < 0 ? 'bg-rose-50 border-rose-200 text-[#DC2626]' : 'bg-indigo-50 border-indigo-200 text-indigo-600';

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
      tone: aieTone,
      icon: <Banknote className={`w-5 h-5 ${aieBalance < 0 ? 'text-[#DC2626]' : 'text-indigo-600'}`} />,
      iconBg: aieIconBg,
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
      tone: acc.balance > 0 ? 'text-emerald-600' : acc.balance < 0 ? 'text-rose-600' : 'text-slate-600',
      icon: <Banknote className={`w-5 h-5 ${acc.balance < 0 ? 'text-rose-600' : 'text-indigo-600'}`} />,
      iconBg: acc.balance < 0 ? 'bg-rose-50 border-rose-200 text-rose-600' : 'bg-indigo-50 border-indigo-200 text-indigo-600',
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

  return (
    <div className="space-y-4 mb-6">
      {/* ROW 1: Performance Summary Cards */}
      <div>
        <div className="mb-2 p-1">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Performance Summary</h3>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {mainStats.map((c) => (
            <div
              key={c.key}
              className="bg-white rounded-2xl shadow-xs p-4 sm:p-5 border border-slate-200 hover:border-slate-300 text-slate-900 flex flex-col justify-between transition-all"
            >
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider truncate">{c.label}</p>
                  <p className={`mt-1 text-xl sm:text-2xl font-black font-mono tracking-tight ${c.tone}`}>
                    {c.value}
                  </p>
                </div>
                <div className={`p-2.5 rounded-xl border shadow-xs ${c.iconBg}`}>{c.icon}</div>
              </div>
              {c.subtext && (
                <div className="mt-3 pt-2 border-t border-slate-100 text-[10px] sm:text-xs text-slate-500 font-medium whitespace-nowrap">
                  {c.subtext}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ROW 2: Under Summary Cards: Owing from Owners, Owing from Accounts, AIE SKYLINE ACCOUNTS (Collapsible) */}
      <div>
        <div className="flex items-center justify-between mb-2 p-1">
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
                Hidden to save space • Click to expand
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
                className="bg-white rounded-2xl shadow-xs p-4 sm:p-5 border border-slate-200 hover:border-slate-300 text-slate-900 flex items-center justify-between transition-all"
              >
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider truncate">{c.label}</p>
                  <p className={`mt-1 text-xl sm:text-2xl font-black font-mono tracking-tight ${c.tone}`}>
                    {c.value}
                  </p>
                </div>
                <div className={`p-2.5 rounded-xl border shadow-xs ${c.iconBg}`}>{c.icon}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ROW 3: Optional Expandable Other Account Balances (if other accounts exist) */}
      {otherAccountCards.length > 0 && (
        <div className="pt-1">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-2 gap-2">
            <button
              type="button"
              className="flex items-center cursor-pointer hover:bg-slate-100 p-2 rounded-xl transition-colors w-full sm:w-auto text-left"
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
                  className="bg-white rounded-2xl shadow-xs p-4 sm:p-5 border border-slate-200 hover:border-slate-300 text-slate-900 flex items-center justify-between transition-all"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider truncate">
                      {c.label}
                    </p>
                    <p className={`mt-1 text-xl sm:text-2xl font-black font-mono tracking-tight ${c.tone}`}>
                      {c.value}
                    </p>
                  </div>
                  <div className={`p-2.5 rounded-xl border shadow-xs ${c.iconBg}`}>{c.icon}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FinancialSummary;
