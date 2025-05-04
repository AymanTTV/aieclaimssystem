import React, { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Rental } from '../../types';
import { useAuth } from '../../context/AuthContext';
import FormField from '../ui/FormField';
import TextArea from '../ui/TextArea';
import toast from 'react-hot-toast';

interface RentalDiscountModalProps {
  rental: Rental;
  onClose: () => void;
}

const RentalDiscountModal: React.FC<RentalDiscountModalProps> = ({
  rental,
  onClose
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    discountPercentage: rental.discountPercentage || 0,
    discountAmount: rental.discountAmount || 0,
    freePeriod: 0,
    notes: ''
  });

  // Calculate rates based on rental type
  const periodRate = rental.type === 'weekly' ? 360 : 60;

  // Handle discount amount change
  const handleDiscountAmountChange = (amount: number) => {
    const percentage = (amount / rental.cost) * 100;
    setFormData(prev => ({
      ...prev,
      discountAmount: amount,
      discountPercentage: Number(percentage.toFixed(2))
    }));
  };

  // Handle discount percentage change
  const handleDiscountPercentageChange = (percentage: number) => {
    const amount = (percentage * rental.cost) / 100;
    setFormData(prev => ({
      ...prev,
      discountPercentage: percentage,
      discountAmount: Number(amount.toFixed(2))
    }));
  };

  // Handle free period change
  const handleFreePeriodChange = (period: number) => {
    const amount = period * periodRate;
    const percentage = (amount / rental.cost) * 100;
    setFormData(prev => ({
      ...prev,
      freePeriod: period,
      discountAmount: amount,
      discountPercentage: Number(percentage.toFixed(2))
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    try {
      const discountAmount = parseFloat(formData.discountAmount.toString()) || 0;
      const freePeriodDiscount = formData.freePeriod * periodRate;
      const totalDiscountAmount = discountAmount + freePeriodDiscount;
      const remainingAmount = rental.cost - rental.paidAmount - totalDiscountAmount;

      // Create new discount history entry
      const newDiscountEntry = {
        date: new Date(),
        percentage: formData.discountPercentage,
        amount: discountAmount,
        freePeriod: formData.freePeriod,
        freePeriodType: rental.type,
        notes: formData.notes,
        appliedBy: user.name
      };

      // Initialize discountHistory array if it doesn't exist
      const currentDiscountHistory = Array.isArray(rental.discountHistory) ? rental.discountHistory : [];

      await updateDoc(doc(db, 'rentals', rental.id), {
        discountPercentage: formData.discountPercentage,
        discountAmount: totalDiscountAmount,
        freePeriod: formData.freePeriod,
        freePeriodType: rental.type,
        remainingAmount,
        discountNotes: formData.notes,
        paymentStatus: remainingAmount <= 0 ? 'paid' : 'partially_paid',
        updatedAt: new Date(),
        updatedBy: user.id,
        discountHistory: [...currentDiscountHistory, newDiscountEntry]
      });

      toast.success('Discount applied successfully');
      onClose();
    } catch (error) {
      console.error('Error applying discount:', error);
      toast.error('Failed to apply discount');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-gray-50 p-4 rounded-lg space-y-2">
        <div className="flex justify-between text-sm">
          <span>Total Cost:</span>
          <span className="font-medium">£{rental.cost.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>Amount Paid:</span>
          <span className="text-green-600">£{rental.paidAmount.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>Current Remaining:</span>
          <span className="text-amber-600">£{rental.remainingAmount.toFixed(2)}</span>
        </div>
        <div className="text-sm text-gray-500 pt-2 border-t">
          <div>
            Vehicle {rental.type === 'weekly' ? 'Weekly' : 'Daily'} Rate: £{periodRate}
          </div>
        </div>
      </div>

      <FormField
        type="number"
        label="Discount Percentage"
        value={formData.discountPercentage}
        onChange={(e) => handleDiscountPercentageChange(parseFloat(e.target.value) || 0)}
        min="0"
        max="100"
        step="0.01"
      />

      <FormField
        type="number"
        label="Discount Amount (£)"
        value={formData.discountAmount}
        onChange={(e) => handleDiscountAmountChange(parseFloat(e.target.value) || 0)}
        min="0"
        max={rental.cost}
        step="0.1"
      />

      <FormField
        type="number"
        label={`Free ${rental.type === 'weekly' ? 'Weeks' : 'Days'}`}
        value={formData.freePeriod}
        onChange={(e) => handleFreePeriodChange(parseInt(e.target.value) || 0)}
        min="0"
        max={rental.type === 'weekly' ? 52 : 365}
        step="1"
      />

      <TextArea
        label="Notes"
        value={formData.notes}
        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
        placeholder="Add notes about this discount..."
        required
      />

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
          {loading ? 'Applying...' : 'Apply Discount'}
        </button>
      </div>
    </form>
  );
};

export default RentalDiscountModal;