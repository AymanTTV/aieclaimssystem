import React, { useState } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Claim } from '../../types';
import { claimFormSchema, type ClaimFormData } from './ClaimForm/schema';
import { useAuth } from '../../context/AuthContext';
import { uploadAllFiles } from '../../utils/uploadAllFiles';
import { uploadFile } from '../../utils/uploadFile';
import { generateClaimDocuments } from '../../utils/claimDocuments';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { ensureValidDate } from '../../utils/dateHelpers';


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
import ClientRefField from './ClaimForm/sections/ClientRefField';

interface ClaimEditModalProps {
  claim: Claim;
  onClose: () => void;
}

const ClaimEditModal: React.FC<ClaimEditModalProps> = ({ claim, onClose }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [passengerCount, setPassengerCount] = useState(claim.passengers?.length || 0);
  const [witnessCount, setWitnessCount] = useState(claim.witnesses?.length || 0);
  
  const formatDate = (date: Date | null | undefined): string => {
  if (!date) return '';
  
  try {
    const validDate = ensureValidDate(date);
    return validDate.toISOString().split('T')[0];
  } catch (error) {
    console.error('Error formatting date:', error);
    return '';
  }
};


const formatDateTime = (date: Date | null | undefined): string => {
  if (!date) return '';
  
  try {
    const validDate = ensureValidDate(date);
    return format(validDate, 'yyyy-MM-dd HH:mm');
  } catch (error) {
    console.error('Error formatting date:', error);
    return '';
  }
};
  
  const methods = useForm<ClaimFormData>({
    resolver: zodResolver(claimFormSchema),
    defaultValues: {
      submitterType: claim.submitterType,
      clientRef: claim.clientRef || '',
      clientInfo: {
        ...claim.clientInfo,
        dateOfBirth: formatDate(ensureValidDate(claim.clientInfo.dateOfBirth)),
        signature: claim.clientInfo.signature || ''
      },
      clientVehicle: {
        ...claim.clientVehicle,
        documents: {
          licenseFront: claim.clientVehicle.documents?.licenseFront || '',
          licenseBack: claim.clientVehicle.documents?.licenseBack || '',
          logBook: claim.clientVehicle.documents?.logBook || '',
          nsl: claim.clientVehicle.documents?.nsl || '',
          insuranceCertificate: claim.clientVehicle.documents?.insuranceCertificate || '',
          tflBill: claim.clientVehicle.documents?.tflBill || ''
        },
        motExpiry: formatDate(ensureValidDate(claim.clientVehicle.motExpiry)),
        roadTaxExpiry: formatDate(ensureValidDate(claim.clientVehicle.roadTaxExpiry))
      },
      incidentDetails: {
        ...claim.incidentDetails,
        date: formatDate(ensureValidDate(claim.incidentDetails.date))
      },
      thirdParty: claim.thirdParty,
      passengers: claim.passengers || [],
      witnesses: claim.witnesses || [],
      evidence: {
        images: claim.evidence.images || [],
        videos: claim.evidence.videos || [],
        clientVehiclePhotos: claim.evidence.clientVehiclePhotos || [],
        engineerReport: claim.evidence.engineerReport || [],
        bankStatement: claim.evidence.bankStatement || [],
        adminDocuments: claim.evidence.adminDocuments || []
      },
      hireDetails: claim.hireDetails ? {
        enabled: true,
        ...claim.hireDetails,
        startDate: formatDate(ensureValidDate(claim.hireDetails.startDate)),
        endDate: formatDate(ensureValidDate(claim.hireDetails.endDate))
      } : { enabled: false },
      recovery: claim.recovery ? {
        enabled: true,
        ...claim.recovery,
        date: formatDate(ensureValidDate(claim.recovery.date))
      } : { enabled: false },
      storage: claim.storage ? {
        enabled: true,
        ...claim.storage,
        startDate: formatDate(ensureValidDate(claim.storage.startDate)),
        endDate: formatDate(ensureValidDate(claim.storage.endDate))
      } : { enabled: false },
      fileHandlers: claim.fileHandlers,
      claimType: claim.claimType,
      claimReason: claim.claimReason,
      caseProgress: claim.caseProgress,
      progress: claim.progress,
      statusDescription: claim.statusDescription || ''
    }
  });

  const handleSubmit = async (data: ClaimFormData) => {
    if (!user) return;
    setLoading(true);

    try {
      // Upload vehicle documents
      const vehicleDocumentUrls: Record<string, string> = {};
      for (const [key, file] of Object.entries(data.clientVehicle.documents)) {
        if (file instanceof File) {
          const url = await uploadFile(file, `claims/${claim.id}/vehicle-documents`);
          vehicleDocumentUrls[key] = url;
        }
      }

      // Upload evidence files
      const evidenceUrls = {
        images: [...claim.evidence.images, ...await uploadAllFiles(
          data.evidence.images.filter((f): f is File => f instanceof File),
          `claims/${claim.id}/images`
        )],
        videos: [...claim.evidence.videos, ...await uploadAllFiles(
          data.evidence.videos.filter((f): f is File => f instanceof File),
          `claims/${claim.id}/videos`
        )],
        clientVehiclePhotos: [...claim.evidence.clientVehiclePhotos, ...await uploadAllFiles(
          data.evidence.clientVehiclePhotos.filter((f): f is File => f instanceof File),
          `claims/${claim.id}/vehicle-photos`
        )],
        engineerReport: [...claim.evidence.engineerReport, ...await uploadAllFiles(
          data.evidence.engineerReport.filter((f): f is File => f instanceof File),
          `claims/${claim.id}/engineer-reports`
        )],
        bankStatement: [...claim.evidence.bankStatement, ...await uploadAllFiles(
          data.evidence.bankStatement.filter((f): f is File => f instanceof File),
          `claims/${claim.id}/bank-statements`
        )],
        adminDocuments: [...claim.evidence.adminDocuments, ...await uploadAllFiles(
          data.evidence.adminDocuments.filter((f): f is File => f instanceof File),
          `claims/${claim.id}/admin-documents`
        )]
      };

      // Create new progress entry
      const newProgressEntry = {
        id: Date.now().toString(),
        date: new Date(),
        status: data.progress,
        note: data.statusDescription || 'Claim updated',
        author: user.name
      };

      // Prepare update data
      const updateData = {
        ...data,
        clientVehicle: {
          ...data.clientVehicle,
          documents: {
            ...claim.clientVehicle.documents,
            ...vehicleDocumentUrls
          }
        },
        evidence: evidenceUrls,
        clientInfo: {
          ...data.clientInfo,
          dateOfBirth: new Date(data.clientInfo.dateOfBirth)
        },
        incidentDetails: {
          ...data.incidentDetails,
          date: new Date(data.incidentDetails.date)
        },
        // Only include optional sections if enabled
        ...(data.hireDetails?.enabled ? {
          hireDetails: {
            startDate: new Date(data.hireDetails.startDate!),
            endDate: new Date(data.hireDetails.endDate!),
            startTime: data.hireDetails.startTime || '',
            endTime: data.hireDetails.endTime || '',
            daysOfHire: data.hireDetails.daysOfHire || 0,
            claimRate: data.hireDetails.claimRate || 340,
            deliveryCharge: data.hireDetails.deliveryCharge || 0,
            collectionCharge: data.hireDetails.collectionCharge || 0,
            insurancePerDay: data.hireDetails.insurancePerDay || 0,
            totalCost: data.hireDetails.totalCost || 0,
            vehicle: data.hireDetails.vehicle || null
          }
        } : null),
        ...(data.recovery?.enabled ? {
          recovery: {
            date: new Date(data.recovery.date!),
            locationPickup: data.recovery.locationPickup || '',
            locationDropoff: data.recovery.locationDropoff || '',
            cost: data.recovery.cost || 0
          }
        } : null),
        ...(data.storage?.enabled ? {
          storage: {
            startDate: new Date(data.storage.startDate!),
            endDate: new Date(data.storage.endDate!),
            costPerDay: data.storage.costPerDay || 0,
            totalCost: data.storage.totalCost || 0
          }
        } : null),
        updatedAt: new Date(),
        updatedBy: user.id,
        progressHistory: [...claim.progressHistory, newProgressEntry]
      };

      // Update claim document
      await updateDoc(doc(db, 'claims', claim.id), updateData);

      // Generate new documents if claim is complete
      
        await generateClaimDocuments(claim.id, {
          id: claim.id,
          ...updateData
        });
      

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
          {/* All form sections */}
          <div className="bg-white rounded-lg p-6">
            <SubmitterDetails />
          </div>

          <div className="bg-white rounded-lg p-6">
            <ClientRefField />
          </div>

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
              {loading ? 'Updating...' : 'Update Claim'}
            </button>
          </div>
        </div>
      </form>
    </FormProvider>
  );
};

export default ClaimEditModal;