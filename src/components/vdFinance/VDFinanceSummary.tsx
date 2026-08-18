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

  const Card: React.FC<{ label: string; value: number; tone: string; iconBg: string; Icon: React.ElementType }> = ({ label, value, tone, iconBg, Icon }) => (
    <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100 hover:shadow-md hover:border-gray-200 transition-all duration-200 flex items-center justify-between group">
      <div>
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">{label}</p>
        <p className={`mt-1.5 text-xl sm:text-2xl font-extrabold tracking-tight ${tone}`}>
          {formatCurrency(value)}
        </p>
      </div>
      <div className={`p-3 rounded-xl transition-transform duration-300 group-hover:scale-110 ${iconBg}`}>
        <Icon className={`w-6 h-6 ${tone}`} />
      </div>
    </div>
  );

  return (
    <div className="grid grid-cols-1 min-[380px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      <Card label="TOTAL AMOUNT"        value={summary.total}             Icon={Wallet}         tone="text-gray-900"   iconBg="bg-gray-100" />
      <Card label="NET AMOUNT"          value={summary.net}               Icon={Calculator}     tone="text-blue-700"   iconBg="bg-blue-50" />
      <Card label="VAT IN"              value={summary.vatIn}             Icon={ArrowDownCircle}tone="text-indigo-600" iconBg="bg-indigo-50" />
      <Card label="VAT OUT"             value={summary.vatOut}            Icon={ArrowUpCircle}  tone="text-rose-600"   iconBg="bg-rose-50" />
      <Card label="PURCHASED ITEMS"     value={summary.expenses}          Icon={ShoppingCart}   tone="text-amber-600"  iconBg="bg-amber-50" />
      <Card label="SOLICITOR FEE"       value={summary.solicitorFee}      Icon={Scale}          tone="text-purple-600" iconBg="bg-purple-50" />
      <Card label="CLIENT REPAIR"       value={summary.clientRepair}      Icon={Wrench}         tone="text-orange-600" iconBg="bg-orange-50" />
      <Card label="SALVAGE"             value={summary.salvage}           Icon={Recycle}        tone="text-teal-600"   iconBg="bg-teal-50" />
      <Card label="CLIENT REFERRAL"     value={summary.clientReferralFee} Icon={Gift}           tone="text-pink-600"   iconBg="bg-pink-50" />
      <Card label="PROFIT"              value={summary.profit}            Icon={TrendingUp}     tone="text-emerald-600"iconBg="bg-emerald-50" />
    </div>
  );
};

export default VDFinanceSummary;