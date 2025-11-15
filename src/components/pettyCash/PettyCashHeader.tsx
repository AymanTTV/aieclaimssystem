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
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        <div className="flex flex-wrap gap-2"> {/* Added flex-wrap */}
          {/* NEW: Import Button */}
          {can(moduleKey, 'create') && (
            <button
              onClick={onImport}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <Upload className="h-5 w-5 mr-2" />
              Import
            </button>
          )}
          {can(moduleKey, 'export') && (
            <button
              onClick={handleExport}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <Download className="h-5 w-5 mr-2" />
              Export
            </button>
          )}
          {can(moduleKey, 'create') && (
            <button
              onClick={onAdd}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-600"
            >
              <Plus className="h-5 w-5 mr-2" />
              Add Transaction
            </button>
          )}
        </div>
      </div>

      <div className="relative flex-1">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          placeholder="Search by name, telephone, description..."
          onChange={(e) => onSearch(e.target.value)}
          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
        />
      </div>
    </div>
  );
};

export default PettyCashHeader;