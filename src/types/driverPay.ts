// src/types/driverPay.ts

export type CollectionPoint = 'OFFICE' | 'CC' | 'ABDULAZIZ' | 'OTHER';
export type PaymentStatus = 'unpaid' | 'partially_paid' | 'paid';

export interface PaymentPeriod {
  id: string;
  startDate: Date;
  endDate: Date;
  totalAmount: number;
  commissionPercentageA: number;
  commissionPercentageB: number;
  commissionAmountA: number;    
  commissionAmountB: number;    
  netPay: number;
  paidAmount: number;
  remainingAmount: number;
  status: PaymentStatus;
  payments: Payment[];
  notes?: string; 
}

export interface DriverPay {
  id: string;
  driverNo: string;
  tidNo: number;
  name: string;
  phoneNumber: string;
  collection: CollectionPoint;
  customCollection?: string; 
  startDate: Date;
  endDate: Date;
  totalAmount: number;
  commissionPercentageA: number;
  commissionPercentageB: number;
  commissionAmountA: number;    
  commissionAmountB: number;    
  netPay: number;
  paidAmount: number;
  remainingAmount: number;
  status: PaymentStatus;
  paymentPeriods: PaymentPeriod[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  payments: Payment[];
  isLocked?: boolean; 
  groupId?: string;    // ADDED
  groupName?: string;  // ADDED
  defaultCommissionA?: number; // 🟢 Added to store driver's preferred default for A
  defaultCommissionB?: number; // 🟢 Added to store driver's preferred default for B
}

export interface Payment {
  id: string;
  date: Date;
  amount: number;
  method: 'cash' | 'bank_transfer' | 'cheque';
  reference?: string;
  periodId: string;
  notes?: string;
  createdBy: string;
  createdAt: Date;
}