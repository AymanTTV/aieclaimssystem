// src/types/vdFinance.ts
export interface VDFinanceRecord {
  id: string;
  name: string;
  ref: string;
  reg: string;
  totalAmount: number;
  vatPercentage: number;
  netAmount: number;
  solicitorFee: number;
  vatIn: number;
  purchasedItems: number;
  clientRepair: number;
  profit: number;
  description: string;
  date: Date;
  parts: VDFinancePart[];
  laborCharge: number;
  serviceCenter: string;
  vatOut: number;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  claimId?: string;
  salvage: number;
  clientReferralFee: number;
  clientRepairAmount: number;
  categoryId?: string;
  categoryName?: string;
  groupId?: string;
  groupName?: string;
  claimReasons?: Array<'VD' | 'H' | 'S' | 'PI'>;
  originalProfit?: number;
  
  // NEW: Link to the mirrored Share record
  linkedShareId?: string; 
  
  vatDetails: {
    partsVAT: { partName: string; includeVAT: boolean }[];
    laborVAT: boolean;
  };
}

export interface VDFinancePart {
  id: string;
  name: string;
  quantity: number;
  price: number;
  includeVat: boolean;
}