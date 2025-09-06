// src/types/rental.ts

export type RentalType = 'daily' | 'weekly' | 'claim';
export type RentalReason =
  | 'hired'
  | 'claim'
  | 'o/d'
  | 'staff'
  | 'workshop'
  | 'c-substitute'
  | 'h-substitute';
export type RentalStatus = 'scheduled' | 'active' | 'completed' | 'cancelled';
export type PaymentStatus = 'pending' | 'partially_paid' | 'paid';
export type PaymentMethod = 'cash' | 'card' | 'bank_transfer' | 'cheque';

export type FuelLevel = '0' | '25' | '50' | '75' | '100';

export interface VehicleOwner {
  name: string;
  isDefault?: boolean;
}

export interface Vehicle {
  id: string;
  make: string;
  model: string;
  registrationNumber: string;
  mileage: number;
  dailyRentalPrice?: number | null;
  weeklyRentalPrice?: number | null;
  claimRentalPrice?: number | null;
  owner?: VehicleOwner;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  mobile: string;
  address?: string;
  driverLicenseNumber?: string;
  licenseExpiry?: Date; // Firestore Timestamp is compatible at runtime
  signature?: string;
}

export interface RentalPayment {
  id: string;
  date: Date; // Firestore Timestamp is compatible at runtime
  amount: number;
  method: PaymentMethod;
  reference?: string;
  notes?: string;
  createdAt: Date;
  createdBy: string; // user id
  receiptUrl?: string;
}

export interface VehicleCondition {
  id: string;
  type: 'check-out' | 'check-in';
  date: Date; // Firestore Timestamp compatible
  mileage: number;
  fuelLevel: FuelLevel;
  isClean: boolean;
  hasDamage: boolean;
  damageDescription?: string;
  images: string[];
  notes?: string;
  createdAt: Date;
  createdBy: string;
}

export interface ReturnCondition extends VehicleCondition {
  type: 'check-in';
  damageCost: number;
  fuelCharge: number;
  cleaningCharge: number;
  totalCharges: number;
}

export interface RentalDocuments {
  agreement?: string;
  invoice?: string;
  permit?: string;

  // Claim docs
  conditionOfHire?: string;
  noticeOfRightToCancel?: string;
  hireAgreement?: string;
  creditStorageAndRecovery?: string;
  creditHireMitigation?: string;
  satisfactionNotice?: string;

  // Allow future keys while maintaining index signature
  [key: string]: string | undefined;
}

export interface ExtensionEntry {
  date: Date;
  userId: string;
  previousEndDate: Date;
  newEndDate: Date;
  notes?: string;
}

export interface Claim {
  id: string;
  clientRef?: string | null;
  clientInfo?: { name: string };
  clientVehicle?: { registration?: string };
  [key: string]: any;
}

export interface Rental {
  id: string;

  vehicleId: string;
  customerId: string;

  startDate: Date;
  endDate: Date;

  originalStartDate?: Date; 

  type: RentalType;
  reason: RentalReason;
  status: RentalStatus;

  // Financials (final 'cost' is after discount, before any future overdue/return charges)
  cost: number;
  standardCost?: number;

  includeVAT: boolean;

  // Extra line items (+ their VAT flags)
  deliveryCharge?: number | null;
  collectionCharge?: number | null;
  insurancePerDay?: number | null;
  deliveryChargeIncludeVAT?: boolean;
  collectionChargeIncludeVAT?: boolean;
  insurancePerDayIncludeVAT?: boolean;

  // Claim-only extras (+ storage VAT flag/value)
  claimRef?: string | null;
  storageStartDate?: Date | null;
  storageEndDate?: Date | null;
  storageCostPerDay?: number | null;
  storageDays?: number | null;
  includeStorageVAT?: boolean | null;
  storageCost?: number | null;

  // Recovery (+ VAT flag)
  recoveryCost?: number | null;
  includeRecoveryCostVAT?: boolean | null;

  // Negotiation
  negotiatedRate?: number | null;
  negotiationNotes?: string | null;

  // Discount
  discountPercentage?: number | null;
  discountAmount?: number | null;
  discountNotes?: string | null;

  // Weekly
  numberOfWeeks?: number | null;

  // Payments
  paidAmount?: number;
  remainingAmount?: number;
  paymentStatus?: PaymentStatus;
  payments?: RentalPayment[];

  // Signature
  signature?: string | null;

  // Conditions
  checkOutCondition?: VehicleCondition;
  checkInCondition?: VehicleCondition;
  returnCondition?: ReturnCondition;

  // Docs
  documents?: RentalDocuments;

  // Misc
  ongoingCharges?: number;
  extensionHistory?: ExtensionEntry[];

  // Audit
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy: string;

  // Optional flat fields captured at creation/edit time
  paymentMethod?: PaymentMethod;
  paymentReference?: string | null;
}
