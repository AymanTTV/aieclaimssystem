export interface Transaction {
  id: string;
  type: 'income' | 'expense';
  category: string;
  amount: number;
  description: string;
  date: Date;
  referenceId?: string;
  vehicleId?: string;
  status?: 'pending' | 'completed' | 'cancelled';
  createdAt: Date;
}