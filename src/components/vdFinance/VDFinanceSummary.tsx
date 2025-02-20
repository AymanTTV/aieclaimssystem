// src/components/vdFinance/VDFinanceSummary.tsx

import React from 'react';
import { VDFinanceRecord } from '../../types/vdFinance';

interface VDFinanceSummaryProps {
  records: VDFinanceRecord[];
}

const VDFinanceSummary: React.FC<VDFinanceSummaryProps> = ({ records }) => {
  const summary = records.reduce(
    (acc, record) => ({
      total: acc.total + record.totalAmount,
      net: acc.net + record.netAmount,
      vatIn: acc.vatIn + record.vatIn,
      vatOut: acc.vatOut + record.vatOut,
      expenses: acc.expenses + record.purchasedItems,
      solicitorFee: acc.solicitorFee + record.solicitorFee,
      clientRepair: acc.clientRepair + record.clientRepair,
      profit: acc.profit + record.profit,
    }),
    { 
      total: 0, 
      net: 0, 
      vatIn: 0, 
      vatOut: 0, 
      expenses: 0, 
      solicitorFee: 0, 
      clientRepair: 0, 
      profit: 0 
    }
  );

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total Amount Card */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-sm font-medium text-gray-500">TOTAL AMOUNT</h3>
        <p className="mt-2 text-3xl font-semibold text-gray-900">
          £{summary.total.toFixed(2)}
        </p>
      </div>

      {/* NET Amount Card */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-sm font-medium text-gray-500">NET AMOUNT</h3>
        <p className="mt-2 text-3xl font-semibold text-green-600">
          £{summary.net.toFixed(2)}
        </p>
      </div>

      {/* VAT IN Card */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-sm font-medium text-gray-500">VAT IN</h3>
        <p className="mt-2 text-3xl font-semibold text-blue-600">
          £{summary.vatIn.toFixed(2)}
        </p>
      </div>

      {/* VAT OUT Card */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-sm font-medium text-gray-500">VAT OUT</h3>
        <p className="mt-2 text-3xl font-semibold text-red-600">
          £{summary.vatOut.toFixed(2)}
        </p>
      </div>

      {/* Expenses Card */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-sm font-medium text-gray-500">EXPENSES</h3>
        <p className="mt-2 text-3xl font-semibold text-amber-600">
          £{summary.expenses.toFixed(2)}
        </p>
      </div>

      {/* Solicitor Fee Card */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-sm font-medium text-gray-500">SOLICITOR FEE</h3>
        <p className="mt-2 text-3xl font-semibold text-indigo-600">
          £{summary.solicitorFee.toFixed(2)}
        </p>
      </div>

      {/* Client Repair Card */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-sm font-medium text-gray-500">CLIENT REPAIR</h3>
        <p className="mt-2 text-3xl font-semibold text-orange-600">
          £{summary.clientRepair.toFixed(2)}
        </p>
      </div>

      {/* Profit Card */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-sm font-medium text-gray-500">PROFIT</h3>
        <p className="mt-2 text-3xl font-semibold text-emerald-600">
          £{summary.profit.toFixed(2)}
        </p>
      </div>
    </div>
  );
};

export default VDFinanceSummary;
