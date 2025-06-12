// src/components/finance/InvoiceEditModal.tsx

import React, { useState, useEffect } from 'react';
import { doc, updateDoc, getDocs, collection } from 'firebase/firestore';
import { db, storage } from '../../lib/firebase';
import { InvoiceLineItem, Invoice } from '../../types/finance';
import { Vehicle, Customer } from '../../types';
import { useAuth } from '../../context/AuthContext';
import FormField from '../ui/FormField';
import SearchableSelect from '../ui/SearchableSelect';
import { createFinanceTransaction } from '../../utils/financeTransactions';
import { generateInvoicePDF } from '../../utils/invoicePdfGenerator';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import toast from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';

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

  // Dynamic list of categories from Firestore:
  const [categories, setCategories] = useState<string[]>([]);

  // Prepopulate lineItems from invoice
  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>(
    invoice.lineItems.map(li => ({ ...li }))
  );

  const [formData, setFormData] = useState({
    date: new Date(invoice.date).toISOString().split('T')[0],
    dueDate: new Date(invoice.dueDate).toISOString().split('T')[0],
    category: invoice.category,
    customCategory: invoice.customCategory || '',
    vehicleId: invoice.vehicleId || '',
    useCustomCustomer: !!invoice.customerName && !invoice.customerId,
    customerId: invoice.customerId || '',
    customerName: invoice.customerName || '',
    customerPhone: invoice.customerPhone || '',
    isAddingPayment: false,
    amountToPay: '0',
    paymentMethod: 'cash' as const,
    paymentReference: '',
    paymentNotes: '',
    uploadedDocument: null as File | null
  });

  // ── Fetch categories from Firestore on mount ──
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'invoiceCategories'));
        const fetched: string[] = [];
        snapshot.forEach(docSnap => {
          const data = docSnap.data() as { name: string };
          fetched.push(data.name);
        });
        fetched.sort((a, b) => a.localeCompare(b));
        setCategories(fetched);
      } catch (err) {
        console.error('Error fetching invoice categories:', err);
        toast.error('Failed to load categories');
      }
    };
    fetchCategories();
  }, []);

  // Compute subTotal, vatAmount, total for updated lineItems
  const computeTotals = () => {
    let subTotal = 0;
    let vatAmount = 0;

    lineItems.forEach(item => {
      const lineNet = item.quantity * item.unitPrice;
      const discountAmt = (item.discount / 100) * lineNet;
      const netAfterDiscount = lineNet - discountAmt;
      subTotal += netAfterDiscount;
      if (item.includeVAT) {
        vatAmount += netAfterDiscount * 0.2;
      }
    });

    const total = subTotal + vatAmount;
    return { subTotal, vatAmount, total };
  };

  const { subTotal, vatAmount, total } = computeTotals();

  // If “isAddingPayment” toggles on, default amountToPay = invoice.remainingAmount
  useEffect(() => {
    if (formData.isAddingPayment) {
      setFormData(fd => ({ ...fd, amountToPay: invoice.remainingAmount.toFixed(2) }));
    }
  }, [formData.isAddingPayment]);

  const handleLineChange = (
    idx: number,
    field: keyof Omit<InvoiceLineItem, 'id'>,
    value: string | boolean
  ) => {
    setLineItems(items => {
      const copy = [...items];
      const item = { ...copy[idx] } as InvoiceLineItem;

      if (field === 'description') item.description = value as string;
      if (field === 'quantity') item.quantity = parseInt(value as string) || 0;
      if (field === 'unitPrice') item.unitPrice = parseFloat(value as string) || 0;
      if (field === 'discount') item.discount = parseFloat(value as string) || 0;
      if (field === 'includeVAT') item.includeVAT = value as boolean;

      copy[idx] = item;
      return copy;
    });
  };

  const addLineItem = () => {
    setLineItems(prev => [
      ...prev,
      { id: uuidv4(), description: '', quantity: 1, unitPrice: 0, discount: 0, includeVAT: false }
    ]);
  };

  const removeLineItem = (idx: number) => {
    setLineItems(items => items.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    try {
      // Must have at least one nonzero netAfterDiscount
      if (
        lineItems.length === 0 ||
        lineItems.every(li => (li.quantity * li.unitPrice - (li.discount / 100) * (li.quantity * li.unitPrice)) === 0)
      ) {
        toast.error('At least one line item must have a nonzero net amount.');
        setLoading(false);
        return;
      }

      const { subTotal: newSub, vatAmount: newVat, total: newTot } = computeTotals();

      // Handle payment
      const payNow = parseFloat(formData.amountToPay) || 0;
      if (formData.isAddingPayment && payNow > invoice.remainingAmount) {
        toast.error('Payment cannot exceed remaining balance.');
        setLoading(false);
        return;
      }

      const totalPaid = invoice.paidAmount + (formData.isAddingPayment ? payNow : 0);
      const newRemaining = newTot - totalPaid;
      const newPaymentStatus =
        totalPaid <= 0
          ? 'pending'
          : totalPaid >= newTot
          ? 'paid'
          : 'partially_paid';

      // Build updated payments array
      const updatedPayments = [...invoice.payments];
      if (formData.isAddingPayment && payNow > 0) {
        updatedPayments.push({
          id: Date.now().toString(),
          date: new Date(),
          amount: payNow,
          method: formData.paymentMethod,
          reference: formData.paymentReference,
          notes: formData.paymentNotes,
          document: null,
          createdAt: new Date(),
          createdBy: user.id
        });
      }

      // Construct updated invoice object
      const updatedInvoice: Partial<Invoice> = {
        date: new Date(formData.date),
        dueDate: new Date(formData.dueDate),
        lineItems: lineItems.map(li => ({
          id: li.id,
          description: li.description,
          quantity: li.quantity,
          unitPrice: li.unitPrice,
          discount: li.discount,
          includeVAT: li.includeVAT
        })),
        subTotal: newSub,
        vatAmount: newVat,
        total: newTot,
        amount: newTot,
        paidAmount: totalPaid,
        remainingAmount: newRemaining,
        category: formData.category,
        customCategory: formData.category === 'Other' ? formData.customCategory : null,
        vehicleId: formData.vehicleId || null,
        useCustomCustomer: formData.useCustomCustomer,
        customerId: formData.useCustomCustomer ? null : formData.customerId,
        customerName: formData.useCustomCustomer
          ? formData.customerName
          : customers.find(c => c.id === formData.customerId)?.name || '',
        customerPhone: formData.useCustomCustomer
          ? formData.customerPhone
          : customers.find(c => c.id === formData.customerId)?.mobile || '',
        paymentStatus: newPaymentStatus,
        payments: updatedPayments,
        updatedAt: new Date()
      };

      // Update Firestore
      await updateDoc(doc(db, 'invoices', invoice.id), updatedInvoice);

      // Regenerate & reupload PDF
      const fullInvoiceObject = { id: invoice.id, ...updatedInvoice } as any;
      const pdfBlob = await generateInvoicePDF(
        fullInvoiceObject,
        vehicles.find(v => v.id === formData.vehicleId)!
      );
      const storageRef = ref(storage, `invoices/${invoice.id}/invoice.pdf`);
      const snap = await uploadBytes(storageRef, pdfBlob);
      const documentUrl = await getDownloadURL(snap.ref);
      await updateDoc(doc(db, 'invoices', invoice.id), { documentUrl });

      // If payNow > 0, create a finance transaction
      if (formData.isAddingPayment && payNow > 0) {
        await createFinanceTransaction({
          type: 'income',
          category: formData.category,
          amount: payNow,
          description: `Payment for invoice #${invoice.id.slice(-8).toUpperCase()}`,
          referenceId: invoice.id,
          vehicleId: formData.vehicleId || undefined,
          vehicleName: formData.vehicleId
            ? `${vehicles.find(v => v.id === formData.vehicleId)!.make} ${
                vehicles.find(v => v.id === formData.vehicleId)!.model
              }`
            : undefined,
          paymentMethod: formData.paymentMethod,
          paymentReference: formData.paymentReference,
          paymentStatus: newPaymentStatus
        });
      }

      toast.success('Invoice updated successfully');
      onClose();
    } catch (err) {
      console.error('Error updating invoice:', err);
      toast.error('Failed to update invoice');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* ── Customer Section ── */}
      <div className="space-y-4">
        <div>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={formData.useCustomCustomer}
              onChange={e =>
                setFormData(fd => ({
                  ...fd,
                  useCustomCustomer: e.target.checked,
                  customerId: '',
                  customerName: ''
                }))
              }
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
              onChange={e => setFormData(fd => ({ ...fd, customerName: e.target.value }))}
              required
              placeholder="Enter customer name"
            />
            <FormField
              type="tel"
              label="Phone Number"
              value={formData.customerPhone}
              onChange={e => setFormData(fd => ({ ...fd, customerPhone: e.target.value }))}
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
            onChange={id => {
              const cust = customers.find(c => c.id === id)!;
              setFormData(fd => ({
                ...fd,
                customerId: id,
                customerName: cust.name,
                customerPhone: cust.mobile
              }));
            }}
            placeholder="Search customers..."
            required
          />
        )}
      </div>

      {/* ── Basic Invoice Dates ── */}
      <div className="grid grid-cols-2 gap-4">
        <FormField
          type="date"
          label="Invoice Date"
          value={formData.date}
          onChange={e => setFormData(fd => ({ ...fd, date: e.target.value }))}
          required
        />
        <FormField
          type="date"
          label="Due Date"
          value={formData.dueDate}
          onChange={e => setFormData(fd => ({ ...fd, dueDate: e.target.value }))}
          required
        />
      </div>

      {/* ── Category ── */}
      <div>
        <label className="block text-sm font-medium text-gray-700">Category</label>
        <select
          value={formData.category}
          onChange={e => setFormData(fd => ({ ...fd, category: e.target.value }))}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
          required
        >
          <option value="">Select a category</option>
          {categories.map(catName => (
            <option key={catName} value={catName}>
              {catName}
            </option>
          ))}
          <option value="Other">Other</option>
        </select>
      </div>
      {formData.category === 'Other' && (
        <FormField
          label="Custom Category"
          value={formData.customCategory}
          onChange={e => setFormData(fd => ({ ...fd, customCategory: e.target.value }))}
          required
          placeholder="Enter custom category"
        />
      )}

      {/* ── Vehicle Selection ── */}
      <SearchableSelect
        label="Related Vehicle (Optional)"
        options={vehicles.map(v => ({
          id: v.id,
          label: `${v.make} ${v.model}`,
          subLabel: v.registrationNumber
        }))}
        value={formData.vehicleId}
        onChange={id => setFormData(fd => ({ ...fd, vehicleId: id }))}
        placeholder="Search vehicles..."
      />

      {/* ── LINE ITEMS ── */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-medium">Line Items</h3>
          <button
            type="button"
            onClick={addLineItem}
            className="text-sm text-primary hover:text-primary-600"
          >
            + Add Line
          </button>
        </div>
        <div className="space-y-3">
          {lineItems.map((item, idx) => (
            <div
              key={item.id}
              className="grid grid-cols-1 sm:grid-cols-6 gap-4 items-end p-3 border border-gray-200 rounded-md bg-gray-50"
            >
              <div className="sm:col-span-2">
                <FormField
                  label="Description"
                  value={item.description}
                  onChange={e => handleLineChange(idx, 'description', e.target.value)}
                  placeholder="Item description"
                  required
                />
              </div>

              <FormField
                type="number"
                label="Quantity"
                value={item.quantity}
                onChange={e => handleLineChange(idx, 'quantity', e.target.value)}
                min="1"
                inputClassName="w-full"
                required
              />

              <FormField
                type="number"
                label="Unit Price"
                value={item.unitPrice}
                onChange={e => handleLineChange(idx, 'unitPrice', e.target.value)}
                min="0"
                step="0.01"
                inputClassName="w-full"
                required
              />

              <FormField
                type="number"
                label="Discount (%)"
                value={item.discount}
                onChange={e => handleLineChange(idx, 'discount', e.target.value)}
                min="0"
                max="100"
                step="0.1"
                inputClassName="w-full"
              />

              <div className="flex items-center space-x-4 col-span-1 sm:col-span-1">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={item.includeVAT}
                    onChange={e => handleLineChange(idx, 'includeVAT', e.target.checked)}
                    className="rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <span className="text-sm text-gray-600">+ VAT</span>
                </label>
                <button
                  type="button"
                  onClick={() => removeLineItem(idx)}
                  className="text-red-600 hover:text-red-800"
                  title="Remove Line"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── COST SUMMARY ── */}
      <div className="bg-gray-50 p-4 rounded-lg space-y-2">
        <div className="flex justify-between text-sm">
          <span>Subtotal (net):</span>
          <span>£{subTotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>VAT (on net after discount):</span>
          <span>£{vatAmount.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-lg font-bold pt-2 border-t">
          <span>Total:</span>
          <span>£{total.toFixed(2)}</span>
        </div>
      </div>

      {/* ── OPTIONALLY ADD A PAYMENT ── */}
      <div>
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={formData.isAddingPayment}
            onChange={e =>
              setFormData(fd => ({
                ...fd,
                isAddingPayment: e.target.checked,
                amountToPay: e.target.checked ? invoice.remainingAmount.toFixed(2) : '0'
              }))
            }
            className="rounded border-gray-300 text-primary focus:ring-primary"
          />
          <span className="text-sm text-gray-700">Add Payment</span>
        </label>
      </div>

      <FormField
        type="number"
        label="Amount to Pay (£)"
        value={formData.amountToPay}
        onChange={e => setFormData(fd => ({ ...fd, amountToPay: e.target.value }))}
        min="0"
        max={invoice.remainingAmount}
        step="0.01"
        disabled={!formData.isAddingPayment}
      />

      {parseFloat(formData.amountToPay) > 0 && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Payment Method</label>
            <select
              value={formData.paymentMethod}
              onChange={e => setFormData(fd => ({ ...fd, paymentMethod: e.target.value as any }))}
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
            onChange={e => setFormData(fd => ({ ...fd, paymentReference: e.target.value }))}
            placeholder="Enter payment reference or transaction ID"
          />

          <div>
            <label className="block text-sm font-medium text-gray-700">Payment Notes</label>
            <textarea
              value={formData.paymentNotes}
              onChange={e => setFormData(fd => ({ ...fd, paymentNotes: e.target.value }))}
              rows={2}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
              placeholder="Add any notes about this payment"
            />
          </div>
        </div>
      )}

      {/* ── Upload a file (PDF/Image) ── */}
      <div>
        <label className="block text-sm font-medium text-gray-700">Upload Document (PDF/Image)</label>
        <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
          <div className="space-y-1 text-center">
            <p className="text-gray-500 text-sm">Drag & drop or click to upload</p>
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={e =>
                setFormData(fd => ({ ...fd, uploadedDocument: e.target.files?.[0] || null }))
              }
              className="sr-only"
            />
            <p className="text-xs text-gray-500">PDF or image up to 10MB</p>
          </div>
        </div>
      </div>

      {/* ── FORM ACTIONS ── */}
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
