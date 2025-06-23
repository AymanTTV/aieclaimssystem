// src/components/claims/ProgressUpdateModal.tsx

import React, { useState, useEffect, useMemo } from 'react';
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import TextArea from '../ui/TextArea';
import SearchableSelect from '../ui/SearchableSelect';
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

// full list of ClaimProgress values
const PROGRESS_OPTIONS = [
  'Your Claim Has Started',
  'Client Contacted for Initial Statement',
  'Accident Details Verified',
  'Report to Legal Team - Pending',
  'Legal Team Reviewing Claim',
  'Client Documentation - Pending Submission',
  'Additional Information - Requested from Client',
  'Client Failed to Respond',
  'TPI (Third Party Insurer) - Notified and Awaiting Response',
  'TPI Acknowledged Notification',
  'TPI Refuses to Deal with Claim',
  'TPI Accepted Liability',
  'TPI Rejected Liability',
  'TPI Liability - 50/50 Split Under Review',
  'TPI Liability - 50/50 Split Agreed',
  'TPI Liability - Partial Split Under Review',
  'TPI Liability - Partial Split (Other Ratio Agreed)',
  'Liability Disputed - Awaiting Evidence from Client',
  'Liability Disputed - TPI Provided Counter Evidence',
  'Liability Disputed - Under Legal Review',
  'Liability Disputed - Witness Statement Requested',
  'Liability Disputed - Expert Report Required',
  'Liability Disputed - Negotiation Ongoing',
  'Liability Disputed - No Agreement Reached',
  'Liability Disputed - Referred to Court',
  'Engineer Assigned',
  'Engineer Report - Pending Completion',
  'Engineer Report - Completed',
  'Vehicle Damage Assessment - TPI Scheduled',
  'Vehicle Inspection - Completed',
  'Repair Authorisation - Awaiting Approval',
  'Repair in Progress',
  'Vehicle Repair - Completed',
  'Total Loss - Awaiting Valuation',
  'Total Loss Offer - Made',
  'Total Loss Offer - Accepted',
  'Total Loss Offer - Disputed',
  'Salvage Collected',
  'Salvage Payment Received',
  'Hire Vehicle - Arranged',
  'Hire Period - Ongoing',
  'Hire Vehicle - Off-Hired',
  'Hire Invoice - Generated',
  'Hire Pack - Successfully Submitted',
  'VD Completed Hire Pack - Awaiting Review',
  'TPI made VD offer - Ongoing',
  'VD Negotiation with TPI - Ongoing',
  'VD payment Received - Prejudice basis',
  'VD payment Received - with VAT',
  'VD payment Received - Without VAT',
  'PI Medical Report - Requested',
  'PI Medical Report - Received',
  'PI Negotiation with TPI - Ongoing',
  'Settlement Offer - Under Review',
  'Client Approval - Pending for Settlement',
  'Client Rejected Offer',
  'Settlement Agreement - Finalized',
  'Legal Notice - Issued to Third Party',
  'Court Proceedings - Initiated',
  'Court Hearing - Awaiting Date',
  'Court Hearing - Completed',
  'Judgement in Favour',
  'Judgement Against',
  "Claim - Referred to MIB (Motor Insurers' Bureau)",
  'MIB Claim - Initial Review in Progress',
  'MIB Claim - Under Review/In Progress',
  'Awaiting MIB Response/Decision',
  'MIB - Completed (Outcome Received)',
  'Payment Processing - Initiated',
  'Final Payment - Received and Confirmed',
  'Client Payment Disbursed',
  'Claim Withdrawn by Client',
  'Claim Rejected - Insufficient Evidence',
  'Claim Suspended - Pending Client Action',
  'Claim Completed - Record Archived',
] as const;

const ProgressUpdateModal: React.FC<ProgressUpdateModalProps> = ({
  claimId,
  onClose,
  onUpdate,
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<ProgressEntry[]>([]);

  // latest first
  const sortedHistory = useMemo(
    () => [...history].sort((a, b) => b.date.getTime() - a.date.getTime()),
    [history]
  );

  const [status, setStatus] = useState<ClaimProgress>(PROGRESS_OPTIONS[0]);
  const [dateValue, setDateValue] = useState<string>('');
  const [note, setNote] = useState('');
  const [editing, setEditing] = useState<ProgressEntry | null>(null);

  useEffect(() => {
    (async () => {
      if (!claimId) return;
      setLoading(true);
      try {
        const snap = await getDoc(doc(db, 'claims', claimId));
        if (!snap.exists()) return;
        const data = snap.data() as any;

        if (data.progress && PROGRESS_OPTIONS.includes(data.progress)) {
          setStatus(data.progress as ClaimProgress);
        }

        const raw: any[] = data.progressHistory || [];
        const mapped: ProgressEntry[] = raw.map(r => ({
          id: r.id,
          date: r.date.toDate ? r.date.toDate() : new Date(r.date),
          status: r.status,
          note: r.note,
          author: r.author,
        }));

        mapped.sort((a, b) => a.date.getTime() - b.date.getTime());
        setHistory(mapped);

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
        await updateDoc(claimRef, {
          progressHistory: arrayRemove({ ...editing, date: editing.date }),
        });
      }

      const entry: ProgressEntry = {
        id: editing ? editing.id : Date.now().toString(),
        date: new Date(dateValue),
        status,
        note,
        author: user.name,
      };

      await updateDoc(claimRef, {
        progress: status,
        progressHistory: arrayUnion(entry),
        updatedAt: new Date(),
        updatedBy: user.id,
      });

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
        {/* Status */}
        <SearchableSelect
          options={PROGRESS_OPTIONS.map(p => ({ id: p, label: p }))}
          value={status}
          onChange={val => setStatus(val as ClaimProgress)}
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
