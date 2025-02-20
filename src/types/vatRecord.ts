// src/types/vatRecord.ts

export interface VATRecord {
  id: string;
  receiptNo: string;
  accountant: string;
  supplier: string;
  regNo: string;
  description: string;
  gross: number;
  vatPercentage: number;
  vat: number;
  net: number;
  vatReceived: number;
  customerName: string;
  customerId?: string;
  status: 'awaiting' | 'processing' | 'paid';
  notes?: string;
  date: Date;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}
