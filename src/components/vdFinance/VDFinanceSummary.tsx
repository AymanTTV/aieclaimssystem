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
    <div className="bg-[#16192B] rounded-2xl shadow-xl p-4 sm:p-5 border border-[#2B314E] hover:border-[#3D456E] transition-all duration-200 flex items-center justify-between group text-white">
      <div>
        <p className="text-xs font-bold text-slate-300 uppercase tracking-wider">{label}</p>
        <p className={`mt-1.5 text-xl sm:text-2xl font-black font-mono tracking-tight ${tone}`}>
          {formatCurrency(value)}
        </p>
      </div>
      <div className={`p-2.5 sm:p-3 rounded-xl border transition-transform duration-300 group-hover:scale-110 ${iconBg}`}>
        <Icon className={`w-5 h-5 sm:w-6 sm:h-6 ${tone}`} />
      </div>
    </div>
  );

  return (
    <div className="grid grid-cols-1 min-[380px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      <Card label="TOTAL AMOUNT"        value={summary.total}             Icon={Wallet}         tone="text-white"        iconBg="bg-slate-800/80 border-slate-700/60" />
      <Card label="NET AMOUNT"          value={summary.net}               Icon={Calculator}     tone="text-blue-400"     iconBg="bg-blue-500/15 border-blue-500/30" />
      <Card label="VAT IN"              value={summary.vatIn}             Icon={ArrowDownCircle}tone="text-indigo-400"   iconBg="bg-indigo-500/15 border-indigo-500/30" />
      <Card label="VAT OUT"             value={summary.vatOut}            Icon={ArrowUpCircle}  tone="text-rose-400"     iconBg="bg-rose-500/15 border-rose-500/30" />
      <Card label="PURCHASED ITEMS"     value={summary.expenses}          Icon={ShoppingCart}   tone="text-amber-400"    iconBg="bg-amber-500/15 border-amber-500/30" />
      <Card label="SOLICITOR FEE"       value={summary.solicitorFee}      Icon={Scale}          tone="text-purple-400"   iconBg="bg-purple-500/15 border-purple-500/30" />
      <Card label="CLIENT REPAIR"       value={summary.clientRepair}      Icon={Wrench}         tone="text-orange-400"   iconBg="bg-orange-500/15 border-orange-500/30" />
      <Card label="SALVAGE"             value={summary.salvage}           Icon={Recycle}        tone="text-teal-400"     iconBg="bg-teal-500/15 border-teal-500/30" />
      <Card label="CLIENT REFERRAL"     value={summary.clientReferralFee} Icon={Gift}           tone="text-pink-400"     iconBg="bg-pink-500/15 border-pink-500/30" />
      <Card label="PROFIT"              value={summary.profit}            Icon={TrendingUp}     tone="text-emerald-400"  iconBg="bg-emerald-500/15 border-emerald-500/30" />
    </div>
  );
};

export default VDFinanceSummary;