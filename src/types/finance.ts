// src/types/finance.ts

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
  type: 'income' | 'expense'; // Removed 'transfer'
  customerId?: string;
  customerName?: string;
  category: string;
  amount: number; // Represents the TOTAL amount of the transaction
  description: string;
  date: Date;
  referenceId?: string; // Primarily for linking to external docs like Invoices now
  vehicleId?: string;
  vehicleName?: string;
  groupId?: string;
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
  updatedAt?: Date;
  updatedBy?: string;
  // --- Use arrays for accounts ---
  accountsFrom?: string[]; // Array of account IDs debited (for Expense)
  accountsTo?: string[];   // Array of account IDs credited (for Income)
  // ---
  documentUrl?: string;
  receiptUrl?: string;
}

export interface Account {
  id: string;
  name: string;
  balance: number; // Stored balance (not used for real-time calculation)
  createdAt: Date;
  updatedAt: Date;
}

// TransferHistory might be less relevant now
export interface TransferHistory {
  id:string;
  fromAccount: string;
  toAccount: string;
  amount: number;
  description?: string;
  date: Date;
  createdBy: string;
  createdAt: Date;
}

export interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  includeVAT: boolean;
}

export interface Invoice {
  id: string;
  invoiceNumber?: string;
  date: Date;
  dueDate: Date;
  isLoan?: boolean;
  lineItems: InvoiceLineItem[];
  subTotal: number;
  vatAmount: number;
  total: number;
  amount: number; // Legacy alias for total
  paidAmount: number;
  remainingAmount: number;
  category: string;
  customCategory?: string;
  vehicleId?: string;
  vehicleName?: string; // <-- ADDED
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  paymentStatus: 'pending' | 'partially_paid' | 'paid' | 'overdue' | 'unpaid';
  documentUrl?: string;
  payments: InvoicePayment[];
  createdAt: Date;
  updatedAt: Date;
}