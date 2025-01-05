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