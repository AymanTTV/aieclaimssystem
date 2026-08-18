// src/components/vehicles/VehicleSaleModal.tsx

import React, { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Vehicle } from '../../types';
import { createFinanceTransaction } from '../../utils/financeTransactions';
import FormField from '../ui/FormField';
import Modal from '../ui/Modal';
import toast from 'react-hot-toast';

interface VehicleSaleModalProps {
  vehicle: Vehicle;
  onClose: () => void;
}

const VehicleSaleModal: React.FC<VehicleSaleModalProps> = ({ vehicle, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    salePrice: '',
    saleDate: new Date().toISOString().split('T')[0],
    notes: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.salePrice || parseFloat(formData.salePrice) <= 0) {
      toast.error('Please enter a valid sale price');
      return;
    }

    setLoading(true);

    try {
      const salePrice = parseFloat(formData.salePrice);
      const saleDate = new Date(formData.saleDate);

      // 1) Update vehicle record with sold status
      await updateDoc(doc(db, 'vehicles', vehicle.id), {
        status: 'sold',
        activeStatuses: ['sold'],
        soldDate: saleDate,
        salePrice,
        notes: formData.notes || null,
        updatedAt: new Date()
      });

      // 2) Extract and coalesce vehicle owner info
      const vehicleOwner = vehicle.owner
        ? {
            name: vehicle.owner.name,
            isDefault: vehicle.owner.isDefault ?? false,
          }
        : undefined;

      // 3) Create finance transaction for the sale (Income)
      await createFinanceTransaction({
        type: 'income',
        category: 'vehicle-sale',
        amount: salePrice,
        description: `Sale of vehicle ${vehicle.make} ${vehicle.model} (${vehicle.registrationNumber})`,
        referenceId: vehicle.id,
        vehicleId: vehicle.id,
        vehicleName: `${vehicle.make} ${vehicle.model} (${vehicle.registrationNumber})`,
        vehicleOwner,
        paymentStatus: 'paid',
        date: saleDate,
        accountTo: vehicle.owner?.accountId || undefined, 
        groupId: vehicle.assignedGroupId || undefined, // ✅ Pass the vehicle's assigned group
      });

      toast.success('Vehicle marked as sold successfully');
      onClose();
    } catch (error) {
      console.error('Error marking vehicle as sold:', error);
      toast.error('Failed to mark vehicle as sold');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Mark Vehicle as Sold"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField
          type="date"
          label="Sale Date"
          value={formData.saleDate}
          onChange={(e) => setFormData({ ...formData, saleDate: e.target.value })}
          required
          max={new Date().toISOString().split('T')[0]}
        />

        <FormField
          type="number"
          label="Sale Price (£)"
          value={formData.salePrice}
          onChange={(e) => setFormData({ ...formData, salePrice: e.target.value })}
          required
          min="0.01"
          step="0.01"
          placeholder="Enter sale price"
        />

        <div>
          <label className="block text-sm font-medium text-gray-700">Notes (Optional)</label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            rows={3}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
            placeholder="Add any notes about the sale"
          />
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
            {loading ? 'Processing...' : 'Mark as Sold'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default VehicleSaleModal;