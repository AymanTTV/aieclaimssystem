// src/components/claims/ProgressUpdateModal.tsx

import React, { useState, useEffect, useMemo } from 'react';
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import TextArea from '../ui/TextArea';
import SearchableSelect from '../ui/SearchableSelect';
import { Trash2, Edit } from 'lucide-react';
import toast from 'react-hot-toast';
import { PROGRESS_OPTIONS, isLegacyClaimProgress } from '../../utils/claimProgress';

interface ProgressEntry {
  id: string;
  date: Date;
  status: string; // allow legacy strings too
  note: string;
  author: string;
}

interface ProgressUpdateModalProps {
  claimId: string;
  onClose: () => void;
  onUpdate: () => void;
}

const ProgressUpdateModal: React.FC<ProgressUpdateModalProps> = ({
  claimId,
  onClose,
  onUpdate,
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<ProgressEntry[]>([]);

  // legacy-awareness
  const [isLegacy, setIsLegacy] = useState(false);

  // latest first (for render)
  const sortedHistory = useMemo(
    () => [...history].sort((a, b) => b.date.getTime() - a.date.getTime()),
    [history]
  );

  const [status, setStatus] = useState<string>(PROGRESS_OPTIONS[0]);
  const [dateValue, setDateValue] = useState<string>('');
  const [note, setNote] = useState('');
  const [editing, setEditing] = useState<ProgressEntry | null>(null);

  useEffect(() => {
    (async () => {
      if (!claimId) return;
      setLoading(true);
      try {
        const claimRef = doc(db, 'claims', claimId);
        const snap = await getDoc(claimRef);
        if (!snap.exists()) return;
        const data = snap.data() as any;

        // Map history with JS Dates
        const rawHistory: any[] = data.progressHistory || [];
        const historyMapped: ProgressEntry[] = rawHistory.map(r => ({
          id: r.id,
          date: r.date?.toDate ? r.date.toDate() : new Date(r.date),
          status: r.status,
          note: r.note,
          author: r.author,
        }));

        // Determine legacy
        const legacy = isLegacyClaimProgress({
          progress: data.progress,
          progressHistory: historyMapped,
        });
        setIsLegacy(legacy);

        // Only preselect status if non-legacy & valid
        if (!legacy && data.progress && PROGRESS_OPTIONS.includes(data.progress)) {
          setStatus(data.progress as string);
        }

        // Keep history sorted oldest->newest internally
        historyMapped.sort((a, b) => a.date.getTime() - b.date.getTime());
        setHistory(historyMapped);

        setDateValue(new Date().toISOString().substring(0, 16));
      } catch (err: any) {
        console.error(err);
        toast.error(err.message || 'Failed to fetch progress');
      } finally {
        setLoading(false);
      }
    })();
  }, [claimId]);

  const resetForm = () => {
    setEditing(null);
    setStatus(PROGRESS_OPTIONS[0]);
    setNote('');
    setDateValue(new Date().toISOString().substring(0, 16));
  };

  const handleAddOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!dateValue) {
      toast.error('Please select a received date/time.');
      return;
    }

    setLoading(true);
    try {
      const claimRef = doc(db, 'claims', claimId);

      if (editing) {
        // Remove the exact previous entry before re-adding (Firestore array semantics)
        await updateDoc(claimRef, {
          progressHistory: arrayRemove({ ...editing, date: editing.date }),
        });
      }

      // For legacy claims, we still allow selecting a status for the history entry,
      // but we won't overwrite the main "progress" field in Firestore.
      const entry: ProgressEntry = {
        id: editing ? editing.id : (crypto.randomUUID?.() || Date.now().toString()),
        date: new Date(dateValue),
        status, // always use selected status for history
        note,
        author: user.name,
      };

      const payload: any = {
        progressHistory: arrayUnion(entry),
        updatedAt: new Date(),
        updatedBy: user.id,
      };

      // Only write main progress for non-legacy claims
      if (!isLegacy) {
        payload.progress = status;
      }

      await updateDoc(claimRef, payload);

      setHistory(prev => {
        const filtered = editing ? prev.filter(h => h.id !== editing.id) : prev;
        const newArr = [...filtered, entry];
        newArr.sort((a, b) => a.date.getTime() - b.date.getTime());
        return newArr;
      });

      toast.success(editing ? 'Entry updated' : 'Entry added');
      onUpdate();
      resetForm();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to save');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (entry: ProgressEntry) => {
    setEditing(entry);
    setStatus(entry.status);
    setNote(entry.note);
    setDateValue(entry.date.toISOString().substring(0, 16));
  };

  const handleDelete = async (entry: ProgressEntry) => {
    if (!user) return;
    setLoading(true);
    try {
      const claimRef = doc(db, 'claims', claimId);
      await updateDoc(claimRef, {
        progressHistory: arrayRemove({ ...entry, date: entry.date }),
      });
      setHistory(prev => prev.filter(h => h.id !== entry.id));
      toast.success('Entry deleted');
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to delete');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* History */}
      <div className="max-h-64 overflow-auto space-y-4">
        {sortedHistory.map(entry => (
          <div
            key={entry.id}
            className="bg-gray-50 p-4 rounded-lg flex justify-between items-start"
          >
            <div>
              <div className="flex items-center space-x-2">
                <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs">
                  {entry.status}
                </span>
                <span className="text-sm text-gray-500">
                  {entry.date.toLocaleString()}
                </span>
              </div>
              <p className="mt-2 text-sm text-gray-700 whitespace-pre-wrap">
                {entry.note}
              </p>
              <p className="mt-1 text-xs text-gray-500">By {entry.author}</p>
            </div>
            <div className="flex flex-col space-y-2 ml-4">
              <button
                type="button"
                onClick={() => handleEdit(entry)}
                className="p-1 hover:bg-gray-200 rounded"
                disabled={loading}
                title="Edit entry"
              >
                <Edit className="h-4 w-4 text-gray-600" />
              </button>
              <button
                type="button"
                onClick={() => handleDelete(entry)}
                className="p-1 hover:bg-gray-200 rounded"
                disabled={loading}
                title="Delete entry"
              >
                <Trash2 className="h-4 w-4 text-red-600" />
              </button>
            </div>
          </div>
        ))}
        {sortedHistory.length === 0 && (
          <p className="text-sm text-gray-500">No progress entries yet.</p>
        )}
      </div>

      {/* Form */}
      <form onSubmit={handleAddOrUpdate} className="space-y-4">
        {/* Legacy banner */}
        {isLegacy && (
          <div className="mb-3 rounded-md bg-amber-50 border border-amber-200 p-3 text-amber-800">
            This is a legacy claim. The main progress field won’t be overwritten,
            but you can still select a status for this history entry.
          </div>
        )}

        {/* Status */}
        <SearchableSelect
          options={PROGRESS_OPTIONS.map(p => ({ id: p, label: p }))}
          value={status}
          onChange={val => setStatus(val as string)}
          label="Status"
          placeholder="Select status..."
          required
          disabled={loading} 
        />

        {/* Received Date */}
        <div className="space-y-1">
          <label className="block text-base font-medium text-gray-700">
            Received Date
          </label>
          <input
            type="datetime-local"
            value={dateValue}
            onChange={e => setDateValue(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-3 text-base focus:border-primary focus:ring-primary"
            required
            disabled={loading}
          />
        </div>

        {/* Note */}
        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">
            Note
          </label>
          <TextArea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Enter details..."
            required
            disabled={loading}
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-3">
          {editing && (
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
              disabled={loading}
            >
              Cancel Edit
            </button>
          )}
          <button
            type="submit"
            className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary-600 disabled:opacity-50"
            disabled={loading}
          >
            {editing ? 'Save Changes' : 'Add Entry'}
          </button>
        </div>
      </form>

      {/* Close */}
      <div className="text-right">
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm text-gray-700 hover:underline"
          disabled={loading}
        >
          Close
        </button>
      </div>
    </div>
  );
};

export default ProgressUpdateModal;
