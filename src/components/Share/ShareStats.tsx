import React from 'react';

interface Props {
  totalNet: number;
  totalExpense: number;
  totalProfit: number;
}

export const ShareStats: React.FC<Props> = ({ totalNet, totalExpense, totalProfit }) => (
  <div className="grid grid-cols-3 gap-4 mb-6">
    <div className="p-4 bg-white rounded-lg shadow">
      <h4 className="text-sm text-gray-500">Net</h4>
      <p className="text-2xl font-bold">{totalNet.toLocaleString()}</p>
    </div>
    <div className="p-4 bg-white rounded-lg shadow">
      <h4 className="text-sm text-gray-500">Expense</h4>
      <p className="text-2xl font-bold">{totalExpense.toLocaleString()}</p>
    </div>
    <div className="p-4 bg-white rounded-lg shadow">
      <h4 className="text-sm text-gray-500">Profit</h4>
      <p className="text-2xl font-bold">{totalProfit.toLocaleString()}</p>
    </div>
  </div>
);