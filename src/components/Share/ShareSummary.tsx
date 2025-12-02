// src/components/share/ShareSummary.tsx
import React from 'react'
import { ShareEntry, SplitRecord } from '../../types/share'
import { useFormattedDisplay } from '../../hooks/useFormattedDisplay'
import { usePermissions } from '../../hooks/usePermissions'
import { TrendingUp, TrendingDown, Users, Wallet } from 'lucide-react'

interface Props {
  entries: ShareEntry[]
  splits:  SplitRecord[]
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
  const { can } = usePermissions()
  if (!can('share', 'cards')) return null

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
    { 
      label: 'Total Income', 
      amount: totalIncome, 
      icon: TrendingUp,
      colorClass: 'text-green-600', 
      bgClass: 'bg-green-50'
    },
    { 
      label: 'Total Expense', 
      amount: totalExpense, 
      icon: TrendingDown,
      colorClass: 'text-red-600', 
      bgClass: 'bg-red-50'
    },
    { 
      label: 'Shared Funds', 
      amount: totalShared, 
      icon: Users,
      colorClass: 'text-blue-600', 
      bgClass: 'bg-blue-50',
      isShared: true 
    },
    { 
      label: 'Current Balance', 
      amount: balance, 
      icon: Wallet,
      colorClass: 'text-gray-900', 
      bgClass: 'bg-gray-50'
    }
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {cards.map((card) => {
        const Icon = card.icon
        return (
          <div key={card.label} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm flex flex-col justify-between transition-shadow hover:shadow-md">
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