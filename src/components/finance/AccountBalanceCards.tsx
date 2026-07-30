// src/components/finance/AccountBalanceCards.tsx
import React, { useState, useMemo } from 'react';
import { Account } from '../../types/finance';
import { useFormattedDisplay } from '../../hooks/useFormattedDisplay';
import { Wallet, Search, ChevronDown, ChevronUp } from 'lucide-react';

interface AccountBalanceCardsProps {
  accounts: Account[];
}

const AccountBalanceCards: React.FC<AccountBalanceCardsProps> = ({ accounts }) => {
  const { formatCurrency } = useFormattedDisplay();
  const [searchTerm, setSearchTerm] = useState('');
  const [showAll, setShowAll] = useState(false);

  // Filter and sort the accounts
  const filteredAccounts = useMemo(() => {
    const filtered = accounts.filter(acc => {
      const searchLower = searchTerm.trim().toLowerCase();
      
      if (searchLower) {
        return acc.name.toLowerCase().includes(searchLower);
      }
      
      return acc.name.trim().toLowerCase().startsWith('aie');
    });
    
    // Sort: Negative balances first, then highest positive balances, then zeros
    const negatives = filtered.filter(a => (a.balance || 0) < 0).sort((a, b) => (a.balance || 0) - (b.balance || 0));
    const positives = filtered.filter(a => (a.balance || 0) > 0).sort((a, b) => (b.balance || 0) - (a.balance || 0));
    const zeros = filtered.filter(a => (a.balance || 0) === 0);

    return [...negatives, ...positives, ...zeros];
  }, [accounts, searchTerm]);

  // Handle visibility limit
  const VISIBLE_LIMIT = 8;
  const displayedAccounts = showAll ? filteredAccounts : filteredAccounts.slice(0, VISIBLE_LIMIT);

  return (
    <div className="space-y-3 mb-6">
      {/* Header, Search, and Toggle */}
      <div className="flex flex-col sm:flex-row justify-between items-end mb-2 gap-2">
        <h3 className="text-base font-medium text-gray-600">Account Balances</h3>
        
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Account Search Input */}
          <div className="relative flex-grow sm:flex-grow-0">
            <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search accounts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full sm:w-48 pl-8 pr-3 py-1 text-sm border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
            />
          </div>

          {/* Show More/Less Button */}
          {filteredAccounts.length > VISIBLE_LIMIT && (
            <button 
              onClick={() => setShowAll(!showAll)}
              className="text-xs text-indigo-600 font-medium hover:text-indigo-800 flex items-center whitespace-nowrap transition-colors"
            >
              {showAll ? 'Show Less' : `Show All (${filteredAccounts.length})`}
              {showAll ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />}
            </button>
          )}
        </div>
      </div>

      {/* Grid of Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
        {displayedAccounts.map((account) => {
          const bal = account.balance || 0;
          const textTone = bal > 0 ? 'text-green-700' : bal < 0 ? 'text-red-700' : 'text-gray-500';
          const iconTone = bal < 0 ? 'text-red-500' : 'text-indigo-500';
          
          return (
            <div key={account.id} className="bg-white rounded-lg shadow-sm p-4 sm:p-5 border border-gray-100 flex flex-col justify-between hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3">
                <div className="rounded-md p-2 bg-indigo-50">
                  <Wallet className={`w-6 h-6 sm:w-7 sm:h-7 ${iconTone}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] sm:text-xs font-medium text-gray-500 truncate" title={account.name}>
                    {account.name}
                  </p>
                  <p className={`mt-1 text-xl sm:text-2xl font-semibold ${textTone}`}>
                    {formatCurrency(bal)}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
        
        {accounts.length > 0 && filteredAccounts.length === 0 && (
          <p className="text-sm text-gray-500 col-span-full py-4 text-center">
            No accounts match your search.
          </p>
        )}
        {accounts.length === 0 && (
          <p className="text-sm text-gray-500 col-span-full py-4 text-center">
            Loading accounts...
          </p>
        )}
      </div>
    </div>
  );
};

export default AccountBalanceCards;