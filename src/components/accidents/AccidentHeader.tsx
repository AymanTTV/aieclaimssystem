// src/components/accidents/AccidentHeader.tsx
import React from 'react';
import { Download, Plus, Search, FileText, AlertTriangle, CheckCircle, XCircle, DollarSign } from 'lucide-react';
import { Accident } from '../../types';
import { usePermissions } from '../../hooks/usePermissions';
import { useAuth } from '../../context/AuthContext';

interface AccidentHeaderProps {
  onSearch: (query: string) => void;
  onImport: (file: File) => void;
  onExport: () => void;
  onAdd: () => void;
  onStatusFilterChange: (status: string) => void;
  onGeneratePDF: () => void;
  accidents: Accident[];
}

const AccidentHeader: React.FC<AccidentHeaderProps> = ({
  onSearch,
  onImport,
  onExport,
  onAdd,
  onStatusFilterChange,
  onGeneratePDF,
  accidents,
}) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const { can } = usePermissions();
  const { user } = useAuth();

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) onImport(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Counts
  const totalCount    = accidents.length;
  const faultCount    = accidents.filter(a => (a.type || '').toLowerCase() === 'fault').length;
  const nonFaultCount = accidents.filter(a => (a.type || '').toLowerCase() === 'non-fault').length;

  // Amounts (GBP)
  const faultTotal = accidents
    .filter(a => (a.type || '').toLowerCase() === 'fault')
    .reduce((sum, a) => sum + (Number(a.amount) || 0), 0);

  const nonFaultTotal = accidents
    .filter(a => (a.type || '').toLowerCase() === 'non-fault')
    .reduce((sum, a) => sum + (Number(a.amount) || 0), 0);

  const gb = (n: number) =>
    `£${n.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="space-y-6 mb-6">
      {/* ── Summary Cards ── */}
      {can('accidents', 'cards') && (
        <>
          {/* Counts */}
          <div className="grid grid-cols-1 min-[380px]:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
            <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
              <div className="flex items-center">
                <AlertTriangle className="w-7 h-7 sm:w-8 sm:h-8 text-blue-500" />
                <div className="ml-3 sm:ml-4">
                  <p className="text-xs sm:text-sm font-medium text-gray-500">Total Accidents</p>
                  <p className="text-lg sm:text-2xl font-semibold text-gray-900">{totalCount}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
              <div className="flex items-center">
                <XCircle className="w-7 h-7 sm:w-8 sm:h-8 text-red-500" />
                <div className="ml-3 sm:ml-4">
                  <p className="text-xs sm:text-sm font-medium text-gray-500">Fault</p>
                  <p className="text-lg sm:text-2xl font-semibold text-gray-900">{faultCount}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
              <div className="flex items-center">
                <CheckCircle className="w-7 h-7 sm:w-8 sm:h-8 text-green-500" />
                <div className="ml-3 sm:ml-4">
                  <p className="text-xs sm:text-sm font-medium text-gray-500">Non‑Fault</p>
                  <p className="text-lg sm:text-2xl font-semibold text-gray-900">{nonFaultCount}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Totals */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
              <div className="flex items-center">
                <DollarSign className="w-7 h-7 sm:w-8 sm:h-8 text-red-500" />
                <div className="ml-3 sm:ml-4">
                  <p className="text-xs sm:text-sm font-medium text-gray-500">Fault Total</p>
                  <p className="text-lg sm:text-2xl font-semibold text-gray-900">{gb(faultTotal)}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
              <div className="flex items-center">
                <DollarSign className="w-7 h-7 sm:w-8 sm:h-8 text-green-500" />
                <div className="ml-3 sm:ml-4">
                  <p className="text-xs sm:text-sm font-medium text-gray-500">Non‑Fault Total</p>
                  <p className="text-lg sm:text-2xl font-semibold text-gray-900">{gb(nonFaultTotal)}</p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── Top Bar (Responsive Actions with labels) ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Accidents</h1>

        <div className="flex flex-wrap items-center gap-2">
          {/* Optional: hidden import button, ready to wire when you want */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={handleImport}
            className="hidden"
          />

          {user?.role === 'manager' && (
            <button
              onClick={onGeneratePDF}
              className="flex items-center px-3 sm:px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <FileText className="h-5 w-5 mr-1 sm:mr-2" />
              <span className="truncate">PDF</span>
              <span className="hidden sm:inline">&nbsp;Report</span>
            </button>
          )}

          {can('accidents', 'export') && (
            <button
              onClick={onExport}
              className="flex items-center px-3 sm:px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <Download className="h-5 w-5 mr-1 sm:mr-2" />
              <span className="truncate">Export</span>
            </button>
          )}

          {can('accidents', 'create') && (
            <button
              onClick={onAdd}
              className="flex items-center px-3 sm:px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-600"
            >
              <Plus className="h-5 w-5 mr-1 sm:mr-2" />
              <span className="truncate">Report</span>
              <span className="hidden sm:inline">&nbsp;Accident</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Search + Status (Card) ── */}
      <div className="bg-white p-4 rounded-lg shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 items-center">
          {/* Search spans 2 cols on sm+ */}
          <div className="relative sm:col-span-2">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search by reference no, name, vehicle, location..."
              onChange={(e) => onSearch(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
            />
          </div>

          {/* Status filter (right aligned on sm+) */}
          <div className="flex sm:justify-end">
            <select
              onChange={(e) => onStatusFilterChange(e.target.value)}
              className="block w-full sm:w-48 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md"
            >
              <option value="all">All Status</option>
              <option value="reported">Reported</option>
              <option value="investigating">Investigating</option>
              <option value="processing">Processing</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccidentHeader;
