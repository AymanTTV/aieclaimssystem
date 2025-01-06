import React from 'react';
import { Invoice, Vehicle, Customer } from '../../types';
import { format } from 'date-fns';
import StatusBadge from '../ui/StatusBadge';
import InvoicePaymentHistory from './InvoicePaymentHistory';
import { FileText, Download, Car, User, Mail, Phone, MapPin, Calendar, DollarSign } from 'lucide-react';

interface InvoiceDetailsProps {
  invoice: Invoice;
  vehicle?: Vehicle;
  customer?: Customer;
  onDownload: () => void;
}

const InvoiceDetails: React.FC<InvoiceDetailsProps> = ({
  invoice,
  vehicle,
  customer,
  onDownload
}) => {
  const formatDate = (date: any): string => {
    // Handle Firestore Timestamp
    if (date?.toDate) {
      return format(date.toDate(), 'dd/MM/yyyy HH:mm');
    }
    
    // Handle regular Date objects
    if (date instanceof Date) {
      return format(date, 'dd/MM/yyyy HH:mm');
    }
    
    return 'N/A';
  };

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

      {/* Basic Information */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <h3 className="text-sm font-medium text-gray-500">Invoice Date</h3>
          <p className="mt-1 flex items-center">
            <Calendar className="h-4 w-4 text-gray-400 mr-2" />
            {formatDate(invoice.date)}
          </p>
        </div>
        <div>
          <h3 className="text-sm font-medium text-gray-500">Due Date</h3>
          <p className="mt-1 flex items-center">
            <Calendar className="h-4 w-4 text-gray-400 mr-2" />
            {formatDate(invoice.dueDate)}
          </p>
        </div>
      </div>

      {/* Customer Information */}
      <div>
        <h3 className="text-sm font-medium text-gray-500">Customer</h3>
        {customer ? (
          <div className="mt-1">
            <div className="flex items-center">
              <User className="h-4 w-4 text-gray-400 mr-2" />
              <div>
                <p className="font-medium">{customer.name}</p>
                <p className="text-sm text-gray-500">{customer.mobile}</p>
                <p className="text-sm text-gray-500">{customer.email}</p>
              </div>
            </div>
          </div>
        ) : invoice.customerName ? (
          <p className="mt-1">{invoice.customerName}</p>
        ) : (
          <p className="mt-1 text-gray-500">No customer information</p>
        )}
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

      {/* Payment Summary */}
      <div className="bg-gray-50 p-4 rounded-lg space-y-2">
        <div className="flex justify-between text-sm">
          <span>Total Amount:</span>
          <span className="font-medium">£{invoice.amount.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>Amount Paid:</span>
          <span className="text-green-600">£{(invoice.paidAmount || 0).toFixed(2)}</span>
        </div>
        {(invoice.remainingAmount || 0) > 0 && (
          <div className="flex justify-between text-sm">
            <span>Remaining Amount:</span>
            <span className="text-amber-600">£{invoice.remainingAmount.toFixed(2)}</span>
          </div>
        )}
        <div className="flex justify-between text-sm pt-2 border-t">
          <span>Payment Status:</span>
          <span className="font-medium capitalize">{invoice.paymentStatus.replace('_', ' ')}</span>
        </div>
      </div>

      {/* Payment History */}
      {invoice.payments && invoice.payments.length > 0 && (
        <InvoicePaymentHistory 
          payments={invoice.payments}
          onDownloadDocument={(url) => window.open(url, '_blank')}
        />
      )}

      {/* Description */}
      <div>
        <h3 className="text-sm font-medium text-gray-500">Description</h3>
        <p className="mt-1 text-gray-900">{invoice.description}</p>
      </div>

      {/* Creation Info */}
      <div className="text-sm text-gray-500 border-t pt-4">
        <p>Created: {formatDate(invoice.createdAt)}</p>
        <p>Last Updated: {formatDate(invoice.updatedAt)}</p>
      </div>
    </div>
  );
};

export default InvoiceDetails;