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
  
    // Don't even render the cards if the user lacks the 'cards' permission
    if (!can('share', 'cards')) {
      return null;
    }

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

  // 3) Card definitions
  const cards = [
    { label: 'Income',  amount: totalIncome,  color: 'text-gray-900' },
    { label: 'Expense', amount: totalExpense, color: 'text-red-600' },
    { label: 'Shared',  amount: totalShared,  color: 'text-blue-600',  isShared: true },
    { label: 'Balance', amount: balance,      color: 'text-green-600' }
  ] as const

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map(card => (
        <div key={card.label} className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-sm font-medium text-gray-500">
            {card.label.toUpperCase()}
          </h3>

          {card.isShared && (
            <div className="mt-2 space-y-1 text-sm text-gray-700">
              {/* optional date-range display */}
              {(startDate && endDate) && (
                <p className="italic text-xs text-gray-500">
                  {startDate} → {endDate}
                </p>
              )}

              {/* breakdown by recipient */}
              {Object.entries(breakdown).map(([name, amt]) => {
                // guard against division by zero
                const pct = totalShared > 0
                  ? Math.round((amt / totalShared) * 100)
                  : 0

                return (
                  <p key={name}>
                    <span className="font-medium">{name}</span>{' '}
                    ({pct}%){' '}
                    = <span className="font-semibold">{formatCurrency(amt)}</span>
                  </p>
                )
              })}
            </div>
          )}

          {/* total amount */}
          <p className={`mt-2 text-3xl font-semibold ${card.color}`}>
            {formatCurrency(card.amount)}
          </p>
        </div>
      ))}
    </div>
  )
}
