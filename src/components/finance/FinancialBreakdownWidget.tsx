import React from 'react';
import { formatCurrency } from '../../utils/formatters';

export interface FinancialBreakdownWidgetProps {
  total: number;
  paid?: number;
  owing?: number;
  dealerCost?: number;
  subcontractorCost?: number;
  netProfit?: number;
  profitMarginPercent?: number;
  net?: number;
  vat?: number;
  discount?: number;
  layout?: 'breakdown' | 'cards' | 'inline' | 'compact';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showLabels?: boolean;
  className?: string;
}

/**
 * Standardized Financial Breakdown Widget
 * Applies uniform semantic coloring:
 * - Total: #D97706 (Amber)
 * - Paid: #047857 / #059669 (Green)
 * - Owing: #DC2626 (Red when > 0, Green when cleared)
 * - Dealer / Cost: #475569 (Neutral Muted Slate Gray)
 * - Profit / Margin: Green (#047857) when >= 0, Red (#DC2626) when negative
 */
export const FinancialBreakdownWidget: React.FC<FinancialBreakdownWidgetProps> = ({
  total,
  paid = 0,
  owing: customOwing,
  dealerCost,
  subcontractorCost,
  netProfit: customNetProfit,
  profitMarginPercent: customMargin,
  net,
  vat,
  discount,
  layout = 'breakdown',
  size = 'sm',
  className = '',
}) => {
  // Resolve effective values
  const effectiveOwing = customOwing !== undefined ? customOwing : Math.max(0, total - paid);
  const isSettled = effectiveOwing <= 0.005;
  const effectiveDealerCost = dealerCost !== undefined ? dealerCost : subcontractorCost;
  const hasDealerCost = effectiveDealerCost !== undefined && effectiveDealerCost > 0;

  const effectiveNetProfit =
    customNetProfit !== undefined
      ? customNetProfit
      : hasDealerCost
      ? total - effectiveDealerCost!
      : undefined;

  const effectiveMargin =
    customMargin !== undefined
      ? customMargin
      : effectiveNetProfit !== undefined && total > 0
      ? (effectiveNetProfit / total) * 100
      : undefined;

  // Text size classes
  const textSizeClass =
    size === 'xs'
      ? 'text-[11px]'
      : size === 'sm'
      ? 'text-xs'
      : size === 'lg'
      ? 'text-base'
      : 'text-sm';

  // 1. CARDS LAYOUT: Summary cards grid
  if (layout === 'cards') {
    return (
      <div className={`grid grid-cols-1 sm:grid-cols-3 gap-3 ${className}`}>
        {/* Total Due Card (Amber) */}
        <div className="bg-amber-50/80 p-3.5 rounded-xl border border-amber-200 shadow-2xs">
          <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">
            Total Amount
          </span>
          <p className="text-lg sm:text-xl font-black font-mono text-amber-950 mt-1">
            {formatCurrency(total)}
          </p>
        </div>

        {/* Paid Card (Green) */}
        <div className="bg-emerald-50/80 p-3.5 rounded-xl border border-emerald-200 shadow-2xs">
          <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">
            Paid Amount
          </span>
          <p className="text-lg sm:text-xl font-black font-mono text-emerald-950 mt-1">
            {formatCurrency(paid)}
          </p>
        </div>

        {/* Owing Card (Red if outstanding, Green if settled) */}
        <div
          className={`p-3.5 rounded-xl border shadow-2xs ${
            isSettled ? 'bg-emerald-50/80 border-emerald-200' : 'bg-rose-50/80 border-rose-200'
          }`}
        >
          <span
            className={`text-[10px] font-bold uppercase tracking-wider block ${
              isSettled ? 'text-emerald-800' : 'text-rose-800'
            }`}
          >
            Owing Amount
          </span>
          <p
            className={`text-lg sm:text-xl font-black font-mono mt-1 ${
              isSettled ? 'text-emerald-950' : 'text-rose-950'
            }`}
          >
            {isSettled ? '£0.00 (Settled)' : formatCurrency(effectiveOwing)}
          </p>
        </div>
      </div>
    );
  }

  // 2. INLINE / BADGES LAYOUT: Clean horizontal pills
  if (layout === 'inline') {
    return (
      <div className={`flex items-center gap-2 flex-wrap ${textSizeClass} ${className}`}>
        {/* Total (Amber) */}
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 border border-amber-200 rounded-lg font-bold text-amber-800 shadow-2xs">
          <span>Total:</span>
          <span className="font-mono">{formatCurrency(total)}</span>
        </div>

        {/* Paid (Green) */}
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-200 rounded-lg font-bold text-emerald-800 shadow-2xs">
          <span>Paid:</span>
          <span className="font-mono">{formatCurrency(paid)}</span>
        </div>

        {/* Owing (Red if owing > 0, Green if cleared) */}
        <div
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-bold shadow-2xs border ${
            isSettled
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <span>Owing:</span>
          <span className="font-mono">
            {isSettled ? '£0.00' : formatCurrency(effectiveOwing)}
          </span>
        </div>

        {/* Profit Badge (if available) */}
        {effectiveNetProfit !== undefined && (
          <div
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-bold shadow-2xs border ${
              effectiveNetProfit >= 0
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            <span>Profit:</span>
            <span className="font-mono">
              {effectiveNetProfit >= 0 ? '+' : ''}
              {formatCurrency(effectiveNetProfit)}
            </span>
          </div>
        )}
      </div>
    );
  }

  // 3. COMPACT TABLE CELL LAYOUT
  if (layout === 'compact') {
    return (
      <div className={`space-y-0.5 ${textSizeClass} font-medium ${className}`}>
        <div className="flex justify-between font-bold text-[#D97706] pb-0.5 border-b border-slate-100">
          <span>Total:</span>
          <span className="font-mono">{formatCurrency(total)}</span>
        </div>
        <div className="flex justify-between font-bold text-[#15803D]">
          <span>Paid:</span>
          <span className="font-mono">{formatCurrency(paid)}</span>
        </div>
        <div
          className={`flex justify-between font-bold ${
            isSettled ? 'text-[#15803D]' : 'text-[#DC2626]'
          }`}
        >
          <span>Owing:</span>
          <span className="font-mono">{formatCurrency(effectiveOwing)}</span>
        </div>
        {hasDealerCost && (
          <>
            <div className="pt-0.5 border-t border-dashed border-slate-200 flex justify-between text-[10px] text-slate-500 font-medium">
              <span>Dealer:</span>
              <span className="font-mono font-bold text-slate-700">
                {formatCurrency(effectiveDealerCost!)}
              </span>
            </div>
            {effectiveNetProfit !== undefined && (
              <div className="flex justify-between text-[10px] font-bold items-center pt-0.5">
                <span className={effectiveNetProfit >= 0 ? 'text-[#047857]' : 'text-[#DC2626]'}>
                  Profit:
                </span>
                <span
                  className={`font-mono ${
                    effectiveNetProfit >= 0 ? 'text-[#047857]' : 'text-[#DC2626]'
                  }`}
                >
                  {effectiveNetProfit >= 0 ? '+' : ''}
                  {formatCurrency(effectiveNetProfit)}
                </span>
              </div>
            )}
            {effectiveMargin !== undefined && (
              <div className="flex justify-end pt-0.5">
                <span
                  className={`inline-block px-1.5 py-0.2 text-[9px] font-bold rounded border ${
                    effectiveMargin >= 0
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : 'bg-rose-50 text-rose-800 border-rose-200'
                  }`}
                >
                  {effectiveMargin.toFixed(1)}% Margin
                </span>
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  // 4. DEFAULT: FULL BREAKDOWN (Cards / Modals / Details)
  return (
    <div className={`space-y-1.5 ${textSizeClass} ${className}`}>
      {net !== undefined && (
        <div className="flex justify-between items-center text-slate-700 font-semibold">
          <span>Net Subtotal:</span>
          <span className="font-mono text-slate-900">{formatCurrency(net)}</span>
        </div>
      )}
      {vat !== undefined && (
        <div className="flex justify-between items-center text-blue-700 font-semibold">
          <span>VAT:</span>
          <span className="font-mono">{formatCurrency(vat)}</span>
        </div>
      )}
      {discount !== undefined && discount > 0 && (
        <div className="flex justify-between items-center text-[#D97706] font-semibold">
          <span>Discount:</span>
          <span className="font-mono">–{formatCurrency(discount)}</span>
        </div>
      )}

      {/* Total: Amber #D97706 */}
      <div className="flex justify-between items-center font-bold text-[#D97706] pt-1.5 border-t border-slate-200 text-sm sm:text-base">
        <span>Total:</span>
        <span className="font-mono font-bold">{formatCurrency(total)}</span>
      </div>

      {/* Paid: Green #15803D / #047857 */}
      <div className="flex justify-between items-center font-bold text-[#15803D]">
        <span>Paid:</span>
        <span className="font-mono font-bold">{formatCurrency(paid)}</span>
      </div>

      {/* Owing: Red #DC2626 (or Green if £0.00 settled) */}
      <div
        className={`flex justify-between items-center font-bold ${
          isSettled ? 'text-[#15803D]' : 'text-[#DC2626]'
        }`}
      >
        <span>Owing:</span>
        <span className="font-mono font-bold">{formatCurrency(effectiveOwing)}</span>
      </div>

      {/* Dealer / Internal Subcontractor Cost: Neutral Slate */}
      {hasDealerCost && (
        <div className="pt-1.5 border-t border-dashed border-slate-200 space-y-1">
          <div className="flex justify-between items-center text-slate-600 font-medium">
            <span>Dealer Cost:</span>
            <span className="font-mono font-bold text-slate-800">
              {formatCurrency(effectiveDealerCost!)}
            </span>
          </div>

          {effectiveNetProfit !== undefined && (
            <div className="flex justify-between items-center font-bold">
              <span className={effectiveNetProfit >= 0 ? 'text-[#047857]' : 'text-[#DC2626]'}>
                Profit:
              </span>
              <span
                className={`font-mono font-bold ${
                  effectiveNetProfit >= 0 ? 'text-[#047857]' : 'text-[#DC2626]'
                }`}
              >
                {effectiveNetProfit >= 0 ? '+' : ''}
                {formatCurrency(effectiveNetProfit)}
                {effectiveMargin !== undefined && (
                  <span className="text-[11px] font-sans font-medium ml-1">
                    ({effectiveMargin.toFixed(1)}%)
                  </span>
                )}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FinancialBreakdownWidget;
