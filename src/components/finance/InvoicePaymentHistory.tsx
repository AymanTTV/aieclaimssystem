import React from 'react';
import { InvoicePayment } from '../../types';
import { format } from 'date-fns';
import { Download } from 'lucide-react';

interface InvoicePaymentHistoryProps {
  payments: InvoicePayment[];
  onDownloadDocument?: (url: string) => void;
}

const InvoicePaymentHistory: React.FC<InvoicePaymentHistoryProps> = ({
  payments,
  onDownloadDocument
}) => {
  const formatDate = (date: Date): string => {
    try {
      return format(new Date(date), 'MMM dd, yyyy HH:mm');
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid date';
    }
  };

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
                  {formatDate(payment.date)}
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

export default InvoicePaymentHistory;