import React from 'react';
import { Account } from '../../types/finance';
import { useFormattedDisplay } from '../../hooks/useFormattedDisplay';
import { Wallet } from 'lucide-react';

interface AccountBalanceCardsProps {
  accounts: Account[];
}

const AccountBalanceCards: React.FC<AccountBalanceCardsProps> = ({ accounts }) => {
  const { formatCurrency } = useFormattedDisplay();

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      {accounts.map((account) => (
        <div key={account.id} className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <Wallet className="h-8 w-8 text-primary" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">{account.name}</p>
              <p className="text-2xl font-semibold text-gray-900">
                {formatCurrency(account.balance)}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default AccountBalanceCards;