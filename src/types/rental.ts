// Update the Rental interface to include payment tracking
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
  paidAmount?: number;
  remainingAmount?: number;
  paymentMethod?: 'cash' | 'card' | 'bank_transfer' | 'cheque';
  paymentReference?: string;
  standardCost?: number;
  negotiated?: boolean;
  negotiationNotes?: string;
  approvedBy?: string;
  numberOfWeeks?: number;
  extensionHistory?: RentalExtension[];
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  updatedBy?: string;
}

export type PaymentStatus = 'pending' | 'paid' | 'partially_paid' | 'overdue';