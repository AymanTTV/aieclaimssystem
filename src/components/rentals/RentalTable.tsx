import React from 'react';
import { DataTable } from '../DataTable/DataTable';
import { Rental, Vehicle, Customer } from '../../types';
import { Eye, Edit, Trash2, Clock, FileText, Download, DollarSign } from 'lucide-react';
import StatusBadge from '../ui/StatusBadge';
import { usePermissions } from '../../hooks/usePermissions';
import { formatDate } from '../../utils/dateHelpers';

interface RentalTableProps {
  rentals: Rental[];
  vehicles: Vehicle[];
  customers: Customer[];
  onView: (rental: Rental) => void;
  onEdit: (rental: Rental) => void;
  onDelete: (rental: Rental) => void;
  onExtend: (rental: Rental) => void;
  onDownloadAgreement: (rental: Rental) => void;
  onDownloadInvoice: (rental: Rental) => void;
  onRecordPayment: (rental: Rental) => void;
  onDeletePayment: (rental: Rental, paymentId: string) => void;
}

const RentalTable: React.FC<RentalTableProps> = ({
  rentals,
  vehicles,
  customers,
  onView,
  onEdit,
  onDelete,
  onExtend,
  onDownloadAgreement,
  onDownloadInvoice,
  onRecordPayment,
  onDeletePayment,
}) => {
  const { can } = usePermissions();

  const columns = [
    // ... other columns ...
    {
      header: 'Vehicle',
      cell: ({ row }) => {
        const vehicle = vehicles.find(v => v.id === row.original.vehicleId);
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
        const customer = customers.find(c => c.id === row.original.customerId);
        return customer ? (
          <div>
            <div className="font-medium">{customer.name}</div>
            <div className="text-sm text-gray-500">{customer.mobile}</div>
          </div>
        ) : 'N/A';
      },
    },
    {
      header: 'Type',
      cell: ({ row }) => (
        <div className="space-y-1">
          <StatusBadge status={row.original.type} />
          <StatusBadge status={row.original.reason} />
        </div>
      ),
    },
    {
      header: 'Period',
      cell: ({ row }) => (
        <div>
          <div className="text-sm">
            {formatDate(row.original.startDate)}
          </div>
          <div className="text-sm text-gray-500">
            {formatDate(row.original.endDate)}
          </div>
          {row.original.numberOfWeeks && (
            <div className="text-xs text-gray-500">
              {row.original.numberOfWeeks} week{row.original.numberOfWeeks > 1 ? 's' : ''}
            </div>
          )}
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
      cell: ({ row }) => {
        const rental = row.original;
        return (
          <div>
            <div className="font-medium">£{rental.cost.toFixed(2)}</div>
            {rental.standardCost && rental.standardCost !== rental.cost && (
              <div className="text-xs text-gray-500 line-through">
                £{rental.standardCost.toFixed(2)}
              </div>
            )}
            {rental.negotiated && (
              <div className="text-xs text-amber-600">Negotiated rate</div>
            )}
            <div className="text-xs space-y-0.5 mt-1">
              <div className="text-green-600">
                Paid: £{rental.paidAmount.toFixed(2)}
              </div>
              {rental.remainingAmount > 0 && (
                <div className="text-amber-600">
                  Due: £{rental.remainingAmount.toFixed(2)}
                </div>
              )}
            </div>
          </div>
        );
      },
    },
    {
      header: 'Payment History',
      cell: ({ row }) => {
        const payments = row.original.payments || [];
        return payments.length > 0 ? (
          <div className="space-y-1">
            {payments.map((payment) => (
              <div key={payment.id} className="text-sm flex items-center justify-between">
                <div>
                  <div className="flex items-center">
                    <span>£{payment.amount.toFixed(2)}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeletePayment(row.original, payment.id);
                      }}
                      className="ml-2 text-red-600 hover:text-red-800"
                      title="Delete Payment"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                  <div className="text-xs text-gray-500">
                    <span className="capitalize">{payment.method.replace('_', ' ')}</span>
                    <span className="mx-1">•</span>
                    <span>{formatDate(payment.date, true)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <span className="text-gray-500">No payments</span>
        );
      },
    },
    {
      header: 'Documents',
      cell: ({ row }) => (
        <div className="flex space-x-2">
          {row.original.documents?.agreement && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDownloadAgreement(row.original);
              }}
              className="text-blue-600 hover:text-blue-800"
              title="Download Agreement"
            >
              <FileText className="h-4 w-4" />
            </button>
          )}
          {row.original.documents?.invoice && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDownloadInvoice(row.original);
              }}
              className="text-green-600 hover:text-green-800"
              title="Download Invoice"
            >
              <Download className="h-4 w-4" />
            </button>
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
          {can('rentals', 'update') && (
            <>
              {row.original.status !== 'completed' && (
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
              )}
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
          {can('rentals', 'delete') && row.original.status !== 'active' && (
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
          {row.original.remainingAmount > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRecordPayment(row.original);
              }}
              className="text-primary hover:text-primary-600"
              title="Record Payment"
            >
              <DollarSign className="h-4 w-4" />
            </button>
          )}
        </div>
      ),
    },
    // ... rest of the columns ...
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