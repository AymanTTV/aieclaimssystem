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
  type: 'income' | 'expense' | 'EXPENSE' | 'INCOME';
  transactionType?: 'EXPENSE' | 'INCOME';
  entryType?: 'DEBIT' | 'CREDIT';
  netAmount?: number;
  vatAmount?: number;
  
  customerId?: string;
  customerName?: string;
  category: string;
  amount: number;
  description: string;
  date: Date;
  referenceId?: string;
  invoiceId?: string;
  orderId?: string;
  orderNumber?: string;
  invoiceNumber?: string;
  vehicleId?: string;
  vehicleName?: string;
  groupId?: string;
  groupName?: string;
  departmentId?: string;
  departmentName?: string;
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

  // Subcontractor Cost & Profit Tracking
  grossBilling?: number;
  paid?: number;
  subcontractorCost?: number;
  dealerCost?: number;
  customerBilled?: number;
  netProfit?: number;
  profitMarginPercent?: number;
  profitMargin?: number;
  isProfitEdited?: boolean;
  isEdited?: boolean;
  linkedInvoiceRef?: string;
  linkedMaintenanceRecord?: any;

  // Unified Financial Record Schema & Cross-Module Synchronization Fields
  entityId?: string;
  entityType?: 'RENTAL' | 'INVOICE' | 'MAINTENANCE';
  vatType?: string;
  completionStatus?: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  auditLogs?: Array<{
    id?: string;
    timestamp: Date | string | any;
    modifiedBy: string;
    modifiedByName?: string;
    field?: string;
    previousValue: any;
    newValue: any;
    reason?: string;
  }>;

  documentUrl?: string;
  receiptUrl?: string;
}

export interface SharedOwnerShare {
  accountId?: string;
  ownerName: string;
  sharePercentage: number;
  isCompany?: boolean;
}

export interface ProfitPayoutRecord {
  id: string;
  vehicleId?: string;
  vehicleName?: string;
  accountId?: string;
  accountName?: string;
  datePaid: Date | any;
  periodCovered: string;
  grossBilled: number;
  expenses: number;
  totalProfit: number;
  companySharePct: number;
  companyShareAmount: number;
  companyAccountId?: string;
  companyAccountName?: string;
  ownerSharePct: number;
  ownerShareAmount: number;
  ownerName: string;
  payoutReference: string;
  transferTransactionId?: string;
  payoutTransactionId?: string;
  clearedBalanceAmount?: number;
  status: 'completed' | 'cleared';
  createdAt: Date | any;
  createdBy?: string;
  notes?: string;
}

export interface Account {
  id: string;
  name: string;
  accountName?: string;
  accountType?: 'bank' | 'cash' | 'card' | 'savings' | 'escrow' | 'general' | string;
  balance: number;
  vehicleId?: string | null;
  vehicleName?: string | null;
  isSharedOwnership?: boolean;
  sharedOwnership?: SharedOwnerShare[];
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

export interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  includeVAT: boolean;
  vehicleId?: string;
  vehicleName?: string;
  subcontractorCost?: number;
  customerBilled?: number;
  netProfit?: number;
  profitMarginPercent?: number;
}

export interface Invoice {
  id: string;
  orderId?: string;
  orderNumber?: string;
  invoiceNumber?: string;
  referenceId?: string;
  date: Date;
  dueDate: Date;
  isLoan?: boolean;
  loanTransactionType?: 'expense' | 'income';
  lineItems: InvoiceLineItem[];
  subTotal: number;
  vatAmount: number;
  total: number;
  amount: number;
  subcontractorCost?: number;
  dealerCost?: number;
  customerBilled?: number;
  netProfit?: number;
  profitMarginPercent?: number;
  profitMargin?: number;
  isProfitEdited?: boolean;
  isEdited?: boolean;
  entityId?: string;
  entityType?: 'INVOICE';
  vatType?: string;
  completionStatus?: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  paidAmount: number;
  remainingAmount: number;
  category: string;
  customCategory?: string;
  
  description?: string;
  groupId?: string;
  departmentId?: string;
  departmentName?: string;

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
