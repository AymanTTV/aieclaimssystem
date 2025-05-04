// src/types/share.ts

export interface Expense {
  type: string;
  description: string;
  amount: number;
  vat: boolean;
}

export type Progress = 'in-progress' | 'completed';

export interface ShareRecord {
  id?: string;
  clientName: string;
  reason: string; // e.g. "VDHPI"
  vdProfit: number;
  actualPaid: number;
  vehicleRunningCost: number;
  legalFeePercentage: number;
  legalFeeCost: number;
  startDate?: string; // ISO date
  endDate?: string;   // ISO date
  vHireAmount?: number;
  expenses: Expense[];
  totalNet: number;
  
  aieSkylinePercentage: number;
  aieSkylineAmount: number;
  abdulAzizPercentage: number;
  abdulAzizAmount: number;
  jayPercentage: number;
  jayAmount: number;
  
  progress: Progress;
}
