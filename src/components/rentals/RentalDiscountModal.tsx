import React, { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Rental } from '../../types';
import { useAuth } from '../../context/AuthContext';
import FormField from '../ui/FormField';
import TextArea from '../ui/TextArea';
import toast from 'react-hot-toast';
import { useFormattedDisplay } from '../../hooks/useFormattedDisplay';
import {differenceInDays } from 'date-fns';


interface RentalDiscountModalProps {
  rental: Rental;
  onClose: () => void;
}

const RentalDiscountModal: React.FC<RentalDiscountModalProps> = ({
  rental,
  onClose
}) => {
  const { user } = useAuth();
  const { formatCurrency } = useFormattedDisplay();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    discountPercentage: rental.discountPercentage || 0,
    discountAmount: rental.discountAmount || 0,
    freePeriod: 0,
    notes: rental.discountNotes || '' // Initialize notes from existing rental discountNotes
  });

  // Determine the rate per period based on rental type for free period calculation
  // Use rental's standardCost per day/week for this if available and not 0, otherwise default.
  // Assuming standardCost in rental object *could* be per-day or per-week depending on rental.type,
  // or default to RENTAL_RATES if standardCost is not set or 0.
  const periodRate = rental.type === 'weekly' 
    ? (rental.standardCost && rental.standardCost !== 0 ? rental.standardCost : 360) 
    : (rental.standardCost && rental.standardCost !== 0 ? rental.standardCost : 60);

  // Helper to calculate cost for free period
  const calculateFreePeriodCost = (period: number): number => {
    return period * periodRate;
  };

  // The base amount to apply discounts to.
  // This should be the original total cost before any discount from this modal.
  // Assuming 'rental.standardCost' holds the cost without any previous discounts applied
  // but *with* all other charges (VAT, delivery, etc.) included, similar to how RentalEditModal calculates `totalCostBeforeDiscount`.
  // If `rental.cost` *already* includes previous discounts, we need to re-add them to get the base.
  const baseForDiscountCalculation = (rental.cost || 0) + (rental.discountAmount || 0);


  // Handle discount amount change
  const handleDiscountAmountChange = (amount: number) => {
    const percentage = baseForDiscountCalculation > 0 ? (amount / baseForDiscountCalculation) * 100 : 0;
    setFormData(prev => ({
      ...prev,
      discountAmount: Math.min(amount, baseForDiscountCalculation), // Cap discount amount to total cost
      discountPercentage: Number(percentage.toFixed(2)),
      freePeriod: 0 // Reset free period if amount is manually set
    }));
  };

  // Handle discount percentage change
  const handleDiscountPercentageChange = (percentage: number) => {
    const amount = (percentage * baseForDiscountCalculation) / 100;
    setFormData(prev => ({
      ...prev,
      discountPercentage: Math.min(percentage, 100), // Cap percentage to 100
      discountAmount: Number(amount.toFixed(2)),
      freePeriod: 0 // Reset free period if percentage is manually set
    }));
  };

  // Handle free period change
  const handleFreePeriodChange = (period: number) => {
    const freePeriodCost = calculateFreePeriodCost(period);
    const percentage = baseForDiscountCalculation > 0 ? (freePeriodCost / baseForDiscountCalculation) * 100 : 0;
    setFormData(prev => ({
      ...prev,
      freePeriod: period,
      discountAmount: Number(freePeriodCost.toFixed(2)),
      discountPercentage: Number(percentage.toFixed(2))
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    try {
      const totalDiscountAmount = formData.discountAmount;

      // Calculate the new total cost for the rental after applying the discount
      const newTotalCost = baseForDiscountCalculation - totalDiscountAmount;
      
      // Calculate the new remaining amount based on the new total cost
      const newRemainingAmount = newTotalCost - (rental.paidAmount || 0);

      // Create new discount history entry
      const newDiscountEntry = {
        date: new Date(),
        percentage: formData.discountPercentage,
        amount: totalDiscountAmount,
        freePeriod: formData.freePeriod,
        freePeriodType: rental.type,
        notes: formData.notes,
        appliedBy: user.id // Store user ID
      };

      // Initialize discountHistory array if it doesn't exist
      const currentDiscountHistory = Array.isArray(rental.discountHistory) ? rental.discountHistory : [];

      // *** FIX: Correctly determine the new payment status ***
      const newPaymentStatus = newRemainingAmount <= 0.001 
        ? 'paid' 
        : ((rental.paidAmount || 0) > 0 ? 'partially_paid' : 'pending');

      await updateDoc(doc(db, 'rentals', rental.id), {
        cost: newTotalCost, // Update the main rental cost field
        discountPercentage: formData.discountPercentage > 0 ? formData.discountPercentage : null,
        discountAmount: totalDiscountAmount > 0 ? totalDiscountAmount : null,
        // freePeriod and freePeriodType are not standard Rental fields, consider storing in discountHistory or notes
        remainingAmount: newRemainingAmount, // Update remaining amount based on new total cost
        discountNotes: formData.notes || null,
        paymentStatus: newPaymentStatus, // Use the corrected status
        updatedAt: new Date(),
        updatedBy: user.id,
        // Storing discount history is a good practice for auditing
        // discountHistory: [...currentDiscountHistory, newDiscountEntry] 
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

  const finalCostAfterCurrentDiscount = baseForDiscountCalculation - formData.discountAmount;
  const newRemainingAfterCurrentDiscount = finalCostAfterCurrentDiscount - (rental.paidAmount || 0);


  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-gray-50 p-4 rounded-lg space-y-2">
        <div className="flex justify-between text-sm">
          <span>Base Rental Cost (before this discount):</span>
          <span className="font-medium">{formatCurrency(baseForDiscountCalculation)}</span>
        </div>
        <div className="flex justify-between text-sm text-green-600">
          <span>Current Discount Amount:</span>
          <span>-{formatCurrency(formData.discountAmount)}</span>
        </div>
        <div className="flex justify-between text-sm font-medium pt-2 border-t">
          <span>New Total Cost:</span>
          <span>{formatCurrency(finalCostAfterCurrentDiscount)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>Amount Paid:</span>
          <span className="text-green-600">{formatCurrency(rental.paidAmount || 0)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>New Remaining Amount:</span>
          <span className="text-amber-600">{formatCurrency(newRemainingAfterCurrentDiscount)}</span>
        </div>
        <div className="text-sm text-gray-500 pt-2 border-t">
          <div>
            Vehicle {rental.type === 'weekly' ? 'Weekly' : 'Daily'} Rate: {formatCurrency(periodRate)}
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
        max={baseForDiscountCalculation} // Max discount should be the base cost
        step="0.1"
      />

      <FormField
        type="number"
        label={`Free ${rental.type === 'weekly' ? 'Weeks' : 'Days'}`}
        value={formData.freePeriod}
        onChange={(e) => handleFreePeriodChange(parseInt(e.target.value) || 0)}
        min="0"
        // Cap max free period to not exceed the entire rental duration
        max={rental.type === 'weekly' ? Math.ceil(differenceInDays(rental.endDate, rental.startDate) / 7) : differenceInDays(rental.endDate, rental.startDate) + 1}
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
          disabled={loading || (formData.discountAmount === 0 && formData.notes === '')} // Disable if no discount or notes
          className={`inline-flex justify-center px-4 py-2 text-sm font-medium text-white border border-transparent rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 ${
            (loading || (formData.discountAmount === 0 && formData.notes === ''))
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-primary hover:bg-primary-dark focus:ring-primary'
          }`}
        >
          {loading ? 'Applying...' : 'Apply Discount'}
        </button>
      </div>
    </form>
  );
};

export default RentalDiscountModal;
