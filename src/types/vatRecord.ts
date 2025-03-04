// src/types/vatRecord.ts

export interface VATRecordDescription {
  id: string;
  description: string;
  net: number;
  includeVAT: boolean;
  vat: number;
  gross: number;
  vType?: string; // Change to string
}

export interface VATRecord {
  id: string;
  receiptNo: string;
  accountant: string;
  supplier: string;
  regNo: string;
  descriptions: VATRecordDescription[];
  net: number; // Total NET from all descriptions
  vat: number; // Total VAT from all descriptions
  gross: number; // Total GROSS from all descriptions
  customerName: string;
  customerId?: string;
  status: 'awaiting' | 'processing' | 'paid';
  notes?: string;
  date: Date;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}