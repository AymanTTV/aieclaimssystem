// src/components/claims/ClaimTable.tsx
import React from 'react';
import { DataTable } from '../DataTable/DataTable';
import { Claim } from '../../types';
import {
  Eye,
  Edit,
  Trash2,
  Clock,
  FileText,
  MessageSquare
} from 'lucide-react';
import StatusBadge from '../ui/StatusBadge';
import { usePermissions } from '../../hooks/usePermissions';
import { format, differenceInDays } from 'date-fns';

interface ClaimTableProps {
  claims: Claim[];
  onView: (claim: Claim) => void;
  onEdit: (claim: Claim) => void;
  onDelete: (claim: Claim) => void;
  onUpdateProgress: (claim: Claim) => void;
  onGeneratePdf: (claim: Claim) => void;
  
  onNotes: (claim: Claim) => void;
}

const ClaimTable: React.FC<ClaimTableProps> = ({
  claims,
  onView,
  onEdit,
  onDelete,
  onUpdateProgress,
  onGeneratePdf,
  onNotes
}) => {
  const { can } = usePermissions();

  const columns = [
    {
      header: 'Client Details',
      cell: ({ row }) => (
        <div>
          {row.original.clientRef && (
            <div className="text-sm text-gray-500">
              Ref: {row.original.clientRef}
            </div>
          )}
          <div className="font-medium">{row.original.clientInfo.name}</div>
          <div className="text-sm text-gray-500">{row.original.clientInfo.phone}</div>
          <div className="text-sm text-gray-500">{row.original.clientInfo.email}</div>
        </div>
      ),
    },
    {
      header: 'Vehicle',
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.clientVehicle.registration}</div>
        </div>
      ),
    },
    {
      header: 'Incident Details',
      cell: ({ row }) => (
        <div>
          <div className="text-sm">
            {format(row.original.incidentDetails.date, 'dd/MM/yyyy')}
          </div>
          <div className="text-sm text-gray-500">{row.original.incidentDetails.time}</div>
          <div className="text-sm text-gray-500 truncate max-w-xs">
            {row.original.incidentDetails.location}
          </div>
        </div>
      ),
    },
    {
      header: 'Third Party',
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.thirdParty.name}</div>
          <div className="text-sm text-gray-500">{row.original.thirdParty.registration}</div>
          <div className="text-sm text-gray-500">{row.original.thirdParty.phone}</div>
        </div>
      ),
    },
    {
      header: 'Type & Progress',
      cell: ({ row }) => {
        const { updatedAt, progress } = row.original;
        const daysSinceUpdate = differenceInDays(new Date(), updatedAt);
        const showWarning = progress !== 'Claim Complete';
        const isYellow = showWarning && daysSinceUpdate > 0 && daysSinceUpdate < 7;
        const isRed = showWarning && daysSinceUpdate >= 7;

        return (
          <div
            className={[
              'space-y-1 p-2 rounded',
              isYellow ? 'bg-yellow-50' : '',
              isRed ? 'bg-red-50' : ''
            ].join(' ')}
          >
            <StatusBadge status={row.original.claimType} />
            <StatusBadge status={row.original.claimReason} />
            <StatusBadge status={row.original.caseProgress} />
            <StatusBadge status={row.original.progress} />

            {showWarning && daysSinceUpdate > 0 && (
              <div
                className={`text-xs font-medium ${
                  isRed ? 'text-red-800' : 'text-yellow-800'
                }`}
              >
                {daysSinceUpdate} day{daysSinceUpdate !== 1 ? 's' : ''} ago
              </div>
            )}
          </div>
        );
      },
    },
    {
      header: 'Actions',
      cell: ({ row }) => {
        const claim = row.original;
        return (
          <div className="flex space-x-2">

            <button
              onClick={e => { e.stopPropagation(); onNotes(claim); }}
              className="text-gray-600 hover:text-gray-800"
              title="Notes"
            >
              <MessageSquare className="h-4 w-4" />
            </button>
            <button
              onClick={e => { e.stopPropagation(); onUpdateProgress(claim); }}
              className="text-blue-600 hover:text-blue-800"
              title="Update Progress"
            >
              <Clock className="h-4 w-4" />
            </button>

            {can('claims', 'view') && (
              <button
                onClick={e => { e.stopPropagation(); onView(claim); }}
                className="text-blue-600 hover:text-blue-800"
                title="View Details"
              >
                <Eye className="h-4 w-4" />
              </button>
            )}

            {can('claims', 'update') && (
              <button
                onClick={e => { e.stopPropagation(); onEdit(claim); }}
                className="text-blue-600 hover:text-blue-800"
                title="Edit Claim"
              >
                <Edit className="h-4 w-4" />
              </button>
            )}

            {can('claims', 'delete') && (
              <button
                onClick={e => { e.stopPropagation(); onDelete(claim); }}
                className="text-red-600 hover:text-red-800"
                title="Delete Claim"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}

            {/* ALWAYS show the PDF button */}
            <button
              onClick={e => { e.stopPropagation(); onGeneratePdf(claim); }}
              className="text-green-600 hover:text-green-800"
              title="Generate PDF"
            >
              <FileText className="h-4 w-4" />
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <DataTable
      data={claims}
      columns={columns}
      onRowClick={claim => can('claims', 'view') && onView(claim)}
    />
  );
};

export default ClaimTable;