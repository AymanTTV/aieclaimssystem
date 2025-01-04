import React from 'react';
import { Invoice } from '../../types';
import { format } from 'date-fns';
import StatusBadge from '../ui/StatusBadge';
import { Calendar, DollarSign, FileText, Car } from 'lucide-react';
// Add this import at the top of these files:
import { Customer } from '../../types/customer';


interface InvoiceDetailsProps {
  invoice: Invoice;
  vehicle?: Vehicle;
  customer?: Customer;
  onDownload: () => void;
}

const InvoiceDetails: React.FC<InvoiceDetailsProps> = ({ invoice, vehicle, customer, onDownload }) => {
  return (
    <div className="space-y-6">
      {/* Status and Actions */}
      <div className="flex justify-between items-center">
        <StatusBadge status={invoice.paymentStatus} />
        {invoice.documentUrl && (
          <button
            onClick={onDownload}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <FileText className="h-4 w-4 mr-2" />
            Download Invoice
          </button>
        )}
      </div>

      {/* Customer Information */}
      <div>
        <h3 className="text-sm font-medium text-gray-500">Customer</h3>
        {invoice.customerName ? (
          <p className="mt-1">{invoice.customerName}</p>
        ) : customer ? (
          <div className="mt-1">
            <p className="font-medium">{customer.name}</p>
            <p className="text-sm text-gray-500">{customer.mobile}</p>
            <p className="text-sm text-gray-500">{customer.email}</p>
          </div>
        ) : (
          <p className="mt-1 text-gray-500">No customer information</p>
        )}
      </div>

      {/* Basic Information */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <h3 className="text-sm font-medium text-gray-500">Invoice Date</h3>
          <p className="mt-1 flex items-center">
            <Calendar className="h-4 w-4 text-gray-400 mr-2" />
            {format(invoice.date, 'MMM dd, yyyy')}
          </p>
        </div>
        <div>
          <h3 className="text-sm font-medium text-gray-500">Due Date</h3>
          <p className="mt-1 flex items-center">
            <Calendar className="h-4 w-4 text-gray-400 mr-2" />
            {format(invoice.dueDate, 'MMM dd, yyyy')}
          </p>
        </div>
      </div>

      {/* Amount and Category */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <h3 className="text-sm font-medium text-gray-500">Amount</h3>
          <p className="mt-1 flex items-center text-lg font-medium">
            <DollarSign className="h-4 w-4 text-gray-400 mr-2" />
            £{invoice.amount.toFixed(2)}
          </p>
        </div>
        <div>
          <h3 className="text-sm font-medium text-gray-500">Category</h3>
          <p className="mt-1 capitalize">{invoice.category}</p>
        </div>
      </div>

      {/* Vehicle Information */}
      {vehicle && (
        <div>
          <h3 className="text-sm font-medium text-gray-500">Related Vehicle</h3>
          <div className="mt-1 flex items-center">
            <Car className="h-4 w-4 text-gray-400 mr-2" />
            <div>
              <p className="font-medium">{vehicle.make} {vehicle.model}</p>
              <p className="text-sm text-gray-500">{vehicle.registrationNumber}</p>
            </div>
          </div>
        </div>
      )}

      {/* Description */}
      <div>
        <h3 className="text-sm font-medium text-gray-500">Description</h3>
        <p className="mt-1 text-gray-900">{invoice.description}</p>
      </div>

      {/* Creation Info */}
      <div className="text-sm text-gray-500 border-t pt-4">
        <p>Created: {format(invoice.createdAt, 'MMM dd, yyyy HH:mm')}</p>
        <p>Last Updated: {format(invoice.updatedAt, 'MMM dd, yyyy HH:mm')}</p>
      </div>
    </div>
  );
};

export default InvoiceDetails;
