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
    <div className="bg-[#16192B] rounded-2xl shadow-xl hover:border-[#3D456E] border border-[#2B314E] p-5 text-white transition-all">
      <div className="flex items-center gap-4">
        <div className={`shrink-0 p-3 rounded-xl border ${iconBg} ${iconColor}`}>
          {icon}
        </div>
        <div>
          <p className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">{title}</p>
          <p className={`text-xl sm:text-2xl font-black font-mono tracking-tight ${valueColor ?? 'text-white'}`}>
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
        iconBg="bg-blue-500/15 border-blue-500/30" 
        iconColor="text-blue-400" 
      />
      <Card 
        icon={<PieChart className="h-6 w-6" />} 
        title="COMMISSION A" 
        value={commissionA} 
        iconBg="bg-amber-500/15 border-amber-500/30" 
        iconColor="text-amber-400" 
      />
      <Card 
        icon={<Percent className="h-6 w-6" />} 
        title="COMMISSION B" 
        value={commissionB} 
        iconBg="bg-orange-500/15 border-orange-500/30" 
        iconColor="text-orange-400" 
      />
      <Card 
        icon={<Wallet className="h-6 w-6" />} 
        title="NET PAY" 
        value={netPay} 
        iconBg="bg-emerald-500/15 border-emerald-500/30" 
        iconColor="text-emerald-400" 
      />
      <Card 
        icon={<ArrowUpCircle className="h-6 w-6" />} 
        title="AMOUNT PAID" 
        value={totalPaid} 
        iconBg="bg-emerald-500/15 border-emerald-500/30" 
        iconColor="text-emerald-400" 
        valueColor="text-emerald-400"
      />
      <Card 
        icon={<ArrowDownCircle className="h-6 w-6" />} 
        title="REMAINING AMOUNT" 
        value={totalRemaining} 
        iconBg="bg-rose-500/15 border-rose-500/30" 
        iconColor="text-rose-400" 
        valueColor="text-rose-400"
      />
    </div>
  );
};

export default DriverPaySummary;