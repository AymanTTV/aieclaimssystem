// src/components/vatRecord/VATRecordTable.tsx

import React from 'react';
import { DataTable } from '../DataTable/DataTable';
import { VATRecord } from '../../types/vatRecord';
import { Eye, Edit, Trash2 } from 'lucide-react';
import StatusBadge from '../ui/StatusBadge';
import { usePermissions } from '../../hooks/usePermissions';
import { format } from 'date-fns';

interface VATRecordTableProps {
  records: VATRecord[];
  onView: (record: VATRecord) => void;
  onEdit: (record: VATRecord) => void;
  onDelete: (record: VATRecord) => void;
}

const VATRecordTable: React.FC<VATRecordTableProps> = ({
  records,
  onView,
  onEdit,
  onDelete,
}) => {
  const { can } = usePermissions();

  const columns = [
    {
      header: 'Receipt Details',
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.receiptNo}</div>
          <div className="text-sm text-gray-500">
            {format(row.original.date, 'dd/MM/yyyy')}
          </div>
        </div>
      ),
    },
    {
      header: 'Supplier Info',
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.supplier}</div>
          <div className="text-sm text-gray-500">REG: {row.original.regNo}</div>
        </div>
      ),
    },
    {
      header: 'Financial Details',
      cell: ({ row }) => (
        <div className="space-y-1 text-sm">
          <div className="text-green-600">NET: £{row.original.net.toFixed(2)}</div>
          
          <div className="text-blue-600">VAT ({row.original.vatPercentage}%): £{row.original.vat.toFixed(2)}</div>
          <div>GROSS: £{row.original.gross.toFixed(2)}</div>
          {row.original.vatReceived > 0 && (
            <div className="text-purple-600">Received: £{row.original.vatReceived.toFixed(2)}</div>
          )}
        </div>
      ),
    },
    {
      header: 'Customer',
      cell: ({ row }) => (
        <div className="font-medium">{row.original.customerName}</div>
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
          {can('vatRecord', 'view') && (
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
          {can('vatRecord', 'update') && (
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
          {can('vatRecord', 'delete') && (
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
      data={records}
      columns={columns}
      onRowClick={(record) => can('vatRecord', 'view') && onView(record)}
    />
  );
};

export default VATRecordTable;
