import React, { useState, useEffect } from 'react';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Rental, Vehicle } from '../../types';
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
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [formData, setFormData] = useState({
    discountPercentage: rental.discountPercentage ? parseFloat(rental.discountPercentage.toFixed(1)) : 0,
    discountAmount: rental.discountAmount || 0,
    freePeriod: 0,
    notes: ''
  });

  // Fetch vehicle details
  useEffect(() => {
    const fetchVehicle = async () => {
      try {
        const vehicleDoc = await getDoc(doc(db, 'vehicles', rental.vehicleId));
        if (vehicleDoc.exists()) {
          setVehicle(vehicleDoc.data() as Vehicle);
        }
      } catch (error) {
        console.error('Error fetching vehicle:', error);
        toast.error('Failed to fetch vehicle details');
      }
    };
    fetchVehicle();
  }, [rental.vehicleId]);

  // Get correct vehicle rates
  const getVehicleRate = () => {
    if (!vehicle) return rental.type === 'weekly' ? 360 : 60;
    return rental.type === 'weekly' ? vehicle.weeklyRentalPrice : vehicle.dailyRentalPrice;
  };

  const vehicleRate = getVehicleRate();

  // Update percentage and amount when one changes
  const handlePercentageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const percentage = parseFloat(e.target.value) || 0;
    const roundedPercentage = parseFloat(percentage.toFixed(1));
    const amount = (rental.cost * roundedPercentage) / 100;
    setFormData({ ...formData, discountPercentage: roundedPercentage, discountAmount: amount });
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const amount = parseFloat(e.target.value) || 0;
    const percentage = (amount / rental.cost) * 100;
    const roundedPercentage = parseFloat(percentage.toFixed(1));
    setFormData({ ...formData, discountAmount: amount, discountPercentage: roundedPercentage });
  };

  const handleFreePeriodChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, freePeriod: parseInt(e.target.value) });
  };

  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setFormData({ ...formData, notes: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    try {
      // Calculate discount amounts
      const discountAmountEntered = formData.discountAmount;
      const freePeriodDiscount = formData.freePeriod * vehicleRate;
      const totalDiscountAmount = discountAmountEntered + freePeriodDiscount;
      const remainingAmount = rental.cost - rental.paidAmount - totalDiscountAmount;

      // Get existing discount history
      const existingHistory = rental.discountHistory || [];

      // Create new discount history entry
      const newDiscountEntry = {
        date: new Date(),
        percentage: formData.discountPercentage,
        amount: discountAmountEntered,
        freePeriod: formData.freePeriod,
        freePeriodType: rental.type,
        notes: formData.notes,
        appliedBy: user.name,
        vehicleRateUsed: vehicleRate
      };

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
        discountHistory: [...existingHistory, newDiscountEntry]
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

  // Calculate preview values
  const freePeriodDiscount = formData.freePeriod * vehicleRate;
  const totalDiscountAmount = formData.discountAmount + freePeriodDiscount;
  const newRemainingAmount = rental.cost - rental.paidAmount - totalDiscountAmount;

  if (!vehicle) {
    return <div>Loading vehicle details...</div>;
  }

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
            Vehicle {rental.type === 'weekly' ? 'Weekly' : 'Daily'} Rate: £{vehicleRate}
          </div>
        </div>
      </div>

      <FormField
        type="number"
        label="Discount Percentage"
        value={formData.discountPercentage}
        onChange={handlePercentageChange}
        min="0"
        max="100"
        step="0.1"
      />

      <FormField
        type="number"
        label="Discount Amount (£)"
        value={formData.discountAmount}
        onChange={handleAmountChange}
        min="0"
        max={rental.cost}
        step="0.1"
      />

      <FormField
        type="number"
        label={`Free ${rental.type === 'weekly' ? 'Weeks' : 'Days'}`}
        value={formData.freePeriod}
        onChange={handleFreePeriodChange}
        min="0"
        max={rental.type === 'weekly' ? 52 : 365}
        step="1"
      />

      <TextArea
        label="Notes"
        value={formData.notes}
        onChange={handleNotesChange}
        placeholder="Add notes about this discount..."
        required
      />

      <div className="bg-blue-50 p-4 rounded-lg space-y-2">
        {rental.discountAmount && rental.discountAmount > 0 && (
          <div className="flex justify-between text-sm">
            <span>Existing Discount:</span>
            <span className="text-blue-600">£{rental.discountAmount.toFixed(2)}</span>
          </div>
        )}
        {formData.discountPercentage > 0 && (
          <div className="flex justify-between text-sm">
            <span>Percentage Discount:</span>
            <span className="text-blue-600">{formData.discountPercentage.toFixed(2)}%</span>
          </div>
        )}
        {formData.discountAmount > 0 && (
          <div className="flex justify-between text-sm">
            <span>Discount Amount:</span>
            <span className="text-blue-600">£{formData.discountAmount.toFixed(2)}</span>
          </div>
        )}
        {formData.freePeriod > 0 && (
          <div className="flex justify-between text-sm">
            <span>
              Free Period Discount ({formData.freePeriod}{' '}
              {rental.type === 'weekly' ? 'weeks' : 'days'} @ £{vehicleRate}):
            </span>
            <span className="text-blue-600">£{freePeriodDiscount.toFixed(2)}</span>
          </div>
        )}
        <div className="flex justify-between text-sm font-medium pt-2 border-t">
          <span>Total Discount:</span>
          <span>£{totalDiscountAmount.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm font-medium">
          <span>New Remaining Amount:</span>
          <span>£{newRemainingAmount.toFixed(2)}</span>
        </div>
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
          {loading ? 'Applying...' : 'Apply Discount'}
        </button>
      </div>
    </form>
  );
};

export default RentalDiscountModal;
