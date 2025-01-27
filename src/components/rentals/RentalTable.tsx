import React from 'react';
import { DataTable } from '../DataTable/DataTable';
import { Rental, Vehicle, Customer } from '../../types';
import { Eye, Edit, Trash2, FileText, Download, DollarSign, CheckCircle } from 'lucide-react';
import StatusBadge from '../ui/StatusBadge';
import { usePermissions } from '../../hooks/usePermissions';
import { formatDate } from '../../utils/dateHelpers';
import { format, isWithinInterval, addDays, differenceInDays, isBefore, isAfter } from 'date-fns';
import { calculateOverdueCost } from '../../utils/rentalCalculations';



interface RentalTableProps {
  rentals: Rental[];
  vehicles: Vehicle[];
  customers: Customer[];
  onView: (rental: Rental) => void;
  onEdit: (rental: Rental) => void;
  onDelete: (rental: Rental) => void;
  onComplete: (rental: Rental) => void;
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
  onComplete,
  onDownloadAgreement,
  onDownloadInvoice,
  onRecordPayment,
  onDeletePayment,
}) => {
 

  // Sort rentals by end date (closest first)
  const sortedRentals = [...rentals].sort((a, b) => {
    const getPriority = (rental: Rental): number => {
      const isEndingSoon = isWithinInterval(rental.endDate, {
        start: new Date(),
        end: addDays(new Date(), 1)
      });

      if (isEndingSoon && rental.status === 'active') return 1;
      if (rental.status === 'active') return 2;
      if (rental.status === 'scheduled') return 3;
      return 4;
    };

    const priorityA = getPriority(a);
    const priorityB = getPriority(b);

    if (priorityA === priorityB) {
      return isBefore(a.endDate, b.endDate) ? -1 : 1;
    }

    return priorityA - priorityB;
  });

  // Check if rental ends the day before another rental starts
  const isConsecutiveRental = (rental: Rental): boolean => {
    const nextDay = addDays(rental.endDate, 1);
    return rentals.some(r => 
      r.id !== rental.id && 
      r.vehicleId === rental.vehicleId &&
      r.status !== 'cancelled' &&
      r.startDate.getTime() === nextDay.getTime()
    );
  };

  const { can } = usePermissions(); // Move hook inside component

  const columns = [
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
      cell: ({ row }) => {
        const rental = row.original;
        const startDate = new Date(rental.startDate);
        const endDate = new Date(rental.endDate);
        const now = new Date();
        
        // Calculate total days including partial days
        const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        
        // Calculate overdue days if rental is active and past end date
        const overdueDays = rental.status === 'active' && isAfter(now, endDate) 
          ? Math.ceil((now.getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24))
          : 0;
    
        return (
          <div>
            <div className="text-sm">
              {formatDate(startDate, true)} {/* Include time */}
            </div>
            <div className="text-sm text-gray-500">
              {formatDate(endDate, true)} {/* Include time */}
            </div>
            <div className="text-xs text-gray-500">
              {totalDays} days
              {overdueDays > 0 && (
                <span className="text-red-600 ml-1">
                  (Overdue by {overdueDays} days)
                </span>
              )}
            </div>
          </div>
        );
      },
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
        const vehicle = vehicles.find(v => v.id === rental.vehicleId);
        const now = new Date();
        const endDate = new Date(rental.endDate);
        
        let overdueCharges = 0;
        if (rental.status === 'active' && isAfter(now, endDate) && vehicle) {
          overdueCharges = calculateOverdueCost(rental, now, vehicle);
        }

        const totalCost = rental.cost + overdueCharges;
        const remainingAmount = totalCost - rental.paidAmount;

        return (
          <div>
            <div className="font-medium">£{rental.cost.toFixed(2)}</div>
            
            {overdueCharges > 0 && (
              <div className="text-xs text-red-600">
                +£{overdueCharges.toFixed(2)} Ongoing Charges
              </div>
            )}

            {overdueCharges > 0 && (
              <div className="text-sm font-medium border-t mt-1 pt-1">
                Total: £{totalCost.toFixed(2)}
              </div>
            )}

            <div className="text-xs space-y-0.5 mt-1">
              <div className="text-green-600">
                Paid: £{rental.paidAmount.toFixed(2)}
              </div>
              {remainingAmount > 0 && (
                <div className="text-amber-600">
                  Due: £{remainingAmount.toFixed(2)}
                </div>
              )}
            </div>
          </div>
        );
      },
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
              {row.original.status === 'active' && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onComplete(row.original);
                  }}
                  className="text-green-600 hover:text-green-800"
                  title="Complete Rental"
                >
                  <CheckCircle className="h-4 w-4" />
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
  ];

  return (
    <DataTable
      data={sortedRentals}
      columns={columns}
      onRowClick={(rental) => can('rentals', 'view') && onView(rental)}
      rowClassName={(rental) => {
        const isEndingSoon = isWithinInterval(rental.endDate, {
          start: new Date(),
          end: addDays(new Date(), 1)
        });
        const isConsecutive = isConsecutiveRental(rental);
        
        if (isEndingSoon && rental.status === 'active') return 'bg-red-50';
        if (isConsecutive) return 'bg-yellow-50';
        return '';
      }}
    />
  );
};

export default RentalTable;