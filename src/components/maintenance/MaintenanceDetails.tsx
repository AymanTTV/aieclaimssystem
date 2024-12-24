import React from 'react';
import { MaintenanceLog, Vehicle } from '../../types';
import { formatDate } from '../../utils/dateHelpers';
import StatusBadge from '../ui/StatusBadge';
import { Wrench, DollarSign, MapPin, Calendar } from 'lucide-react';

interface MaintenanceDetailsProps {
  log: MaintenanceLog;
  vehicle: Vehicle;
}

const MaintenanceDetails: React.FC<MaintenanceDetailsProps> = ({ log, vehicle }) => {
  const VAT_RATE = 0.20;

  const calculateVATAmount = () => {
    let vatAmount = 0;

    // Calculate VAT on parts
    if (log.vatDetails?.partsVAT) {
      vatAmount += log.parts
        .filter((_, index) => log.vatDetails.partsVAT[index].includeVAT)
        .reduce((sum, part) => sum + (part.cost * part.quantity * VAT_RATE), 0);
    }

    // Calculate VAT on labor
    if (log.vatDetails?.laborVAT) {
      vatAmount += log.laborCost * VAT_RATE;
    }

    return vatAmount;
  };

  return (
    <div className="space-y-6">
      {/* Basic Information */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <h3 className="text-sm font-medium text-gray-500">Vehicle</h3>
          <div className="mt-1 flex items-center space-x-2">
            {vehicle.image && (
              <img 
                src={vehicle.image} 
                alt={`${vehicle.make} ${vehicle.model}`}
                className="h-10 w-10 object-cover rounded-md"
              />
            )}
            <div>
              <p className="font-medium">{vehicle.make} {vehicle.model}</p>
              <p className="text-sm text-gray-500">{vehicle.registrationNumber}</p>
            </div>
          </div>
        </div>
        <div>
          <h3 className="text-sm font-medium text-gray-500">Status</h3>
          <div className="mt-1">
            <StatusBadge status={log.status} />
          </div>
        </div>
      </div>

      {/* Service Details */}
      <div className="bg-gray-50 p-4 rounded-lg space-y-4">
        <div className="flex items-center">
          <Wrench className="h-5 w-5 text-gray-400 mr-2" />
          <h3 className="text-lg font-medium text-gray-900">Service Details</h3>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <h4 className="text-sm font-medium text-gray-500">Type</h4>
            <p className="mt-1 capitalize">{log.type.replace('-', ' ')}</p>
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-500">Date</h4>
            <p className="mt-1">{formatDate(log.date)}</p>
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-500">Service Provider</h4>
            <p className="mt-1">{log.serviceProvider}</p>
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-500">Location</h4>
            <p className="mt-1">{log.location}</p>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-medium text-gray-500">Description</h4>
          <p className="mt-1">{log.description}</p>
        </div>

        {log.notes && (
          <div>
            <h4 className="text-sm font-medium text-gray-500">Notes</h4>
            <p className="mt-1">{log.notes}</p>
          </div>
        )}
      </div>

      {/* Mileage Information */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <h4 className="text-sm font-medium text-gray-500">Current Mileage</h4>
          <p className="mt-1">{log.currentMileage.toLocaleString()}</p>
        </div>
        <div>
          <h4 className="text-sm font-medium text-gray-500">Next Service Mileage</h4>
          <p className="mt-1">{log.nextServiceMileage.toLocaleString()}</p>
        </div>
      </div>

      {/* Parts and Labor */}
      {log.parts && log.parts.length > 0 && (
        <div className="border-t pt-4">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Parts and Labor</h3>
          
          {/* Parts List */}
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Parts</h4>
            <div className="space-y-2">
              {log.parts.map((part, index) => (
                <div key={index} className="flex justify-between items-center bg-gray-50 p-2 rounded">
                  <div>
                    <span className="font-medium">{part.name}</span>
                    <span className="text-gray-500 ml-2">x{part.quantity}</span>
                  </div>
                  <div className="text-right">
                    <div>£{(part.cost * part.quantity).toFixed(2)}</div>
                    {log.vatDetails?.partsVAT[index].includeVAT && (
                      <div className="text-sm text-gray-500">+VAT</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Labor Cost */}
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Labor</h4>
            <div className="bg-gray-50 p-2 rounded flex justify-between items-center">
              <span>Labor Cost</span>
              <div className="text-right">
                <div>£{log.laborCost.toFixed(2)}</div>
                {log.vatDetails?.laborVAT && (
                  <div className="text-sm text-gray-500">+VAT</div>
                )}
              </div>
            </div>
          </div>

          {/* Cost Summary */}
          <div className="border-t pt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">VAT Amount:</span>
              <span>£{calculateVATAmount().toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-lg font-medium">
              <span>Total Cost:</span>
              <span>£{log.cost.toFixed(2)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MaintenanceDetails;