export interface Transaction {
  id: string;
  type: 'income' | 'expense';
  category: string;
  amount: number;
  description: string;
  date: Date;
  referenceId?: string;
  vehicleId?: string;
  vehicleOwner?: {
    name: string;
    isDefault: boolean;
  };
  paymentStatus: 'paid' | 'unpaid' | 'partially_paid';
  paidAmount?: number;
  remainingAmount?: number;
  paymentMethod?: 'cash' | 'card' | 'bank_transfer' | 'cheque';
  paymentReference?: string;
  status?: 'pending' | 'completed' | 'cancelled';
  createdAt: Date;
}

// src/types/finance.ts
export interface Invoice {
  id: string;
  date: Date;
  dueDate: Date;
  status: 'paid' | 'unpaid';
  amount: number;
  category: string;
  customCategory?: string;
  vehicleId?: string;
  customerId?: string; // Add this
  customerName?: string; // Add this for manual entry
  description: string;
  paymentStatus: 'pending' | 'paid' | 'overdue';
  documentUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}


