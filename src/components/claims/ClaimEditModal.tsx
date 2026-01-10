// src/components/claims/ClaimEditModal.tsx
import React, { useState, useEffect } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { doc, updateDoc, collection, query, where, getDocs, or, addDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Claim, LegalHandler } from '../../types';
import { claimFormSchema, type ClaimFormData } from './ClaimForm/schema';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { uploadFile } from '../../utils/uploadFile';
import { uploadAllFiles } from '../../utils/uploadAllFiles';
import { format } from 'date-fns';
import { ensureValidDate } from '../../utils/dateHelpers';
import { generateClaimProgressDocument } from '../../utils/documentGenerator';
import RegisterKeeperDetails from './ClaimForm/sections/RegisterKeeperDetails';
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
import Hospitalinformation from './ClaimForm/sections/Hospitalinformation';
import EvidenceUpload from './ClaimForm/sections/EvidenceUpload';
import FileHandlers from './ClaimForm/sections/FileHandlers';
import ClaimProgress from './ClaimForm/sections/ClaimProgress';
import ClientRefField from './ClaimForm/sections/ClientRefField';

interface ClaimEditModalProps {
  claim: Claim;
  onClose: () => void;
}

// format for date inputs
const formatDate = (d?: Date | null) =>
  d ? ensureValidDate(d).toISOString().slice(0, 10) : '';

// **FIX 1: Make claimReason conversion safer**
// This now handles null, undefined, string, and array formats from Firestore.
const convertOldReason = (old: unknown): Array<'VD' | 'H' | 'S' | 'PI'> => {
  if (Array.isArray(old)) {
    // Already in the correct format, just return it.
    return old.filter(val => ['VD', 'H', 'S', 'PI'].includes(val));
  }
  if (typeof old === 'string' && old.trim() !== '') {
    const trimmed = old.trim().toUpperCase();
    // Handle comma-separated values like "VD, PI"
    if (trimmed.includes(',')) {
      return trimmed.split(',').map(r => r.trim()) as Array<'VD' | 'H' | 'S' | 'PI'>;
    }
    // Handle legacy single-string values like "VD Only" or "Personal Injury"
    const reasons: Array<'VD' | 'H' | 'S' | 'PI'> = [];
    if (trimmed.includes('VD')) reasons.push('VD');
    if (trimmed.includes('H')) reasons.push('H');
    if (trimmed.includes('S')) reasons.push('S');
    if (trimmed.includes('PI')) reasons.push('PI');
    return reasons;
  }
  return []; // Return an empty array for null, undefined, or other types
};

// **FIX 2: Normalize fileHandlers data**
// This function converts old string data into the new object format.
const normalizeFileHandlers = (
  handlers: any
): { aieHandler: string; legalHandler: LegalHandler | null } => {
  // Fallback for null, undefined, or unexpected data types
  if (!handlers) {
    return { aieHandler: '', legalHandler: null };
  }

  // Case 1: The data is a string (very old legacy format)
  if (typeof handlers === 'string') {
    return {
      aieHandler: handlers, // Assume the string is the AIE handler's name
      legalHandler: null,
    };
  }

  // Case 2: The data is an object (most common case)
  if (typeof handlers === 'object') {
    const aieHandler = handlers.aieHandler || '';
    let legalHandler = handlers.legalHandler || null;

    // CRITICAL FIX: If legalHandler is a string, convert it to null.
    // The schema expects an object or null, not a string.
    if (typeof legalHandler === 'string') {
      legalHandler = null;
    }

    return { aieHandler, legalHandler };
  }
  
  // Default fallback
  return { aieHandler: '', legalHandler: null };
};

/**
 * Checks if a customer exists based on email or phone. If not, creates one.
 * @param clientInfo - The client details from the form.
 */
const upsertCustomerFromClaimData = async (clientInfo: ClaimFormData['clientInfo']) => {
  if (!clientInfo.email && !clientInfo.phone) {
    console.log('No email or phone provided, skipping customer creation.');
    return;
  }

  const customersRef = collection(db, 'customers');
  const q = query(
    customersRef,
    or(where('email', '==', clientInfo.email), where('mobile', '==', clientInfo.phone))
  );

  const existingCustomerSnapshot = await getDocs(q);

  if (existingCustomerSnapshot.empty) {
    // No customer found, so create a new one
    try {
      await addDoc(customersRef, {
        type: 'claim', // Set type to 'claim'
        name: clientInfo.name,
        mobile: clientInfo.phone,
        email: clientInfo.email,
        address: clientInfo.address,
        dateOfBirth: new Date(clientInfo.dateOfBirth),
        nationalInsuranceNumber: clientInfo.nationalInsuranceNumber,
        signature: clientInfo.signature || '',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      toast.success('New customer profile created from claim.');
    } catch (error) {
      console.error('Failed to create new customer from claim:', error);
      toast.error('Could not create customer profile.');
    }
  } else {
    console.log('Existing customer found. No new customer created.');
  }
};

/**
 * Helper function to safely extract serializable error messages,
 * avoiding circular references from the 'ref' property in react-hook-form errors.
 */
const getSanitizedErrors = (errors: any) => {
  const sanitized: Record<string, any> = {};
  for (const key in errors) {
    if (Object.prototype.hasOwnProperty.call(errors, key)) {
      const error = errors[key];
      if (error && typeof error === 'object' && !error.message) {
        // Handle nested error objects (e.g., clientInfo.name)
        sanitized[key] = getSanitizedErrors(error);
      } else if (error) {
        // Keep only the message property
        sanitized[key] = { message: error.message };
      }
    }
  }
  return sanitized;
};


const ClaimEditModal: React.FC<ClaimEditModalProps> = ({ claim, onClose }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const methods = useForm<ClaimFormData>({
  resolver: zodResolver(claimFormSchema),
  defaultValues: {
    submitterType: claim.submitterType,
    claimReason: convertOldReason(claim.claimReason), // Use safer function
    clientRef: claim.clientRef || '',
    clientInfo: {
      ...claim.clientInfo,
      dateOfBirth: formatDate(claim.clientInfo.dateOfBirth)
    },
    registerKeeper: {
      enabled: !!claim.registerKeeper?.enabled,
      name: claim.registerKeeper?.name || '',
      address: claim.registerKeeper?.address || '',
      phone: claim.registerKeeper?.phone || '',
      email: claim.registerKeeper?.email || '',
      dateOfBirth: formatDate(claim.registerKeeper?.dateOfBirth),
      signature: claim.registerKeeper?.signature || ''
    },
    clientVehicle: {
      ...claim.clientVehicle,
      documents: claim.clientVehicle.documents || {},
      motExpiry: claim.clientVehicle.motExpiry
        ? formatDate(claim.clientVehicle.motExpiry)
        : '',
      roadTaxExpiry: claim.clientVehicle.roadTaxExpiry
        ? formatDate(claim.clientVehicle.roadTaxExpiry)
        : ''
    },
    incidentDetails: {
      ...claim.incidentDetails,
      date: formatDate(claim.incidentDetails.date)
    },
    thirdParty: claim.thirdParty,
    passengers: claim.passengers || [],
    witnesses: claim.witnesses || [],
    evidence: claim.evidence || { images: [], videos: [], clientVehiclePhotos: [], engineerReport: [], bankStatement: [], adminDocuments: [] },
    fileHandlers: normalizeFileHandlers(claim.fileHandlers), // Use the normalizer function
    claimType: claim.claimType,
    caseProgress: claim.caseProgress,
    progress: claim.progress,
    gpInformation: claim.gpInformation || { visited: false },
    hospitalInformation: claim.hospitalInformation || { visited: false },
    hireDetails: claim.hireDetails || { enabled: false },
    storage: claim.storage || { enabled: false },
    recovery: claim.recovery || { enabled: false },

    // --- UPDATED POLICE & PARAMEDIC FIELDS (Using 'claim.' as requested) ---

    // Police: Uses 'claim.' for new fields, and (claim as any) only for the old fallback
    policeOfficerName:    claim.policeOfficerName    || (claim as any).policeInvolvement?.officerName || '',
    policeBadgeNumber:    claim.policeBadgeNumber    || '', // No old equivalent
    policeStation:        claim.policeStation        || (claim as any).policeInvolvement?.station || '',
    policeIncidentNumber: claim.policeIncidentNumber || (claim as any).policeInvolvement?.reportNumber || '',
    policeContactInfo:    claim.policeContactInfo    || (claim as any).policeInvolvement?.contactNumber || '',

    // Paramedics: Uses 'claim.' for new fields, and (claim as any) only for the old fallback
    paramedicNames:       claim.paramedicNames       || (claim as any).paramedicInvolvement?.paramedicName || '',
    ambulanceReference:   claim.ambulanceReference   || (claim as any).paramedicInvolvement?.reportNumber || '',
    ambulanceService:     claim.ambulanceService     || (claim as any).paramedicInvolvement?.serviceName || '',
  }
});

  const {
    handleSubmit,
    watch,
    getValues,
    setValue,
    formState: { errors }
  } = methods;

  // Show/hide sections based on claimReason and registerKeeper
  const showHireDetails = watch('claimReason')?.includes('H');
  const showStorageDetails = watch('claimReason')?.includes('S');
  const showVehicleDetails = watch('claimReason')?.includes('VD');
  const showGPInformation = watch('claimReason')?.includes('PI');
  const showHospitalInformation = watch('claimReason')?.includes('PI');
  const showRK = watch('registerKeeper.enabled');

  useEffect(() => {
    if (Object.keys(errors).length > 0) {
      // Use console.log for full object inspection in the browser console
      console.log('⚠️ ClaimEditModal validation errors:', errors);
    }
  }, [errors]);

  const onSubmit = async (data: ClaimFormData) => {
    if (!user) {
      toast.error('You must be logged in');
      return;
    }
    setLoading(true);
    setSubmitError(null);

    try {
      // Check for and create the customer if they don't exist
      await upsertCustomerFromClaimData(data.clientInfo);

      // Upload new documents for clientVehicle
      const vehicleDocUrls: Record<string, string> = {};
      for (const [key, file] of Object.entries(
        data.clientVehicle!.documents || {}
      )) {
        if (file instanceof File) {
          const url = await uploadFile(file, 'claims/vehicle-documents');
          vehicleDocUrls[key] = url;
        } else {
          vehicleDocUrls[key] = file as string;
        }
      }

      const evidenceData = data.evidence || { images: [], videos: [], clientVehiclePhotos: [], engineerReport: [], bankStatement: [], adminDocuments: [] };

      // Upload evidence files
      const newUploads = {
        images: await uploadAllFiles(
          evidenceData.images.filter((f) => f instanceof File) as File[],
          'claims/images'
        ),
        videos: await uploadAllFiles(
          evidenceData.videos.filter((f) => f instanceof File) as File[],
          'claims/videos'
        ),
        clientVehiclePhotos: await uploadAllFiles(
          evidenceData.clientVehiclePhotos.filter((f) => f instanceof File) as File[],
          'claims/vehicle-photos'
        ),
        engineerReport: await uploadAllFiles(
          evidenceData.engineerReport.filter((f) => f instanceof File) as File[],
          'claims/engineer-reports'
        ),
        bankStatement: await uploadAllFiles(
          evidenceData.bankStatement.filter((f) => f instanceof File) as File[],
          'claims/bank-statements'
        ),
        adminDocuments: await uploadAllFiles(
          evidenceData.adminDocuments.filter((f) => f instanceof File) as File[],
          'claims/admin-documents'
        )
      };

      // Existing URLs (strings only)
      const existing = {
        images: evidenceData.images.filter((f) => typeof f === 'string') as string[],
        videos: evidenceData.videos.filter((f) => typeof f === 'string') as string[],
        clientVehiclePhotos: evidenceData.clientVehiclePhotos.filter(
          (f) => typeof f === 'string'
        ) as string[],
        engineerReport: evidenceData.engineerReport.filter(
          (f) => typeof f === 'string'
        ) as string[],
        bankStatement: evidenceData.bankStatement.filter(
          (f) => typeof f === 'string'
        ) as string[],
        adminDocuments: evidenceData.adminDocuments.filter(
          (f) => typeof f === 'string'
        ) as string[]
      };

      const evidence = {
        images: [...existing.images, ...newUploads.images],
        videos: [...existing.videos, ...newUploads.videos],
        clientVehiclePhotos: [
          ...existing.clientVehiclePhotos,
          ...newUploads.clientVehiclePhotos
        ],
        engineerReport: [...existing.engineerReport, ...newUploads.engineerReport],
        bankStatement: [...existing.bankStatement, ...newUploads.bankStatement],
        adminDocuments: [...existing.adminDocuments, ...newUploads.adminDocuments]
      };

      // EXCLUDE progressHistory from the form payload to preserve it in Firestore
      const { progressHistory: _ignoreProgressHistory, ...dataWithoutHistory } = data;


      const payload: any = {
        ...dataWithoutHistory,
        clientVehicle: {
          ...dataWithoutHistory.clientVehicle!,
          documents: { ...claim.clientVehicle.documents, ...vehicleDocUrls }
        },
        evidence,
        clientInfo: {
          ...dataWithoutHistory.clientInfo,
          dateOfBirth: new Date(dataWithoutHistory.clientInfo.dateOfBirth)
        },
        incidentDetails: {
          ...dataWithoutHistory.incidentDetails,
          date: new Date(dataWithoutHistory.incidentDetails.date)
        },
        updatedAt: new Date(),
        updatedBy: user.id,
      };

      // Only include enabled sections
      payload.hireDetails =
        showHireDetails && data.hireDetails?.enabled ? data.hireDetails : null;
      payload.storage =
        showStorageDetails && data.storage?.enabled ? data.storage : null;
      payload.recovery = data.recovery?.enabled ? data.recovery : null;
      payload.registerKeeper = showRK
        ? {
            ...data.registerKeeper,
            dateOfBirth: data.registerKeeper.dateOfBirth
              ? new Date(data.registerKeeper.dateOfBirth)
              : null
          }
        : null;

      await updateDoc(doc(db, 'claims', claim.id), payload);
      // Since edit modal might change progress status (via dropdown) or other details used in the doc
      const updatedClaimForDoc = { ...claim, ...payload, id: claim.id };
      await generateClaimProgressDocument(updatedClaimForDoc);
      toast.success('Claim updated');
      onClose();
    } catch (err: any) {
      console.error(err);
      setSubmitError(err.message);
      toast.error(err.message || 'Failed to update claim');
    } finally {
      setLoading(false);
    }
  };

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {submitError && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {submitError}
          </div>
        )}

        {Object.keys(errors).length > 0 && (
          <div className="p-3 bg-red-50 border border-red-200 rounded mb-4">
            <strong className="block text-red-700 mb-2">Please fix these issues:</strong>
            <pre className="text-xs text-red-600 whitespace-pre-wrap">
              {JSON.stringify(getSanitizedErrors(errors), null, 2)}
            </pre>
          </div>
        )}

        <div className="space-y-6">
          <div className="bg-white rounded-lg p-6 flex space-x-4">
            <ClaimProgress />
            <ClientRefField />
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

          <div className="bg-white rounded-lg p-6">
            <PassengerDetails
              count={watch('passengers')?.length || 0}
              onCountChange={(count) => {
                const curr = getValues('passengers') || [];
                const arr = Array(count)
                  .fill(null)
                  .map((_, i) => curr[i] || { name: '', address: '', postCode: '', dob: '', contactNumber: '' });
                setValue('passengers', arr);
              }}
            />
          </div>

          <div className="bg-white rounded-lg p-6">
            <WitnessDetails
              count={watch('witnesses')?.length || 0}
              onCountChange={(count) => {
                const curr = getValues('witnesses') || [];
                const arr = Array(count)
                  .fill(null)
                  .map((_, i) => curr[i] || { name: '', address: '', postCode: '', dob: '', contactNumber: '' });
                setValue('witnesses', arr);
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
            className="px-4 py-2 bg-white border rounded-md"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-primary text-white rounded-md"
          >
            {loading ? 'Updating...' : 'Update Claim'}
          </button>
        </div>
      </form>
    </FormProvider>
  );
};

export default ClaimEditModal;