// src/types/pettyCash.ts

export interface PettyCashTransaction {
  id: string;
  name: string;
  telephone: string;
  description: string;
  amountIn: number;
  amountOut: number;
  note?: string;
  status: 'pending' | 'paid' | 'unpaid';
  date: Date;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  // Added fields that are saved by the form
  categoryId?: string;
  categoryName?: string;
  groupId?: string;
  groupName?: string;
  // Removed 'balance' as it's not a stored field
}