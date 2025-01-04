import React from 'react';
import { DataTable } from '../DataTable/DataTable';
import { MaintenanceLog, Vehicle } from '../../types';
import { Eye, Edit, Trash2 } from 'lucide-react';
import StatusBadge from '../ui/StatusBadge';
import { usePermissions } from '../../hooks/usePermissions';
import { formatDate } from '../../utils/dateHelpers';
import { ensureValidDate } from '../../utils/dateHelpers';

interface MaintenanceTableProps {
  logs: MaintenanceLog[];
  vehicles: Record<string, Vehicle>;
  onView: (log: MaintenanceLog) => void;
  onEdit: (log: MaintenanceLog) => void;
  onDelete: (log: MaintenanceLog) => void;
}

const MaintenanceTable: React.FC<MaintenanceTableProps> = ({
  logs,
  vehicles,
  onView,
  onEdit,
  onDelete,
}) => {
  const { can } = usePermissions();

  const calculateVAT = (log: MaintenanceLog) => {
    // Calculate parts VAT
    const partsVAT = log.parts.reduce((sum, part) => {
      const hasVAT = log.vatDetails?.partsVAT.find(v => v.partName === part.name)?.includeVAT;
      if (hasVAT) {
        return sum + (part.cost * part.quantity * 0.2);
      }
      return sum;
    }, 0);

    // Calculate labor VAT
    const laborVAT = log.vatDetails?.laborVAT ? log.laborCost * 0.2 : 0;

    return {
      partsVAT,
      laborVAT,
      totalVAT: partsVAT + laborVAT
    };
  };

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
          {row.original.type === 'mot' || row.original.type === 'tfl' ? (
            <span className="ml-1 text-sm text-gray-500">Test</span>
          ) : null}
        </div>
      ),
    },
    {
      header: 'Date',
      cell: ({ row }) => {
        const log = row.original;
        const serviceDate = ensureValidDate(log.date);
        const nextServiceDate = ensureValidDate(log.nextServiceDate);
        
        return (
          <div>
            <div className="text-sm">
              Service: {formatDate(serviceDate)}
            </div>
            <div className="text-sm text-gray-500">
              Next: {formatDate(nextServiceDate)}
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
        const log = row.original;
        const totalCost = log.cost;
        const paidAmount = log.paidAmount || 0;
        const remainingAmount = totalCost - paidAmount;
        
        // Calculate VAT amounts
        const { partsVAT, laborVAT, totalVAT } = calculateVAT(log);
        
        // Calculate NET amount
        const netAmount = totalCost - totalVAT;
    
        return (
          <div>
            <div className="font-medium">£{totalCost.toFixed(2)}</div>
            <div className="text-xs space-y-0.5">
              <div className="text-gray-600">
                NET: £{netAmount.toFixed(2)}
              </div>
              <div className="text-gray-600">
                VAT: £{totalVAT.toFixed(2)}
              </div>
              <div className="text-xs text-gray-500">
                Parts VAT: £{partsVAT.toFixed(2)}
                <br />
                Labor VAT: £{laborVAT.toFixed(2)}
              </div>
            </div>
            <div className="text-xs space-y-0.5 mt-1">
              <div className="text-green-600">
                Paid: £{paidAmount.toFixed(2)}
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
          {can('maintenance', 'view') && (
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
          {can('maintenance', 'update') && (
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
          {can('maintenance', 'delete') && (
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
      data={logs}
      columns={columns}
      onRowClick={(log) => can('maintenance', 'view') && onView(log)}
    />
  );
};

export default MaintenanceTable;