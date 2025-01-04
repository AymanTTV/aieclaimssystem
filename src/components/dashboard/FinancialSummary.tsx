import React, { useMemo } from 'react';
import { Transaction } from '../../types';
import { DollarSign, TrendingUp, TrendingDown, Percent } from 'lucide-react';
import { startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';

interface FinancialSummaryProps {
  transactions: Transaction[];
  period: 'month';
}

const FinancialSummary: React.FC<FinancialSummaryProps> = ({ transactions, period }) => {
  const summary = useMemo(() => {
    const now = new Date();
    const periodStart = startOfMonth(now);
    const periodEnd = endOfMonth(now);

    const periodTransactions = transactions.filter(t => 
      isWithinInterval(t.date, { start: periodStart, end: periodEnd })
    );

    const totalIncome = periodTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalExpenses = periodTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    const netIncome = totalIncome - totalExpenses;
    const profitMargin = totalIncome > 0 ? (netIncome / totalIncome) * 100 : 0;

    return {
      totalIncome,
      totalExpenses,
      netIncome,
      profitMargin
    };
  }, [transactions, period]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total Income */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="flex items-center">
          <div className="rounded-full p-3 bg-green-100">
            <TrendingUp className="w-6 h-6 text-green-600" />
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-500">Total Income</p>
            <p className="text-2xl font-semibold text-gray-900">
              £{summary.totalIncome.toFixed(2)}
            </p>
          </div>
        </div>
      </div>

      {/* Total Expenses */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="flex items-center">
          <div className="rounded-full p-3 bg-red-100">
            <TrendingDown className="w-6 h-6 text-red-600" />
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-500">Total Expenses</p>
            <p className="text-2xl font-semibold text-gray-900">
              £{summary.totalExpenses.toFixed(2)}
            </p>
          </div>
        </div>
      </div>

      {/* Net Income */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="flex items-center">
          <div className="rounded-full p-3 bg-blue-100">
            <DollarSign className="w-6 h-6 text-blue-600" />
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-500">Net Income</p>
            <p className={`text-2xl font-semibold ${
              summary.netIncome >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              £{summary.netIncome.toFixed(2)}
            </p>
          </div>
        </div>
      </div>

      {/* Profit Margin */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="flex items-center">
          <div className="rounded-full p-3 bg-purple-100">
            <Percent className="w-6 h-6 text-purple-600" />
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-500">Profit Margin</p>
            <p className={`text-2xl font-semibold ${
              summary.profitMargin >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {summary.profitMargin.toFixed(1)}%
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FinancialSummary;