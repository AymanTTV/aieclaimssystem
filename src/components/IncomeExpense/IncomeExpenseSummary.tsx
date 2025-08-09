// src/components/IncomeExpense/IncomeExpenseSummary.tsx
import React from 'react';
import { IncomeExpenseEntry, ProfitShare } from '../../types/incomeExpense';
import { useFormattedDisplay } from '../../hooks/useFormattedDisplay';
import { usePermissions } from '../../hooks/usePermissions';
import { RolePermissions } from '../../types/roles';

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
  permissionScope = 'incomeExpense'
}: Props) {
  const { formatCurrency } = useFormattedDisplay();
  const { can } = usePermissions();
  if (!can(permissionScope, 'cards')) return null;

  // --- figure out which shares to show based on filter window ---
  const displayShares =
    startDate && endDate
      ? shares.filter(
          sp =>
            new Date(sp.endDate) >= new Date(startDate) &&
            new Date(sp.startDate) <= new Date(endDate)
        )
      : shares;

  // --- find the last share up to the end of the filter (or overall) ---
  const cutOffShares = endDate
    ? shares.filter(sp => new Date(sp.endDate) <= new Date(endDate))
    : shares;
  const lastShare = cutOffShares.length
    ? cutOffShares.reduce((a, b) =>
        new Date(a.endDate) > new Date(b.endDate) ? a : b
      )
    : null;
  const lastClearDate = lastShare?.endDate;

  // --- only keep entries after that last clear date ---
  const periodEntries = lastClearDate
    ? entries.filter(e => new Date(e.date) > new Date(lastClearDate))
    : entries;

  // --- totals on the post-split slice ---
  const totalIncome = periodEntries
    .filter(e => e.type === 'income')
    .reduce((sum, e) => sum + (e.total ?? 0), 0);

  const totalExpense = periodEntries
    .filter(e => e.type === 'expense')
    .reduce((sum, e) => sum + (e.total ?? (e as any).totalCost ?? 0), 0);

  // --- shared only for display (breakdown) ---
  const totalShared = displayShares.reduce((sum, sp) => sum + sp.totalSplitAmount, 0);

  // --- subtract shared only if filtering, otherwise leave it out ---
  const effectiveShared = startDate && endDate ? totalShared : 0;

  // --- final balance, clamped ≥ 0 ---
  const balance = Math.max(0, totalIncome - totalExpense - effectiveShared);

  // breakdown per recipient (always shown in Shared card)
  const breakdown = displayShares.reduce<Record<string, number>>((acc, sp) => {
    sp.recipients.forEach(rec => {
      acc[rec.name] = (acc[rec.name] || 0) + rec.amount;
    });
    return acc;
  }, {});

  const cards = [
    { label: 'Income',  amount: totalIncome,     color: 'text-gray-900' },
    { label: 'Expense', amount: totalExpense,    color: 'text-red-600' },
    { label: 'Shared',  amount: totalShared,     color: 'text-blue-600', isShared: true },
    { label: 'Balance', amount: balance,         color: 'text-green-600' }
  ] as const;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map(card => (
        <div key={card.label} className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-sm font-medium text-gray-500">
            {card.label.toUpperCase()}
          </h3>

          {card.isShared && (
            <div className="mt-2 space-y-1 text-sm text-gray-700">
              {startDate && endDate && (
                <p className="italic text-xs text-gray-500">
                  {startDate} → {endDate}
                </p>
              )}
              {Object.entries(breakdown).map(([name, amt]) => {
                const pct = totalShared > 0 ? Math.round((amt / totalShared) * 100) : 0;
                return (
                  <p key={name}>
                    <span className="font-medium">{name}</span>{' '}
                    ({pct}%) ={' '}
                    <span className="font-semibold">{formatCurrency(amt)}</span>
                  </p>
                );
              })}
            </div>
          )}

          <p className={`mt-2 text-3xl font-semibold ${card.color}`}>
            {formatCurrency(card.amount)}
          </p>
        </div>
      ))}
    </div>
  );
}
