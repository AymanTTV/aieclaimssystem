// src/types/incomeExpense.ts

export type RecurringFrequency = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'biannually' | 'yearly';

export interface Recipient {
  name: string;
  percentage: number;
  amount: number;
}

export interface IncomeExpenseEntry {
  id: string;
  type: 'income' | 'expense';
  customer: string; 
  customerId: string;
  customerPhone?: string;
  customerEmail?: string;
  customerAddress?: string;
  category?: string;
  reference: string;
  date: string; // ISO string
  status: 'Paid' | 'Unpaid' | 'Partially Paid' | 'Pending';
  description: string;
  unit: string;
  note: string;
  quantity: number;
  net: number;
  vat: boolean;
  total: number;
  progress?: 'in-progress' | 'completed';
  createdBy: string;
  updatedAt: string;
  createdAt?: string; 

  // --- NEW: Recurring Fields ---
  isRecurring?: boolean;
  recurringFrequency?: RecurringFrequency;
  nextRecurringDate?: string | null; // Storing as string (YYYY-MM-DD) or ISO
  // ---------------------------
}

export interface ExpenseItem {
  type: string;
  description: string;
  quantity: number;
  unitPrice: number;
  vat: boolean;
}

export interface ProfitShare {
  id: string;
  startDate: string;
  endDate: string;
  recipients: Recipient[];
  totalSplitAmount: number;
  createdAt: string;
  createdBy: string;
}