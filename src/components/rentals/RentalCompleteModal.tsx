// src/components/rentals/RentalCompleteModal.tsx

import React, { useState } from 'react';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Rental, Vehicle } from '../../types';
import { useAuth } from '../../context/AuthContext';
import FormField from '../ui/FormField';
import Modal from '../ui/Modal';
import { generateRentalDocuments } from '../../utils/generateRentalDocuments';
import { uploadRentalDocuments } from '../../utils/documentUpload';
import { calculateOverdueCost } from '../../utils/rentalCalculations';
import ReturnConditionForm from './ReturnConditionForm';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

interface RentalCompleteModalProps {
  rental: Rental;
  onClose: () => void;
}

const RentalCompleteModal: React.FC<RentalCompleteModalProps> = ({ rental, onClose }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showReturnForm, setShowReturnForm] = useState(false);
  const [completionDate, setCompletionDate] = useState(
    format(new Date(), 'yyyy-MM-dd')
  );
  const [completionTime, setCompletionTime] = useState(
    format(new Date(), 'HH:mm')
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    try {
      const completionDateTime = new Date(`${completionDate}T${completionTime}`);
      setShowReturnForm(true);
    } catch (error) {
      console.error('Error completing rental:', error);
      toast.error('Failed to complete rental');
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField
          type="date"
          label="Completion Date"
          value={completionDate}
          onChange={(e) => setCompletionDate(e.target.value)}
          required
          max={new Date().toISOString().split('T')[0]}
        />

        <FormField
          type="time"
          label="Completion Time"
          value={completionTime}
          onChange={(e) => setCompletionTime(e.target.value)}
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
            {loading ? 'Processing...' : 'Complete Rental'}
          </button>
        </div>
      </form>

      {showReturnForm && (
        <Modal
          isOpen={showReturnForm}
          onClose={() => setShowReturnForm(false)}
          title="Vehicle Return Condition"
        >
          <ReturnConditionForm
            checkOutCondition={rental.checkOutCondition}
            onSubmit={async (condition) => {
              try {
                const completionDateTime = new Date(`${completionDate}T${completionTime}`);
                await updateDoc(doc(db, 'rentals', rental.id), {
                  status: 'completed',
                  endDate: completionDateTime,
                  returnCondition: condition,
                  additionalCharges: condition.totalCharges,
                  updatedAt: new Date()
                });

                toast.success('Rental completed successfully');
                onClose();
              } catch (error) {
                console.error('Error completing rental:', error);
                toast.error('Failed to complete rental');
              }
            }}
            onClose={() => setShowReturnForm(false)}
          />
        </Modal>
      )}
    </div>
  );
};

export default RentalCompleteModal;
