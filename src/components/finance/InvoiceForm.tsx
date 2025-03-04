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
        customerName: formData.useCustomCustomer ? formData.customerName : null,
        customerPhone: formData.useCustomCustomer ? formData.customerPhone : null,
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
  <option value="rental">Rental</option>
  <option value="maintenance_income">Maintenance Income</option>
  <option value="refunded_income">Refunded Income</option>
  <option value="insurance_income">Insurance Income</option>
  <option value="advertising_income">Advertising Income</option>
  <option value="vd_payment_income">VD Payment Income</option>
  <option value="road_tax_refund_income">Road Tax Refund Income</option>
  <option value="commission_income">Commission Income</option>
  <option value="investment_income">Investment Income</option>
  <option value="loan_repayments_income">Loan Repayments Income</option>
  <option value="aie_claims_vd_income">AIE Claims VD Income</option>
  <option value="aie_claims_hire_income">AIE Claims Hire Income</option>
  <option value="aie_claims_pi_income">AIE Claims PI Income</option>
  <option value="aie_claims_domestic_income">AIE Claims Domestic Income</option>
  <option value="aie_claims_ph_income">AIE Claims PH Income</option>
  <option value="skyline_cabs_commission_income">Skyline Cabs Commission Income</option>
  <option value="vehicle_insurance">Vehicle Insurance</option>
  <option value="road_tax">Road Tax</option>
  <option value="vat_referral">VAT Referral</option>
  <option value="mot">MOT</option>
  <option value="fuel">Fuel</option>
  <option value="vehicle_finance">Vehicle Finance (Loan or Lease Payments)</option>
  <option value="maintenance">Maintenance</option>
  <option value="registration_fee">Registration Fee</option>
  <option value="nsl">NSL</option>
  <option value="repair">Repair</option>
  <option value="parts">Parts</option>
  <option value="cleaning">Cleaning</option>
  <option value="breakdown_cover">Breakdown Cover</option>
  <option value="tyres_wheel_alignment">Tyres & Wheel Alignment</option>
  <option value="toll_charges_congestion_fees">Toll Charges & Congestion Fees</option>
  <option value="parking_fees">Parking Fees (PCN)</option>
  <option value="fleet_management_software">Fleet Management Software</option>
  <option value="telematics_tracking_system">Telematics & Tracking System</option>
  <option value="vehicle_depreciation">Vehicle Depreciation</option>
  <option value="replacement_vehicle_costs">Replacement Vehicle Costs</option>
  <option value="taxi_meter">Taxi Meter</option>
  <option value="cctv_installation_monitoring">CCTV Installation & Monitoring</option>
  <option value="office_rent">Office Rent</option>
  <option value="phone_internet_bill">Phone & Internet Bill</option>
  <option value="office_stationery_supplies">Office Stationery & Supplies</option>
  <option value="staff_salaries_wages">Staff Salaries & Wages</option>
  <option value="staff_travel_expenses">Staff Travel Expenses</option>
  <option value="it_software_expenses">IT & Software Expenses</option>
  <option value="bank_fees_transaction_charges">Bank Fees & Transaction Charges</option>
  <option value="loan_repayments_interest">Loan Repayments & Interest</option>
  <option value="advertising_marketing">Advertising & Marketing</option>
  <option value="legal_compliance_fees">Legal & Compliance Fees</option>
  <option value="training_certification_staff">Training & Certification for Staff</option>
  <option value="call_centre_customer_support_costs">Call Centre & Customer Support Costs</option>
  <option value="other">Other</option>
  <option value="aie_claim_vdhspi">Aie Claim Vdhspi</option>
  <option value="skyline_cabs_office_rental_income">Skyline Cabs Office Rental Income</option>
  <option value="vehicle_sold">Vehicle Sold</option>
  <option value="office_rent_deposit_refund">Office Rent Deposit Refund</option>
  <option value="new_vehicle_deposit">New Vehicle Deposit</option>
  <option value="new_vehicle_purchase">New Vehicle Purchase</option>
  <option value="insurance_cost_income_from_insurance-related_charges">Insurance Cost (Income From Insurance-Related Charges)</option>
  <option value="vat_refund">Vat Refund</option>
  <option value="loan_repayment">Loan Repayment</option>
  <option value="vehicle_balloon_repayment">Vehicle Balloon Repayment</option>
  <option value="share_income">Share Income</option>
  <option value="tyre_replacement_repairs">Tyre Replacement & Repairs</option>
  <option value="wheel_alignment_balancing">Wheel Alignment & Balancing</option>
  <option value="battery_replacement">Battery Replacement</option>
  <option value="accident_repair">Accident Repair</option>
  <option value="mot_test_fee">Mot Test Fee</option>
  <option value="taxi_credit_card_strip_fee">Taxi Credit Card Strip Fee</option>
  <option value="year_service">Year Service</option>
  <option value="mileage_service">Mileage Service</option>
  <option value="emergency_repair">Emergency Repair</option>
  <option value="vehicle_cleaning_valeting_services">Vehicle Cleaning & Valeting Services</option>
  <option value="windscreen_glass_replacement_income">Windscreen & Glass Replacement Income</option>
  <option value="it_website_software_subscription_refund">It & Website Software Subscription Refund</option>
  <option value="somcab">Somcab</option>
  <option value="office_stationery_refund">Office Stationery Refund</option>
  <option value="office_equipment_refund">Office Equipment Refund</option>
  <option value="miscellaneous_income">Miscellaneous Income</option>
  <option value="vehicle_insurance_excess">Vehicle Insurance Excess</option>
  <option value="towing_charges">Towing Charges</option>
  <option value="breakdown_recovery">Breakdown Recovery</option>
  <option value="emergency_roadside_repairs">Emergency Roadside Repairs</option>
  <option value="bodywork">Bodywork</option>
  <option value="insurance_repair_excess_fees">Insurance Repair Excess Fees</option>
  <option value="third-party_repair_payments">Third-Party Repair Payments</option>
  <option value="air_conditioning_servicing">Air Conditioning Servicing</option>
  <option value="client_vd_payment">Client Vd Payment</option>
  <option value="client_tl_payment">Client Tl Payment</option>
  <option value="client_referral_fee">Client Referral Fee</option>
  <option value="client_goodwill_payment">Client Goodwill Payment</option>
  <option value="vehicle_leasing_payment">Vehicle Leasing Payment</option>
  <option value="loan_payment">Loan Payment</option>
  <option value="investment">Investment</option>
  <option value="share_payment">Share Payment</option>
  <option value="office_insurance">Office Insurance</option>
  <option value="vat_payment">Vat Payment</option>
  <option value="vat_unpaid">Vat Unpaid</option>
  <option value="tax_return_payment">Tax Return Payment</option>
  <option value="corporate_tax_payment">Corporate Tax Payment</option>
  <option value="income_tax_payment">Income Tax Payment</option>
  <option value="tax_late_fee_payment">Tax Late Fee Payment</option>
  <option value="vat_late_fee_payment">Vat Late Fee Payment</option>
  <option value="it_service">It Service</option>
  <option value="software_subscription">Software Subscription</option>
  <option value="domain_subscription_fee">Domain Subscription Fee</option>
  <option value="it_website_developer">It & Website Developer</option>
  <option value="accountant_fees">Accountant Fees</option>
  <option value="telephone_bill">Telephone Bill</option>
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