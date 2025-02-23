import React from 'react';
import { DataTable } from '../DataTable/DataTable';
import { PersonalInjury } from '../../types/personalInjury';
import { Eye, Edit, Trash2, RefreshCw, FileText } from 'lucide-react';
import StatusBadge from '../ui/StatusBadge';
import { usePermissions } from '../../hooks/usePermissions';
import { format } from 'date-fns';

interface PersonalInjuryTableProps {
  injuries: PersonalInjury[];
  onView: (injury: PersonalInjury) => void;
  onEdit: (injury: PersonalInjury) => void;
  onDelete: (injury: PersonalInjury) => void;
  onUpdateStatus: (injury: PersonalInjury) => void;
  onGenerateDocument: (injury: PersonalInjury) => void;
  onViewDocument: (url: string) => void;
}

const PersonalInjuryTable: React.FC<PersonalInjuryTableProps> = ({
  injuries,
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
      header: 'Name',
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.fullName}</div>
          <div className="text-sm text-gray-500">{row.original.contactNumber}</div>
        </div>
      ),
    },
    {
      header: 'Incident Details',
      cell: ({ row }) => (
        <div>
          <div className="text-sm">
            {format(row.original.incidentDate, 'dd/MM/yyyy')} at {row.original.incidentTime}
          </div>
          <div className="text-sm text-gray-500">{row.original.incidentLocation}</div>
        </div>
      ),
    },
    {
      header: 'Medical Treatment',
      cell: ({ row }) => (
        <div>
          <strong>Received Treatment:</strong> {row.original.receivedMedicalTreatment ? 'Yes' : 'No'}
        </div>
      ),
    },
    {
      header: 'Status',
      cell: ({ row }) => (
        <StatusBadge status={row.original.status} />
      ),
    },
    {
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex space-x-2">
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
                  onUpdateStatus(row.original);
                }}
                className="text-green-600 hover:text-green-800"
                title="Update Status"
              >
                <RefreshCw className="h-4 w-4" />
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
      data={injuries}
      columns={columns}
      onRowClick={(injury) => can('claims', 'view') && onView(injury)}
    />
  );
};

export default PersonalInjuryTable;