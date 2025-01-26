import React, { useState } from 'react';
import { Rental, Vehicle, Customer } from '../../types';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import FormField from '../ui/FormField';
import { generateRentalDocuments } from '../../utils/generateRentalDocuments';
import { uploadRentalDocuments } from '../../utils/uploadRentalDocuments';
import { calculateOverdueCost } from '../../utils/rentalCalculations';

interface RentalCompleteModalProps {
  rental: Rental;
  onClose: () => void;
}

const RentalCompleteModal: React.FC<RentalCompleteModalProps> = ({ rental, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [completionDate, setCompletionDate] = useState(
    format(new Date(), 'yyyy-MM-dd')
  );
  const [completionTime, setCompletionTime] = useState(
    format(new Date(), 'HH:mm')
  );

  const handleComplete = async () => {
    setLoading(true);

    try {
      const completionDateTime = new Date(`${completionDate}T${completionTime}`);

      // Get vehicle and customer details
      const [vehicleDoc, customerDoc] = await Promise.all([
        getDoc(doc(db, 'vehicles', rental.vehicleId)),
        getDoc(doc(db, 'customers', rental.customerId))
      ]);

      if (!vehicleDoc.exists() || !customerDoc.exists()) {
        throw new Error('Vehicle or customer data not found');
      }

      const vehicle = { id: vehicleDoc.id, ...vehicleDoc.data() } as Vehicle;
      const customer = { id: customerDoc.id, ...customerDoc.data() } as Customer;

      // Calculate overdue costs if any
      const overdueCost = calculateOverdueCost(rental, completionDateTime, vehicle);
      const totalCost = rental.cost + overdueCost;

      // Update rental record
      const updatedRentalData = {
  status: 'completed',
  endDate: completionDateTime,
  cost: totalCost,
  remainingAmount: totalCost - (rental.paidAmount || 0),
  updatedAt: new Date(),
};


      await updateDoc(doc(db, 'rentals', rental.id), updatedRentalData);

      // Generate and upload new documents
      const documents = await generateRentalDocuments(
        { 
          ...rental, 
          ...updatedRentalData,
          vehicle,
          customer
        },
        vehicle,
        customer
      );

      if (documents) {
        await uploadRentalDocuments(rental.id, documents);
      }

      toast.success('Rental completed successfully');
      onClose();
    } catch (error) {
      console.error('Error completing rental:', error);
      toast.error('Failed to complete rental');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">
        Please select the completion date and time for this rental.
      </p>

      <div className="grid grid-cols-2 gap-4">
        <FormField
          type="date"
          label="Completion Date"
          value={completionDate}
          onChange={(e) => setCompletionDate(e.target.value)}
          required
        />

        <FormField
          type="time"
          label="Completion Time"
          value={completionTime}
          onChange={(e) => setCompletionTime(e.target.value)}
          required
        />
      </div>

      {/* Show rental details */}
      <div className="bg-gray-50 p-4 rounded-lg space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Original End Date:</span>
          <span>{format(rental.endDate, 'dd/MM/yyyy HH:mm')}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Base Cost:</span>
          <span>£{rental.cost.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Amount Paid:</span>
          <span className="text-green-600">£{rental.paidAmount.toFixed(2)}</span>
        </div>
        {rental.remainingAmount > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Remaining Amount:</span>
            <span className="text-amber-600">£{rental.remainingAmount.toFixed(2)}</span>
          </div>
        )}
      </div>

      {/* Warning if completing early/late */}
      {new Date(`${completionDate}T${completionTime}`) < rental.endDate ? (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                You are completing this rental earlier than scheduled.
              </p>
            </div>
          </div>
        </div>
      ) : new Date(`${completionDate}T${completionTime}`) > rental.endDate ? (
        <div className="bg-red-50 border-l-4 border-red-400 p-4">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-red-700">
                This rental will be marked as overdue.
              </p>
            </div>
          </div>
        </div>
      ) : null}

      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleComplete}
          disabled={loading}
          className="px-4 py-2 text-sm font-medium text-white bg-primary border border-transparent rounded-md hover:bg-primary-600"
        >
          {loading ? 'Completing...' : 'Complete Rental'}
        </button>
      </div>
    </div>
  );
};

export default RentalCompleteModal;