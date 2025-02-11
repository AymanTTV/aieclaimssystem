// src/types/driverPay.ts

export type CollectionPoint = 'OFFICE' | 'CC' | 'ABDULAZIZ' | 'OTHER';
export type PaymentStatus = 'unpaid' | 'partially_paid' | 'paid';

export interface DriverPay {
  id: string;
  driverNo: string;
  tidNo: number;
  name: string;
  phoneNumber: string;
  collection: CollectionPoint;
  customCollection?: string; // For 'OTHER' collection point
  startDate: Date;
  endDate: Date;
  totalAmount: number;
  commissionPercentage: number;
  commissionAmount: number;
  netPay: number;
  paidAmount: number;
  remainingAmount: number;
  status: PaymentStatus;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  payments: Payment[];
}

export interface Payment {
  id: string;
  date: Date;
  amount: number;
  method: 'cash' | 'bank_transfer' | 'cheque';
  reference?: string;
  notes?: string;
  createdBy: string;
  createdAt: Date;
}
