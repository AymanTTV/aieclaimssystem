// src/components/vdFinance/VDFinanceSummary.tsx
import React from 'react';
import { VDFinanceRecord } from '../../types/vdFinance';
import { useFormattedDisplay } from '../../hooks/useFormattedDisplay';
import { usePermissions } from '../../hooks/usePermissions';
import { 
  Wallet, Calculator, ArrowDownCircle, ArrowUpCircle, 
  ShoppingCart, Scale, Wrench, Recycle, Gift, TrendingUp 
} from 'lucide-react';

interface VDFinanceSummaryProps {
  records: VDFinanceRecord[];
}

const VDFinanceSummary: React.FC<VDFinanceSummaryProps> = ({ records }) => {
  const { formatCurrency } = useFormattedDisplay();
  const { can } = usePermissions();
  if (!can('vdFinance', 'cards')) return null;

  const summary = records.reduce(
    (acc, r) => ({
      total:           acc.total + (r.totalAmount ?? 0),
      net:             acc.net + (r.netAmount ?? 0),
      vatIn:           acc.vatIn + (r.vatIn ?? 0),
      vatOut:          acc.vatOut + (r.vatOut ?? 0),
      expenses:        acc.expenses + (r.purchasedItems ?? 0),
      solicitorFee:    acc.solicitorFee + (r.solicitorFee ?? 0),
      clientRepair:    acc.clientRepair + (r.clientRepair ?? 0),
      salvage:         acc.salvage + (r.salvage ?? 0),
      clientReferralFee: acc.clientReferralFee + (r.clientReferralFee ?? 0),
      profit:          acc.profit + (r.profit ?? 0),
    }),
    { total: 0, net: 0, vatIn: 0, vatOut: 0, expenses: 0, solicitorFee: 0, clientRepair: 0, salvage: 0, clientReferralFee: 0, profit: 0 }
  );

  interface CardProps {
    label: string;
    value: number;
    bgClass: string;
    borderClass: string;
    labelClass: string;
    valueClass: string;
    iconBorderClass: string;
    iconColorClass: string;
    Icon: React.ElementType;
  }

  const Card: React.FC<CardProps> = ({
    label,
    value,
    bgClass,
    borderClass,
    labelClass,
    valueClass,
    iconBorderClass,
    iconColorClass,
    Icon,
  }) => (
    <div className={`rounded-2xl shadow-xs p-4 sm:p-5 border transition-all duration-200 flex items-center justify-between group ${bgClass} ${borderClass} hover:shadow-md`}>
      <div className="min-w-0 pr-2">
        <p className={`text-xs font-bold uppercase tracking-wider ${labelClass} truncate`}>{label}</p>
        <p className={`mt-1.5 text-xl sm:text-2xl font-black font-mono tracking-tight ${valueClass} truncate`}>
          {formatCurrency(value)}
        </p>
      </div>
      <div className={`p-2.5 sm:p-3 rounded-xl border bg-white shadow-xs transition-transform duration-300 group-hover:scale-110 shrink-0 ${iconBorderClass}`}>
        <Icon className={`w-5 h-5 sm:w-6 sm:h-6 ${iconColorClass}`} />
      </div>
    </div>
  );

  return (
    <div className="grid grid-cols-1 min-[380px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3.5 sm:gap-4">
      <Card 
        label="TOTAL AMOUNT"        
        value={summary.total}             
        Icon={Wallet}         
        bgClass="bg-blue-50/80"
        borderClass="border-blue-200 hover:border-blue-400"
        labelClass="text-blue-700 font-extrabold"
        valueClass="text-blue-950"
        iconBorderClass="border-blue-200"
        iconColorClass="text-blue-600"
      />
      <Card 
        label="NET AMOUNT"          
        value={summary.net}               
        Icon={Calculator}     
        bgClass="bg-indigo-50/80"
        borderClass="border-indigo-200 hover:border-indigo-400"
        labelClass="text-indigo-700 font-extrabold"
        valueClass="text-indigo-950"
        iconBorderClass="border-indigo-200"
        iconColorClass="text-indigo-600"
      />
      <Card 
        label="VAT IN"              
        value={summary.vatIn}             
        Icon={ArrowDownCircle}
        bgClass="bg-emerald-50/80"
        borderClass="border-emerald-200 hover:border-emerald-400"
        labelClass="text-emerald-700 font-extrabold"
        valueClass="text-emerald-950"
        iconBorderClass="border-emerald-200"
        iconColorClass="text-emerald-600"
      />
      <Card 
        label="VAT OUT"             
        value={summary.vatOut}            
        Icon={ArrowUpCircle}  
        bgClass="bg-rose-50/80"
        borderClass="border-rose-200 hover:border-rose-400"
        labelClass="text-rose-700 font-extrabold"
        valueClass="text-rose-950"
        iconBorderClass="border-rose-200"
        iconColorClass="text-rose-600"
      />
      <Card 
        label="PURCHASED ITEMS"     
        value={summary.expenses}          
        Icon={ShoppingCart}   
        bgClass="bg-amber-50/80"
        borderClass="border-amber-200 hover:border-amber-400"
        labelClass="text-amber-800 font-extrabold"
        valueClass="text-amber-950"
        iconBorderClass="border-amber-200"
        iconColorClass="text-amber-600"
      />
      <Card 
        label="SOLICITOR FEE"       
        value={summary.solicitorFee}      
        Icon={Scale}          
        bgClass="bg-purple-50/80"
        borderClass="border-purple-200 hover:border-purple-400"
        labelClass="text-purple-700 font-extrabold"
        valueClass="text-purple-950"
        iconBorderClass="border-purple-200"
        iconColorClass="text-purple-600"
      />
      <Card 
        label="CLIENT REPAIR"       
        value={summary.clientRepair}      
        Icon={Wrench}         
        bgClass="bg-orange-50/80"
        borderClass="border-orange-200 hover:border-orange-400"
        labelClass="text-orange-800 font-extrabold"
        valueClass="text-orange-950"
        iconBorderClass="border-orange-200"
        iconColorClass="text-orange-600"
      />
      <Card 
        label="SALVAGE"             
        value={summary.salvage}           
        Icon={Recycle}        
        bgClass="bg-teal-50/80"
        borderClass="border-teal-200 hover:border-teal-400"
        labelClass="text-teal-700 font-extrabold"
        valueClass="text-teal-950"
        iconBorderClass="border-teal-200"
        iconColorClass="text-teal-600"
      />
      <Card 
        label="CLIENT REFERRAL"     
        value={summary.clientReferralFee} 
        Icon={Gift}           
        bgClass="bg-pink-50/80"
        borderClass="border-pink-200 hover:border-pink-400"
        labelClass="text-pink-700 font-extrabold"
        valueClass="text-pink-950"
        iconBorderClass="border-pink-200"
        iconColorClass="text-pink-600"
      />
      <Card 
        label="PROFIT"              
        value={summary.profit}            
        Icon={TrendingUp}     
        bgClass="bg-emerald-100/90"
        borderClass="border-emerald-300 hover:border-emerald-500 shadow-sm"
        labelClass="text-emerald-800 font-extrabold"
        valueClass="text-emerald-950"
        iconBorderClass="border-emerald-300"
        iconColorClass="text-emerald-600"
      />
    </div>
  );
};

export default VDFinanceSummary;