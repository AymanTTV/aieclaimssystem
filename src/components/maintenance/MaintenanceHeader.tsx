import React from 'react';
import { Download, Plus, Search, FileText } from 'lucide-react';

interface MaintenanceHeaderProps {
  onSearch: (query: string) => void;
  onExport: () => void;
  onAdd: () => void;
  onStatusFilterChange: (status: string) => void;
  onGeneratePDF: () => void;
}

const MaintenanceHeader: React.FC<MaintenanceHeaderProps> = ({
  onSearch,
  onExport,
  onAdd,
  onStatusFilterChange,
  onGeneratePDF
}) => {
  return (
    <div className="space-y-3 sm:space-y-4 mb-6">
      {/* Title + Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Maintenance</h1>

        {/* Actions: grid on mobile (2-up), wrap on >= sm */}
        <div
          className="
            w-full
            grid grid-cols-1 min-[380px]:grid-cols-2 gap-2
            sm:flex sm:flex-wrap sm:items-center sm:w-auto
          "
        >
          <button
            onClick={onGeneratePDF}
            className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 w-full sm:w-auto"
          >
            <FileText className="h-5 w-5 mr-2" />
            Generate PDF
          </button>

          <button
            onClick={onExport}
            className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 w-full sm:w-auto"
          >
            <Download className="h-5 w-5 mr-2" />
            Export
          </button>

          <button
            onClick={onAdd}
            className="inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-600 w-full sm:w-auto"
          >
            <Plus className="h-5 w-5 mr-2" />
            Schedule Maintenance
          </button>
        </div>
      </div>

      {/* Search + Quick Status */}
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search maintenance logs…"
            onChange={(e) => onSearch(e.target.value)}
            className="form-input pl-10 w-full"
          />
        </div>

        <select
          onChange={(e) => onStatusFilterChange(e.target.value)}
          className="form-select w-full sm:w-48"
          defaultValue="all"
        >
          <option value="all">All Status</option>
          <option value="scheduled">Scheduled</option>
          <option value="in-progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>
    </div>
  );
};

export default MaintenanceHeader;
