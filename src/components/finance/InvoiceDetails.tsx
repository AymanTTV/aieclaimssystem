// src/components/finance/InvoiceDetails.tsx
import React from 'react';
import { Invoice, Vehicle, Customer } from '../../types/finance';
import { Account } from '../../types';
import { format } from 'date-fns';
import StatusBadge from '../ui/StatusBadge';
import InvoicePaymentHistory from './InvoicePaymentHistory';
import {
  FileText, Car, User, Calendar, Hash, Tag, Wallet, RefreshCw, AlertCircle
} from 'lucide-react';
import { useFormattedDisplay } from '../../hooks/useFormattedDisplay';

interface InvoiceDetailsProps {
  invoice: Invoice;
  vehicle?: Vehicle;
  customer?: Customer;
  accounts?: Account[];
  groups?: { id: string; name: string }[];
  onDownload: () => void;
}

const InvoiceDetails: React.FC<InvoiceDetailsProps> = ({
  invoice,
  vehicle,
  customer,
  accounts = [],
  groups = [],
  onDownload,
}) => {
  const formatDate = (date: any): string => {
    if (date?.toDate) return format(date.toDate(), 'dd/MM/yyyy HH:mm');
    if (date instanceof Date) return format(date, 'dd/MM/yyyy HH:mm');
    return 'N/A';
  };

  const { formatCurrency } = useFormattedDisplay();

  // Calculations: Added safety fallbacks here too just in case!
  const totalDiscount = (invoice.lineItems || []).reduce((sum, li) => {
    const gross = li.quantity * li.unitPrice;
    return sum + (li.discount / 100) * gross;
  }, 0);

  const net = invoice.subTotal;
  const vat = invoice.vatAmount;
  const total = invoice.total;
  const paid = invoice.paidAmount;
  const owing = invoice.remainingAmount;
  
  // Account Resolvers
  const accFromId = (invoice as any).accountFrom;
  const accToId = (invoice as any).accountTo || invoice.accountId;
  const accFromName = accounts.find(a => a.id === accFromId)?.name || 'N/A';
  const accToName = accounts.find(a => a.id === accToId)?.name || invoice.accountName || 'N/A';

  const groupName = groups.find(g => g.id === invoice.groupId)?.name || 'N/A';

  return (
    <div className="space-y-6 bg-gray-50/50 p-2 rounded-lg">
      
      {/* ── HEADER ROW ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-4 rounded-lg shadow-sm border border-gray-100 gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-gray-900 flex items-center">
              <Hash className="h-5 w-5 text-indigo-500 mr-1" />
              {invoice.invoiceNumber || 'Draft / N/A'}
            </h2>
            <StatusBadge status={invoice.paymentStatus} />
            {invoice.isLoan && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                Loan Account
              </span>
            )}
            {invoice.isRecurring && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 flex items-center">
                <RefreshCw className="h-3 w-3 mr-1" /> Recurring
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-1 flex items-center">
            <Calendar className="h-4 w-4 mr-1" /> Issued: {formatDate(invoice.date)} | Due: {formatDate(invoice.dueDate)}
          </p>
        </div>
        
        {invoice.documentUrl && (
          <button
            onClick={onDownload}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
          >
            <FileText className="h-4 w-4 mr-2" />
            Download PDF
          </button>
        )}
      </div>

      {/* ── INFO CARDS ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Client & Vehicle */}
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 space-y-4">
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center">
              <User className="h-4 w-4 mr-1.5 text-gray-400" /> Client Details
            </h3>
            <p className="font-medium text-gray-900">{customer?.name || invoice.customerName || 'N/A'}</p>
            {(customer?.mobile || invoice.customerPhone) && (
              <p className="text-sm text-gray-600">{customer?.mobile || invoice.customerPhone}</p>
            )}
            {customer?.email && <p className="text-sm text-gray-600">{customer.email}</p>}
          </div>
          
          <div className="pt-3 border-t border-gray-100">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center">
              <Car className="h-4 w-4 mr-1.5 text-gray-400" /> Vehicle Assigned
            </h3>
            {vehicle ? (
              <div>
                <p className="font-medium text-gray-900">{vehicle.make} {vehicle.model}</p>
                <p className="text-sm text-gray-600 font-mono">{vehicle.registrationNumber}</p>
              </div>
            ) : invoice.vehicleName ? (
               <p className="font-medium text-gray-900">{invoice.vehicleName}</p>
            ) : (
               <p className="text-sm text-gray-500 italic">No vehicle linked</p>
            )}
          </div>
        </div>

        {/* Financial Routing */}
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 space-y-4">
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center">
              <Tag className="h-4 w-4 mr-1.5 text-gray-400" /> Classification
            </h3>
            <p className="font-medium text-gray-900">{invoice.category === 'Other' ? invoice.customCategory : invoice.category}</p>
            {invoice.groupId && <p className="text-xs text-gray-500 mt-1">Group: <span className="font-medium">{groupName}</span></p>}
          </div>

          <div className="pt-3 border-t border-gray-100">
             <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center">
              <Wallet className="h-4 w-4 mr-1.5 text-gray-400" /> Ledger Routing
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500">From (Debit):</span>
                <span className="font-medium text-red-600">{accFromName}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500">To (Credit):</span>
                <span className="font-medium text-green-600">{accToName}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Totals Summary */}
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex flex-col justify-between">
           <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Financial Summary</h3>
           <div className="space-y-2 flex-grow">
              <div className="flex justify-between text-sm text-gray-600"><span>Net</span><span>{formatCurrency(net)}</span></div>
              <div className="flex justify-between text-sm text-gray-600"><span>VAT</span><span>{formatCurrency(vat)}</span></div>
              {totalDiscount > 0 && (
                 <div className="flex justify-between text-sm text-red-500"><span>Discount</span><span>-{formatCurrency(totalDiscount)}</span></div>
              )}
           </div>
           
           <div className="pt-3 border-t border-gray-100 space-y-2">
              <div className="flex justify-between text-base font-bold text-gray-900"><span>Total</span><span>{formatCurrency(total)}</span></div>
              <div className="flex justify-between text-sm font-medium text-green-600"><span>Paid</span><span>{formatCurrency(paid)}</span></div>
              <div className={`flex justify-between text-sm font-bold ${owing > 0 ? 'text-amber-600' : 'text-gray-400'}`}>
                <span>Owing</span><span>{formatCurrency(owing)}</span>
              </div>
           </div>
        </div>
      </div>

      {/* --- DESCRIPTION --- */}
      {invoice.description && (
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 shadow-sm">
          <h3 className="text-xs font-bold text-blue-800 uppercase tracking-wider flex items-center mb-1">
             <AlertCircle className="w-4 h-4 mr-1" /> Notes & Description
          </h3>
          <p className="text-sm text-blue-900 whitespace-pre-wrap">{invoice.description}</p>
        </div>
      )}

      {/* ── LINE ITEMS ── */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
          <h3 className="text-sm font-semibold text-gray-700">Line Items</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Description</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Qty</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Unit Price</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Discount</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">VAT</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Line Total</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {invoice.lineItems && invoice.lineItems.length > 0 ? (
                (invoice.lineItems || []).map((item, idx) => {
                  const gross = item.quantity * item.unitPrice;
                  const discountAmt = (item.discount / 100) * gross;
                  const netAfterDiscount = gross - discountAmt;
                  const vatAmt = item.includeVAT ? netAfterDiscount * 0.2 : 0;
                  const totalLine = netAfterDiscount + vatAmt;
                  
                  return (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900 font-medium">{item.description}</td>
                      <td className="px-4 py-3 text-sm text-gray-500 text-center">{item.quantity}</td>
                      <td className="px-4 py-3 text-sm text-gray-500 text-right">{formatCurrency(item.unitPrice)}</td>
                      <td className="px-4 py-3 text-sm text-red-500 text-right">{item.discount > 0 ? `${item.discount.toFixed(1)}%` : '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-500 text-center">{item.includeVAT ? '✓' : '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 text-right font-semibold">{formatCurrency(totalLine)}</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="px-4 py-4 text-center text-sm text-gray-500">
                    No line items
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Payment History ── */}
      {invoice.payments && invoice.payments.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Payment Timeline</h3>
          <InvoicePaymentHistory
            payments={invoice.payments}
            onDownloadDocument={url => window.open(url, '_blank')}
          />
        </div>
      )}

      {/* ── Creation Info ── */}
      <div className="text-xs text-gray-400 text-right pt-2 pb-2">
        <p>Record ID: {invoice.id}</p>
        <p>Created: {formatDate(invoice.createdAt)} | Last Updated: {formatDate(invoice.updatedAt)}</p>
      </div>
    </div>
  );
};

export default InvoiceDetails;