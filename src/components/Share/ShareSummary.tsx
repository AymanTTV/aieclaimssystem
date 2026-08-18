// src/components/Share/ShareSummary.tsx
import React from 'react'
import { ShareEntry, SplitRecord } from '../../types/share'
import { useFormattedDisplay } from '../../hooks/useFormattedDisplay'
import { usePermissions } from '../../hooks/usePermissions'
import { TrendingUp, TrendingDown, Users, Wallet } from 'lucide-react'

interface Props {
  entries: ShareEntry[]    
  splits:  SplitRecord[]   
  showHistory: boolean     
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

  const totalIncome  = entries
    .filter(e => e.type === 'income')
    .reduce((sum, e) => sum + (e as any).amount, 0)

  const totalExpense = entries
    .filter(e => e.type === 'expense')
    .reduce((sum, e) => sum + (e as any).totalCost, 0)

  const totalShared = showHistory 
    ? splits.reduce((sum, sp) => sum + sp.totalSplitAmount, 0)
    : 0;

  const balance = showHistory
    ? totalIncome - totalExpense - totalShared
    : totalIncome - totalExpense; 

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
    ...(showHistory ? [{ 
      label: 'Shared Funds', 
      amount: totalShared, 
      icon: Users,
      colorClass: 'text-blue-700', 
      bgClass: 'bg-blue-50',
      isShared: true 
    }] : []),
    { 
      label: 'Current Balance', 
      amount: balance, 
      icon: Wallet,
      colorClass: 'text-gray-900', 
      bgClass: 'bg-gray-100'
    }
  ]

  const gridCols = showHistory ? 'lg:grid-cols-4' : 'lg:grid-cols-3';

  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 ${gridCols} gap-4 mb-6`}>
      {cards.map((card) => {
        const Icon = card.icon
        return (
          <div key={card.label} className="bg-white rounded-xl shadow-sm p-5 border border-gray-100 hover:shadow-md hover:border-gray-200 transition-all duration-200 flex flex-col justify-between group">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  {card.label}
                </h3>
                <div className={`p-3 rounded-xl transition-transform duration-300 group-hover:scale-110 ${card.bgClass}`}>
                  <Icon className={`w-5 h-5 ${card.colorClass}`} />
                </div>
              </div>
              
              <p className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${card.colorClass}`}>
                {formatCurrency(card.amount)}
              </p>
            </div>

            {card.isShared && showHistory && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                {startDate && endDate && (
                  <div className="text-xs text-gray-400 mb-3 font-medium">
                    {startDate} &rarr; {endDate}
                  </div>
                )}
                <div className="space-y-2.5 max-h-32 overflow-y-auto custom-scrollbar pr-1">
                  {Object.entries(breakdown).map(([name, amt]) => {
                    const pct = totalShared > 0 ? Math.round((amt / totalShared) * 100) : 0
                    return (
                      <div key={name} className="flex justify-between items-center text-xs sm:text-sm">
                        <span className="text-gray-600 font-medium truncate max-w-[65%]">
                          {name} <span className="text-gray-400 text-[10px] ml-1">({pct}%)</span>
                        </span>
                        <span className="font-bold text-gray-900">
                          {formatCurrency(amt)}
                        </span>
                      </div>
                    )
                  })}
                  {Object.keys(breakdown).length === 0 && (
                     <span className="text-sm text-gray-400 italic">No splits in this period</span>
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