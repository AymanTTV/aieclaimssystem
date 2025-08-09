// src/utils/maintenanceCostUtils.ts
const VAT_RATE = 0.20; // 20% VAT

export interface Part {
  name: string;
  quantity: number;
  cost: number;
  includeVAT: boolean;
  discount?: number;
}

export interface CostBreakdown {
  partsNet: number;       // parts after discount, before VAT
  partsVAT: number;       // VAT on parts
  laborNet: number;       // labor before VAT
  laborVAT: number;       // VAT on labor
  totalDiscount: number;  // sum of all (base*qty*discount%)
  netAmount: number;      // partsNet + laborNet
  vatAmount: number;      // partsVAT + laborVAT
  totalAmount: number;    // netAmount + vatAmount
}

export function calculateCosts(
  parts: Part[],
  laborHours: number,
  laborRate: number,
  includeVATOnLabor: boolean
): CostBreakdown {
  let partsNet = 0;
  let partsVAT = 0;
  let totalDiscount = 0;

  for (const p of parts) {
    const base = p.cost * p.quantity;
    const discAmt = base * ((p.discount ?? 0) / 100);
    totalDiscount += discAmt;

    const afterDisc = base - discAmt;
    partsNet += afterDisc;

    if (p.includeVAT) {
      partsVAT += afterDisc * VAT_RATE;
    }
  }

  const laborNet = laborHours * laborRate;
  const laborVAT = includeVATOnLabor ? laborNet * VAT_RATE : 0;

  const netAmount   = partsNet + laborNet;
  const vatAmount   = partsVAT + laborVAT;
  const totalAmount = netAmount + vatAmount;

  return {
    partsNet,
    partsVAT,
    laborNet,
    laborVAT,
    totalDiscount,
    netAmount,
    vatAmount,
    totalAmount
  };
}



export const calculatePartialPayment = (
  totalAmount: number,
  paidAmount: number
): { remainingAmount: number; paymentStatus: 'paid' | 'unpaid' | 'partially_paid' } => {
  if (paidAmount >= totalAmount) {
    return { remainingAmount: 0, paymentStatus: 'paid' };
  }
  if (paidAmount === 0) {
    return { remainingAmount: totalAmount, paymentStatus: 'unpaid' };
  }
  return { 
    remainingAmount: totalAmount - paidAmount,
    paymentStatus: 'partially_paid'
  };
};