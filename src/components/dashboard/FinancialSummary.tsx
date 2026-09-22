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
    // Unified container with signature dark navy palette and dividers
    <div className="bg-[#16192B] rounded-2xl border border-[#2B314E] shadow-xl overflow-hidden flex flex-col sm:flex-row sm:divide-x divide-y sm:divide-y-0 divide-[#2B314E]">
      
      {/* Total Income */}
      <div className="flex-1 p-5 flex items-center hover:bg-slate-900/40 transition-colors">
        <div className="rounded-xl p-3 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 shadow-xs">
          <TrendingUp className="w-5 h-5" />
        </div>
        <div className="ml-4">
          <p className="text-xs font-bold text-emerald-300 uppercase tracking-wider">Total Income</p>
          <p className="text-2xl font-black font-mono text-emerald-400 mt-0.5">
            {formatCurrency(summary.totalIncome)}
          </p>
        </div>
      </div>

      {/* Total Expenses */}
      <div className="flex-1 p-5 flex items-center hover:bg-slate-900/40 transition-colors">
        <div className="rounded-xl p-3 bg-rose-500/15 border border-rose-500/30 text-rose-400 shadow-xs">
          <TrendingDown className="w-5 h-5" />
        </div>
        <div className="ml-4">
          <p className="text-xs font-bold text-rose-300 uppercase tracking-wider">Total Expenses</p>
          <p className="text-2xl font-black font-mono text-rose-400 mt-0.5">
            {formatCurrency(summary.totalExpenses)}
          </p>
        </div>
      </div>

      {/* Net Income */}
      <div className="flex-1 p-5 flex items-center hover:bg-slate-900/40 transition-colors">
        <div className="rounded-xl p-3 bg-blue-500/15 border border-blue-500/30 text-blue-400 shadow-xs">
          <DollarSign className="w-5 h-5" />
        </div>
        <div className="ml-4">
          <p className="text-xs font-bold text-blue-300 uppercase tracking-wider">Net Income</p>
          <p className={`text-2xl font-black font-mono mt-0.5 ${summary.netIncome >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {formatCurrency(summary.netIncome)}
          </p>
        </div>
      </div>

      {/* Profit Margin */}
      <div className="flex-1 p-5 flex items-center hover:bg-slate-900/40 transition-colors">
        <div className="rounded-xl p-3 bg-purple-500/15 border border-purple-500/30 text-purple-400 shadow-xs">
          <Percent className="w-5 h-5" />
        </div>
        <div className="ml-4">
          <p className="text-xs font-bold text-purple-300 uppercase tracking-wider">Profit Margin</p>
          <p className={`text-2xl font-black font-mono mt-0.5 ${summary.profitMargin >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {formatPercentage(summary.profitMargin)}
          </p>
        </div>
      </div>

    </div>
  );
};

export default FinancialSummary;