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
  ongoingCharges: number;
  negotiatedRate?: number | null;
  negotiationNotes?: string | null;
  discountPercentage?: number | null;
  discountAmount?: number | null;
  discountNotes?: string | null;
  paymentMethod?: 'cash' | 'card' | 'bank_transfer' | 'cheque';
  paymentReference?: string;
  standardCost?: number;
  negotiated?: boolean;
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
  checkOutCondition?: VehicleCondition;
  checkInCondition?: ReturnCondition;
  checkOutCondition?: VehicleCondition;
  returnCondition?: ReturnCondition;
}

export interface VehicleCondition {
  id: string;
  type: 'check-in' | 'check-out';
  date: Date;
  mileage: number;
  fuelLevel: '0' | '25' | '50' | '75' | '100';
  isClean: boolean;
  hasDamage: boolean;
  damageDescription?: string;
  images: string[];
  createdAt: Date;
  createdBy: string;
}

export interface ReturnCondition extends VehicleCondition {
  damageCost?: number;
  fuelCharge?: number;
  cleaningCharge?: number;
  totalCharges: number;
}

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
  negotiated?: boolean;
  negotiationNotes?: string;
  approvedBy?: string;
  standardCost?: number;
}

export type PaymentStatus = 'pending' | 'paid' | 'partially_paid' | 'overdue';
export type RentalType = 'daily' | 'weekly' | 'claim';
export type RentalStatus = 'scheduled' | 'active' | 'completed' | 'cancelled';
export type RentalReason = 'hired' | 'claim' | 'o/d' | 'staff' | 'workshop' | 'c-substitute' | 'h-substitute';

export interface RentalExtension {
  id: string;
  date: Date;
  originalEndDate: Date;
  newEndDate: Date;
  cost: number;
  negotiated?: boolean;
  negotiationNotes?: string;
  approvedBy?: string;
}
