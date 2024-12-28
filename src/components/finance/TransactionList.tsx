import React from 'react';
import { Transaction } from '../types';
import { format } from 'date-fns';
import { DollarSign } from 'lucide-react';

interface TransactionListProps {
  transactions: Transaction[];
  title: string;
}

const TransactionList: React.FC<TransactionListProps> = ({ transactions, title }) => {
  return (
    <div className="bg-white rounded-lg shadow-md">
      <div className="px-4 py-5 sm:px-6">
        <h3 className="text-lg font-medium text-gray-900">{title}</h3>
      </div>
      <div className="border-t border-gray-200">
        <ul className="divide-y divide-gray-200">
          {transactions.map(transaction => (
            <li key={transaction.id} className="px-4 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {transaction.category}
                  </p>
                  <p className="text-sm text-gray-500">{transaction.description}</p>
                  <p className="text-xs text-gray-400">
                    {format(transaction.date, 'MMM dd, yyyy')}
                  </p>
                </div>
                <div className={`flex items-center ${
                  transaction.type === 'income' ? 'text-secondary' : 'text-primary'
                }`}>
                  <DollarSign className="w-4 h-4 mr-1" />
                  <span className="text-lg font-semibold">
                    {transaction.amount.toFixed(2)}
                  </span>
                </div>
              </div>
            </li>
          ))}
          {transactions.length === 0 && (
            <li className="px-4 py-8 text-center text-gray-500">
              No transactions found
            </li>
          )}
        </ul>
      </div>
    </div>
  );
};

export default TransactionList;