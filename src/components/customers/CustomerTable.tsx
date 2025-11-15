// src/components/customers/CustomerTable.tsx
import React from 'react';
import { DataTable } from '../DataTable/DataTable';
import { Customer } from '../../types/customer';
import { Eye, Edit, Trash2, FileText, File, Tag } from 'lucide-react';
import { formatDate } from '../../utils/dateHelpers';
import { isExpiringOrExpired } from '../../types/customer';
import { usePermissions } from '../../hooks/usePermissions';

interface CustomerTableProps {
  customers: Customer[];
  onView: (customer: Customer) => void;
  onEdit: (customer: Customer) => void;
  onDelete: (customer: Customer) => void;
  onGenerateDocument: (customer: Customer) => void;
  onViewDocument: (url: string) => void;
  onAssignType: (customer: Customer) => void;
}

const CustomerTable: React.FC<CustomerTableProps> = ({
  customers,
  onView,
  onEdit,
  onDelete,
  onGenerateDocument,
  onViewDocument,
  onAssignType
}) => {
  const { can } = usePermissions();

  const columns = [
    { header: 'Name', accessorKey: 'name' },
    {
      header: 'Type',
      accessorKey: 'type',
      cell: ({ row }) => <span className="capitalize">{row.original.type || 'Customer'}</span>,
    },
    {
      header: 'Mobile',
      accessorKey: 'mobile',
      cell: ({ row }) => (
        <a
          href={`tel:${row.original.mobile}`}
          className="text-blue-600 hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {row.original.mobile}
        </a>
      ),
    },
    {
      header: 'License Expiry',
      cell: ({ row }) => {
        if (row.original.type === 'company' || !row.original.licenseExpiry) return <span className="text-gray-400">N/A</span>;
        const date = row.original.licenseExpiry;
        const expiredOrExpiring = isExpiringOrExpired(date);
        return (
          <div className={`${expiredOrExpiring ? 'text-red-500' : 'text-gray-900'}`}>
            {formatDate(date)}
          </div>
        );
      },
    },
    {
      header: 'Bill Expiry',
      cell: ({ row }) => {
        if (row.original.type === 'company' || !row.original.billExpiry) return <span className="text-gray-400">N/A</span>;
        const date = row.original.billExpiry;
        const expiredOrExpiring = isExpiringOrExpired(date);
        return (
          <div className={`${expiredOrExpiring ? 'text-red-500' : 'text-gray-900'}`}>
            {formatDate(date)}
          </div>
        );
      },
    },
    {
      header: 'Signature',
      cell: ({ row }) => {
        if (row.original.type === 'company' || !row.original.signature) {
          return <span className="text-gray-400">N/A</span>;
        }
        return (
          <img
            src={row.original.signature}
            alt="Signature"
            className="h-8 bg-gray-100 rounded border"
            onClick={(e) => e.stopPropagation()}
          />
        );
      },
    },
    {
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex items-center space-x-3">
          {can('customers', 'view') && (
            <button onClick={(e) => { e.stopPropagation(); onView(row.original); }} className="text-gray-600 hover:text-blue-800" title="View Details"><Eye className="h-4 w-4" /></button>
          )}
          {can('customers', 'update') && (
            <>
              <button onClick={(e) => { e.stopPropagation(); onEdit(row.original); }} className="text-gray-600 hover:text-blue-800" title="Edit"><Edit className="h-4 w-4" /></button>
              <button onClick={(e) => { e.stopPropagation(); onAssignType(row.original); }} className="text-gray-600 hover:text-green-800" title="Assign Type"><Tag className="h-4 w-4" /></button>
            </>
          )}
          {can('customers', 'view') && (
            <button onClick={(e) => { e.stopPropagation(); onGenerateDocument(row.original); }} className="text-gray-600 hover:text-purple-800" title="Generate Document"><FileText className="h-4 w-4" /></button>
          )}
          {row.original.documentUrl && (
            <button onClick={(e) => { e.stopPropagation(); onViewDocument(row.original.documentUrl!); }} className="text-gray-600 hover:text-indigo-800" title="View Document"><File className="h-4 w-4" /></button>
          )}
          {can('customers', 'delete') && (
            <button onClick={(e) => { e.stopPropagation(); onDelete(row.original); }} className="text-gray-600 hover:text-red-800" title="Delete"><Trash2 className="h-4 w-4" /></button>
          )}
        </div>
      ),
    },
  ];

  return (
    <DataTable
      data={customers}
      columns={columns}
      onRowClick={(customer) => can('customers', 'view') && onView(customer)}
    />
  );
};

export default CustomerTable;