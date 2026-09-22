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
    { key: 'income', label: 'Income (Gross)', value: formatCurrency(totalIncome), tone: 'text-slate-900', icon: <TrendingUp className="w-5 h-5 text-emerald-600" />, iconBg: 'bg-emerald-50 border-emerald-200 text-emerald-600', subtext: `Net: ${formatCurrency(totalIncomeNet)} | VAT: ${formatCurrency(totalIncomeVat)}` },
    { key: 'expenses', label: 'Expenses (Gross)', value: formatCurrency(totalExpenses), tone: 'text-slate-900', icon: <TrendingDown className="w-5 h-5 text-rose-600" />, iconBg: 'bg-rose-50 border-rose-200 text-rose-600', subtext: `Net: ${formatCurrency(totalExpenseNet)} | VAT: ${formatCurrency(totalExpenseVat)}` },
    { key: 'net', label: 'Net Profit (Gross)', value: formatCurrency(netIncome), tone: netIncome >= 0 ? 'text-emerald-600' : 'text-rose-600', icon: <DollarSign className="w-5 h-5 text-blue-600" />, iconBg: 'bg-blue-50 border-blue-200 text-blue-600', subtext: `Net Profit (Ex. VAT): ${formatCurrency(netIncomeNet)}` },
    { key: 'vat_liability', label: 'VAT Liability', value: formatCurrency(totalVatLiability), tone: totalVatLiability > 0 ? 'text-amber-600' : 'text-emerald-600', icon: <FileText className="w-5 h-5 text-amber-600" />, iconBg: 'bg-amber-50 border-amber-200 text-amber-600', subtext: `Collected: ${formatCurrency(totalIncomeVat)} | Paid: ${formatCurrency(totalExpenseVat)}` },
  ];

  const owingStats = [
    { key: 'owing_owners', label: 'Owing from Owners', value: formatCurrency(totalOwingFromOwners), tone: 'text-[#DC2626]', icon: <Wallet className="w-5 h-5 text-[#DC2626]" />, iconBg: 'bg-rose-50 border-rose-200 text-[#DC2626]' },
    { key: 'owing_accounts', label: 'Owing from Accounts', value: formatCurrency(totalOwingFromAccounts), tone: 'text-[#DC2626]', icon: <AlertCircle className="w-5 h-5 text-[#DC2626]" />, iconBg: 'bg-rose-50 border-rose-200 text-[#DC2626]' },
  ];

  const allAccountCards = accountBalances.map(acc => ({
      key: acc.id,
      label: `${acc.name}`,
      value: formatCurrency(acc.balance),
      tone: acc.balance > 0 ? 'text-emerald-600' : acc.balance < 0 ? 'text-rose-600' : 'text-slate-600',
      icon: <Banknote className={`w-5 h-5 ${acc.balance < 0 ? 'text-rose-600' : 'text-indigo-600'}`} />,
      iconBg: acc.balance < 0 ? 'bg-rose-50 border-rose-200 text-rose-600' : 'bg-indigo-50 border-indigo-200 text-indigo-600'
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
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Performance Summary</h3>
            </div>
            
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {mainStats.map((c) => (
                <div key={c.key} className="bg-white rounded-2xl shadow-xs p-4 sm:p-5 border border-slate-200 hover:border-slate-300 text-slate-900 flex flex-col justify-between transition-all">
                    <div className="flex items-center justify-between">
                        <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider truncate">{c.label}</p>
                            <p className={`mt-1 text-xl sm:text-2xl font-black font-mono tracking-tight ${c.tone}`}>{c.value}</p>
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

        {/* ROW 2: Owing Stats (Toggleable) */}
        <div>
            <div 
                className="flex items-center justify-between cursor-pointer mb-2 hover:bg-slate-100 p-2 rounded-xl transition-colors"
                onClick={() => setShowDebts(!showDebts)}
            >
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Outstanding / Debts</h3>
                {showDebts ? <ChevronUp className="w-5 h-5 text-slate-500" /> : <ChevronDown className="w-5 h-5 text-slate-500" />}
            </div>

            {showDebts && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                {owingStats.map((c) => (
                    <div key={c.key} className="bg-white rounded-2xl shadow-xs p-4 sm:p-5 border border-slate-200 hover:border-slate-300 text-slate-900 flex items-center justify-between transition-all">
                        <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider truncate">{c.label}</p>
                            <p className={`mt-1 text-xl sm:text-2xl font-black font-mono tracking-tight ${c.tone}`}>{c.value}</p>
                        </div>
                        <div className={`p-2.5 rounded-xl border shadow-xs ${c.iconBg}`}>{c.icon}</div>
                    </div>
                ))}
                </div>
            )}
        </div>

        {/* ROW 3: Account Balances (Toggleable) */}
        <div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-2 gap-2">
                <div 
                    className="flex items-center cursor-pointer hover:bg-slate-100 p-2 rounded-xl transition-colors w-full sm:w-auto"
                    onClick={() => setShowBalances(!showBalances)}
                >
                    <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mr-2">Filtered Account Balances</h3>
                    {showBalances ? <ChevronUp className="w-5 h-5 text-slate-500" /> : <ChevronDown className="w-5 h-5 text-slate-500" />}
                </div>
                
                {showBalances && (
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
                        {filteredAccountCards.length > VISIBLE_LIMIT && (
                            <button 
                                onClick={() => setShowAllAccounts(!showAllAccounts)}
                                className="text-xs text-blue-600 font-semibold hover:text-blue-700 flex items-center whitespace-nowrap cursor-pointer"
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
                    <div key={c.key} className="bg-white rounded-2xl shadow-xs p-4 sm:p-5 border border-slate-200 hover:border-slate-300 text-slate-900 flex items-center justify-between transition-all">
                        <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider truncate">{c.label}</p>
                            <p className={`mt-1 text-xl sm:text-2xl font-black font-mono tracking-tight ${c.tone}`}>{c.value}</p>
                        </div>
                        <div className={`p-2.5 rounded-xl border shadow-xs ${c.iconBg}`}>{c.icon}</div>
                    </div>
                ))}
                
                {accounts.length > 0 && filteredAccountCards.length === 0 && (
                    <p className="text-sm text-slate-500 col-span-full py-4 text-center">
                        {accountSearch ? 'No accounts match your search.' : 'All account balances are zero or no transactions found.'}
                    </p>
                )}
                {accounts.length === 0 && <p className="text-sm text-slate-500 col-span-full">Loading accounts...</p>}
                </div>
            )}
        </div>
    </div>
  );
};

export default FinancialSummary;