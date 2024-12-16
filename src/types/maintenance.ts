import { Vehicle } from './vehicle';

export interface MaintenanceLog {
  id: string;
  vehicleId: string;
  type: 'yearly-service' | 'mileage-service' | 'repair' | 'emergency-repair' | 'mot' | 'tfl';
  date: Date;
  description: string;
  cost: number;
  serviceProvider: string;
  location: string;
  parts: Part[];
  laborCost: number;
  currentMileage: number;
  nextServiceDate: Date;
  nextServiceMileage: number;
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
  notes?: string;
  vatDetails?: {
    partsVAT: Array<{ partName: string; includeVAT: boolean }>;
    laborVAT: boolean;
  };
}

export interface Part {
  name: string;
  quantity: number;
  cost: number;
}

export interface ServiceCenter {
  name: string;
  address: string;
  postcode: string;
  phone: string;
  hourlyRate: number;
  specialties: string[];
}