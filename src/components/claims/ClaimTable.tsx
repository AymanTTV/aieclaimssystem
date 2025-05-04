import React from 'react';
import { DataTable } from '../DataTable/DataTable';
import { Claim } from '../../types';
import { Eye, Edit, Trash2, FileText, Download, Play, CheckCircle, Clock } from 'lucide-react';
import StatusBadge from '../ui/StatusBadge';
import { usePermissions } from '../../hooks/usePermissions';
import { format } from 'date-fns';

interface ClaimTableProps {
  claims: Claim[];
  onView: (claim: Claim) => void;
  onEdit: (claim: Claim) => void;
  onDelete: (claim: Claim) => void;
  onUpdateProgress: (claim: Claim) => void;
}

const ClaimTable: React.FC<ClaimTableProps> = ({
  claims,
  onView,
  onEdit,
  onDelete,
  onUpdateProgress,
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
          <div className="text-sm">{format(row.original.incidentDetails.date, 'dd/MM/yyyy')}</div>
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
      cell: ({ row }) => (
        <div className="space-y-1">
          <StatusBadge status={row.original.claimType} />
          <StatusBadge status={row.original.claimReason} />
          <StatusBadge status={row.original.caseProgress} />
          <StatusBadge status={row.original.progress} />
        </div>
      ),
    },
    // {
    //   header: 'Generated Documents',
    //   cell: ({ row }) => (
    //     <div className="space-y-1">
    //       {row.original.documents && Object.entries(row.original.documents).map(([key, url]) => (
    //         url && (
    //           <button
    //             key={key}
    //             onClick={() => window.open(url, '_blank')}
    //             className="flex items-center text-sm text-primary hover:text-primary-600"
    //           >
    //             <FileText className="h-4 w-4 mr-1" />
    //             <span>{key.replace(/([A-Z])/g, ' $1').trim()}</span>
    //           </button>
    //         )
    //       ))}
    //       {(!row.original.documents || Object.keys(row.original.documents).length === 0) && (
    //         <span className="text-sm text-gray-500">No documents generated</span>
    //       )}
    //     </div>
    //   ),
    // },
    {
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex space-x-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onUpdateProgress(row.original);
            }}
            className="text-blue-600 hover:text-blue-800"
            title="Update Progress"
          >
            <Clock className="h-4 w-4" />
          </button>
          {can('claims', 'view') && (
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
          {can('claims', 'update') && (
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
          )}
          {can('claims', 'delete') && (
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
        </div>
      ),
    },
  ];

  return (
    <DataTable
      data={claims}
      columns={columns}
      onRowClick={(claim) => can('claims', 'view') && onView(claim)}
    />
  );
};

export default ClaimTable;