export type VehicleStatus = 
  | 'hired'
  | 'maintenance'
  | 'claims'
  | 'available'
  | 'sold';

export interface VehicleOwner {
  name: string;
  address: string;
  isDefault?: boolean;
}

export interface Vehicle {
  id: string;
  vin: string;
  make: string;
  model: string;
  year: number;
  registrationNumber: string;
  status: VehicleStatus;
  mileage: number;
  insuranceExpiry: Date;
  motExpiry: Date;
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
  // Integer rental prices
  weeklyRentalPrice: number;
  dailyRentalPrice: number;
  claimRentalPrice: number;
}

// Default rental prices as whole numbers
export const DEFAULT_RENTAL_PRICES = {
  weekly: 360,
  daily: 60,
  claim: 340
} as const;

// Default owner address
export const DEFAULT_OWNER_ADDRESS = "39-41 North Road, London, N7 9DP";

// Default owner object
export const DEFAULT_OWNER: VehicleOwner = {
  name: "AIE Skyline",
  address: DEFAULT_OWNER_ADDRESS,
  isDefault: true
};