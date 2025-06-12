import { exportToExcel } from './excel';
import { IncomeExpenseEntry, ProfitShare } from '../types/incomeExpense';
import { format } from 'date-fns';

export function handleIncomeExpenseExport(
  entries: IncomeExpenseEntry[],
  shares?: ProfitShare[]
) {
  // Income & Expense Records
  const mainRows = entries.map((e) => {
    const base = {
      Date: format(new Date(e.date), 'dd/MM/yyyy'),
      Customer: e.customer,
      Reference: e.reference,
      Type: e.type === 'income' ? 'Income' : 'Expense',
      Status: e.status,
      Progress: e.progress || '—',
      Description: e.description,
      Quantity: e.quantity,
      Unit: e.unit,
      Net: e.net.toFixed(2),
      VAT: e.vat ? '20%' : '0%',
      Total: e.total.toFixed(2)
    };

    return base;
  });

  // Profit Share Breakdown
  const shareRows: any[] = [];

  if (shares && shares.length > 0) {
    shares.forEach((share) => {
      share.recipients.forEach((rec) => {
        shareRows.push({
          'Share Start': share.startDate,
          'Share End': share.endDate,
          Recipient: rec.name,
          Percentage: `${rec.percentage}%`,
          Amount: rec.amount.toFixed(2)
        });
      });

      // Add a total row after each share
      shareRows.push({
        'Share Start': '',
        'Share End': '',
        Recipient: 'TOTAL',
        Percentage: '',
        Amount: share.totalSplitAmount.toFixed(2)
      });
    });
  }

  // Export
  exportToExcel(
    { 'Income & Expense Records': mainRows, 'Profit Shares': shareRows },
    'income_expense_summary'
  );
}
