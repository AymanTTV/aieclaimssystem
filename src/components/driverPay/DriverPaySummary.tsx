// src/components/driverPay/DriverPaySummary.tsx
import React from 'react';
import { DollarSign, PieChart, Wallet, ArrowDownCircle, ArrowUpCircle, Percent } from 'lucide-react';
import { useFormattedDisplay } from '../../hooks/useFormattedDisplay';
import { usePermissions } from '../../hooks/usePermissions';

interface DriverPaySummaryProps {
  total: number;
  commissionA: number;
  commissionB: number;
  netPay: number;
  totalPaid?: number;
  totalRemaining?: number;
}

const DriverPaySummary: React.FC<DriverPaySummaryProps> = ({
  total,
  commissionA,
  commissionB,
  netPay,
  totalPaid = 0,
  totalRemaining = 0
}) => {
  const { formatCurrency } = useFormattedDisplay();
  const { can } = usePermissions();
  
  if (!can('driverPay', 'cards')) return null;

  const Card: React.FC<{ 
    icon: React.ReactNode; 
    title: string; 
    value: number; 
    iconBg: string; 
    iconColor: string; 
    valueColor?: string 
  }> = ({ icon, title, value, iconBg, iconColor, valueColor }) => (
    <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-200 border border-gray-100 p-5">
      <div className="flex items-center gap-4">
        <div className={`shrink-0 p-3 rounded-xl ${iconBg} ${iconColor}`}>
          {icon}
        </div>
        <div>
          <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
          <p className={`text-xl sm:text-2xl font-bold ${valueColor ?? 'text-gray-900'}`}>
            {formatCurrency(value)}
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
      <Card 
        icon={<DollarSign className="h-6 w-6" />} 
        title="TOTAL AMOUNT" 
        value={total} 
        iconBg="bg-blue-50" 
        iconColor="text-blue-600" 
      />
      <Card 
        icon={<PieChart className="h-6 w-6" />} 
        title="COMMISSION A" 
        value={commissionA} 
        iconBg="bg-yellow-50" 
        iconColor="text-yellow-600" 
      />
      <Card 
        icon={<Percent className="h-6 w-6" />} 
        title="COMMISSION B" 
        value={commissionB} 
        iconBg="bg-orange-50" 
        iconColor="text-orange-600" 
      />
      <Card 
        icon={<Wallet className="h-6 w-6" />} 
        title="NET PAY" 
        value={netPay} 
        iconBg="bg-emerald-50" 
        iconColor="text-emerald-600" 
      />
      <Card 
        icon={<ArrowUpCircle className="h-6 w-6" />} 
        title="AMOUNT PAID" 
        value={totalPaid} 
        iconBg="bg-green-50" 
        iconColor="text-green-600" 
        valueColor="text-green-600"
      />
      <Card 
        icon={<ArrowDownCircle className="h-6 w-6" />} 
        title="REMAINING AMOUNT" 
        value={totalRemaining} 
        iconBg="bg-red-50" 
        iconColor="text-red-600" 
        valueColor="text-red-600"
      />
    </div>
  );
};

export default DriverPaySummary;