// src/components/utilisation/VehicleAssignmentHistoryTable.tsx
import React, { useState, useMemo } from 'react';
import { format, isValid } from 'date-fns';
import { 
  History, 
  User, 
  Car, 
  Calendar, 
  Clock, 
  Search, 
  Filter, 
  CheckCircle2, 
  ArrowRight, 
  FileSpreadsheet, 
  Tag, 
  RotateCcw,
  Users
} from 'lucide-react';
import toast from 'react-hot-toast';

export interface DriverAssignmentRecord {
  id: string;
  vehicleId: string;
  vehicleRegistration: string;
  vehicleMakeModel: string;
  customerId: string;
  driverName: string;
  driverPhone?: string;
  driverEmail?: string;
  startDate: Date;
  endDate: Date;
  isCurrent: boolean;
  isOngoing: boolean;
  durationDays: number;
  assignmentType: 'Rental' | 'Substitution';
  agreementNumber?: string;
  status: string;
  notes?: string;
}

interface VehicleAssignmentHistoryTableProps {
  assignments: DriverAssignmentRecord[];
  selectedVehicleReg?: string;
  onSelectVehicle?: (reg: string) => void;
  compact?: boolean;
}

export const VehicleAssignmentHistoryTable: React.FC<VehicleAssignmentHistoryTableProps> = ({
  assignments,
  selectedVehicleReg,
  onSelectVehicle,
  compact = false
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'current' | 'previous'>('all');
  const [filterVehicle, setFilterVehicle] = useState<string>(selectedVehicleReg || 'all');

  // Keep internal vehicle filter in sync if prop changes
  React.useEffect(() => {
    if (selectedVehicleReg !== undefined) {
      setFilterVehicle(selectedVehicleReg);
    }
  }, [selectedVehicleReg]);

  // Unique vehicles available in assignments
  const vehicleList = useMemo(() => {
    const map = new Map<string, string>();
    assignments.forEach(a => {
      if (a.vehicleRegistration && !map.has(a.vehicleRegistration)) {
        map.set(a.vehicleRegistration, a.vehicleMakeModel);
      }
    });
    return Array.from(map.entries()).map(([reg, makeModel]) => ({ reg, makeModel }));
  }, [assignments]);

  // Filtered assignments
  const filteredAssignments = useMemo(() => {
    return assignments.filter(item => {
      // Vehicle filter
      if (filterVehicle !== 'all' && item.vehicleRegistration.toLowerCase() !== filterVehicle.toLowerCase()) {
        return false;
      }

      // Status filter
      if (filterType === 'current' && !item.isCurrent) return false;
      if (filterType === 'previous' && item.isCurrent) return false;

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesReg = item.vehicleRegistration.toLowerCase().includes(query);
        const matchesMake = item.vehicleMakeModel.toLowerCase().includes(query);
        const matchesDriver = item.driverName.toLowerCase().includes(query);
        const matchesAgreement = item.agreementNumber ? item.agreementNumber.toLowerCase().includes(query) : false;
        if (!matchesReg && !matchesMake && !matchesDriver && !matchesAgreement) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => b.startDate.getTime() - a.startDate.getTime());
  }, [assignments, filterVehicle, filterType, searchQuery]);

  // Export Assignment History to Excel
  const handleExportHistory = () => {
    if (filteredAssignments.length === 0) {
      toast.error('No assignment records to export');
      return;
    }

    let tableHtml = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head><meta charset="UTF-8"></head>
      <body>
        <table border="1" style="border-collapse: collapse; font-family: Arial, sans-serif;">
          <thead>
            <tr style="background-color: #16192B; color: #FFFFFF; font-weight: bold; text-align: center;">
              <th style="padding: 10px;">Registration</th>
              <th style="padding: 10px;">Make / Model</th>
              <th style="padding: 10px;">Driver Name</th>
              <th style="padding: 10px;">Driver Phone</th>
              <th style="padding: 10px;">Assignment Role</th>
              <th style="padding: 10px;">Start Date</th>
              <th style="padding: 10px;">End Date</th>
              <th style="padding: 10px;">Duration (Days)</th>
              <th style="padding: 10px;">Type</th>
              <th style="padding: 10px;">Agreement #</th>
              <th style="padding: 10px;">Status</th>
            </tr>
          </thead>
          <tbody>
    `;

    filteredAssignments.forEach((record, idx) => {
      const rowBg = idx % 2 === 1 ? '#F8FAFC' : '#FFFFFF';
      const roleText = record.isCurrent ? 'Current Driver' : 'Previous Driver';
      const startStr = isValid(record.startDate) ? format(record.startDate, 'dd/MM/yyyy') : 'N/A';
      const endStr = record.isOngoing ? 'Present (Ongoing)' : (isValid(record.endDate) ? format(record.endDate, 'dd/MM/yyyy') : 'N/A');

      tableHtml += `
        <tr style="text-align: center; background-color: ${rowBg};">
          <td style="padding: 8px; font-weight: bold;">${record.vehicleRegistration}</td>
          <td style="padding: 8px;">${record.vehicleMakeModel}</td>
          <td style="padding: 8px; font-weight: bold;">${record.driverName}</td>
          <td style="padding: 8px;">${record.driverPhone || '-'}</td>
          <td style="padding: 8px; font-weight: bold; color: ${record.isCurrent ? '#047857' : '#475569'};">${roleText}</td>
          <td style="padding: 8px;">${startStr}</td>
          <td style="padding: 8px;">${endStr}</td>
          <td style="padding: 8px;">${record.durationDays}</td>
          <td style="padding: 8px;">${record.assignmentType}</td>
          <td style="padding: 8px;">${record.agreementNumber || '-'}</td>
          <td style="padding: 8px;">${record.status}</td>
        </tr>
      `;
    });

    tableHtml += `</tbody></table></body></html>`;

    const blob = new Blob([tableHtml], { type: 'application/vnd.ms-excel' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Vehicle_Driver_Assignment_History_${format(new Date(), 'yyyy-MM-dd')}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Assignment log exported to Excel');
  };

  const currentCount = filteredAssignments.filter(a => a.isCurrent).length;
  const previousCount = filteredAssignments.filter(a => !a.isCurrent).length;

  return (
    <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
      {/* Header and Controls */}
      <div className="p-4 sm:p-5 bg-gradient-to-r from-[#F8FAFC] to-[#F1F5F9] border-b border-[#E2E8F0]">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-50 border border-blue-200 text-blue-700 rounded-xl shadow-xs">
                <History className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                  Historical Driver Assignment Log
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Chronological record of every driver who has operated each vehicle, including start & return dates.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleExportHistory}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-xs transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              Export Log
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 mt-4 pt-4 border-t border-slate-200">
          <div className="sm:col-span-4">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search driver, vehicle or agreement #..."
                className="w-full pl-9 pr-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder-slate-400 shadow-xs"
              />
            </div>
          </div>

          <div className="sm:col-span-4">
            <div className="relative">
              <Car className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <select
                value={filterVehicle}
                onChange={e => {
                  setFilterVehicle(e.target.value);
                  if (onSelectVehicle) onSelectVehicle(e.target.value);
                }}
                className="w-full pl-9 pr-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-xs cursor-pointer font-medium"
              >
                <option value="all">All Vehicles ({vehicleList.length})</option>
                {vehicleList.map(v => (
                  <option key={v.reg} value={v.reg}>
                    {v.reg} — {v.makeModel}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="sm:col-span-4 flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setFilterType('all')}
              className={`flex-1 py-1.5 px-2 text-xs font-bold rounded-lg transition-colors cursor-pointer text-center ${
                filterType === 'all'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({assignments.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('current')}
              className={`flex-1 py-1.5 px-2 text-xs font-bold rounded-lg transition-colors cursor-pointer text-center ${
                filterType === 'current'
                  ? 'bg-white text-emerald-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Current ({currentCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('previous')}
              className={`flex-1 py-1.5 px-2 text-xs font-bold rounded-lg transition-colors cursor-pointer text-center ${
                filterType === 'previous'
                  ? 'bg-white text-slate-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Previous ({previousCount})
            </button>
          </div>
        </div>
      </div>

      {/* Assignment Log Table */}
      <div className="w-full overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#16192B] text-white text-[11px] uppercase tracking-wider font-bold">
              <th className="py-3 px-4">Vehicle</th>
              <th className="py-3 px-4">Driver Details</th>
              <th className="py-3 px-4">Assignment Status</th>
              <th className="py-3 px-4">Start Date</th>
              <th className="py-3 px-4">End Date</th>
              <th className="py-3 px-4">Duration</th>
              <th className="py-3 px-4">Type / Ref</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-xs">
            {filteredAssignments.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-500">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <History className="w-8 h-8 text-slate-300" />
                    <p className="font-semibold text-slate-600">No driver assignment records found</p>
                    <p className="text-xs text-slate-400">
                      {searchQuery || filterVehicle !== 'all' || filterType !== 'all'
                        ? 'Try adjusting your filters or search keywords.'
                        : 'No rentals or driver allocations recorded for vehicles yet.'}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredAssignments.map((record, idx) => {
                const isEven = idx % 2 === 1;
                const formattedStart = isValid(record.startDate)
                  ? format(record.startDate, 'dd MMM yyyy')
                  : 'N/A';
                const formattedEnd = record.isOngoing
                  ? 'Present (Active)'
                  : isValid(record.endDate)
                  ? format(record.endDate, 'dd MMM yyyy')
                  : 'N/A';

                return (
                  <tr
                    key={record.id || `${record.vehicleId}-${idx}`}
                    className={`hover:bg-blue-50/60 transition-colors ${
                      isEven ? 'bg-[#F8FAFC]' : 'bg-white'
                    } ${record.isCurrent ? 'border-l-4 border-l-emerald-500' : 'border-l-4 border-l-transparent'}`}
                  >
                    {/* Vehicle */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700 shrink-0">
                          <Car className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-black text-slate-900 tracking-tight text-xs uppercase font-mono">
                            {record.vehicleRegistration}
                          </div>
                          <div className="text-[11px] text-slate-500 font-medium">
                            {record.vehicleMakeModel}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Driver */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                          record.isCurrent ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'
                        }`}>
                          <User className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 text-xs">
                            {record.driverName}
                          </div>
                          {record.driverPhone && (
                            <div className="text-[10px] text-slate-500">
                              {record.driverPhone}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Assignment Status */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      {record.isCurrent ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                          Current Driver
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                          <RotateCcw className="w-3 h-3 text-slate-400" />
                          Previous Driver
                        </span>
                      )}
                    </td>

                    {/* Start Date */}
                    <td className="py-3 px-4 whitespace-nowrap font-mono text-slate-800 font-semibold">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                        <span>{formattedStart}</span>
                      </div>
                    </td>

                    {/* End Date */}
                    <td className="py-3 px-4 whitespace-nowrap font-mono font-semibold">
                      {record.isOngoing ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          Present / In Operation
                        </span>
                      ) : (
                        <div className="flex items-center gap-1.5 text-slate-700">
                          <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{formattedEnd}</span>
                        </div>
                      )}
                    </td>

                    {/* Duration */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-bold font-mono text-xs border border-slate-200">
                        <Clock className="w-3 h-3 text-slate-500" />
                        {record.durationDays} {record.durationDays === 1 ? 'day' : 'days'}
                      </span>
                    </td>

                    {/* Type / Ref */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className={`inline-block w-fit px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          record.assignmentType === 'Substitution'
                            ? 'bg-purple-100 text-purple-800 border border-purple-200'
                            : 'bg-blue-100 text-blue-800 border border-blue-200'
                        }`}>
                          {record.assignmentType}
                        </span>
                        {record.agreementNumber && (
                          <span className="text-[10px] text-slate-500 font-mono mt-0.5">
                            #{record.agreementNumber}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Summary Footer */}
      <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-600 gap-2">
        <div className="flex items-center gap-4">
          <span>
            Showing <strong className="text-slate-900">{filteredAssignments.length}</strong> of{' '}
            <strong className="text-slate-900">{assignments.length}</strong> recorded driver assignments
          </span>
          <span className="hidden sm:inline text-slate-300">|</span>
          <span className="hidden sm:inline">
            Vehicles logged: <strong className="text-slate-900">{vehicleList.length}</strong>
          </span>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-slate-500 font-medium">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Active Allocation
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-slate-400"></span> Previous Historical Record
          </span>
        </div>
      </div>
    </div>
  );
};

export default VehicleAssignmentHistoryTable;
