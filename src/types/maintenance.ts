export interface MaintenancePayment {
  id: string;
  date: Date;
  amount: number;
  method: string;
  reference?: string;
  notes?: string;
  createdAt: Date;
  createdBy: string;
}

export interface MaintenanceLog {
  id: string;
  vehicleId?: string;
  vehicleDetails?: {
    make: string;
    model: string;
    registrationNumber: string;
  };
  customerId?: string;
  // NEW FIELDS
  orderNumber?: string;       // e.g. MaintenanceOrder0001
  invoiceNumber?: string;     // e.g. MaintenanceInvoice0001
  invoiceDate?: Date;
  invoiceDueDate?: Date;
  completedDate?: Date;       // The date maintenance was finished
  invoiceUrl?: string;        // Link to the specific Maintenance Invoice PDF
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
  // ✅ UPDATE: Add these new payment tracking fields
  paidAmount?: number;
  remainingAmount?: number;
  payments?: MaintenancePayment[];
  paymentMethod?: string;
  paymentReference?: string;

  
  netAmount?: number;
  vatAmount?: number;
  serviceProvider: string;
  location: string;
  updatedBy: string;
  updatedAt: string;
  parts: Part[];
  laborCost: number;
  currentMileage: number;
  nextServiceDate: Date;
  nextServiceMileage: number;
  totalDiscount?: number;
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
  discount?: number;     // ← new
  includeVAT?: boolean;  // ← new
}

export interface CostBreakdown {
  netAmount: number;
  vatAmount: number;
  totalAmount: number;
  partsTotal: number;
  laborTotal: number;
}