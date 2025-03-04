// src/components/driverPay/DriverPaySummary.tsx

import React from 'react';
import { DollarSign, PieChart, Wallet } from 'lucide-react';
import { useFormattedDisplay } from '../../hooks/useFormattedDisplay'; // Import the hook

interface DriverPaySummaryProps {
  total: number;
  commission: number;
  netPay: number;
}

const DriverPaySummary: React.FC<DriverPaySummaryProps> = ({
  total,
  commission,
  netPay
}) => {
  const { formatCurrency } = useFormattedDisplay(); // Use the hook

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center">
          <DollarSign className="h-8 w-8 text-primary" />
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-500">Total Amount</p>
            <p className="text-2xl font-semibold text-gray-900">
              {formatCurrency(total)}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center">
          <PieChart className="h-8 w-8 text-yellow-500" />
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-500">Commission</p>
            <p className="text-2xl font-semibold text-gray-900">
              {formatCurrency(commission)}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center">
          <Wallet className="h-8 w-8 text-green-500" />
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-500">Net Pay</p>
            <p className="text-2xl font-semibold text-gray-900">
              {formatCurrency(netPay)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DriverPaySummary;