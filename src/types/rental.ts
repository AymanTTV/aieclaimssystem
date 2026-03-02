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

  // Expiries
  motExpiry?: Date;
  roadTaxExpiry?: Date;

  // ✅ Insurance amounts (used by NEW RentalForm auto-fill)
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
  updatedAt?: Date; //
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  mobile: string;
  address?: string;
  driverLicenseNumber?: string;
  // ✅ NEW FIELDS for PDF
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
  createdBy: string; // user id
  receiptUrl?: string;
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
  // NEW: Stores multiple agreement versions
  agreements?: Record<string, string>; // { "agreement_1678886400000": "url" }

  invoice?: string;
  permit?: string;

  // Claim docs (flat keys)
  conditionOfHire?: string;
  noticeOfRightToCancel?: string;
  hireAgreement?: string;
  creditStorageAndRecovery?: string;
  creditHireMitigation?: string;
  satisfactionNotice?: string;

  // Optional grouped claim docs (if your generator returns a map)
  claimDocuments?: Record<string, string>;

  // Allow future keys while supporting agreements/claimDocuments maps
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

// NEW: For "H Substitute" reason
export interface HireSubstitutionDetails {
  make: string;
  model: string;
  registration: string;
  loaner: string;
  givenAt: Date | string;
  expectedReturnAt: Date | string;
  notes: string;
  
  // Check-out condition (added previously)
  mileage?: number;
  fuelLevel?: FuelLevel;
  isClean?: boolean;
  hasDamage?: boolean;
  damageDescription?: string;
  images?: string[];

  // ✅ NEW: Return condition for the substitute
  returnCondition?: ReturnCondition;
}

// From your agreement defaults
export const DEFAULT_RENTAL_PRICES = {
  daily: 100,
  weekly: 500,
  claim: 150
};

export interface Rental {
  id: string;
  // ✅ NEW: Rental Agreement Number
  rentalAgreementNumber?: string;
  vehicleId: string;
  customerId: string;

  startDate: Date;
  endDate: Date;

  originalStartDate?: Date;

  type: RentalType;
  reason: RentalReason;
  status: RentalStatus;
  expectedReturnDate?: Date | null;
  // Financials
  cost: number;
  standardCost?: number;

  includeVAT: boolean;

  // Extra line items (+ VAT flags)
  deliveryCharge?: number | null;
  collectionCharge?: number | null;

  insurancePerDay?: number | null;
  insurancePerWeek?: number | null; // ✅ ADDED (used by weekly rentals)

  deliveryChargeIncludeVAT?: boolean;
  collectionChargeIncludeVAT?: boolean;

  insurancePerDayIncludeVAT?: boolean;
  insurancePerWeekIncludeVAT?: boolean; // ✅ ADDED

  // Claim-only extras
  claimRef?: string | null;

  notes?: RentalNote[]; // Add this field

  storageStartDate?: Date | null;
  storageEndDate?: Date | null;
  storageCostPerDay?: number | null;
  storageDays?: number | null;
  includeStorageVAT?: boolean | null;
  storageCost?: number | null;

  // Recovery
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

  // Hire substitution (ARRAY)
  hireSubstitutionDetails?: HireSubstitutionDetails[] | null;

  // Misc
  ongoingCharges?: number;
  extensionHistory?: ExtensionEntry[];

  // Audit
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy: string;

  // Optional flat fields
  paymentMethod?: PaymentMethod;
  paymentReference?: string | null;
}
