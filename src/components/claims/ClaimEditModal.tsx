// src/components/claims/ClaimEditModal.tsx
import React, { useState, useEffect } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Claim } from '../../types';
import { claimFormSchema, type ClaimFormData } from './ClaimForm/schema';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { uploadFile } from '../../utils/uploadFile';
import { uploadAllFiles } from '../../utils/uploadAllFiles';
import { format } from 'date-fns';
import { ensureValidDate } from '../../utils/dateHelpers';

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

const convertOldReason = (old: string | string[]) => {
  return Array.isArray(old) ? old : old.split(',').map((r) => r.trim());
};

const ClaimEditModal: React.FC<ClaimEditModalProps> = ({ claim, onClose }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const methods = useForm<ClaimFormData>({
    resolver: zodResolver(claimFormSchema),
    defaultValues: {
      submitterType: claim.submitterType,
      claimReason: convertOldReason(claim.claimReason),
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
      evidence: claim.evidence,
      fileHandlers: {
        aieHandler: claim.fileHandlers.aieHandler || '',
        legalHandler: claim.fileHandlers.legalHandler ?? {
          id: '',
          name: '',
          email: '',
          phone: '',
          address: ''
        }
      },
      claimType: claim.claimType,
      caseProgress: claim.caseProgress,
      progress: claim.progress,
      gpInformation: claim.gpInformation,
      hospitalInformation: claim.hospitalInformation,
      hireDetails: claim.hireDetails || { enabled: false },
      storage: claim.storage || { enabled: false },
      recovery: claim.recovery || { enabled: false }
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
  const showHireDetails = watch('claimReason').includes('H');
  const showStorageDetails = watch('claimReason').includes('S');
  const showVehicleDetails = watch('claimReason').includes('VD');
  const showGPInformation = watch('claimReason').includes('PI');
  const showHospitalInformation = watch('claimReason').includes('PI');
  const showRK = watch('registerKeeper.enabled');

  useEffect(() => {
    console.log('⚠️ ClaimEditModal validation errors:', errors);
  }, [errors]);

  const onSubmit = async (data: ClaimFormData) => {
    if (!user) {
      toast.error('You must be logged in');
      return;
    }
    setLoading(true);
    setSubmitError(null);

    try {
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

      // Upload evidence files
      const newUploads = {
        images: await uploadAllFiles(
          data.evidence.images.filter((f) => f instanceof File) as File[],
          'claims/images'
        ),
        videos: await uploadAllFiles(
          data.evidence.videos.filter((f) => f instanceof File) as File[],
          'claims/videos'
        ),
        clientVehiclePhotos: await uploadAllFiles(
          data.evidence.clientVehiclePhotos.filter((f) => f instanceof File) as File[],
          'claims/vehicle-photos'
        ),
        engineerReport: await uploadAllFiles(
          data.evidence.engineerReport.filter((f) => f instanceof File) as File[],
          'claims/engineer-reports'
        ),
        bankStatement: await uploadAllFiles(
          data.evidence.bankStatement.filter((f) => f instanceof File) as File[],
          'claims/bank-statements'
        ),
        adminDocuments: await uploadAllFiles(
          data.evidence.adminDocuments.filter((f) => f instanceof File) as File[],
          'claims/admin-documents'
        )
      };

      // Existing URLs (strings only)
      const existing = {
        images: data.evidence.images.filter((f) => typeof f === 'string') as string[],
        videos: data.evidence.videos.filter((f) => typeof f === 'string') as string[],
        clientVehiclePhotos: data.evidence.clientVehiclePhotos.filter(
          (f) => typeof f === 'string'
        ) as string[],
        engineerReport: data.evidence.engineerReport.filter(
          (f) => typeof f === 'string'
        ) as string[],
        bankStatement: data.evidence.bankStatement.filter(
          (f) => typeof f === 'string'
        ) as string[],
        adminDocuments: data.evidence.adminDocuments.filter(
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
      // ⛔️ do NOT send progressHistory from the form back to Firestore
    const { progressHistory: _ignoreProgressHistory, ...dataWithoutHistory } = data;


      const payload: any = {
  ...dataWithoutHistory, // <-- use this instead of ...data
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

        {/* Error summary */}
        {Object.keys(errors).length > 0 && (
          <div className="p-3 bg-red-50 border border-red-200 rounded mb-4">
            <strong className="block text-red-700 mb-2">Please fix:</strong>
            <ul className="list-disc list-inside text-red-600">
              {Object.entries(errors).map(([path, err]) => (
                <li key={path}>
                  <code>{path}</code>: {err?.message}
                </li>
              ))}
            </ul>
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

          {showRK && (
            <div className="bg-white rounded-lg p-6">
              <RegisterKeeperDetails />
            </div>
          )}

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
              count={watch('passengers').length}
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
              count={watch('witnesses').length}
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
