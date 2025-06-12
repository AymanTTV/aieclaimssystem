import React, { useState, useEffect } from 'react';
import { addDoc, updateDoc, doc, collection } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import FormField from '../ui/FormField';
import toast from 'react-hot-toast';

interface ExpenseItem {
  type: string;
  description: string;
  quantity: number;
  unitPrice: number;
  vat: boolean;
}

interface Props {
  onClose(): void;
  record?: any;
  collectionName: string;
}

export default function ExpenseForm({ onClose, record, collectionName }: Props) {
  const { user } = useAuth();
  const isEdit = !!record;

  const [items, setItems] = useState<ExpenseItem[]>(
    (record?.items as ExpenseItem[]) || []
  );

  const [meta, setMeta] = useState({
    date: record?.date || new Date().toISOString().slice(0, 10),
    reference: record?.reference || '',
    customerName: record?.customerName || '',
    paymentStatus: record?.paymentStatus || 'Pending',
    status: record?.status || 'Pending'
  });

  const [saving, setSaving] = useState(false);

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
      type: 'expense',
      createdBy: user.id,
      updatedAt: new Date().toISOString(),
      progress: 'in-progress'
    };

    try {
      if (isEdit && record?.id) {
        await updateDoc(doc(db, collectionName, record.id), payload);
        toast.success('Expense updated');
      } else {
        await addDoc(collection(db, collectionName), payload);
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
      <FormField
        label="Date"
        type="date"
        value={meta.date}
        onChange={(e) => setMeta({ ...meta, date: e.target.value })}
        required
      />
      <FormField
        label="Reference"
        value={meta.reference}
        onChange={(e) => setMeta({ ...meta, reference: e.target.value })}
        required
      />
      <FormField
        label="Customer/Company"
        value={meta.customerName}
        onChange={(e) => setMeta({ ...meta, customerName: e.target.value })}
        required
      />

      <div className="overflow-x-auto">
        <table className="w-full table-auto border-collapse">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 text-left">Type</th>
              <th className="p-2 text-left">Description</th>
              <th className="p-2 text-center">Qty</th>
              <th className="p-2 text-center">Unit Price</th>
              <th className="p-2 text-center">VAT</th>
              <th className="p-2 text-center">Remove</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, i) => (
              <tr key={i} className="border-t">
                <td className="p-1">
                  <FormField
                    value={it.type}
                    onChange={(e) => updateItem(i, 'type', e.target.value)}
                    required
                  />
                </td>
                <td className="p-1">
                  <FormField
                    value={it.description}
                    onChange={(e) =>
                      updateItem(i, 'description', e.target.value)
                    }
                    required
                  />
                </td>
                <td className="p-1 text-center">
                  <FormField
                    type="number"
                    value={it.quantity}
                    onChange={(e) =>
                      updateItem(i, 'quantity', +e.target.value)
                    }
                    min={1}
                    required
                  />
                </td>
                <td className="p-1 text-center">
                  <FormField
                    type="number"
                    value={it.unitPrice}
                    onChange={(e) =>
                      updateItem(i, 'unitPrice', +e.target.value)
                    }
                    min={0}
                    step="0.01"
                    required
                  />
                </td>
                <td className="p-1 text-center">
                  <input
                    type="checkbox"
                    checked={it.vat}
                    onChange={(e) =>
                      updateItem(i, 'vat', e.target.checked)
                    }
                    className="h-4 w-4"
                  />
                </td>
                <td className="p-1 text-center">
                  <button
                    type="button"
                    onClick={() => removeItem(i)}
                    className="text-red-600"
                  >
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
        className="px-3 py-1 bg-gray-100 rounded hover:bg-gray-200"
      >
        + Add Item
      </button>

      <div className="grid grid-cols-2 gap-4">
        <label className="block text-sm font-medium">
          Payment Status
          <select
            value={meta.paymentStatus}
            onChange={(e) =>
              setMeta({ ...meta, paymentStatus: e.target.value })
            }
            className="w-full mt-1 border p-2 rounded"
          >
            <option>Paid</option>
            <option>Unpaid</option>
            <option>Partially Paid</option>
          </select>
        </label>
        <label className="block text-sm font-medium">
          Status
          <select
            value={meta.status}
            onChange={(e) => setMeta({ ...meta, status: e.target.value })}
            className="w-full mt-1 border p-2 rounded"
          >
            <option>Pending</option>
            <option>Completed</option>
          </select>
        </label>
      </div>

      <div className="flex justify-end space-x-2">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 border rounded"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-primary text-white rounded"
          disabled={saving}
        >
          {saving ? 'Saving…' : isEdit ? 'Update Expense' : 'Save Expense'}
        </button>
      </div>
    </form>
  );
}
