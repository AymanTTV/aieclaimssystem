export interface PettyCashTransaction {
  id: string;
  name: string;
  telephone: string;
  description: string;
  amountIn: number;
  amountOut: number;
  balance: number;
  note?: string;
  status: 'pending' | 'paid' | 'unpaid';
  date: Date;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}