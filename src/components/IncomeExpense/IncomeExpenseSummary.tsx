// src/components/IncomeExpense/IncomeExpenseSummary.tsx
import React, { useMemo } from 'react';
import { IncomeExpenseEntry, ProfitShare } from '../../types/incomeExpense';
import { useFormattedDisplay } from '../../hooks/useFormattedDisplay';
import { usePermissions } from '../../hooks/usePermissions';
import { RolePermissions } from '../../types/roles';
import { TrendingUp, TrendingDown, Users, Wallet } from 'lucide-react';

interface Props {
  entries?: IncomeExpenseEntry[];
  shares?: ProfitShare[];
  startDate?: string;
  endDate?: string;
  permissionScope?: keyof RolePermissions;
}

export default function IncomeExpenseSummary({
  entries = [],
  shares = [],
  startDate,
  endDate,
  permissionScope = 'incomeExpense',
}: Props) {
  const { formatCurrency } = useFormattedDisplay();
  const { can } = usePermissions();

  if (!can(permissionScope, 'cards')) return null;

  // 1) Totals (IMPORTANT: income is commissionAmount)
  const totalIncome = useMemo(() => {
    return entries
      .filter((e) => e.type === 'income')
      .reduce((sum, e) => sum + (e.commissionAmount ?? 0), 0);
  }, [entries]);

  const totalExpense = useMemo(() => {
    return entries
      .filter((e) => e.type === 'expense')
      .reduce((sum, e) => sum + (e.total ?? (e as any).totalCost ?? 0), 0);
  }, [entries]);

  const totalShared = useMemo(() => {
    return shares.reduce((sum, sp) => sum + (sp.totalSplitAmount ?? 0), 0);
  }, [shares]);

  const balance = useMemo(() => {
    return totalIncome - totalExpense - totalShared;
  }, [totalIncome, totalExpense, totalShared]);

  // 2) Per-recipient breakdown for the Shared card
  const breakdown: Record<string, number> = useMemo(() => {
    return shares.reduce<Record<string, number>>((acc, sp) => {
      (sp.recipients || []).forEach((rec: any) => {
        const name = rec?.name || 'Unknown';
        const amount = Number(rec?.amount ?? 0) || 0;
        acc[name] = (acc[name] || 0) + amount;
      });
      return acc;
    }, {});
  }, [shares]);

  // Optional: show biggest recipients first (nice UX)
  const breakdownSorted = useMemo(() => {
    return Object.entries(breakdown).sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0));
  }, [breakdown]);

  const cards = [
    {
      label: 'Total Commission (Income)',
      amount: totalIncome,
      icon: TrendingUp,
      colorClass: 'text-emerald-400',
      labelColor: 'text-emerald-300',
      iconWrapperClass: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400',
    },
    {
      label: 'Total Expense',
      amount: totalExpense,
      icon: TrendingDown,
      colorClass: 'text-rose-400',
      labelColor: 'text-rose-300',
      iconWrapperClass: 'bg-rose-500/15 border-rose-500/30 text-rose-400',
    },
    {
      label: 'Shared Profit',
      amount: totalShared,
      icon: Users,
      colorClass: 'text-blue-400',
      labelColor: 'text-blue-300',
      iconWrapperClass: 'bg-blue-500/15 border-blue-500/30 text-blue-400',
      isShared: true,
    },
    {
      label: 'Net Balance',
      amount: balance,
      icon: Wallet,
      colorClass: balance >= 0 ? 'text-white' : 'text-rose-400',
      labelColor: 'text-slate-300',
      iconWrapperClass: 'bg-slate-800/80 border-slate-700/60 text-slate-200',
    },
  ] as const;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.label}
            className="bg-[#16192B] rounded-2xl border border-[#2B314E] hover:border-[#3D456E] p-5 sm:p-6 shadow-xl flex flex-col justify-between transition-all duration-300 text-white relative overflow-hidden group"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className={`text-xs sm:text-sm font-bold uppercase tracking-wider ${card.labelColor}`}>
                  {card.label}
                </h3>
                <div className={`p-2.5 rounded-xl border shadow-xs ${card.iconWrapperClass}`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>

              <p className={`text-2xl sm:text-3xl font-black font-mono tracking-tight ${card.colorClass}`}>
                {formatCurrency(card.amount)}
              </p>
            </div>

            {card.isShared && (
              <div className="mt-4 pt-4 border-t border-[#2B314E]">
                {startDate && endDate && (
                  <div className="text-xs text-slate-400 mb-2 italic">
                    {startDate} → {endDate}
                  </div>
                )}

                <div className="space-y-2 max-h-32 overflow-y-auto custom-scrollbar">
                  {breakdownSorted.map(([name, amt]) => {
                    const pct =
                      totalShared > 0 ? Math.round((amt / totalShared) * 100) : 0;

                    return (
                      <div
                        key={name}
                        className="flex justify-between items-center text-xs sm:text-sm"
                      >
                        <span className="text-slate-300 truncate max-w-[60%]">
                          {name}{' '}
                          <span className="text-slate-400 text-[10px]">({pct}%)</span>
                        </span>
                        <span className="font-mono font-medium text-white">
                          {formatCurrency(amt)}
                        </span>
                      </div>
                    );
                  })}

                  {breakdownSorted.length === 0 && (
                    <span className="text-xs text-slate-400">
                      No splits in this period
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
