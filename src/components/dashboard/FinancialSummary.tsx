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

    const periodTransactions = transactions.filter(t => {
      if (!t.date) return false;
      const d = t.date instanceof Date ? t.date : new Date(t.date);
      if (isNaN(d.getTime())) return false;
      return isWithinInterval(d, { start: periodStart, end: periodEnd });
    });

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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total Income */}
      <div
        className="bg-[#ECFDF5] border-[#A7F3D0] rounded-2xl p-5 shadow-xs flex items-center transition-all"
        style={{ borderWidth: '1.5px', borderStyle: 'solid' }}
      >
        <div className="rounded-xl p-3 bg-white border border-[#A7F3D0] text-[#059669] shadow-xs">
          <TrendingUp className="w-5 h-5" />
        </div>
        <div className="ml-4">
          <p className="text-xs font-bold text-[#059669] uppercase tracking-wider">Total Income</p>
          <p className="text-2xl font-black font-mono text-[#059669] mt-0.5">
            {formatCurrency(summary.totalIncome)}
          </p>
        </div>
      </div>

      {/* Total Expenses */}
      <div
        className="bg-[#FEF2F2] border-[#FECACA] rounded-2xl p-5 shadow-xs flex items-center transition-all"
        style={{ borderWidth: '1.5px', borderStyle: 'solid' }}
      >
        <div className="rounded-xl p-3 bg-white border border-[#FECACA] text-[#DC2626] shadow-xs">
          <TrendingDown className="w-5 h-5" />
        </div>
        <div className="ml-4">
          <p className="text-xs font-bold text-[#DC2626] uppercase tracking-wider">Total Expenses</p>
          <p className="text-2xl font-black font-mono text-[#DC2626] mt-0.5">
            {formatCurrency(summary.totalExpenses)}
          </p>
        </div>
      </div>

      {/* Net Income */}
      <div
        className="bg-[#F0F9FF] border-[#BAE6FD] rounded-2xl p-5 shadow-xs flex items-center transition-all"
        style={{ borderWidth: '1.5px', borderStyle: 'solid' }}
      >
        <div className="rounded-xl p-3 bg-white border border-[#BAE6FD] text-[#0284C7] shadow-xs">
          <DollarSign className="w-5 h-5" />
        </div>
        <div className="ml-4">
          <p className="text-xs font-bold text-[#0284C7] uppercase tracking-wider">Net Income</p>
          <p className={`text-2xl font-black font-mono mt-0.5 ${summary.netIncome >= 0 ? 'text-[#059669]' : 'text-[#DC2626]'}`}>
            {formatCurrency(summary.netIncome)}
          </p>
        </div>
      </div>

      {/* Profit Margin */}
      <div
        className="bg-[#FFFBEB] border-[#FDE68A] rounded-2xl p-5 shadow-xs flex items-center transition-all"
        style={{ borderWidth: '1.5px', borderStyle: 'solid' }}
      >
        <div className="rounded-xl p-3 bg-white border border-[#FDE68A] text-[#D97706] shadow-xs">
          <Percent className="w-5 h-5" />
        </div>
        <div className="ml-4">
          <p className="text-xs font-bold text-[#D97706] uppercase tracking-wider">Profit Margin</p>
          <p className={`text-2xl font-black font-mono mt-0.5 ${summary.profitMargin >= 0 ? 'text-[#059669]' : 'text-[#DC2626]'}`}>
            {formatPercentage(summary.profitMargin)}
          </p>
        </div>
      </div>
    </div>
  );
};

export default FinancialSummary;