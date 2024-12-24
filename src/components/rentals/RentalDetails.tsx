import React from 'react';
import { Rental, Vehicle, Customer } from '../../types';
import { format } from 'date-fns';
import StatusBadge from '../ui/StatusBadge';
import { Calendar, DollarSign, User, Clock, FileText } from 'lucide-react';

interface RentalDetailsProps {
  rental: Rental;
  vehicle: Vehicle;
  customer: Customer;
}

const RentalDetails: React.FC<RentalDetailsProps> = ({ rental, vehicle, customer }) => {
  return (
    <div className="space-y-6">
      {/* Vehicle Information */}
      <div className="flex items-start space-x-4">
        {vehicle.image && (
          <img
            src={vehicle.image}
            alt={`${vehicle.make} ${vehicle.model}`}
            className="h-24 w-24 object-cover rounded-lg"
          />
        )}
        <div>
          <h3 className="text-lg font-medium text-gray-900">
            {vehicle.make} {vehicle.model}
          </h3>
          <p className="text-sm text-gray-500">{vehicle.registrationNumber}</p>
        </div>
      </div>

      {/* Status and Type */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <h4 className="text-sm font-medium text-gray-500">Status</h4>
          <div className="mt-1 space-y-1">
            <StatusBadge status={rental.status} />
            <StatusBadge status={rental.paymentStatus} />
          </div>
        </div>
        <div>
          <h4 className="text-sm font-medium text-gray-500">Type</h4>
          <div className="mt-1 space-y-1">
            <StatusBadge status={rental.reason} />
            <div className="text-sm">
              {rental.type === 'weekly' ? `${rental.numberOfWeeks} weeks` : 'Daily'}
            </div>
          </div>
        </div>
      </div>

      {/* Customer Information */}
      <div className="border-t pt-4">
        <h4 className="text-sm font-medium text-gray-500 mb-2">Customer Details</h4>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center">
            <User className="h-5 w-5 text-gray-400 mr-2" />
            <div>
              <p className="font-medium">{customer.name}</p>
              <p className="text-sm text-gray-500">{customer.mobile}</p>
            </div>
          </div>
          <div>
            <p className="text-sm text-gray-500">License Number</p>
            <p>{customer.driverLicenseNumber}</p>
          </div>
        </div>
      </div>

      {/* Rental Period */}
      <div className="border-t pt-4">
        <h4 className="text-sm font-medium text-gray-500 mb-2">Rental Period</h4>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center">
            <Calendar className="h-5 w-5 text-gray-400 mr-2" />
            <div>
              <p className="text-sm text-gray-500">Start Date</p>
              <p>{format(rental.startDate, 'dd/MM/yyyy')}</p>
            </div>
          </div>
          <div className="flex items-center">
            <Calendar className="h-5 w-5 text-gray-400 mr-2" />
            <div>
              <p className="text-sm text-gray-500">End Date</p>
              <p>{format(rental.endDate, 'dd/MM/yyyy')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Cost Information */}
      <div className="border-t pt-4">
        <h4 className="text-sm font-medium text-gray-500 mb-2">Cost Details</h4>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center">
            <DollarSign className="h-5 w-5 text-gray-400 mr-2" />
            <div>
              <p className="text-sm text-gray-500">Total Cost</p>
              <p className="font-medium">£{rental.cost.toFixed(2)}</p>
            </div>
          </div>
          {rental.standardCost && rental.standardCost !== rental.cost && (
            <div>
              <p className="text-sm text-gray-500">Standard Rate</p>
              <p className="line-through">£{rental.standardCost.toFixed(2)}</p>
            </div>
          )}
        </div>
        {rental.negotiated && (
          <div className="mt-2 p-2 bg-yellow-50 rounded-md">
            <p className="text-sm text-yellow-800">
              <strong>Negotiated Rate</strong> - Approved by {rental.approvedBy}
            </p>
            {rental.negotiationNotes && (
              <p className="text-sm text-yellow-600 mt-1">{rental.negotiationNotes}</p>
            )}
          </div>
        )}
      </div>

      {/* Extension History */}
      {rental.extensionHistory && rental.extensionHistory.length > 0 && (
        <div className="border-t pt-4">
          <h4 className="text-sm font-medium text-gray-500 mb-2">Extension History</h4>
          <div className="space-y-2">
            {rental.extensionHistory.map((extension, index) => (
              <div key={index} className="bg-gray-50 p-3 rounded-md">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 text-gray-400 mr-2" />
                      <p className="text-sm font-medium">
                        Extended on {format(extension.date, 'dd/MM/yyyy')}
                      </p>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      {format(extension.originalEndDate, 'dd/MM/yyyy')} → {format(extension.newEndDate, 'dd/MM/yyyy')}
                    </p>
                  </div>
                  <p className="text-sm font-medium">£{extension.cost.toFixed(2)}</p>
                </div>
                {extension.negotiated && extension.negotiationNotes && (
                  <p className="text-sm text-gray-500 mt-2">{extension.negotiationNotes}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Creation Information */}
      <div className="border-t pt-4 text-sm text-gray-500">
        <div className="flex justify-between">
          <div>Created: {format(rental.createdAt, 'dd/MM/yyyy HH:mm')}</div>
          <div>Last Updated: {format(rental.updatedAt, 'dd/MM/yyyy HH:mm')}</div>
        </div>
      </div>
    </div>
  );
};

export default RentalDetails;