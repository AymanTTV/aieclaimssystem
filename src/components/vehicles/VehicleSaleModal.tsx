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
        groupId: vehicle.assignedGroupId || undefined,
        departmentId: vehicle.assignedDepartmentId || undefined, // ✅ Pass the vehicle's assigned department
        departmentName: vehicle.assignedDepartmentName || undefined, // ✅ Pass the vehicle's assigned department name
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
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
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
            <label className="block text-sm font-semibold text-slate-800 mb-1.5">Notes (Optional)</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="block w-full rounded-xl bg-white border-[1.5px] border-[#CBD5E1] text-[#0F172A] p-3 text-sm placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Add any notes about the sale"
            />
          </div>
        </div>

        <div className="flex justify-end space-x-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-100 transition-all cursor-pointer shadow-xs"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl shadow-md disabled:opacity-50 transition-all cursor-pointer"
          >
            {loading ? 'Processing...' : 'Mark as Sold'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default VehicleSaleModal;