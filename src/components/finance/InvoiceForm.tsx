import React, { useState } from 'react';
import { addDoc, collection } from 'firebase/firestore';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Vehicle, Customer } from '../../types';
import { useAuth } from '../../context/AuthContext';
import FormField from '../ui/FormField';
import SearchableSelect from '../ui/SearchableSelect';
import { createFinanceTransaction } from '../../utils/financeTransactions';
import { generateInvoicePDF } from '../../utils/invoicePdfGenerator';
import { uploadPDF } from '../../utils/pdfStorage';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
interface InvoiceFormProps {
  vehicles: Vehicle[];
  customers: Customer[];
  onClose: () => void;
}

const InvoiceForm: React.FC<InvoiceFormProps> = ({ vehicles, customers, onClose }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    dueDate: new Date().toISOString().split('T')[0],
    amount: '',
    amountToPay: '0',
    isPaid: false,
    category: '',
    customCategory: '',
    vehicleId: '',
    description: '',
    customerId: '',
    customerName: '',
    customerPhone: '', // Add this field
    useCustomCustomer: false,
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

      if (amountToPay > amount) {
        toast.error('Amount to pay cannot exceed total amount');
        return;
      }

      const remainingAmount = amount - amountToPay;
      const paymentStatus = amountToPay === 0 ? 'pending' : 
                          amountToPay === amount ? 'paid' : 
                          'partially_paid';

      // Create initial payment record if amount is paid
      const payments = [];
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

      // Create invoice data
      const invoiceData = {
        date: new Date(formData.date),
        dueDate: new Date(formData.dueDate),
        amount,
        paidAmount: amountToPay,
        remainingAmount,
        category: formData.category === 'other' ? 'other' : formData.category,
        customCategory: formData.category === 'other' ? formData.customCategory : null,
        vehicleId: formData.vehicleId || null,
        description: formData.description,
        customerId: formData.useCustomCustomer ? null : formData.customerId,
        customerName: formData.useCustomCustomer ? formData.customerName : 
          customers.find(c => c.id === formData.customerId)?.name || null, // Update customerName here
        customerPhone: formData.useCustomCustomer ? formData.customerPhone : 
            customers.find(c => c.id === formData.customerId)?.mobile || null, // Update customerPhone here
        paymentStatus,
        payments,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Create invoice document
      const docRef = await addDoc(collection(db, 'invoices'), invoiceData);

      // Generate and upload PDF
      const pdfBlob = await generateInvoicePDF({ id: docRef.id, ...invoiceData }, selectedVehicle);
      const documentUrl = await uploadPDF(pdfBlob, `invoices/${docRef.id}/invoice.pdf`);

      // Update invoice with document URL
      await updateDoc(doc(db, 'invoices', docRef.id), {
        documentUrl
      });

      // Create finance transaction for paid amount
      if (amountToPay > 0) {
        await createFinanceTransaction({
          type: 'income',
          category: formData.category,
          amount: amountToPay,
          description: `Payment for invoice #${docRef.id.slice(-8).toUpperCase()}`,
          referenceId: docRef.id,
          vehicleId: formData.vehicleId || undefined,
          vehicleName: selectedVehicle ? `${selectedVehicle.make} ${selectedVehicle.model}` : undefined,
          paymentMethod: formData.paymentMethod,
          paymentReference: formData.paymentReference,
          paymentStatus
        });
      }

      toast.success('Invoice created successfully');
      onClose();
    } catch (error) {
      console.error('Error creating invoice:', error);
      toast.error('Failed to create invoice');
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
            onChange={(id) => {
              const selectedCustomer = customers.find(c => c.id === id);
              setFormData({ 
                ...formData, 
                customerId: id,
                customerName: selectedCustomer?.name || '', // Update customerName here
                 customerPhone: selectedCustomer?.mobile || '', // Update customerPhone here
              });
            }}
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
          required
          min="0.01"
          step="0.01"
        />
      </div>

      {/* Category */}
      {/* Category */}
<div>
  <label className="block text-sm font-medium text-gray-700">Category</label>
  <select
    value={formData.category}
    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
    required
  >
    <option value="all">All Categories</option>
<option value="Rental">Rental</option>
<option value="Maintenance Income">Maintenance Income</option>
<option value="Refunded Income">Refunded Income</option>
<option value="Insurance Income">Insurance Income</option>
<option value="Advertising Income">Advertising Income</option>
<option value="VD Payment Income">VD Payment Income</option>
<option value="Road Tax Refund Income">Road Tax Refund Income</option>
<option value="Commission Income">Commission Income</option>
<option value="Investment Income">Investment Income</option>
<option value="Loan Repayments Income">Loan Repayments Income</option>
<option value="AIE Claims VD Income">AIE Claims VD Income</option>
<option value="AIE Claims Hire Income">AIE Claims Hire Income</option>
<option value="AIE Claims PI Income">AIE Claims PI Income</option>
<option value="AIE Claims Domestic Income">AIE Claims Domestic Income</option>
<option value="AIE Claims PH Income">AIE Claims PH Income</option>
<option value="Skyline Cabs Commission Income">Skyline Cabs Commission Income</option>
<option value="Vehicle Insurance">Vehicle Insurance</option>
<option value="Road Tax">Road Tax</option>
<option value="VAT Referral">VAT Referral</option>
<option value="MOT">MOT</option>
<option value="Fuel">Fuel</option>
<option value="Vehicle Finance">Vehicle Finance (Loan or Lease Payments)</option>
<option value="Maintenance">Maintenance</option>
<option value="Registration Fee">Registration Fee</option>
<option value="NSL">NSL</option>
<option value="Repair">Repair</option>
<option value="Parts">Parts</option>
<option value="Cleaning">Cleaning</option>
<option value="Breakdown Cover">Breakdown Cover</option>
<option value="Tyres & Wheel Alignment">Tyres & Wheel Alignment</option>
<option value="Toll Charges & Congestion Fees">Toll Charges & Congestion Fees</option>
<option value="Parking Fees">Parking Fees (PCN)</option>
<option value="Fleet Management Software">Fleet Management Software</option>
<option value="Telematics & Tracking System">Telematics & Tracking System</option>
<option value="Vehicle Depreciation">Vehicle Depreciation</option>
<option value="Replacement Vehicle Costs">Replacement Vehicle Costs</option>
<option value="Taxi Meter">Taxi Meter</option>
<option value="CCTV Installation & Monitoring">CCTV Installation & Monitoring</option>
<option value="Office Rent">Office Rent</option>
<option value="Phone & Internet Bill">Phone & Internet Bill</option>
<option value="Office Stationery & Supplies">Office Stationery & Supplies</option>
<option value="Staff Salaries & Wages">Staff Salaries & Wages</option>
<option value="Staff Travel Expenses">Staff Travel Expenses</option>
<option value="IT & Software Expenses">IT & Software Expenses</option>
<option value="Bank Fees & Transaction Charges">Bank Fees & Transaction Charges</option>
<option value="Loan Repayments & Interest">Loan Repayments & Interest</option>
<option value="Advertising & Marketing">Advertising & Marketing</option>
<option value="Legal & Compliance Fees">Legal & Compliance Fees</option>
<option value="Training & Certification for Staff">Training & Certification for Staff</option>
<option value="Call Centre & Customer Support Costs">Call Centre & Customer Support Costs</option>
<option value="Other">Other</option>
<option value="AIE Claim VDH SPI">AIE Claim VDH SPI</option>
<option value="Skyline Cabs Office Rental Income">Skyline Cabs Office Rental Income</option>
<option value="Vehicle Sold">Vehicle Sold</option>
<option value="Office Rent Deposit Refund">Office Rent Deposit Refund</option>
<option value="New Vehicle Deposit">New Vehicle Deposit</option>
<option value="New Vehicle Purchase">New Vehicle Purchase</option>
<option value="Insurance Cost Income From Insurance-Related Charges">Insurance Cost (Income From Insurance-Related Charges)</option>
<option value="VAT Refund">VAT Refund</option>
<option value="Loan Repayment">Loan Repayment</option>
<option value="Vehicle Balloon Repayment">Vehicle Balloon Repayment</option>
<option value="Share Income">Share Income</option>
<option value="Tyre Replacement & Repairs">Tyre Replacement & Repairs</option>
<option value="Wheel Alignment & Balancing">Wheel Alignment & Balancing</option>
<option value="Battery Replacement">Battery Replacement</option>
<option value="Accident Repair">Accident Repair</option>
<option value="MOT Test Fee">MOT Test Fee</option>
<option value="Taxi Credit Card Strip Fee">Taxi Credit Card Strip Fee</option>
<option value="Year Service">Year Service</option>
<option value="Mileage Service">Mileage Service</option>
<option value="Emergency Repair">Emergency Repair</option>
<option value="Vehicle Cleaning & Valeting Services">Vehicle Cleaning & Valeting Services</option>
<option value="Windscreen & Glass Replacement Income">Windscreen & Glass Replacement Income</option>
<option value="IT & Website Software Subscription Refund">IT & Website Software Subscription Refund</option>
<option value="Somcab">Somcab</option>
<option value="Office Stationery Refund">Office Stationery Refund</option>
<option value="Office Equipment Refund">Office Equipment Refund</option>
<option value="Miscellaneous Income">Miscellaneous Income</option>
<option value="Vehicle Insurance Excess">Vehicle Insurance Excess</option>
<option value="Towing Charges">Towing Charges</option>
<option value="Breakdown Recovery">Breakdown Recovery</option>
<option value="Emergency Roadside Repairs">Emergency Roadside Repairs</option>
<option value="Bodywork">Bodywork</option>
<option value="Insurance Repair Excess Fees">Insurance Repair Excess Fees</option>
<option value="Third-Party Repair Payments">Third-Party Repair Payments</option>
<option value="Air Conditioning Servicing">Air Conditioning Servicing</option>
<option value="Client VD Payment">Client VD Payment</option>
<option value="Client TL Payment">Client TL Payment</option>
<option value="Client Referral Fee">Client Referral Fee</option>
<option value="Client Goodwill Payment">Client Goodwill Payment</option>
<option value="Vehicle Leasing Payment">Vehicle Leasing Payment</option>
<option value="Loan Payment">Loan Payment</option>
<option value="Investment">Investment</option>
<option value="Share Payment">Share Payment</option>
<option value="Office Insurance">Office Insurance</option>
<option value="VAT Payment">VAT Payment</option>
<option value="VAT Unpaid">VAT Unpaid</option>
<option value="Tax Return Payment">Tax Return Payment</option>
<option value="Corporate Tax Payment">Corporate Tax Payment</option>
<option value="Income Tax Payment">Income Tax Payment</option>
<option value="Tax Late Fee Payment">Tax Late Fee Payment</option>
<option value="VAT Late Fee Payment">VAT Late Fee Payment</option>
<option value="IT Service">IT Service</option>
<option value="Software Subscription">Software Subscription</option>
<option value="Domain Subscription Fee">Domain Subscription Fee</option>
<option value="IT & Website Developer">IT & Website Developer</option>
<option value="Accountant Fees">Accountant Fees</option>
<option value="Telephone Bill">Telephone Bill</option>
<option value="Other">Other</option>

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
                amountToPay: isPaid ? formData.amount : '0'
              });
            }}
            className="rounded border-gray-300 text-primary focus:ring-primary"
          />
          <span className="text-sm text-gray-700">Mark as Paid</span>
        </label>
      </div>

      <FormField
        type="number"
        label="Amount to Pay"
        value={formData.amountToPay}
        onChange={(e) => setFormData({ ...formData, amountToPay: e.target.value })}
        min="0"
        max={formData.amount || 0}
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
          {loading ? 'Creating...' : 'Create Invoice'}
        </button>
      </div>
    </form>
  );
};

export default InvoiceForm;