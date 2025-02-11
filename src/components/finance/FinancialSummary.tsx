import React from 'react';
import { Transaction } from '../types';
import { DollarSign, TrendingUp, TrendingDown, Percent } from 'lucide-react';

interface FinancialSummaryProps {
  transactions: Transaction[];
  period: 'week' | 'month' | 'year';
}

const FinancialSummary: React.FC<FinancialSummaryProps> = ({ transactions, period }) => {
  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpenses = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const netIncome = totalIncome - totalExpenses;
  const profitMargin = totalIncome > 0 ? (netIncome / totalIncome) * 100 : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="flex items-center">
          <TrendingUp className="w-8 h-8 text-secondary" />
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-500">Total Income</p>
            <p className="text-2xl font-semibold text-gray-900">
              £{totalIncome.toFixed(2)}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="flex items-center">
          <TrendingDown className="w-8 h-8 text-primary" />
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-500">Total Expenses</p>
            <p className="text-2xl font-semibold text-gray-900">
              £{totalExpenses.toFixed(2)}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="flex items-center">
          <DollarSign className="w-8 h-8 text-blue-500" />
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-500">Net Income</p>
            <p className="text-2xl font-semibold text-gray-900">
              £{netIncome.toFixed(2)}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="flex items-center">
          <Percent className="w-8 h-8 text-purple-500" />
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-500">Profit Margin</p>
            <p className="text-2xl font-semibold text-gray-900">
              {profitMargin.toFixed(1)}%
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FinancialSummary;