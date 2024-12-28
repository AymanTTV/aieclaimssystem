export interface Transaction {
  id: string;
  type: 'income' | 'expense';
  category: string;
  amount: number;
  description: string;
  date: Date;
  referenceId?: string;
  vehicleId?: string;
  vehicleOwner?: {
    name: string;
    isDefault: boolean;
  };
  paymentStatus: 'paid' | 'unpaid' | 'partially_paid';
  paidAmount?: number;
  remainingAmount?: number;
  paymentMethod?: 'cash' | 'card' | 'bank_transfer' | 'cheque';
  paymentReference?: string;
  status?: 'pending' | 'completed' | 'cancelled';
  createdAt: Date;
}