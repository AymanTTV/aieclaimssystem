export type VehicleStatus = 
  | 'available'
  | 'rented'
  | 'maintenance'
  | 'test-scheduled'
  | 'unavailable'
  | 'sold';

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
  currentRental?: string | null; // Reference to current rental if any
  currentMaintenance?: string | null; // Reference to current maintenance if any
  currentTest?: string | null; // Reference to current test if any
  owner: VehicleOwner;
  createdAt: Date;
  createdBy: string;
  soldDate?: Date;
  salePrice?: number;
}

export interface VehicleOwner {
  fullName: string;
  address: string;
  email: string;
  phoneNumber: string;
}

export interface MileageHistory {
  id: string;
  vehicleId: string;
  previousMileage: number;
  newMileage: number;
  date: Date;
  recordedBy: string;
  notes?: string;
}