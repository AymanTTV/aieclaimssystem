const VAT_RATE = 0.20; // 20% VAT

interface Part {
  name: string;
  quantity: number;
  cost: number;
  includeVAT: boolean;
}

interface CostBreakdown {
  netAmount: number;
  vatAmount: number;
  totalAmount: number;
  partsTotal: number;
  laborTotal: number;
}

export const calculateCosts = (
  parts: Part[],
  laborHours: number,
  laborRate: number,
  includeVATOnLabor: boolean
): CostBreakdown => {
  // Calculate parts costs
  const partsNetAmount = parts.reduce((sum, part) => {
    return sum + (part.cost * part.quantity);
  }, 0);

  const partsVATAmount = parts.reduce((sum, part) => {
    return sum + (part.includeVAT ? part.cost * part.quantity * VAT_RATE : 0);
  }, 0);

  // Calculate labor costs
  const laborNetAmount = laborHours * laborRate;
  const laborVATAmount = includeVATOnLabor ? laborNetAmount * VAT_RATE : 0;

  // Calculate totals
  const netAmount = partsNetAmount + laborNetAmount;
  const vatAmount = partsVATAmount + laborVATAmount;
  const totalAmount = netAmount + vatAmount;

  return {
    netAmount,
    vatAmount,
    totalAmount,
    partsTotal: partsNetAmount + partsVATAmount,
    laborTotal: laborNetAmount + laborVATAmount
  };
};

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