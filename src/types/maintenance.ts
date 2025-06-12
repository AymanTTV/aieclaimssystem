export interface MaintenanceLog {
  id: string;
  vehicleId: string;
  type :
  | 'yearly-service'
  | 'mileage-service'
  | 'repair'
  | 'emergency-repair'
  | 'mot'
  | 'nsl'
  | 'tfl'
  | 'service'
  | 'maintenance'
  | 'bodywork'
  | 'accident-repair'
  | 'oil-change'
  | 'brake-service'
  | 'tire-replacement'
  | 'battery-check'
  | 'engine-diagnostics'
  | 'air-conditioning-service'
  | 'wheel-alignment'
  | 'transmission-service'
  | 'exhaust-repair'
  | 'suspension-check'
  | 'coolant-flush'
  | 'filter-replacement'
  | 'windscreen-repair'
  | 'software-update'
  | 'recall-service'
  | 'erad'
  | 'driveshaft'
  | 'iem'
  | 'hv-battery'
  | 'lower-arms'
  | 'steering-passiv'
  | 'brake-vacuum-pump'
  | 'brake-servo'
  | 'anti-rubber-bushes'
  | 'auto-handbrake-failure'
  | 'taxi-meter'
  | 'car-wash'
  | 'full-valeting';
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
  createdBy: string;
  attachments?: Attachment[];
  vatDetails?: {
    partsVAT: Array<{ partName: string; includeVAT: boolean }>;
    laborVAT: boolean;
  };
}

export interface Attachment {
  name: string;
  url: string;
  type: string;
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