export interface RentalPayment {
  id: string;
  date: Date;
  amount: number;
  method: 'cash' | 'card' | 'bank_transfer' | 'cheque';
  reference?: string;
  document?: string;
  notes?: string;
  createdAt: Date;
  createdBy: string;
}

export interface Rental {
  id: string;
  vehicleId: string;
  customerId: string;
  startDate: Date;
  endDate: Date;
  type: RentalType;
  reason: RentalReason;
  status: RentalStatus;
  paymentStatus: PaymentStatus;
  cost: number;
  paidAmount: number;
  remainingAmount: number;
  paymentMethod?: 'cash' | 'card' | 'bank_transfer' | 'cheque';
  paymentReference?: string;
  standardCost?: number;
  negotiated?: boolean;
  negotiationNotes?: string;
  approvedBy?: string;
  numberOfWeeks?: number;
  extensionHistory?: RentalExtension[];
  payments: RentalPayment[];
  documents?: {
    agreement?: string;
    invoice?: string;
  };
  signature?: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  updatedBy?: string;
}

export type PaymentStatus = 'pending' | 'paid' | 'partially_paid' | 'overdue';
export type RentalType = 'daily' | 'weekly' | 'claim';
export type RentalStatus = 'scheduled' | 'active' | 'completed' | 'cancelled';
export type RentalReason = 'hired' | 'claim' | 'o/d' | 'staff' | 'workshop' | 'c-substitute' | 'h-substitute';