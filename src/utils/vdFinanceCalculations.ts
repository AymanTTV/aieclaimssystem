export const calculateVDFinanceValues = (
  totalAmount: number,
  vatRate: number,
  purchasedItems: number
) => {
  // Calculate NET and VAT IN
  const netAmount = totalAmount / (1 + vatRate / 100);
  const vatIn = totalAmount - netAmount;

  // Calculate Solicitor Fee (10% of total, capped at £500)
  const solicitorFee = Math.min(totalAmount * 0.1, 500);

  // Calculate Client Repair (20% of remaining after purchased items)
  const remainingAfterPurchase = netAmount - purchasedItems;
  const clientRepair = remainingAfterPurchase * 0.2;

  // Calculate Profit
  const profit = netAmount - purchasedItems - clientRepair;

  return {
    netAmount,
    vatIn,
    solicitorFee,
    clientRepair,
    profit
  };
};

export const calculatePartsTotal = (
  parts: Array<{
    price: number;
    quantity: number;
    includeVAT: boolean;
  }>,
  laborCharge: number,
  laborVAT: boolean
) => {
  const partsTotal = parts.reduce((sum, part) => {
    const partTotal = part.price * part.quantity;
    return sum + (part.includeVAT ? partTotal * 1.2 : partTotal);
  }, 0);

  const laborTotal = laborVAT ? laborCharge * 1.2 : laborCharge;
  
  return partsTotal + laborTotal;
};

export const calculateVATOut = (
  parts: Array<{
    price: number;
    quantity: number;
    includeVAT: boolean;
  }>,
  laborCharge: number,
  laborVAT: boolean
) => {
  const partsVAT = parts.reduce((sum, part) => {
    return sum + (part.includeVAT ? part.price * part.quantity * 0.2 : 0);
  }, 0);

  const laborVATAmount = laborVAT ? laborCharge * 0.2 : 0;
  
  return partsVAT + laborVATAmount;
};