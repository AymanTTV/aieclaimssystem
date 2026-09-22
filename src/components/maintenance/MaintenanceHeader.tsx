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
    <div className="space-y-4 mb-6">
      {/* Title + Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-[24px] font-bold text-[#0F172A] tracking-tight leading-tight">Maintenance</h1>
          <p className="text-sm text-[#64748B] mt-0.5 font-medium">Service schedules, MOT reminders, garage work orders, and parts costs.</p>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onGeneratePDF}
            className="inline-flex items-center px-4 py-2.5 border border-[#CBD5E1] rounded-xl shadow-xs text-sm font-semibold text-[#1E293B] bg-white hover:bg-[#F8FAFC] transition-colors"
          >
            <FileText className="h-4 w-4 mr-2 text-[#64748B]" />
            Generate PDF
          </button>

          <button
            onClick={onExport}
            className="inline-flex items-center px-4 py-2.5 border border-[#CBD5E1] rounded-xl shadow-xs text-sm font-semibold text-[#1E293B] bg-white hover:bg-[#F8FAFC] transition-colors"
          >
            <Download className="h-4 w-4 mr-2 text-[#64748B]" />
            Export
          </button>

          <button
            onClick={onAdd}
            className="inline-flex items-center px-4 py-2.5 rounded-xl shadow-xs text-sm font-bold text-white bg-[#2563EB] hover:bg-[#1D4ED8] transition-colors cursor-pointer"
          >
            <Plus className="h-4 w-4 mr-2" />
            Schedule Maintenance
          </button>
        </div>
      </div>

      {/* Search + Quick Status */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-xs p-4 sm:p-5 text-[#0F172A]">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 items-center">
          <div className="relative sm:col-span-2">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-slate-400" />
            </div>
            <input
              type="text"
              placeholder="Search maintenance logs…"
              onChange={(e) => onSearch(e.target.value)}
              className="block w-full pl-10 pr-3.5 py-2.5 border-[1.5px] border-[#CBD5E1] rounded-xl leading-5 bg-white text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-all shadow-xs"
            />
          </div>

          <div className="flex sm:justify-end">
            <select
              onChange={(e) => onStatusFilterChange(e.target.value)}
              className="block w-full sm:w-48 px-3 py-2.5 text-sm font-medium border-[1.5px] border-[#CBD5E1] rounded-xl bg-white text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
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
      </div>
    </div>
  );
};

export default MaintenanceHeader;
