// src/components/IncomeExpense/SharesModal.tsx

import React, { useState, useMemo } from 'react';
import { ProfitShare } from '../../types/incomeExpense';
import { useFormattedDisplay } from '../../hooks/useFormattedDisplay';
import { useAuth } from '../../context/AuthContext'
import { FileText } from 'lucide-react'; // Added icon for button

interface Props {
  shares: ProfitShare[];
  onClose(): void;
  onGeneratePDF(): void;
  collectionName: string;
}

const ITEMS_PER_PAGE = 5;

export default function SharesModal({ shares, onClose, onGeneratePDF }: Props) {
  const { formatCurrency } = useFormattedDisplay();
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState({ start: '', end: '' });
  const { user } = useAuth()

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
        <label className="block text-sm font-medium text-gray-700">Start Date
          <input
            type="date"
            value={filter.start}
            onChange={e => setFilter(f => ({ ...f, start: e.target.value }))}
            className="w-full mt-1 border border-gray-300 p-2 rounded focus:ring-primary focus:border-primary"
          />
        </label>
        <label className="block text-sm font-medium text-gray-700">End Date
          <input
            type="date"
            value={filter.end}
            onChange={e => setFilter(f => ({ ...f, end: e.target.value }))}
            className="w-full mt-1 border border-gray-300 p-2 rounded focus:ring-primary focus:border-primary"
          />
        </label>
      </div>

      {/* Table */}
      <div className="overflow-x-auto border rounded-lg bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-gray-700 uppercase tracking-wider text-xs font-semibold">
            <tr>
              <th className="p-3 text-left">Date Range</th>
              <th className="p-3 text-left">Recipients</th>
              <th className="p-3 text-right">Total Shared</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {paginated.map(sp => (
              <tr key={sp.id} className="hover:bg-gray-50 transition-colors">
                <td className="p-3 font-medium text-gray-900 whitespace-nowrap">
                  {sp.startDate} <span className="text-gray-400">→</span> {sp.endDate}
                </td>
                <td className="p-3 space-y-1">
                  {sp.recipients.map((r, idx) => (
                    <div key={`${sp.id}-${idx}-${r.name}`} className="flex items-center text-gray-600">
                      <span className="font-medium text-gray-900 mr-1">{r.name}</span> 
                      <span className="text-xs bg-gray-100 px-1.5 rounded text-gray-500 mr-2">
                        {r.percentage}%
                      </span>
                      {/* Visual Indicator for Pay vs Get */}
                      <span className={sp.totalSplitAmount < 0 ? "text-red-600" : "text-green-600"}>
                        {formatCurrency(r.amount)}
                      </span>
                    </div>
                  ))}
                </td>
                {/* Updated styling for Totals */}
                <td className={`p-3 text-right font-bold ${sp.totalSplitAmount < 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {formatCurrency(sp.totalSplitAmount)}
                </td>
              </tr>
            ))}
            {paginated.length === 0 && (
              <tr>
                <td colSpan={3} className="p-8 text-center text-gray-500 italic">
                  No share records found matching filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination & Export */}
      <div className="flex justify-between items-center mt-4 pt-2 border-t">
        <div className="flex space-x-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            className="px-3 py-1.5 border border-gray-300 rounded text-sm font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={page === 1}
          >
            Previous
          </button>
          <span className="flex items-center text-sm text-gray-600 px-2">
             Page {page} of {totalPages || 1}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            className="px-3 py-1.5 border border-gray-300 rounded text-sm font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={page === totalPages || totalPages === 0}
          >
            Next
          </button>
        </div>

        <button
          onClick={onGeneratePDF}
          className="inline-flex items-center px-4 py-2 bg-primary text-white text-sm font-medium rounded hover:bg-primary-dark shadow-sm transition-colors"
        >
          <FileText className="w-4 h-4 mr-2" />
          Generate PDF
        </button>
      </div>
    </div>
  );
}