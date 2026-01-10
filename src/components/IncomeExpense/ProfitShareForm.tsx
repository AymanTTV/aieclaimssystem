// src/components/IncomeExpense/SharesModal.tsx  (or whatever file you store this in)
import React, { useEffect, useMemo, useState } from 'react';
import {
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import FormField from '../ui/FormField';
import { Trash2, Plus, AlertTriangle } from 'lucide-react';
import { useFormattedDisplay } from '../../hooks/useFormattedDisplay';
import { ProfitShare, Recipient, IncomeExpenseEntry } from '../../types/incomeExpense';
import { startOfDay, endOfDay } from 'date-fns';

interface Props {
  onClose(): void;
  shareToEdit?: ProfitShare | null;
  onEditRequested?: (share: ProfitShare | null) => void;
  collectionName: string;
  records: IncomeExpenseEntry[]; // IMPORTANT: pass *filtered* entries from page
}

/**
 * ProfitShareForm (SharesModal)
 * Balance matches Summary Net Balance:
 *   balance = commissionIncome - expense - alreadySharedInSelectedRange
 */
export default function ProfitShareForm({
  onClose,
  shareToEdit = null,
  onEditRequested,
  collectionName,
  records,
}: Props) {
  const { user } = useAuth();
  const { formatCurrency } = useFormattedDisplay();

  const [history, setHistory] = useState<ProfitShare[]>([]);
  const [startDate, setStartDate] = useState(''); // YYYY-MM-DD
  const [endDate, setEndDate] = useState('');     // YYYY-MM-DD
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(false);

  // ----------------------------
  // Helpers
  // ----------------------------
  const toStart = (d: string) => startOfDay(new Date(d));
  const toEnd = (d: string) => endOfDay(new Date(d));

  // Inclusive overlap check for date ranges (YYYY-MM-DD)
  const rangesOverlap = (aStart: string, aEnd: string, bStart: string, bEnd: string) => {
    const aS = toStart(aStart).getTime();
    const aE = toEnd(aEnd).getTime();
    const bS = toStart(bStart).getTime();
    const bE = toEnd(bEnd).getTime();
    return aS <= bE && aE >= bS;
  };

  // ----------------------------
  // Load share history
  // ----------------------------
  useEffect(() => {
    const unsub = onSnapshot(collection(db, collectionName), (snap) => {
      const rows = snap.docs.map(
        (d) => ({ id: d.id, ...(d.data() as any) } as ProfitShare)
      );

      // Sort newest first (createdAt may be missing on old docs)
      rows.sort((a, b) => {
        const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return tb - ta;
      });

      setHistory(rows);
    });

    return () => unsub();
  }, [collectionName]);

  // ----------------------------
  // Prefill when editing
  // ----------------------------
  useEffect(() => {
    if (!shareToEdit) return;
    setStartDate(shareToEdit.startDate || '');
    setEndDate(shareToEdit.endDate || '');
    setRecipients(shareToEdit.recipients || []);
  }, [shareToEdit]);

  // ----------------------------
  // Auto-fill dates (only when creating new)
  // Picks a range of records that are NOT covered by any existing share range
  // ----------------------------
  useEffect(() => {
    if (shareToEdit) return;            // don’t overwrite when editing
    if (startDate || endDate) return;   // don’t overwrite if user already started
    if (!records || records.length === 0) return;
    if (!history) return;

    // Unsplit records = records not overlapped by ANY existing share range
    const unsplitRecords = records.filter((r) => {
      const rDate = r.date?.slice(0, 10);
      if (!rDate) return false;

      const covered = history.some((sp) => {
        if (!sp.startDate || !sp.endDate) return false;
        // record date is "covered" if it falls inside the share range
        return rDate >= sp.startDate && rDate <= sp.endDate;
      });

      return !covered;
    });

    if (unsplitRecords.length === 0) return;

    unsplitRecords.sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    setStartDate(unsplitRecords[0].date.slice(0, 10));
    setEndDate(unsplitRecords[unsplitRecords.length - 1].date.slice(0, 10));
  }, [shareToEdit, records, history, startDate, endDate]);

  // ----------------------------
  // Calculate "already shared" for selected range
  // (exclude the share being edited)
  // Overlap-based, inclusive
  // ----------------------------
  const alreadySharedInRange = useMemo(() => {
    if (!startDate || !endDate) return 0;

    return history
      .filter((sp) => {
        if (!sp.startDate || !sp.endDate) return false;
        if (shareToEdit?.id && sp.id === shareToEdit.id) return false; // exclude current edit
        return rangesOverlap(sp.startDate, sp.endDate, startDate, endDate);
      })
      .reduce((sum, sp) => sum + (sp.totalSplitAmount ?? 0), 0);
  }, [history, startDate, endDate, shareToEdit?.id]);

  // ----------------------------
  // Balance calculation (matches Summary Net Balance)
  // balance = income(commission) - expense - alreadyShared
  // ----------------------------
  useEffect(() => {
    if (!startDate || !endDate) {
      setBalance(0);
      return;
    }

    const start = toStart(startDate).getTime();
    const end = toEnd(endDate).getTime();

    let income = 0;
    let expense = 0;

    for (const r of records) {
      if (!r.date) continue;
      const t = new Date(r.date).getTime();
      if (Number.isNaN(t)) continue;

      if (t >= start && t <= end) {
        if (r.type === 'income') {
          // MUST match summary: commissionAmount
          income += r.commissionAmount ?? 0;
        } else if (r.type === 'expense') {
          expense += r.total ?? (r as any).totalCost ?? 0;
        }
      }
    }

    const computed = income - expense - (alreadySharedInRange ?? 0);
    setBalance(Math.round(computed * 100) / 100);
  }, [startDate, endDate, records, alreadySharedInRange]);

  // ----------------------------
  // Recipient amounts
  // If balance is negative, recipients "pay" to cover deficit
  // ----------------------------
  const isDeficit = balance < 0;
  const absBalance = Math.abs(balance);

  const totalPercentage = recipients.reduce((s, r) => s + (Number(r.percentage) || 0), 0);

  const recipientsWithAmount = recipients.map((r) => ({
    ...r,
    percentage: Number(r.percentage) || 0,
    amount: Math.round(absBalance * ((Number(r.percentage) || 0) / 100) * 100) / 100,
  }));

  const handleRecipientChange = (i: number, field: keyof Recipient, value: any) => {
    setRecipients((prev) =>
      prev.map((r, idx) => (idx === i ? { ...r, [field]: value } : r))
    );
  };

  const addRecipient = () =>
    setRecipients((prev) => [...prev, { name: '', percentage: 0, amount: 0 }]);

  const removeRecipient = (i: number) =>
    setRecipients((prev) => prev.filter((_, idx) => idx !== i));

  // ----------------------------
  // Submit
  // ----------------------------
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
      // Store signed total split amount: negative means deficit share
      totalSplitAmount: isDeficit ? -absBalance : absBalance,
      createdAt: shareToEdit?.createdAt || new Date().toISOString(),
      createdBy: shareToEdit?.createdBy || user.id,
      updatedAt: new Date().toISOString() as any, // if your type doesn’t include it, safe-cast
    } as any;

    try {
      if (shareToEdit?.id) {
        await updateDoc(doc(db, collectionName, shareToEdit.id), payload as any);
        toast.success('Profit share updated');
      } else {
        await addDoc(collection(db, collectionName), payload);
        toast.success('Profit share recorded');
      }

      onEditRequested?.(null);
      onClose();
    } catch (err) {
      console.error(err);
      toast.error('Save failed');
    } finally {
      setLoading(false);
    }
  };

  // ----------------------------
  // Delete
  // ----------------------------
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
      {/* History */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Share History</h3>
        <div className="max-h-48 overflow-y-auto border rounded bg-white">
          {history.map((sp) => (
            <div
              key={sp.id}
              className="flex justify-between items-center p-2 hover:bg-gray-50"
            >
              <div onClick={() => onEditRequested?.(sp)} className="cursor-pointer">
                <span className="font-medium">
                  {sp.startDate} → {sp.endDate}
                </span>
                <span
                  className={`ml-2 text-sm ${
                    (sp.totalSplitAmount ?? 0) < 0 ? 'text-red-600' : 'text-green-600'
                  }`}
                >
                  ({formatCurrency(sp.totalSplitAmount ?? 0)})
                </span>
              </div>

              <button
                onClick={() => handleDelete(sp.id)}
                className="text-red-600 hover:text-red-800 p-1"
                title="Delete"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}

          {history.length === 0 && (
            <p className="p-2 text-gray-500 text-sm">No shares yet</p>
          )}
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            label="Start Date"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
          />
          <FormField
            label="End Date"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            required
          />
        </div>

        {/* Balance */}
        <div>
          <label className="block text-sm font-medium">
            Balance (Matches Summary Net Balance)
          </label>

          <p className={`mt-1 text-2xl font-semibold ${isDeficit ? 'text-red-600' : 'text-gray-900'}`}>
            {formatCurrency(balance)}
          </p>

          {!!startDate && !!endDate && (
            <p className="text-xs text-gray-500 mt-1">
              Includes deduction for already-shared amounts in this range:{' '}
              <span className="font-medium">{formatCurrency(alreadySharedInRange)}</span>
            </p>
          )}

          {isDeficit && (
            <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-md flex items-start">
              <AlertTriangle className="w-5 h-5 text-red-500 mr-2 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-red-700">
                <strong>Warning: Negative Balance.</strong>
                <br />
                The amounts below indicate what each recipient must <u>pay</u> to cover the deficit.
              </div>
            </div>
          )}
        </div>

        {/* Recipients */}
        <div className="space-y-2">
          {recipientsWithAmount.map((r, i) => (
            <div key={i} className="grid grid-cols-3 gap-4 items-center">
              <FormField
                label="Name"
                value={r.name}
                onChange={(e) => handleRecipientChange(i, 'name', e.target.value)}
                required
              />
              <FormField
                label="%"
                type="number"
                min={0}
                max={100}
                value={r.percentage}
                onChange={(e) => handleRecipientChange(i, 'percentage', +e.target.value)}
                required
              />

              <div
                className={`pt-6 text-sm font-medium flex items-center justify-between ${
                  isDeficit ? 'text-red-600' : 'text-green-600'
                }`}
              >
                <span>
                  {isDeficit ? 'Pay: ' : 'Get: '} {formatCurrency(r.amount)}
                </span>
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

          {totalPercentage > 100 && (
            <p className="text-sm text-red-600">
              Total percentage is {totalPercentage}%. It cannot exceed 100%.
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-2">
          <button
            type="button"
            onClick={() => {
              onEditRequested?.(null);
              onClose();
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
