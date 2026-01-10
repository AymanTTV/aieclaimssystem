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
  
  date: string;       // Main Transaction Date (ISO string)
  fromDate?: string;  // NEW: Informational From Date
  toDate?: string;    // NEW: Informational To Date

  status: 'Paid' | 'Unpaid' | 'Partially Paid' | 'Pending';
  description: string;
  unit: string;
  note: string;
  quantity: number;
  
  // Financials
  net: number;
  vat: boolean;
  
  // Commission
  commissionPct?: number;
  commissionAmount?: number;

  total: number;
  
  progress?: 'in-progress' | 'completed';
  createdBy: string;
  updatedAt: string;
  createdAt?: string; 

  // Recurring Fields
  isRecurring?: boolean;
  recurringFrequency?: RecurringFrequency;
  nextRecurringDate?: string | null; 
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