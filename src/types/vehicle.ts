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
  accountId?: string;
  accountName?: string;
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
  updatedBy?: string; 
  source?: 'form' | 'service' | 'import' | 'other';
}

export type VehicleTypeAssignment = 'Claims' | 'Hire';

export interface Vehicle {
  id: string;
  vin: string;
  make: string;
  model: string;
  year: number;
  registrationNumber: string;

  firstRegistrationDate?: Date | null;
  warrantyStartDate?: Date | null;
  warrantyEndDate?: Date | null;

  serviceInterval?: number;

  mileage: number;
  nextServiceMileage: number;

  insuranceExpiry?: Date | null;
  motTestDate?: Date | null;
  motExpiry?: Date | null;
  nslExpiry?: Date | null;
  roadTaxExpiry?: Date | null;
  lastMaintenance?: Date | null;
  nextMaintenance?: Date | null;

  purchasedDate?: Date | null;

  weeklyRentalPrice: number;
  dailyRentalPrice: number;
  claimRentalPrice: number;

  weeklyInsuranceAmount?: number;
  dailyInsuranceAmount?: number;
  claimInsuranceAmount?: number;

  owner?: VehicleOwner;
  assignedGarageId?: string | null;   
  assignedGarageName?: string | null; 
  assignmentType?: VehicleTypeAssignment | null; 
  
  assignedGroupId?: string | null;
  assignedGroupName?: string | null;

  // ✅ NEW: Department Assignment
  assignedDepartmentId?: string | null;
  assignedDepartmentName?: string | null;

  image?: string;
  documents?: VehicleDocuments;

  status: VehicleStatus;
  activeStatuses?: string[]; 
  createdAt?: Date;
  updatedAt?: Date;
  createdBy?: string;

  soldDate?: Date | null;
  salePrice?: number | null;

  mileageUpdates?: MileageUpdate[];
}

export const DEFAULT_RENTAL_PRICES = {
  weekly: 360,
  daily: 60,
  claim: 340,
} as const;

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