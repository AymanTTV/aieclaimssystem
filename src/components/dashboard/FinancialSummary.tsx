import React, { useMemo } from 'react';
import { Transaction, MaintenanceLog, Invoice } from '../../types';
import { DollarSign, TrendingUp, TrendingDown, Percent, Building2 } from 'lucide-react';
import { startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { useFormattedDisplay } from '../../hooks/useFormattedDisplay';

interface FinancialSummaryProps {
  transactions: Transaction[];
  maintenanceLogs?: MaintenanceLog[];
  invoices?: Invoice[];
  period?: 'month' | 'all';
}

const FinancialSummary: React.FC<FinancialSummaryProps> = ({
  transactions = [],
  maintenanceLogs = [],
  invoices = [],
  period = 'month',
}) => {
  const { formatCurrency, formatPercentage } = useFormattedDisplay();

  const summary = useMemo(() => {
    const now = new Date();
    const periodStart = startOfMonth(now);
    const periodEnd = endOfMonth(now);

    const isInPeriod = (dateVal: any) => {
      if (!dateVal) return false;
      if (period === 'all') return true;
      const d = dateVal instanceof Date ? dateVal : new Date(dateVal);
      if (isNaN(d.getTime())) return false;
      return isWithinInterval(d, { start: periodStart, end: periodEnd });
    };

    // 1. Transactions in period (or all)
    const periodTransactions = transactions.filter((t) => isInPeriod(t.date));

    let totalRevenue = periodTransactions
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    let totalSubcontractorExpenses = periodTransactions.reduce(
      (sum, t) => sum + (Number(t.subcontractorCost) || 0),
      0
    );

    // 2. Add maintenance subcontractor costs & billed
    (maintenanceLogs || []).forEach((log) => {
      if (isInPeriod(log.date)) {
        if (log.subcontractorCost && Number(log.subcontractorCost) > 0) {
          totalSubcontractorExpenses += Number(log.subcontractorCost);
        }
        // If customerBilled is recorded separately and not in transactions
        if (log.customerBilled && Number(log.customerBilled) > 0 && periodTransactions.length === 0) {
          totalRevenue += Number(log.customerBilled);
        }
      }
    });

    // 3. Add invoice subcontractor costs
    (invoices || []).forEach((inv) => {
      if (isInPeriod(inv.date)) {
        if (inv.subcontractorCost && Number(inv.subcontractorCost) > 0) {
          totalSubcontractorExpenses += Number(inv.subcontractorCost);
        }
      }
    });

    // If transactions had no income recorded yet, fallback to customerBilled sum
    if (totalRevenue === 0) {
      const logsBilled = (maintenanceLogs || [])
        .filter((l) => isInPeriod(l.date))
        .reduce((sum, l) => sum + (Number(l.customerBilled || l.cost) || 0), 0);
      const invBilled = (invoices || [])
        .filter((i) => isInPeriod(i.date))
        .reduce((sum, i) => sum + (Number(i.customerBilled || i.total || i.amount) || 0), 0);
      totalRevenue = logsBilled + invBilled;
    }

    const totalNetProfit = totalRevenue - totalSubcontractorExpenses;
    const profitMargin = totalRevenue > 0 ? (totalNetProfit / totalRevenue) * 100 : 0;

    return {
      totalRevenue,
      totalSubcontractorExpenses,
      totalNetProfit,
      profitMargin,
    };
  }, [transactions, maintenanceLogs, invoices, period]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Total Revenue Widget */}
      <div
        className="bg-[#ECFDF5] border-[#A7F3D0] rounded-2xl p-5 shadow-xs flex items-center transition-all"
        style={{ borderWidth: '1.5px', borderStyle: 'solid' }}
      >
        <div className="rounded-xl p-3 bg-white border border-[#A7F3D0] text-[#059669] shadow-xs shrink-0">
          <TrendingUp className="w-5 h-5" />
        </div>
        <div className="ml-4 min-w-0">
          <p className="text-xs font-bold text-[#059669] uppercase tracking-wider truncate">
            Total Revenue
          </p>
          <p className="text-2xl font-black font-mono text-[#059669] mt-0.5 truncate">
            {formatCurrency(summary.totalRevenue)}
          </p>
          <p className="text-[10px] text-[#059669]/80 font-medium mt-0.5">Billed client revenue</p>
        </div>
      </div>

      {/* 2. Total Subcontractor Expenses Widget */}
      <div
        className="bg-[#FEF2F2] border-[#FECACA] rounded-2xl p-5 shadow-xs flex items-center transition-all"
        style={{ borderWidth: '1.5px', borderStyle: 'solid' }}
      >
        <div className="rounded-xl p-3 bg-white border border-[#FECACA] text-[#DC2626] shadow-xs shrink-0">
          <Building2 className="w-5 h-5" />
        </div>
        <div className="ml-4 min-w-0">
          <p className="text-xs font-bold text-[#DC2626] uppercase tracking-wider truncate">
            Total Subcontractor Expenses
          </p>
          <p className="text-2xl font-black font-mono text-[#DC2626] mt-0.5 truncate">
            {formatCurrency(summary.totalSubcontractorExpenses)}
          </p>
          <p className="text-[10px] text-[#DC2626]/80 font-medium mt-0.5">Dealer & garage charges</p>
        </div>
      </div>

      {/* 3. Total Net Profit Widget */}
      <div
        className="bg-[#F0F9FF] border-[#BAE6FD] rounded-2xl p-5 shadow-xs flex items-center transition-all"
        style={{ borderWidth: '1.5px', borderStyle: 'solid' }}
      >
        <div className="rounded-xl p-3 bg-white border border-[#BAE6FD] text-[#0284C7] shadow-xs shrink-0">
          <DollarSign className="w-5 h-5" />
        </div>
        <div className="ml-4 min-w-0">
          <p className="text-xs font-bold text-[#0284C7] uppercase tracking-wider truncate">
            Total Net Profit
          </p>
          <p
            className={`text-2xl font-black font-mono mt-0.5 truncate ${
              summary.totalNetProfit >= 0 ? 'text-[#059669]' : 'text-[#DC2626]'
            }`}
          >
            {summary.totalNetProfit >= 0 ? '+' : ''}
            {formatCurrency(summary.totalNetProfit)}
          </p>
          <p className="text-[10px] text-[#0284C7]/80 font-medium mt-0.5">Revenue minus subcontractor</p>
        </div>
      </div>

      {/* 4. Profit Margin Widget */}
      <div
        className="bg-[#FFFBEB] border-[#FDE68A] rounded-2xl p-5 shadow-xs flex items-center transition-all"
        style={{ borderWidth: '1.5px', borderStyle: 'solid' }}
      >
        <div className="rounded-xl p-3 bg-white border border-[#FDE68A] text-[#D97706] shadow-xs shrink-0">
          <Percent className="w-5 h-5" />
        </div>
        <div className="ml-4 min-w-0">
          <p className="text-xs font-bold text-[#D97706] uppercase tracking-wider truncate">
            Profit Margin
          </p>
          <p
            className={`text-2xl font-black font-mono mt-0.5 truncate ${
              summary.profitMargin >= 0 ? 'text-[#059669]' : 'text-[#DC2626]'
            }`}
          >
            {formatPercentage(summary.profitMargin)}
          </p>
          <p className="text-[10px] text-[#D97706]/80 font-medium mt-0.5">Net margin percentage</p>
        </div>
      </div>
    </div>
  );
};

export default FinancialSummary;