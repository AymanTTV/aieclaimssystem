// src/components/claims/ProgressUpdateModal.tsx

import React, { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import TextArea from '../ui/TextArea';
import { Trash2, Edit } from 'lucide-react';
import toast from 'react-hot-toast';
import { ClaimProgress } from '../../types/claim';

interface ProgressEntry {
  id: string;
  date: Date;
  status: ClaimProgress;
  note: string;
  author: string;
}

interface ProgressUpdateModalProps {
  claimId: string;
  onClose: () => void;
  onUpdate: () => void;
}

const PROGRESS_OPTIONS = [
  'Your Claim Has Started',
  'Report to Legal Team - Pending',
  'TPI (Third Party Insurer) - Notified and Awaiting Response',
  'Engineer Report - Pending Completion',
  'Vehicle Damage Assessment - Scheduled',
  'Liability Accepted',
  'Liability Disputed',
  'TPI Refuses to Deal with Claim',
  'VD Completed Hire Pack - Awaiting Review',
  'Claim - Referred to MIB (Motor Insurers\' Bureau)',
  'MIB Claim - Under Review/In Progress',
  'Awaiting MIB Response/Decision',
  'MIB - Completed (Outcome Received)',
  'Client Documentation - Pending Submission',
  'Hire Pack - Successfully Submitted',
  'Accident Circumstances - Under Investigation',
  'MIB Claim - Initial Review in Progress',
  'Additional Information - Requested from Client',
  'Legal Notice - Issued to Third Party',
  'Court Proceedings - Initiated',
  'Settlement Offer - Under Review',
  'Client Approval - Pending for Settlement',
  'Negotiation with TPI - Ongoing',
  'Settlement Agreement - Finalized',
  'Payment Processing - Initiated',
  'Final Payment - Received and Confirmed',
  'Client Payment Disbursed',
  'Claim Completed - Record Archived',
] as const;

const ProgressUpdateModal: React.FC<ProgressUpdateModalProps> = ({
  claimId,
  onClose,
  onUpdate
}) => {
  const { user } = useAuth();

  // Loading state for network requests:
  const [loading, setLoading] = useState(false);

  // This holds the fetched history of progress entries:
  const [history, setHistory] = useState<ProgressEntry[]>([]);

  // We now store the selected status—we will initialize it from `data.progress`:
  const [status, setStatus] = useState<ClaimProgress>(PROGRESS_OPTIONS[0]);

  // The “received date” input (user can pick date+time):
  // We store it as an HTML‐friendly string, e.g. "2025-06-05T14:30"
  const [dateValue, setDateValue] = useState<string>('');

  // Note text:
  const [note, setNote] = useState('');

  // If editing an existing entry, we keep that object here:
  const [editing, setEditing] = useState<ProgressEntry | null>(null);

  // On mount: fetch the claim document, set history + current progress + default date.
  useEffect(() => {
    (async () => {
      try {
        const snap = await getDoc(doc(db, 'claims', claimId));
        if (!snap.exists()) return;
        const data = snap.data() as any;

        // 1) Set the current progress (if available) instead of always defaulting to PROGRESS_OPTIONS[0]
        if (data.progress && PROGRESS_OPTIONS.includes(data.progress)) {
          setStatus(data.progress as ClaimProgress);
        }

        // 2) Convert raw progressHistory (array of Firestore Timestamps) into Date objects:
        const raw: any[] = data.progressHistory || [];
        const mapped: ProgressEntry[] = raw.map(r => ({
          id: r.id,
          date: r.date.toDate ? r.date.toDate() : new Date(r.date),
          status: r.status,
          note: r.note,
          author: r.author
        }));

        // 3) Sort ascending so earliest date/time is at index 0 (top of the list):
        mapped.sort((a, b) => a.date.getTime() - b.date.getTime());
        setHistory(mapped);

        // 4) If NOT editing, we can prefill dateValue with "now" in HTML‐compatible form:
        //    Alternatively, you could leave it blank and force the user to pick something.
        const now = new Date();
        const iso = now.toISOString().substring(0, 16); // "yyyy-mm-ddThh:mm"
        setDateValue(iso);
      } catch (err) {
        console.error(err);
      }
    })();
  }, [claimId]);

  const resetForm = () => {
    setEditing(null);
    // Reset fields back to the claim’s current progress + now:
    // (We fetch `data.progress` only on mount. If you want real‐time, you could re‐fetch here.)
    setStatus(PROGRESS_OPTIONS[0]);
    const now = new Date().toISOString().substring(0, 16);
    setDateValue(now);
    setNote('');
  };

  const handleAddOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    // Validate that dateValue is provided:
    if (!dateValue) {
      toast.error('Please select a received date/time.');
      return;
    }

    setLoading(true);
    try {
      const claimRef = doc(db, 'claims', claimId);

      // If editing, remove the old entry from the array first:
      if (editing) {
        await updateDoc(claimRef, {
          progressHistory: arrayRemove({
            ...editing,
            date: editing.date // Firestore will match on shape
          }),
        });
      }

      // Build our new/updated entry:
      const entry: ProgressEntry = {
        id: editing ? editing.id : Date.now().toString(),
        date: new Date(dateValue),            // <-- use user‐picked date
        status,
        note,
        author: user.name
      };

      // Push the new/updated entry and also update `progress` field on the claim:
      await updateDoc(claimRef, {
        progress: status,                      // <-- set the claim’s current progress
        progressHistory: arrayUnion(entry),
        updatedAt: new Date(),
        updatedBy: user.id
      });

      toast.success(editing ? 'Entry updated' : 'Entry added');
      onUpdate();

      // Immediately update local history in ascending order:
      setHistory(prev => {
        const filtered = editing ? prev.filter(h => h.id !== editing.id) : prev;
        const newArr = [...filtered, entry];
        newArr.sort((a, b) => a.date.getTime() - b.date.getTime());
        return newArr;
      });

      resetForm();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to save');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (entry: ProgressEntry) => {
    if (!user) return;
    setLoading(true);
    try {
      const claimRef = doc(db, 'claims', claimId);
      await updateDoc(claimRef, {
        progressHistory: arrayRemove({
          ...entry,
          date: entry.date
        }),
      });
      toast.success('Entry deleted');
      setHistory(prev => prev.filter(h => h.id !== entry.id));
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to delete');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* --- History List (ascending order) --- */}
      <div className="max-h-64 overflow-auto space-y-4">
        {history.map(entry => (
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
                onClick={() => {
                  // Initialize editing form fields:
                  setEditing(entry);
                  setStatus(entry.status);
                  // Convert entry.date to "yyyy-MM-ddThh:mm" for datetime-local:
                  const iso = new Date(entry.date).toISOString().substring(0, 16);
                  setDateValue(iso);
                  setNote(entry.note);
                }}
                className="p-1 hover:bg-gray-200 rounded"
                title="Edit entry"
                disabled={loading}
              >
                <Edit className="h-4 w-4 text-gray-600" />
              </button>
              <button
                type="button"
                onClick={() => handleDelete(entry)}
                disabled={loading}
                className="p-1 hover:bg-gray-200 rounded"
                title="Delete entry"
              >
                <Trash2 className="h-4 w-4 text-red-600" />
              </button>
            </div>
          </div>
        ))}
        {history.length === 0 && (
          <p className="text-sm text-gray-500">No progress entries yet.</p>
        )}
      </div>

      {/* --- Add / Edit Form --- */}
      <form onSubmit={handleAddOrUpdate} className="space-y-4">
        {/* Status dropdown */}
        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">
            Status
          </label>
          <select
            value={status}
            onChange={e => setStatus(e.target.value as ClaimProgress)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
            required
          >
            {PROGRESS_OPTIONS.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>

        {/* Received Date / Time */}
        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">
            Received Date
          </label>
          <input
            type="datetime-local"
            value={dateValue}
            onChange={e => setDateValue(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
            required
          />
        </div>

        {/* Note textarea */}
        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">
            Note
          </label>
          <TextArea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Enter details..."
            required
          />
        </div>

        {/* Buttons */}
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
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary-600 disabled:opacity-50"
          >
            {editing ? 'Save Changes' : 'Add Entry'}
          </button>
        </div>
      </form>

      {/* Close button */}
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
