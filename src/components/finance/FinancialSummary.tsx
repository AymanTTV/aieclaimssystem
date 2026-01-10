// src/components/finance/FinancialSummary.tsx
import React, { useMemo, useState } from 'react';
import { DollarSign, TrendingUp, TrendingDown, Percent, Wallet, Banknote, ChevronDown, ChevronUp, AlertCircle, Search } from 'lucide-react';
import { useFormattedDisplay } from '../../hooks/useFormattedDisplay';
import { usePermissions } from '../../hooks/usePermissions';
import { Account, Transaction } from '../../types';

interface FinancialSummaryProps {
  totalIncome: number;
  totalExpenses: number;
  netIncome: number;
  profitMargin: number;
  totalOwingFromOwners: number;
  totalOwingFromAccounts: number;
  accounts: Account[];
  transactions: Transaction[];
}

const FinancialSummary: React.FC<FinancialSummaryProps> = ({
  totalIncome,
  totalExpenses,
  netIncome,
  profitMargin,
  totalOwingFromOwners,
  totalOwingFromAccounts,
  accounts = [],
  transactions = [], 
}) => {
  const { formatCurrency, formatPercentage } = useFormattedDisplay();
  const { can } = usePermissions();
  
  const [showAllAccounts, setShowAllAccounts] = useState(false);
  const [accountSearch, setAccountSearch] = useState('');

  // Calculates balances based on CURRENT filtered view (for the bottom list)
  const accountBalances = useMemo(() => {
    if (!accounts || accounts.length === 0) return [];

    const balances = new Map<string, number>();
    const accountNames = new Map<string, string>();

    // Initialize all accounts with 0 balance
    accounts.forEach(acc => {
        balances.set(acc.id, 0);
        accountNames.set(acc.id, acc.name);
    });

    transactions.forEach(txn => {
        const fullAmount = Number(txn.amount) || 0;
        
        // STRICT LOGIC: Handle based on Type
        if (txn.type === 'income') {
            // INCOME: Credits the 'To' Account (Increases Balance)
            if (txn.accountsTo && txn.accountsTo.length > 0) {
                txn.accountsTo.forEach(accId => {
                    if (balances.has(accId)) {
                        balances.set(accId, (balances.get(accId) || 0) + fullAmount);
                    }
                });
            } else {
                // Legacy/Fallback: If no account assigned, try default
                const defaultAccount = accounts.find(a => a.name === 'AIE SKYLINE ACCOUNT' || a.name === 'AIE Skyline Limited');
                if (defaultAccount && balances.has(defaultAccount.id)) {
                     balances.set(defaultAccount.id, (balances.get(defaultAccount.id) || 0) + fullAmount);
                }
            }
        } 
        else if (txn.type === 'expense') {
            // EXPENSE: Debits the 'From' Account (Decreases Balance)
            if (txn.accountsFrom && txn.accountsFrom.length > 0) {
                 txn.accountsFrom.forEach(accId => {
                    if (balances.has(accId)) {
                        balances.set(accId, (balances.get(accId) || 0) - fullAmount);
                    }
                });
            } else {
                // Legacy/Fallback
                const defaultAccount = accounts.find(a => a.name === 'AIE SKYLINE ACCOUNT' || a.name === 'AIE Skyline Limited');
                if (defaultAccount && balances.has(defaultAccount.id)) {
                     balances.set(defaultAccount.id, (balances.get(defaultAccount.id) || 0) - fullAmount);
                }
            }
        }
    });

    const unsorted = Array.from(balances.entries())
      .map(([id, balance]) => ({
        id,
        name: accountNames.get(id)!,
        balance,
      }));

    // --- SORTING LOGIC ---
    // 1. Negative balances (Most negative first)
    const negatives = unsorted
        .filter(a => a.balance < 0)
        .sort((a, b) => a.balance - b.balance); 
    
    // 2. Positive balances (Highest positive first)
    const positives = unsorted
        .filter(a => a.balance > 0)
        .sort((a, b) => b.balance - a.balance);

    // 3. Zero balances
    const zeros = unsorted.filter(a => a.balance === 0);

    return [...negatives, ...positives, ...zeros];

  }, [accounts, transactions]); 

  if (!can('finance', 'cards')) return null;

  const netTone = netIncome > 0 ? 'text-green-600' : netIncome < 0 ? 'text-red-600' : 'text-gray-700';
  const safeProfitMargin = Number.isFinite(profitMargin) && !Number.isNaN(profitMargin) ? profitMargin : 0;

  // Row 1: Main Financials
  const mainStats = [
    { key: 'income', label: 'Filtered Income', value: formatCurrency(totalIncome), tone: 'text-gray-900', icon: <TrendingUp className="w-6 h-6 sm:w-7 sm:h-7 text-green-500" /> },
    { key: 'expenses', label: 'Filtered Expenses', value: formatCurrency(totalExpenses), tone: 'text-gray-900', icon: <TrendingDown className="w-6 h-6 sm:w-7 sm:h-7 text-red-500" /> },
    { key: 'net', label: 'Filtered Net Income', value: formatCurrency(netIncome), tone: netTone, icon: <DollarSign className="w-6 h-6 sm:w-7 sm:h-7 text-blue-500" /> },
    { key: 'margin', label: 'Filtered Profit Margin', value: formatPercentage(safeProfitMargin), tone: 'text-purple-600', icon: <Percent className="w-6 h-6 sm:w-7 sm:h-7 text-purple-500" /> },
  ];

  // Row 2: Owing / Debt Stats
  const owingStats = [
    { key: 'owing_owners', label: 'Owing from Owners', value: formatCurrency(totalOwingFromOwners), tone: 'text-orange-600', icon: <Wallet className="w-6 h-6 sm:w-7 sm:h-7 text-orange-500" /> },
    { key: 'owing_accounts', label: 'Owing from Accounts', value: formatCurrency(totalOwingFromAccounts), tone: 'text-red-600', icon: <AlertCircle className="w-6 h-6 sm:w-7 sm:h-7 text-red-500" /> },
  ];

  // 1. Generate all cards
  const allAccountCards = accountBalances.map(acc => ({
      key: acc.id,
      label: `${acc.name}`,
      value: formatCurrency(acc.balance),
      tone: acc.balance > 0 ? 'text-green-700' : acc.balance < 0 ? 'text-red-700' : 'text-gray-500',
      icon: <Banknote className={`w-6 h-6 sm:w-7 sm:h-7 ${acc.balance < 0 ? 'text-red-500' : 'text-indigo-500'}`} />
  }));

  // 2. Filter based on Search
  const filteredAccountCards = allAccountCards.filter(card => 
    card.label.toLowerCase().includes(accountSearch.toLowerCase())
  );

  // 3. Slice for display
  const VISIBLE_LIMIT = 8;
  const displayedAccountCards = showAllAccounts ? filteredAccountCards : filteredAccountCards.slice(0, VISIBLE_LIMIT);

  return (
    <div className="space-y-6 mb-6">
        
        {/* ROW 1: Main Stats */}
        <div>
            <h3 className="text-base font-medium text-gray-600 mb-2">Performance Summary</h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {mainStats.map((c) => (
                <div key={c.key} className="bg-white rounded-lg shadow-sm p-4 sm:p-5 border border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="rounded-md p-2 bg-gray-50">{c.icon}</div>
                        <div className="min-w-0">
                            <p className="text-[11px] sm:text-xs font-medium text-gray-500 truncate">{c.label}</p>
                            <p className={`mt-1 text-xl sm:text-2xl font-semibold ${c.tone}`}>{c.value}</p>
                        </div>
                    </div>
                </div>
            ))}
            </div>
        </div>

        {/* ROW 2: Owing Stats */}
        <div>
            <h3 className="text-base font-medium text-gray-600 mb-2">Outstanding / Debts</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            {owingStats.map((c) => (
                <div key={c.key} className="bg-white rounded-lg shadow-sm p-4 sm:p-5 border border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="rounded-md p-2 bg-orange-50">{c.icon}</div>
                        <div className="min-w-0">
                            <p className="text-[11px] sm:text-xs font-medium text-gray-500 truncate">{c.label}</p>
                            <p className={`mt-1 text-xl sm:text-2xl font-semibold ${c.tone}`}>{c.value}</p>
                        </div>
                    </div>
                </div>
            ))}
            </div>
        </div>

        {/* ROW 3: Account Balances */}
        <div>
            <div className="flex flex-col sm:flex-row justify-between items-end mb-2 gap-2">
                <h3 className="text-base font-medium text-gray-600">Filtered Account Balances</h3>
                
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    {/* Account Search Input */}
                    <div className="relative flex-grow sm:flex-grow-0">
                        <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                            <Search className="h-4 w-4 text-gray-400" />
                        </div>
                        <input
                            type="text"
                            placeholder="Search accounts..."
                            value={accountSearch}
                            onChange={(e) => setAccountSearch(e.target.value)}
                            className="block w-full sm:w-48 pl-8 pr-3 py-1 text-sm border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                    </div>

                    {/* Show More/Less Button */}
                    {filteredAccountCards.length > VISIBLE_LIMIT && (
                        <button 
                            onClick={() => setShowAllAccounts(!showAllAccounts)}
                            className="text-xs text-indigo-600 font-medium hover:text-indigo-800 flex items-center whitespace-nowrap"
                        >
                            {showAllAccounts ? 'Show Less' : `Show All (${filteredAccountCards.length})`}
                            {showAllAccounts ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />}
                        </button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
            {displayedAccountCards.map((c) => (
                <div key={c.key} className="bg-white rounded-lg shadow-sm p-4 sm:p-5 border border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="rounded-md p-2 bg-indigo-50">{c.icon}</div>
                        <div className="min-w-0">
                            <p className="text-[11px] sm:text-xs font-medium text-gray-500 truncate">{c.label}</p>
                            <p className={`mt-1 text-xl sm:text-2xl font-semibold ${c.tone}`}>{c.value}</p>
                        </div>
                    </div>
                </div>
            ))}
            
            {accounts.length > 0 && filteredAccountCards.length === 0 && (
                <p className="text-sm text-gray-500 col-span-full py-4 text-center">
                    {accountSearch ? 'No accounts match your search.' : 'All account balances are zero or no transactions found.'}
                </p>
            )}
            {accounts.length === 0 && <p className="text-sm text-gray-500 col-span-full">Loading accounts...</p>}
            </div>
        </div>
    </div>
  );
};

export default FinancialSummary;