// src/components/waiting/WaitingDeleteModal.tsx
import React, { useState } from 'react';
import { db } from '../../lib/firebase';
import { collection, deleteDoc, doc, getDocs } from 'firebase/firestore';
import toast from 'react-hot-toast';

interface Props {
  entryId: string;
  onClose: () => void;
  onDeleted?: () => void;
}

async function deleteSubcollection(path: string) {
  const snap = await getDocs(collection(db, path));
  await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
}

/**
 * Deletes the waiting entry and its child subcollections:
 * /waiting_entries/{id}/notes, /reminders, /activity
 */
async function deleteWaitingEntryDeep(id: string) {
  // delete child docs first so you don't leave orphans
  await deleteSubcollection(`waiting_entries/${id}/notes`);
  await deleteSubcollection(`waiting_entries/${id}/reminders`);
  await deleteSubcollection(`waiting_entries/${id}/activity`);
  // delete the main doc
  await deleteDoc(doc(db, 'waiting_entries', id));
}

const WaitingDeleteModal: React.FC<Props> = ({ entryId, onClose, onDeleted }) => {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    try {
      setLoading(true);
      await deleteWaitingEntryDeep(entryId);
      toast.success('Waiting entry deleted');
      onDeleted?.();
      onClose();
    } catch (e) {
      console.error(e);
      toast.error('Failed to delete entry');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-700">
        Are you sure you want to permanently delete this waiting entry? This will also remove its
        Notes, Reminders and Activity.
      </p>
      <div className="flex justify-end gap-2">
        <button className="btn" onClick={onClose} disabled={loading}>
          Cancel
        </button>
        <button
          className="btn btn-danger"
          onClick={handleDelete}
          disabled={loading}
        >
          {loading ? 'Deleting…' : 'Delete'}
        </button>
      </div>
    </div>
  );
};

export default WaitingDeleteModal;
