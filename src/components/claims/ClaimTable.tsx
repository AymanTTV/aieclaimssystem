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
import { deriveDisplayStatus } from '../../utils/claimProgress'; // Import the new helper

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
          <div className="text-sm text-gray-500">
            {row.original.clientInfo.phone && (
              <a 
                href={`tel:${row.original.clientInfo.phone}`}
                className="text-blue-600 hover:underline"
                onClick={e => e.stopPropagation()}
              >
                {row.original.clientInfo.phone}
              </a>
            )}
          </div>
          <div className="text-sm text-gray-500">
            {row.original.clientInfo.email && (
              <a 
                href={`mailto:${row.original.clientInfo.email}`}
                className="text-blue-600 hover:underline"
                onClick={e => e.stopPropagation()}
              >
                {row.original.clientInfo.email}
              </a>
            )}
          </div>
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
          <div className="text-sm font-medium"> {/* Made date bold */}
            {format(new Date(row.original.incidentDetails.date), 'dd/MM/yyyy')}
          </div>
          <div className="text-sm text-gray-500">{row.original.incidentDetails.time}</div>
        </div>
      ),
    },
    {
      header: 'Third Party',
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.thirdParty.name}</div>
          <div className="text-sm text-gray-500">{row.original.thirdParty.registration}</div>
          <div className="text-sm text-gray-500">
            {row.original.thirdParty.phone && (
              <a 
                href={`tel:${row.original.thirdParty.phone}`}
                className="text-blue-600 hover:underline"
                onClick={e => e.stopPropagation()}
              >
                {row.original.thirdParty.phone}
              </a>
            )}
          </div>
        </div>
      ),
    },
    {
      header: 'Type & Progress',
      cell: ({ row }) => {
        const claim = row.original;
        const { updatedAt } = claim;
        
        const displayStatus = deriveDisplayStatus(claim);
        const daysSinceUpdate = differenceInDays(new Date(), new Date(updatedAt));
        const showWarning = displayStatus !== 'Claim Completed - Record Archived';
        const isYellow = showWarning && daysSinceUpdate > 0 && daysSinceUpdate < 7;
        const isRed = showWarning && daysSinceUpdate >= 7;

        return (
          <div
            className={[
              'p-2 rounded max-w-xs', // Constrain width
              isYellow ? 'bg-yellow-50' : '',
              isRed ? 'bg-red-50' : ''
            ].join(' ')}
          >
            {/* Use flex-wrap to arrange badges efficiently */}
            <div className="flex flex-wrap gap-1">
              <StatusBadge status={claim.claimType} />
              <StatusBadge status={claim.claimReason} />
              <StatusBadge status={claim.caseProgress} />
              <StatusBadge status={displayStatus} />
            </div>

            {showWarning && daysSinceUpdate > 0 && (
              <div
                className={`mt-1 text-xs font-medium ${ // Add margin-top for spacing
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
            {can('claims', 'note') && (
            <button
              onClick={e => { e.stopPropagation(); onNotes(claim); }}
              className="text-gray-600 hover:text-gray-800"
              title="Notes"
            >
              
              <MessageSquare className="h-4 w-4" />
            </button>
            )}
            {can('claims', 'state') && (
            <button
              onClick={e => { e.stopPropagation(); onUpdateProgress(claim); }}
              className="text-blue-600 hover:text-blue-800"
              title="Update Progress"
            >
              <Clock className="h-4 w-4" />
            </button>
            )}

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
            {can('claims', 'singleDoc') && (
            <button
              onClick={e => { e.stopPropagation(); onGeneratePdf(claim); }}
              className="text-green-600 hover:text-green-800"
              title="Generate PDF"
            >
              <FileText className="h-4 w-4" />
            </button>
            )}
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