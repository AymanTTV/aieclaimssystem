// src/components/finance/FinancialSummary.tsx
import React, { useMemo, useState } from 'react';
import { DollarSign, TrendingUp, TrendingDown, Percent, Wallet, Banknote, ChevronDown, ChevronUp, AlertCircle, Search, FileText } from 'lucide-react';
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
  profitMargin,
  totalOwingFromOwners,
  totalOwingFromAccounts,
  accounts = [],
  transactions = [], 
}) => {
  const { formatCurrency, formatPercentage } = useFormattedDisplay();
  const { can } = usePermissions();
  
  // Toggle states for the sections - Performance is now permanently open
  const [showDebts, setShowDebts] = useState(false);
  const [showBalances, setShowBalances] = useState(false);

  const [showAllAccounts, setShowAllAccounts] = useState(false);
  const [accountSearch, setAccountSearch] = useState('');

  // Calculates balances based on CURRENT filtered view
  const accountBalances = useMemo(() => {
    if (!accounts || accounts.length === 0) return [];

    const balances = new Map<string, number>();
    const accountNames = new Map<string, string>();

    accounts.forEach(acc => {
        balances.set(acc.id, 0);
        accountNames.set(acc.id, acc.name);
    });

    transactions.forEach(txn => {
        const fullAmount = Number(txn.amount) || 0;
        
        if (txn.type === 'income') {
            if (txn.accountsTo && txn.accountsTo.length > 0) {
                txn.accountsTo.forEach(accId => {
                    if (balances.has(accId)) {
                        balances.set(accId, (balances.get(accId) || 0) + fullAmount);
                    }
                });
            } else {
                const defaultAccount = accounts.find(a => a.name === 'AIE SKYLINE ACCOUNT' || a.name === 'AIE Skyline Limited');
                if (defaultAccount && balances.has(defaultAccount.id)) {
                     balances.set(defaultAccount.id, (balances.get(defaultAccount.id) || 0) + fullAmount);
                }
            }
        } 
        else if (txn.type === 'expense') {
            if (txn.accountsFrom && txn.accountsFrom.length > 0) {
                 txn.accountsFrom.forEach(accId => {
                    if (balances.has(accId)) {
                        balances.set(accId, (balances.get(accId) || 0) - fullAmount);
                    }
                });
            } else {
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

    const negatives = unsorted.filter(a => a.balance < 0).sort((a, b) => a.balance - b.balance); 
    const positives = unsorted.filter(a => a.balance > 0).sort((a, b) => b.balance - a.balance);
    const zeros = unsorted.filter(a => a.balance === 0);

    return [...negatives, ...positives, ...zeros];
  }, [accounts, transactions]); 

  if (!can('finance', 'cards')) return null;

  const netTone = netIncome > 0 ? 'text-green-600' : netIncome < 0 ? 'text-red-600' : 'text-gray-700';

  const mainStats = [
    { key: 'income', label: 'Income (Gross)', value: formatCurrency(totalIncome), tone: 'text-gray-900', icon: <TrendingUp className="w-6 h-6 sm:w-7 sm:h-7 text-green-500" />, subtext: `Net: ${formatCurrency(totalIncomeNet)} | VAT: ${formatCurrency(totalIncomeVat)}` },
    { key: 'expenses', label: 'Expenses (Gross)', value: formatCurrency(totalExpenses), tone: 'text-gray-900', icon: <TrendingDown className="w-6 h-6 sm:w-7 sm:h-7 text-red-500" />, subtext: `Net: ${formatCurrency(totalExpenseNet)} | VAT: ${formatCurrency(totalExpenseVat)}` },
    { key: 'net', label: 'Net Profit (Gross)', value: formatCurrency(netIncome), tone: netTone, icon: <DollarSign className="w-6 h-6 sm:w-7 sm:h-7 text-blue-500" />, subtext: `Net Profit (Ex. VAT): ${formatCurrency(netIncomeNet)}` },
    { key: 'vat_liability', label: 'VAT Liability', value: formatCurrency(totalVatLiability), tone: totalVatLiability > 0 ? 'text-orange-600' : 'text-green-600', icon: <FileText className="w-6 h-6 sm:w-7 sm:h-7 text-orange-500" />, subtext: `Collected: ${formatCurrency(totalIncomeVat)} | Paid: ${formatCurrency(totalExpenseVat)}` },
  ];

  const owingStats = [
    { key: 'owing_owners', label: 'Owing from Owners', value: formatCurrency(totalOwingFromOwners), tone: 'text-orange-600', icon: <Wallet className="w-6 h-6 sm:w-7 sm:h-7 text-orange-500" /> },
    { key: 'owing_accounts', label: 'Owing from Accounts', value: formatCurrency(totalOwingFromAccounts), tone: 'text-red-600', icon: <AlertCircle className="w-6 h-6 sm:w-7 sm:h-7 text-red-500" /> },
  ];

  const allAccountCards = accountBalances.map(acc => ({
      key: acc.id,
      label: `${acc.name}`,
      value: formatCurrency(acc.balance),
      tone: acc.balance > 0 ? 'text-green-700' : acc.balance < 0 ? 'text-red-700' : 'text-gray-500',
      icon: <Banknote className={`w-6 h-6 sm:w-7 sm:h-7 ${acc.balance < 0 ? 'text-red-500' : 'text-indigo-500'}`} />
  }));

  const filteredAccountCards = allAccountCards.filter(card => {
    const searchLower = accountSearch.trim().toLowerCase();
    if (searchLower) return card.label.toLowerCase().includes(searchLower);
    return card.label.trim().toLowerCase().startsWith('aie');
  });

  const VISIBLE_LIMIT = 8;
  const displayedAccountCards = showAllAccounts ? filteredAccountCards : filteredAccountCards.slice(0, VISIBLE_LIMIT);

  return (
    <div className="space-y-6 mb-6">
        
        {/* ROW 1: Main Stats (Permanently Open) */}
        <div>
            <div className="mb-2 p-1">
                <h3 className="text-base font-medium text-gray-600">Performance Summary</h3>
            </div>
            
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {mainStats.map((c) => (
                <div key={c.key} className="bg-white rounded-lg shadow-sm p-4 sm:p-5 border border-gray-100 flex flex-col justify-between">
                    <div className="flex items-center gap-3">
                        <div className="rounded-md p-2 bg-gray-50">{c.icon}</div>
                        <div className="min-w-0">
                            <p className="text-[11px] sm:text-xs font-medium text-gray-500 truncate">{c.label}</p>
                            <p className={`mt-1 text-xl sm:text-2xl font-semibold ${c.tone}`}>{c.value}</p>
                        </div>
                    </div>
                    {c.subtext && (
                        <div className="mt-3 pt-2 border-t border-gray-100 text-[10px] sm:text-xs text-gray-500 font-medium whitespace-nowrap">
                            {c.subtext}
                        </div>
                    )}
                </div>
            ))}
            </div>
        </div>

        {/* ROW 2: Owing Stats (Toggleable) */}
        <div>
            <div 
                className="flex items-center justify-between cursor-pointer mb-2 hover:bg-gray-50 p-1 rounded transition-colors"
                onClick={() => setShowDebts(!showDebts)}
            >
                <h3 className="text-base font-medium text-gray-600">Outstanding / Debts</h3>
                {showDebts ? <ChevronUp className="w-5 h-5 text-gray-500" /> : <ChevronDown className="w-5 h-5 text-gray-500" />}
            </div>

            {showDebts && (
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
            )}
        </div>

        {/* ROW 3: Account Balances (Toggleable) */}
        <div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-2 gap-2">
                <div 
                    className="flex items-center cursor-pointer hover:bg-gray-50 p-1 rounded transition-colors w-full sm:w-auto"
                    onClick={() => setShowBalances(!showBalances)}
                >
                    <h3 className="text-base font-medium text-gray-600 mr-2">Filtered Account Balances</h3>
                    {showBalances ? <ChevronUp className="w-5 h-5 text-gray-500" /> : <ChevronDown className="w-5 h-5 text-gray-500" />}
                </div>
                
                {showBalances && (
                    <div className="flex items-center gap-2 w-full sm:w-auto mt-2 sm:mt-0">
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
                )}
            </div>

            {showBalances && (
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
            )}
        </div>
    </div>
  );
};

export default FinancialSummary;