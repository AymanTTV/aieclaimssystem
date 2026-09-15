// src/types/finance.ts

export type RecurringFrequency = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'biannually' | 'yearly';

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
  allocatedVehicleId?: string;
  allocatedVehicleName?: string;
}

export interface Transaction {
  id: string;
  type: 'income' | 'expense';
  netAmount?: number;
  vatAmount?: number;
  
  customerId?: string;
  customerName?: string;
  category: string;
  amount: number;
  description: string;
  date: Date;
  referenceId?: string;
  vehicleId?: string;
  vehicleName?: string;
  groupId?: string;
  groupName?: string;
  departmentId?: string; // NEW
  departmentName?: string; // NEW
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
  
  accountsFrom?: string[];
  accountsTo?: string[];
  
  isRecurring?: boolean;
  recurringFrequency?: RecurringFrequency;
  nextRecurringDate?: Date | any;

  documentUrl?: string;
  receiptUrl?: string;
}

export interface Account {
  id: string;
  name: string;
  balance: number;
  createdAt: Date;
  updatedAt: Date;
}

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
  vehicleId?: string;
  vehicleName?: string;
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
  amount: number;
  paidAmount: number;
  remainingAmount: number;
  category: string;
  customCategory?: string;
  
  description?: string;
  groupId?: string;
  departmentId?: string; // NEW
  departmentName?: string; // NEW

  vehicleId?: string;
  vehicleName?: string;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  paymentStatus: 'pending' | 'partially_paid' | 'paid' | 'overdue' | 'unpaid';
  documentUrl?: string;
  payments: InvoicePayment[];
  createdAt: Date;

  accountId?: string;
  accountName?: string;
  
  updatedAt: Date;
  
  isRecurring?: boolean;
  recurringFrequency?: RecurringFrequency;
}