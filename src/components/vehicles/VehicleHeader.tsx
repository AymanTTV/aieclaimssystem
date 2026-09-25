import React from 'react';
import { Download, Plus } from 'lucide-react';

interface VehicleHeaderProps {
  onAdd: () => void;
  onExport: () => void;
  onImport: (file: File) => void;
  onGeneratePDF: () => void;
}

const VehicleHeader: React.FC<VehicleHeaderProps> = ({
  onAdd,
  onExport,
  onImport,
  onGeneratePDF
}) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) onImport(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Title row */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Fleet Management</h1>
      </div>

      {/* Actions: single line flex */}
      <div className="flex items-center gap-2 flex-nowrap overflow-x-auto w-full sm:w-auto scrollbar-none py-1">
        <button
          onClick={onExport}
          className="inline-flex whitespace-nowrap flex-shrink-0 items-center justify-center px-4 py-2 border border-indigo-200 rounded-xl shadow-xs text-sm font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 hover:border-indigo-300 hover:text-indigo-800 transition-colors"
        >
          <Download className="h-4.5 w-4.5 mr-2 text-indigo-600" />
          Export
        </button>

        <button
          onClick={onGeneratePDF}
          className="inline-flex whitespace-nowrap flex-shrink-0 items-center justify-center px-4 py-2 border border-rose-200 rounded-xl shadow-xs text-sm font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 hover:border-rose-300 hover:text-rose-800 transition-colors"
        >
          <Download className="h-4.5 w-4.5 mr-2 text-rose-600" />
          Generate PDF
        </button>

        <button
          onClick={onAdd}
          className="inline-flex whitespace-nowrap flex-shrink-0 items-center justify-center px-4 py-2 border border-emerald-600 rounded-xl shadow-xs text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors"
        >
          <Plus className="h-4.5 w-4.5 mr-1.5" />
          Add Vehicle
        </button>
      </div>
    </div>
  );
};

export default VehicleHeader;
