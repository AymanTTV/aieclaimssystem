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

      {/* Actions: grid on mobile (2-up), flex-wrap on >= sm */}
      <div
        className="
          w-full
          grid grid-cols-1 min-[380px]:grid-cols-2 gap-2
          sm:flex sm:flex-wrap sm:items-center
        "
      >
        {/* If you re-enable Import later, keep it w-full on mobile */}
        {/*
        <label className="inline-flex items-center justify-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 w-full sm:w-auto cursor-pointer">
          <Upload className="h-5 w-5 mr-2" />
          Import
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept=".csv,.xlsx"
            onChange={handleImport}
          />
        </label>
        */}

        <button
          onClick={onExport}
          className="inline-flex items-center justify-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 w-full sm:w-auto"
        >
          <Download className="h-5 w-5 mr-2" />
          Export
        </button>

        <button
          onClick={onGeneratePDF}
          className="inline-flex items-center justify-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 w-full sm:w-auto"
        >
          <Download className="h-5 w-5 mr-2" />
          Generate PDF
        </button>

        <button
          onClick={onAdd}
          className="inline-flex items-center justify-center px-3 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-600 w-full sm:w-auto"
        >
          <Plus className="h-5 w-5 mr-2" />
          Add Vehicle
        </button>
      </div>
    </div>
  );
};

export default VehicleHeader;
