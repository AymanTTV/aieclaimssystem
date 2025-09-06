import React from 'react';
import { DataTable } from '../DataTable/DataTable';
import { Accident, Vehicle } from '../../types';
import { Eye, Edit, Trash2, FileText } from 'lucide-react';
import StatusBadge from '../ui/StatusBadge';
import { usePermissions } from '../../hooks/usePermissions';
import { format } from 'date-fns';

interface AccidentClaimTableProps {
  accidents: Accident[];
  vehicles: Vehicle[];
  onView: (accident: Accident) => void;
  onEdit: (accident: Accident) => void;
  onDelete: (accident: Accident) => void;
  onGenerateDocument: (accident: Accident) => void;
  onViewDocument: (url: string) => void;
}

const AccidentClaimTable: React.FC<AccidentClaimTableProps> = ({
  accidents,
  vehicles,
  onView,
  onEdit,
  onDelete,
  onGenerateDocument,
  onViewDocument
}) => {
  const { can } = usePermissions();

  const columns = [
    {
  header: 'Reference Info',
  cell: ({ row }) => (
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
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.driverName}</div>
          <div className="text-sm text-gray-500">NIN: {row.original.driverNIN}</div>
          <div className="text-sm text-gray-500">Mobile: {row.original.driverMobile}</div>
        </div>
      ),
    },
    {
      header: 'Vehicle',
      cell: ({ row }) => (
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
  cell: ({ row }) => {
    const d = row.original.accidentDate;
    const t = (row.original.accidentTime || '').toString().trim();
    const loc = (row.original.accidentLocation || '').toString();

    // robust date handling: Date | Firestore Timestamp | ISO/string
    const toDate = (val: any): Date | null => {
      try {
        if (!val) return null;
        if (val instanceof Date) return val;
        // Firestore Timestamp support
        if (typeof val === 'object' && val.seconds) return new Date(val.seconds * 1000);
        const parsed = new Date(val);
        return isNaN(parsed.getTime()) ? null : parsed;
      } catch {
        return null;
      }
    };

    const dateObj = toDate(d);
    const dateText = dateObj ? format(dateObj, 'dd-MM-yyyy') : (typeof d === 'string' ? d : 'N/A');

    // If long and has commas, insert line breaks at commas
    const locationDisplay =
      loc.length > 26 && loc.includes(',')
        ? loc.split(',').map(s => s.trim()).join(',\n')
        : loc;

    return (
      <div className="space-y-1">
        <StatusBadge status={row.original.status} />
        {row.original.type && row.original.type !== 'pending' && (
          <StatusBadge status={row.original.type} />
        )}

        <div className="text-xs text-gray-500">
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
      cell: ({ row }) => (
        <div className="flex space-x-2">
          {can('accidents', 'view') && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onView(row.original);
              }}
              className="text-blue-600 hover:text-blue-800"
              title="View Details"
            >
              <Eye className="h-4 w-4" />
            </button>
          )}
          {can('accidents', 'update') && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(row.original);
                }}
                className="text-blue-600 hover:text-blue-800"
                title="Edit"
              >
                <Edit className="h-4 w-4" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onGenerateDocument(row.original);
                }}
                className="text-green-600 hover:text-green-800"
                title="Generate Document"
              >
                <FileText className="h-4 w-4" />
              </button>
            </>
          )}
          {can('accidents', 'delete') && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(row.original);
              }}
              className="text-red-600 hover:text-red-800"
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
              className="text-blue-600 hover:text-blue-800"
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
    columns={columns}
    onRowClick={(accident, event) => {
      // bail out if the click target is a button, icon, or link:
      const tag = (event.target as HTMLElement).tagName.toLowerCase();
      if (['button','svg','path','a','input','select','textarea'].includes(tag)) {
        return;
      }
      can('accidents','view') && onView(accident);
    }}
  />

  );
};

export default AccidentClaimTable;