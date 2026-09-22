// src/components/pettyCash/PettyCashHeader.tsx

import React from 'react';
import { Plus, Download, Search, Upload } from 'lucide-react'; // Added Upload
import { usePermissions } from '../../hooks/usePermissions';
import { PettyCashTransaction } from '../../types/pettyCash';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';
import type { RolePermissions } from '../../types/roles';
import { format } from 'date-fns'; // Import format for ISO date

interface PettyCashHeaderProps {
  moduleKey?: keyof RolePermissions;
  title?: string;
  onSearch: (query: string) => void;
  onAdd: () => void;
  onImport: () => void; // NEW: Prop to trigger import modal
  transactions: PettyCashTransaction[];
}

const PettyCashHeader: React.FC<PettyCashHeaderProps> = ({
  moduleKey = 'pettyCash',
  title = 'Petty Cash',
  onSearch,
  onAdd,
  onImport, // NEW
  transactions,
}) => {
  const { can } = usePermissions();

  const handleExport = () => {
    try {
      // Export chronologically (oldest first)
      const sortedTransactions = [...transactions].reverse();

      const rows = sortedTransactions.map((t) => {
        // Use a single, standard DateTime format for easy import
        const dateTime = t.date ? format(new Date(t.date), "yyyy-MM-dd'T'HH:mm:ss") : '';
        
        return {
          DateTime: dateTime,
          Name: t.name,
          Telephone: t.telephone,
          Description: t.description,
          Category: t.categoryName || '',
          Group: t.groupName || '',
          AmountIn: Number(t.amountIn || 0).toFixed(2),
          AmountOut: Number(t.amountOut || 0).toFixed(2),
          Status: t.status,
          Note: t.note || '',
        };
      });

      const worksheet = XLSX.utils.json_to_sheet(rows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Transactions');

      // Set column widths for better readability
      worksheet['!cols'] = [
        { wch: 20 }, // DateTime
        { wch: 25 }, // Name
        { wch: 15 }, // Telephone
        { wch: 40 }, // Description
        { wch: 20 }, // Category
        { wch: 20 }, // Group
        { wch: 10 }, // AmountIn
        { wch: 10 }, // AmountOut
        { wch: 10 }, // Status
        { wch: 30 }, // Note
      ];

      const filename = `${title.replace(/\s+/g, '_')}_Export.xlsx`;
      XLSX.writeFile(workbook, filename);

      toast.success('Transactions exported successfully');
    } catch (error) {
      console.error('Error exporting transactions:', error);
      toast.error('Failed to export transactions');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-[24px] font-bold text-[#0F172A] tracking-tight leading-tight">{title}</h1>
          <p className="text-sm text-[#64748B] mt-0.5 font-medium">Petty cash expenditure records, receipts, category reconciliations, and cash balances.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* NEW: Import Button */}
          {can(moduleKey, 'import') && (
            <button
              onClick={onImport}
              className="inline-flex items-center px-3.5 py-2.5 border border-[#CBD5E1] rounded-xl shadow-xs text-sm font-semibold text-[#1E293B] bg-white hover:bg-[#F8FAFC] transition-colors cursor-pointer"
            >
              <Upload className="h-4 w-4 mr-1.5 text-[#64748B]" />
              Import
            </button>
          )}
          {can(moduleKey, 'export') && (
            <button
              onClick={handleExport}
              className="inline-flex items-center px-3.5 py-2.5 border border-[#CBD5E1] rounded-xl shadow-xs text-sm font-semibold text-[#1E293B] bg-white hover:bg-[#F8FAFC] transition-colors cursor-pointer"
            >
              <Download className="h-4 w-4 mr-1.5 text-[#64748B]" />
              Export
            </button>
          )}
          {can(moduleKey, 'create') && (
            <button
              onClick={onAdd}
              className="inline-flex items-center px-4 py-2.5 rounded-xl shadow-xs text-sm font-bold text-white bg-[#2563EB] hover:bg-[#1D4ED8] transition-colors cursor-pointer"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Add Transaction
            </button>
          )}
        </div>
      </div>

      <div className="relative flex-1">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-slate-400" />
        </div>
        <input
          type="text"
          placeholder="Search by name, telephone, description..."
          onChange={(e) => onSearch(e.target.value)}
          className="block w-full pl-10 pr-3.5 py-2.5 border-[1.5px] border-[#CBD5E1] rounded-xl leading-5 bg-white text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-all shadow-xs"
        />
      </div>
    </div>
  );
};

export default PettyCashHeader;