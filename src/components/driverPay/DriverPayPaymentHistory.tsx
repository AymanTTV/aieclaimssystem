// src/components/driverPay/DriverPayPaymentHistory.tsx

import React from 'react';
import { DriverPayPayment } from '../../types/driverPay';
import { format } from 'date-fns';
import { Download } from 'lucide-react';

interface DriverPayPaymentHistoryProps {
  payments: DriverPayPayment[];
  onDownloadDocument?: (url: string) => void;
}

const DriverPayPaymentHistory: React.FC<DriverPayPaymentHistoryProps> = ({
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
                  {format(payment.date, 'dd/MM/yyyy HH:mm')}
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

export default DriverPayPaymentHistory;
