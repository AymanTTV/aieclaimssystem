import React, { useState } from 'react';
import { Rental } from '../../types/rental';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { createFinanceTransaction } from '../../utils/financeTransactions';
import { calculateRentalCost } from '../../utils/rentalCalculations';
import { format } from 'date-fns';
import FormField from '../ui/FormField';
import toast from 'react-hot-toast';

interface RentalEditModalProps {
  rental: Rental;
  onClose: () => void;
}

const RentalEditModal: React.FC<RentalEditModalProps> = ({ rental, onClose }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [customRate, setCustomRate] = useState<string>('');
  const [negotiationNotes, setNegotiationNotes] = useState('');
  const [formData, setFormData] = useState({
    ...rental,
    startDate: format(rental.startDate, 'yyyy-MM-dd'),
    endDate: format(rental.endDate, 'yyyy-MM-dd'),
  });

  const standardCost = calculateRentalCost(
    new Date(formData.startDate),
    new Date(formData.endDate),
    formData.type,
    formData.reason
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    try {
      const finalCost = customRate ? parseFloat(customRate) : standardCost;

      const rentalRef = doc(db, 'rentals', rental.id);
      const updatedData = {
        ...formData,
        startDate: new Date(formData.startDate),
        endDate: new Date(formData.endDate),
        cost: finalCost,
        standardCost,
        negotiated: !!customRate,
        negotiationNotes: negotiationNotes || null,
        approvedBy: customRate ? user.id : null,
        updatedAt: new Date(),
        updatedBy: user.id,
      };

      await updateDoc(rentalRef, updatedData);

      // Create finance transaction if status changed to completed
      if (formData.status === 'completed' && rental.status !== 'completed') {
        await createFinanceTransaction({
          type: 'income',
          category: 'rental',
          amount: finalCost,
          description: `Rental income for vehicle from ${formData.startDate} to ${formData.endDate}`,
          referenceId: rental.id,
          vehicleId: rental.vehicleId,
        });
      }

      toast.success('Rental updated successfully');
      onClose();
    } catch (error) {
      console.error('Error updating rental:', error);
      toast.error('Failed to update rental');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <FormField
          type="date"
          label="Start Date"
          value={formData.startDate}
          onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
          required
        />

        <FormField
          type="date"
          label="End Date"
          value={formData.endDate}
          onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
          required
          min={formData.startDate}
        />

        <div>
          <label className="block text-sm font-medium text-gray-700">Type</label>
          <select
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value as Rental['type'] })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
            required
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="claim">Claim</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Reason</label>
          <select
            value={formData.reason}
            onChange={(e) => setFormData({ ...formData, reason: e.target.value as Rental['reason'] })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
            required
          >
            <option value="hired">Hired</option>
            <option value="claim">Claim</option>
            <option value="o/d">O/D</option>
            <option value="staff">Staff</option>
            <option value="workshop">Workshop</option>
            <option value="wfw-c-substitute">WFW C Substitute</option>
            <option value="h-substitute">H Substitute</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Status</label>
          <select
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value as Rental['status'] })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
            required
          >
            <option value="urgent">Urgent</option>
            <option value="awaiting">Awaiting</option>
            <option value="levc-loan">LEVC Loan</option>
            <option value="completed">Completed</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Payment Status</label>
          <select
            value={formData.paymentStatus}
            onChange={(e) => setFormData({ ...formData, paymentStatus: e.target.value as Rental['paymentStatus'] })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
            required
          >
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
            <option value="overdue">Overdue</option>
          </select>
        </div>
      </div>

      <div className="bg-gray-50 p-4 rounded-lg">
        <div className="flex justify-between items-center mb-4">
          <span className="text-sm font-medium text-gray-700">Standard Cost:</span>
          <span className="text-lg font-semibold">£{standardCost.toFixed(2)}</span>
        </div>

        {(user?.role === 'admin' || user?.role === 'manager') && (
          <>
            <div className="space-y-4">
              <FormField
                type="number"
                label="Negotiated Rate (Optional)"
                value={customRate}
                onChange={(e) => setCustomRate(e.target.value)}
                min="0"
                step="0.01"
                placeholder="Enter custom rate"
              />

              <div>
                <label className="block text-sm font-medium text-gray-700">Negotiation Notes</label>
                <textarea
                  value={negotiationNotes}
                  onChange={(e) => setNegotiationNotes(e.target.value)}
                  rows={2}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                  placeholder="Enter reason for rate negotiation..."
                  required={!!customRate}
                />
              </div>
            </div>

            {customRate && (
              <div className="mt-4 p-2 bg-yellow-50 border border-yellow-200 rounded">
                <p className="text-sm text-yellow-800">
                  Custom rate will be approved by {user.name} ({user.role})
                </p>
              </div>
            )}
          </>
        )}
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
          {loading ? 'Updating...' : 'Update Rental'}
        </button>
      </div>
    </form>
  );
};

export default RentalEditModal;