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
  status: 'scheduled' | 'hired' | 'claim' | 'completed' | 'cancelled';
  paymentStatus: 'pending' | 'paid' | 'overdue';
  type: 'daily' | 'weekly' | 'claim';
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