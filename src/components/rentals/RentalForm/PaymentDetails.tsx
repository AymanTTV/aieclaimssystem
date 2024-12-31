import React from 'react';
import FormField from '../../ui/FormField';

interface PaymentDetailsProps {
  formData: {
    paymentMethod: string;
    paymentReference: string;
    paidAmount: number;
  };
  totalCost: number;
  remainingAmount: number;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  disabled?: boolean;
}

const PaymentDetails: React.FC<PaymentDetailsProps> = ({
  formData,
  totalCost,
  remainingAmount,
  onChange,
  disabled = false
}) => {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900">Payment Details</h3>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Payment Method</label>
          <select
            name="paymentMethod"
            value={formData.paymentMethod}
            onChange={onChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
            disabled={disabled}
            required
          >
            <option value="cash">Cash</option>
            <option value="card">Card</option>
            <option value="bank_transfer">Bank Transfer</option>
            <option value="cheque">Cheque</option>
          </select>
        </div>

        <FormField
          type="number"
          label="Amount Paid"
          name="paidAmount"
          value={formData.paidAmount}
          onChange={onChange}
          disabled={disabled}
          min="0"
          max={totalCost}
          step="0.01"
        />

        <div className="col-span-2">
          <FormField
            label="Payment Reference"
            name="paymentReference"
            value={formData.paymentReference}
            onChange={onChange}
            disabled={disabled}
            placeholder="Enter payment reference or transaction ID"
          />
        </div>
      </div>

      {/* Payment Summary */}
      <div className="bg-gray-50 p-4 rounded-lg space-y-2">
        <div className="flex justify-between text-sm">
          <span>Total Amount:</span>
          <span className="font-medium">£{totalCost.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>Amount Paid:</span>
          <span className="text-green-600">£{formData.paidAmount.toFixed(2)}</span>
        </div>
        {remainingAmount > 0 && (
          <div className="flex justify-between text-sm">
            <span>Remaining Amount:</span>
            <span className="text-amber-600">£{remainingAmount.toFixed(2)}</span>
          </div>
        )}
        <div className="flex justify-between text-sm pt-2 border-t">
          <span>Payment Status:</span>
          <span className="font-medium capitalize">
            {formData.paidAmount >= totalCost ? 'Paid' : 
             formData.paidAmount > 0 ? 'Partially Paid' : 'Pending'}
          </span>
        </div>
      </div>

      {/* Payment instructions */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="text-sm font-medium text-gray-900 mb-2">Payment Instructions</h4>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• Full payment is required before vehicle collection</li>
          <li>• For bank transfers, please use the rental reference as payment reference</li>
          <li>• Card payments are subject to a 2% processing fee</li>
          <li>• Cheques must be cleared before vehicle collection</li>
        </ul>
      </div>
    </div>
  );
};

export default PaymentDetails;