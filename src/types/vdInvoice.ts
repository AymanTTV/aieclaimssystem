export interface VDInvoicePayment {
  id: string;
  date: Date;
  amount: number;
  method: 'CASH' | 'CARD' | 'BANK_TRANSFER' | 'CHEQUE';
  reference?: string;
  notes?: string;
  createdAt: Date;
  createdBy: string;
}

export interface VDInvoicePart {
  name: string;
  quantity: number;
  price: number;
  includeVAT: boolean;
}

export interface VDInvoice {
  id: string;
  date: Date;
  invoiceNumber: string;
  
  // Customer Information
  customerName: string;
  customerAddress: string;
  customerPostcode: string;
  customerEmail: string;
  customerPhone: string;
  customerId?: string;

  // Vehicle Details
  registration: string;
  make: string;
  model: string;
  color: string;
  vehicleId?: string;

  // Service Center Details
  serviceCenter: string;
  laborHours: number;
  laborRate: number;
  laborVAT: boolean;

  // Cost Items
  parts: VDInvoicePart[];
  paintMaterials: number;
  paintMaterialsVAT: boolean; // Add this line
  laborCost: number;
  partsTotal: number;
  vatAmount: number;
  subtotal: number;
  total: number;

  // Payment Details
  paidAmount: number;
  remainingAmount: number;
  paymentStatus: 'pending' | 'partially_paid' | 'paid';
  paymentMethod: 'CASH' | 'CARD' | 'BANK_TRANSFER' | 'CHEQUE';
  payments: VDInvoicePayment[];
  
  // System fields
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  documentUrl?: string;
}