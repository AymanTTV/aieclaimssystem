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
            <div className="bg-[#F0F9FF] rounded-2xl shadow-xs p-4 border border-[#BAE6FD] hover:border-sky-300 transition-all text-[#0F172A] flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-[#0284C7] uppercase tracking-wider">Total Claims</p>
                <p className="text-2xl font-black font-mono text-[#0369A1] mt-1">{totalCount}</p>
              </div>
              <div className="p-2.5 rounded-xl border bg-white border-[#BAE6FD] text-[#0284C7] shadow-xs">
                <AlertTriangle className="w-5 h-5" />
              </div>
            </div>
            <div className="bg-[#FEF2F2] rounded-2xl shadow-xs p-4 border border-[#FECACA] hover:border-red-300 transition-all text-[#0F172A] flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-[#DC2626] uppercase tracking-wider">Fault</p>
                <p className="text-2xl font-black font-mono text-[#B91C1C] mt-1">{faultCount}</p>
              </div>
              <div className="p-2.5 rounded-xl border bg-white border-[#FECACA] text-[#DC2626] shadow-xs">
                <XCircle className="w-5 h-5" />
              </div>
            </div>
            <div className="bg-[#ECFDF5] rounded-2xl shadow-xs p-4 border border-[#A7F3D0] hover:border-emerald-300 transition-all text-[#0F172A] flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-[#059669] uppercase tracking-wider">Non-Fault</p>
                <p className="text-2xl font-black font-mono text-[#047857] mt-1">{nonFaultCount}</p>
              </div>
              <div className="p-2.5 rounded-xl border bg-white border-[#A7F3D0] text-[#059669] shadow-xs">
                <CheckCircle className="w-5 h-5" />
              </div>
            </div>
            <div className="bg-[#FEF2F2] rounded-2xl shadow-xs p-4 border border-[#FECACA] hover:border-red-300 transition-all text-[#0F172A] flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-[#DC2626] uppercase tracking-wider">Fault Cost</p>
                <p className="text-xl font-black font-mono text-[#B91C1C] mt-1">{gb(faultTotal)}</p>
              </div>
              <div className="p-2.5 rounded-xl border bg-white border-[#FECACA] text-[#DC2626] shadow-xs">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>
            <div className="bg-[#ECFDF5] rounded-2xl shadow-xs p-4 border border-[#A7F3D0] hover:border-emerald-300 transition-all text-[#0F172A] flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-[#059669] uppercase tracking-wider">Non-Fault Cost</p>
                <p className="text-xl font-black font-mono text-[#047857] mt-1">{gb(nonFaultTotal)}</p>
              </div>
              <div className="p-2.5 rounded-xl border bg-white border-[#A7F3D0] text-[#059669] shadow-xs">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Insurer Financial Metrics (Live synced from Post-Report Insurance Data) */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-[#FAF5FF] rounded-2xl shadow-xs p-4 border border-[#E9D5FF] hover:border-purple-300 transition-all text-[#0F172A]">
              <p className="text-xs font-bold text-[#7E22CE] uppercase tracking-wider">Total Incurred (AD+TP)</p>
              <p className="text-base sm:text-xl font-black font-mono text-[#6B21A8] mt-1">{gb(totalIncurred)}</p>
            </div>
            <div className="bg-[#EEF2FF] rounded-2xl shadow-xs p-4 border border-[#C7D2FE] hover:border-indigo-300 transition-all text-[#0F172A]">
              <p className="text-xs font-bold text-[#4338CA] uppercase tracking-wider">Total TP Est</p>
              <p className="text-base sm:text-xl font-black font-mono text-[#3730A3] mt-1">{gb(totalTpEst)}</p>
            </div>
            <div className="bg-[#ECFDF5] rounded-2xl shadow-xs p-4 border border-[#A7F3D0] hover:border-emerald-300 transition-all text-[#0F172A]">
              <p className="text-xs font-bold text-[#059669] uppercase tracking-wider">Act Recovery</p>
              <p className="text-base sm:text-xl font-black font-mono text-[#047857] mt-1">{gb(totalActRecovery)}</p>
            </div>
            <div className="bg-[#FFFBEB] rounded-2xl shadow-xs p-4 border border-[#FDE68A] hover:border-amber-300 transition-all text-[#0F172A]">
              <p className="text-xs font-bold text-[#D97706] uppercase tracking-wider">Outstanding Recovery</p>
              <p className="text-base sm:text-xl font-black font-mono text-[#B45309] mt-1">{gb(totalOutstanding)}</p>
            </div>
          </div>

          {/* Operational Status Counts */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-[#F0F9FF] rounded-2xl shadow-xs p-4 border border-[#BAE6FD] hover:border-sky-300 transition-all text-[#0F172A] flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-[#0284C7] uppercase tracking-wider">Reported (Yes)</p>
                <p className="text-2xl font-black font-mono text-[#0369A1] mt-1">{reportedCount}</p>
              </div>
              <div className="p-2.5 rounded-xl border bg-white border-[#BAE6FD] text-[#0284C7] shadow-xs">
                <FileCheck className="w-5 h-5" />
              </div>
            </div>
            <div className="bg-[#FEF2F2] rounded-2xl shadow-xs p-4 border border-[#FECACA] hover:border-red-300 transition-all text-[#0F172A] flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-[#DC2626] uppercase tracking-wider">Investigating</p>
                <p className="text-2xl font-black font-mono text-[#B91C1C] mt-1">{investigatingCount}</p>
              </div>
              <div className="p-2.5 rounded-xl border bg-white border-[#FECACA] text-[#DC2626] shadow-xs">
                <ShieldAlert className="w-5 h-5" />
              </div>
            </div>
            <div className="bg-[#FFFBEB] rounded-2xl shadow-xs p-4 border border-[#FDE68A] hover:border-amber-300 transition-all text-[#0F172A] flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-[#D97706] uppercase tracking-wider">Processing</p>
                <p className="text-2xl font-black font-mono text-[#B45309] mt-1">{processingCount}</p>
              </div>
              <div className="p-2.5 rounded-xl border bg-white border-[#FDE68A] text-[#D97706] shadow-xs">
                <Activity className="w-5 h-5" />
              </div>
            </div>
            <div className="bg-[#ECFDF5] rounded-2xl shadow-xs p-4 border border-[#A7F3D0] hover:border-emerald-300 transition-all text-[#0F172A] flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-[#059669] uppercase tracking-wider">Resolved</p>
                <p className="text-2xl font-black font-mono text-[#047857] mt-1">{resolvedCount}</p>
              </div>
              <div className="p-2.5 rounded-xl border bg-white border-[#A7F3D0] text-[#059669] shadow-xs">
                <ClipboardList className="w-5 h-5" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Top Bar (Responsive Actions with labels) ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-6">
        <div>
          <h1 className="text-[24px] font-bold text-[#0F172A] tracking-tight leading-tight">Accidents & Claims</h1>
          <p className="text-sm text-[#64748B] mt-0.5 font-medium">Incident reports, liability status, and insurer recovery dossier.</p>
        </div>
        
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
            className={`flex items-center px-3.5 sm:px-4 py-2.5 border rounded-xl shadow-xs text-sm font-semibold transition-colors cursor-pointer ${
              activeTab === 'risk_analysis'
                ? 'bg-rose-600 text-white border-rose-600 hover:bg-rose-700'
                : 'border-rose-300 text-rose-700 bg-rose-50 hover:bg-rose-100'
            }`}
          >
            <ShieldAlert className="h-4 w-4 mr-1.5 sm:mr-2" />
            <span className="truncate">{activeTab === 'risk_analysis' ? 'Claims Register' : 'Driver Risk & Renewal'}</span>
          </button>

          {can('accidents', 'export') && (
            <button
              onClick={onExportFleetExperiencePDF || onGeneratePDF}
              className="flex items-center px-3.5 sm:px-4 py-2.5 border border-blue-600 rounded-xl shadow-xs text-sm font-bold text-white bg-[#2563EB] hover:bg-[#1D4ED8] transition-colors cursor-pointer"
              title="Export Fleet Claim Experience PDF Report (Insurance-Ready Dossier)"
            >
              <FileText className="h-4 w-4 mr-1.5 sm:mr-2" />
              <span className="truncate">Export Fleet Experience PDF</span>
            </button>
          )}

          {can('accidents', 'export') && (
            <button
              onClick={onExport}
              className="flex items-center px-3.5 sm:px-4 py-2.5 border border-[#CBD5E1] rounded-xl shadow-xs text-sm font-semibold text-[#1E293B] bg-white hover:bg-[#F8FAFC] transition-colors"
            >
              <Download className="h-4 w-4 mr-1.5 sm:mr-2 text-[#64748B]" />
              <span className="truncate">Export</span>
            </button>
          )}

          {can('accidents', 'create') && (
            <button
              onClick={onAdd}
              className="flex items-center px-4 py-2.5 rounded-xl shadow-xs text-sm font-bold text-white bg-[#DC2626] hover:bg-[#B91C1C] transition-colors cursor-pointer"
            >
              <Plus className="h-4 w-4 mr-1.5 sm:mr-2" />
              <span className="truncate">Report Accident</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Search + Status (Card) ── */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-xs p-4 sm:p-5 text-[#0F172A]">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 items-center">
          <div className="relative sm:col-span-2">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-slate-400" />
            </div>
            <input
              type="text"
              placeholder="Search by reference no, name, vehicle, location..."
              onChange={(e) => onSearch(e.target.value)}
              className="block w-full pl-10 pr-3.5 py-2.5 border-[1.5px] border-[#CBD5E1] rounded-xl leading-5 bg-white text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-all shadow-xs"
            />
          </div>

          <div className="flex sm:justify-end">
            <select
              onChange={(e) => onStatusFilterChange(e.target.value)}
              className="block w-full sm:w-48 px-3 py-2.5 text-sm font-medium border-[1.5px] border-[#CBD5E1] rounded-xl bg-white text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
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