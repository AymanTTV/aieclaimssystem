// src/components/claims/ProgressUpdateModal.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import TextArea from '../ui/TextArea';
import SearchableSelect from '../ui/SearchableSelect';
import { Trash2, Edit, MessageCircle, Mail } from 'lucide-react';
import toast from 'react-hot-toast';
import { PROGRESS_OPTIONS, isLegacyClaimProgress } from '../../utils/claimProgress';
import { generateClaimProgressDocument } from '../../utils/documentGenerator'; 
import { usePermissions } from '../../hooks/usePermissions'; // Added import
import { Claim } from '../../types';
import ClaimCommunicationModal from './ClaimCommunicationModal';

interface ProgressEntry {
  id: string;
  date: Date;
  status: string;
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
  const { can } = usePermissions(); // Added hook initialization
  const [loading, setLoading] = useState(false);
  const [claimData, setClaimData] = useState<Claim | null>(null);
  const [history, setHistory] = useState<ProgressEntry[]>([]);
  const [isLegacy, setIsLegacy] = useState(false);

  // Status State
  const [status, setStatus] = useState<string>(''); 
  const [previousStatus, setPreviousStatus] = useState<string>('N/A'); 
  
  const [dateValue, setDateValue] = useState<string>('');
  const [note, setNote] = useState('');
  const [editing, setEditing] = useState<ProgressEntry | null>(null);

  // Notification state
  const [notifyModalOpen, setNotifyModalOpen] = useState(false);
  const [notifyChannel, setNotifyChannel] = useState<'whatsapp' | 'email'>('whatsapp');
  const [notifyOnSave, setNotifyOnSave] = useState(false);
  const [notifyOnSaveChannel, setNotifyOnSaveChannel] = useState<'whatsapp' | 'email'>('whatsapp');

  const sortedHistory = useMemo(
    () => [...history].sort((a, b) => b.date.getTime() - a.date.getTime()),
    [history]
  );

  useEffect(() => {
    (async () => {
      if (!claimId) return;
      setLoading(true);
      try {
        const claimRef = doc(db, 'claims', claimId);
        const snap = await getDoc(claimRef);
        if (!snap.exists()) return;
        const data = snap.data() as any;
        setClaimData({ id: claimId, ...data } as Claim);

        const rawHistory: any[] = data.progressHistory || [];
        const historyMapped: ProgressEntry[] = rawHistory.map(r => ({
          id: r.id,
          date: r.date?.toDate ? r.date.toDate() : new Date(r.date),
          status: r.status,
          note: r.note,
          author: r.author,
        }));

        const legacy = isLegacyClaimProgress({
          progress: data.progress,
          progressHistory: historyMapped,
        });
        setIsLegacy(legacy);

        historyMapped.sort((a, b) => a.date.getTime() - b.date.getTime());
        setHistory(historyMapped);

        // Determine Previous Status
        let lastKnown = 'N/A';
        if (historyMapped.length > 0) {
          lastKnown = historyMapped[historyMapped.length - 1].status;
        } else if (!legacy && data.progress) {
          lastKnown = data.progress;
        }
        setPreviousStatus(lastKnown);
        
        // Ensure status is empty for new entry unless editing
        if (!editing) setStatus('');

        setDateValue(new Date().toISOString().substring(0, 16));
      } catch (err: any) {
        console.error(err);
        toast.error(err.message || 'Failed to fetch progress');
      } finally {
        setLoading(false);
      }
    })();
  }, [claimId, editing]);

  const resetForm = () => {
    setEditing(null);
    setStatus(''); 
    setNote('');
    setDateValue(new Date().toISOString().substring(0, 16));
  };

  const handleAddOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    if (!status) {
        toast.error('Please select a status.');
        return;
    }
    if (!dateValue) {
      toast.error('Please select a received date/time.');
      return;
    }

    setLoading(true);
    const toastId = toast.loading('Updating progress...');
    
    try {
      const claimRef = doc(db, 'claims', claimId);

      if (editing) {
        await updateDoc(claimRef, {
          progressHistory: arrayRemove({ ...editing, date: editing.date }),
        });
      }

      const entry: ProgressEntry = {
        id: editing ? editing.id : (crypto.randomUUID?.() || Date.now().toString()),
        date: new Date(dateValue),
        status,
        note,
        author: user.name,
      };

      const payload: any = {
        progressHistory: arrayUnion(entry),
        updatedAt: new Date(),
        updatedBy: user.id,
      };

      if (!isLegacy) {
        payload.progress = status;
      }

      await updateDoc(claimRef, payload);

      // --- GENERATE PROGRESS DOCUMENT ---
      // Fetch latest data to ensure document is accurate
      const updatedSnap = await getDoc(claimRef);
      const updatedClaimData = { id: claimId, ...updatedSnap.data() };
      
      await generateClaimProgressDocument(updatedClaimData);
      toast.success('Progress document generated', { id: toastId });
      // ----------------------------------

      setHistory(prev => {
        const filtered = editing ? prev.filter(h => h.id !== editing.id) : prev;
        const newArr = [...filtered, entry];
        newArr.sort((a, b) => a.date.getTime() - b.date.getTime());
        return newArr;
      });
      
      // Update local previous status if adding new
      if (!editing) setPreviousStatus(status);

      toast.success(editing ? 'Entry updated' : 'Entry added');
      onUpdate();
      resetForm();

      if (notifyOnSave) {
        setNotifyChannel(notifyOnSaveChannel);
        setNotifyModalOpen(true);
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to save', { id: toastId });
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

  const handleOpenNotify = (ch: 'whatsapp' | 'email') => {
    if (!status) {
      toast.error('Please select a progress status first.');
      return;
    }
    setNotifyChannel(ch);
    setNotifyModalOpen(true);
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
      
      // Regenerate document on delete too
      const updatedSnap = await getDoc(claimRef);
      await generateClaimProgressDocument({ id: claimId, ...updatedSnap.data() });

    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to delete');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Form */}
      <form onSubmit={handleAddOrUpdate} className="space-y-4 border-b pb-6">
        <h3 className="text-lg font-medium text-gray-900">{editing ? 'Edit Entry' : 'Add Progress'}</h3>
        
        {/* Previous Status Note */}
        {!editing && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-md text-sm text-blue-800">
                <span className="font-semibold">Last Status:</span> {previousStatus}
            </div>
        )}

        {isLegacy && (
          <div className="mb-3 rounded-md bg-amber-50 border border-amber-200 p-3 text-amber-800 text-sm">
            Legacy claim: Main progress field won't be overwritten.
          </div>
        )}

        <SearchableSelect
          options={PROGRESS_OPTIONS.map(p => ({ id: p, label: p }))}
          value={status}
          onChange={val => setStatus(val as string)}
          label="Status"
          placeholder="Select status..."
          required
          disabled={loading} 
        />

        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">Received Date</label>
          <input
            type="datetime-local"
            value={dateValue}
            onChange={e => setDateValue(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 text-sm focus:border-primary focus:ring-primary"
            required
            disabled={loading}
          />
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">Note</label>
          <TextArea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Enter details..."
            required
            disabled={loading}
          />
        </div>

        {/* Progress Update Client Notification Feature */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-3.5 space-y-2.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div>
              <span className="text-xs font-semibold text-blue-900 block flex items-center gap-1.5">
                <span className="inline-block w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                Notify Client of Progress Update
              </span>
              <span className="text-[11px] text-blue-700">
                Instantly pre-fill and preview the active Claim Progress template to notify the client.
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleOpenNotify('whatsapp')}
                disabled={loading || !status}
                className="inline-flex items-center px-2.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-md transition-colors shadow-sm disabled:opacity-50"
                title={!status ? 'Select a status to preview WhatsApp notification' : 'Open WhatsApp message pre-filled with this progress update'}
              >
                <MessageCircle className="h-3.5 w-3.5 mr-1" />
                Notify via WhatsApp
              </button>
              <button
                type="button"
                onClick={() => handleOpenNotify('email')}
                disabled={loading || !status}
                className="inline-flex items-center px-2.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-md transition-colors shadow-sm disabled:opacity-50"
                title={!status ? 'Select a status to preview email notification' : 'Send email pre-filled with this progress update'}
              >
                <Mail className="h-3.5 w-3.5 mr-1" />
                Notify via Email
              </button>
            </div>
          </div>

          <div className="pt-2 border-t border-blue-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <label className="flex items-center space-x-2 text-blue-950 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={notifyOnSave}
                onChange={(e) => setNotifyOnSave(e.target.checked)}
                className="rounded border-blue-300 text-primary focus:ring-primary h-3.5 w-3.5"
              />
              <span className="font-medium">Prompt client notification automatically upon saving this entry</span>
            </label>
            {notifyOnSave && (
              <div className="flex items-center space-x-3 bg-white/70 px-2 py-1 rounded border border-blue-200">
                <span className="text-[11px] font-semibold text-gray-600">Channel:</span>
                <label className="text-xs text-blue-900 flex items-center gap-1 cursor-pointer font-medium">
                  <input
                    type="radio"
                    name="notifyChannel"
                    checked={notifyOnSaveChannel === 'whatsapp'}
                    onChange={() => setNotifyOnSaveChannel('whatsapp')}
                    className="text-emerald-600 focus:ring-emerald-500 h-3 w-3"
                  />
                  WhatsApp
                </label>
                <label className="text-xs text-blue-900 flex items-center gap-1 cursor-pointer font-medium">
                  <input
                    type="radio"
                    name="notifyChannel"
                    checked={notifyOnSaveChannel === 'email'}
                    onChange={() => setNotifyOnSaveChannel('email')}
                    className="text-indigo-600 focus:ring-indigo-500 h-3 w-3"
                  />
                  Email
                </label>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end space-x-3">
          {editing && (
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              disabled={loading}
            >
              Cancel Edit
            </button>
          )}
          <button
            type="submit"
            className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary-600"
            disabled={loading}
          >
            {loading ? 'Saving & Generating...' : (editing ? 'Save Changes' : 'Add Entry')}
          </button>
        </div>
      </form>

      {/* History List wrapped in progressview check */}
      {can('claims', 'progressview') && (
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-gray-700">Progress History</h4>
          <div className="max-h-64 overflow-auto space-y-4 pr-1">
              {sortedHistory.map(entry => (
              <div key={entry.id} className="bg-gray-50 p-4 rounded-lg flex justify-between items-start">
                  <div>
                  <div className="flex items-center space-x-2">
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                      {entry.status}
                      </span>
                      <span className="text-xs text-gray-500">{entry.date.toLocaleString()}</span>
                  </div>
                  <p className="mt-2 text-sm text-gray-700 whitespace-pre-wrap">{entry.note}</p>
                  <p className="mt-1 text-xs text-gray-500">By {entry.author}</p>
                  </div>
                  
                  {/* Edit/Delete buttons wrapped in progressedit check */}
                  {can('claims', 'progressedit') && (
                    <div className="flex flex-col space-y-2 ml-4">
                    <button type="button" onClick={() => handleEdit(entry)} className="p-1 hover:bg-gray-200 rounded" disabled={loading}>
                        <Edit className="h-4 w-4 text-gray-600" />
                    </button>
                    {user?.role === 'manager' && (
                        <button type="button" onClick={() => handleDelete(entry)} className="p-1 hover:bg-gray-200 rounded" disabled={loading}>
                        <Trash2 className="h-4 w-4 text-red-600" />
                        </button>
                    )}
                    </div>
                  )}
              </div>
              ))}
              {sortedHistory.length === 0 && (
              <p className="text-sm text-gray-500">No progress entries yet.</p>
              )}
          </div>
        </div>
      )}

      <div className="text-right">
        <button onClick={onClose} className="px-4 py-2 text-sm text-gray-700 hover:underline" disabled={loading}>
          Close
        </button>
      </div>

      {claimData && (
        <ClaimCommunicationModal
          isOpen={notifyModalOpen}
          onClose={() => setNotifyModalOpen(false)}
          claim={claimData}
          initialChannel={notifyChannel}
          initialCategory="progress"
          overrideStage={status}
          overrideNotes={note}
        />
      )}
    </div>
  );
};

export default ProgressUpdateModal;