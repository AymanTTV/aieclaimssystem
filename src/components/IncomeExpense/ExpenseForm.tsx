// src/components/IncomeExpense/ExpenseForm.tsx
import React, { useState, useEffect } from 'react';
import { addDoc, updateDoc, doc, collection, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import FormField from '../ui/FormField';
import SearchableSelect from '../ui/SearchableSelect';
import { useCustomers } from '../../hooks/useCustomers';
import toast from 'react-hot-toast';
import { IncomeExpenseEntry, ExpenseItem } from '../../types/incomeExpense';
import { RefreshCw, Trash2, Plus } from 'lucide-react'; 
import { addDays, addWeeks, addMonths, addYears } from 'date-fns';

interface Props {
  onClose(): void;
  record?: IncomeExpenseEntry;
  collectionName: string;
  categoriesCollection?: string;
  initialIsRecurring?: boolean; 
}

export default function ExpenseForm({ onClose, record, collectionName, categoriesCollection = 'incomeExpenseCategories', initialIsRecurring = false }: Props) {
  const { user } = useAuth();
  const isEdit = !!record;
  const { customers } = useCustomers();
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);

  // Recurring State
  const [isRecurring, setIsRecurring] = useState(initialIsRecurring || !!record?.isRecurring);
  const [frequency, setFrequency] = useState<string>(record?.recurringFrequency || 'monthly');

  const recordItems = record && 'items' in record ? (record as any).items as ExpenseItem[] : [];
  const [items, setItems] = useState<ExpenseItem[]>(recordItems.length > 0 ? recordItems : []);

  // Helper to format date object to datetime-local string
  const toDateTimeLocal = (dateVal: string | Date) => {
    const date = new Date(dateVal);
    const pad = (num: number) => num.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };

  const [meta, setMeta] = useState({
    customerId: record?.customerId || '',
    customer: record?.customer || '',
    customerPhone: record?.customerPhone || '',
    customerEmail: record?.customerEmail || '',
    customerAddress: record?.customerAddress || '',
    // Date & Time
    date: record?.date ? toDateTimeLocal(record.date) : toDateTimeLocal(new Date()),
    reference: record?.reference || '',
    category: record?.category || '',
    paymentStatus: record?.status || 'Pending',
    status: (record as any)?.progress || 'in-progress',
    note: record?.note || ''
  });

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getDocs(collection(db, categoriesCollection)).then(snap => {
      setAvailableCategories(snap.docs.map(d => d.data().name).sort())
    })
  }, [categoriesCollection]);

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

  const addItem = () => setItems([...items, { type: '', description: '', quantity: 1, unitPrice: 0, vat: false }]);
  const updateItem = (i: number, field: keyof ExpenseItem, val: any) => setItems((it) => it.map((x, idx) => (idx === i ? { ...x, [field]: val } : x)));
  const removeItem = (i: number) => setItems((it) => it.filter((_, idx) => idx !== i));

  const totalCost = items.reduce((sum, it) => sum + it.quantity * it.unitPrice * (it.vat ? 1.2 : 1), 0);

  const calculateNextDate = (dateStr: string, freq: string): string => {
    const date = new Date(dateStr);
    let nextDate: Date;
    switch (freq) {
      case 'daily': nextDate = addDays(date, 1); break;
      case 'weekly': nextDate = addWeeks(date, 1); break;
      case 'monthly': nextDate = addMonths(date, 1); break;
      case 'quarterly': nextDate = addMonths(date, 3); break;
      case 'biannually': nextDate = addMonths(date, 6); break;
      case 'yearly': nextDate = addYears(date, 1); break;
      default: nextDate = addMonths(date, 1);
    }
    return nextDate.toISOString();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return toast.error('You must be signed in.');
    setSaving(true);

    const payload: any = {
      ...meta,
      date: new Date(meta.date).toISOString(), // Ensure ISO string on save
      items,
      totalCost,
      type: 'expense' as const,
      updatedAt: new Date().toISOString(),
      status: meta.paymentStatus, 
      progress: meta.status 
    };

    // --- RECURRING LOGIC FIX ---
    if (isRecurring) {
        payload.isRecurring = true;
        payload.recurringFrequency = frequency;
        
        // Only set nextRecurringDate if new or previously not recurring
        if (!record || !record.isRecurring) {
            payload.nextRecurringDate = calculateNextDate(meta.date, frequency);
        }
    } else {
        payload.isRecurring = false;
        payload.recurringFrequency = null;
        payload.nextRecurringDate = null;
    }
    // ---------------------------

    try {
      if (isEdit && record?.id) {
        await updateDoc(doc(db, collectionName, record.id), payload);
        toast.success('Expense updated');
      } else {
        await addDoc(collection(db, collectionName), {
           ...payload,
           createdBy: user.id,
           createdAt: new Date().toISOString(),
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
      {/* Recurring */}
      <div className="border border-indigo-100 bg-indigo-50/50 rounded-md p-4 space-y-3">
        <div className="flex items-center">
             <input id="isRecurringExpense" type="checkbox" checked={isRecurring} onChange={(e) => setIsRecurring(e.target.checked)} className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded" />
              <label htmlFor="isRecurringExpense" className="ml-2 block text-sm font-medium text-gray-900 flex items-center">
                <RefreshCw className="w-4 h-4 mr-1 text-indigo-600" /> Re-occurring Transaction
              </label>
        </div>
        {isRecurring && (
          <div className="animate-fadeIn">
            <label className="block text-xs font-medium text-gray-700 uppercase tracking-wide">Frequency</label>
            <select value={frequency} onChange={(e) => setFrequency(e.target.value)} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md">
              <option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option><option value="quarterly">Quarterly</option><option value="biannually">Biannually</option><option value="yearly">Yearly</option>
            </select>
            <p className="mt-2 text-xs text-indigo-600">Next occurrence will be auto-generated based on date + frequency.</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SearchableSelect label="Customer / Payee" options={customers.map(c => ({ id: c.id, label: c.name, subLabel: `${c.mobile || ''} ${c.email ? '- ' + c.email : ''}` }))} value={meta.customerId} onChange={handleCustomerChange} placeholder="Search customer..." isClearable required />
        <FormField label="Reference" value={meta.reference} onChange={(e) => setMeta({ ...meta, reference: e.target.value })} required />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* --- TIME ENABLED DATE FIELD --- */}
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date & Time</label>
            <input 
              type="datetime-local" 
              value={meta.date} 
              onChange={(e) => setMeta({ ...meta, date: e.target.value })} 
              required 
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
            />
        </div>
        {/* ------------------------------- */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
          <select value={meta.category} onChange={(e) => setMeta({ ...meta, category: e.target.value })} className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm">
            <option value="">Select Category...</option>{availableCategories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {/* --- IMPROVED ITEM TABLE --- */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <div className="bg-gray-50 border-b border-gray-200 px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider grid grid-cols-[1.5fr,2fr,80px,100px,60px,60px] gap-2">
            <div>Type</div>
            <div>Description</div>
            <div className="text-center">Qty</div>
            <div className="text-center">Unit Price</div>
            <div className="text-center">VAT</div>
            <div className="text-center"></div>
        </div>
        
        <div className="divide-y divide-gray-200 bg-white">
            {items.map((it, i) => (
              <div key={i} className="grid grid-cols-[1.5fr,2fr,80px,100px,60px,60px] gap-2 items-center p-3 hover:bg-gray-50 transition-colors">
                {/* Type */}
                <input
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm py-2 px-3"
                    value={it.type}
                    onChange={(e) => updateItem(i, 'type', e.target.value)}
                    placeholder="Item Type"
                    required
                />
                
                {/* Description */}
                <input
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm py-2 px-3"
                    value={it.description}
                    onChange={(e) => updateItem(i, 'description', e.target.value)}
                    placeholder="Description"
                    required
                />

                {/* Qty */}
                <input
                    type="number"
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm py-2 text-center"
                    value={it.quantity}
                    onChange={(e) => updateItem(i, 'quantity', +e.target.value)}
                    min={1}
                    required
                />

                {/* Price */}
                <input
                    type="number"
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm py-2 text-center"
                    value={it.unitPrice}
                    onChange={(e) => updateItem(i, 'unitPrice', +e.target.value)}
                    min={0}
                    step="0.01"
                    required
                />

                {/* VAT */}
                <div className="flex justify-center">
                    <input
                        type="checkbox"
                        checked={it.vat}
                        onChange={(e) => updateItem(i, 'vat', e.target.checked)}
                        className="h-5 w-5 text-primary border-gray-300 rounded focus:ring-primary"
                    />
                </div>

                {/* Remove */}
                <div className="flex justify-center">
                    <button type="button" onClick={() => removeItem(i)} className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-50 transition-colors" title="Remove Item">
                        <Trash2 className="h-4 w-4" />
                    </button>
                </div>
              </div>
            ))}
            
            {items.length === 0 && (
                <div className="p-6 text-center text-sm text-gray-500">
                    No expense items added yet. Click below to add one.
                </div>
            )}
        </div>
        
        {/* Footer / Add Button */}
        <div className="bg-gray-50 border-t border-gray-200 px-4 py-3">
            <button
                type="button"
                onClick={addItem}
                className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            >
                <Plus className="h-4 w-4 mr-1.5 text-gray-500" /> Add New Item
            </button>
        </div>
      </div>
      {/* --------------------------- */}

      <div className="flex justify-end"><div className="text-lg font-bold text-gray-800">Total Cost: £{totalCost.toLocaleString(undefined, {minimumFractionDigits: 2})}</div></div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
           <label className="block text-sm font-medium text-gray-700">Payment Status</label>
            <select value={meta.paymentStatus} onChange={(e) => setMeta({ ...meta, paymentStatus: e.target.value })} className="w-full mt-1 border-gray-300 rounded-md shadow-sm focus:border-primary focus:ring-primary">
                <option>Paid</option><option>Unpaid</option><option>Partially Paid</option><option>Pending</option>
            </select>
        </div>
         <div>
            <label className="block text-sm font-medium text-gray-700">Progress Status</label>
            <select value={meta.status} onChange={(e) => setMeta({ ...meta, status: e.target.value })} className="w-full mt-1 border-gray-300 rounded-md shadow-sm focus:border-primary focus:ring-primary">
                <option value="in-progress">In Progress</option><option value="completed">Completed</option>
            </select>
        </div>
      </div>
      <FormField label="Note" value={meta.note} onChange={(e) => setMeta({ ...meta, note: e.target.value })} />

      <div className="flex justify-end space-x-3 pt-4 border-t">
        <button type="button" onClick={onClose} className="px-4 py-2 border rounded-md text-gray-700 hover:bg-gray-50">Cancel</button>
        <button type="submit" className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark disabled:opacity-50 shadow-sm" disabled={saving}>{saving ? 'Saving…' : isEdit ? 'Update Expense' : 'Save Expense'}</button>
      </div>
    </form>
  );
}