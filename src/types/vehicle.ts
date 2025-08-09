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
  MeterCertificateImage?: string[];
  motImage?: string[];
  v5Image?: string[];
  insuranceImage?: string[];
}

export interface Vehicle {
  id: string;
  vin: string;
  make: string;
  model: string;
  year: number;
  registrationNumber: string;
  status: VehicleStatus;
  activeStatuses: VehicleStatus[];
  mileage: number;
  nextServiceMileage: number;
  insuranceExpiry: Date;
  motTestDate: Date; // Changed from motExpiry to motTestDate
  motExpiry: Date; // This will be calculated as 6 months after motTestDate
  nslExpiry: Date;
  roadTaxExpiry: Date;
  lastMaintenance: Date;
  nextMaintenance: Date;
  image?: string;
  createdAt: Date;
  createdBy: string;
  soldDate?: Date;
  salePrice?: number;
  owner: VehicleOwner;
  weeklyRentalPrice: number;
  dailyRentalPrice: number;
  claimRentalPrice: number;
  documents?: VehicleDocuments;
  documentUrl?: string;
}

// Default rental prices as whole numbers
export const DEFAULT_RENTAL_PRICES = {
  weekly: 360,   // £360 per week
  daily: 60,     // £60 per day
  claim: 340     // £340 per day for claim rentals
} as const;

// Default owner address
export const DEFAULT_OWNER_ADDRESS = "39-41 North Road, London, N7 9DP";

// Default owner object
export const DEFAULT_OWNER: VehicleOwner = {
  name: "AIE Skyline",
  address: DEFAULT_OWNER_ADDRESS,
  isDefault: true
};