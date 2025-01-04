import React from 'react';
import { DataTable } from '../DataTable/DataTable';
import { Customer } from '../../types/customer';
import { Eye, Edit, Trash2 } from 'lucide-react';
import { formatDate } from '../../utils/dateHelpers';
import { isExpired } from '../../types/customer';

interface CustomerTableProps {
  customers: Customer[];
  onView: (customer: Customer) => void;
  onEdit: (customer: Customer) => void;
  onDelete: (customer: Customer) => void;
}

const CustomerTable: React.FC<CustomerTableProps> = ({
  customers,
  onView,
  onEdit,
  onDelete,
}) => {
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
      header: 'Email',
      accessorKey: 'email',
    },
    {
      header: 'Age',
      accessorKey: 'age',
    },
    {
      header: 'License Valid From',
      cell: ({ row }) => formatDate(row.original.licenseValidFrom),
    },
    {
      header: 'License Expiry',
      cell: ({ row }) => {
        const date = row.original.licenseExpiry;
        const expired = isExpired(date);
        
        return (
          <div className={`${expired ? 'text-red-500' : 'text-gray-900'}`}>
            {formatDate(date)}
          </div>
        );
      },
    },
    {
      header: 'Badge Number',
      accessorKey: 'badgeNumber',
    },
    {
      header: 'Bill Expiry',
      cell: ({ row }) => {
        const date = row.original.billExpiry;
        const expired = isExpired(date);
        
        return (
          <div className={`${expired ? 'text-red-500' : 'text-gray-900'}`}>
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
              onDelete(row.original);
            }}
            className="text-red-600 hover:text-red-800"
            title="Delete"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <DataTable
      data={customers}
      columns={columns}
      onRowClick={(customer) => onView(customer)}
    />
  );
};

export default CustomerTable;