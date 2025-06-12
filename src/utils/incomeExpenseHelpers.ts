import { IncomeExpenseEntry } from '../types/incomeExpense';

/**
 * Calculates the total for an income entry.
 */
export function calculateIncomeTotal(entry: IncomeExpenseEntry): number {
  if (entry.type !== 'income') return 0;
  return entry.vat ? entry.net * 1.2 : entry.net;
}

/**
 * Calculates the total for an expense entry.
 */
export function calculateExpenseTotal(entry: IncomeExpenseEntry): number {
  if (entry.type !== 'expense') return 0;
  return entry.vat ? entry.net * 1.2 : entry.net;
}

/**
 * Formats VAT as readable text.
 */
export function formatVAT(vat: boolean): string {
  return vat ? '20%' : '0%';
}
