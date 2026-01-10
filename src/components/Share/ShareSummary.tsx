// src/components/share/ShareSummary.tsx
import React from 'react'
import { ShareEntry, SplitRecord } from '../../types/share'
import { useFormattedDisplay } from '../../hooks/useFormattedDisplay'
import { usePermissions } from '../../hooks/usePermissions'
import { TrendingUp, TrendingDown, Users, Wallet } from 'lucide-react'

interface Props {
  entries: ShareEntry[]    // Should be the filtered list of entries
  splits:  SplitRecord[]   // Should be the filtered list of splits
  showHistory: boolean     // New Prop to determine view mode
  startDate?: string
  endDate?: string
}

export default function ShareSummary({
  entries,
  splits,
  showHistory,
  startDate,
  endDate
}: Props) {
  const { formatCurrency } = useFormattedDisplay()
  const { can } = usePermissions()
  if (!can('share', 'cards')) return null

  // 1) Compute Totals based on what is visible (entries passed are already filtered)
  const totalIncome  = entries
    .filter(e => e.type === 'income')
    .reduce((sum, e) => sum + (e as any).amount, 0)

  const totalExpense = entries
    .filter(e => e.type === 'expense')
    .reduce((sum, e) => sum + (e as any).totalCost, 0)

  // 2) Shared Funds Logic
  // If History is OFF, the table hides split records, so 'entries' only has Unsplit data.
  // The 'Shared Funds' card should be hidden or zero.
  // If History is ON, we show total split amount from the splits array.
  const totalShared = showHistory 
    ? splits.reduce((sum, sp) => sum + sp.totalSplitAmount, 0)
    : 0;

  // 3) Balance Logic
  // If History is OFF: Balance = Income (Unsplit) - Expense (Unsplit).
  // If History is ON: Balance = Income (Total) - Expense (Total) - Shared (Total).
  const balance = showHistory
    ? totalIncome - totalExpense - totalShared
    : totalIncome - totalExpense; // 'entries' excludes shared items already when history is off

  // Build recipients map only if history is showing
  const breakdown = showHistory ? splits.reduce<Record<string, number>>((acc, sp) => {
    sp.recipients.forEach(rec => {
      acc[rec.name] = (acc[rec.name] || 0) + rec.amount
    })
    return acc
  }, {}) : {};

  const cards = [
    { 
      label: showHistory ? 'Total Income (History)' : 'Net Income (Unsplit)', 
      amount: totalIncome, 
      icon: TrendingUp,
      colorClass: 'text-green-600', 
      bgClass: 'bg-green-50'
    },
    { 
      label: showHistory ? 'Total Expense (History)' : 'Net Expense (Unsplit)', 
      amount: totalExpense, 
      icon: TrendingDown,
      colorClass: 'text-red-600', 
      bgClass: 'bg-red-50'
    },
    // Only show Shared Funds if history is active
    ...(showHistory ? [{ 
      label: 'Shared Funds', 
      amount: totalShared, 
      icon: Users,
      colorClass: 'text-blue-600', 
      bgClass: 'bg-blue-50',
      isShared: true 
    }] : []),
    { 
      label: 'Current Balance', 
      amount: balance, 
      icon: Wallet,
      colorClass: 'text-gray-900', 
      bgClass: 'bg-gray-100' // Darker bg for emphasis
    }
  ]

  // Adjust grid columns based on number of cards
  const gridCols = showHistory ? 'lg:grid-cols-4' : 'lg:grid-cols-3';

  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 ${gridCols} gap-4 mb-6`}>
      {cards.map((card) => {
        const Icon = card.icon
        return (
          <div key={card.label} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
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

            {card.isShared && showHistory && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                {startDate && endDate && (
                  <div className="text-xs text-gray-400 mb-2 italic">
                    {startDate} → {endDate}
                  </div>
                )}
                <div className="space-y-2 max-h-32 overflow-y-auto custom-scrollbar">
                  {Object.entries(breakdown).map(([name, amt]) => {
                    const pct = totalShared > 0 ? Math.round((amt / totalShared) * 100) : 0
                    return (
                      <div key={name} className="flex justify-between items-center text-xs sm:text-sm">
                        <span className="text-gray-600 truncate max-w-[60%]">
                          {name} <span className="text-gray-400 text-[10px]">({pct}%)</span>
                        </span>
                        <span className="font-medium text-gray-800">
                          {formatCurrency(amt)}
                        </span>
                      </div>
                    )
                  })}
                  {Object.keys(breakdown).length === 0 && (
                     <span className="text-xs text-gray-400">No splits in this period</span>
                  )}
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}