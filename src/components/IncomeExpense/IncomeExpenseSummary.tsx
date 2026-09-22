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
      cardBg: 'bg-[#ECFDF5] border-[#A7F3D0] hover:border-emerald-300',
      colorClass: 'text-[#047857]',
      labelColor: 'text-[#059669]',
      iconWrapperClass: 'bg-white border-[#A7F3D0] text-[#059669]',
      isShared: false,
    },
    {
      label: 'Total Expense',
      amount: totalExpense,
      icon: TrendingDown,
      cardBg: 'bg-[#FEF2F2] border-[#FECACA] hover:border-red-300',
      colorClass: 'text-[#B91C1C]',
      labelColor: 'text-[#DC2626]',
      iconWrapperClass: 'bg-white border-[#FECACA] text-[#DC2626]',
      isShared: false,
    },
    {
      label: 'Shared Profit',
      amount: totalShared,
      icon: Users,
      cardBg: 'bg-[#F0F9FF] border-[#BAE6FD] hover:border-sky-300',
      colorClass: 'text-[#0369A1]',
      labelColor: 'text-[#0284C7]',
      iconWrapperClass: 'bg-white border-[#BAE6FD] text-[#0284C7]',
      isShared: true,
    },
    {
      label: 'Net Balance',
      amount: balance,
      icon: Wallet,
      cardBg: balance >= 0 ? 'bg-[#FAF5FF] border-[#E9D5FF] hover:border-purple-300' : 'bg-[#FEF2F2] border-[#FECACA] hover:border-red-300',
      colorClass: balance >= 0 ? 'text-[#6B21A8]' : 'text-[#B91C1C]',
      labelColor: balance >= 0 ? 'text-[#7E22CE]' : 'text-[#DC2626]',
      iconWrapperClass: balance >= 0 ? 'bg-white border-[#E9D5FF] text-[#7E22CE]' : 'bg-white border-[#FECACA] text-[#DC2626]',
      isShared: false,
    },
  ] as const;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.label}
            className={`${card.cardBg} rounded-2xl border p-5 sm:p-6 shadow-xs flex flex-col justify-between transition-all duration-300 text-[#0F172A] relative overflow-hidden group`}
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
              <div className="mt-4 pt-4 border-t border-[#BAE6FD]">
                {startDate && endDate && (
                  <div className="text-xs text-[#64748B] mb-2 italic">
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
                        <span className="text-[#334155] truncate max-w-[60%]">
                          {name}{' '}
                          <span className="text-[#64748B] text-[10px]">({pct}%)</span>
                        </span>
                        <span className="font-mono font-medium text-[#0F172A]">
                          {formatCurrency(amt)}
                        </span>
                      </div>
                    );
                  })}

                  {breakdownSorted.length === 0 && (
                    <span className="text-xs text-[#64748B]">
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
