import React from 'react';
import { Rental, Vehicle, Customer } from '../../types';
import { format, isValid } from 'date-fns';
import StatusBadge from '../ui/StatusBadge';
import { FileText, Download, Car, User, Mail, Phone, MapPin, Calendar, DollarSign, Clock, PenTool } from 'lucide-react';


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
  // Helper function to safely format dates
  const formatDateTime = (date: Date | null | undefined): string => {
    if (!date || !isValid(date)) return 'N/A';
    return format(date, 'dd/MM/yyyy HH:mm');
  };

  return (
    <div className="space-y-6">
      {/* Documents Section */}
      <div className="flex justify-end space-x-4">
  {rental.documents?.agreement && (
    <button
      onClick={() => {
        try {
          window.open(rental.documents?.agreement, '_blank', 'noopener,noreferrer');
        } catch (error) {
          console.error('Error opening agreement:', error);
          toast.error('Failed to open agreement. Please try downloading it instead.');
        }
      }}
      className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
    >
      <FileText className="h-4 w-4 mr-2" />
      Hire Agreement
    </button>
  )}
  {rental.documents?.invoice && (
    <button
      onClick={() => {
        try {
          window.open(rental.documents?.invoice, '_blank', 'noopener,noreferrer');
        } catch (error) {
          console.error('Error opening invoice:', error);
          toast.error('Failed to open invoice. Please try downloading it instead.');
        }
      }}
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
              <p className="font-medium">{formatDateTime(rental.startDate)}</p>
            </div>
          </div>
          <div className="flex items-center">
            <Calendar className="h-5 w-5 text-gray-400 mr-2" />
            <div>
              <p className="text-sm text-gray-500">End Date & Time</p>
              <p className="font-medium">{formatDateTime(rental.endDate)}</p>
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
                    <p className="font-medium">{formatDateTime(extension.originalEndDate)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">New End Date</p>
                    <p className="font-medium">{formatDateTime(extension.newEndDate)}</p>
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
          <div>Created: {formatDateTime(rental.createdAt)}</div>
          <div>Last Updated: {formatDateTime(rental.updatedAt)}</div>
        </div>
      </div>
    </div>
  );
};

export default RentalDetails;