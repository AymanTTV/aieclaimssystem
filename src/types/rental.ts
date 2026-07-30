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
  motExpiry?: Date;
  roadTaxExpiry?: Date;

  dailyInsuranceAmount?: number | null;
  weeklyInsuranceAmount?: number | null;
  claimInsuranceAmount?: number | null;
}

export interface RentalNote {
  id: string;
  text: string;
  createdAt: Date;
  createdBy: string;
  createdByName?: string;
  updatedAt?: Date;
}

export interface RentalExtraCharge {
  id: string;
  name: string;
  amount: number;
}

// ✅ NEW: Discount History Interface
export interface RentalDiscount {
  id: string;
  percentage: number;
  amount: number;
  reason: string; 
  createdAt: Date;
  createdBy: string;
  applyTo?: 'base' | 'insurance'; // ADD THIS LINE
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  mobile: string;
  address?: string;
  driverLicenseNumber?: string;
  issueNumber?: string;
  countryOfIssue?: string;
  licenseValidFrom?: Date;
  licenseExpiry?: Date;
  dateOfBirth?: Date;
  badgeNumber?: string;
  signature?: string;
}

export interface RentalPayment {
  id: string;
  date: Date;
  amount: number;
  method: PaymentMethod;
  reference?: string;
  notes?: string;
  createdAt: Date;
  createdBy: string;
  receiptUrl?: string;
  allocatedVehicleId?: string;
  allocatedVehicleName?: string;
}

export interface VehicleCondition {
  id: string;
  type: 'check-out' | 'check-in';
  date: Date;
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
  agreements?: Record<string, string>;
  invoice?: string;
  permit?: string;
  conditionOfHire?: string;
  noticeOfRightToCancel?: string;
  hireAgreement?: string;
  creditStorageAndRecovery?: string;
  creditHireMitigation?: string;
  satisfactionNotice?: string;
  claimDocuments?: Record<string, string>;
  [key: string]: string | undefined | Record<string, string>;
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
  clientInfo?: {
    name: string;
    phone?: string;
    email?: string;
    dateOfBirth?: Date;
    driverLicenseNumber?: string;
    licenseExpiry?: Date;
    address?: string;
    signature?: string;
  };
  clientVehicle?: {
    registration?: string;
    documents?: any;
    motExpiry?: Date;
    roadTaxExpiry?: Date;
  };
  [key: string]: any;
}

export interface HireSubstitutionDetails {
  make: string;
  model: string;
  registration: string;
  loaner?: string;
  givenAt: Date;
  expectedReturnAt: Date;
  returnCondition?: ReturnCondition;
  notes?: string;
  mileage?: number;
  fuelLevel?: string;
  isClean?: boolean;
  hasDamage?: boolean;
  damageDescription?: string;
  images?: string[];
}

export interface Rental {
  id: string;
  rentalAgreementNumber?: string;
  vehicleId: string;
  customerId: string;

  startDate: Date;
  endDate: Date;
  originalStartDate?: Date;
  expectedReturnDate?: Date;

  type: RentalType;
  reason: RentalReason;
  status: RentalStatus;

  cost: number;
  standardCost?: number;
  
  lockedDailyRate?: number;
  lockedWeeklyRate?: number;
  lockedClaimRate?: number;

  includeVAT: boolean;
  deliveryChargeIncludeVAT?: boolean;
  collectionChargeIncludeVAT?: boolean;
  insurancePerDayIncludeVAT?: boolean;
  insurancePerWeekIncludeVAT?: boolean;

  deliveryCharge?: number;
  collectionCharge?: number;
  insurancePerDay?: number | null;
  insurancePerWeek?: number | null;

  extraCharges?: RentalExtraCharge[];
  
  // ✅ NEW: Array to hold discount history
  discounts?: RentalDiscount[];

  claimRef?: string | null;
  notes?: RentalNote[];

  storageStartDate?: Date | null;
  storageEndDate?: Date | null;
  storageCostPerDay?: number | null;
  storageDays?: number | null;
  includeStorageVAT?: boolean | null;
  storageCost?: number | null;

  recoveryCost?: number | null;
  includeRecoveryCostVAT?: boolean | null;

  negotiatedRate?: number | null;
  negotiationNotes?: string | null;

  discountPercentage?: number | null;
  discountAmount?: number | null;
  discountNotes?: string | null;

  numberOfWeeks?: number | null;

  paidAmount?: number;
  remainingAmount?: number;
  paymentStatus?: PaymentStatus;
  payments?: RentalPayment[];

  signature?: string | null;

  checkOutCondition?: VehicleCondition;
  checkInCondition?: VehicleCondition;
  returnCondition?: ReturnCondition;

  documents?: RentalDocuments;
  hireSubstitutionDetails?: HireSubstitutionDetails[] | null;

  ongoingCharges?: number;
  extensionHistory?: ExtensionEntry[];

  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy: string;

  paymentMethod?: PaymentMethod;
  paymentReference?: string | null;
  paymentNotes?: string | null;
}

export const DEFAULT_RENTAL_PRICES = {
  daily: 60,
  weekly: 360,
  claim: 340,
} as const;