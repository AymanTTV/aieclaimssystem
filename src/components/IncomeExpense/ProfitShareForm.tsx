// src/components/IncomeExpense/ProfitShareForm.tsx

import React, { useState, useEffect } from 'react';
import {
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import FormField from '../ui/FormField';
import { Trash2, Plus } from 'lucide-react';
import { useFormattedDisplay } from '../../hooks/useFormattedDisplay';
import { ProfitShare, Recipient, IncomeExpenseEntry } from '../../types/incomeExpense';

interface Props {
  onClose(): void;
  shareToEdit?: ProfitShare | null;
  onEditRequested?: (share: ProfitShare | null) => void;
  collectionName: string;
  records: IncomeExpenseEntry[]; // ✅ pass records directly
}

export default function ProfitShareForm({
  onClose,
  shareToEdit = null,
  onEditRequested,
  collectionName,
  records
}: Props) {
  const { user } = useAuth();
  const { formatCurrency } = useFormattedDisplay();

  const [history, setHistory] = useState<ProfitShare[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(false);

  // Load share history from selected collection
  useEffect(() => {
    const unsub = onSnapshot(collection(db, collectionName), snap => {
      setHistory(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }) as ProfitShare));
    });
    return () => unsub();
  }, [collectionName]);

  // Prefill values if editing
  useEffect(() => {
    if (shareToEdit) {
      setStartDate(shareToEdit.startDate || '');
      setEndDate(shareToEdit.endDate || '');
      setRecipients(shareToEdit.recipients);
    }
  }, [shareToEdit]);

  // Balance calculation using passed records + local history
  useEffect(() => {
    if (!startDate || !endDate) return setBalance(0);
    const s = new Date(startDate);
    const e = new Date(endDate);
    let income = 0, expense = 0, shared = 0;

    records.forEach(r => {
      const d = new Date(r.date);
      if (d >= s && d <= e) {
        if (r.type === 'income') {
          income += r.total ?? 0;
        } else {
          expense += r.total ?? (r as any).totalCost ?? 0;
        }
      }
    });

    history.forEach(sp => {
      if (!sp.startDate || !sp.endDate) return;
      if (shareToEdit && sp.id === shareToEdit.id) return;

      const ss = new Date(sp.startDate);
      const ee = new Date(sp.endDate);
      if (!(ee < s || ss > e)) {
        shared += sp.totalSplitAmount ?? 0;
      }
    });

    setBalance(Math.max(0, income - expense - shared));
  }, [startDate, endDate, records, history, shareToEdit]);

  const totalPercentage = recipients.reduce((s, r) => s + r.percentage, 0);
  const recipientsWithAmount = recipients.map(r => ({
    ...r,
    amount: Math.round(balance * (r.percentage / 100) * 100) / 100
  }));

  const handleRecipientChange = (i: number, field: keyof Recipient, value: any) => {
    setRecipients(prev =>
      prev.map((r, idx) => (idx === i ? { ...r, [field]: value } : r))
    );
  };

  const addRecipient = () =>
    setRecipients(prev => [...prev, { name: '', percentage: 0, amount: 0 }]);

  const removeRecipient = (i: number) =>
    setRecipients(prev => prev.filter((_, idx) => idx !== i));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return toast.error('Please sign in');
    if (!startDate || !endDate) return toast.error('Enter date range');
    if (totalPercentage > 100) return toast.error('Total % cannot exceed 100');

    setLoading(true);

    const payload: Omit<ProfitShare, 'id'> = {
      startDate,
      endDate,
      recipients: recipientsWithAmount,
      totalSplitAmount: recipientsWithAmount.reduce((s, r) => s + r.amount, 0),
      createdAt: new Date().toISOString(),
      createdBy: user.id
    };

    try {
      if (shareToEdit?.id) {
        await updateDoc(doc(db, collectionName, shareToEdit.id), payload);
        toast.success('Profit share updated');
      } else {
        await addDoc(collection(db, collectionName), payload);
        toast.success('Profit share recorded');
      }
      onClose();
      onEditRequested?.(null);
    } catch (err) {
      console.error(err);
      toast.error('Save failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this share?')) return;
    try {
      await deleteDoc(doc(db, collectionName, id));
      toast.success('Deleted');
      if (shareToEdit?.id === id) {
        onEditRequested?.(null);
      }
    } catch (err) {
      console.error(err);
      toast.error('Delete failed');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Share History</h3>
        <div className="max-h-48 overflow-y-auto border rounded bg-white">
          {history.map(sp => (
            <div key={sp.id} className="flex justify-between items-center p-2 hover:bg-gray-50">
              <div onClick={() => onEditRequested?.(sp)} className="cursor-pointer">
                <span className="font-medium">{sp.startDate} → {sp.endDate}</span>
                <span className="ml-2 text-sm text-gray-500">({formatCurrency(sp.totalSplitAmount)})</span>
              </div>
              <button onClick={() => handleDelete(sp.id)} className="text-red-600 hover:text-red-800 p-1">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          {history.length === 0 && (
            <p className="p-2 text-gray-500 text-sm">No shares yet</p>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Start Date" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} required />
          <FormField label="End Date" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} required />
        </div>

        <div>
          <label className="block text-sm font-medium">Balance</label>
          <p className="mt-1 text-2xl font-semibold">{formatCurrency(balance)}</p>
        </div>

        <div className="space-y-2">
          {recipientsWithAmount.map((r, i) => (
            <div key={i} className="grid grid-cols-3 gap-4 items-center">
              <FormField
                label="Name"
                value={r.name}
                onChange={e => handleRecipientChange(i, 'name', e.target.value)}
                required
              />
              <FormField
                label="%"
                type="number"
                min={0}
                max={100}
                value={r.percentage}
                onChange={e => handleRecipientChange(i, 'percentage', +e.target.value)}
                required
              />
              <div className="pt-6 text-sm text-gray-500">
                {formatCurrency(r.amount)}{' '}
                <button
                  type="button"
                  onClick={() => removeRecipient(i)}
                  className="text-red-600 text-xs ml-2"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={addRecipient}
            className="text-sm text-blue-600 mt-2 inline-flex items-center"
          >
            <Plus className="w-4 h-4 mr-1" /> Add Recipient
          </button>
        </div>

        <div className="flex justify-end space-x-2">
          <button
            type="button"
            onClick={() => {
              onClose();
              onEditRequested?.(null);
            }}
            className="px-4 py-2 border rounded"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-primary text-white rounded disabled:opacity-50"
          >
            {shareToEdit ? 'Update Share' : 'Record Share'}
          </button>
        </div>
      </form>
    </div>
  );
}
