// src/types/vehicle.ts

export type VehicleStatus =
  | 'available'
  | 'hired'
  | 'scheduled-rental'
  | 'maintenance'
  | 'scheduled-maintenance'
  | 'claim'
  | 'sold'
  | 'unavailable';

export interface VehicleOwner {
  name: string;
  address: string;
  isDefault?: boolean;
}

export interface VehicleDocuments {
  nslImage?: string[];
  motImage?: string[];
  v5Image?: string[];
  MeterCertificateImage?: string[];
  insuranceImage?: string[];
}

export interface MileageUpdate {
  date: Date;
  mileage: number;
  note?: string;
  updatedBy?: string; // uid or display name
  source?: 'form' | 'service' | 'import' | 'other';
}

export interface Vehicle {
  id: string;
  vin: string;
  make: string;
  model: string;
  year: number;
  registrationNumber: string;

  // Core counters
  mileage: number;
  nextServiceMileage: number;

  // Dates
  insuranceExpiry?: Date | null;
  motTestDate?: Date | null;
  motExpiry?: Date | null;
  nslExpiry?: Date | null;
  roadTaxExpiry?: Date | null;
  lastMaintenance?: Date | null;
  nextMaintenance?: Date | null;

  // NEW: when the car was purchased
  purchasedDate?: Date | null;

  // Pricing
  weeklyRentalPrice: number;
  dailyRentalPrice: number;
  claimRentalPrice: number;

  // NEW: Rental insurance amounts
  weeklyInsuranceAmount?: number;
  dailyInsuranceAmount?: number;
  claimInsuranceAmount?: number;

  // Ownership
  owner?: VehicleOwner;

  // Media & docs
  image?: string;
  documents?: VehicleDocuments;

  // Status & audit
  status: VehicleStatus;
  createdAt?: Date;
  updatedAt?: Date;
  createdBy?: string;

  // Sales (if sold)
  soldDate?: Date | null;
  salePrice?: number | null;

  // NEW: mileage history
  mileageUpdates?: MileageUpdate[];
}

// Defaults
export const DEFAULT_RENTAL_PRICES = {
  weekly: 360,
  daily: 60,
  claim: 340,
} as const;

// Defaults (insurance amounts)
export const DEFAULT_INSURANCE_AMOUNTS = {
  weekly: 0,
  daily: 0,
  claim: 0,
} as const;

export const DEFAULT_OWNER_ADDRESS = '39-41 North Road, London, N7 9DP';

export const DEFAULT_OWNER: VehicleOwner = {
  name: 'AIE Skyline',
  address: DEFAULT_OWNER_ADDRESS,
  isDefault: true,
};
