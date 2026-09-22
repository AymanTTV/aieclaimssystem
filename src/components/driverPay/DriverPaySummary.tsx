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
    cardBg: string;
    iconBg: string; 
    iconColor: string; 
    titleColor: string;
    valueColor: string; 
  }> = ({ icon, title, value, cardBg, iconBg, iconColor, titleColor, valueColor }) => (
    <div className={`${cardBg} rounded-2xl shadow-xs border p-5 text-[#0F172A] transition-all`}>
      <div className="flex items-center gap-4">
        <div className={`shrink-0 p-3 rounded-xl border shadow-xs ${iconBg} ${iconColor}`}>
          {icon}
        </div>
        <div>
          <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${titleColor}`}>{title}</p>
          <p className={`text-xl sm:text-2xl font-black font-mono tracking-tight ${valueColor}`}>
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
        cardBg="bg-[#F0F9FF] border-[#BAE6FD]"
        iconBg="bg-white border-[#BAE6FD]" 
        iconColor="text-[#0284C7]" 
        titleColor="text-[#0284C7]"
        valueColor="text-[#0369A1]"
      />
      <Card 
        icon={<PieChart className="h-6 w-6" />} 
        title="COMMISSION A" 
        value={commissionA} 
        cardBg="bg-[#FFFBEB] border-[#FDE68A]"
        iconBg="bg-white border-[#FDE68A]" 
        iconColor="text-[#D97706]" 
        titleColor="text-[#D97706]"
        valueColor="text-[#B45309]"
      />
      <Card 
        icon={<Percent className="h-6 w-6" />} 
        title="COMMISSION B" 
        value={commissionB} 
        cardBg="bg-[#FFF7ED] border-[#FED7AA]"
        iconBg="bg-white border-[#FED7AA]" 
        iconColor="text-[#EA580C]" 
        titleColor="text-[#EA580C]"
        valueColor="text-[#C2410C]"
      />
      <Card 
        icon={<Wallet className="h-6 w-6" />} 
        title="NET PAY" 
        value={netPay} 
        cardBg="bg-[#FAF5FF] border-[#E9D5FF]"
        iconBg="bg-white border-[#E9D5FF]" 
        iconColor="text-[#7E22CE]" 
        titleColor="text-[#7E22CE]"
        valueColor="text-[#6B21A8]"
      />
      <Card 
        icon={<ArrowUpCircle className="h-6 w-6" />} 
        title="AMOUNT PAID" 
        value={totalPaid} 
        cardBg="bg-[#ECFDF5] border-[#A7F3D0]"
        iconBg="bg-white border-[#A7F3D0]" 
        iconColor="text-[#059669]" 
        titleColor="text-[#059669]"
        valueColor="text-[#047857]"
      />
      <Card 
        icon={<ArrowDownCircle className="h-6 w-6" />} 
        title="REMAINING AMOUNT" 
        value={totalRemaining} 
        cardBg="bg-[#FEF2F2] border-[#FECACA]"
        iconBg="bg-white border-[#FECACA]" 
        iconColor="text-[#DC2626]" 
        titleColor="text-[#DC2626]"
        valueColor="text-[#B91C1C]"
      />
    </div>
  );
};

export default DriverPaySummary;