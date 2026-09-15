// src/components/finance/AssignFinanceDepartmentModal.tsx
import React, { useState } from 'react';
import Modal from '../ui/Modal';
import { doc, writeBatch } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import toast from 'react-hot-toast';
import SearchableSelect from '../ui/SearchableSelect';

interface AssignFinanceDepartmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedIds: Set<string>;
  departments: { id: string; name: string }[];
  collectionName: 'transactions' | 'invoices';
  onSuccess: () => void;
}

const AssignFinanceDepartmentModal: React.FC<AssignFinanceDepartmentModalProps> = ({ 
  isOpen, onClose, selectedIds, departments, collectionName, onSuccess 
}) => {
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const handleAssign = async () => {
    if (!selectedDepartment) return toast.error('Please select a department');
    setLoading(true);
    
    try {
      const departmentName = departments.find(d => d.id === selectedDepartment)?.name || '';
      const batch = writeBatch(db);
      
      const updateData = selectedDepartment === 'clear' 
        ? { departmentId: null, departmentName: null, updatedAt: new Date() }
        : { departmentId: selectedDepartment, departmentName, updatedAt: new Date() };

      selectedIds.forEach(id => {
        batch.update(doc(db, collectionName, id), updateData);
      });

      await batch.commit();
      toast.success(selectedDepartment === 'clear' ? 'Cleared department assignments' : `Assigned ${selectedIds.size} records to department`);
      onSuccess();
      setSelectedDepartment('');
    } catch (error) {
      toast.error('Failed to assign department');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Assign Department" size="sm">
      <div className="space-y-4">
        <SearchableSelect
          label="Select Department"
          options={[
            { id: 'clear', label: '🚫 -- Clear Assignment --' },
            ...departments.map(d => ({ id: d.id, label: d.name }))
          ]}
          value={selectedDepartment}
          onChange={(val) => setSelectedDepartment(val as string)}
          placeholder="Search departments..."
        />
        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
          <button onClick={onClose} disabled={loading} className="px-4 py-2 border rounded-md bg-white text-gray-700 hover:bg-gray-50">Cancel</button>
          <button onClick={handleAssign} disabled={loading || !selectedDepartment} className="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 disabled:opacity-50">
            {loading ? 'Assigning...' : 'Confirm Assignment'}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default AssignFinanceDepartmentModal;