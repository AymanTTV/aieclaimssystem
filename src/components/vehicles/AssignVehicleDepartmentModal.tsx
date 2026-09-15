// src/components/vehicles/AssignVehicleDepartmentModal.tsx
import React, { useState } from 'react';
import Modal from '../ui/Modal';
import { doc, writeBatch } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import toast from 'react-hot-toast';
import SearchableSelect from '../ui/SearchableSelect';
import { Vehicle } from '../../types';

interface AssignVehicleDepartmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedIds: Set<string>;
  singleVehicle?: Vehicle | null;
  departments: { id: string; name: string }[];
  onSuccess: () => void;
}

const AssignVehicleDepartmentModal: React.FC<AssignVehicleDepartmentModalProps> = ({ 
  isOpen, onClose, selectedIds, singleVehicle, departments, onSuccess 
}) => {
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    let targetDeptName: string | null = null;
    let targetDeptId: string | null = null;

    if (selectedDepartment && selectedDepartment !== 'clear') {
      const dept = departments.find(d => d.id === selectedDepartment);
      if (dept) {
        targetDeptName = dept.name;
        targetDeptId = dept.id;
      }
    }

    setLoading(true);
    try {
      const batch = writeBatch(db);
      
      if (singleVehicle) {
        batch.update(doc(db, 'vehicles', singleVehicle.id), { 
          assignedDepartmentId: targetDeptId, 
          assignedDepartmentName: targetDeptName,
          updatedAt: new Date()
        });
      } else {
        selectedIds.forEach(id => {
          batch.update(doc(db, 'vehicles', id), { 
            assignedDepartmentId: targetDeptId, 
            assignedDepartmentName: targetDeptName,
            updatedAt: new Date()
          });
        });
      }

      await batch.commit();
      toast.success(targetDeptId ? 'Assigned to department' : 'Cleared department assignment');
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
      <form onSubmit={handleAssign} className="space-y-4">
        <p className="text-sm text-gray-600 mb-2">
          {singleVehicle 
            ? `Select a department to assign to ${singleVehicle.registrationNumber}.`
            : `Select a department to assign to the ${selectedIds.size} selected vehicles.`}
        </p>

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
          <button type="button" onClick={onClose} disabled={loading} className="px-4 py-2 border rounded-md bg-white text-gray-700 font-medium hover:bg-gray-50">Cancel</button>
          <button type="submit" disabled={loading || !selectedDepartment} className="px-4 py-2 bg-teal-600 text-white font-medium rounded-md hover:bg-teal-700 disabled:opacity-50">
            {loading ? 'Assigning...' : 'Assign Department'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default AssignVehicleDepartmentModal;