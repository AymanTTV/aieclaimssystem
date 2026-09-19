// src/components/accidents/AccidentClaimTable.tsx
import React, { useState } from 'react';
import { DataTable } from '../DataTable/DataTable';
import { Accident, Vehicle } from '../../types';
import { Eye, Edit, Trash2, FileText, RefreshCw, LayoutGrid, TableProperties } from 'lucide-react';
import StatusBadge from '../ui/StatusBadge';
import { usePermissions } from '../../hooks/usePermissions';
import { format } from 'date-fns';
import { calculateReportingTiming, parseDateSafe } from '../../utils/accidentCalculations';

interface AccidentClaimTableProps {
  accidents: Accident[];
  vehicles: Vehicle[];
  onView: (accident: Accident) => void;
  onEdit: (accident: Accident) => void;
  onDelete: (accident: Accident) => void;
  onUpdateStatus: (accident: Accident) => void;
  onUpdateInsurance?: (accident: Accident) => void;
  onGenerateDocument: (accident: Accident) => void;
  onViewDocument: (url: string) => void;
}

const AccidentClaimTable: React.FC<AccidentClaimTableProps> = ({
  accidents,
  vehicles,
  onView,
  onEdit,
  onDelete,
  onUpdateStatus,
  onUpdateInsurance,
  onGenerateDocument,
  onViewDocument
}) => {
  const { can } = usePermissions();
  // Default to primary card structure as required
  const [viewMode, setViewMode] = useState<'primary' | 'insurer'>('primary');

  const fmtDate = (d: any): string => {
    if (!d) return '-';
    const dateObj = parseDateSafe(d);
    return dateObj ? format(dateObj, 'dd/MM/yyyy') : String(d);
  };

  const fmtCurr = (val: any): string => {
    if (val === undefined || val === null || val === '') return '£0.00';
    const n = Number(val);
    return isNaN(n) ? '£0.00' : `£${n.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Complete Action Bar containing View (Eye), Update Insurance Info (Refresh Arrow), Edit (Pencil), Document (Page), and Delete (Trash)
  const renderActions = (accident: Accident) => (
    <div className="flex items-center space-x-1.5 whitespace-nowrap">
      {/* 1. View (Eye) */}
      {can('accidents', 'view') && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onView(accident);
          }}
          className="p-1.5 rounded hover:bg-blue-50 text-blue-600 transition-colors"
          title="View Claim Details"
          aria-label="View Claim Details"
        >
          <Eye className="h-4 w-4" />
        </button>
      )}

      {/* 2. Update Insurance Info (Refresh Arrow) -> Opens dedicated Post-Report Insurance Data popup modal */}
      {can('accidents', 'update') && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (onUpdateInsurance) {
              onUpdateInsurance(accident);
            } else {
              onUpdateStatus(accident);
            }
          }}
          className="p-1.5 rounded bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 transition-colors shadow-xs"
          title="Update Insurance Info (Post-Report Data & Status)"
          aria-label="Update Insurance Info"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      )}

      {/* 3. Edit (Pencil) */}
      {can('accidents', 'update') && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit(accident);
          }}
          className="p-1.5 rounded hover:bg-blue-50 text-blue-600 transition-colors"
          title="Edit Accident Report"
          aria-label="Edit Accident Report"
        >
          <Edit className="h-4 w-4" />
        </button>
      )}

      {/* 4. Document (Page) */}
      {can('accidents', 'singleDoc') && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onGenerateDocument(accident);
          }}
          className="p-1.5 rounded hover:bg-green-50 text-green-600 transition-colors"
          title="Export Fleet Claim Experience PDF Report"
          aria-label="Export Fleet Claim Experience PDF Report"
        >
          <FileText className="h-4 w-4" />
        </button>
      )}

      {/* 5. Delete (Trash) */}
      {can('accidents', 'delete') && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(accident);
          }}
          className="p-1.5 rounded hover:bg-red-50 text-red-600 transition-colors"
          title="Delete Claim"
          aria-label="Delete Claim"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}

      {/* Uploaded Document Quick-View if available */}
      {accident.documentUrl && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onViewDocument(accident.documentUrl!);
          }}
          className="p-1.5 rounded hover:bg-purple-50 text-purple-600 transition-colors"
          title="View Uploaded Document"
        >
          <Eye className="h-4 w-4" />
        </button>
      )}
    </div>
  );

  // PRIMARY TABLE COLUMNS (Preserving exact card structure requested)
  const primaryCardColumns = [
    {
      header: 'Reference Info',
      cell: ({ row }: any) => {
        const claimNo = row.original.claimNo || row.original.refNo || row.original.referenceNo || 'N/A';
        const reportedBy = row.original.claimReportedBy || row.original.referenceName || row.original.submittedByName || 'N/A';
        return (
          <div className="space-y-1 py-1">
            <div className="font-semibold text-gray-900 text-sm">
              <span className="text-gray-500 font-normal">No:</span> {claimNo}
            </div>
            <div className="text-xs text-gray-600">
              <span className="text-gray-500 font-medium">Name:</span> {reportedBy}
            </div>
            {row.original.accCd && (
              <div className="text-[11px] font-mono text-gray-500">
                Code: {row.original.accCd}
              </div>
            )}
          </div>
        );
      },
    },
    {
      header: 'Driver Information',
      cell: ({ row }: any) => {
        const dName = row.original.driverName || 'N/A';
        const nin = row.original.driverNIN || '-';
        const mobile = row.original.driverMobile || row.original.driverPhone || '-';
        return (
          <div className="space-y-0.5 py-1">
            <div className="font-semibold text-gray-900 text-sm">{dName}</div>
            <div className="text-xs text-gray-600">
              <span className="text-gray-500">NIN:</span> {nin}
            </div>
            <div className="text-xs text-gray-600">
              <span className="text-gray-500">Mobile:</span> {mobile}
            </div>
          </div>
        );
      },
    },
    {
      header: 'Vehicle',
      cell: ({ row }: any) => {
        const make = row.original.vehicleMake || '';
        const model = row.original.vehicleModel || '';
        const vModel = `${make} ${model}`.trim() || 'N/A';
        const vrn = row.original.regNo || row.original.vehicleVRN || 'N/A';
        return (
          <div className="space-y-1 py-1">
            <div className="font-semibold text-gray-900 text-sm">{vModel}</div>
            <div className="text-xs font-mono font-semibold text-gray-700 bg-gray-100 inline-block px-2 py-0.5 rounded border border-gray-200">
              VRN: {vrn}
            </div>
          </div>
        );
      },
    },
    {
      header: 'Status & Reporting',
      cell: ({ row }: any) => {
        const a = row.original;
        const timing = calculateReportingTiming({
          accidentDate: a.accidentDate,
          accidentTime: a.accidentTime,
          reportedDate: a.reportedDate,
          reportedTime: a.reportedTime,
          submittedAt: a.submittedAt,
          existingPenalty: a.lateReportingPenalty ?? a.penaltyPayment,
        });

        const isReported = a.isReported !== false && Boolean(a.reportedDate || a.isReported);
        const fault = a.fault || a.faultType || a.type || 'Fault';
        const isFault = fault.toLowerCase() === 'fault';
        const isNonFault = fault.toLowerCase() === 'non-fault';

        return (
          <div className="space-y-2 py-1 max-w-md">
            {/* Status Badges Row */}
            <div className="flex flex-wrap items-center gap-1.5">
              {/* Reported: Yes/No */}
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border ${
                isReported 
                  ? 'bg-blue-50 text-blue-800 border-blue-200' 
                  : 'bg-gray-100 text-gray-700 border-gray-200'
              }`}>
                Reported: {isReported ? 'Yes' : 'No'}
              </span>

              {/* Claim Status */}
              <StatusBadge status={a.status || 'investigating'} />

              {/* Fault: Fault | Non-Fault | Split */}
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold border ${
                isNonFault
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : isFault
                  ? 'bg-rose-50 text-rose-800 border-rose-200'
                  : 'bg-amber-50 text-amber-800 border-amber-200'
              }`}>
                Fault: {fault}
              </span>
            </div>

            {/* Accident Details */}
            <div className="text-xs space-y-0.5 text-gray-700 bg-slate-50/70 p-2 rounded border border-slate-200/80">
              <div>
                <span className="font-semibold text-gray-900">Accident:</span> {timing.accidentDateTimeStr}
              </div>
              <div className="truncate">
                <span className="font-semibold text-gray-900">Location:</span> {a.accidentLocation || 'N/A'}
              </div>
            </div>

            {/* Reporting Details (24-Hour Late Reporting & Penalty Calculation) */}
            <div className="text-xs space-y-1 bg-white p-2 rounded border border-gray-200 shadow-2xs">
              <div className="flex items-center justify-between text-gray-700">
                <span className="text-gray-500">Date Reported:</span>
                <span className="font-medium text-gray-900">{timing.reportedDateTimeStr}</span>
              </div>
              <div className="flex items-center justify-between text-gray-700">
                <span className="text-gray-500">Time to Report:</span>
                <span className="font-semibold text-gray-800 bg-gray-100 px-1.5 py-0.5 rounded font-mono text-[11px]">
                  {timing.timeToReportDisplay}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Late Reporting:</span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${
                  timing.isLate 
                    ? 'bg-rose-100 text-rose-800 border-rose-200' 
                    : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                }`}>
                  {timing.lateReporting} {timing.isLate ? '(> 24h)' : '(≤ 24h)'}
                </span>
              </div>
              <div className="flex items-center justify-between pt-0.5 border-t border-gray-100">
                <span className="text-gray-500 font-medium">Penalty Payment:</span>
                <span className={`font-bold ${timing.isLate && timing.penaltyPayment > 0 ? 'text-rose-700' : 'text-gray-900'}`}>
                  £{timing.penaltyPayment.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        );
      },
    },
    {
      header: 'Actions',
      cell: ({ row }: any) => renderActions(row.original),
    },
  ];

  // Optional: INSURER SPREADSHEET COLUMNS (available via toggle for comprehensive audit)
  const insurerColumns = [
    {
      header: 'Claim No',
      cell: ({ row }: any) => {
        const cNo = row.original.claimNo || row.original.refNo || row.original.referenceNo || 'N/A';
        const insRef = row.original.insuranceRefNo;
        return (
          <div className="whitespace-nowrap font-medium text-gray-900">
            <div>{cNo}</div>
            {insRef && <div className="text-[11px] text-gray-500">Ins: {insRef}</div>}
          </div>
        );
      },
    },
    {
      header: 'Status',
      cell: ({ row }: any) => (
        <div className="space-y-1">
          <StatusBadge status={row.original.status || 'investigating'} />
          {row.original.insuranceClaimStatus && row.original.insuranceClaimStatus !== 'pending' && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-100 text-purple-800">
              {row.original.insuranceClaimStatus.replace('_', ' ')}
            </span>
          )}
        </div>
      ),
    },
    {
      header: 'Accident Date',
      cell: ({ row }: any) => (
        <div className="whitespace-nowrap text-sm text-gray-800">
          {fmtDate(row.original.accidentDate)}
          {row.original.accidentTime && <span className="text-xs text-gray-500 ml-1">{row.original.accidentTime}</span>}
        </div>
      ),
    },
    {
      header: 'Reported Date',
      cell: ({ row }: any) => (
        <div className="whitespace-nowrap text-sm text-gray-800">
          {fmtDate(row.original.reportedDate || row.original.submittedAt)}
          {row.original.reportedTime && <span className="text-xs text-gray-500 ml-1">{row.original.reportedTime}</span>}
        </div>
      ),
    },
    {
      header: 'Time to Report',
      cell: ({ row }: any) => {
        const timing = calculateReportingTiming({
          accidentDate: row.original.accidentDate,
          accidentTime: row.original.accidentTime,
          reportedDate: row.original.reportedDate,
          reportedTime: row.original.reportedTime,
          submittedAt: row.original.submittedAt,
        });
        return (
          <span className="font-mono text-xs font-semibold text-gray-800 bg-gray-100 px-2 py-0.5 rounded whitespace-nowrap">
            {timing.timeToReportDisplay}
          </span>
        );
      },
    },
    {
      header: 'Late Reporting',
      cell: ({ row }: any) => {
        const timing = calculateReportingTiming({
          accidentDate: row.original.accidentDate,
          accidentTime: row.original.accidentTime,
          reportedDate: row.original.reportedDate,
          reportedTime: row.original.reportedTime,
          submittedAt: row.original.submittedAt,
        });
        return (
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold whitespace-nowrap ${
            timing.isLate ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
          }`}>
            {timing.lateReporting}
          </span>
        );
      },
    },
    {
      header: 'Penalty (£)',
      cell: ({ row }: any) => {
        const timing = calculateReportingTiming({
          accidentDate: row.original.accidentDate,
          accidentTime: row.original.accidentTime,
          reportedDate: row.original.reportedDate,
          reportedTime: row.original.reportedTime,
          submittedAt: row.original.submittedAt,
          existingPenalty: row.original.lateReportingPenalty ?? row.original.penaltyPayment,
        });
        return (
          <span className={`text-sm font-semibold whitespace-nowrap ${timing.isLate && timing.penaltyPayment > 0 ? 'text-rose-700' : 'text-gray-700'}`}>
            £{timing.penaltyPayment.toFixed(2)}
          </span>
        );
      },
    },
    {
      header: 'Driver Name',
      cell: ({ row }: any) => (
        <div className="whitespace-nowrap">
          <div className="font-medium text-gray-900 text-sm">{row.original.driverName || 'N/A'}</div>
          {row.original.driverMobile && <div className="text-xs text-gray-500">{row.original.driverMobile}</div>}
        </div>
      ),
    },
    {
      header: 'Reg No',
      cell: ({ row }: any) => {
        const reg = row.original.regNo || row.original.vehicleVRN || 'N/A';
        return (
          <span className="inline-block px-2 py-0.5 rounded bg-gray-100 text-gray-800 font-mono text-xs font-semibold whitespace-nowrap">
            {reg}
          </span>
        );
      },
    },
    {
      header: 'Acc Cd',
      cell: ({ row }: any) => (
        <span className="text-sm font-mono text-gray-600 whitespace-nowrap">
          {row.original.accCd || '-'}
        </span>
      ),
    },
    {
      header: 'Fault',
      cell: ({ row }: any) => {
        const f = row.original.fault || row.original.faultType || row.original.type || 'Fault';
        const isFault = f.toLowerCase() === 'fault';
        const isNonFault = f.toLowerCase() === 'non-fault';
        return (
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold whitespace-nowrap ${
            isNonFault
              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
              : isFault
              ? 'bg-rose-100 text-rose-800 border border-rose-200'
              : 'bg-amber-100 text-amber-800 border border-amber-200'
          }`}>
            {f}
          </span>
        );
      },
    },
    {
      header: 'AD Paid (£)',
      cell: ({ row }: any) => (
        <span className="text-sm font-medium text-gray-900 whitespace-nowrap">
          {fmtCurr(row.original.adPaid)}
        </span>
      ),
    },
    {
      header: 'TP Paid (£)',
      cell: ({ row }: any) => (
        <span className="text-sm font-medium text-gray-900 whitespace-nowrap">
          {fmtCurr(row.original.tpPaid)}
        </span>
      ),
    },
    {
      header: 'Incurred (£)',
      cell: ({ row }: any) => {
        const inc = row.original.incurred !== undefined
          ? row.original.incurred
          : ((Number(row.original.adPaid) || 0) + (Number(row.original.tpPaid) || 0));
        return (
          <span className="text-sm font-bold text-purple-900 bg-purple-50 px-2 py-0.5 rounded whitespace-nowrap">
            {fmtCurr(inc)}
          </span>
        );
      },
    },
    {
      header: 'AD Est (£)',
      cell: ({ row }: any) => (
        <span className="text-sm text-gray-700 whitespace-nowrap">
          {fmtCurr(row.original.adEst)}
        </span>
      ),
    },
    {
      header: 'Total TP Est (£)',
      cell: ({ row }: any) => (
        <span className="text-sm font-semibold text-indigo-900 whitespace-nowrap">
          {fmtCurr(row.original.totalTpEst)}
        </span>
      ),
    },
    {
      header: 'Act Recovery (£)',
      cell: ({ row }: any) => (
        <span className="text-sm font-semibold text-emerald-700 whitespace-nowrap">
          {fmtCurr(row.original.actRecovery)}
        </span>
      ),
    },
    {
      header: 'Actions',
      cell: ({ row }: any) => renderActions(row.original),
    },
  ];

  const activeColumns = viewMode === 'primary' ? primaryCardColumns : insurerColumns;

  return (
    <div className="space-y-3">
      {/* Table Layout Toggle Bar */}
      <div className="flex items-center justify-between px-1 py-1">
        <div className="text-xs font-medium text-gray-500">
          Showing <span className="font-semibold text-gray-800">{accidents.length}</span> claims
          {viewMode === 'primary' && (
            <span className="ml-2 text-blue-700 bg-blue-50 px-2 py-0.5 rounded text-[11px] font-semibold border border-blue-100">
              Primary Card Structure Active
            </span>
          )}
          {viewMode === 'insurer' && (
            <span className="ml-2 text-purple-700 bg-purple-50 px-2 py-0.5 rounded text-[11px] font-semibold border border-purple-100">
              Insurer Spreadsheet Layout Active
            </span>
          )}
        </div>

        <div className="flex items-center bg-gray-100 p-0.5 rounded-lg border border-gray-200">
          <button
            type="button"
            onClick={() => setViewMode('primary')}
            className={`flex items-center space-x-1.5 px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
              viewMode === 'primary'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
            title="Switch to Primary Card Structure"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Card Structure</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('insurer')}
            className={`flex items-center space-x-1.5 px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
              viewMode === 'insurer'
                ? 'bg-white text-purple-700 shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
            title="Switch to Insurer Spreadsheet Layout"
          >
            <TableProperties className="w-3.5 h-3.5" />
            <span>Insurer Layout</span>
          </button>
        </div>
      </div>

      {/* Main Table */}
      <DataTable
        data={accidents}
        columns={activeColumns as any}
        rowClassName={(row) => {
          const a = row.original;
          if (a.status === 'investigating' || (a.fault || a.type) === 'fault') return 'bg-red-50/40 hover:bg-red-100/50 transition-colors';
          if (a.status === 'processing') return 'bg-yellow-50/40 hover:bg-yellow-100/50 transition-colors';
          if (a.status === 'resolved') return 'bg-green-50/40 hover:bg-green-100/50 transition-colors';
          return 'hover:bg-gray-50 transition-colors';
        }}
        onRowClick={(accident) => {
          if (can('accidents', 'view')) {
            onView(accident);
          }
        }}
      />
    </div>
  );
};

export default AccidentClaimTable;
