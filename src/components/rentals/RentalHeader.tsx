import React from 'react';
import { Download, Upload, Plus, Search, FileText } from 'lucide-react';

interface RentalHeaderProps {
  onSearch: (query: string) => void;
  onImport: (file: File) => void;
  onExport: () => void;
  onAdd: () => void;
  onVehicleFilterChange: (vehicleId: string | null) => void;
  onGeneratePDF: () => void;
  vehicles: { id: string; make: string; model: string; registrationNumber: string }[];
}

const RentalHeader: React.FC<RentalHeaderProps> = ({
  onSearch,
  onImport,
  onExport,
  onAdd,
  onVehicleFilterChange,
  onGeneratePDF,
  vehicles,
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
    <div className="space-y-4 mb-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Rentals</h1>
        <div className="flex space-x-2">
         

          <button
            onClick={onExport}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <Download className="h-5 w-5 mr-2" />
            Export
          </button>
          {/* <label className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer">
            <Upload className="h-5 w-5 mr-2" />
            Import
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept=".xlsx,.xls,.csv"
              onChange={handleImport}
            />
          </label> */}
          <button
            onClick={onAdd}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-600"
          >
            <Plus className="h-5 w-5 mr-2" />
            Schedule Rental
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search rentals..."
            onChange={(e) => onSearch(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
          />
        </div>
        <select
          onChange={(e) => onVehicleFilterChange(e.target.value || null)}
          className="block w-64 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md"
        >
          <option value="">All Vehicles</option>
          {vehicles.map((vehicle) => (
            <option key={vehicle.id} value={vehicle.id}>
              {vehicle.make} {vehicle.model} - {vehicle.registrationNumber}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default RentalHeader;