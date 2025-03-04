export interface MaintenanceLog {
  id: string;
  vehicleId: string;
  type : 'yearly-service' | 'mileage-service' | 'repair' | 'emergency-repair' | 'mot' | 'nsl' | 'tfl' | 'service' | 'maintenance' | 'bodywork' | 'accident-repair';
  date: Date;
  description: string;
  cost: number;
  paidAmount?: number;
  serviceProvider: string;
  location: string;
  updatedBy: string;
  updatedAt: string;
  parts: Part[];
  laborCost: number;
  currentMileage: number;
  nextServiceDate: Date;
  nextServiceMileage: number;
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
  paymentStatus: 'paid' | 'unpaid' | 'partially_paid';
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

export interface CostBreakdown {
  netAmount: number;
  vatAmount: number;
  totalAmount: number;
  partsTotal: number;
  laborTotal: number;
}