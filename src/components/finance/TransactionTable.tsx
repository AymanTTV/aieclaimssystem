// src/components/finance/TransactionTable.tsx

import React from 'react';
import { DataTable } from '../DataTable/DataTable';
import { Transaction, Vehicle, Customer, Account } from '../../types';
import { Eye, Edit, Trash2, FileText, Share2, Printer } from 'lucide-react';
import StatusBadge from '../ui/StatusBadge';
import { usePermissions } from '../../hooks/usePermissions';
import { format } from 'date-fns';
import { useFormattedDisplay } from '../../hooks/useFormattedDisplay';

interface TransactionTableProps {
  transactions: Transaction[];
  vehicles: Vehicle[];
  customers: Customer[];
  accounts: Account[];
  onView: (transaction: Transaction) => void;
  onEdit: (transaction: Transaction) => void;
  onDelete: (transaction: Transaction) => void;
  onGenerateDocument: (transaction: Transaction) => void;
  onViewDocument: (url: string) => void;
  onPrintReceipt?: (transaction: Transaction) => void;
  onAssign: (txn: Transaction) => void;
  groups: { id: string; name: string }[];
  selectedCustomerId?: string;
  onCustomerChange?: (customerId: string) => void;
}

const TransactionTable: React.FC<TransactionTableProps> = ({
  transactions,
  vehicles,
  customers,
  accounts,
  onView,
  onEdit,
  onDelete,
  onGenerateDocument,
  onViewDocument,
  onPrintReceipt,
  onAssign,
  groups,
  selectedCustomerId,
  onCustomerChange,
}) => {
  const { can } = usePermissions();
  const { formatCurrency } = useFormattedDisplay();

  const columns = [
    {
      header: 'Date',
      cell: ({ row }) => format(row.original.date, 'dd/MM/yyyy'),
    },
    {
      header: 'Type & Status',
      cell: ({ row }) => (
        <div className="space-y-1">
          <StatusBadge status={row.original.type} />
          <StatusBadge status={row.original.status || 'completed'} />
          <StatusBadge status={row.original.paymentStatus} />
        </div>
      ),
    },
    {
      header: 'Category',
      accessorKey: 'category',
    },
    {
      header: 'Amount',
      cell: ({ row }) => (
        <span className={row.original.type === 'income' ? 'text-green-600' : 'text-red-600'}>
          {formatCurrency(row.original.amount)}
        </span>
      ),
    },
    {
      header: 'Customer',
      cell: ({ row }) => {
        if (row.original.customerName) {
          return <div>{row.original.customerName}</div>;
        }
        if (row.original.customerId) {
          const customer = customers.find(c => c.id === row.original.customerId);
          if (customer) {
            return (
              <div>
                <div className="font-medium">{customer.name}</div>
                <div className="text-sm text-gray-500">{customer.mobile}</div>
              </div>
            );
          }
        }
        return <div className="text-gray-400">N/A</div>;
      },
    },
    {
      header: 'Vehicle',
      cell: ({ row }) => {
        if (row.original.vehicleName) {
          return <div>{row.original.vehicleName}</div>;
        }
        if (row.original.vehicleId) {
          const vehicle = vehicles.find(v => v.id === row.original.vehicleId);
          if (vehicle) {
            return (
              <div>
                <div className="font-medium">{vehicle.make} {vehicle.model}</div>
                <div className="text-sm text-gray-500">{vehicle.registrationNumber}</div>
              </div>
            );
          }
        }
        return <div className="text-gray-400">N/A</div>;
      },
    },
    {
      header: 'Group',
      accessorKey: 'groupId',
      cell: ({ row }) => {
        const txn = row.original as Transaction;
        const grp = groups.find(g => g.id === txn.groupId);
        return (
          <div className="flex items-center space-x-2">
            <span>{grp?.name || '-'}</span>
            <button
              onClick={e => {
                e.stopPropagation();
                onAssign(txn);
              }}
              className="p-1 hover:bg-gray-100 rounded"
              title="Assign to group"
            >
              <Share2 size={16} />
            </button>
          </div>
        );
      },
    },

    // ── Receipt Column ─────────────────────
    {
      header: 'Receipt',
      cell: ({ row }) =>
        onPrintReceipt ? (
          <button
            onClick={e => { e.stopPropagation(); onPrintReceipt(row.original); }}
            className="p-1 hover:bg-gray-100 rounded"
            title="Print Receipt"
          >
            <Printer className="h-4 w-4 text-gray-600" />
          </button>
        ) : null,
    },

    {
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex space-x-2">
          {can('finance', 'view') && (
            <button
              onClick={e => { e.stopPropagation(); onView(row.original); }}
              className="text-blue-600 hover:text-blue-800"
              title="View Details"
            >
              <Eye className="h-4 w-4" />
            </button>
          )}
          {can('finance', 'update') && (
            <>
              <button
                onClick={e => { e.stopPropagation(); onEdit(row.original); }}
                className="text-blue-600 hover:text-blue-800"
                title="Edit"
              >
                <Edit className="h-4 w-4" />
              </button>
              <button
                onClick={e => { e.stopPropagation(); onGenerateDocument(row.original); }}
                className="text-green-600 hover:text-green-800"
                title="Generate Document"
              >
                <FileText className="h-4 w-4" />
              </button>
            </>
          )}
          {can('finance', 'delete') && (
            <button
              onClick={e => { e.stopPropagation(); onDelete(row.original); }}
              className="text-red-600 hover:text-red-800"
              title="Delete"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
          {row.original.documentUrl && (
            <button
              onClick={e => { e.stopPropagation(); onViewDocument(row.original.documentUrl!); }}
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
      data={transactions}
      columns={columns}
      onRowClick={transaction => can('finance', 'view') && onView(transaction)}
    />
  );
};

export default TransactionTable;
