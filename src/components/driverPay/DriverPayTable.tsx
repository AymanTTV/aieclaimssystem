// src/components/driverPay/DriverPayTable.tsx

import React from 'react';
import { DataTable } from '../DataTable/DataTable';
import { DriverPay } from '../../types/driverPay';
import { Eye, Edit, DollarSign, Trash2 } from 'lucide-react';
import StatusBadge from '../ui/StatusBadge';
import { usePermissions } from '../../hooks/usePermissions';
import { format } from 'date-fns';

interface DriverPayTableProps {
  records: DriverPay[];
  onView: (record: DriverPay) => void;
  onEdit: (record: DriverPay) => void;
  onDelete: (record: DriverPay) => void;
  onRecordPayment: (record: DriverPay) => void;
}

const DriverPayTable: React.FC<DriverPayTableProps> = ({
  records,
  onView,
  onEdit,
  onDelete,
  onRecordPayment
}) => {
  const { can } = usePermissions();

  const columns = [
    {
      header: 'Driver No',
      cell: ({ row }) => row.original.driverNo,
    },
    {
      header: 'TID No',
      cell: ({ row }) => row.original.tidNo,
    },
    {
      header: 'Name',
      cell: ({ row }) => row.original.name,
    },
    {
      header: 'Phone Number',
      cell: ({ row }) => row.original.phoneNumber,
    },
    {
      header: 'Period',
      cell: ({ row }) => (
        <div className="text-sm">
          <div>{format(row.original.startDate, 'dd/MM/yyyy')}</div>
          <div>{format(row.original.endDate, 'dd/MM/yyyy')}</div>
        </div>
      ),
    },
    {
      header: 'Collection',
      cell: ({ row }) => (
        row.original.collection === 'OTHER' 
          ? row.original.customCollection 
          : row.original.collection
      ),
    },
    {
      header: 'Total',
      cell: ({ row }) => (
        <div className="text-right">
          £{row.original.totalAmount.toFixed(2)}
        </div>
      ),
    },
    {
      header: 'COMM',
      cell: ({ row }) => (
        <div className="text-right text-yellow-600">
          £{row.original.commissionAmount.toFixed(2)}
        </div>
      ),
    },
    {
      header: 'Net Pay',
      cell: ({ row }) => (
        <div className="text-right text-green-600">
          £{row.original.netPay.toFixed(2)}
        </div>
      ),
    },
    {
      header: 'Status',
      cell: ({ row }) => (
        <div className="space-y-1">
          <StatusBadge status={row.original.status} />
          {row.original.paidAmount > 0 && (
            <div className="text-xs">
              <div className="text-green-600">
                Paid: £{row.original.paidAmount.toFixed(2)}
              </div>
              {row.original.remainingAmount > 0 && (
                <div className="text-amber-600">
                  Due: £{row.original.remainingAmount.toFixed(2)}
                </div>
              )}
            </div>
          )}
        </div>
      ),
    },
    {
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex space-x-2">
          {can('finance', 'view') && (
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
          {can('finance', 'update') && (
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
              {row.original.remainingAmount > 0 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRecordPayment(row.original);
                  }}
                  className="text-green-600 hover:text-green-800"
                  title="Record Payment"
                >
                  <DollarSign className="h-4 w-4" />
                </button>
              )}
            </>
          )}
          {can('finance', 'delete') && (
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
      onRowClick={(record) => can('finance', 'view') && onView(record)}
    />
  );
};

export default DriverPayTable;
