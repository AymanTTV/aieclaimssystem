// src/components/accidents/AccidentHeader.tsx
import React from 'react';
import { Download, Plus, Search, FileText, AlertTriangle, CheckCircle, XCircle, DollarSign, Activity, FileCheck, ClipboardList, ShieldAlert } from 'lucide-react';
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
  onExportFleetExperiencePDF?: () => void;
  accidents: Accident[];
  activeTab?: 'claims' | 'risk_analysis';
  onTabChange?: (tab: 'claims' | 'risk_analysis') => void;
}

const AccidentHeader: React.FC<AccidentHeaderProps> = ({
  onSearch,
  onImport,
  onExport,
  onAdd,
  onStatusFilterChange,
  onGeneratePDF,
  onExportFleetExperiencePDF,
  accidents,
  activeTab = 'claims',
  onTabChange,
}) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const { can } = usePermissions();
  const { user } = useAuth();

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) onImport(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Status Counts
  const totalCount    = accidents.length;
  const faultCount    = accidents.filter(a => ((a.fault || a.faultType || a.type || '').toLowerCase() === 'fault')).length;
  const nonFaultCount = accidents.filter(a => ((a.fault || a.faultType || a.type || '').toLowerCase() === 'non-fault')).length;
  
  // NEW: Detail Counts
  const reportedCount = accidents.filter(a => a.isReported || a.reportedDate).length;
  const investigatingCount = accidents.filter(a => a.status === 'investigating').length;
  const processingCount = accidents.filter(a => a.status === 'processing').length;
  const resolvedCount = accidents.filter(a => a.status === 'resolved').length;

  // Amounts (GBP)
  const faultTotal = accidents
    .filter(a => ((a.fault || a.faultType || a.type || '').toLowerCase() === 'fault'))
    .reduce((sum, a) => {
      const inc = a.incurred !== undefined && a.incurred > 0 ? Number(a.incurred) : ((Number(a.adPaid) || 0) + (Number(a.tpPaid) || 0));
      return sum + (inc || Number(a.amount) || 0);
    }, 0);

  const nonFaultTotal = accidents
    .filter(a => ((a.fault || a.faultType || a.type || '').toLowerCase() === 'non-fault'))
    .reduce((sum, a) => {
      const inc = a.incurred !== undefined && a.incurred > 0 ? Number(a.incurred) : ((Number(a.adPaid) || 0) + (Number(a.tpPaid) || 0));
      return sum + (inc || Number(a.amount) || 0);
    }, 0);

  // Insurer Financial Overview (Real-time live synced from post-report modal)
  const totalIncurred = accidents.reduce((sum, a) => {
    if (a.incurred !== undefined && a.incurred !== null && a.incurred > 0) return sum + Number(a.incurred);
    const paidSum = (Number(a.adPaid) || 0) + (Number(a.tpPaid) || 0);
    if (paidSum > 0) return sum + paidSum;
    return sum + (Number(a.amount) || 0);
  }, 0);

  const totalTpEst = accidents.reduce((sum, a) => sum + (Number(a.totalTpEst) || 0), 0);
  const totalActRecovery = accidents.reduce((sum, a) => sum + (Number(a.actRecovery) || 0), 0);
  const totalOutstanding = accidents.reduce((sum, a) => sum + (Number(a.outstandingRecovery) || 0), 0);

  const gb = (n: number) =>
    `£${n.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="space-y-6 mb-6">
      {/* ── Summary Cards ── */}
      {can('accidents', 'cards') && (
        <div className="space-y-3">
          {/* Main Financial & Type Overview */}
          <div className="grid grid-cols-1 min-[380px]:grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4">
            <div className="bg-white rounded-lg shadow-sm p-4 border-t-2 border-blue-500">
              <div className="flex items-center">
                <AlertTriangle className="w-6 h-6 text-blue-500" />
                <div className="ml-3">
                  <p className="text-xs font-medium text-gray-500">Total Claims</p>
                  <p className="text-lg font-semibold text-gray-900">{totalCount}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-4 border-t-2 border-red-500">
              <div className="flex items-center">
                <XCircle className="w-6 h-6 text-red-500" />
                <div className="ml-3">
                  <p className="text-xs font-medium text-gray-500">Fault</p>
                  <p className="text-lg font-semibold text-gray-900">{faultCount}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-4 border-t-2 border-green-500">
              <div className="flex items-center">
                <CheckCircle className="w-6 h-6 text-green-500" />
                <div className="ml-3">
                  <p className="text-xs font-medium text-gray-500">Non-Fault</p>
                  <p className="text-lg font-semibold text-gray-900">{nonFaultCount}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-4 border-t-2 border-red-500">
              <div className="flex items-center">
                <DollarSign className="w-6 h-6 text-red-500" />
                <div className="ml-3">
                  <p className="text-xs font-medium text-gray-500">Fault Cost</p>
                  <p className="text-lg font-semibold text-gray-900">{gb(faultTotal)}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-4 border-t-2 border-green-500">
              <div className="flex items-center">
                <DollarSign className="w-6 h-6 text-green-500" />
                <div className="ml-3">
                  <p className="text-xs font-medium text-gray-500">Non-Fault Cost</p>
                  <p className="text-lg font-semibold text-gray-900">{gb(nonFaultTotal)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Insurer Financial Metrics (Live synced from Post-Report Insurance Data) */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-white rounded-lg shadow-sm p-3.5 border-l-4 border-purple-500">
              <p className="text-xs font-medium text-gray-500">Total Incurred (AD+TP)</p>
              <p className="text-base sm:text-lg font-bold text-purple-900 mt-0.5">{gb(totalIncurred)}</p>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-3.5 border-l-4 border-indigo-500">
              <p className="text-xs font-medium text-gray-500">Total TP Est</p>
              <p className="text-base sm:text-lg font-bold text-indigo-900 mt-0.5">{gb(totalTpEst)}</p>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-3.5 border-l-4 border-emerald-500">
              <p className="text-xs font-medium text-gray-500">Act Recovery</p>
              <p className="text-base sm:text-lg font-bold text-emerald-700 mt-0.5">{gb(totalActRecovery)}</p>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-3.5 border-l-4 border-amber-500">
              <p className="text-xs font-medium text-gray-500">Outstanding Recovery</p>
              <p className="text-base sm:text-lg font-bold text-amber-800 mt-0.5">{gb(totalOutstanding)}</p>
            </div>
          </div>

          {/* Operational Status Counts */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-blue-400">
              <div className="flex items-center">
                <FileCheck className="w-6 h-6 text-blue-400" />
                <div className="ml-3">
                  <p className="text-xs font-medium text-gray-500">Reported (Yes)</p>
                  <p className="text-lg font-semibold text-gray-900">{reportedCount}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-red-400">
              <div className="flex items-center">
                <ShieldAlert className="w-6 h-6 text-red-400" />
                <div className="ml-3">
                  <p className="text-xs font-medium text-gray-500">Investigating</p>
                  <p className="text-lg font-semibold text-gray-900">{investigatingCount}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-yellow-400">
              <div className="flex items-center">
                <Activity className="w-6 h-6 text-yellow-500" />
                <div className="ml-3">
                  <p className="text-xs font-medium text-gray-500">Processing</p>
                  <p className="text-lg font-semibold text-gray-900">{processingCount}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-green-400">
              <div className="flex items-center">
                <ClipboardList className="w-6 h-6 text-green-500" />
                <div className="ml-3">
                  <p className="text-xs font-medium text-gray-500">Resolved</p>
                  <p className="text-lg font-semibold text-gray-900">{resolvedCount}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Top Bar (Responsive Actions with labels) ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Accidents</h1>
        
        <div className="flex flex-wrap items-center gap-2">
          {can('accidents', 'export') && (
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={handleImport}
            className="hidden"
          />
          )}

          <button
            onClick={() => onTabChange?.(activeTab === 'risk_analysis' ? 'claims' : 'risk_analysis')}
            className={`flex items-center px-3 sm:px-4 py-2 border rounded-md shadow-sm text-sm font-semibold transition ${
              activeTab === 'risk_analysis'
                ? 'bg-rose-600 text-white border-rose-600 hover:bg-rose-700'
                : 'border-rose-300 text-rose-700 bg-rose-50 hover:bg-rose-100'
            }`}
          >
            <ShieldAlert className="h-5 w-5 mr-1 sm:mr-2" />
            <span className="truncate">{activeTab === 'risk_analysis' ? 'Claims Register' : 'Driver Risk & Renewal'}</span>
          </button>

          {can('accidents', 'export') && (
            <button
              onClick={onExportFleetExperiencePDF || onGeneratePDF}
              className="flex items-center px-3 sm:px-4 py-2 border border-blue-600 rounded-md shadow-sm text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 transition"
              title="Export Fleet Claim Experience PDF Report (Insurance-Ready Dossier)"
            >
              <FileText className="h-5 w-5 mr-1 sm:mr-2" />
              <span className="truncate">Export Fleet Claim Experience PDF Report</span>
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
              <span className="truncate">Report Accident</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Search + Status (Card) ── */}
      <div className="bg-white p-4 rounded-lg shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 items-center">
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

          <div className="flex sm:justify-end">
            <select
              onChange={(e) => onStatusFilterChange(e.target.value)}
              className="block w-full sm:w-48 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
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