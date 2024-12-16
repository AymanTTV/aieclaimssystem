import React, { useState } from 'react';
import { MaintenanceLog } from '../../types';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { createFinanceTransaction } from '../../utils/financeTransactions';

interface MaintenanceEditModalProps {
  log: MaintenanceLog;
  onClose: () => void;
}

const MaintenanceEditModal: React.FC<MaintenanceEditModalProps> = ({ log, onClose }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    ...log,
    date: log.date.toISOString().split('T')[0],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    try {
      const logRef = doc(db, 'maintenanceLogs', log.id);
      const updatedData = {
        ...formData,
        date: new Date(formData.date),
        updatedAt: new Date(),
        updatedBy: user.id,
      };

      await updateDoc(logRef, updatedData);

      // Create finance transaction if status changed to completed
      if (formData.status === 'completed' && log.status !== 'completed') {
        await createFinanceTransaction({
          type: 'expense',
          category: 'maintenance',
          amount: formData.cost,
          description: `Maintenance cost for ${formData.description}`,
          referenceId: log.id,
          vehicleId: log.vehicleId,
        });
      }

      toast.success('Maintenance log updated successfully');
      onClose();
    } catch (error) {
      console.error('Error updating maintenance log:', error);
      toast.error('Failed to update maintenance log');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">Type</label>
        <select
          value={formData.type}
          onChange={(e) => setFormData({ ...formData, type: e.target.value })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
        >
          <option value="routine">Routine</option>
          <option value="repair">Repair</option>
          <option value="emergency">Emergency</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Date</label>
        <input
          type="date"
          value={formData.date}
          onChange={(e) => setFormData({ ...formData, date: e.target.value })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Description</label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={3}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Cost</label>
        <input
          type="number"
          value={formData.cost}
          onChange={(e) => setFormData({ ...formData, cost: parseFloat(e.target.value) })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
          required
          min="0"
          step="0.01"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Service Provider</label>
        <input
          type="text"
          value={formData.serviceProvider}
          onChange={(e) => setFormData({ ...formData, serviceProvider: e.target.value })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Status</label>
        <select
          value={formData.status}
          onChange={(e) => setFormData({ ...formData, status: e.target.value })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
        >
          <option value="scheduled">Scheduled</option>
          <option value="in-progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      <div className="flex justify-end space-x-3">
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
          {loading ? 'Updating...' : 'Update Maintenance'}
        </button>
      </div>
    </form>
  );
};

export default MaintenanceEditModal;