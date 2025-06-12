// src/components/income-expense/IncomeExpenseDetails.tsx

import React from 'react';
import { IncomeExpenseEntry } from '../../types/incomeExpense';
import { format } from 'date-fns';
import { useFormattedDisplay } from '../../hooks/useFormattedDisplay';

interface Props {
  entry: IncomeExpenseEntry;
}

const IncomeExpenseDetails: React.FC<Props> = ({ entry }) => {
  const { formatCurrency } = useFormattedDisplay();

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <dt className="text-sm font-medium text-gray-500">Customer</dt>
          <dd className="text-sm text-gray-900">{entry.customer}</dd>
        </div>
        <div>
          <dt className="text-sm font-medium text-gray-500">Reference</dt>
          <dd className="text-sm text-gray-900">{entry.reference}</dd>
        </div>
        <div>
          <dt className="text-sm font-medium text-gray-500">Date</dt>
          <dd className="text-sm text-gray-900">{format(new Date(entry.date), 'dd/MM/yyyy')}</dd>
        </div>
        <div>
          <dt className="text-sm font-medium text-gray-500">Type</dt>
          <dd className="text-sm text-gray-900">{entry.type}</dd>
        </div>
      </div>

      {entry.type === 'income' ? (
        <>
          <dt className="text-sm font-medium text-gray-500 mt-4">Description</dt>
          <dd className="text-sm text-gray-900">{(entry as any).description}</dd>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <dt className="text-sm font-medium text-gray-500">Net</dt>
              <dd className="text-sm text-gray-900">{formatCurrency((entry as any).net)}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">VAT</dt>
              <dd className="text-sm text-gray-900">{(entry as any).vatIncluded ? '20%' : '0%'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Total</dt>
              <dd className="text-sm text-green-700 font-bold">{formatCurrency((entry as any).total)}</dd>
            </div>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Payment Status</dt>
            <dd className="text-sm text-gray-900">{(entry as any).paymentStatus}</dd>
          </div>
          {entry.note && (
            <div>
              <dt className="text-sm font-medium text-gray-500">Note</dt>
              <dd className="text-sm text-gray-900">{entry.note}</dd>
            </div>
          )}
        </>
      ) : (
        <>
          <div className="space-y-2">
            <h4 className="font-semibold text-gray-700">Expense Items</h4>
            {(entry as any).items.map((item: any, i: number) => (
              <div key={i} className="p-2 bg-gray-50 rounded">
                <div className="grid grid-cols-4 gap-2 text-sm">
                  <span><strong>Type:</strong> {item.type}</span>
                  <span><strong>Desc:</strong> {item.description}</span>
                  <span><strong>Qty:</strong> {item.quantity}</span>
                  <span><strong>Unit:</strong> £{item.unitPrice.toFixed(2)}</span>
                </div>
                <div className="text-sm text-gray-500">VAT: {item.vat ? '20%' : '0%'}</div>
              </div>
            ))}
            <div className="font-bold text-blue-600">
              Total Cost: {formatCurrency((entry as any).totalCost)}
            </div>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Status</dt>
            <dd className="text-sm text-gray-900">{(entry as any).status}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Payment</dt>
            <dd className="text-sm text-gray-900">{(entry as any).paymentStatus}</dd>
          </div>
        </>
      )}
    </div>
  );
};

export default IncomeExpenseDetails;
