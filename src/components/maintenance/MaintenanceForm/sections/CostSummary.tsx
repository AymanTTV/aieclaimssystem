import React from 'react';

interface CostSummaryProps {
  calculatePartsCost: () => number;
  calculateLaborCost: () => number;
  calculateTotalCost: () => number;
  parts: Array<{ name: string; quantity: number; cost: number; includeVAT: boolean; }>;
  includeVATOnLabor: boolean;
  laborHours: number;
  laborRate: number;
}

const VAT_RATE = 0.20; // 20% VAT

const CostSummary: React.FC<CostSummaryProps> = ({
  calculatePartsCost,
  calculateLaborCost,
  calculateTotalCost,
  parts,
  includeVATOnLabor,
  laborHours,
  laborRate,
}) => {
  // Calculate parts costs
  const partsWithoutVAT = parts
    .filter(part => !part.includeVAT)
    .reduce((sum, part) => sum + (part.cost * part.quantity), 0);

  const partsWithVAT = parts
    .filter(part => part.includeVAT)
    .reduce((sum, part) => sum + (part.cost * part.quantity * (1 + VAT_RATE)), 0);

  // Calculate labor costs
  const baseLaborCost = laborHours * laborRate;
  const laborWithVAT = includeVATOnLabor ? baseLaborCost * (1 + VAT_RATE) : 0;
  const laborWithoutVAT = includeVATOnLabor ? 0 : baseLaborCost;

  // Calculate totals
  const totalWithoutVAT = partsWithoutVAT + laborWithoutVAT;
  const totalWithVAT = partsWithVAT + laborWithVAT;
  const vatAmount = (partsWithVAT - (partsWithVAT / (1 + VAT_RATE))) + 
                   (laborWithVAT - (laborWithVAT / (1 + VAT_RATE)));

  return (
    <div className="border-t pt-4">
      {/* Parts Breakdown */}
      <div className="mb-4">
        <h4 className="text-sm font-medium text-gray-900 mb-2">Parts Cost Breakdown</h4>
        <div className="space-y-1 text-sm">
          {partsWithoutVAT > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-600">Parts without VAT:</span>
              <span>£{partsWithoutVAT.toFixed(2)}</span>
            </div>
          )}
          {partsWithVAT > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-600">Parts with VAT:</span>
              <span>£{partsWithVAT.toFixed(2)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Labor Breakdown */}
      <div className="mb-4">
        <h4 className="text-sm font-medium text-gray-900 mb-2">Labor Cost Breakdown</h4>
        <div className="space-y-1 text-sm">
          {laborWithoutVAT > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-600">Labor without VAT:</span>
              <span>£{laborWithoutVAT.toFixed(2)}</span>
            </div>
          )}
          {laborWithVAT > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-600">Labor with VAT:</span>
              <span>£{laborWithVAT.toFixed(2)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Total Summary */}
      <div className="border-t pt-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Total without VAT:</span>
          <span>£{totalWithoutVAT.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Total with VAT:</span>
          <span>£{totalWithVAT.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">VAT Amount:</span>
          <span>£{vatAmount.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-lg font-medium border-t pt-2">
          <span>Total Cost:</span>
          <span>£{calculateTotalCost().toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
};

export default CostSummary;