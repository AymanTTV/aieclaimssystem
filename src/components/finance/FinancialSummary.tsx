import React from 'react';
import { DollarSign, TrendingUp, TrendingDown, Percent, Wallet } from 'lucide-react';
import { useFormattedDisplay } from '../../hooks/useFormattedDisplay';
import { usePermissions } from '../../hooks/usePermissions';

interface FinancialSummaryProps {
  totalIncome: number;
  totalExpenses: number;
  netIncome: number;
  profitMargin: number;
  totalOwingFromOwners: number;
}

const FinancialSummary: React.FC<FinancialSummaryProps> = ({
  totalIncome,
  totalExpenses,
  netIncome,
  profitMargin,
  totalOwingFromOwners,
}) => {
  const { formatCurrency, formatPercentage } = useFormattedDisplay();
  const { can } = usePermissions();

  if (!can('finance', 'cards')) return null;

  const netTone =
    netIncome > 0 ? 'text-green-600' : netIncome < 0 ? 'text-red-600' : 'text-gray-700';

  // guard against NaN or Infinity in margin
  const safeProfitMargin =
    Number.isFinite(profitMargin) && !Number.isNaN(profitMargin) ? profitMargin : 0;

  const cards = [
    {
      key: 'income',
      label: 'Total Income',
      value: formatCurrency(totalIncome),
      tone: 'text-gray-900',
      icon: <TrendingUp className="w-6 h-6 sm:w-7 sm:h-7 text-green-500" />,
    },
    {
      key: 'expenses',
      label: 'Total Expenses',
      value: formatCurrency(totalExpenses),
      tone: 'text-gray-900',
      icon: <TrendingDown className="w-6 h-6 sm:w-7 sm:h-7 text-red-500" />,
    },
    {
      key: 'net',
      label: 'Net Income',
      value: formatCurrency(netIncome),
      tone: netTone,
      icon: <DollarSign className="w-6 h-6 sm:w-7 sm:h-7 text-blue-500" />,
    },
    {
      key: 'margin',
      label: 'Profit Margin',
      value: formatPercentage(safeProfitMargin),
      tone: 'text-purple-600',
      icon: <Percent className="w-6 h-6 sm:w-7 sm:h-7 text-purple-500" />,
    },
    {
      key: 'owing',
      label: 'Owing from Owners',
      value: formatCurrency(totalOwingFromOwners),
      tone: 'text-orange-600',
      icon: <Wallet className="w-6 h-6 sm:w-7 sm:h-7 text-orange-500" />,
    },
  ] as const;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4 mb-6">
      {cards.map((c) => (
        <div
          key={c.key}
          className="bg-white rounded-lg shadow-sm p-4 sm:p-5 border border-gray-100"
        >
          <div className="flex items-center gap-3">
            <div className="rounded-md p-2 bg-gray-50">{c.icon}</div>
            <div className="min-w-0">
              <p className="text-[11px] sm:text-xs font-medium text-gray-500 truncate">
                {c.label}
              </p>
              <p className={`mt-1 text-xl sm:text-2xl font-semibold ${c.tone}`}>
                {c.value}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default FinancialSummary;
