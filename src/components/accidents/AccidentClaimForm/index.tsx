import React from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { claimFormSchema, type ClaimFormData } from './schema';
import { useAuth } from '../../../context/AuthContext';
import { useVehicles } from '../../../hooks/useVehicles';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import toast from 'react-hot-toast';
import VehicleSelect from '../../VehicleSelect';

// Import all sections
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
  const { vehicles } = useVehicles();
  const [selectedVehicleId, setSelectedVehicleId] = React.useState<string>('');
  const [loading, setLoading] = React.useState(false);

  const methods = useForm<ClaimFormData>({
    resolver: zodResolver(claimFormSchema),
    mode: 'onBlur',
    defaultValues: {
      passengers: Array(4).fill({
        name: '',
        address: '',
        postCode: '',
        dob: '',
        contactNumber: ''
      })
    }
  });

  const onSubmit = async (data: ClaimFormData) => {
    if (!user || !selectedVehicleId) {
      toast.error('Please select a vehicle');
      return;
    }

    setLoading(true);

    try {
      // Create accident record
      const accidentRef = await addDoc(collection(db, 'accidents'), {
        vehicleId: selectedVehicleId,
        driverId: user.id,
        date: new Date(data.accidentDate),
        time: data.accidentTime,
        location: data.accidentLocation,
        description: data.description,
        damageDetails: data.damageDetails,
        status: 'reported',
        createdAt: new Date(),
      });

      // Create claim record
      await addDoc(collection(db, 'claims'), {
        accidentId: accidentRef.id,
        claimDetails: {
          ...data,
          accidentDate: new Date(data.accidentDate),
          dob: new Date(data.driverDOB),
          passengers: data.passengers?.map(p => ({
            ...p,
            dob: p.dob ? new Date(p.dob) : null
          }))
        },
        status: 'submitted',
        type: 'pending',
        assignedTo: '',
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

      toast.success('Accident report and claim submitted successfully');
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
      <form onSubmit={methods.handleSubmit(onSubmit)} className="space-y-8">
        <p className="text-sm text-gray-500">
          Please fill in all required details so we can process your claim efficiently
        </p>

        <div className="space-y-4">
          <VehicleSelect
            vehicles={vehicles}
            selectedVehicleId={selectedVehicleId}
            onSelect={setSelectedVehicleId}
            required
          />
        </div>

        <div className="space-y-8">
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
            <PassengerDetails />
          </div>

          <div className="bg-white rounded-lg p-6">
            <WitnessDetails />
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
              disabled={loading}
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