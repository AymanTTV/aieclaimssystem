// src/types/vatRecord.ts

export type RecurringFrequency = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'biannually' | 'yearly';

export interface VATRecordDescription {
  id: string;
  description: string;
  net: number;
  includeVAT: boolean;
  vat: number;
  gross: number;
  vType?: string; 
}

export interface VATRecord {
  id: string;
  receiptNo: string;
  accountant: string;
  supplier: string;
  regNo: string;
  categoryId?: string;
  categoryName?: string;
  descriptions: VATRecordDescription[];
  net: number;
  vat: number;
  gross: number;
  customerName: string;
  customerId?: string;
  status: 'awaiting' | 'processing' | 'paid';
  notes?: string;
  vatNo?: string;
  date: Date;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  vatReceived?: number;
  documentUrl?: string;
  accountNo?: string;
  dueDate?: Date;

  // --- NEW: Recurring Fields ---
  isRecurring?: boolean;
  recurringFrequency?: RecurringFrequency;
  nextRecurringDate?: Date | any; // Timestamp or Date
  // ---------------------------
}