import React, { useState } from 'react';
import { Accident } from '../../types';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

interface StatusUpdateModalProps {
  accident: Accident;
  onClose: () => void;
}

const StatusUpdateModal: React.FC<StatusUpdateModalProps> = ({ accident, onClose }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    isReported: accident.isReported || false,
    status: accident.status === 'reported' ? 'pending' : (accident.status || 'pending'),
    type: accident.type || 'pending',
    otherTypeDescription: accident.otherTypeDescription || '',
    claimStatus: accident.claimStatus || 'pending',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    try {
      const accidentRef = doc(db, 'accidents', accident.id);
      await updateDoc(accidentRef, {
        isReported: formData.isReported,
        status: formData.status,
        type: formData.type,
        // Only save the description if "other" is selected
        otherTypeDescription: formData.type === 'other' ? formData.otherTypeDescription : '',
        claimStatus: formData.claimStatus,
        updatedAt: new Date(),
        updatedBy: user.id,
      });

      toast.success('Status updated successfully');
      onClose();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      
      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
        <label className="flex items-center space-x-3 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.isReported}
            onChange={(e) => setFormData({ ...formData, isReported: e.target.checked })}
            className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm font-medium text-gray-900">Is this Accident Officially Reported?</span>
        </label>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Accident Workflow Status</label>
          <select
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
          >
            <option value="pending">Pending</option>
            <option value="investigating">Investigating</option>
            <option value="processing">Processing</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Type</label>
          <select
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
          >
            <option value="pending">Pending</option>
            <option value="fault">Fault</option>
            <option value="non-fault">Non-Fault</option>
            <option value="other">Other</option>
          </select>
        </div>

        {formData.type === 'other' && (
          <div>
            <label className="block text-sm font-medium text-gray-700">Please describe the 'Other' type</label>
            <input
              type="text"
              value={formData.otherTypeDescription}
              onChange={(e) => setFormData({ ...formData, otherTypeDescription: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
              required
              placeholder="Provide more details..."
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700">Claim Status</label>
          <select
            value={formData.claimStatus}
            onChange={(e) => setFormData({ ...formData, claimStatus: e.target.value as any })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
          >
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="settled">Settled</option>
          </select>
        </div>
      </div>

      <div className="flex justify-end space-x-3 pt-4 border-t">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 text-sm font-medium text-white bg-primary border border-transparent rounded-md hover:bg-primary-600"
        >
          {loading ? 'Updating...' : 'Update Status'}
        </button>
      </div>
    </form>
  );
};

export default StatusUpdateModal;