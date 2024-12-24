import React, { useState } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { claimFormSchema, type ClaimFormData } from './schema';
import { useAuth } from '../../../context/AuthContext';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import toast from 'react-hot-toast';

// Import all sections
import SubmitterDetails from './sections/SubmitterDetails';
import DriverDetails from './sections/DriverDetails';
import VehicleDetails from './sections/VehicleDetails';
import FaultPartyDetails from './sections/FaultPartyDetails';
import AccidentDetails from './sections/AccidentDetails';
import PassengerDetails from './sections/PassengerDetails';
import WitnessDetails from './sections/WitnessDetails';
import PoliceDetails from './sections/PoliceDetails';
import ParamedicDetails from './sections/ParamedicDetails';

interface AccidentClaimFormProps {
  onClose: () => void;
}

const AccidentClaimForm: React.FC<AccidentClaimFormProps> = ({ onClose }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [passengerCount, setPassengerCount] = useState(0);
  const [witnessCount, setWitnessCount] = useState(0);

  const methods = useForm<ClaimFormData>({
    resolver: zodResolver(claimFormSchema),
    defaultValues: {
      submitterType: 'company',
      passengers: [],
      witnesses: []
    }
  });

  const handleSubmit = async (data: ClaimFormData) => {
    if (!user) return;
    setLoading(true);

    try {
      await addDoc(collection(db, 'claims'), {
        ...data,
        status: 'submitted',
        claimType: 'pending',
        submittedBy: user.id,
        submittedAt: new Date(),
        updatedAt: new Date(),
        progressHistory: [{
          id: Date.now().toString(),
          date: new Date(),
          note: 'Claim submitted',
          author: user.name,
          status: 'submitted'
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
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(handleSubmit)} className="space-y-8">
        <div className="space-y-6">
          {/* Submitter Type Section */}
          <div className="bg-white rounded-lg p-6">
            <SubmitterDetails />
          </div>

          {/* Rest of the sections */}
          <div className="bg-white rounded-lg p-6">
            <DriverDetails />
          </div>

          <div className="bg-white rounded-lg p-6">
            <VehicleDetails />
          </div>

          <div className="bg-white rounded-lg p-6">
            <FaultPartyDetails />
          </div>

          <div className="bg-white rounded-lg p-6">
            <AccidentDetails />
          </div>

          <div className="bg-white rounded-lg p-6">
            <PassengerDetails 
              count={passengerCount}
              onCountChange={setPassengerCount}
            />
          </div>

          <div className="bg-white rounded-lg p-6">
            <WitnessDetails 
              count={witnessCount}
              onCountChange={setWitnessCount}
            />
          </div>

          <div className="bg-white rounded-lg p-6">
            <PoliceDetails />
          </div>

          <div className="bg-white rounded-lg p-6">
            <ParamedicDetails />
          </div>
        </div>

        <div className="sticky bottom-0 bg-white p-4 border-t border-gray-200">
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
              {loading ? 'Submitting...' : 'Submit Claim'}
            </button>
          </div>
        </div>
      </form>
    </FormProvider>
  );
};

export default AccidentClaimForm;