// src/components/maintenance/MaintenanceTable.tsx
import React from 'react';
import { DataTable } from '../DataTable/DataTable';
import { MaintenanceLog, Vehicle } from '../../types';
import { Eye, Edit, Trash2, FileText, DollarSign } from 'lucide-react';
import StatusBadge from '../ui/StatusBadge';
import { usePermissions } from '../../hooks/usePermissions';
import { format } from 'date-fns';
import { useFormattedDisplay } from '../../hooks/useFormattedDisplay';

interface MaintenanceTableProps {
  logs: MaintenanceLog[];
  vehicles: Record<string, Vehicle>;
  onView: (log: MaintenanceLog) => void;
  onEdit: (log: MaintenanceLog) => void;
  onDelete: (log: MaintenanceLog) => void;
  onGenerateDocument: (log: MaintenanceLog) => void;
  onViewDocument: (url: string) => void;
  onPay: (log: MaintenanceLog) => void;
}

const MaintenanceTable: React.FC<MaintenanceTableProps> = ({
  logs,
  vehicles,
  onView,
  onEdit,
  onDelete,
  onGenerateDocument,
  onViewDocument,
  onPay
}) => {
  const { can } = usePermissions();
  const { formatCurrency } = useFormattedDisplay();

  const columns = [
    {
      header: 'Vehicle',
      cell: ({ row }) => {
        const vehicle = vehicles[row.original.vehicleId];
        return vehicle ? (
          <div>
            <div className="font-medium">{vehicle.make} {vehicle.model}</div>
            <div className="text-sm text-gray-500">{vehicle.registrationNumber}</div>
          </div>
        ) : 'N/A';
      },
    },
    {
      header: 'Type',
      cell: ({ row }) => (
        <div>
          <span className="capitalize">{row.original.type.replace('-', ' ')}</span>
          {(row.original.type === 'mot' || row.original.type === 'tfl') && (
            <span className="ml-1 text-sm text-gray-500">Test</span>
          )}
        </div>
      ),
    },
    {
      header: 'Date',
      cell: ({ row }) => format(row.original.date, 'dd/MM/yyyy'),
    },
    {
      header: 'Status',
      cell: ({ row }) => (
        <div className="space-y-1">
          <StatusBadge status={row.original.status} />
          <StatusBadge status={row.original.paymentStatus} />
        </div>
      ),
    },
    {
      header: 'Service Provider',
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.serviceProvider}</div>
          <div className="text-sm text-gray-500">{row.original.location}</div>
        </div>
      ),
    },
    {
      header: 'Cost',
      cell: ({ row }) => {
  const {
    netAmount,
    vatAmount,
    totalDiscount = 0,
    cost,
    paidAmount = 0,
    remainingAmount,
  } = row.original;

  return (
    <div className="space-y-1 text-sm">
      <div className="flex justify-between">
        <span>NET:</span>
        <span>{formatCurrency(netAmount!)}</span>
      </div>
      <div className="flex justify-between">
        <span>VAT:</span>
        <span>{formatCurrency(vatAmount!)}</span>
      </div>
      {totalDiscount > 0 && (
        <div className="flex justify-between text-red-600">
          <span>Discount:</span>
          <span>–{formatCurrency(totalDiscount)}</span>
        </div>
      )}
      <div className="flex justify-between font-medium">
        <span>Total:</span>
        <span>{formatCurrency(cost)}</span>
      </div>
      <div className="flex justify-between text-green-600">
        <span>Paid:</span>
        <span>{formatCurrency(paidAmount)}</span>
      </div>
      <div className="flex justify-between text-amber-600">
        <span>Owing:</span>
        <span>{formatCurrency(remainingAmount)}</span>
      </div>
    </div>
  );
},
    },
    {
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex space-x-2">
          {can('maintenance', 'view') && (
            <button
              onClick={e => {
                e.stopPropagation();
                onView(row.original);
              }}
              className="text-blue-600 hover:text-blue-800"
              title="View Details"
            >
              <Eye className="h-4 w-4" />
            </button>
          )}
          {can('maintenance','update') && (
            <button
              onClick={e=>{ e.stopPropagation(); onPay(row.original); }}
              className="text-green-600 hover:text-green-800"
              title="Record Payment"
            >
              <DollarSign className="h-4 w-4" />
            </button>
          )}

          {can('maintenance', 'update') && (
            <button
              onClick={e => {
                e.stopPropagation();
                onEdit(row.original);
              }}
              className="text-blue-600 hover:text-blue-800"
              title="Edit"
            >
              <Edit className="h-4 w-4" />
            </button>
          )}
          {can('maintenance', 'delete') && (
            <button
              onClick={e => {
                e.stopPropagation();
                onDelete(row.original);
              }}
              className="text-red-600 hover:text-red-800"
              title="Delete"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
          {can('maintenance', 'update') && (
            <button
              onClick={e => {
                e.stopPropagation();
                onGenerateDocument(row.original);
              }}
              className="text-green-600 hover:text-green-800"
              title="Generate Document"
            >
              <FileText className="h-4 w-4" />
            </button>
          )}
          {row.original.documentUrl && (
            <button
              onClick={e => {
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
      data={logs}
      columns={columns}
      onRowClick={log => can('maintenance', 'view') && onView(log)}
    />
  );
};

export default MaintenanceTable;
