// src/components/finance/FinancialSummary.tsx
import React, { useMemo, useState } from 'react';
import { DollarSign, TrendingUp, TrendingDown, Percent, Wallet, Banknote, ChevronDown, ChevronUp } from 'lucide-react';
import { useFormattedDisplay } from '../../hooks/useFormattedDisplay';
import { usePermissions } from '../../hooks/usePermissions';
import { Account, Transaction } from '../../types';

interface FinancialSummaryProps {
  totalIncome: number;
  totalExpenses: number;
  netIncome: number;
  profitMargin: number;
  totalOwingFromOwners: number;
  accounts: Account[];
  transactions: Transaction[];
}

const FinancialSummary: React.FC<FinancialSummaryProps> = ({
  totalIncome,
  totalExpenses,
  netIncome,
  profitMargin,
  totalOwingFromOwners,
  accounts = [],
  transactions = [], 
}) => {
  const { formatCurrency, formatPercentage } = useFormattedDisplay();
  const { can } = usePermissions();
  const [showAllAccounts, setShowAllAccounts] = useState(false);

  const accountBalances = useMemo(() => {
    if (!accounts || accounts.length === 0) return [];

    const balances = new Map<string, number>();
    const accountNames = new Map<string, string>();

    accounts.forEach(acc => {
        balances.set(acc.id, 0);
        accountNames.set(acc.id, acc.name);
    });

    transactions.forEach(txn => {
        const fullAmount = txn.amount; 
        let processed = false;

        if (txn.accountsTo && txn.accountsTo.length > 0) {
            txn.accountsTo.forEach(accId => {
                if (balances.has(accId)) balances.set(accId, (balances.get(accId) || 0) + fullAmount);
            });
            processed = true;
        }

        if (txn.accountsFrom && txn.accountsFrom.length > 0) {
             txn.accountsFrom.forEach(accId => {
                if (balances.has(accId)) balances.set(accId, (balances.get(accId) || 0) - fullAmount);
            });
            processed = true;
        }

        if (!processed) {
            const defaultAccount = accounts.find(a => a.name === 'AIE SKYLINE ACCOUNT' || a.name === 'AIE Skyline Limited');
            if (defaultAccount && balances.has(defaultAccount.id)) {
                const amountToAdd = (txn.type === 'income' ? fullAmount : -fullAmount);
                balances.set(defaultAccount.id, (balances.get(defaultAccount.id) || 0) + amountToAdd);
            }
        }
    });

    return Array.from(balances.entries())
      .map(([id, balance]) => ({
        id,
        name: accountNames.get(id)!,
        balance,
      }))
      // SORT: Lowest balance (negative) first, Highest balance last
      .sort((a,b) => a.balance - b.balance);

  }, [accounts, transactions]); 

  if (!can('finance', 'cards')) return null;

  const netTone = netIncome > 0 ? 'text-green-600' : netIncome < 0 ? 'text-red-600' : 'text-gray-700';
  const safeProfitMargin = Number.isFinite(profitMargin) && !Number.isNaN(profitMargin) ? profitMargin : 0;

  const summaryCards = [
    { key: 'income', label: 'Filtered Income', value: formatCurrency(totalIncome), tone: 'text-gray-900', icon: <TrendingUp className="w-6 h-6 sm:w-7 sm:h-7 text-green-500" /> },
    { key: 'expenses', label: 'Filtered Expenses', value: formatCurrency(totalExpenses), tone: 'text-gray-900', icon: <TrendingDown className="w-6 h-6 sm:w-7 sm:h-7 text-red-500" /> },
    { key: 'net', label: 'Filtered Net Income', value: formatCurrency(netIncome), tone: netTone, icon: <DollarSign className="w-6 h-6 sm:w-7 sm:h-7 text-blue-500" /> },
    { key: 'margin', label: 'Filtered Profit Margin', value: formatPercentage(safeProfitMargin), tone: 'text-purple-600', icon: <Percent className="w-6 h-6 sm:w-7 sm:h-7 text-purple-500" /> },
    { key: 'owing', label: 'Owing from Owners', value: formatCurrency(totalOwingFromOwners), tone: 'text-orange-600', icon: <Wallet className="w-6 h-6 sm:w-7 sm:h-7 text-orange-500" /> },
  ] as const;

  const allAccountCards = accountBalances.map(acc => ({
      key: acc.id,
      label: `${acc.name}`,
      value: formatCurrency(acc.balance),
      tone: acc.balance >= 0 ? 'text-green-700' : 'text-red-700',
      icon: <Banknote className="w-6 h-6 sm:w-7 sm:h-7 text-indigo-500" />
  }));

  // Limit logic
  const displayedAccountCards = showAllAccounts ? allAccountCards : allAccountCards.slice(0, 4);

  return (
    <div className="space-y-4 mb-6">
        <h3 className="text-base font-medium text-gray-600">Filtered Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4">
          {summaryCards.map((c) => (<div key={c.key} className="bg-white rounded-lg shadow-sm p-4 sm:p-5 border border-gray-100"><div className="flex items-center gap-3"><div className="rounded-md p-2 bg-gray-50">{c.icon}</div><div className="min-w-0"><p className="text-[11px] sm:text-xs font-medium text-gray-500 truncate">{c.label}</p><p className={`mt-1 text-xl sm:text-2xl font-semibold ${c.tone}`}>{c.value}</p></div></div></div>))}
        </div>

        <div className="flex justify-between items-end pt-4">
            <h3 className="text-base font-medium text-gray-600">Filtered Account Balances</h3>
            {allAccountCards.length > 4 && (
                <button 
                    onClick={() => setShowAllAccounts(!showAllAccounts)}
                    className="text-xs text-indigo-600 font-medium hover:text-indigo-800 flex items-center"
                >
                    {showAllAccounts ? 'Show Less' : `Show All (${allAccountCards.length})`}
                    {showAllAccounts ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />}
                </button>
            )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
          {displayedAccountCards.map((c) => (<div key={c.key} className="bg-white rounded-lg shadow-sm p-4 sm:p-5 border border-gray-100"><div className="flex items-center gap-3"><div className="rounded-md p-2 bg-indigo-50">{c.icon}</div><div className="min-w-0"><p className="text-[11px] sm:text-xs font-medium text-gray-500 truncate">{c.label}</p><p className={`mt-1 text-xl sm:text-2xl font-semibold ${c.tone}`}>{c.value}</p></div></div></div>))}
          
          {accounts.length > 0 && allAccountCards.length === 0 && <p className="text-sm text-gray-500 col-span-full">All account balances are zero or no transactions found.</p>}
          {accounts.length === 0 && <p className="text-sm text-gray-500 col-span-full">Loading accounts...</p>}
        </div>
    </div>
  );
};

export default FinancialSummary;