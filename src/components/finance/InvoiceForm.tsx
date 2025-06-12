// src/components/finance/InvoiceForm.tsx

import React, { useState, useEffect } from 'react';
import { addDoc, collection, updateDoc, doc, getDocs } from 'firebase/firestore';
import { db, storage } from '../../lib/firebase';
import { Vehicle, Customer } from '../../types';
import { useAuth } from '../../context/AuthContext';
import FormField from '../ui/FormField';
import SearchableSelect from '../ui/SearchableSelect';
import { createFinanceTransaction } from '../../utils/financeTransactions';
import { generateInvoicePDF } from '../../utils/invoicePdfGenerator';
import toast from 'react-hot-toast';
import { InvoiceLineItem, Invoice } from '../../types/finance';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';

interface InvoiceFormProps {
  vehicles: Vehicle[];
  customers: Customer[];
  onClose: () => void;
}

const InvoiceForm: React.FC<InvoiceFormProps> = ({ vehicles, customers, onClose }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  // Dynamic list of categories from Firestore:
  const [categories, setCategories] = useState<string[]>([]);

  // Each “line item” has: id, description, qty, unitPrice, discount(%), includeVAT
  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>([
    { id: uuidv4(), description: '', quantity: 1, unitPrice: 0, discount: 0, includeVAT: false }
  ]);

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    dueDate: new Date().toISOString().split('T')[0],
    category: '',
    customCategory: '',
    vehicleId: '',
    useCustomCustomer: false,
    customerId: '',
    customerName: '',
    customerPhone: '',
    amountToPay: '0',
    isPaid: false,
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
        // Sort alphabetically:
        fetched.sort((a, b) => a.localeCompare(b));
        setCategories(fetched);
      } catch (err) {
        console.error('Error fetching invoice categories:', err);
        toast.error('Failed to load categories');
      }
    };
    fetchCategories();
  }, []);

  // 1) Compute subTotal = sum of (quantity×unitPrice – discountAmt)
  // 2) Compute vatAmount = sum of [if includeVAT, (netAfterDiscount × 0.2)]
  // 3) total = subTotal + vatAmount
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

  // If “isPaid” toggles on, default amountToPay = total
  useEffect(() => {
    if (formData.isPaid) {
      setFormData(fd => ({ ...fd, amountToPay: total.toFixed(2) }));
    }
  }, [formData.isPaid, total]);

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
      // Must have at least one line with nonzero netAfterDiscount
      if (
        lineItems.length === 0 ||
        lineItems.every(li => (li.quantity * li.unitPrice - (li.discount / 100) * (li.quantity * li.unitPrice)) === 0)
      ) {
        toast.error('You must add at least one line item with a nonzero net amount.');
        setLoading(false);
        return;
      }

      const amt = parseFloat(total.toFixed(2));
      const payNow = parseFloat(formData.amountToPay) || 0;
      if (payNow > amt) {
        toast.error('Amount to pay cannot exceed total invoice amount.');
        setLoading(false);
        return;
      }

      const newRemaining = amt - payNow;
      const paymentStatus =
        payNow === 0
          ? 'pending'
          : payNow >= amt
          ? 'paid'
          : 'partially_paid';

      // Build initial payments array if payNow > 0
      const payments: Invoice['payments'] = [];
      if (payNow > 0) {
        payments.push({
          id: Date.now().toString(),
          date: new Date(),
          amount: payNow,
          method: formData.paymentMethod,
          reference: formData.paymentReference,
          notes: formData.paymentNotes,
          createdAt: new Date(),
          createdBy: user.id,
          document: null
        });
      }

      // Prepare payload
      const invoicePayload: Partial<Invoice> = {
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
        subTotal,
        vatAmount,
        total: amt,
        amount: amt,
        paidAmount: payNow,
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
        paymentStatus,
        payments,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // 1) Create Firestore document
      const docRef = await addDoc(collection(db, 'invoices'), invoicePayload);

      // 2) Generate PDF & upload
      const invoiceToPrint = { id: docRef.id, ...invoicePayload } as any;
      const pdfBlob = await generateInvoicePDF(
        invoiceToPrint,
        vehicles.find(v => v.id === formData.vehicleId)!
      );
      const storageRef = ref(storage, `invoices/${docRef.id}/invoice.pdf`);
      const snap = await uploadBytes(storageRef, pdfBlob);
      const documentUrl = await getDownloadURL(snap.ref);

      // 3) Update invoice with PDF URL
      await updateDoc(doc(db, 'invoices', docRef.id), { documentUrl });

      // 4) If payNow > 0, create a finance transaction
      if (payNow > 0) {
        await createFinanceTransaction({
          type: 'income',
          category: formData.category,
          amount: payNow,
          description: `Payment for invoice #${docRef.id.slice(-8).toUpperCase()}`,
          referenceId: docRef.id,
          vehicleId: formData.vehicleId || undefined,
          vehicleName: formData.vehicleId
            ? `${vehicles.find(v => v.id === formData.vehicleId)!.make} ${
                vehicles.find(v => v.id === formData.vehicleId)!.model
              }`
            : undefined,
          paymentMethod: formData.paymentMethod,
          paymentReference: formData.paymentReference,
          paymentStatus
        });
      }

      toast.success('Invoice created successfully');
      onClose();
    } catch (err) {
      console.error('Error creating invoice:', err);
      toast.error('Failed to create invoice');
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

      {/* ── Category Selection ── */}
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

      {/* ── Vehicle Selection (optional) ── */}
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

      {/* ── LINE ITEMS SECTION ── */}
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

      {/* ── AMOUNT TO PAY ── */}
      <div>
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={formData.isPaid}
            onChange={e =>
              setFormData(fd => ({
                ...fd,
                isPaid: e.target.checked,
                amountToPay: e.target.checked ? total.toFixed(2) : '0'
              }))
            }
            className="rounded border-gray-300 text-primary focus:ring-primary"
          />
          <span className="text-sm text-gray-700">Mark as Paid (pay now)</span>
        </label>
      </div>

      <FormField
        type="number"
        label="Amount to Pay (£)"
        value={formData.amountToPay}
        onChange={e => setFormData(fd => ({ ...fd, amountToPay: e.target.value }))}
        min="0"
        max={total}
        step="0.01"
        disabled={!formData.isPaid}
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

      {/* ── Upload a file (invoice PDF) ── */}
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
          {loading ? 'Creating...' : 'Create Invoice'}
        </button>
      </div>
    </form>
  );
};

export default InvoiceForm;
