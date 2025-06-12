// src/components/vdFinance/VDFinanceSummary.tsx

import React from 'react';
import { VDFinanceRecord } from '../../types/vdFinance';
import { useFormattedDisplay } from '../../hooks/useFormattedDisplay'; // Import the hook
import { usePermissions } from '../../hooks/usePermissions';

interface VDFinanceSummaryProps {
  records: VDFinanceRecord[];
}

const VDFinanceSummary: React.FC<VDFinanceSummaryProps> = ({ records }) => {
  const { formatCurrency } = useFormattedDisplay(); // Use the hook

  const { can } = usePermissions();
  
    // Don't even render the cards if the user lacks the 'cards' permission
    if (!can('vdFinance', 'cards')) {
      return null;
    }

  // Calculate summary including new fields
  const summary = records.reduce(
    (acc, record) => ({
      total: acc.total + record.totalAmount,
      net: acc.net + record.netAmount,
      vatIn: acc.vatIn + record.vatIn,
      vatOut: acc.vatOut + record.vatOut,
      expenses: acc.expenses + record.purchasedItems,
      solicitorFee: acc.solicitorFee + record.solicitorFee,
      clientRepair: acc.clientRepair + record.clientRepair,
      // Add salvage and clientReferralFee to the accumulator
      salvage: acc.salvage + (record.salvage || 0), // Ensure default to 0 if undefined
      clientReferralFee: acc.clientReferralFee + (record.clientReferralFee || 0), // Ensure default to 0 if undefined
      profit: acc.profit + record.profit, // Assuming profit is already calculated correctly in the record
    }),
    {
      total: 0,
      net: 0,
      vatIn: 0,
      vatOut: 0,
      expenses: 0,
      solicitorFee: 0,
      clientRepair: 0,
      salvage: 0, // Initialize new fields
      clientReferralFee: 0, // Initialize new fields
      profit: 0
    }
  );

  return (
    // Updated grid layout to accommodate 5 columns on extra-large screens (xl)
    // grid-cols-1 for mobile, sm:grid-cols-2 for small screens, lg:grid-cols-3 for large screens, xl:grid-cols-5 for extra-large screens
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">

      {/* Total Amount Card */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-sm font-medium text-gray-500">TOTAL AMOUNT</h3>
        <p className="mt-2 text-3xl font-semibold text-gray-900">
          {formatCurrency(summary.total)}
        </p>
      </div>

      {/* NET Amount Card */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-sm font-medium text-gray-500">NET AMOUNT</h3>
        <p className="mt-2 text-3xl font-semibold text-green-600">
          {formatCurrency(summary.net)}
        </p>
      </div>

      {/* VAT IN Card */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-sm font-medium text-gray-500">VAT IN</h3>
        <p className="mt-2 text-3xl font-semibold text-blue-600">
          {formatCurrency(summary.vatIn)}
        </p>
      </div>

      {/* VAT OUT Card */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-sm font-medium text-gray-500">VAT OUT</h3>
        <p className="mt-2 text-3xl font-semibold text-red-600">
          {formatCurrency(summary.vatOut)}
        </p>
      </div>

      {/* Expenses Card */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-sm font-medium text-gray-500">EXPENSES (Purchased Items)</h3> {/* Clarified label */}
        <p className="mt-2 text-3xl font-semibold text-amber-600">
          {formatCurrency(summary.expenses)}
        </p>
      </div>

      {/* Solicitor Fee Card */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-sm font-medium text-gray-500">SOLICITOR FEE</h3>
        <p className="mt-2 text-3xl font-semibold text-indigo-600">
          {formatCurrency(summary.solicitorFee)}
        </p>
      </div>

      {/* Client Repair Card */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-sm font-medium text-gray-500">CLIENT REPAIR</h3>
        <p className="mt-2 text-3xl font-semibold text-orange-600">
          {formatCurrency(summary.clientRepair)}
        </p>
      </div>

      {/* Salvage Card - New */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-sm font-medium text-gray-500">SALVAGE</h3>
        <p className="mt-2 text-3xl font-semibold text-purple-600"> {/* Using a different color */}
          {formatCurrency(summary.salvage)}
        </p>
      </div>

      {/* Client Referral Fee Card - New */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-sm font-medium text-gray-500">CLIENT REFERRAL FEE</h3>
        <p className="mt-2 text-3xl font-semibold text-pink-600"> {/* Using a different color */}
          {formatCurrency(summary.clientReferralFee)}
        </p>
      </div>

      {/* Profit Card */}
      {/* This card's position might shift depending on the grid layout */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-sm font-medium text-gray-500">PROFIT</h3>
        <p className="mt-2 text-3xl font-semibold text-emerald-600">
          {formatCurrency(summary.profit)}
        </p>
      </div>
    </div>
  );
};

export default VDFinanceSummary;
