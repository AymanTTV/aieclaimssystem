import React, { useState } from 'react';
import Modal from '../ui/Modal';
import { doc, writeBatch } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import toast from 'react-hot-toast';
import SearchableSelect from '../ui/SearchableSelect';

interface AssignClaimGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedIds: Set<string>;
  groups: { id: string; name: string }[];
  onSuccess: () => void;
}

const AssignClaimGroupModal: React.FC<AssignClaimGroupModalProps> = ({ isOpen, onClose, selectedIds, groups, onSuccess }) => {
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const handleAssign = async () => {
    if (!selectedGroup) return toast.error('Please select a group');
    setLoading(true);
    
    try {
      const groupName = groups.find(g => g.id === selectedGroup)?.name;
      const batch = writeBatch(db);
      
      selectedIds.forEach(id => {
        batch.update(doc(db, 'claims', id), { groupId: selectedGroup, groupName });
      });

      await batch.commit();
      toast.success(`Assigned ${selectedIds.size} claims to group`);
      onSuccess();
    } catch (error) {
      toast.error('Failed to assign group');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Assign ${selectedIds.size} Claims to Group`} size="sm">
      <div className="space-y-4">
        <SearchableSelect
          label="Select Group"
          options={groups.map(g => ({ id: g.id, label: g.name }))}
          value={selectedGroup}
          onChange={(val) => setSelectedGroup(val as string)}
          placeholder="Search groups..."
        />
        <div className="flex justify-end space-x-3 pt-4 border-t">
          <button onClick={onClose} disabled={loading} className="px-4 py-2 border rounded-md bg-white text-gray-700">Cancel</button>
          <button onClick={handleAssign} disabled={loading || !selectedGroup} className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50">
            {loading ? 'Assigning...' : 'Assign Group'}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default AssignClaimGroupModal;