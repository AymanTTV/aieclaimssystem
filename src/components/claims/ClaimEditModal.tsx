// src/components/claims/ClaimEditModal.tsx

import React, { useState } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Claim } from '../../types';
import { claimFormSchema, type ClaimFormData } from './ClaimForm/schema';
import { useAuth } from '../../context/AuthContext';
import { uploadAllFiles } from '../../utils/uploadAllFiles';
import { generateClaimDocuments } from '../../utils/claimDocuments';
import toast from 'react-hot-toast';

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

interface ClaimEditModalProps {
  claim: Claim;
  onClose: () => void;
}

const ClaimEditModal: React.FC<ClaimEditModalProps> = ({ claim, onClose }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [passengerCount, setPassengerCount] = useState(claim.passengers?.length || 0);
  const [witnessCount, setWitnessCount] = useState(claim.witnesses?.length || 0);

  const methods = useForm<ClaimFormData>({
    resolver: zodResolver(claimFormSchema),
    defaultValues: {
      submitterType: claim.submitterType,
      clientRef: claim.clientRef || '',
      clientInfo: claim.clientInfo,
      clientVehicle: claim.clientVehicle,
      incidentDetails: {
        ...claim.incidentDetails,
        date: claim.incidentDetails.date.toISOString().split('T')[0],
      },
      thirdParty: claim.thirdParty,
      evidence: {
        images: [],
        videos: [],
        clientVehiclePhotos: [],
        engineerReport: [],
        bankStatement: [],
        adminDocuments: []
      },
      hireDetails: claim.hireDetails ? {
        ...claim.hireDetails,
        startDate: claim.hireDetails.startDate.toISOString().split('T')[0],
        endDate: claim.hireDetails.endDate.toISOString().split('T')[0],
      } : undefined,
      recovery: claim.recovery ? {
        ...claim.recovery,
        date: claim.recovery.date.toISOString().split('T')[0],
      } : undefined,
      storage: claim.storage ? {
        ...claim.storage,
        startDate: claim.storage.startDate.toISOString().split('T')[0],
        endDate: claim.storage.endDate.toISOString().split('T')[0],
      } : undefined,
      fileHandlers: claim.fileHandlers,
      claimType: claim.claimType,
      claimReason: claim.claimReason,
      caseProgress: claim.caseProgress,
      progress: claim.progress
    }
  });

  const handleSubmit = async (data: ClaimFormData) => {
    if (!user) {
      toast.error('You must be logged in to update a claim');
      return;
    }

    try {
      setLoading(true);

      // Upload any new evidence files
      const evidenceUrls = {
        images: await uploadAllFiles(data.evidence.images, 'claims/images'),
        videos: await uploadAllFiles(data.evidence.videos, 'claims/videos'),
        clientVehiclePhotos: await uploadAllFiles(data.evidence.clientVehiclePhotos, 'claims/vehicle-photos'),
        engineerReport: await uploadAllFiles(data.evidence.engineerReport, 'claims/engineer-reports'),
        bankStatement: await uploadAllFiles(data.evidence.bankStatement, 'claims/bank-statements'),
        adminDocuments: await uploadAllFiles(data.evidence.adminDocuments, 'claims/admin-documents')
      };

      // Prepare update data
      const updateData = {
        ...data,
        evidence: {
          ...claim.evidence, // Keep existing evidence
          ...evidenceUrls // Add new evidence
        },
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
        updatedAt: new Date(),
        updatedBy: user.id,
        progressHistory: [
          ...claim.progressHistory,
          {
            id: Date.now().toString(),
            date: new Date(),
            note: 'Claim updated',
            author: user.name,
            status: data.progress
          }
        ]
      };

      // Update claim document
      await updateDoc(doc(db, 'claims', claim.id), updateData);

      // Generate new documents if progress changed to completed
      if (data.progress === 'completed' && claim.progress !== 'completed') {
        await generateClaimDocuments(claim.id, {
          id: claim.id,
          ...updateData as any
        });
      }

      toast.success('Claim updated successfully');
      onClose();
    } catch (error: any) {
      console.error('Error updating claim:', error);
      toast.error(`Failed to update claim: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(handleSubmit)} className="space-y-6">
        <div className="space-y-6">
          {/* Submitter Type Section */}
          <div className="bg-white rounded-lg p-6">
            <SubmitterDetails />
          </div>
         
            <div className="bg-white rounded-lg p-6">
              <FormField
                label="Client Reference (Optional)"
                {...register('clientRef')}
                defaultValue={claim.clientRef}
                placeholder="Enter client reference number"
              />
            </div>


          {/* Driver Details Section */}
          <div className="bg-white rounded-lg p-6">
            <DriverDetails />
          </div>

          {/* Vehicle Details Section */}
          <div className="bg-white rounded-lg p-6">
            <VehicleDetails />
          </div>

          {/* Fault Party Details Section */}
          <div className="bg-white rounded-lg p-6">
            <FaultPartyDetails />
          </div>

          {/* Accident Details Section */}
          <div className="bg-white rounded-lg p-6">
            <AccidentDetails />
          </div>

          {/* Passenger Details Section */}
          <div className="bg-white rounded-lg p-6">
            <PassengerDetails 
              count={passengerCount}
              onCountChange={setPassengerCount}
            />
          </div>

          {/* Witness Details Section */}
          <div className="bg-white rounded-lg p-6">
            <WitnessDetails 
              count={witnessCount}
              onCountChange={setWitnessCount}
            />
          </div>

          {/* Police Details Section */}
          <div className="bg-white rounded-lg p-6">
            <PoliceDetails />
          </div>

          {/* Paramedic Details Section */}
          <div className="bg-white rounded-lg p-6">
            <ParamedicDetails />
          </div>

          {/* Hire Details Section */}
          <div className="bg-white rounded-lg p-6">
            <HireDetails />
          </div>

          {/* Recovery Details Section */}
          <div className="bg-white rounded-lg p-6">
            <RecoveryDetails />
          </div>

          {/* Storage Details Section */}
          <div className="bg-white rounded-lg p-6">
            <StorageDetails />
          </div>

          {/* Evidence Upload Section */}
          <div className="bg-white rounded-lg p-6">
            <EvidenceUpload />
          </div>

          {/* File Handlers Section */}
          <div className="bg-white rounded-lg p-6">
            <FileHandlers />
          </div>

          {/* Claim Progress Section */}
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
              {loading ? 'Updating...' : 'Update Claim'}
            </button>
          </div>
        </div>
      </form>
    </FormProvider>
  );
};

export default ClaimEditModal;
