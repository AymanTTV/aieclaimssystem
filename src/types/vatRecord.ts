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
  vatReceived?: number; // Add this line
  documentUrl?: string; //Add if not already present
}