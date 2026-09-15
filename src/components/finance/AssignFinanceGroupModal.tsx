// src/components/finance/AssignFinanceGroupModal.tsx
import React, { useState } from 'react';
import Modal from '../ui/Modal';
import { writeBatch, doc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import toast from 'react-hot-toast';

interface AssignFinanceGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedIds: Set<string>;
  groups: { id: string; name: string }[];
  collectionName: 'transactions' | 'invoices';
  onSuccess: () => void;
}

const AssignFinanceGroupModal: React.FC<AssignFinanceGroupModalProps> = ({
  isOpen, onClose, selectedIds, groups, collectionName, onSuccess
}) => {
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAssign = async () => {
    if (selectedIds.size === 0) return;
    setIsSubmitting(true);
    const toastId = toast.loading(`Assigning group to ${selectedIds.size} record(s)...`);

    try {
      const batch = writeBatch(db);
      selectedIds.forEach(id => {
        batch.update(doc(db, collectionName, id), {
          groupId: selectedGroup || null
        });
      });
      await batch.commit();
      toast.success('Group assigned successfully', { id: toastId });
      onSuccess();
    } catch (error) {
      toast.error('Failed to assign group', { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Assign Group" size="sm">
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          Assign a group to the {selectedIds.size} selected record(s).
        </p>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Select Group
          </label>
          <select
            value={selectedGroup}
            onChange={e => setSelectedGroup(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border bg-white"
          >
            <option value="">None (Remove Group)</option>
            {groups.map(g => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 border border-gray-300 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 rounded-md"
          >
            Cancel
          </button>
          <button
            onClick={handleAssign}
            disabled={isSubmitting}
            className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 disabled:opacity-50"
          >
            {isSubmitting ? 'Assigning...' : 'Assign Group'}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default AssignFinanceGroupModal;