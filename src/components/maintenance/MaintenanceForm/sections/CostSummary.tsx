import React from 'react';
import { calculateCosts } from '../../../../utils/maintenanceCostUtils';

interface CostSummaryProps {
  parts: Array<{ name: string; quantity: number; cost: number; includeVAT: boolean; }>;
  laborHours: number;
  laborRate: number;
  includeVATOnLabor: boolean;
  paymentStatus: 'paid' | 'unpaid';
  onPaymentStatusChange: (status: 'paid' | 'unpaid') => void;
}

const CostSummary: React.FC<CostSummaryProps> = ({
  parts,
  laborHours,
  laborRate,
  includeVATOnLabor,
  paymentStatus,
  onPaymentStatusChange
}) => {
  const costs = calculateCosts(parts, laborHours, laborRate, includeVATOnLabor);

  return (
    <div className="border-t pt-4 space-y-4">
      {/* Parts and Labor Breakdown */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-gray-600">
          <span>Parts Total:</span>
          <span>£{costs.partsTotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm text-gray-600">
          <span>Labor Total:</span>
          <span>£{costs.laborTotal.toFixed(2)}</span>
        </div>
      </div>

      {/* Cost Summary */}
      <div className="border-t pt-2 space-y-2">
        <div className="flex justify-between text-sm font-medium">
          <span>Net Amount:</span>
          <span>£{costs.netAmount.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm font-medium">
          <span>VAT Amount:</span>
          <span>£{costs.vatAmount.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-lg font-bold border-t pt-2">
          <span>Total Cost:</span>
          <span>£{costs.totalAmount.toFixed(2)}</span>
        </div>
      </div>

      {/* Payment Status */}
      <div className="flex items-center justify-between pt-4 border-t">
        <span className="text-sm font-medium text-gray-700">Payment Status</span>
        <div className="flex items-center space-x-4">
          <label className="inline-flex items-center">
            <input
              type="radio"
              value="paid"
              checked={paymentStatus === 'paid'}
              onChange={() => onPaymentStatusChange('paid')}
              className="form-radio text-primary focus:ring-primary"
            />
            <span className="ml-2 text-sm text-gray-700">Paid</span>
          </label>
          <label className="inline-flex items-center">
            <input
              type="radio"
              value="unpaid"
              checked={paymentStatus === 'unpaid'}
              onChange={() => onPaymentStatusChange('unpaid')}
              className="form-radio text-primary focus:ring-primary"
            />
            <span className="ml-2 text-sm text-gray-700">Unpaid</span>
          </label>
        </div>
      </div>
    </div>
  );
};

export default CostSummary;