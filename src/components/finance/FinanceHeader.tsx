import React from 'react';
import { Download, Upload, Plus, Search, FileText } from 'lucide-react';

interface FinanceHeaderProps {
  onSearch: (query: string) => void;
  onImport: (file: File) => void;
  onExport: () => void;
  onAddIncome: () => void;
  onAddExpense: () => void;
  onGeneratePDF: () => void;
  period: 'week' | 'month' | 'year' | 'all';
  onPeriodChange: (period: 'week' | 'month' | 'year' | 'all') => void;
  type: 'all' | 'income' | 'expense';
  onTypeChange: (type: 'all' | 'income' | 'expense') => void;
}

const FinanceHeader: React.FC<FinanceHeaderProps> = ({
  onSearch,
  onImport,
  onExport,
  onAddIncome,
  onAddExpense,
  onGeneratePDF,
  period,
  onPeriodChange,
  type,
  onTypeChange,
}) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onImport(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-center">
        <div className="relative flex-grow sm:flex-grow-1 mb-4 sm:mb-0 w-full sm:w-auto sm:mr-2"> {/* Added sm:mr-2 */}
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search by description, category, vehicle registration..."
            onChange={(e) => onSearch(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
          />
        </div>
        <div className="flex space-x-2">
          <button
            onClick={onExport}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <Download className="h-5 w-5 mr-2" />
            Export
          </button>
          <button
            onClick={onGeneratePDF}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <FileText className="h-5 w-5 mr-2" />
            Generate PDF
          </button>
          <button
            onClick={onAddIncome}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-secondary hover:bg-secondary-600"
          >
            <Plus className="h-5 w-5 mr-2" />
            Add Income
          </button>
          <button
            onClick={onAddExpense}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-600"
          >
            <Plus className="h-5 w-5 mr-2" />
            Add Expense
          </button>
        </div>
      </div>
    </div>
  );
};

export default FinanceHeader;