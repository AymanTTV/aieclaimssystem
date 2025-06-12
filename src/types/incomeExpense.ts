// src/types/incomeExpense.ts

/** A single recipient's profit share */
export interface Recipient {
  name: string;
  percentage: number;
  amount: number;
}

/** A recorded income or expense entry */
export interface IncomeExpenseEntry {
  id: string;
  type: 'income' | 'expense';
  customer: string;
  customerId: string;
  reference: string;
  date: string;
  status: 'Paid' | 'Unpaid' | 'Partially Paid' | 'Pending';
  description: string;
  unit: string;
  note:string;
  quantity: number;
  net: number;
  vat: boolean;
  total: number;
  progress?: 'in-progress' | 'completed';
  createdBy: string;
  updatedAt: string;
}

/** A single expense line item */
export interface ExpenseItem {
  type: string;
  description: string;
  quantity: number;
  unitPrice: number;
  vat: boolean;
}


/** A profit share split */
export interface ProfitShare {
  id: string;
  startDate: string;
  endDate: string;
  recipients: Recipient[];
  totalSplitAmount: number;
  createdAt: string;
  createdBy: string;
}
