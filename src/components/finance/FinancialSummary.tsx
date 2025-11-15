// src/components/finance/FinancialSummary.tsx
import React, { useMemo } from 'react';
import { DollarSign, TrendingUp, TrendingDown, Percent, Wallet, Banknote } from 'lucide-react';
import { useFormattedDisplay } from '../../hooks/useFormattedDisplay';
import { usePermissions } from '../../hooks/usePermissions';
import { Account, Transaction } from '../../types';
// Removed format import as it's not used here

interface FinancialSummaryProps {
  totalIncome: number; // Filtered income
  totalExpenses: number; // Filtered expenses
  netIncome: number; // Filtered net
  profitMargin: number; // Filtered margin
  totalOwingFromOwners: number; // Overall owing
  accounts: Account[]; // All accounts
  transactions: Transaction[]; // Should be FILTERED transactions
}

const FinancialSummary: React.FC<FinancialSummaryProps> = ({
  totalIncome,
  totalExpenses,
  netIncome,
  profitMargin,
  totalOwingFromOwners,
  accounts = [],
  transactions = [], // This will now receive filteredTransactions
}) => {
  const { formatCurrency, formatPercentage } = useFormattedDisplay();
  const { can } = usePermissions();

  // --- UPDATED: Calculate balances using arrays and FULL amount per account ---
  const accountBalances = useMemo(() => {
    if (!accounts || accounts.length === 0) return [];

    const balances = new Map<string, number>();
    const accountNames = new Map<string, string>();

    accounts.forEach(acc => {
        balances.set(acc.id, 0);
        accountNames.set(acc.id, acc.name);
    });

    // This 'transactions' prop is now the filtered list from the parent
    transactions.forEach(txn => {
        const fullAmount = txn.amount; // Use the full amount

        // Add income to credited accounts
        if (txn.type === 'income' && txn.accountsTo) {
            txn.accountsTo.forEach(accId => {
                if (balances.has(accId)) {
                    // ADD FULL AMOUNT TO EACH ACCOUNT
                    balances.set(accId, (balances.get(accId) || 0) + fullAmount);
                }
            });
        }
        // Subtract expense from debited accounts
        else if (txn.type === 'expense' && txn.accountsFrom) {
             txn.accountsFrom.forEach(accId => {
                if (balances.has(accId)) {
                    // SUBTRACT FULL AMOUNT FROM EACH ACCOUNT
                    balances.set(accId, (balances.get(accId) || 0) - fullAmount);
                }
            });
        }
        // Handle legacy or unassigned
        else if ((!txn.accountsFrom || txn.accountsFrom.length === 0) && (!txn.accountsTo || txn.accountsTo.length === 0)) {
            const defaultAccount = accounts.find(a => a.name === 'AIE SKYLINE ACCOUNT' || a.name === 'AIE Skyline Limited');
            if (defaultAccount && balances.has(defaultAccount.id)) {
                const amountToAdd = (txn.type === 'income' ? fullAmount : -fullAmount); // Use full amount here too
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
      .sort((a,b) => a.name.localeCompare(b.name));

  }, [accounts, transactions]); // Now depends on filtered transactions
  // --- End Balance Calculation Update ---


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

  const accountCards = accountBalances.map(acc => ({
      key: acc.id,
      label: `${acc.name} Balance`,
      value: formatCurrency(acc.balance),
      tone: acc.balance >= 0 ? 'text-green-700' : 'text-red-700', // Adjusted tone slightly
      icon: <Banknote className="w-6 h-6 sm:w-7 sm:h-7 text-indigo-500" />
  }));

  return (
    <div className="space-y-4 mb-6">
        <h3 className="text-base font-medium text-gray-600">Filtered Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4">
          {summaryCards.map((c) => (<div key={c.key} className="bg-white rounded-lg shadow-sm p-4 sm:p-5 border border-gray-100"><div className="flex items-center gap-3"><div className="rounded-md p-2 bg-gray-50">{c.icon}</div><div className="min-w-0"><p className="text-[11px] sm:text-xs font-medium text-gray-500 truncate">{c.label}</p><p className={`mt-1 text-xl sm:text-2xl font-semibold ${c.tone}`}>{c.value}</p></div></div></div>))}
        </div>

        {/* --- ⬇️ FIXED TITLE ⬇️ --- */}
        <h3 className="text-base font-medium text-gray-600 pt-4">Filtered Account Balances</h3>
        {/* --- ⬆️ END FIXED TITLE ⬆️ --- */}

        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4">
          {accountCards.map((c) => (<div key={c.key} className="bg-white rounded-lg shadow-sm p-4 sm:p-5 border border-gray-100"><div className="flex items-center gap-3"><div className="rounded-md p-2 bg-indigo-50">{c.icon}</div><div className="min-w-0"><p className="text-[11px] sm:text-xs font-medium text-gray-500 truncate">{c.label}</p><p className={`mt-1 text-xl sm:text-2xl font-semibold ${c.tone}`}>{c.value}</p></div></div></div>))}
          {accounts.length > 0 && accountCards.length === 0 && <p className="text-sm text-gray-500 col-span-full">All account balances are zero or no transactions found.</p>}
          {accounts.length === 0 && <p className="text-sm text-gray-500 col-span-full">Loading accounts...</p>}
        </div>
    </div>
  );
};

export default FinancialSummary;