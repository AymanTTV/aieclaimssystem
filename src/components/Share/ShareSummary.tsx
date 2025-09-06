// src/components/share/ShareSummary.tsx
import React from 'react'
import { ShareEntry, SplitRecord } from '../../types/share'
import { useFormattedDisplay } from '../../hooks/useFormattedDisplay'
import { usePermissions } from '../../hooks/usePermissions';

interface Props {
  entries: ShareEntry[]
  splits:  SplitRecord[]
  /** Optional—if you’ve got a date filter active */
  startDate?: string
  endDate?: string
}

export default function ShareSummary({
  entries,
  splits,
  startDate,
  endDate
}: Props) {
  const { formatCurrency } = useFormattedDisplay()
  const { can } = usePermissions();
  if (!can('share', 'cards')) return null;

  // 1) Compute raw totals
  const totalIncome  = entries
    .filter(e => e.type === 'income')
    .reduce((sum, e) => sum + (e as any).amount, 0)

  const totalExpense = entries
    .filter(e => e.type === 'expense')
    .reduce((sum, e) => sum + (e as any).totalCost, 0)

  const totalShared  = splits
    .reduce((sum, sp) => sum + sp.totalSplitAmount, 0)

  const balance = totalIncome - totalExpense - totalShared

  // 2) Build a name→amount map for “Shared” breakdown
  const breakdown = splits.reduce<Record<string, number>>((acc, sp) => {
    sp.recipients.forEach(rec => {
      acc[rec.name] = (acc[rec.name] || 0) + rec.amount
    })
    return acc
  }, {})

  const cards = [
    { label: 'Income',  amount: totalIncome,  color: 'text-gray-900' },
    { label: 'Expense', amount: totalExpense, color: 'text-red-600' },
    { label: 'Shared',  amount: totalShared,  color: 'text-blue-600',  isShared: true as const },
    { label: 'Balance', amount: balance,      color: 'text-green-600' }
  ] as const

  return (
    <div className="grid grid-cols-1 min-[380px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
      {cards.map(card => (
        <div key={card.label} className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
          <h3 className="text-xs sm:text-sm font-medium text-gray-500">
            {card.label.toUpperCase()}
          </h3>

          {card.isShared && (
            <div className="mt-2 space-y-1 text-xs sm:text-sm text-gray-700 max-h-28 overflow-y-auto pr-1">
              {(startDate && endDate) && (
                <p className="italic text-[11px] sm:text-xs text-gray-500">
                  {startDate} → {endDate}
                </p>
              )}

              {Object.entries(breakdown).map(([name, amt]) => {
                const pct = totalShared > 0 ? Math.round((amt / totalShared) * 100) : 0
                return (
                  <p key={name} className="flex justify-between gap-2">
                    <span className="font-medium truncate">{name} <span className="text-gray-500">({pct}%)</span></span>
                    <span className="font-semibold whitespace-nowrap">{formatCurrency(amt)}</span>
                  </p>
                )
              })}
            </div>
          )}

          <p className={`mt-2 text-lg sm:text-3xl font-semibold ${card.color}`}>
            {formatCurrency(card.amount)}
          </p>
        </div>
      ))}
    </div>
  )
}
