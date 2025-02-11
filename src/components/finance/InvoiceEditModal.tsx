import React, { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Invoice, Vehicle, Customer } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { createFinanceTransaction } from '../../utils/financeTransactions';
import { generateInvoicePDF } from '../../utils/invoicePdfGenerator';
import { uploadPDF } from '../../utils/pdfStorage';
import FormField from '../ui/FormField';
import SearchableSelect from '../ui/SearchableSelect';
import InvoicePaymentHistory from './InvoicePaymentHistory';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

interface InvoiceEditModalProps {
  invoice: Invoice;
  vehicles: Vehicle[];
  customers: Customer[];
  onClose: () => void;
}

const InvoiceEditModal: React.FC<InvoiceEditModalProps> = ({
  invoice,
  vehicles,
  customers,
  onClose
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    date: new Date(invoice.date).toISOString().split('T')[0],
    dueDate: new Date(invoice.dueDate).toISOString().split('T')[0],
    amount: invoice.amount.toString(),
    amountToPay: '0',
    isPaid: false,
    category: invoice.category === 'other' ? 'other' : invoice.category,
    customCategory: invoice.category === 'other' ? invoice.customCategory || invoice.category : '',
    vehicleId: invoice.vehicleId || '',
    description: invoice.description,
    customerId: invoice.customerId || '',
    customerName: invoice.customerName || '',
    customerPhone: invoice.customerPhone || '',
    useCustomCustomer: !!invoice.customerName,
    paymentMethod: 'cash' as const,
    paymentReference: '',
    paymentNotes: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    try {
      const amount = parseFloat(formData.amount);
      const amountToPay = parseFloat(formData.amountToPay) || 0;
      const totalPaid = invoice.paidAmount + amountToPay;

      if (amount < totalPaid) {
        toast.error('Total amount cannot be less than amount already paid');
        return;
      }

      const remainingAmount = amount - totalPaid;
      const paymentStatus = totalPaid === 0 ? 'pending' : 
                          totalPaid === amount ? 'paid' : 
                          'partially_paid';

      // Create new payment record if amount to pay > 0
      const payments = [...(invoice.payments || [])];
      if (amountToPay > 0) {
        payments.push({
          id: Date.now().toString(),
          date: new Date(),
          amount: amountToPay,
          method: formData.paymentMethod,
          reference: formData.paymentReference,
          notes: formData.paymentNotes,
          createdAt: new Date(),
          createdBy: user.id
        });
      }

      // Get selected vehicle and customer for PDF generation
      const selectedVehicle = vehicles.find(v => v.id === formData.vehicleId);
      const selectedCustomer = formData.useCustomCustomer ? null : 
        customers.find(c => c.id === formData.customerId);

      // Update invoice data
      const invoiceData = {
        date: new Date(formData.date),
        dueDate: new Date(formData.dueDate),
        amount,
        paidAmount: totalPaid,
        remainingAmount,
        category: formData.category === 'other' ? 'other' : formData.category,
        customCategory: formData.category === 'other' ? formData.customCategory : null,
        vehicleId: formData.vehicleId || null,
        description: formData.description,
        customerId: formData.useCustomCustomer ? null : formData.customerId,
        customerName: formData.useCustomCustomer ? formData.customerName : null,
        customerPhone: formData.useCustomCustomer ? formData.customerPhone : null,
        paymentStatus,
        payments,
        updatedAt: new Date()
      };

      // Update invoice
      await updateDoc(doc(db, 'invoices', invoice.id), invoiceData);

      // Generate and upload new PDF
      const pdfBlob = await generateInvoicePDF(
        { id: invoice.id, ...invoiceData }, 
        selectedVehicle
      );
      const documentUrl = await uploadPDF(pdfBlob, `invoices/${invoice.id}/invoice.pdf`);

      // Update invoice with new document URL
      await updateDoc(doc(db, 'invoices', invoice.id), {
        documentUrl
      });

      // Create finance transaction for new payment
      if (amountToPay > 0) {
        await createFinanceTransaction({
          type: 'income',
          category: formData.category,
          amount: amountToPay,
          description: `Payment for invoice #${invoice.id.slice(-8).toUpperCase()}`,
          referenceId: invoice.id,
          vehicleId: formData.vehicleId || undefined,
          vehicleName: selectedVehicle ? `${selectedVehicle.make} ${selectedVehicle.model}` : undefined,
          paymentMethod: formData.paymentMethod,
          paymentReference: formData.paymentReference,
          paymentStatus
        });
      }

      toast.success('Invoice updated successfully');
      onClose();
    } catch (error) {
      console.error('Error updating invoice:', error);
      toast.error('Failed to update invoice');
    } finally {
      setLoading(false);
    }
  };
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
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Customer Selection */}
      <div className="space-y-4">
        <div>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={formData.useCustomCustomer}
              onChange={(e) => setFormData({ 
                ...formData, 
                useCustomCustomer: e.target.checked,
                customerId: '',
                customerName: ''
              })}
              className="rounded border-gray-300 text-primary focus:ring-primary"
            />
            <span className="text-sm text-gray-700">Enter Customer Manually</span>
          </label>
        </div>

        {formData.useCustomCustomer ? (
          <div className="space-y-4">
    <FormField
      label="Customer Name"
      value={formData.customerName}
      onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
      required
      placeholder="Enter customer name"
    />
    <FormField
      type="tel"
      label="Phone Number"
      value={formData.customerPhone || ''}
      onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
      placeholder="Enter customer phone number"
    />
  </div>
        ) : (
          <SearchableSelect
            label="Select Customer"
            options={customers.map(c => ({
              id: c.id,
              label: c.name,
              subLabel: `${c.mobile} - ${c.email}`
            }))}
            value={formData.customerId}
            onChange={(id) => setFormData({ ...formData, customerId: id })}
            placeholder="Search customers..."
          />
        )}
      </div>

      {/* Basic Invoice Details */}
      <div className="grid grid-cols-2 gap-4">
        <FormField
          type="date"
          label="Invoice Date"
          value={formData.date}
          onChange={(e) => setFormData({ ...formData, date: e.target.value })}
          required
        />

        <FormField
          type="date"
          label="Due Date"
          value={formData.dueDate}
          onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
          required
        />

        <FormField
          type="number"
          label="Total Amount"
          value={formData.amount}
          onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
          min={invoice.paidAmount}
          step="0.01"
          required
        />
      </div>

      {/* Category */}
      <div>
        <label className="block text-sm font-medium text-gray-700">Category</label>
        <select
          value={formData.category}
          onChange={(e) => setFormData({ ...formData, category: e.target.value })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
          required
        >
          <option value="">Select category</option>
          <option value="service">Service</option>
          <option value="repair">Repair</option>
          <option value="parts">Parts</option>
          <option value="other">Other</option>
        </select>
      </div>

      {formData.category === 'other' && (
        <FormField
          label="Custom Category"
          value={formData.customCategory}
          onChange={(e) => setFormData({ ...formData, customCategory: e.target.value })}
          required
          placeholder="Enter custom category"
        />
      )}

      {/* Vehicle Selection */}
      <SearchableSelect
        label="Related Vehicle (Optional)"
        options={vehicles.map(v => ({
          id: v.id,
          label: `${v.make} ${v.model}`,
          subLabel: v.registrationNumber
        }))}
        value={formData.vehicleId}
        onChange={(id) => setFormData({ ...formData, vehicleId: id })}
        placeholder="Search vehicles..."
      />

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700">Description</label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={3}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
          required
        />
      </div>

      {/* Payment Status */}
      <div>
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={formData.isPaid}
            onChange={(e) => {
              const isPaid = e.target.checked;
              setFormData({ 
                ...formData, 
                isPaid,
                amountToPay: isPaid ? (invoice.amount - invoice.paidAmount).toString() : '0'
              });
            }}
            className="rounded border-gray-300 text-primary focus:ring-primary"
          />
          <span className="text-sm text-gray-700">Add Payment</span>
        </label>
      </div>

      {/* Amount to Pay */}
      <FormField
        type="number"
        label="Amount to Pay"
        value={formData.amountToPay}
        onChange={(e) => setFormData({ ...formData, amountToPay: e.target.value })}
        min="0"
        max={invoice.amount - invoice.paidAmount}
        step="0.01"
        disabled={!formData.isPaid}
      />

      {/* Payment Details */}
      {parseFloat(formData.amountToPay) > 0 && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Payment Method</label>
            <select
              value={formData.paymentMethod}
              onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value as any })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
              required
            >
              <option value="cash">Cash</option>
              <option value="card">Card</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="cheque">Cheque</option>
            </select>
          </div>

          <FormField
            label="Payment Reference"
            value={formData.paymentReference}
            onChange={(e) => setFormData({ ...formData, paymentReference: e.target.value })}
            placeholder="Enter payment reference or transaction ID"
          />

          <div>
            <label className="block text-sm font-medium text-gray-700">Payment Notes</label>
            <textarea
              value={formData.paymentNotes}
              onChange={(e) => setFormData({ ...formData, paymentNotes: e.target.value })}
              rows={2}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
              placeholder="Add any notes about this payment"
            />
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
          <span className="text-green-600">£{invoice.paidAmount.toFixed(2)}</span>
        </div>
        {parseFloat(formData.amountToPay) > 0 && (
          <div className="flex justify-between text-sm">
            <span>New Payment:</span>
            <span className="text-blue-600">£{parseFloat(formData.amountToPay).toFixed(2)}</span>
          </div>
        )}
        <div className="flex justify-between text-sm">
          <span>Remaining Amount:</span>
          <span className="text-amber-600">
            £{(invoice.amount - invoice.paidAmount - parseFloat(formData.amountToPay || '0')).toFixed(2)}
          </span>
        </div>
      </div>

      {/* Payment History */}
      {invoice.payments && invoice.payments.length > 0 && (
        <InvoicePaymentHistory
          payments={invoice.payments}
          onDownloadDocument={(url) => window.open(url, '_blank')}
        />
      )}

      {/* Form Actions */}
      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 text-sm font-medium text-white bg-primary border border-transparent rounded-md hover:bg-primary-600"
        >
          {loading ? 'Updating...' : 'Update Invoice'}
        </button>
      </div>
    </form>
  );
};

export default InvoiceEditModal;