import React from 'react';
import { DataTable } from '../DataTable/DataTable';
import { Accident, Vehicle } from '../../types';
import { Eye, Edit, Trash2, FileText, RefreshCw } from 'lucide-react';
import StatusBadge from '../ui/StatusBadge';
import { usePermissions } from '../../hooks/usePermissions';
import { format } from 'date-fns';

interface AccidentClaimTableProps {
  accidents: Accident[];
  vehicles: Vehicle[];
  onView: (accident: Accident) => void;
  onEdit: (accident: Accident) => void;
  onDelete: (accident: Accident) => void;
  onUpdateStatus: (accident: Accident) => void;
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
  onGenerateDocument,
  onViewDocument
}) => {
  const { can } = usePermissions();

  const columns = [
    {
      header: 'Reference Info',
      cell: ({ row }: any) => (
        <div className="space-y-1">
          <div className="flex items-center">
            <div>
              <div className="font-medium">
                No: {row.original.refNo ?? row.original.referenceNo ?? 'N/A'}
              </div>
              <div className="text-sm text-gray-500">
                Name: {row.original.referenceName || 'N/A'}
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      header: 'Driver Information',
      cell: ({ row }: any) => (
        <div>
          <div className="font-medium">{row.original.driverName}</div>
          <div className="text-sm text-gray-500">NIN: {row.original.driverNIN}</div>
          <div className="text-sm text-gray-500">Mobile: {row.original.driverMobile}</div>
        </div>
      ),
    },
    {
      header: 'Vehicle',
      cell: ({ row }: any) => (
        <div>
          <div className="font-medium">
            {row.original.vehicleMake} {row.original.vehicleModel}
          </div>
          <div className="text-sm text-gray-500">VRN: {row.original.vehicleVRN}</div>
        </div>
      ),
    },
    {
      header: 'Status',
      cell: ({ row }: any) => {
        const d = row.original.accidentDate;
        const t = (row.original.accidentTime || '').toString().trim();
        const loc = (row.original.accidentLocation || '').toString();

        const toDate = (val: any): Date | null => {
          try {
            if (!val) return null;
            if (val instanceof Date) return val;
            if (typeof val === 'object' && val.seconds) return new Date(val.seconds * 1000);
            const parsed = new Date(val);
            return isNaN(parsed.getTime()) ? null : parsed;
          } catch {
            return null;
          }
        };

        const dateObj = toDate(d);
        const dateText = dateObj ? format(dateObj, 'dd-MM-yyyy') : (typeof d === 'string' ? d : 'N/A');

        const locationDisplay =
          loc.length > 26 && loc.includes(',')
            ? loc.split(',').map((s: string) => s.trim()).join(',\n')
            : loc;

        return (
          <div className="space-y-1.5 flex flex-col items-start">
            {/* NEW: Standalone Reported Badge */}
            {row.original.isReported ? (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-100 text-blue-800 border border-blue-200">
                Reported: Yes
              </span>
            ) : (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-gray-100 text-gray-600 border border-gray-200">
                Reported: No
              </span>
            )}

            <StatusBadge status={row.original.status} />
            
            {row.original.type && row.original.type !== 'pending' && (
              <StatusBadge status={row.original.type} />
            )}
            <div className="text-xs text-gray-500 pt-1">
              <div>Accident: {dateText}{t ? ` ${t}` : ''}</div>
              {locationDisplay && (
                <div>
                  Location:{' '}
                  <span className="whitespace-pre-line">{locationDisplay}</span>
                </div>
              )}
            </div>
          </div>
        );
      },
    },
    {
      header: 'Actions',
      cell: ({ row }: any) => (
        <div className="flex space-x-2">
          {can('accidents', 'view') && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onView(row.original);
              }}
              className="p-1.5 rounded hover:bg-blue-50 text-blue-600 transition-colors"
              title="View Details"
            >
              <Eye className="h-4 w-4" />
            </button>
          )}
          
          {can('accidents', 'state') && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onUpdateStatus(row.original);
              }}
              className="p-1.5 rounded hover:bg-orange-50 text-orange-600 transition-colors"
              title="Update Status"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          )}
          {can('accidents', 'update') && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit(row.original);
              }}
              className="p-1.5 rounded hover:bg-blue-50 text-blue-600 transition-colors"
              title="Edit"
            >
              <Edit className="h-4 w-4" />
            </button>
          )}
          {can('accidents', 'singleDoc') && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onGenerateDocument(row.original);
              }}
              className="p-1.5 rounded hover:bg-green-50 text-green-600 transition-colors"
              title="Generate Document"
            >
              <FileText className="h-4 w-4" />
            </button>
          )}
          
          {can('accidents', 'delete') && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(row.original);
              }}
              className="p-1.5 rounded hover:bg-red-50 text-red-600 transition-colors"
              title="Delete"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
          {row.original.documentUrl && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onViewDocument(row.original.documentUrl!);
              }}
              className="p-1.5 rounded hover:bg-blue-50 text-blue-600 transition-colors"
              title="View Document"
            >
              <Eye className="h-4 w-4" />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <DataTable
      data={accidents}
      columns={columns as any}
      rowClassName={(row) => {
        const a = row.original;
        // RED logic: Investigating OR Fault
        if (a.status === 'investigating' || a.type === 'fault') return 'bg-red-50 hover:bg-red-100 transition-colors';
        // YELLOW logic: Processing
        if (a.status === 'processing') return 'bg-yellow-50 hover:bg-yellow-100 transition-colors';
        // GREEN logic: Resolved
        if (a.status === 'resolved') return 'bg-green-50 hover:bg-green-100 transition-colors';
        
        return 'hover:bg-gray-50 transition-colors';
      }}
      // FIXED: Only accept the 'accident' argument
      onRowClick={(accident) => {
        if (can('accidents', 'view')) {
          onView(accident);
        }
      }}
    />
  );
};

export default AccidentClaimTable;