import React, { useMemo } from 'react';
import { DataTable } from '../DataTable/DataTable';
import { Customer } from '../../types/customer';
import { Eye, Edit, Trash2 } from 'lucide-react';
import { formatDate } from '../../utils/dateHelpers';
import { isExpired } from '../../types/customer';
import { usePermissions } from '../../hooks/usePermissions';
import { isExpiringOrExpired } from '../../types/customer';
import { addYears, addDays } from 'date-fns';

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
  const { can } = usePermissions(); // Move hook inside component
  const sortedCustomers = useMemo(() => {
    const now = new Date();
    const thirtyDays = addDays(now, 30);

    const countExpiringDocs = (customer: Customer) => {
      let count = 0;

      if (customer.licenseExpiry && isExpiringOrExpired(customer.licenseExpiry)) count += 1; // Expired or expiring
      if (customer.billExpiry && isExpiringOrExpired(customer.billExpiry)) count += 1; // Expired or expiring

      return count;
    };


    return [...customers].sort((a, b) => {
      const aCount = countExpiringDocs(a);
      const bCount = countExpiringDocs(b);

      if (aCount !== bCount) {
        return bCount - aCount; // Descending order of expiring docs
      }

      // Tiebreaker: Earliest expiry date (ascending) - Handle nulls
      const getEarliestExpiry = (customer: Customer) => {
        const dates = [customer.licenseExpiry, customer.billExpiry].filter(date => date instanceof Date);
        if (dates.length === 0) return new Date('9999-99-99'); // All past/invalid dates last
        return Math.min(...dates.map(date => date.getTime()));
      };

      const aEarliestExpiry = getEarliestExpiry(a);
      const bEarliestExpiry = getEarliestExpiry(b);

      return aEarliestExpiry - bEarliestExpiry;
    });
  }, [customers]);
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
    // {
    //   header: 'Email',
    //   accessorKey: 'email',
    // },
    {
      header: 'Age',
      accessorKey: 'age',
    },
    // {
    //   header: 'License Valid From',
    //   cell: ({ row }) => formatDate(row.original.licenseValidFrom),
    // },
    {
      // ... other columns
      header: 'License Expiry',
      cell: ({ row }) => {
        const date = row.original.licenseExpiry;
        const expiredOrExpiring = isExpiringOrExpired(date); // Use the new function

        return (
          <div className={`${expiredOrExpiring ? 'text-red-500' : 'text-gray-900'}`}>
            {formatDate(date)}
          </div>
        );
      },
    },
    // {
    //   header: 'Badge Number',
    //   accessorKey: 'badgeNumber',
    // },
    {
      // ... other columns
      header: 'Bill Expiry',
      cell: ({ row }) => {
        const date = row.original.billExpiry;
        const expiredOrExpiring = isExpiringOrExpired(date); // Use the new function

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
        </div>
      ),
    },
  ];

  return (
    <DataTable
      data={sortedCustomers} // Use the sorted customers
      columns={columns}
      onRowClick={(customer) => onView(customer)}
    />
  );
};

export default CustomerTable;