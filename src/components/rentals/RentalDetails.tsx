import React from 'react';
import { Rental, Vehicle, Customer } from '../../types';
import { format, isValid } from 'date-fns';
import StatusBadge from '../ui/StatusBadge';
import { Car, User, Mail, Phone, MapPin, Calendar, DollarSign, Clock } from 'lucide-react';

interface RentalDetailsProps {
  rental: Rental;
  vehicle: Vehicle | null;
  customer: Customer | null;
}

const RentalDetails: React.FC<RentalDetailsProps> = ({ rental, vehicle, customer }) => {
  const formatDate = (date: Date | null | undefined): string => {
    if (!date || !isValid(date)) {
      return 'Not available';
    }
    try {
      return format(date, 'dd/MM/yyyy HH:mm');
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid date';
    }
  };

  return (
    <div className="space-y-6">
      {/* Vehicle Information */}
      <div className="border-b pb-4">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Vehicle Details</h3>
        <div className="grid grid-cols-2 gap-4">
          {vehicle ? (
            <>
              <div className="flex items-center">
                <Car className="h-5 w-5 text-gray-400 mr-2" />
                <div>
                  <p className="font-medium">{vehicle.make} {vehicle.model}</p>
                  <p className="text-sm text-gray-500">{vehicle.registrationNumber}</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-500">Current Mileage</p>
                <p className="font-medium">{vehicle.mileage.toLocaleString()} km</p>
              </div>
            </>
          ) : (
            <div className="col-span-2 text-gray-500">Vehicle information not available</div>
          )}
        </div>
      </div>

      {/* Customer Information */}
      <div className="border-b pb-4">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Customer Details</h3>
        <div className="grid grid-cols-2 gap-4">
          {customer ? (
            <>
              <div className="flex items-center">
                <User className="h-5 w-5 text-gray-400 mr-2" />
                <div>
                  <p className="font-medium">{customer.name}</p>
                  <p className="text-sm text-gray-500">License: {customer.driverLicenseNumber}</p>
                </div>
              </div>
              <div className="flex items-center">
                <Phone className="h-5 w-5 text-gray-400 mr-2" />
                <div>
                  <p className="font-medium">{customer.mobile}</p>
                  <p className="text-sm text-gray-500">Contact</p>
                </div>
              </div>
              <div className="flex items-center">
                <Mail className="h-5 w-5 text-gray-400 mr-2" />
                <p className="text-sm">{customer.email}</p>
              </div>
              <div className="flex items-center">
                <MapPin className="h-5 w-5 text-gray-400 mr-2" />
                <p className="text-sm">{customer.address}</p>
              </div>
            </>
          ) : (
            <div className="col-span-2 text-gray-500">Customer information not available</div>
          )}
        </div>
      </div>

      {/* Rental Details */}
      <div className="border-b pb-4">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Rental Details</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500">Type</p>
            <div className="mt-1 space-y-1">
              <StatusBadge status={rental.type} />
              <StatusBadge status={rental.reason} />
            </div>
          </div>
          <div>
            <p className="text-sm text-gray-500">Status</p>
            <div className="mt-1 space-y-1">
              <StatusBadge status={rental.status} />
              <StatusBadge status={rental.paymentStatus} />
            </div>
          </div>
          <div className="flex items-center">
            <Calendar className="h-5 w-5 text-gray-400 mr-2" />
            <div>
              <p className="text-sm text-gray-500">Start Date & Time</p>
              <p className="font-medium">{formatDate(rental.startDate)}</p>
            </div>
          </div>
          <div className="flex items-center">
            <Calendar className="h-5 w-5 text-gray-400 mr-2" />
            <div>
              <p className="text-sm text-gray-500">End Date & Time</p>
              <p className="font-medium">{formatDate(rental.endDate)}</p>
            </div>
          </div>
          {rental.numberOfWeeks && (
            <div className="flex items-center">
              <Clock className="h-5 w-5 text-gray-400 mr-2" />
              <div>
                <p className="text-sm text-gray-500">Duration</p>
                <p className="font-medium">{rental.numberOfWeeks} week{rental.numberOfWeeks > 1 ? 's' : ''}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Payment Details */}
      <div className="border-b pb-4">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Payment Details</h3>
        <div className="bg-gray-50 p-4 rounded-lg space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Total Cost</span>
            <div className="text-right">
              <span className="text-lg font-medium">£{rental.cost.toFixed(2)}</span>
              {rental.standardCost && rental.standardCost !== rental.cost && (
                <div className="text-sm text-gray-500 line-through">£{rental.standardCost.toFixed(2)}</div>
              )}
            </div>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-gray-600">Amount Paid</span>
            <span className="text-green-600">£{(rental.paidAmount || 0).toFixed(2)}</span>
          </div>

          {rental.remainingAmount > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Remaining Amount</span>
              <span className="text-amber-600">£{rental.remainingAmount.toFixed(2)}</span>
            </div>
          )}

          <div className="pt-3 border-t">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Payment Status</span>
              <StatusBadge status={rental.paymentStatus} />
            </div>
            {rental.paymentMethod && (
              <div className="flex justify-between items-center mt-2">
                <span className="text-gray-600">Payment Method</span>
                <span className="capitalize">{rental.paymentMethod.replace('_', ' ')}</span>
              </div>
            )}
            {rental.paymentReference && (
              <div className="flex justify-between items-center mt-2">
                <span className="text-gray-600">Reference</span>
                <span>{rental.paymentReference}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Negotiation Details */}
      {rental.negotiated && (
        <div className="border-b pb-4">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Negotiation Details</h3>
          <div className="bg-yellow-50 p-4 rounded-lg">
            <p className="text-sm text-yellow-800">
              <strong>Negotiated Rate</strong> - Approved by {rental.approvedBy || 'Unknown'}
            </p>
            {rental.negotiationNotes && (
              <p className="text-sm text-yellow-600 mt-2">{rental.negotiationNotes}</p>
            )}
          </div>
        </div>
      )}

      {/* Extension History */}
      {rental.extensionHistory && rental.extensionHistory.length > 0 && (
        <div className="border-b pb-4">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Extension History</h3>
          <div className="space-y-3">
            {rental.extensionHistory.map((extension, index) => (
              <div key={index} className="bg-gray-50 p-4 rounded-lg">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">
                      Extended on {formatDate(extension.date)}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      {formatDate(extension.originalEndDate)} → {formatDate(extension.newEndDate)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">£{extension.cost.toFixed(2)}</p>
                    {extension.approvedBy && (
                      <p className="text-xs text-gray-500">Approved by {extension.approvedBy}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Audit Information */}
      <div className="text-sm text-gray-500">
        <div className="flex justify-between">
          <div>Created: {formatDate(rental.createdAt)}</div>
          <div>Last Updated: {formatDate(rental.updatedAt)}</div>
        </div>
      </div>
    </div>
  );
};

export default RentalDetails;