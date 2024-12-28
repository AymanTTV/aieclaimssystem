export type VehicleStatus = 
  | 'available' 
  | 'maintenance' 
  | 'rented'
  | 'claim'
  | 'unavailable'
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
  activeStatuses: VehicleStatus[];
  owner: VehicleOwner;
}