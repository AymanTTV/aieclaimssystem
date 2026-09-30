// src/components/common/SubcontractorProfitField.tsx
import React from 'react';
import { calculateProfitMetrics } from '../../utils/profitCalculator';
import { useFormattedDisplay } from '../../hooks/useFormattedDisplay';
import { TrendingUp, TrendingDown, Percent, Building2 } from 'lucide-react';

interface SubcontractorProfitFieldProps {
  subcontractorCost: number | string;
  onChangeSubcontractorCost: (val: number) => void;
  customerBilled: number | string;
  onChangeCustomerBilled?: (val: number) => void;
  allowEditBilled?: boolean;
  label?: string;
  billedLabel?: string;
  helperText?: string;
  className?: string;
}

export const SubcontractorProfitField: React.FC<SubcontractorProfitFieldProps> = ({
  subcontractorCost,
  onChangeSubcontractorCost,
  customerBilled,
  onChangeCustomerBilled,
  allowEditBilled = false,
  label = 'Dealer / Subcontractor Cost (£)',
  billedLabel = 'Customer Billed Amount (£)',
  helperText = 'The external garage or dealer charge (base subcontractor expense)',
  className = '',
}) => {
  const { formatCurrency } = useFormattedDisplay();

  const numSubCost = Math.max(0, Number(subcontractorCost) || 0);
  const numBilled = Math.max(0, Number(customerBilled) || 0);
  const metrics = calculateProfitMetrics(numBilled, numSubCost);

  return (
    <div className={`p-4 rounded-xl border-2 border-indigo-200/90 bg-white shadow-xs space-y-3 ${className}`}>
      {/* Header with Title and Internal Badge */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-200">
            <Building2 className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              Dealer / Subcontractor Cost & Profit Tracking
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 uppercase tracking-wide">
                Live Preview
              </span>
            </h4>
            <p className="text-[11px] text-slate-500 mt-0.5">{helperText}</p>
          </div>
        </div>
      </div>

      {/* Input Fields */}
      <div className={`grid gap-3 ${allowEditBilled ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'}`}>
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
            {label}
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm select-none">
              £
            </span>
            <input
              type="number"
              step="0.01"
              min="0"
              value={subcontractorCost === 0 && !subcontractorCost.toString() ? '' : subcontractorCost}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                onChangeSubcontractorCost(isNaN(val) ? 0 : Math.max(0, val));
              }}
              placeholder="0.00 (e.g. 180.00)"
              className="w-full pl-7 pr-3 py-2 text-sm font-mono font-bold bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
            />
          </div>
          <span className="text-[10px] text-slate-500 mt-1 block">External dealer / subcontractor charge</span>
        </div>

        {allowEditBilled && onChangeCustomerBilled && (
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              {billedLabel}
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm select-none">
                £
              </span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={customerBilled === 0 && !customerBilled.toString() ? '' : customerBilled}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  onChangeCustomerBilled(isNaN(val) ? 0 : Math.max(0, val));
                }}
                placeholder="0.00 (e.g. 250.00)"
                className="w-full pl-7 pr-3 py-2 text-sm font-mono font-bold bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
              />
            </div>
            <span className="text-[10px] text-slate-500 mt-1 block">Amount charged / billed to client</span>
          </div>
        )}
      </div>

      {/* Live Auto-Calculated Profit Previews */}
      <div className="pt-2 border-t border-slate-100">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            Live Profit Calculations
          </span>
          <span className="text-[11px] font-mono text-slate-600">
            Billed: <strong className="text-slate-900">{formatCurrency(numBilled)}</strong>
            {' – '}
            Dealer: <strong className="text-slate-900">{formatCurrency(numSubCost)}</strong>
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          {/* Live Net Profit (£) Badge */}
          <div
            className={`p-2.5 rounded-lg border transition-all ${
              metrics.netProfit > 0
                ? 'bg-emerald-50/90 border-emerald-300'
                : metrics.netProfit < 0
                ? 'bg-rose-50/90 border-rose-300'
                : 'bg-slate-50 border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <span
                className={`text-[10px] font-bold uppercase tracking-wider ${
                  metrics.netProfit > 0
                    ? 'text-emerald-800'
                    : metrics.netProfit < 0
                    ? 'text-rose-800'
                    : 'text-slate-600'
                }`}
              >
                Live Net Profit (£)
              </span>
              {metrics.netProfit > 0 ? (
                <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
              ) : metrics.netProfit < 0 ? (
                <TrendingDown className="w-3.5 h-3.5 text-rose-600" />
              ) : null}
            </div>
            <p
              className={`text-base font-black font-mono mt-0.5 ${
                metrics.netProfit > 0
                  ? 'text-emerald-700'
                  : metrics.netProfit < 0
                  ? 'text-rose-700'
                  : 'text-slate-800'
              }`}
            >
              {metrics.netProfit >= 0 ? '+' : ''}
              {formatCurrency(metrics.netProfit)}
            </p>
            <span
              className={`inline-block px-1.5 py-0.2 rounded text-[9px] font-bold uppercase mt-0.5 ${
                metrics.netProfit > 0
                  ? 'bg-emerald-100 text-emerald-800'
                  : metrics.netProfit < 0
                  ? 'bg-rose-100 text-rose-800'
                  : 'bg-slate-200 text-slate-700'
              }`}
            >
              {metrics.netProfit > 0 ? '✓ Profitable' : metrics.netProfit < 0 ? '⚠ Net Loss' : 'Break-even'}
            </span>
          </div>

          {/* Live Profit Margin (%) Badge */}
          <div
            className={`p-2.5 rounded-lg border transition-all ${
              metrics.profitMarginPercent > 0
                ? 'bg-indigo-50/90 border-indigo-300'
                : metrics.profitMarginPercent < 0
                ? 'bg-rose-50/90 border-rose-300'
                : 'bg-slate-50 border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <span
                className={`text-[10px] font-bold uppercase tracking-wider ${
                  metrics.profitMarginPercent > 0
                    ? 'text-indigo-800'
                    : metrics.profitMarginPercent < 0
                    ? 'text-rose-800'
                    : 'text-slate-600'
                }`}
              >
                Live Profit Margin (%)
              </span>
              <Percent className="w-3.5 h-3.5 text-indigo-600" />
            </div>
            <p
              className={`text-base font-black font-mono mt-0.5 ${
                metrics.profitMarginPercent > 0
                  ? 'text-indigo-700'
                  : metrics.profitMarginPercent < 0
                  ? 'text-rose-700'
                  : 'text-slate-800'
              }`}
            >
              {metrics.profitMarginPercent.toFixed(1)}%
            </p>
            <span className="text-[10px] text-slate-500 mt-0.5 block truncate">
              {numBilled > 0 ? `${metrics.profitMarginPercent.toFixed(1)}% on billed` : 'Enter billed total'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubcontractorProfitField;
