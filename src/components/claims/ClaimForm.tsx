import React, { useState } from 'react';
import { ClaimDetails } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import toast from 'react-hot-toast';
import ClaimDetailsForm from './ClaimDetailsForm';

interface ClaimFormProps {
  accidentId: string;
  onClose: () => void;
}

const ClaimForm: React.FC<ClaimFormProps> = ({ accidentId, onClose }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (details: ClaimDetails) => {
    if (!user) return;
    setLoading(true);

    try {
      await addDoc(collection(db, 'claims'), {
        accidentId,
        claimDetails: details,
        status: 'submitted',
        type: 'non-fault', // Default to non-fault, can be updated by claims department
        assignedTo: '', // Will be assigned by claims department
        createdAt: new Date(),
        updatedAt: new Date(),
        documents: {
          invoices: []
        },
        progressNotes: [{
          id: Date.now().toString(),
          date: new Date(),
          note: 'Claim submitted',
          author: user.name
        }]
      });

      toast.success('Claim submitted successfully');
      onClose();
    } catch (error) {
      console.error('Error submitting claim:', error);
      toast.error('Failed to submit claim');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-h-[80vh] overflow-y-auto">
      <div className="sticky top-0 bg-white z-10 pb-4">
        <h2 className="text-lg font-medium text-gray-900">Submit New Claim</h2>
        <p className="mt-1 text-sm text-gray-500">
          Please fill in all details so we can process your claim efficiently
        </p>
      </div>
      <ClaimDetailsForm onSubmit={handleSubmit} />
    </div>
  );
};

export default ClaimForm;