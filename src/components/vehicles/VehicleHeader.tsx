import React from 'react';
import { Download, Upload, Plus } from 'lucide-react';

interface VehicleHeaderProps {
  onAdd: () => void;
  onExport: () => void;
  onImport: (file: File) => void;
}

const VehicleHeader: React.FC<VehicleHeaderProps> = ({
  onAdd,
  onExport,
  onImport,
}) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  return (
    <div className="flex justify-between items-center">
      <h1 className="text-2xl font-bold text-gray-900">Fleet Management</h1>
      <div className="flex space-x-2">
        <button
          onClick={onExport}
          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
        >
          <Download className="h-5 w-5 mr-2" />
          Export
        </button>
        <label className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer">
          <Upload className="h-5 w-5 mr-2" />
          Import
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept=".csv,.xlsx"
            onChange={(e) => e.target.files && onImport(e.target.files[0])}
          />
        </label>
        <button
          onClick={onAdd}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-600"
        >
          <Plus className="h-5 w-5 mr-2" />
          Add Vehicle
        </button>
      </div>
    </div>
  );
};

export default VehicleHeader;