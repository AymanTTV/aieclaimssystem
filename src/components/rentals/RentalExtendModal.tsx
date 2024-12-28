import React, { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Rental } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { addDays, addWeeks, format } from 'date-fns';
import { calculateRentalCost, RENTAL_RATES, type RentalType } from '../../utils/rentalCalculations';
import toast from 'react-hot-toast';
import FormField from '../ui/FormField';

interface RentalExtendModalProps {
  rental: Rental;
  onClose: () => void;
}

const RentalExtendModal: React.FC<RentalExtendModalProps> = ({ rental, onClose }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [customRate, setCustomRate] = useState<string>('');
  const [negotiationNotes, setNegotiationNotes] = useState('');
  const [extensionPeriod, setExtensionPeriod] = useState(rental.type === 'weekly' ? 1 : 1);
  const [extensionUnit, setExtensionUnit] = useState<'days' | 'weeks'>(
    rental.type === 'weekly' ? 'weeks' : 'days'
  );

  const newEndDate = extensionUnit === 'weeks' 
    ? addWeeks(rental.endDate, extensionPeriod)
    : addDays(rental.endDate, extensionPeriod);

  const standardExtensionCost = calculateRentalCost(
    rental.endDate,
    newEndDate,
    rental.type
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const finalCost = customRate ? parseFloat(customRate) : standardExtensionCost;
      const totalCost = rental.cost + finalCost;

      await updateDoc(doc(db, 'rentals', rental.id), {
        endDate: newEndDate,
        cost: totalCost,
        extensionHistory: [
          ...(rental.extensionHistory || []),
          {
            date: new Date(),
            originalEndDate: rental.endDate,
            newEndDate,
            cost: finalCost,
            approvedBy: user?.id,
            negotiated: !!customRate,
            negotiationNotes: negotiationNotes || null
          }
        ],
        updatedAt: new Date(),
        updatedBy: user?.id
      });

      toast.success('Rental extended successfully');
      onClose();
    } catch (error) {
      console.error('Error extending rental:', error);
      toast.error('Failed to extend rental');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700">Extension Period</label>
        <div className="mt-1 flex space-x-2">
          <input
            type="number"
            value={extensionPeriod}
            onChange={(e) => setExtensionPeriod(parseInt(e.target.value))}
            min="1"
            className="block w-20 rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
            required
          />
          <select
            value={extensionUnit}
            onChange={(e) => setExtensionUnit(e.target.value as 'days' | 'weeks')}
            className="block rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
          >
            <option value="days">Days</option>
            <option value="weeks">Weeks</option>
          </select>
        </div>
      </div>

      <div className="bg-gray-50 p-4 rounded-lg">
        <div className="flex justify-between items-center mb-4">
          <div>
            <p className="text-sm text-gray-500">New End Date</p>
            <p className="text-lg font-medium">{format(newEndDate, 'MMM dd, yyyy')}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Extension Cost</p>
            <p className="text-lg font-medium">£{standardExtensionCost.toFixed(2)}</p>
          </div>
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
          {loading ? 'Processing...' : 'Extend Rental'}
        </button>
      </div>
    </form>
  );
};

export default RentalExtendModal;