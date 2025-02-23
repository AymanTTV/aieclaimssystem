import React from 'react';
import { DataTable } from '../DataTable/DataTable';
import { Customer } from '../../types/customer';
import { Eye, Edit, Trash2, FileText } from 'lucide-react';
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
}

const CustomerTable: React.FC<CustomerTableProps> = ({
  customers,
  onView,
  onEdit,
  onDelete,
  onGenerateDocument,
  onViewDocument
}) => {
  const { can } = usePermissions();

  const columns = [
    {
      header: 'Name',
      accessorKey: 'name',
    },
    {
      header: 'Gender',
      accessorKey: 'gender',
      cell: ({ row }) => (
        <span className="capitalize">{row.original.gender}</span>
      ),
    },
    {
      header: 'Mobile',
      accessorKey: 'mobile',
    },
    {
      header: 'Age',
      accessorKey: 'age',
    },
    {
      header: 'License Expiry',
      cell: ({ row }) => {
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
      cell: ({ row }) => (
        row.original.signature ? (
          <img 
            src={row.original.signature} 
            alt="Signature" 
            className="h-8 object-contain"
          />
        ) : (
          <span className="text-gray-400">Not signed</span>
        )
      ),
    },
    {
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex space-x-2">
          {can('customers', 'view') && (
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
          {can('customers', 'update') && (
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
                  onGenerateDocument(row.original);
                }}
                className="text-green-600 hover:text-green-800"
                title="Generate Document"
              >
                <FileText className="h-4 w-4" />
              </button>
            </>
          )}
          {can('customers', 'delete') && (
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
      data={customers}
      columns={columns}
      onRowClick={(customer) => can('customers', 'view') && onView(customer)}
    />
  );
};

export default CustomerTable;