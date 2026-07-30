import React, { useMemo } from 'react';
import { Transaction } from '../../types';
import { DollarSign, TrendingUp, TrendingDown, Percent } from 'lucide-react';
import { startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { useFormattedDisplay } from '../../hooks/useFormattedDisplay';

interface FinancialSummaryProps {
  transactions: Transaction[];
  period: 'month';
}

const FinancialSummary: React.FC<FinancialSummaryProps> = ({ transactions, period }) => {
  const { formatCurrency, formatPercentage } = useFormattedDisplay();

  const summary = useMemo(() => {
    const now = new Date();
    const periodStart = startOfMonth(now);
    const periodEnd = endOfMonth(now);

    const periodTransactions = transactions.filter(t =>
      isWithinInterval(t.date, { start: periodStart, end: periodEnd })
    );

    const totalIncome = periodTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    const totalExpenses = periodTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    const netIncome = totalIncome - totalExpenses;
    const profitMargin = totalIncome > 0 ? (netIncome / totalIncome) * 100 : 0;

    return { totalIncome, totalExpenses, netIncome, profitMargin };
  }, [transactions, period]);

  return (
    // Unified container with dividers instead of separate cards
    <div className="flex flex-col sm:flex-row sm:divide-x divide-y sm:divide-y-0 divide-gray-100">
      
      {/* Total Income */}
      <div className="flex-1 p-4 flex items-center">
        <div className="rounded-full p-3 bg-green-50 text-green-600">
          <TrendingUp className="w-5 h-5" />
        </div>
        <div className="ml-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Income</p>
          <p className="text-xl font-bold text-gray-900">
            {formatCurrency(summary.totalIncome)}
          </p>
        </div>
      </div>

      {/* Total Expenses */}
      <div className="flex-1 p-4 flex items-center">
        <div className="rounded-full p-3 bg-red-50 text-red-600">
          <TrendingDown className="w-5 h-5" />
        </div>
        <div className="ml-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Expenses</p>
          <p className="text-xl font-bold text-gray-900">
            {formatCurrency(summary.totalExpenses)}
          </p>
        </div>
      </div>

      {/* Net Income */}
      <div className="flex-1 p-4 flex items-center">
        <div className="rounded-full p-3 bg-blue-50 text-blue-600">
          <DollarSign className="w-5 h-5" />
        </div>
        <div className="ml-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Net Income</p>
          <p className={`text-xl font-bold ${summary.netIncome >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatCurrency(summary.netIncome)}
          </p>
        </div>
      </div>

      {/* Profit Margin */}
      <div className="flex-1 p-4 flex items-center">
        <div className="rounded-full p-3 bg-purple-50 text-purple-600">
          <Percent className="w-5 h-5" />
        </div>
        <div className="ml-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Profit Margin</p>
          <p className={`text-xl font-bold ${summary.profitMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatPercentage(summary.profitMargin)}
          </p>
        </div>
      </div>

    </div>
  );
};

export default FinancialSummary;