// src/components/claims/ClaimTable.tsx

import React from 'react';
import { DataTable } from '../DataTable/DataTable';
import { Claim } from '../../types';
import { Eye, Edit, Trash2, FileText, Download, Play, CheckCircle } from 'lucide-react';
import StatusBadge from '../ui/StatusBadge';
import { usePermissions } from '../../hooks/usePermissions';
import { format } from 'date-fns';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import toast from 'react-hot-toast';

interface ClaimTableProps {
  claims: Claim[];
  onView: (claim: Claim) => void;
  onEdit: (claim: Claim) => void;
  onDelete: (claim: Claim) => void;
}

const ClaimTable: React.FC<ClaimTableProps> = ({
  claims,
  onView,
  onEdit,
  onDelete,
}) => {
  const { can } = usePermissions();

  const handleProgressUpdate = async (claim: Claim, newProgress: 'in-progress' | 'completed') => {
    try {
      const claimRef = doc(db, 'claims', claim.id);
      await updateDoc(claimRef, {
        progress: newProgress,
        updatedAt: new Date(),
        progressHistory: [
          ...claim.progressHistory,
          {
            id: Date.now().toString(),
            date: new Date(),
            status: newProgress,
            note: `Claim marked as ${newProgress}`,
            author: 'System'
          }
        ]
      });
      toast.success(`Claim marked as ${newProgress}`);
    } catch (error) {
      console.error('Error updating claim progress:', error);
      toast.error('Failed to update claim progress');
    }
  };

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
          <div className="text-sm text-gray-500">
            {row.original.clientVehicle.make} {row.original.clientVehicle.model}
          </div>
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
    {
      header: 'Generated Documents',
      cell: ({ row }) => (
        <div className="space-y-1">
          {row.original.documents && Object.entries(row.original.documents).map(([key, url]) => (
            url && (
              <button
                key={key}
                onClick={() => window.open(url, '_blank')}
                className="flex items-center text-sm text-primary hover:text-primary-600"
              >
                <FileText className="h-4 w-4 mr-1" />
                <span>{key.replace(/([A-Z])/g, ' $1').trim()}</span>
              </button>
            )
          ))}
          {(!row.original.documents || Object.keys(row.original.documents).length === 0) && (
            <span className="text-sm text-gray-500">No documents generated</span>
          )}
        </div>
      ),
    },
    {
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex space-x-2">
          {row.original.progress === 'submitted' && can('claims', 'update') && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleProgressUpdate(row.original, 'in-progress');
              }}
              className="text-blue-600 hover:text-blue-800"
              title="Start Processing"
            >
              <Play className="h-4 w-4" />
            </button>
          )}
          {row.original.progress === 'in-progress' && can('claims', 'update') && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleProgressUpdate(row.original, 'completed');
              }}
              className="text-green-600 hover:text-green-800"
              title="Mark as Completed"
            >
              <CheckCircle className="h-4 w-4" />
            </button>
          )}
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
      rowClassName={(claim) => {
        if (claim.progress === 'completed') return 'bg-green-50';
        if (claim.progress === 'in-progress') return 'bg-blue-50';
        return '';
      }}
    />
  );
};

export default ClaimTable;
