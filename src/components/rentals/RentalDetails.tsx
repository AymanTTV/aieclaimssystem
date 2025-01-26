import React, { useEffect, useState } from 'react';
import { Rental, Vehicle, Customer } from '../../types';
import { formatDate } from '../../utils/dateHelpers';
import StatusBadge from '../ui/StatusBadge';
import RentalPaymentHistory from './RentalPaymentHistory';
import { FileText, Download, Car, User, Mail, Phone, MapPin, Calendar, DollarSign, Clock, PenTool } from 'lucide-react';
import { calculateOverdueCost } from '../../utils/rentalCalculations';
import { isAfter, differenceInDays } from 'date-fns';

interface RentalDetailsProps {
  rental: Rental;
  vehicle: Vehicle | null;
  customer: Customer | null;
  onDownloadAgreement: () => void;
  onDownloadInvoice: () => void;
}

const RentalDetails: React.FC<RentalDetailsProps> = ({
  rental,
  vehicle,
  customer,
  onDownloadAgreement,
  onDownloadInvoice
}) => {
  const [ongoingCharges, setOngoingCharges] = useState(0);

  // Calculate ongoing charges if rental is active and past end date
  useEffect(() => {
    if (vehicle && rental.status === 'active') {
      const endDate = new Date(rental.endDate);
      const now = new Date();
      if (isAfter(now, endDate)) {
        const extraCharges = calculateOverdueCost(rental, now, vehicle);
        setOngoingCharges(extraCharges);
      }
    }
  }, [rental, vehicle]);

  return (
    <div className="space-y-6">
      {/* Documents Section */}
      <div className="flex justify-end space-x-4">
        {rental.documents?.agreement && (
          <button
            onClick={onDownloadAgreement}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <FileText className="h-4 w-4 mr-2" />
            Hire Agreement
          </button>
        )}
        {rental.documents?.invoice && (
          <button
            onClick={onDownloadInvoice}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <Download className="h-4 w-4 mr-2" />
            Invoice
          </button>
        )}
      </div>

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
        <p className="font-medium">{formatDate(rental.startDate, true)}</p>
      </div>
    </div>
    <div className="flex items-center">
      <Calendar className="h-5 w-5 text-gray-400 mr-2" />
      <div>
        <p className="text-sm text-gray-500">End Date & Time</p>
        <p className="font-medium">
          {rental.endDate ? formatDate(rental.endDate, true) : 'Ongoing'}
        </p>
      </div>
    </div>
    <div className="col-span-2">
      <p className="text-sm text-gray-500">Duration</p>
      <p className="font-medium">
        {(() => {
          const now = new Date();
          const startDate = new Date(rental.startDate);
          const endDate = rental.endDate ? new Date(rental.endDate) : now;
          const isOngoing = rental.status === 'active' && isAfter(now, endDate);

          const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
          const overdueDays = isOngoing
            ? Math.ceil((now.getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24))
            : 0;

          return (
            <>
              {totalDays} days
              {overdueDays > 0 && (
                <span className="text-red-600 ml-2">
                  (Overdue by {overdueDays} days)
                </span>
              )}
            </>
          );
        })()}
      </p>
    </div>
  </div>
</div>

      {/* Payment Details */}
      <div className="border-b pb-4">
  <h3 className="text-lg font-medium text-gray-900 mb-4">Payment Details</h3>
  <div className="bg-gray-50 p-4 rounded-lg space-y-3">
    <div className="flex justify-between items-center">
      <span className="text-gray-600">Base Cost</span>
      <span className="text-lg font-medium">£{rental.cost.toFixed(2)}</span>
    </div>

    {rental.status === 'active' && isAfter(new Date(), rental.endDate) && (
      <div className="flex justify-between items-center text-red-600">
        <span>Ongoing Charges</span>
        <span>+£{calculateOverdueCost(rental, new Date(), vehicle).toFixed(2)}</span>
      </div>
    )}

    <div className="flex justify-between items-center pt-2 border-t">
      <span className="text-gray-600">Total Cost</span>
      <span className="text-lg font-medium">
        £{(rental.cost + (rental.status === 'active' ? calculateOverdueCost(rental, new Date(), vehicle) : 0)).toFixed(2)}
      </span>
    </div>

    <div className="flex justify-between items-center">
      <span className="text-gray-600">Amount Paid</span>
      <span className="text-green-600">£{rental.paidAmount.toFixed(2)}</span>
    </div>

    <div className="flex justify-between items-center">
      <span className="text-gray-600">Remaining Amount</span>
      <span className="text-amber-600">
        £{(rental.cost + (rental.status === 'active' ? calculateOverdueCost(rental, new Date(), vehicle) : 0) - rental.paidAmount).toFixed(2)}
      </span>
    </div>
          

          <div className="pt-3 border-t">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Payment Status</span>
        <StatusBadge status={rental.paymentStatus} />
            </div>
          </div>
        </div>

        {/* Payment History */}
        {rental.payments && rental.payments.length > 0 && (
          <div className="mt-6">
            <RentalPaymentHistory 
              payments={rental.payments}
              onDownloadDocument={(url) => window.open(url, '_blank')}
            />
          </div>
        )}
      </div>

      {/* Customer Signature */}
      {rental.signature && (
        <div className="border-b pb-4">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Customer Signature</h3>
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <PenTool className="h-5 w-5 text-gray-400" />
              <span className="text-sm text-gray-600">Signed by {customer?.name || 'Customer'}</span>
            </div>
            <img 
              src={rental.signature} 
              alt="Customer Signature" 
              className="max-h-24 object-contain bg-white rounded border"
            />
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
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Original End Date</p>
                    <p className="font-medium">{formatDate(extension.originalEndDate, true)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">New End Date</p>
                    <p className="font-medium">{formatDate(extension.newEndDate, true)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Extension Cost</p>
                    <p className="font-medium">£{extension.cost.toFixed(2)}</p>
                  </div>
                  {extension.negotiated && (
                    <div>
                      <p className="text-sm text-gray-500">Negotiation Notes</p>
                      <p className="text-sm">{extension.negotiationNotes}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Audit Information */}
      <div className="text-sm text-gray-500">
        <div className="flex justify-between">
          <div>Created: {formatDate(rental.createdAt, true)}</div>
          <div>Last Updated: {formatDate(rental.updatedAt, true)}</div>
        </div>
      </div>
    </div>
  );
};

export default RentalDetails;