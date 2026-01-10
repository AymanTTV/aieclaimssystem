// src/components/vatRecord/StatusUpdateModal.tsx

import React, { useState } from 'react';
import { VATRecord } from '../../types/vatRecord';
// Removed: FormField import as Date input is removed
import TextArea from '../ui/TextArea';
import { doc, writeBatch } from 'firebase/firestore'; 
import { db } from '../../lib/firebase';
import toast from 'react-hot-toast';

interface StatusUpdateModalProps {
  records: VATRecord[]; 
  onClose: () => void;
}

const StatusUpdateModal: React.FC<StatusUpdateModalProps> = ({ records, onClose }) => {
  // Default to the first record's status or 'paid' if none
  const [status, setStatus] = useState<VATRecord['status']>(records[0]?.status || 'paid');
  const [notes, setNotes] = useState(''); 
  // Removed: const [date, setDate] = useState(...)
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (records.length === 0) return;
    
    setLoading(true);
    try {
      const batch = writeBatch(db);

      records.forEach((record) => {
        const recordRef = doc(db, 'vatRecords', record.id);
        const updateData: any = {
          status,
          // Removed: date update
        };
        
        // Overwrite notes
        updateData.notes = notes;

        batch.update(recordRef, updateData);
      });

      await batch.commit();
      
      toast.success(`${records.length} VAT record(s) updated successfully`);
      onClose();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 p-3 rounded text-sm text-blue-800 mb-2">
        You are updating <strong>{records.length}</strong> record(s).
      </div>

      {/* Status Select */}
      <div className="space-y-1">
        <label className="block text-sm font-medium text-gray-700">New Status</label>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as VATRecord['status'])}
          className="form-select"
        >
          <option value="awaiting">Awaiting</option>
          <option value="processing">Processing</option>
          <option value="paid">Paid</option>
        </select>
      </div>

      {/* Notes */}
      <TextArea 
        label="Notes" 
        placeholder="Enter notes to apply to all selected records..."
        value={notes} 
        onChange={(e) => setNotes(e.target.value)} 
      />

      {/* Removed: Date Field */}

      <div className="flex justify-end space-x-3">
        <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">Cancel</button>
        <button onClick={handleSubmit} disabled={loading} className="px-4 py-2 text-sm font-medium text-white bg-primary border border-transparent rounded-md hover:bg-primary-600">{loading ? 'Updating...' : 'Update All'}</button>
      </div>
    </div>
  );
};

export default StatusUpdateModal;