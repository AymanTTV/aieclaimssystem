export interface InvoicePayment {
  id: string;
  date: Date;
  amount: number;
  method: 'cash' | 'card' | 'bank_transfer' | 'cheque';
  reference?: string;
  document?: string;
  notes?: string;
  createdAt: Date;
  createdBy: string;
}

export interface Transaction {
  id: string;
  type: 'income' | 'expense' | 'transfer';
  category: string;
  amount: number;
  description: string;
  date: Date;
  referenceId?: string;
  vehicleId?: string;
  vehicleName?: string;
  vehicleOwner?: {
    name: string;
    isDefault: boolean;
  };
  customCategory?: string;
  paymentStatus: 'paid' | 'unpaid' | 'partially_paid';
  paidAmount?: number;
  remainingAmount?: number;
  paymentMethod?: 'cash' | 'card' | 'bank_transfer' | 'cheque';
  paymentReference?: string;
  status?: 'pending' | 'completed' | 'cancelled';
  createdAt: Date;
  createdBy: string;
  accountFrom?: string;
  accountTo?: string;
}

export interface Account {
  id: string;
  name: string;
  balance: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface TransferHistory {
  id: string;
  fromAccount: string;
  toAccount: string;
  amount: number;
  description?: string;
  date: Date;
  createdBy: string;
  createdAt: Date;
}

export interface Invoice {
  id: string;
  date: Date;
  dueDate: Date;
  amount: number;
  paidAmount: number;
  remainingAmount: number;
  category: string;
  customCategory?: string;
  vehicleId?: string;
  customerId?: string;
  customerName?: string;
  description: string;
  paymentStatus: 'pending' | 'partially_paid' | 'paid' | 'overdue';
  documentUrl?: string;
  payments: InvoicePayment[];
  createdAt: Date;
  updatedAt: Date;
}