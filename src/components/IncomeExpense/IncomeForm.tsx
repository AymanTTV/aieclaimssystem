import React, { useEffect, useState } from 'react';
import { addDoc, collection, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { useCustomers } from '../../hooks/useCustomers';
import FormField from '../ui/FormField';
import SearchableSelect from '../ui/SearchableSelect';
import toast from 'react-hot-toast';
import { IncomeExpenseEntry } from '../../types/incomeExpense';

interface Props {
  onClose(): void;
  record?: IncomeExpenseEntry;
  collectionName: string;
}

export default function IncomeForm({ onClose, record, collectionName }: Props) {
  const isEdit = !!record;
  const { user } = useAuth();
  const { customers } = useCustomers();

  const [form, setForm] = useState({
    customerId: '',
    customer: '',
    reference: '',
    date: new Date().toISOString().slice(0, 10),
    type: '',
    description: '',
    quantity: 1,
    unit: '',
    net: 0,
    vat: false,
    total: 0,
    status: 'Paid',
    note: ''
  });

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (record && record.type === 'income') {
      setForm({
        customerId: record.customerId || '',
        customer: record.customer,
        reference: record.reference,
        date: record.date.slice(0, 10),
        type: record.type || '',
        description: record.description,
        quantity: record.quantity,
        unit: record.unit,
        net: record.net,
        vat: record.vat,
        total: record.total,
        status: record.status,
        note: record.note || ''
      });
    }
  }, [record]);

  useEffect(() => {
    const customer = customers.find(c => c.id === form.customerId);
    if (customer) {
      setForm(prev => ({ ...prev, customer: customer.name }));
    }
  }, [form.customerId, customers]);

  // Recalculate net and total automatically
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return toast.error('Please sign in');
    setSaving(true);

    try {
      if (isEdit && record?.id) {
        await updateDoc(doc(db, collectionName, record.id), {
          ...form,
          updatedAt: new Date().toISOString()
        });
        toast.success('Income updated');
      } else {
        await addDoc(collection(db, collectionName), {
          ...form,
          type: 'income',
          createdBy: user.id,
          updatedAt: new Date().toISOString()
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
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Customer selector + manual override */}
      <div>
        <label className="block text-sm font-medium text-gray-700">Customer</label>
        <div className="flex space-x-2 mt-1">
          <SearchableSelect
            options={customers.map(c => ({ id: c.id, label: c.name }))}
            value={form.customerId}
            onChange={(id) => handleChange('customerId', id)}
          />
          <FormField
            placeholder="Or type manually…"
            value={form.customer}
            onChange={(e) => handleChange('customer', e.target.value)}
          />
        </div>
      </div>

      {/* Ref + Date */}
      <div className="grid grid-cols-2 gap-4">
        <FormField
          label="Reference"
          value={form.reference}
          onChange={e => handleChange('reference', e.target.value)}
        />
        <FormField
          label="Date"
          type="date"
          value={form.date}
          onChange={e => handleChange('date', e.target.value)}
        />
      </div>

      {/* Type + Description */}
      <div className="grid grid-cols-2 gap-4">
        <FormField
          label="Type"
          value={form.type}
          onChange={e => handleChange('type', e.target.value)}
        />
        <FormField
          label="Description"
          value={form.description}
          onChange={e => handleChange('description', e.target.value)}
        />
      </div>

      {/* Quantity + Unit */}
      <div className="grid grid-cols-2 gap-4">
        <FormField
          label="Quantity"
          type="number"
          min={1}
          value={form.quantity}
          onChange={e => handleChange('quantity', +e.target.value)}
        />
        <FormField
          label="Unit Price"
          type="number"
          value={form.unit}
          onChange={e => handleChange('unit', e.target.value)}
        />
      </div>

      {/* Net + VAT + Total */}
      <div className="grid grid-cols-3 gap-4">
        <FormField
          label="Net (£)"
          type="number"
          value={form.net}
          readOnly
        />
        <div className="flex items-center space-x-2 mt-6">
          <input
            type="checkbox"
            checked={form.vat}
            onChange={e => handleChange('vat', e.target.checked)}
            className="h-4 w-4 text-primary border-gray-300 rounded"
          />
          <span>+ VAT (20%)</span>
        </div>
        <FormField
          label="Total (£)"
          type="number"
          value={form.total}
          readOnly
        />
      </div>

      {/* Status */}
      <div>
        <label className="block text-sm font-medium">Payment Status</label>
        <select
          value={form.status}
          onChange={e => handleChange('status', e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300"
        >
          <option>Paid</option>
          <option>Unpaid</option>
          <option>Partially Paid</option>
          <option>Pending</option>
        </select>
      </div>

      {/* Note */}
      <FormField
        label="Note"
        value={form.note}
        onChange={e => handleChange('note', e.target.value)}
      />

      {/* Buttons */}
      <div className="flex justify-end space-x-2 pt-2">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 border rounded"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 bg-primary text-white rounded disabled:opacity-50"
        >
          {saving ? 'Saving…' : isEdit ? 'Update Income' : 'Save Income'}
        </button>
      </div>
    </form>
  );
}
