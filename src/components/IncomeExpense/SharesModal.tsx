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
      <div className="overflow-x-auto border border-[#E2E8F0] rounded-xl bg-white shadow-xs overflow-hidden">
        <table className="min-w-full text-xs border-collapse">
          <thead className="bg-[#F8FAFC] text-[#334155] border-b-2 border-[#E2E8F0]">
            <tr className="border-b-2 border-[#E2E8F0]">
              <th className="px-4 py-3 text-left text-xs font-semibold text-[#334155] uppercase tracking-wider select-none">Date Range</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-[#334155] uppercase tracking-wider select-none">Recipients</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-[#334155] uppercase tracking-wider select-none">Total Shared</th>
            </tr>
          </thead>
          <tbody>
            {paginated.map((sp, idx) => {
              const isEven = idx % 2 === 1;
              const rowBg = isEven ? 'bg-[#EEF5FD]' : 'bg-white';
              return (
              <tr key={sp.id} className={`group border-b border-[#E2E8F0] ${rowBg} hover:bg-[#DCEBFA] transition-all duration-150 ease-in-out`}>
                <td className="px-4 py-3 font-bold text-slate-900 whitespace-nowrap">
                  {sp.startDate} <span className="text-slate-400">→</span> {sp.endDate}
                </td>
                <td className="px-4 py-3 space-y-1">
                  {sp.recipients.map((r, rIdx) => (
                    <div key={`${sp.id}-${rIdx}-${r.name}`} className="flex items-center text-slate-700">
                      <span className="font-bold text-slate-900 mr-1.5">{r.name}</span> 
                      <span className="text-xs bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded text-slate-600 mr-2 font-semibold">
                        {r.percentage}%
                      </span>
                      {/* Visual Indicator for Pay vs Get */}
                      <span className={`font-bold ${sp.totalSplitAmount < 0 ? "text-rose-600" : "text-emerald-600"}`}>
                        {formatCurrency(r.amount)}
                      </span>
                    </div>
                  ))}
                </td>
                {/* Updated styling for Totals */}
                <td className={`px-4 py-3 text-right font-black ${sp.totalSplitAmount < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {formatCurrency(sp.totalSplitAmount)}
                </td>
              </tr>
            );})}
            {paginated.length === 0 && (
              <tr>
                <td colSpan={3} className="p-8 text-center text-slate-500 italic font-medium">
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