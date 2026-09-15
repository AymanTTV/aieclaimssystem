import React, { useState } from 'react';
import Modal from '../ui/Modal';
import { doc, writeBatch } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import toast from 'react-hot-toast';
import SearchableSelect from '../ui/SearchableSelect';

interface AssignClaimDepartmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedIds: Set<string>;
  departments: { id: string; name: string }[];
  onSuccess: () => void;
}

const AssignClaimDepartmentModal: React.FC<AssignClaimDepartmentModalProps> = ({ isOpen, onClose, selectedIds, departments, onSuccess }) => {
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const handleAssign = async () => {
    if (!selectedDepartment) return toast.error('Please select a department');
    setLoading(true);
    
    try {
      const departmentName = departments.find(d => d.id === selectedDepartment)?.name;
      const batch = writeBatch(db);
      
      selectedIds.forEach(id => {
        batch.update(doc(db, 'claims', id), { departmentId: selectedDepartment, departmentName });
      });

      await batch.commit();
      toast.success(`Assigned ${selectedIds.size} claims to department`);
      onSuccess();
    } catch (error) {
      toast.error('Failed to assign department');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Assign ${selectedIds.size} Claims to Department`} size="sm">
      <div className="space-y-4">
        <SearchableSelect
          label="Select Department"
          options={departments.map(d => ({ id: d.id, label: d.name }))}
          value={selectedDepartment}
          onChange={(val) => setSelectedDepartment(val as string)}
          placeholder="Search departments..."
        />
        <div className="flex justify-end space-x-3 pt-4 border-t">
          <button onClick={onClose} disabled={loading} className="px-4 py-2 border rounded-md bg-white text-gray-700">Cancel</button>
          <button onClick={handleAssign} disabled={loading || !selectedDepartment} className="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 disabled:opacity-50">
            {loading ? 'Assigning...' : 'Assign Department'}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default AssignClaimDepartmentModal;