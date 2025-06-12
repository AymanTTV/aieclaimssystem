// src/components/IncomeExpense/SharesModal.tsx

import React, { useState, useMemo } from 'react';
import { ProfitShare } from '../../types/incomeExpense';
import { useFormattedDisplay } from '../../hooks/useFormattedDisplay';

interface Props {
  shares: ProfitShare[];
  onClose(): void;
  onGeneratePDF(): void;
  collectionName: string;
}

const ITEMS_PER_PAGE = 5;

export default function SharesModal({ shares, onClose,  onGeneratePDF }: Props) {
  const { formatCurrency } = useFormattedDisplay();

  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState({ start: '', end: '' });

  const filtered = useMemo(() => {
    return shares.filter(sp => {
      if (filter.start && new Date(sp.endDate) < new Date(filter.start)) return false;
      if (filter.end && new Date(sp.startDate) > new Date(filter.end)) return false;
      return true;
    });
  }, [shares, filter]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="grid grid-cols-2 gap-4">
        <label className="block text-sm font-medium">Start Date
          <input
            type="date"
            value={filter.start}
            onChange={e => setFilter(f => ({ ...f, start: e.target.value }))}
            className="w-full mt-1 border p-2 rounded"
          />
        </label>
        <label className="block text-sm font-medium">End Date
          <input
            type="date"
            value={filter.end}
            onChange={e => setFilter(f => ({ ...f, end: e.target.value }))}
            className="w-full mt-1 border p-2 rounded"
          />
        </label>
      </div>

      {/* Table */}
      <div className="overflow-x-auto border rounded bg-white shadow">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 text-left">Date Range</th>
              <th className="p-2 text-left">Recipients</th>
              <th className="p-2 text-left">Total Shared</th>
            </tr>
          </thead>
          <tbody>
            {paginated.map(sp => (
              <tr key={sp.id} className="border-t hover:bg-gray-50">
                <td className="p-2">
                  {sp.startDate} → {sp.endDate}
                </td>
                <td className="p-2 space-y-1">
                  {sp.recipients.map(r => (
                    <div key={r.name}>
                      <span className="font-medium">{r.name}</span> ({r.percentage}%): {formatCurrency(r.amount)}
                    </div>
                  ))}
                </td>
                <td className="p-2 font-bold text-blue-700">
                  {formatCurrency(sp.totalSplitAmount)}
                </td>
              </tr>
            ))}
            {paginated.length === 0 && (
              <tr>
                <td colSpan={3} className="p-4 text-center text-gray-500">
                  No share records found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination & Export */}
      <div className="flex justify-between items-center mt-4">
        <div className="space-x-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            className="px-3 py-1 border rounded disabled:opacity-50"
            disabled={page === 1}
          >
            Prev
          </button>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            className="px-3 py-1 border rounded disabled:opacity-50"
            disabled={page === totalPages}
          >
            Next
          </button>
        </div>

        <button
          onClick={onGeneratePDF}
          className="px-4 py-2 bg-primary text-white rounded"
        >
          Generate PDF
        </button>
      </div>
    </div>
  );
}
