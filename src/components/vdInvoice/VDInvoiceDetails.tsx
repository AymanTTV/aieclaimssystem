// src/components/vdInvoice/VDInvoiceDetails.tsx
import React from 'react';
import { VDInvoice } from '../../types/vdInvoice';
import { format } from 'date-fns';
import StatusBadge from '../ui/StatusBadge';

interface VDInvoiceDetailsProps {
  invoice: VDInvoice;
}

const VDInvoiceDetails: React.FC<VDInvoiceDetailsProps> = ({ invoice }) => {
  // Guard against undefined arrays
  const parts = invoice.parts ?? [];
  const payments = invoice.payments ?? [];

  const owing = invoice.total - invoice.paidAmount;

  return (
    <div className="space-y-6">

      {/* Header */}
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

      {/* Customer & Vehicle */}
      <div className="grid grid-cols-2 gap-6">
        <div>
          <h3 className="text-lg font-medium mb-2">Customer Information</h3>
          <div className="space-y-1">
            <p className="font-medium">{invoice.customerName}</p>
            <p className="text-gray-600">{invoice.customerPhone}</p>
            <p className="text-gray-600">{invoice.customerEmail}</p>
            <p className="text-gray-600">{invoice.customerAddress}</p>
            <p className="text-gray-600">{invoice.customerPostcode}</p>
          </div>
        </div>
        <div>
          <h3 className="text-lg font-medium mb-2">Vehicle Information</h3>
          <div className="space-y-1">
            <p className="font-medium">{invoice.make} {invoice.model}</p>
            <p className="text-gray-600">Registration: {invoice.registration}</p>
            <p className="text-gray-600">Color: {invoice.color}</p>
          </div>
        </div>
      </div>

      {/* Service Center */}
      <div>
        <h3 className="text-lg font-medium mb-2">Service Details</h3>
        <div className="space-y-2">
          <p>
            <span className="font-medium">Service Center:</span> {invoice.serviceCenter}
          </p>
          <p>
            <span className="font-medium">Labor:</span> {invoice.laborHours}h @ £{invoice.laborRate}/h
            {invoice.laborVAT && ' (+VAT)'}
          </p>
        </div>
      </div>

      {/* Parts */}
      <div>
        <h3 className="text-lg font-medium mb-2">Parts</h3>
        <div className="space-y-2">
          {parts.map((part, idx) => {
            const lineTotal = part.price * part.quantity * (1 - (part.discount ?? 0) / 100);
            return (
              <div key={idx} className="flex justify-between items-center">
                <div>
                  <span className="font-medium">{part.name}</span>
                  <span className="text-gray-500 ml-2">×{part.quantity}</span>
                  {part.discount > 0 && (
                    <span className="text-gray-500 ml-2">({part.discount}% off)</span>
                  )}
                  {part.includeVAT && (
                    <span className="text-gray-500 ml-2">(+VAT)</span>
                  )}
                </div>
                <span>£{lineTotal.toFixed(2)}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Labor & Paint/Materials Costs */}
      <div>
        <h3 className="text-lg font-medium mb-2">Labor & Paint/Materials Costs</h3>
        <table className="min-w-full divide-y divide-gray-200 mb-4">
          <thead>
            <tr>
              <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Description</th>
              <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Cost</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            <tr>
              <td className="px-4 py-2 text-sm">
                Labor ({invoice.laborHours}h @ £{invoice.laborRate}/h{invoice.laborVAT ? ' +VAT' : ''})
              </td>
              <td className="px-4 py-2 text-sm">£{invoice.laborCost.toFixed(2)}</td>
            </tr>
            <tr>
              <td className="px-4 py-2 text-sm">
                Paint/Materials{invoice.paintMaterialsVAT ? ' +VAT' : ''}
              </td>
              <td className="px-4 py-2 text-sm">£{invoice.paintMaterials.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Totals */}
      <div className="bg-gray-50 p-4 rounded-lg space-y-2">
        <div className="flex justify-between text-sm font-medium">
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
      {payments.length > 0 && (
        <div>
          <h3 className="text-lg font-medium mb-2">Payment History</h3>
          <div className="space-y-2">
            {payments.map(payment => (
              <div key={payment.id} className="bg-gray-50 p-3 rounded-lg">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">£{payment.amount.toFixed(2)}</p>
                    <p className="text-sm text-gray-500">
                      {format(payment.date, 'dd/MM/yyyy HH:mm')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="capitalize">
                      {payment.method.toLowerCase().replace('_',' ')}
                    </p>
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

      {/* Audit Info */}
      <div className="text-sm text-gray-500 border-t pt-4">
        <p>Created: {format(invoice.createdAt, 'dd/MM/yyyy HH:mm')}</p>
        <p>Last Updated: {format(invoice.updatedAt, 'dd/MM/yyyy HH:mm')}</p>
      </div>
    </div>
  );
};

export default VDInvoiceDetails;
