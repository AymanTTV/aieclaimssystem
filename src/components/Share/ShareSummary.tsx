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
      colorClass: 'text-emerald-400', 
      bgClass: 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400'
    },
    { 
      label: showHistory ? 'Total Expense (History)' : 'Net Expense (Unsplit)', 
      amount: totalExpense, 
      icon: TrendingDown,
      colorClass: 'text-rose-400', 
      bgClass: 'bg-rose-500/15 border border-rose-500/30 text-rose-400'
    },
    ...(showHistory ? [{ 
      label: 'Shared Funds', 
      amount: totalShared, 
      icon: Users,
      colorClass: 'text-blue-400', 
      bgClass: 'bg-blue-500/15 border border-blue-500/30 text-blue-400',
      isShared: true 
    }] : []),
    { 
      label: 'Current Balance', 
      amount: balance, 
      icon: Wallet,
      colorClass: 'text-white', 
      bgClass: 'bg-slate-700/30 border border-slate-600/40 text-slate-200'
    }
  ]

  const gridCols = showHistory ? 'lg:grid-cols-4' : 'lg:grid-cols-3';

  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 ${gridCols} gap-4 mb-6`}>
      {cards.map((card) => {
        const Icon = card.icon
        return (
          <div key={card.label} className="bg-[#16192B] rounded-2xl shadow-xl p-5 border border-[#2B314E] hover:border-[#3D456E] transition-all duration-200 flex flex-col justify-between group text-white">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  {card.label}
                </h3>
                <div className={`p-3 rounded-xl transition-transform duration-300 group-hover:scale-110 ${card.bgClass}`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>
              
              <p className={`text-2xl sm:text-3xl font-black font-mono tracking-tight ${card.colorClass}`}>
                {formatCurrency(card.amount)}
              </p>
            </div>

            {card.isShared && showHistory && (
              <div className="mt-4 pt-4 border-t border-[#2B314E]">
                {startDate && endDate && (
                  <div className="text-xs text-slate-400 mb-3 font-medium">
                    {startDate} &rarr; {endDate}
                  </div>
                )}
                <div className="space-y-2.5 max-h-32 overflow-y-auto custom-scrollbar pr-1">
                  {Object.entries(breakdown).map(([name, amt]) => {
                    const pct = totalShared > 0 ? Math.round((amt / totalShared) * 100) : 0
                    return (
                      <div key={name} className="flex justify-between items-center text-xs sm:text-sm">
                        <span className="text-slate-300 font-medium truncate max-w-[65%]">
                          {name} <span className="text-slate-400 text-[10px] ml-1">({pct}%)</span>
                        </span>
                        <span className="font-bold text-white font-mono">
                          {formatCurrency(amt)}
                        </span>
                      </div>
                    )
                  })}
                  {Object.keys(breakdown).length === 0 && (
                     <span className="text-sm text-slate-400 italic">No splits in this period</span>
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