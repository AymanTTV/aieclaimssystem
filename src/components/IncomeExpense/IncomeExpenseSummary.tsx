import React, { useMemo } from 'react';
import { IncomeExpenseEntry, ProfitShare } from '../../types/incomeExpense';
import { useFormattedDisplay } from '../../hooks/useFormattedDisplay';
import { usePermissions } from '../../hooks/usePermissions';
import { RolePermissions } from '../../types/roles';
import {
  TrendingUp,
  TrendingDown,
  Users,
  Wallet
} from 'lucide-react';

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

  // 1. Compute totals
  const totalIncome = useMemo(
    () =>
      entries
        .filter((e) => e.type === 'income')
        .reduce((sum, e) => sum + (e.total ?? 0), 0),
    [entries]
  );

  const totalExpense = useMemo(
    () =>
      entries
        .filter((e) => e.type === 'expense')
        .reduce(
          (sum, e) => sum + (e.total ?? (e as any).totalCost ?? 0),
          0
        ),
    [entries]
  );

  const totalShared = useMemo(
    () => shares.reduce((sum, sp) => sum + (sp.totalSplitAmount ?? 0), 0),
    [shares]
  );

  const balance = useMemo(
    () => totalIncome - totalExpense - totalShared,
    [totalIncome, totalExpense, totalShared]
  );

  // 2. Per-recipient breakdown for the Shared card
  const breakdown: Record<string, number> = useMemo(() => {
    return shares.reduce<Record<string, number>>((acc, sp) => {
      sp.recipients?.forEach((rec) => {
        acc[rec.name] = (acc[rec.name] || 0) + rec.amount;
      });
      return acc;
    }, {});
  }, [shares]);

  const cards = [
    {
      label: 'Total Income',
      amount: totalIncome,
      icon: TrendingUp,
      colorClass: 'text-green-600',
      bgClass: 'bg-green-50',
    },
    {
      label: 'Total Expense',
      amount: totalExpense,
      icon: TrendingDown,
      colorClass: 'text-red-600',
      bgClass: 'bg-red-50',
    },
    {
      label: 'Shared Profit',
      amount: totalShared,
      icon: Users,
      colorClass: 'text-blue-600',
      bgClass: 'bg-blue-50',
      isShared: true,
    },
    {
      label: 'Net Balance',
      amount: balance,
      icon: Wallet,
      colorClass: 'text-gray-900',
      bgClass: 'bg-gray-50',
    },
  ] as const;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.label}
            className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm flex flex-col justify-between transition-shadow hover:shadow-md"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">
                  {card.label}
                </h3>
                <div className={`p-2 rounded-lg ${card.bgClass}`}>
                  <Icon className={`w-5 h-5 ${card.colorClass}`} />
                </div>
              </div>

              <p className={`text-2xl font-bold ${card.colorClass}`}>
                {formatCurrency(card.amount)}
              </p>
            </div>

            {card.isShared && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                {startDate && endDate && (
                  <div className="text-xs text-gray-400 mb-2 italic">
                    {startDate} → {endDate}
                  </div>
                )}
                
                <div className="space-y-2 max-h-32 overflow-y-auto custom-scrollbar">
                  {Object.entries(breakdown).map(([name, amt]) => {
                    const pct =
                      totalShared > 0 ? Math.round((amt / totalShared) * 100) : 0;
                    return (
                      <div
                        key={name}
                        className="flex justify-between items-center text-xs sm:text-sm"
                      >
                        <span className="text-gray-600 truncate max-w-[60%]">
                          {name}{' '}
                          <span className="text-gray-400 text-[10px]">
                            ({pct}%)
                          </span>
                        </span>
                        <span className="font-medium text-gray-800">
                          {formatCurrency(amt)}
                        </span>
                      </div>
                    );
                  })}
                  
                  {Object.keys(breakdown).length === 0 && (
                    <span className="text-xs text-gray-400">
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