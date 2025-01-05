import React from 'react';
import { RentalPayment } from '../../types';
import { Download } from 'lucide-react';
import { formatDate } from '../../utils/dateHelpers';

interface RentalPaymentHistoryProps {
  payments: RentalPayment[];
  onDownloadDocument?: (url: string) => void;
}

const RentalPaymentHistory: React.FC<RentalPaymentHistoryProps> = ({
  payments,
  onDownloadDocument
}) => {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900">Payment History</h3>
      <div className="space-y-2">
        {payments.map((payment) => (
          <div key={payment.id} className="bg-gray-50 p-4 rounded-lg">
            <div className="flex justify-between items-start">
              <div>
                <div className="font-medium">£{payment.amount.toFixed(2)}</div>
                <div className="text-sm text-gray-500 capitalize">
                  {payment.method.replace('_', ' ')}
                </div>
                {payment.reference && (
                  <div className="text-sm text-gray-500">
                    Ref: {payment.reference}
                  </div>
                )}
                {payment.notes && (
                  <div className="text-sm text-gray-500 mt-1">
                    {payment.notes}
                  </div>
                )}
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-500">
                  {formatDate(payment.date, true)} {/* Pass true to include time */}
                </div>
                {payment.document && onDownloadDocument && (
                  <button
                    onClick={() => onDownloadDocument(payment.document!)}
                    className="text-primary hover:text-primary-600 mt-1"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
        {payments.length === 0 && (
          <p className="text-center text-gray-500 py-4">No payments recorded</p>
        )}
      </div>
    </div>
  );
};

export default RentalPaymentHistory;