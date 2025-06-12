import React, { useState } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Claim } from '../../types';
import { claimFormSchema, type ClaimFormData } from './ClaimForm/schema';
import { useAuth } from '../../context/AuthContext';
import { generateClaimDocuments } from '../../utils/claimDocuments';
import { uploadFile } from '../../utils/uploadFile';
import { uploadAllFiles } from '../../utils/uploadAllFiles';
import { format } from 'date-fns';
import { ensureValidDate } from '../../utils/dateHelpers';
import toast from 'react-hot-toast';

import RegisterKeeperDetails from './ClaimForm/sections/RegisterKeeperDetails';

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
import GPInformation from './ClaimForm/sections/GPInformation';
import HireDetails from './ClaimForm/sections/HireDetails';
import RecoveryDetails from './ClaimForm/sections/RecoveryDetails';
import StorageDetails from './ClaimForm/sections/StorageDetails';
import EvidenceUpload from './ClaimForm/sections/EvidenceUpload';
import FileHandlers from './ClaimForm/sections/FileHandlers';
import ClaimProgress from './ClaimForm/sections/ClaimProgress';
import ClientRefField from './ClaimForm/sections/ClientRefField';
import Hospitalinformation from './ClaimForm/sections/Hospitalinformation';

interface ClaimEditModalProps {
  claim: Claim;
  onClose: () => void;
}

// Helper function to format date for input fields
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

// Helper function to format date and time
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

// Helper function to convert old claim reason format to new array format
const convertOldClaimReason = (oldReason: string | string[]): string[] => {
  if (Array.isArray(oldReason)) {
    return oldReason;
  }

  switch (oldReason) {
    case 'VD Only':
      return ['VD'];
    case 'VDHS':
      return ['VD', 'H', 'S'];
    case 'VDH':
      return ['VD', 'H'];
    case 'VDHSPI':
      return ['VD', 'H', 'S', 'PI'];
    case 'PI':
      return ['PI'];
    default:
      return oldReason.split(',').map((r) => r.trim());
  }
};

const ClaimEditModal: React.FC<ClaimEditModalProps> = ({ claim, onClose }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const methods = useForm<ClaimFormData>({
    resolver: zodResolver(claimFormSchema),
    defaultValues: {
      submitterType: claim.submitterType,
      claimReason: convertOldClaimReason(claim.claimReason),
      clientRef: claim.clientRef || '',
      clientInfo: {
        ...claim.clientInfo,
        dateOfBirth: formatDate(claim.clientInfo.dateOfBirth),
      },
      clientVehicle: {
        ...claim.clientVehicle,
        documents: claim.clientVehicle.documents || {},
      },
      incidentDetails: {
        ...claim.incidentDetails,
        date: formatDate(claim.incidentDetails.date),
      },
      // ← HERE: pick up the saved registerKeeper
    registerKeeper: {
      enabled: !!claim.registerKeeper?.enabled,
      name: claim.registerKeeper?.name ?? '',
      address: claim.registerKeeper?.address ?? '',
      phone: claim.registerKeeper?.phone ?? '',
      email: claim.registerKeeper?.email ?? '',
      dateOfBirth: claim.registerKeeper?.dateOfBirth
        ? formatDate(claim.registerKeeper.dateOfBirth)
        : '',
      signature: claim.registerKeeper?.signature ?? '',
    },
      thirdParty: claim.thirdParty,
      passengers: claim.passengers || [],
      witnesses: claim.witnesses || [],
      evidence: claim.evidence,
      policeOfficerName: claim.policeOfficerName || '',
      policeBadgeNumber: claim.policeBadgeNumber || '',
      policeStation: claim.policeStation || '',
      policeIncidentNumber: claim.policeIncidentNumber || '',
      policeContactInfo: claim.policeContactInfo || '',
      paramedicNames: claim.paramedicNames || '',
      ambulanceReference: claim.ambulanceReference || '',
      ambulanceService: claim.ambulanceService || '',
      fileHandlers: {
        aieHandler: claim.fileHandlers.aieHandler || '',
        legalHandler: claim.fileHandlers.legalHandler || null,  // Change to null if missing
      },
      claimType: claim.claimType,
      caseProgress: claim.caseProgress,
      progress: claim.progress,
      gpInformation: claim.gpInformation || { visited: false },
      hospitalInformation: claim.hospitalInformation || { visited: false },
      hireDetails: claim.hireDetails
      ? {
          ...claim.hireDetails,
          startDate: formatDate(claim.hireDetails.startDate),
          endDate: formatDate(claim.hireDetails.endDate),
          // Directly use the persisted 'enabled' status, default to false
          enabled: !!claim.hireDetails.enabled,
          // Ensure other fields expected by the component are present or defaulted
          startTime: claim.hireDetails.startTime || '',
          endTime: claim.hireDetails.endTime || '',
          daysOfHire: claim.hireDetails.daysOfHire || 0,
          claimRate: claim.hireDetails.claimRate || 340,
          deliveryCharge: claim.hireDetails.deliveryCharge || 0,
          collectionCharge: claim.hireDetails.collectionCharge || 0,
          insurancePerDay: claim.hireDetails.insurancePerDay || 0,
          totalCost: claim.hireDetails.totalCost || 0,
          vehicle: claim.hireDetails.vehicle || { make: '', model: '', registration: '', claimRate: 340 },
        }
      : { enabled: false }, // Default if hireDetails object itself is missing

    storage: claim.storage
      ? {
          ...claim.storage,
          startDate: formatDate(claim.storage.startDate),
          endDate: formatDate(claim.storage.endDate),
          // Directly use the persisted 'enabled' status, default to false
          enabled: !!claim.storage.enabled,
          // Ensure other fields expected by the component are present or defaulted
          costPerDay: claim.storage.costPerDay || 40,
          totalCost: claim.storage.totalCost || 0,
        }
      : { enabled: false }, // Default if storage object itself is missing

    recovery: claim.recovery
      ? {
          ...claim.recovery,
          date: formatDate(claim.recovery.date),
          // Directly use the persisted 'enabled' status, default to false
          enabled: !!claim.recovery.enabled,
          // Keep existing values or provide defaults
          locationPickup: claim.recovery.locationPickup || '',
          locationDropoff: claim.recovery.locationDropoff || '',
          cost: claim.recovery.cost, // Let Zod handle optional number validation
        }
      : { enabled: false }, 
    },
  });

  /**
 * Converts a camelCase string into a human-readable string.
 * @param {string} fieldName - The camelCase string to format.
 * @returns {string} - The formatted, human-readable string.
 */
function formatFieldName(fieldName: string) {
  // Insert spaces before uppercase letters
  const spacedFieldName = fieldName.replace(/([a-z])([A-Z])/g, "$1 $2");
  // Capitalize the first letter of each word
  const humanReadableFieldName = spacedFieldName.replace(
    /\b\w/g,
    (char) => char.toUpperCase()
  );
  return humanReadableFieldName;
}

  const claimReason = methods.watch('claimReason');
  const showHireDetails = claimReason.includes('H');
  const showStorageDetails = claimReason.includes('S');
  const showVehicleDetails = claimReason.includes('VD');
  const showGPInformation = claimReason.includes('PI');
  const showHospitalInformation = claimReason.includes('PI');

  const onSubmit = async (data: ClaimFormData) => {
    if (!user) {
      toast.error('You must be logged in to update a claim');
      return;
    }
  
    setLoading(true);
    setSubmitError(null);
  
    try {
      // 1) Upload any new vehicle documents
      const vehicleDocumentUrls: Record<string, string> = {};
      for (const [key, file] of Object.entries(data.clientVehicle.documents)) {
        if (file instanceof File) {
          try {
            const url = await uploadFile(file, `claims/vehicle-documents`);
            vehicleDocumentUrls[key] = url;
          } catch (error) {
            console.error(`Failed to upload document ${key}:`, error);
          }
        } else if (typeof file === 'string') {
          vehicleDocumentUrls[key] = file;
        }
      }
  
      // 2) Upload any new evidence files
      const newEvidenceUploads = {
        images: await uploadAllFiles(
          data.evidence.images.filter((f): f is File => f instanceof File),
          'claims/images'
        ),
        videos: await uploadAllFiles(
          data.evidence.videos.filter((f): f is File => f instanceof File),
          'claims/videos'
        ),
        clientVehiclePhotos: await uploadAllFiles(
          data.evidence.clientVehiclePhotos.filter((f): f is File => f instanceof File),
          'claims/vehicle-photos'
        ),
        engineerReport: await uploadAllFiles(
          data.evidence.engineerReport.filter((f): f is File => f instanceof File),
          'claims/engineer-reports'
        ),
        bankStatement: await uploadAllFiles(
          data.evidence.bankStatement.filter((f): f is File => f instanceof File),
          'claims/bank-statements'
        ),
        adminDocuments: await uploadAllFiles(
          data.evidence.adminDocuments.filter((f): f is File => f instanceof File),
          'claims/admin-documents'
        ),
      };
  
      // 3) Extract the URLs the user left in each array (i.e. drop removed ones)
      const existingImages = data.evidence.images
        .filter((f): f is string => typeof f === 'string');
      const existingVideos = data.evidence.videos
        .filter((f): f is string => typeof f === 'string');
      const existingVehiclePhotos = data.evidence.clientVehiclePhotos
        .filter((f): f is string => typeof f === 'string');
      const existingEngineerReports = data.evidence.engineerReport
        .filter((f): f is string => typeof f === 'string');
      const existingBankStatements = data.evidence.bankStatement
        .filter((f): f is string => typeof f === 'string');
      const existingAdminDocs = data.evidence.adminDocuments
        .filter((f): f is string => typeof f === 'string');
  
      // 4) Build the final claimData using current form values + newly uploaded URLs
      const claimData = {
        ...data, // Include all fields from the form data
        clientRef: data.clientRef, // Explicitly include clientRef
        clientVehicle: {
          ...data.clientVehicle,
          documents: {
            ...claim.clientVehicle.documents,
            ...vehicleDocumentUrls,
          },
        },
        evidence: {
          images: [...existingImages, ...newEvidenceUploads.images],
          videos: [...existingVideos, ...newEvidenceUploads.videos],
          clientVehiclePhotos: [
            ...existingVehiclePhotos,
            ...newEvidenceUploads.clientVehiclePhotos,
          ],
          engineerReport: [
            ...existingEngineerReports,
            ...newEvidenceUploads.engineerReport,
          ],
          bankStatement: [
            ...existingBankStatements,
            ...newEvidenceUploads.bankStatement,
          ],
          adminDocuments: [
            ...existingAdminDocs,
            ...newEvidenceUploads.adminDocuments,
          ],
        },
        // convert dates back to Date objects
        clientInfo: {
          ...data.clientInfo,
          dateOfBirth: new Date(data.clientInfo.dateOfBirth),
        },
        incidentDetails: {
          ...data.incidentDetails,
          date: new Date(data.incidentDetails.date),
        },
        // hire/storage/recovery logic as before...
        hireDetails: data.hireDetails?.enabled
          ? {
              ...data.hireDetails,
              startDate: data.hireDetails.startDate
                ? new Date(data.hireDetails.startDate)
                : null,
              endDate: data.hireDetails.endDate
                ? new Date(data.hireDetails.endDate)
                : null,
              enabled: true,
            }
          : null,
        storage: data.storage?.enabled
          ? {
              ...data.storage,
              startDate: data.storage.startDate
                ? new Date(data.storage.startDate)
                : null,
              endDate: data.storage.endDate
                ? new Date(data.storage.endDate)
                : null,
              enabled: true,
            }
          : null,
        recovery: data.recovery?.enabled
          ? {
              date: data.recovery.date
                ? new Date(data.recovery.date)
                : null,
              locationPickup: data.recovery.locationPickup,
              locationDropoff: data.recovery.locationDropoff,
              cost: data.recovery.cost || 0,
              enabled: true,
            }
          : null,
        passengers: data.passengers.filter(p =>
          Boolean(p.name || p.address || p.postCode || p.dob || p.contactNumber)
        ),
        witnesses: data.witnesses.filter(w =>
          Boolean(w.name || w.address || w.postCode || w.dob || w.contactNumber)
        ),
        policeOfficerName: data.policeOfficerName || null,
        policeBadgeNumber: data.policeBadgeNumber || null,
        policeStation: data.policeStation || null,
        policeIncidentNumber: data.policeIncidentNumber || null,
        policeContactInfo: data.policeContactInfo || null,
        paramedicNames: data.paramedicNames || null,
        ambulanceReference: data.ambulanceReference || null,
        ambulanceService: data.ambulanceService || null,
        fileHandlers: {
          aieHandler: data.fileHandlers.aieHandler,
          legalHandler: data.fileHandlers.legalHandler,
        },
        claimType: data.claimType,
        claimReason: data.claimReason,
        caseProgress: data.caseProgress,
        progress: data.progress,
        updatedAt: new Date(),
        updatedBy: user.id,
      };
  
      // 5) Finally, push to Firestore
      await updateDoc(doc(db, 'claims', claim.id), claimData);
  
      toast.success('Claim updated successfully');
      onClose();
    } catch (err: any) {
      console.error('Error updating claim:', err);
      setSubmitError(err.message || 'Failed to update claim.');
      toast.error(err.message || 'Failed to update claim');
    } finally {
      setLoading(false);
    }
  };
  

  return (
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(onSubmit)} className="space-y-6">
        {submitError && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
            <p className="font-medium">Error updating claim:</p>
            <p className="text-sm">{submitError}</p>
          </div>
        )}

        <div className="space-y-6">
          <div className="bg-white rounded-lg p-6 flex space-x-4">
            <div className="flex-1">
              <ClaimProgress />
            </div>
            <div className="w-64">
              <ClientRefField />
            </div>
          </div>

          <div className="bg-white rounded-lg p-6">
            <SubmitterDetails />
          </div>

          <div className="bg-white rounded-lg p-6">
            <DriverDetails />
          </div>

          <div className="bg-white rounded-lg p-6">
            <RegisterKeeperDetails />
          </div>

          <div className="bg-white rounded-lg p-6">
            <AccidentDetails />
          </div>

          {showVehicleDetails && (
            <div className="bg-white rounded-lg p-6">
              <VehicleDetails />
            </div>
          )}

          <div className="bg-white rounded-lg p-6">
            <FaultPartyDetails />
          </div>

          {showGPInformation && (
            <div className="bg-white rounded-lg p-6">
              <GPInformation />
            </div>
          )}

          {showHospitalInformation && (
            <div className="bg-white rounded-lg p-6">
              <Hospitalinformation />
            </div>
          )}

          <div className="bg-white rounded-lg p-6">
            <EvidenceUpload />
          </div>

          {/* {showHireDetails && (
            <div className="bg-white rounded-lg p-6">
              <HireDetails />
            </div>
          )} */}

          {/* {showStorageDetails && (
            <div className="bg-white rounded-lg p-6">
              <StorageDetails />
            </div>
          )} */}

          {/* <div className="bg-white rounded-lg p-6">
            <RecoveryDetails />
          </div> */}

          <div className="bg-white rounded-lg p-6">
            <PassengerDetails
              count={methods.watch('passengers')?.length || 0}
              onCountChange={(count) => {
                const currentPassengers = methods.getValues('passengers') || [];
                const newPassengers = Array(count).fill(null).map((_, index) => {
                  return currentPassengers[index] || {
                    name: '',
                    address: '',
                    postCode: '',
                    dob: '',
                    contactNumber: '',
                  };
                });
                methods.setValue('passengers', newPassengers);
              }}
            />
          </div>

          <div className="bg-white rounded-lg p-6">
            <WitnessDetails
              count={methods.watch('witnesses')?.length || 0}
              onCountChange={(count) => {
                const currentWitnesses = methods.getValues('witnesses') || [];
                const newWitnesses = Array(count).fill(null).map((_, index) => {
                  return currentWitnesses[index] || {
                    name: '',
                    address: '',
                    postCode: '',
                    dob: '',
                    contactNumber: '',
                  };
                });
                methods.setValue('witnesses', newWitnesses);
              }}
            />
          </div>

          <div className="bg-white rounded-lg p-6">
            <PoliceDetails />
          </div>

          <div className="bg-white rounded-lg p-6">
            <ParamedicDetails />
          </div>

          <div className="bg-white rounded-lg p-6">
            <FileHandlers />
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
            className="px-4 py-2 text-sm font-medium text-white bg-primary border border-transparent rounded-md hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Updating...' : 'Update Claim'}
          </button>
        </div>

        {Object.keys(methods.formState.errors).length > 0 && (
  <div className="mt-4 p-4 bg-red-50 rounded-md">
    <h4 className="text-red-800 font-medium">Please review the highlighted sections:</h4>
    <ul className="mt-2 text-sm text-red-700 list-disc list-inside">
      {Object.entries(methods.formState.errors).map(([key, error]) => (
        <li key={key}>
          {formatFieldName(key)} - {error?.message || 'Invalid input'}
        </li>
      ))}
    </ul>
  </div>
)}
      </form>
    </FormProvider>
  );
};

export default ClaimEditModal;