// src/components/claims/ClaimEditModal.tsx
import React, { useState } from 'react';
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

const formatDate = (d?: Date | null) => d ? ensureValidDate(d).toISOString().slice(0, 10) : '';

const convertOldReason = (old: unknown): Array<'VD' | 'H' | 'S' | 'PI'> => {
  if (Array.isArray(old)) return old.filter(val => ['VD', 'H', 'S', 'PI'].includes(val));
  if (typeof old === 'string' && old.trim() !== '') {
    const trimmed = old.trim().toUpperCase();
    if (trimmed.includes(',')) return trimmed.split(',').map(r => r.trim()) as Array<'VD' | 'H' | 'S' | 'PI'>;
    const reasons: Array<'VD' | 'H' | 'S' | 'PI'> = [];
    if (trimmed.includes('VD')) reasons.push('VD');
    if (trimmed.includes('H')) reasons.push('H');
    if (trimmed.includes('S')) reasons.push('S');
    if (trimmed.includes('PI')) reasons.push('PI');
    return reasons;
  }
  return []; 
};

const normalizeFileHandlers = (handlers: any): { aieHandler: string; legalHandler: LegalHandler | null } => {
  if (!handlers) return { aieHandler: '', legalHandler: null };
  if (typeof handlers === 'string') return { aieHandler: handlers, legalHandler: null };
  if (typeof handlers === 'object') {
    const aieHandler = handlers.aieHandler || '';
    let legalHandler = handlers.legalHandler || null;
    if (typeof legalHandler === 'string') legalHandler = null;
    return { aieHandler, legalHandler };
  }
  return { aieHandler: '', legalHandler: null };
};

// --- USER CREATION LOGIC ---
const upsertCustomerFromClaimData = async (clientInfo: ClaimFormData['clientInfo']) => {
  if (!clientInfo.email && !clientInfo.phone) return;
  const customersRef = collection(db, 'customers');
  const q = query(customersRef, or(where('email', '==', clientInfo.email), where('mobile', '==', clientInfo.phone)));
  const existingCustomerSnapshot = await getDocs(q);

  if (existingCustomerSnapshot.empty) {
    try {
      await addDoc(customersRef, {
        type: 'claim', 
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
      toast.error('Could not create customer profile.');
    }
  }
};
// ---------------------------

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
      documents: claim.clientVehicle?.documents || {},
      motExpiry: claim.clientVehicle?.motExpiry ? formatDate(claim.clientVehicle.motExpiry) : '',
      roadTaxExpiry: claim.clientVehicle?.roadTaxExpiry ? formatDate(claim.clientVehicle.roadTaxExpiry) : '',
      nslExpiry: claim.clientVehicle?.nslExpiry ? formatDate(claim.clientVehicle.nslExpiry) : '',
      insuranceExpiry: claim.clientVehicle?.insuranceExpiry ? formatDate(claim.clientVehicle.insuranceExpiry) : ''
    },
    incidentDetails: {
      ...claim.incidentDetails,
      date: formatDate(claim.incidentDetails.date)
    },
    thirdParty: claim.thirdParty,
    passengers: claim.passengers || [],
    witnesses: claim.witnesses || [],
    evidence: claim.evidence || { images: [], videos: [], clientVehiclePhotos: [], engineerReport: [], bankStatement: [], adminDocuments: [] },
    fileHandlers: normalizeFileHandlers(claim.fileHandlers), 
    claimType: claim.claimType,
    caseProgress: claim.caseProgress,
    progress: claim.progress,
    gpInformation: claim.gpInformation || { visited: false },
    hospitalInformation: claim.hospitalInformation || { visited: false },
    hireDetails: claim.hireDetails || { enabled: false },
    storage: claim.storage || { enabled: false },
    recovery: claim.recovery || { enabled: false },

    policeOfficerName:    claim.policeOfficerName    || (claim as any).policeInvolvement?.officerName || '',
    policeBadgeNumber:    claim.policeBadgeNumber    || '', 
    policeStation:        claim.policeStation        || (claim as any).policeInvolvement?.station || '',
    policeIncidentNumber: claim.policeIncidentNumber || (claim as any).policeInvolvement?.reportNumber || '',
    policeContactInfo:    claim.policeContactInfo    || (claim as any).policeInvolvement?.contactNumber || '',

    paramedicNames:       claim.paramedicNames       || (claim as any).paramedicInvolvement?.paramedicName || '',
    ambulanceReference:   claim.ambulanceReference   || (claim as any).paramedicInvolvement?.reportNumber || '',
    ambulanceService:     claim.ambulanceService     || (claim as any).paramedicInvolvement?.serviceName || '',
  }
});

  const { handleSubmit, watch, getValues, setValue } = methods;

  const showHireDetails = watch('claimReason')?.includes('H');
  const showStorageDetails = watch('claimReason')?.includes('S');
  const showVehicleDetails = watch('claimReason')?.includes('VD');
  const showGPInformation = watch('claimReason')?.includes('PI');
  const showHospitalInformation = watch('claimReason')?.includes('PI');
  const showRK = watch('registerKeeper.enabled');

  const onSubmit = async (data: ClaimFormData) => {
    if (!user) return toast.error('You must be logged in');
    setLoading(true);
    setSubmitError(null);

    try {
      // Trigger User Creation Check
      await upsertCustomerFromClaimData(data.clientInfo);

      const vehicleDocUrls: Record<string, string> = {};
      for (const [key, file] of Object.entries(data.clientVehicle!.documents || {})) {
        if (file instanceof File) {
          vehicleDocUrls[key] = await uploadFile(file, 'claims/vehicle-documents');
        } else {
          vehicleDocUrls[key] = file as string;
        }
      }

      const evidenceData = data.evidence || { images: [], videos: [], clientVehiclePhotos: [], engineerReport: [], bankStatement: [], adminDocuments: [] };
      const newUploads = {
        images: await uploadAllFiles(evidenceData.images.filter((f) => f instanceof File) as File[], 'claims/images'),
        videos: await uploadAllFiles(evidenceData.videos.filter((f) => f instanceof File) as File[], 'claims/videos'),
        clientVehiclePhotos: await uploadAllFiles(evidenceData.clientVehiclePhotos.filter((f) => f instanceof File) as File[], 'claims/vehicle-photos'),
        engineerReport: await uploadAllFiles(evidenceData.engineerReport.filter((f) => f instanceof File) as File[], 'claims/engineer-reports'),
        bankStatement: await uploadAllFiles(evidenceData.bankStatement.filter((f) => f instanceof File) as File[], 'claims/bank-statements'),
        adminDocuments: await uploadAllFiles(evidenceData.adminDocuments.filter((f) => f instanceof File) as File[], 'claims/admin-documents')
      };

      const existing = {
        images: evidenceData.images.filter((f) => typeof f === 'string') as string[],
        videos: evidenceData.videos.filter((f) => typeof f === 'string') as string[],
        clientVehiclePhotos: evidenceData.clientVehiclePhotos.filter((f) => typeof f === 'string') as string[],
        engineerReport: evidenceData.engineerReport.filter((f) => typeof f === 'string') as string[],
        bankStatement: evidenceData.bankStatement.filter((f) => typeof f === 'string') as string[],
        adminDocuments: evidenceData.adminDocuments.filter((f) => typeof f === 'string') as string[]
      };

      const evidence = {
        images: [...existing.images, ...newUploads.images],
        videos: [...existing.videos, ...newUploads.videos],
        clientVehiclePhotos: [...existing.clientVehiclePhotos, ...newUploads.clientVehiclePhotos],
        engineerReport: [...existing.engineerReport, ...newUploads.engineerReport],
        bankStatement: [...existing.bankStatement, ...newUploads.bankStatement],
        adminDocuments: [...existing.adminDocuments, ...newUploads.adminDocuments]
      };

      const { progressHistory: _ignoreProgressHistory, ...dataWithoutHistory } = data;

      const payload: any = {
        ...dataWithoutHistory,
        clientVehicle: {
          ...dataWithoutHistory.clientVehicle!,
          documents: { ...claim.clientVehicle?.documents, ...vehicleDocUrls },
          motExpiry: dataWithoutHistory.clientVehicle?.motExpiry ? new Date(dataWithoutHistory.clientVehicle.motExpiry) : null,
          roadTaxExpiry: dataWithoutHistory.clientVehicle?.roadTaxExpiry ? new Date(dataWithoutHistory.clientVehicle.roadTaxExpiry) : null,
          nslExpiry: dataWithoutHistory.clientVehicle?.nslExpiry ? new Date(dataWithoutHistory.clientVehicle.nslExpiry) : null,
          insuranceExpiry: dataWithoutHistory.clientVehicle?.insuranceExpiry ? new Date(dataWithoutHistory.clientVehicle.insuranceExpiry) : null,
        },
        evidence,
        clientInfo: { ...dataWithoutHistory.clientInfo, dateOfBirth: new Date(dataWithoutHistory.clientInfo.dateOfBirth) },
        incidentDetails: { ...dataWithoutHistory.incidentDetails, date: new Date(dataWithoutHistory.incidentDetails.date) },
        updatedAt: new Date(),
        updatedBy: user.id,
      };

      payload.hireDetails = showHireDetails && data.hireDetails?.enabled ? data.hireDetails : null;
      payload.storage = showStorageDetails && data.storage?.enabled ? data.storage : null;
      payload.recovery = data.recovery?.enabled ? data.recovery : null;
      payload.registerKeeper = showRK ? { ...data.registerKeeper, dateOfBirth: data.registerKeeper.dateOfBirth ? new Date(data.registerKeeper.dateOfBirth) : null } : null;

      await updateDoc(doc(db, 'claims', claim.id), payload);
      const updatedClaimForDoc = { ...claim, ...payload, id: claim.id };
      await generateClaimProgressDocument(updatedClaimForDoc);
      toast.success('Claim updated');
      onClose();
    } catch (err: any) {
      setSubmitError(err.message);
      toast.error(err.message || 'Failed to update claim');
    } finally {
      setLoading(false);
    }
  };

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {submitError && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{submitError}</div>}
        <div className="space-y-6">
          <div className="bg-white rounded-xl p-5 sm:p-6 border border-gray-200 shadow-2xs">
            <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
              <div className="flex-1">
                <ClaimProgress />
              </div>
              <div className="w-full sm:w-64">
                <ClientRefField />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-5 sm:p-6 border border-gray-200 shadow-2xs"><SubmitterDetails /></div>
          <div className="bg-white rounded-xl p-5 sm:p-6 border border-gray-200 shadow-2xs"><DriverDetails /></div>
          <div className="bg-white rounded-xl p-5 sm:p-6 border border-gray-200 shadow-2xs"><RegisterKeeperDetails /></div>
          <div className="bg-white rounded-xl p-5 sm:p-6 border border-gray-200 shadow-2xs"><AccidentDetails /></div>
          {showVehicleDetails && <div className="bg-white rounded-xl p-5 sm:p-6 border border-gray-200 shadow-2xs"><VehicleDetails /></div>}
          <div className="bg-white rounded-xl p-5 sm:p-6 border border-gray-200 shadow-2xs"><FaultPartyDetails /></div>
          {showGPInformation && <div className="bg-white rounded-xl p-5 sm:p-6 border border-gray-200 shadow-2xs"><GPInformation /></div>}
          {showHospitalInformation && <div className="bg-white rounded-xl p-5 sm:p-6 border border-gray-200 shadow-2xs"><Hospitalinformation /></div>}
          <div className="bg-white rounded-xl p-5 sm:p-6 border border-gray-200 shadow-2xs"><EvidenceUpload /></div>
          <div className="bg-white rounded-xl p-5 sm:p-6 border border-gray-200 shadow-2xs">
            <PassengerDetails
              count={watch('passengers')?.length || 0}
              onCountChange={(count) => {
                const curr = getValues('passengers') || [];
                const arr = Array(count).fill(null).map((_, i) => curr[i] || { name: '', address: '', postCode: '', dob: '', contactNumber: '' });
                setValue('passengers', arr);
              }}
            />
          </div>
          <div className="bg-white rounded-xl p-5 sm:p-6 border border-gray-200 shadow-2xs">
            <WitnessDetails
              count={watch('witnesses')?.length || 0}
              onCountChange={(count) => {
                const curr = getValues('witnesses') || [];
                const arr = Array(count).fill(null).map((_, i) => curr[i] || { name: '', address: '', postCode: '', dob: '', contactNumber: '' });
                setValue('witnesses', arr);
              }}
            />
          </div>
          <div className="bg-white rounded-xl p-5 sm:p-6 border border-gray-200 shadow-2xs"><PoliceDetails /></div>
          <div className="bg-white rounded-xl p-5 sm:p-6 border border-gray-200 shadow-2xs"><ParamedicDetails /></div>
          <div className="bg-white rounded-xl p-5 sm:p-6 border border-gray-200 shadow-2xs"><FileHandlers /></div>
        </div>
        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
          <button type="button" onClick={onClose} className="px-5 py-2.5 bg-white border border-gray-300 text-gray-800 font-bold rounded-lg hover:bg-gray-50 transition-colors">Cancel</button>
          <button type="submit" disabled={loading} className="px-6 py-2.5 bg-primary text-white font-bold rounded-lg hover:bg-primary/90 transition-colors shadow-sm">{loading ? 'Updating...' : 'Update Claim'}</button>
        </div>
      </form>
    </FormProvider>
  );
};

export default ClaimEditModal;