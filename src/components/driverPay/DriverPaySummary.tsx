// src/components/driverPay/DriverPaySummary.tsx
import React from 'react';
import { DollarSign, PieChart, Wallet, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import { useFormattedDisplay } from '../../hooks/useFormattedDisplay';
import { usePermissions } from '../../hooks/usePermissions';

interface DriverPaySummaryProps {
  total: number;
  commission: number;
  netPay: number;
  totalPaid?: number;
  totalRemaining?: number;
}

const DriverPaySummary: React.FC<DriverPaySummaryProps> = ({
  total,
  commission,
  netPay,
  totalPaid = 0,
  totalRemaining = 0
}) => {
  const { formatCurrency } = useFormattedDisplay();
  const { can } = usePermissions();
  if (!can('driverPay', 'cards')) return null;

  const Card: React.FC<{ icon: React.ReactNode; title: string; value: number; tone?: string }> = ({
    icon, title, value, tone
  }) => (
    <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
      <div className="flex items-center">
        <div className="shrink-0">
          {icon}
        </div>
        <div className="ml-3 sm:ml-4">
          <p className="text-xs sm:text-sm font-medium text-gray-500">{title}</p>
          <p className={`text-lg sm:text-2xl font-semibold ${tone ?? 'text-gray-900'}`}>
            {formatCurrency(value)}
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="grid grid-cols-1 min-[380px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 mb-6">
      <Card icon={<DollarSign className="h-7 w-7 sm:h-8 sm:w-8 text-primary" />} title="TOTAL AMOUNT" value={total} />
      <Card icon={<PieChart className="h-7 w-7 sm:h-8 sm:w-8 text-yellow-500" />} title="COMMISSION" value={commission} />
      <Card icon={<Wallet className="h-7 w-7 sm:h-8 sm:w-8 text-green-500" />} title="NET PAY" value={netPay} />
      <Card icon={<ArrowUpCircle className="h-7 w-7 sm:h-8 sm:w-8 text-green-600" />} title="AMOUNT PAID" value={totalPaid} tone="text-green-600" />
      <Card icon={<ArrowDownCircle className="h-7 w-7 sm:h-8 sm:w-8 text-amber-600" />} title="REMAINING AMOUNT" value={totalRemaining} tone="text-amber-600" />
    </div>
  );
};

export default DriverPaySummary;
