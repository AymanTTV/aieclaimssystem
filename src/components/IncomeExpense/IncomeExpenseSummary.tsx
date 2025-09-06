// src/components/IncomeExpense/IncomeExpenseSummary.tsx
import React, { useMemo, useState } from 'react';
import { IncomeExpenseEntry, ProfitShare } from '../../types/incomeExpense';
import { useFormattedDisplay } from '../../hooks/useFormattedDisplay';
import { usePermissions } from '../../hooks/usePermissions';
import { RolePermissions } from '../../types/roles';
import {
  Banknote as IncomeIcon,
  ArrowDownCircle as ExpenseIcon,
  Users as SharedIcon,
  Wallet as BalanceIcon,
  ChevronDown,
  ChevronUp,
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
  const [showSharedBreakdown, setShowSharedBreakdown] = useState(false);

  if (!can(permissionScope, 'cards')) return null;

  // Shares visible inside the "Shared" card (respects active filter)
  const displayShares = useMemo(() => {
    if (startDate && endDate) {
      const s = new Date(startDate);
      const e = new Date(endDate);
      return shares.filter(
        (sp) => new Date(sp.endDate) >= s && new Date(sp.startDate) <= e
      );
    }
    return shares;
  }, [shares, startDate, endDate]);

  // Last share cut-off (up to end of filter, or overall if none)
  const { lastShare, lastClearDate } = useMemo(() => {
    const base = endDate
      ? shares.filter((sp) => new Date(sp.endDate) <= new Date(endDate))
      : shares;

    const ls = base.length
      ? base.reduce((a, b) =>
          new Date(a.endDate) > new Date(b.endDate) ? a : b
        )
      : null;

    return { lastShare: ls, lastClearDate: ls?.endDate };
  }, [shares, endDate]);

  // Only keep entries AFTER the last clear/share date
  const periodEntries = useMemo(() => {
    if (!lastClearDate) return entries;
    const cutoff = new Date(lastClearDate);
    return entries.filter((e) => new Date(e.date) > cutoff);
  }, [entries, lastClearDate]);

  // Totals on the post-split slice
  const totalIncome = useMemo(
    () =>
      periodEntries
        .filter((e) => e.type === 'income')
        .reduce((sum, e) => sum + (e.total ?? 0), 0),
    [periodEntries]
  );

  const totalExpense = useMemo(
    () =>
      periodEntries
        .filter((e) => e.type === 'expense')
        .reduce(
          (sum, e) => sum + (e.total ?? (e as any).totalCost ?? 0),
          0
        ),
    [periodEntries]
  );

  // Shares (for display + optional subtraction when filtered)
  const totalShared = useMemo(
    () => displayShares.reduce((sum, sp) => sum + (sp.totalSplitAmount ?? 0), 0),
    [displayShares]
  );

  // subtract shared ONLY when there is an explicit date filter
  const effectiveShared = startDate && endDate ? totalShared : 0;

  // Final balance (allow negatives to show overdraft clearly)
  const balance = useMemo(
    () => totalIncome - totalExpense - effectiveShared,
    [totalIncome, totalExpense, effectiveShared]
  );

  // Per-recipient breakdown for the Shared card
  const breakdown: Record<string, number> = useMemo(() => {
    return displayShares.reduce<Record<string, number>>((acc, sp) => {
      sp.recipients?.forEach((rec) => {
        acc[rec.name] = (acc[rec.name] || 0) + rec.amount;
      });
      return acc;
    }, {});
  }, [displayShares]);

  const dateChipActive = Boolean(startDate && endDate);

  const cards = [
    {
      key: 'income',
      label: 'Income',
      amount: totalIncome,
      icon: <IncomeIcon className="h-5 w-5" aria-hidden />,
      tone: 'text-gray-900',
      pillTone: 'bg-gray-100 text-gray-700',
    },
    {
      key: 'expense',
      label: 'Expense',
      amount: totalExpense,
      icon: <ExpenseIcon className="h-5 w-5" aria-hidden />,
      tone: 'text-red-600',
      pillTone: 'bg-red-50 text-red-700',
    },
    {
      key: 'shared',
      label: 'Shared',
      amount: totalShared,
      icon: <SharedIcon className="h-5 w-5" aria-hidden />,
      tone: 'text-blue-600',
      pillTone: 'bg-blue-50 text-blue-700',
      isShared: true,
    },
    {
      key: 'balance',
      label: 'Balance',
      amount: balance,
      icon: <BalanceIcon className="h-5 w-5" aria-hidden />,
      tone: balance < 0 ? 'text-red-600' : 'text-green-600',
      pillTone: balance < 0 ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700',
    },
  ] as const;

  return (
    <div className="space-y-3">
      {/* Cards: now 2 per row on mobile, 4 per row on large */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {cards.map((card) => (
          <div
            key={card.key}
            className="bg-white rounded-lg shadow-sm p-4 border border-gray-100"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="rounded-md p-2 bg-gray-50">{card.icon}</div>
                <h3 className="text-[11px] font-medium text-gray-500 tracking-wide">
                  {card.label.toUpperCase()}
                </h3>
              </div>
              <span
                className={`hidden sm:inline-block text-xs px-2 py-0.5 rounded-full ${card.pillTone}`}
              >
                {card.label}
              </span>
            </div>

            <p className={`mt-3 text-2xl font-semibold ${card.tone}`}>
              {formatCurrency(card.amount)}
            </p>

            {/* Shared breakdown (collapsible to save mobile space) */}
            {card.isShared && (
              <div className="mt-2">
                <button
                  type="button"
                  onClick={() => setShowSharedBreakdown((s) => !s)}
                  className="flex items-center gap-1 text-xs text-gray-600 hover:text-gray-800"
                >
                  {showSharedBreakdown ? (
                    <>
                      <ChevronUp className="h-4 w-4" /> Hide breakdown
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-4 w-4" /> Show breakdown
                    </>
                  )}
                </button>

                {showSharedBreakdown && (
                  <div className="mt-2 space-y-1 text-sm text-gray-700">
                    {Object.keys(breakdown).length === 0 && (
                      <p className="text-gray-400 italic">No shared payouts in range.</p>
                    )}
                    {Object.entries(breakdown).map(([name, amt]) => {
                      const pct =
                        totalShared > 0 ? Math.round((amt / totalShared) * 100) : 0;
                      return (
                        <div key={name} className="flex items-center justify-between">
                          <span className="truncate pr-2">
                            <span className="font-medium">{name}</span>{' '}
                            <span className="text-gray-400">({pct}%)</span>
                          </span>
                          <span className="font-semibold">{formatCurrency(amt)}</span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {dateChipActive && (
                  <p className="mt-2 text-[11px] text-gray-500">
                    Showing shares intersecting the selected dates.
                  </p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
