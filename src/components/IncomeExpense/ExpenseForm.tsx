import React, { useState, useEffect } from 'react';
import { addDoc, updateDoc, doc, collection, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import FormField from '../ui/FormField';
import SearchableSelect from '../ui/SearchableSelect';
import { useCustomers } from '../../hooks/useCustomers';
import toast from 'react-hot-toast';
import { IncomeExpenseEntry, ExpenseItem } from '../../types/incomeExpense';

interface Props {
  onClose(): void;
  record?: IncomeExpenseEntry;
  collectionName: string;
  categoriesCollection?: string;
}

export default function ExpenseForm({ onClose, record, collectionName, categoriesCollection = 'incomeExpenseCategories' }: Props) {
  const { user } = useAuth();
  const isEdit = !!record;
  const { customers } = useCustomers();
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);

  // Use type assertion to access items property safely
  const recordItems = record && 'items' in record ? (record as any).items as ExpenseItem[] : [];

  const [items, setItems] = useState<ExpenseItem[]>(recordItems.length > 0 ? recordItems : []);

  const [meta, setMeta] = useState({
    customerId: record?.customerId || '',
    customer: record?.customer || '',
    customerPhone: record?.customerPhone || '',
    customerEmail: record?.customerEmail || '',
    customerAddress: record?.customerAddress || '',

    date: record?.date || new Date().toISOString().slice(0, 10),
    reference: record?.reference || '',
    category: record?.category || '',
    
    paymentStatus: record?.status || 'Pending',
    status: (record as any)?.progress || 'in-progress',
    note: record?.note || ''
  });

  const [saving, setSaving] = useState(false);

  // Fetch categories
  useEffect(() => {
    getDocs(collection(db, categoriesCollection)).then(snap => {
      setAvailableCategories(snap.docs.map(d => d.data().name).sort())
    })
  }, [categoriesCollection]);

  // Handle Customer
  const handleCustomerChange = (id: string) => {
    const c = customers.find(cx => cx.id === id);
    setMeta(prev => ({
      ...prev,
      customerId: id,
      customer: c ? c.name : (id === '' ? '' : prev.customer),
      customerPhone: c?.mobile || '',
      customerEmail: c?.email || '',
      customerAddress: c?.address || '',
    }));
  };

  const addItem = () =>
    setItems([...items, { type: '', description: '', quantity: 1, unitPrice: 0, vat: false }]);

  const updateItem = (i: number, field: keyof ExpenseItem, val: any) =>
    setItems((it) =>
      it.map((x, idx) => (idx === i ? { ...x, [field]: val } : x))
    );

  const removeItem = (i: number) =>
    setItems((it) => it.filter((_, idx) => idx !== i));

  const totalCost = items.reduce((sum, it) => {
    return sum + it.quantity * it.unitPrice * (it.vat ? 1.2 : 1);
  }, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return toast.error('You must be signed in.');
    setSaving(true);

    const payload = {
      ...meta,
      items,
      totalCost,
      type: 'expense' as const,
      updatedAt: new Date().toISOString(),
      status: meta.paymentStatus, 
      progress: meta.status 
    };

    try {
      if (isEdit && record?.id) {
        await updateDoc(doc(db, collectionName, record.id), payload);
        toast.success('Expense updated');
      } else {
        await addDoc(collection(db, collectionName), {
           ...payload,
           createdBy: user.id,
           createdAt: new Date().toISOString(), // ADDED: Crucial for split logic
        });
        toast.success('Expense recorded');
      }
      onClose();
    } catch (err) {
      console.error(err);
      toast.error('Failed to save expense');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      
      {/* Row 1: Customer & Ref */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SearchableSelect
          label="Customer / Payee"
          options={customers.map(c => ({ 
            id: c.id, 
            label: c.name, 
            subLabel: `${c.mobile || ''} ${c.email ? '- ' + c.email : ''}` 
          }))}
          value={meta.customerId}
          onChange={handleCustomerChange}
          placeholder="Search customer..."
          isClearable
          required
        />
        <FormField
          label="Reference"
          value={meta.reference}
          onChange={(e) => setMeta({ ...meta, reference: e.target.value })}
          required
        />
      </div>

      {/* Row 2: Date & Category */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
            label="Date"
            type="date"
            value={meta.date}
            onChange={(e) => setMeta({ ...meta, date: e.target.value })}
            required
        />
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
          <select
            value={meta.category}
            onChange={(e) => setMeta({ ...meta, category: e.target.value })}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
          >
            <option value="">Select Category...</option>
            {availableCategories.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Expense Items Table */}
      <div className="overflow-x-auto border rounded-lg bg-white">
        <table className="w-full table-auto border-collapse">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="p-2 text-left">Type</th>
              <th className="p-2 text-left">Description</th>
              <th className="p-2 text-center">Qty</th>
              <th className="p-2 text-center">Unit Price</th>
              <th className="p-2 text-center">VAT</th>
              <th className="p-2 text-center"></th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {items.map((it, i) => (
              <tr key={i} className="border-t hover:bg-gray-50">
                <td className="p-2">
                  <input
                    className="w-full border-gray-300 rounded-md text-sm"
                    value={it.type}
                    onChange={(e) => updateItem(i, 'type', e.target.value)}
                    placeholder="Item type"
                    required
                  />
                </td>
                <td className="p-2">
                  <input
                    className="w-full border-gray-300 rounded-md text-sm"
                    value={it.description}
                    onChange={(e) => updateItem(i, 'description', e.target.value)}
                    placeholder="Description"
                    required
                  />
                </td>
                <td className="p-2 w-20">
                  <input
                    type="number"
                    className="w-full border-gray-300 rounded-md text-center text-sm"
                    value={it.quantity}
                    onChange={(e) => updateItem(i, 'quantity', +e.target.value)}
                    min={1}
                    required
                  />
                </td>
                <td className="p-2 w-24">
                  <input
                    type="number"
                    className="w-full border-gray-300 rounded-md text-center text-sm"
                    value={it.unitPrice}
                    onChange={(e) => updateItem(i, 'unitPrice', +e.target.value)}
                    min={0}
                    step="0.01"
                    required
                  />
                </td>
                <td className="p-2 text-center">
                  <input
                    type="checkbox"
                    checked={it.vat}
                    onChange={(e) => updateItem(i, 'vat', e.target.checked)}
                    className="h-4 w-4 text-primary border-gray-300 rounded"
                  />
                </td>
                <td className="p-2 text-center">
                  <button type="button" onClick={() => removeItem(i)} className="text-red-600 hover:text-red-800 font-medium text-xs">
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <button
        type="button"
        onClick={addItem}
        className="px-3 py-1.5 bg-gray-100 text-gray-700 text-sm font-medium rounded hover:bg-gray-200 border border-gray-200"
      >
        + Add Item
      </button>

      <div className="flex justify-end">
         <div className="text-lg font-bold text-gray-800">
             Total Cost: £{totalCost.toLocaleString(undefined, {minimumFractionDigits: 2})}
         </div>
      </div>

      {/* Status & Notes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
           <label className="block text-sm font-medium text-gray-700">Payment Status</label>
            <select
                value={meta.paymentStatus}
                onChange={(e) => setMeta({ ...meta, paymentStatus: e.target.value })}
                className="w-full mt-1 border-gray-300 rounded-md shadow-sm focus:border-primary focus:ring-primary"
            >
                <option>Paid</option>
                <option>Unpaid</option>
                <option>Partially Paid</option>
                <option>Pending</option>
            </select>
        </div>
         <div>
            <label className="block text-sm font-medium text-gray-700">Progress Status</label>
            <select
                value={meta.status}
                onChange={(e) => setMeta({ ...meta, status: e.target.value })}
                className="w-full mt-1 border-gray-300 rounded-md shadow-sm focus:border-primary focus:ring-primary"
            >
                <option value="in-progress">In Progress</option>
                <option value="completed">Completed</option>
            </select>
        </div>
      </div>
      
      <FormField
         label="Note"
         value={meta.note}
         onChange={(e) => setMeta({ ...meta, note: e.target.value })}
      />

      <div className="flex justify-end space-x-3 pt-4 border-t">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 border rounded-md text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark disabled:opacity-50 shadow-sm"
          disabled={saving}
        >
          {saving ? 'Saving…' : isEdit ? 'Update Expense' : 'Save Expense'}
        </button>
      </div>
    </form>
  );
}