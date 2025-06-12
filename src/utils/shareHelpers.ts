// src/utils/shareHelpers.ts

import { exportToExcel } from './excel'
import { ShareEntry } from '../types/share'
import { format } from 'date-fns'

export function handleShareExport(entries: ShareEntry[]) {
  const rows = entries.map(e => {
    const common = {
      Date: format(new Date(e.date), 'dd/MM/yyyy'),
      Client: e.clientName,
      'Claim Ref': e.claimRef,
      Progress: e.progress,
    }

    if (e.type === 'income') {
      const inc = e as any
      return {
        ...common,
        Type: 'Income',
        'Total Amount': inc.amount.toFixed(2),
        'VD Profit': inc.vdProfit.toFixed(2),
        'Actual Paid': inc.actualPaid.toFixed(2),
        'Legal Fee (%)': `${inc.legalFeePct}%`,
        'Legal Fee Cost': inc.legalFeeCost.toFixed(2),
        ...(inc.vHireAmount != null ? { 'Hire Income': inc.vHireAmount.toFixed(2) } : {}),
        ...(inc.storageCost != null ? { 'Storage Cost': inc.storageCost.toFixed(2) } : {}),
        ...(inc.recoveryCost != null ? { 'Recovery Cost': inc.recoveryCost.toFixed(2) } : {}),
        ...(inc.piCost      != null ? { 'PI Cost': inc.piCost.toFixed(2) } : {}),
      }
    } else {
      const exp = e as any
      const itemTotals = exp.items.map((it: any) =>
        `${it.type}: ${it.quantity}×${it.unitPrice.toFixed(2)}${it.vat?' (+VAT)':''}`
      ).join(' | ')
      return {
        ...common,
        Type: 'Expense',
        'Items': itemTotals,
        'Total Cost': exp.totalCost.toFixed(2),
      }
    }
  })

  exportToExcel(rows, 'share_entries')
}
