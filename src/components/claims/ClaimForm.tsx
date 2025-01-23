// src/components/claims/ClaimForm.tsx

import React, { useState } from 'react';
import { useForm, FormProvider, useFormContext } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { claimFormSchema, type ClaimFormData } from './ClaimForm/schema';
import { useAuth } from '../../context/AuthContext';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { uploadAllFiles } from '../../utils/uploadAllFiles';
import { generateClaimDocuments } from '../../utils/claimDocuments';
import toast from 'react-hot-toast';
import FormField from '../ui/FormField';

// Import all sections
import SubmitterDetails from './ClaimForm/sections/SubmitterDetails';
import DriverDetails from './ClaimForm/sections/DriverDetails';
import VehicleDetails from './ClaimForm/sections/VehicleDetails';
import FaultPartyDetails from './ClaimForm/sections/FaultPartyDetails';
import AccidentDetails from './ClaimForm/sections/AccidentDetails';
import PassengerDetails from './ClaimForm/sections/PassengerDetails';
import WitnessDetails from './ClaimForm/sections/WitnessInformation';
import PoliceDetails from './ClaimForm/sections/PoliceDetails';
import ParamedicDetails from './ClaimForm/sections/ParamedicDetails';
import HireDetails from './ClaimForm/sections/HireDetails';
import RecoveryDetails from './ClaimForm/sections/RecoveryDetails';
import StorageDetails from './ClaimForm/sections/StorageDetails';
import EvidenceUpload from './ClaimForm/sections/EvidenceUpload';
import FileHandlers from './ClaimForm/sections/FileHandlers';
import ClaimProgress from './ClaimForm/sections/ClaimProgress';

const ClientRefField = () => {
  const { register } = useFormContext();
  return (
    <div className="bg-white rounded-lg p-6">
      <FormField
        label="Client Reference (Optional)"
        {...register('clientRef')}
        placeholder="Enter client reference number"
      />
    </div>
  );
};

interface ClaimFormProps {
  onClose: () => void;
}

const ClaimForm: React.FC<ClaimFormProps> = ({ onClose }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [passengerCount, setPassengerCount] = useState(0);
  const [witnessCount, setWitnessCount] = useState(0);

  const methods = useForm<ClaimFormData>({
    resolver: zodResolver(claimFormSchema),
    defaultValues: {
      submitterType: 'company',
      clientRef: '',
      passengers: [],
      witnesses: [],
      evidence: {
        images: [],
        videos: [],
        clientVehiclePhotos: [],
        engineerReport: [],
        bankStatement: [],
        adminDocuments: []
      }
    }
  });

  const onSubmit = async (data: ClaimFormData) => {
    if (!user) {
      toast.error('You must be logged in to submit a claim');
      return;
    }

    try {
      setLoading(true);
      console.log('Form data:', data);

      // Upload evidence files
      const evidenceUrls = {
        images: await uploadAllFiles(data.evidence.images, 'claims/images'),
        videos: await uploadAllFiles(data.evidence.videos, 'claims/videos'),
        clientVehiclePhotos: await uploadAllFiles(data.evidence.clientVehiclePhotos, 'claims/vehicle-photos'),
        engineerReport: await uploadAllFiles(data.evidence.engineerReport, 'claims/engineer-reports'),
        bankStatement: await uploadAllFiles(data.evidence.bankStatement, 'claims/bank-statements'),
        adminDocuments: await uploadAllFiles(data.evidence.adminDocuments, 'claims/admin-documents')
      };

      // Prepare claim data
      const claimData = {
        ...data,
        evidence: evidenceUrls,
        clientInfo: {
          ...data.clientInfo,
          dateOfBirth: new Date(data.clientInfo.dateOfBirth)
        },
        incidentDetails: {
          ...data.incidentDetails,
          date: new Date(data.incidentDetails.date)
        },
        hireDetails: data.hireDetails ? {
          ...data.hireDetails,
          startDate: new Date(data.hireDetails.startDate),
          endDate: new Date(data.hireDetails.endDate)
        } : undefined,
        storage: data.storage ? {
          ...data.storage,
          startDate: new Date(data.storage.startDate),
          endDate: new Date(data.storage.endDate)
        } : undefined,
        progress: 'submitted',
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
      };

      // Add to Firestore
      const docRef = await addDoc(collection(db, 'claims'), claimData);

      // Generate claim documents
      await generateClaimDocuments(docRef.id, {
        id: docRef.id,
        ...claimData
      });

      toast.success('Claim submitted successfully');
      onClose();
    } catch (error: any) {
      console.error('Error submitting claim:', error);
      toast.error(`Failed to submit claim: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-6">
          {/* All form sections */}
          <div className="bg-white rounded-lg p-6">
            <SubmitterDetails />
          </div>

          <ClientRefField />

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

          <div className="bg-white rounded-lg p-6">
            <HireDetails />
          </div>

          <div className="bg-white rounded-lg p-6">
            <RecoveryDetails />
          </div>

          <div className="bg-white rounded-lg p-6">
            <StorageDetails />
          </div>

          <div className="bg-white rounded-lg p-6">
            <EvidenceUpload />
          </div>

          <div className="bg-white rounded-lg p-6">
            <FileHandlers />
          </div>

          <div className="bg-white rounded-lg p-6">
            <ClaimProgress />
          </div>
        </div>

        {/* Form Actions */}
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

export default ClaimForm;
