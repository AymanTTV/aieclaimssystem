export type VehicleStatus = 
  | 'active'
  | 'maintenance' 
  | 'rented'
  | 'claim'
  | 'unavailable'
  | 'sold';

export interface VehicleOwner {
  fullName: string;
  address: string;
  email: string;
  phoneNumber: string;
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
  owner: VehicleOwner;
  createdAt: Date;
  createdBy: string;
  soldDate?: Date;
  salePrice?: number;
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