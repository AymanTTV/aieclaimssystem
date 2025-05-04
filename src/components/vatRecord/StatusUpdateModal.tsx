// src/components/vatRecord/StatusUpdateModal.tsx

import React, { useState } from 'react';
import { VATRecord } from '../../types/vatRecord';
import FormField from '../ui/FormField';
import TextArea from '../ui/TextArea';
import { updateDoc, doc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import toast from 'react-hot-toast';

interface StatusUpdateModalProps {
  record: VATRecord;
  onClose: () => void;
}

const StatusUpdateModal: React.FC<StatusUpdateModalProps> = ({ record, onClose }) => {
  const [status, setStatus] = useState(record.status);
  const [notes, setNotes] = useState(record.notes || '');
  const [date, setDate] = useState(record.date.toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await updateDoc(doc(db, 'vatRecords', record.id), {
        status,
        notes,
        date: new Date(date),
      });
      toast.success('VAT record status updated successfully');
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
      {/* Status Select */}
      <div className="space-y-1">
        <label className="block text-sm font-medium text-gray-700">Status</label>
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
      <TextArea label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} />

      {/* Date */}
      <FormField label="Date" value={date} onChange={(e) => setDate(e.target.value)} type="date" />

      <div className="flex justify-end space-x-3">
        <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">Cancel</button>
        <button onClick={handleSubmit} disabled={loading} className="px-4 py-2 text-sm font-medium text-white bg-primary border border-transparent rounded-md hover:bg-primary-600">{loading ? 'Updating...' : 'Update'}</button>
      </div>
    </div>
  );
};

export default StatusUpdateModal;