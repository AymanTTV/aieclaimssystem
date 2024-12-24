import React from 'react';
import { DataTable } from '../DataTable/DataTable';
import { Rental, Vehicle, Customer } from '../../types';
import { Eye, Edit, Trash2, Clock } from 'lucide-react';
import StatusBadge from '../ui/StatusBadge';
import { usePermissions } from '../../hooks/usePermissions';
import { format } from 'date-fns';

interface RentalTableProps {
  rentals: Rental[];
  vehicles: Record<string, Vehicle>;
  customers: Record<string, Customer>;
  onView: (rental: Rental) => void;
  onEdit: (rental: Rental) => void;
  onDelete: (rental: Rental) => void;
  onExtend: (rental: Rental) => void;
}

const RentalTable: React.FC<RentalTableProps> = ({
  rentals,
  vehicles,
  customers,
  onView,
  onEdit,
  onDelete,
  onExtend,
}) => {
  const { can } = usePermissions();

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
      header: 'Customer',
      cell: ({ row }) => {
        const customer = customers[row.original.customerId];
        return customer ? (
          <div>
            <div className="font-medium">{customer.name}</div>
            <div className="text-sm text-gray-500">{customer.mobile}</div>
          </div>
        ) : 'N/A';
      },
    },
    {
      header: 'Period',
      cell: ({ row }) => (
        <div>
          <div>{format(row.original.startDate, 'dd/MM/yyyy')}</div>
          <div className="text-sm text-gray-500">{format(row.original.endDate, 'dd/MM/yyyy')}</div>
        </div>
      ),
    },
    {
      header: 'Type',
      cell: ({ row }) => (
        <div className="space-y-1">
          <StatusBadge status={row.original.reason} />
          <div className="text-sm text-gray-500">
            {row.original.type === 'weekly' ? `${row.original.numberOfWeeks} weeks` : 'Daily'}
          </div>
        </div>
      ),
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
      header: 'Cost',
      cell: ({ row }) => (
        <div>
          <div className="font-medium">£{row.original.cost.toFixed(2)}</div>
          {row.original.negotiated && (
            <div className="text-xs text-gray-500">Negotiated rate</div>
          )}
        </div>
      ),
    },
    {
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex space-x-2">
          {can('rentals', 'view') && (
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
          {can('rentals', 'update') && row.original.status !== 'completed' && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onExtend(row.original);
                }}
                className="text-green-600 hover:text-green-800"
                title="Extend Rental"
              >
                <Clock className="h-4 w-4" />
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
            </>
          )}
          {can('rentals', 'delete') && (
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
      data={rentals}
      columns={columns}
      onRowClick={(rental) => can('rentals', 'view') && onView(rental)}
    />
  );
};

export default RentalTable;
