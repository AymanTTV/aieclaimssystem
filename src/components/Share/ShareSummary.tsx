import React from 'react';
import { useFormattedDisplay } from '../../hooks/useFormattedDisplay';

interface ShareSummaryProps {
  net: number;
  expenses: number;
  profit: number;
}

const ShareSummary: React.FC<ShareSummaryProps> = ({ net, expenses, profit }) => {
  const { formatCurrency } = useFormattedDisplay();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-sm font-medium text-gray-500">Total Net</h3>
        <p className="mt-2 text-3xl font-semibold text-gray-900">
          {formatCurrency(net)}
        </p>
      </div>
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-sm font-medium text-gray-500">Expenses</h3>
        <p className="mt-2 text-3xl font-semibold text-red-600">
          {formatCurrency(expenses)}
        </p>
      </div>
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-sm font-medium text-gray-500">Profit</h3>
        <p className="mt-2 text-3xl font-semibold text-emerald-600">
          {formatCurrency(profit)}
        </p>
      </div>
    </div>
  );
};

export default ShareSummary;
