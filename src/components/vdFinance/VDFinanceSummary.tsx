// src/components/vdFinance/VDFinanceSummary.tsx
import React from 'react';
import { VDFinanceRecord } from '../../types/vdFinance';
import { useFormattedDisplay } from '../../hooks/useFormattedDisplay';
import { usePermissions } from '../../hooks/usePermissions';

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
    {
      total: 0,
      net: 0,
      vatIn: 0,
      vatOut: 0,
      expenses: 0,
      solicitorFee: 0,
      clientRepair: 0,
      salvage: 0,
      clientReferralFee: 0,
      profit: 0,
    }
  );

  const Card: React.FC<{ label: string; value: number; tone?: string }> = ({ label, value, tone }) => (
    <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
      <h3 className="text-xs sm:text-sm font-medium text-gray-500">{label}</h3>
      <p className={`mt-2 text-lg sm:text-3xl font-semibold ${tone ?? 'text-gray-900'}`}>
        {formatCurrency(value)}
      </p>
    </div>
  );

  return (
    <div className="grid grid-cols-1 min-[380px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
      <Card label="TOTAL AMOUNT"               value={summary.total} />
      <Card label="NET AMOUNT"                 value={summary.net} tone="text-green-600" />
      <Card label="VAT IN"                     value={summary.vatIn} tone="text-blue-600" />
      <Card label="VAT OUT"                    value={summary.vatOut} tone="text-red-600" />
      <Card label="EXPENSES (Purchased Items)" value={summary.expenses} tone="text-amber-600" />
      <Card label="SOLICITOR FEE"              value={summary.solicitorFee} tone="text-indigo-600" />
      <Card label="CLIENT REPAIR"              value={summary.clientRepair} tone="text-orange-600" />
      <Card label="SALVAGE"                    value={summary.salvage} tone="text-purple-600" />
      <Card label="CLIENT REFERRAL FEE"        value={summary.clientReferralFee} tone="text-pink-600" />
      <Card label="PROFIT"                     value={summary.profit} tone="text-emerald-600" />
    </div>
  );
};

export default VDFinanceSummary;
