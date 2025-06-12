import React from 'react';
import { VDInvoice } from '../../types/vdInvoice';
import { format } from 'date-fns';
import StatusBadge from '../ui/StatusBadge';

interface VDInvoiceDetailsProps {
  invoice: VDInvoice;
}

const VDInvoiceDetails: React.FC<VDInvoiceDetailsProps> = ({ invoice }) => {
  return (
    <div className="space-y-6">
      {/* Header with Invoice Info */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Invoice #{invoice.invoiceNumber}
          </h2>
          <p className="text-sm text-gray-500">
            Date: {format(invoice.date, 'dd/MM/yyyy')}
          </p>
        </div>
        <StatusBadge status={invoice.paymentStatus} />
      </div>

      {/* Customer and Vehicle Info */}
      <div className="grid grid-cols-2 gap-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Customer Information</h3>
          <div className="space-y-1">
            <p className="font-medium">{invoice.customerName}</p>
            <p className="text-gray-600">{invoice.customerPhone}</p>
            <p className="text-gray-600">{invoice.customerEmail}</p>
            <p className="text-gray-600">{invoice.customerAddress}</p>
            <p className="text-gray-600">{invoice.customerPostcode}</p>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Vehicle Information</h3>
          <div className="space-y-1">
            <p className="font-medium">{invoice.make} {invoice.model}</p>
            <p className="text-gray-600">Registration: {invoice.registration}</p>
            <p className="text-gray-600">Color: {invoice.color}</p>
          </div>
        </div>
      </div>

      {/* Service Details */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Service Details</h3>
        <div className="space-y-2">
          <p><span className="font-medium">Service Center:</span> {invoice.serviceCenter}</p>
          <p>
            <span className="font-medium">Labor:</span> {invoice.laborHours} hours @ £{invoice.laborRate}/hour
            {invoice.laborVAT && ' (+VAT)'}
          </p>
        </div>
      </div>

      {/* Parts List */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Parts</h3>
        <div className="space-y-2">
          {invoice.parts.map((part, index) => {
            const lineTotal = (part.price * part.quantity * (1 - part.discount / 100));
            return (
              <div key={index} className="flex justify-between items-center">
                <div>
                  <span className="font-medium">{part.name}</span>
                  <span className="text-gray-500 ml-2">×{part.quantity}</span>
                  {part.discount > 0 && (
                    <span className="text-gray-500 ml-2">({part.discount}% off)</span>
                  )}
                  {part.includeVAT && <span className="text-gray-500 ml-2">(+VAT)</span>}
                </div>
                <span>£{lineTotal.toFixed(2)}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Cost Summary */}
      <div className="bg-gray-50 p-4 rounded-lg space-y-2">
        <div className="flex justify-between text-sm">
          <span>Parts Total:</span>
          <span>£{invoice.partsTotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>Labor Cost:</span>
          <span>£{invoice.laborCost.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>Paint/Materials:</span>
          <span>£{invoice.paintMaterials.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm font-medium pt-2 border-t">
          <span>Subtotal:</span>
          <span>£{invoice.subtotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>VAT:</span>
          <span>£{invoice.vatAmount.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-lg font-bold pt-2 border-t">
          <span>Total:</span>
          <span>£{invoice.total.toFixed(2)}</span>
        </div>
      </div>

      {/* Payment History */}
      {invoice.payments && invoice.payments.length > 0 && (
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Payment History</h3>
          <div className="space-y-2">
            {invoice.payments.map((payment) => (
              <div key={payment.id} className="bg-gray-50 p-3 rounded-lg">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">£{payment.amount.toFixed(2)}</p>
                    <p className="text-sm text-gray-500">
                      {format(payment.date, 'dd/MM/yyyy HH:mm')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="capitalize">{payment.method.toLowerCase().replace('_', ' ')}</p>
                    {payment.reference && (
                      <p className="text-sm text-gray-500">Ref: {payment.reference}</p>
                    )}
                  </div>
                </div>
                {payment.notes && (
                  <p className="text-sm text-gray-500 mt-1">{payment.notes}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Creation Info */}
      <div className="text-sm text-gray-500 border-t pt-4">
        <p>Created: {format(invoice.createdAt, 'dd/MM/yyyy HH:mm')}</p>
        <p>Last Updated: {format(invoice.updatedAt, 'dd/MM/yyyy HH:mm')}</p>
      </div>
    </div>
  );
};

export default VDInvoiceDetails;