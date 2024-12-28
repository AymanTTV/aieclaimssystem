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
          <div className="mt-1 space-y-1">
            <StatusBadge status={log.status} />
            <StatusBadge status={log.paymentStatus} />
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
        <div>
          <h4 className="text-sm font-medium text-gray-500">Next Service Date</h4>
          <p className="mt-1">{formatDate(log.nextServiceDate)}</p>
        </div>
      </div>

      {/* Cost Breakdown */}
      <div className="border-t pt-4">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Cost Breakdown</h3>
        
        {/* Parts List */}
        {log.parts && log.parts.length > 0 && (
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
        )}

        {/* Labor Cost */}
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Labor</h4>
          <div className="bg-gray-50 p-2 rounded flex justify-between items-center">
            <div>
              <span>Labor Cost</span>
              <span className="text-sm text-gray-500 ml-2">
                ({log.laborHours} hours @ £{log.laborRate}/hour)
              </span>
            </div>
            <div className="text-right">
              <div>£{log.laborCost.toFixed(2)}</div>
              {log.vatDetails?.laborVAT && (
                <div className="text-sm text-gray-500">+VAT</div>
              )}
            </div>
          </div>
        </div>

        {/* Payment Information */}
        <div className="border-t pt-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span>Total Amount:</span>
            <span className="font-medium">£{log.cost.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Amount Paid:</span>
            <span className="text-green-600">£{(log.paidAmount || 0).toFixed(2)}</span>
          </div>
          {log.remainingAmount > 0 && (
            <div className="flex justify-between text-sm">
              <span>Remaining Amount:</span>
              <span className="text-amber-600">£{log.remainingAmount.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm pt-2 border-t">
            <span>Payment Status:</span>
            <StatusBadge status={log.paymentStatus} />
          </div>
          {log.paymentMethod && (
            <div className="flex justify-between text-sm">
              <span>Payment Method:</span>
              <span className="capitalize">{log.paymentMethod.replace('_', ' ')}</span>
            </div>
          )}
          {log.paymentReference && (
            <div className="flex justify-between text-sm">
              <span>Reference:</span>
              <span>{log.paymentReference}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MaintenanceDetails;