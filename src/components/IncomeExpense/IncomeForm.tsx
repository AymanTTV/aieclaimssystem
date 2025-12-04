// src/components/IncomeExpense/IncomeForm.tsx
import React, { useEffect, useState } from 'react';
import { addDoc, collection, doc, updateDoc, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { useCustomers } from '../../hooks/useCustomers';
import FormField from '../ui/FormField';
import SearchableSelect from '../ui/SearchableSelect';
import toast from 'react-hot-toast';
import { IncomeExpenseEntry } from '../../types/incomeExpense';
import { RefreshCw } from 'lucide-react';
import { addDays, addWeeks, addMonths, addYears } from 'date-fns';

interface Props {
  onClose(): void;
  record?: IncomeExpenseEntry;
  collectionName: string;
  categoriesCollection?: string;
  initialIsRecurring?: boolean;
}

export default function IncomeForm({ onClose, record, collectionName, categoriesCollection = 'incomeExpenseCategories', initialIsRecurring = false }: Props) {
  const isEdit = !!record;
  const { user } = useAuth();
  const { customers } = useCustomers();
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);

  // Recurring State
  const [isRecurring, setIsRecurring] = useState(initialIsRecurring || !!record?.isRecurring);
  const [frequency, setFrequency] = useState<string>(record?.recurringFrequency || 'monthly');

  // Helper to format date object to datetime-local string (YYYY-MM-DDTHH:mm)
  const toDateTimeLocal = (dateVal: string | Date) => {
    const date = new Date(dateVal);
    const pad = (num: number) => num.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };

  const [form, setForm] = useState({
    customerId: '',
    customer: '',
    customerPhone: '',
    customerEmail: '',
    customerAddress: '',
    reference: '',
    // Use toDateTimeLocal for initial state
    date: record?.date ? toDateTimeLocal(record.date) : toDateTimeLocal(new Date()),
    type: '',
    category: '',
    description: '',
    quantity: 1,
    unit: '',
    net: 0,
    vat: false,
    total: 0,
    status: 'Paid' as const,
    note: ''
  });

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (record && record.type === 'income') {
      setForm({
        customerId: record.customerId || '',
        customer: record.customer,
        customerPhone: record.customerPhone || '',
        customerEmail: record.customerEmail || '',
        customerAddress: record.customerAddress || '',
        reference: record.reference,
        date: toDateTimeLocal(record.date),
        type: record.type || '',
        category: record.category || '',
        description: record.description,
        quantity: record.quantity,
        unit: record.unit,
        net: record.net,
        vat: record.vat,
        total: record.total,
        status: record.status,
        note: record.note || ''
      });
      setIsRecurring(!!record.isRecurring);
      setFrequency(record.recurringFrequency || 'monthly');
    }
  }, [record]);

  useEffect(() => {
    getDocs(collection(db, categoriesCollection)).then(snap => {
      setAvailableCategories(snap.docs.map(d => d.data().name).sort())
    })
  }, [categoriesCollection]);

  const handleCustomerChange = (id: string) => {
    const c = customers.find(cx => cx.id === id);
    setForm(prev => ({
      ...prev,
      customerId: id,
      customer: c ? c.name : (id === '' ? '' : prev.customer),
      customerPhone: c?.mobile || '',
      customerEmail: c?.email || '',
      customerAddress: c?.address || '',
    }));
  };

  useEffect(() => {
    const quantity = Number(form.quantity) || 0;
    const unit = parseFloat(form.unit) || 0;
    const net = quantity * unit;
    const total = form.vat ? Math.round(net * 1.2 * 100) / 100 : net;
    setForm(prev => ({ ...prev, net, total }));
  }, [form.quantity, form.unit, form.vat]);

  const handleChange = (field: string, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

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
    return nextDate.toISOString(); // Store as ISO
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return toast.error('Please sign in');
    setSaving(true);

    try {
      const payload: any = {
        ...form,
        // Ensure we save a proper ISO string for the main date
        date: new Date(form.date).toISOString(), 
        type: 'income' as const,
        updatedAt: new Date().toISOString()
      };

      if (isRecurring) {
        payload.isRecurring = true;
        payload.recurringFrequency = frequency;
        payload.nextRecurringDate = calculateNextDate(form.date, frequency);
      } else {
        payload.isRecurring = false;
        payload.recurringFrequency = null;
        payload.nextRecurringDate = null;
      }

      if (isEdit && record?.id) {
        await updateDoc(doc(db, collectionName, record.id), payload);
        toast.success('Income updated');
      } else {
        await addDoc(collection(db, collectionName), {
          ...payload,
          createdBy: user.id,
          createdAt: new Date().toISOString(),
          progress: 'in-progress'
        });
        toast.success('Income recorded');
      }
      onClose();
    } catch (err) {
      console.error(err);
      toast.error('Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Recurring */}
      <div className="border border-indigo-100 bg-indigo-50/50 rounded-md p-4 space-y-3">
        <div className="flex items-center">
             <input id="isRecurringIncome" type="checkbox" checked={isRecurring} onChange={(e) => setIsRecurring(e.target.checked)} className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded" />
              <label htmlFor="isRecurringIncome" className="ml-2 block text-sm font-medium text-gray-900 flex items-center">
                <RefreshCw className="w-4 h-4 mr-1 text-indigo-600" /> Re-occurring Transaction
              </label>
        </div>
        {isRecurring && (
          <div className="animate-fadeIn">
            <label className="block text-xs font-medium text-gray-700 uppercase tracking-wide">Frequency</label>
            <select value={frequency} onChange={(e) => setFrequency(e.target.value)} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md">
              <option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option><option value="quarterly">Quarterly</option><option value="biannually">Biannually</option><option value="yearly">Yearly</option>
            </select>
            <p className="mt-2 text-xs text-indigo-600">Next occurrence will be auto-generated based on the date/time selected below.</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SearchableSelect label="Customer" options={customers.map(c => ({ id: c.id, label: c.name, subLabel: `${c.mobile || ''} ${c.email ? '- ' + c.email : ''}` }))} value={form.customerId} onChange={handleCustomerChange} placeholder="Search customer..." isClearable required />
        <FormField label="Reference" value={form.reference} onChange={e => handleChange('reference', e.target.value)} required />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
         {/* --- TIME ENABLED DATE FIELD --- */}
         <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date & Time</label>
            <input 
              type="datetime-local" 
              value={form.date} 
              onChange={e => handleChange('date', e.target.value)} 
              required 
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
            />
         </div>
         {/* ------------------------------- */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
          <select value={form.category} onChange={e => handleChange('category', e.target.value)} className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm">
            <option value="">Select Category...</option>{availableCategories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      <FormField label="Description" value={form.description} onChange={e => handleChange('description', e.target.value)} required />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
        <FormField label="Quantity" type="number" min={1} value={form.quantity} onChange={e => handleChange('quantity', +e.target.value)} />
        <FormField label="Unit Price (£)" type="number" value={form.unit} onChange={e => handleChange('unit', e.target.value)} />
         <div className="flex flex-col justify-end">
           <div className="flex items-center space-x-2 h-10">
            <input type="checkbox" checked={form.vat} onChange={e => handleChange('vat', e.target.checked)} className="h-5 w-5 text-primary border-gray-300 rounded" />
            <span className="font-medium text-gray-700">+ VAT (20%)</span>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
         <FormField label="Net Total" value={form.net.toFixed(2)} readOnly className="bg-gray-100 text-gray-600" />
         <FormField label="Gross Total" value={form.total.toFixed(2)} readOnly className="bg-gray-100 font-bold text-gray-900" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Payment Status</label>
            <select value={form.status} onChange={e => handleChange('status', e.target.value)} className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm">
            <option value="Paid">Paid</option><option value="Unpaid">Unpaid</option><option value="Partially Paid">Partially Paid</option><option value="Pending">Pending</option>
            </select>
        </div>
        <FormField label="Note" value={form.note} onChange={e => handleChange('note', e.target.value)} />
      </div>

      <div className="flex justify-end space-x-3 pt-4 border-t">
        <button type="button" onClick={onClose} className="px-4 py-2 border rounded-md text-gray-700 hover:bg-gray-50">Cancel</button>
        <button type="submit" disabled={saving} className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark disabled:opacity-50 shadow-sm">{saving ? 'Saving…' : isEdit ? 'Update Income' : 'Save Income'}</button>
      </div>
    </form>
  );
}