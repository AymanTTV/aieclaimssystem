import React from 'react';
import { Invoice, Vehicle, Customer } from '../../types/finance';
import { format } from 'date-fns';
import StatusBadge from '../ui/StatusBadge';
import InvoicePaymentHistory from './InvoicePaymentHistory';
import {
  FileText,
  Download,
  Car,
  User,
  Calendar,
} from 'lucide-react';
import { useFormattedDisplay } from '../../hooks/useFormattedDisplay';

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
  onDownload,
}) => {
  const formatDate = (date: any): string => {
    if (date?.toDate) {
      return format(date.toDate(), 'dd/MM/yyyy HH:mm');
    }
    if (date instanceof Date) {
      return format(date, 'dd/MM/yyyy HH:mm');
    }
    return 'N/A';
  };

  const { formatCurrency } = useFormattedDisplay();

  // total discount from line items
  const totalDiscount = invoice.lineItems.reduce((sum, li) => {
    const gross = li.quantity * li.unitPrice;
    return sum + (li.discount / 100) * gross;
  }, 0);

  const net = invoice.subTotal;
  const vat = invoice.vatAmount;
  const total = net + vat - totalDiscount;
  const paid = invoice.paidAmount;
  const owing = invoice.remainingAmount;
  
  // Helper: compute each line’s net, vat, and total
  const lineTotals = (item: Invoice['lineItems'][0]) => {
    const gross = item.quantity * item.unitPrice;
    const discountAmt = (item.discount / 100) * gross;
    const netAfterDiscount = gross - discountAmt;
    const vatAmt = item.includeVAT ? netAfterDiscount * 0.2 : 0;
    return {
      netAfterDiscount,
      vatAmt,
      totalLine: netAfterDiscount + vatAmt
    };
  };

  return (
    <div className="space-y-6">
      {/* ── Status & Download ── */}
      <div className="flex justify-between items-center">
        <StatusBadge status={invoice.paymentStatus} />
        {invoice.documentUrl && (
          <button
            onClick={onDownload}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <FileText className="h-4 w-4 mr-2" />
            Download Invoice
          </button>
        )}
      </div>

      {/* ── Invoice Dates ── */}
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

      {/* ── Customer Info ── */}
      <div>
        <h3 className="text-sm font-medium text-gray-500">Customer</h3>
        {customer ? (
          <div className="mt-1 flex items-center">
            <User className="h-4 w-4 text-gray-400 mr-2" />
            <div>
              <p className="font-medium">{customer.name}</p>
              <p className="text-sm text-gray-500">{customer.mobile}</p>
            </div>
          </div>
        ) : invoice.customerName ? (
          <div className="mt-1 flex items-center">
            <User className="h-4 w-4 text-gray-400 mr-2" />
            <div>
              <p className="font-medium">{invoice.customerName}</p>
              {invoice.customerPhone && (
                <p className="text-sm text-gray-500">{invoice.customerPhone}</p>
              )}
            </div>
          </div>
        ) : (
          <p className="mt-1 text-gray-500">No customer information</p>
        )}
      </div>

      {/* ── Vehicle Info ── */}
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

      {/* Cost Breakdown */}
      <div className="bg-gray-50 p-4 rounded-lg space-y-2">
        <div className="flex justify-between text-sm">
          <span>Net:</span>
          <span>{formatCurrency(net)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>VAT:</span>
          <span>{formatCurrency(vat)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>Discount:</span>
          <span className="text-red-600">–{formatCurrency(totalDiscount)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>Total:</span>
          <span>{formatCurrency(total)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>Paid:</span>
          <span className="text-green-600">{formatCurrency(paid)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>Owing:</span>
          <span className="text-amber-600">{formatCurrency(owing)}</span>
        </div>
      </div>

      {/* ── Payment History ── */}
      {invoice.payments && invoice.payments.length > 0 && (
        <InvoicePaymentHistory
          payments={invoice.payments}
          onDownloadDocument={url => window.open(url, '_blank')}
        />
      )}

      {/* ── LINE ITEMS ── */}
      <div>
        <h3 className="text-sm font-medium text-gray-500 mb-2">Line Items</h3>
        <div className="border border-gray-200 rounded-md">
          {/* Table Header */}
          <div className="grid grid-cols-6 bg-gray-100 text-xs font-semibold text-gray-600 px-3 py-2">
            <div className="col-span-2">Description</div>
            <div className="text-right">Qty</div>
            <div className="text-right">Unit Price</div>
            <div className="text-right">Discount (%)</div>
            <div className="text-center">VAT?</div>
            <div className="text-right">Line Total</div>
          </div>
          {/* Table Rows */}
          {invoice.lineItems.map((item, idx) => {
            const gross = item.quantity * item.unitPrice;
            const discountAmt = (item.discount / 100) * gross;
            const netAfterDiscount = gross - discountAmt;
            const vatAmt = item.includeVAT ? netAfterDiscount * 0.2 : 0;
            const totalLine = netAfterDiscount + vatAmt;
            return (
              <div
                key={item.id}
                className={`grid grid-cols-6 text-sm border-t border-gray-100 px-3 py-2 ${
                  idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                }`}
              >
                <div className="col-span-2">{item.description}</div>
                <div className="text-right">{item.quantity}</div>
                <div className="text-right">{formatCurrency(item.unitPrice)}</div>
                <div className="text-right">{item.discount.toFixed(1)}%</div>
                <div className="text-center">{item.includeVAT ? '✓' : '-'}</div>
                <div className="text-right">{formatCurrency(totalLine)}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Creation & Update Info ── */}
      <div className="text-sm text-gray-500 border-t pt-4">
        <p>Created: {formatDate(invoice.createdAt)}</p>
        <p>Last Updated: {formatDate(invoice.updatedAt)}</p>
      </div>
    </div>
  );
};

export default InvoiceDetails;
