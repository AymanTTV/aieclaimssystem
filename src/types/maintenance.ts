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

export type MaintenanceStatus =
  | 'scheduled'
  | 'in-progress'
  | 'workshop'
  | 'parts-backorder'
  | 'awaiting-parts'
  | 'bodywork'
  | 'off-road'
  | 'OFF ROAD (VOR)'
  | 'pending'
  | 'inspection'
  | 'completed'
  | 'cancelled';

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
  orderId?: string;           // Sync alias for orderNumber
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
  date?: Date | null;
  description: string;
  cost: number;
  // Subcontractor Cost & Profit Tracking
  subcontractorCost?: number;
  dealerCost?: number;
  customerBilled?: number;
  netProfit?: number;
  profitMarginPercent?: number;
  profitMargin?: number;
  isProfitEdited?: boolean;
  isEdited?: boolean;
  entityId?: string;
  entityType?: 'MAINTENANCE';
  vatType?: string;
  completionStatus?: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
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
  nextServiceDate?: Date | null;
  nextServiceMileage: number;
  totalDiscount?: number;
  status: MaintenanceStatus;
  paymentStatus: 'paid' | 'unpaid' | 'partially_paid';
  // Off-road & accident repair tracking
  isOffRoad?: boolean;
  isNonDrivable?: boolean;
  dueToAccident?: boolean;
  accidentId?: string;
  accidentRef?: string;
  category?: string;
  ticketCategory?: string;
  roadCondition?: string;
  statusDisplay?: string;
  reportedBy?: string;
  notes?: string;
  createdBy: string;
  attachments?: Attachment[];
  vatDetails?: {
    partsVAT: Array<{ partName: string; includeVAT: boolean }>;
    laborVAT: boolean;
  };
}

/** Helper to identify logs where vehicle is off the road / non-drivable due to accident */
export const isOffRoadAccidentLog = (log: MaintenanceLog | any): boolean => {
  if (!log) return false;
  if (log.isNonDrivable && (log.dueToAccident || log.type === 'accident-repair' || log.isOffRoad)) return true;
  if (log.isOffRoad && (log.dueToAccident || log.type === 'accident-repair' || log.isNonDrivable)) return true;
  if (log.dueToAccident && (log.isNonDrivable || log.isOffRoad)) return true;
  if (log.isNonDrivable) return true;
  if (log.type === 'accident-repair' && log.isOffRoad !== false) return true;
  if (log.ticketCategory === 'ACCIDENT DAMAGE' || log.category === 'ACCIDENT DAMAGE') return true;
  if (log.roadCondition === 'OFF ROAD (VOR)' || log.statusDisplay === 'OFF ROAD (VOR)') return true;
  const desc = `${log.description || ''} ${log.notes || ''} ${log.type || ''}`.toLowerCase();
  if (desc.includes('accident') && (desc.includes('non-drivable') || desc.includes('nondrivable') || desc.includes('non drivable') || desc.includes('off road') || desc.includes('off-road') || desc.includes('vor'))) {
    return true;
  }
  return false;
};

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