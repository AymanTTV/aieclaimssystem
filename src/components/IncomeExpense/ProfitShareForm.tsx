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
import { Trash2, Plus, AlertTriangle } from 'lucide-react';
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

  // --- AUTO-FILL DATES Logic ---
  useEffect(() => {
    // 1. Only run if NOT editing an existing split
    if (shareToEdit) return;
    
    // 2. Only run if dates are currently empty
    if (startDate || endDate) return;

    // 3. Ensure we have records and history
    if (records.length === 0) return;

    // 4. Find records that are NOT covered by any existing split
    const unsplitRecords = records.filter(r => {
      const rDate = r.date.slice(0, 10);
      const isCovered = history.some(sp => 
        sp.startDate && sp.endDate &&
        rDate >= sp.startDate && rDate <= sp.endDate
      );
      return !isCovered;
    });

    if (unsplitRecords.length === 0) return;

    // 5. Sort these records by date ascending
    unsplitRecords.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // 6. Set Start to the earliest unsplit record, End to the latest
    setStartDate(unsplitRecords[0].date.slice(0, 10));
    setEndDate(unsplitRecords[unsplitRecords.length - 1].date.slice(0, 10));

  }, [shareToEdit, records, history, startDate, endDate]);

  // Balance calculation
  useEffect(() => {
    if (!startDate || !endDate) return setBalance(0);
    const s = new Date(startDate);
    const e = new Date(endDate);
    let income = 0, expense = 0, shared = 0;

    records.forEach(r => {
      const d = new Date(r.date);
      // Ensure date comparison includes start and end dates inclusive
      // Note: Comparing Date objects directly might miss time if not normalized, but assuming YYYY-MM-DD strings in inputs
      const rDateStr = r.date.slice(0, 10);
      if (rDateStr >= startDate && rDateStr <= endDate) {
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
      // Skip logic for overlap checking here for simplicity, 
      // typically profit shares shouldn't subtract from other profit shares unless tracking total pot.
      // Assuming 'shared' logic is not needed if we are just summing up income/expense in range.
      // Removing 'shared' subtraction as typically we just want Net Income in this range.
      // If you need to subtract previous payouts in this range, logic applies.
    });

    setBalance(income - expense); // Allow negative balance
  }, [startDate, endDate, records, history, shareToEdit]);

  const isDeficit = balance < 0;
  const absBalance = Math.abs(balance);

  const totalPercentage = recipients.reduce((s, r) => s + r.percentage, 0);
  const recipientsWithAmount = recipients.map(r => ({
    ...r,
    amount: Math.round(absBalance * (r.percentage / 100) * 100) / 100
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
      totalSplitAmount: isDeficit ? -absBalance : absBalance,
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
                <span className={`ml-2 text-sm ${sp.totalSplitAmount < 0 ? 'text-red-600' : 'text-green-600'}`}>
                   ({formatCurrency(sp.totalSplitAmount)})
                </span>
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
          <p className={`mt-1 text-2xl font-semibold ${isDeficit ? 'text-red-600' : 'text-gray-900'}`}>
            {formatCurrency(balance)}
          </p>
          {isDeficit && (
             <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-md flex items-start">
               <AlertTriangle className="w-5 h-5 text-red-500 mr-2 flex-shrink-0 mt-0.5" />
               <div className="text-sm text-red-700">
                 <strong>Warning: Negative Balance.</strong><br/>
                 The amounts below indicate what each recipient must <u>pay</u> to cover the deficit.
               </div>
             </div>
          )}
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
              <div className={`pt-6 text-sm font-medium flex items-center justify-between ${isDeficit ? 'text-red-600' : 'text-green-600'}`}>
                <span>{isDeficit ? 'Pay: ' : 'Get: '} {formatCurrency(r.amount)}</span>
                <button
                  type="button"
                  onClick={() => removeRecipient(i)}
                  className="text-red-600 text-xs hover:underline"
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