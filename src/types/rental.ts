export type RentalReason = 'hired' | 'claim' | 'o/d' | 'staff' | 'workshop' | 'wfw-c-substitute' | 'h-substitute';
export type RentalStatus = 'urgent' | 'awaiting' | 'levc-loan' | 'completed';
export type RentalType = 'daily' | 'weekly' | 'claim';

export interface Rental {
  id: string;
  vehicleId: string;
  customerId: string;
  startDate: Date;
  endDate: Date;
  cost: number;
  standardCost?: number;
  negotiated?: boolean;
  negotiationNotes?: string;
  approvedBy?: string;
  reason: RentalReason;
  status: RentalStatus;
  paymentStatus: 'pending' | 'paid' | 'overdue';
  type: RentalType;
  numberOfWeeks?: number;
  extensionHistory?: RentalExtension[];
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  updatedBy?: string;
}

export interface RentalExtension {
  date: Date;
  originalEndDate: Date;
  newEndDate: Date;
  cost: number;
  approvedBy?: string;
  negotiated?: boolean;
  negotiationNotes?: string;
}