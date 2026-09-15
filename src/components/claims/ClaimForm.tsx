// src/components/claims/ClaimForm.tsx
import React, { useState } from 'react';
import { addDoc, collection, query, where, getDocs, or } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { uploadFile } from '../../utils/uploadFile';
import { uploadAllFiles } from '../../utils/uploadAllFiles';
import toast from 'react-hot-toast';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { claimFormSchema, type ClaimFormData } from './ClaimForm/schema';
import RegisterKeeperDetails from './ClaimForm/sections/RegisterKeeperDetails';
import { generateClaimProgressDocument } from '../../utils/documentGenerator';

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

interface ClaimFormProps {
  onClose: () => void;
}

const ClaimForm: React.FC<ClaimFormProps> = ({ onClose }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const methods = useForm<ClaimFormData>({
    resolver: zodResolver(claimFormSchema),
    mode: 'onChange',
    defaultValues: {
      submitterType: 'company',
      claimReason: ['VD'],
      clientRef: '',
      clientInfo: { name: '', phone: '', email: '', dateOfBirth: '', nationalInsuranceNumber: '', occupation: '', injuryDetails: '', address: '' },
      registerKeeper: { enabled: false, name: '', address: '', phone: '', email: '', dateOfBirth: '', signature: '' },
      clientVehicle: {
        registration: '',
        documents: {},
        motExpiry: '',
        roadTaxExpiry: '',
        nslExpiry: '',       
        insuranceExpiry: ''  
      },
      incidentDetails: { date: '', time: '', location: '', description: '', damageDetails: '' },
      thirdParty: { name: '', phone: '', address: '', email: '', registration: '' },
      passengers: [],
      witnesses: [],
      evidence: { images: [], videos: [], clientVehiclePhotos: [], engineerReport: [], bankStatement: [], adminDocuments: [] },
      fileHandlers: { aieHandler: '', legalHandler: null },
      claimType: 'Domestic',
      caseProgress: 'Awaiting',
      progress: 'Your Claim Has Started',
      gpInformation: { visited: false },
      hospitalInformation: { visited: false },
      policeOfficerName: '', policeBadgeNumber: '', policeStation: '', policeIncidentNumber: '', policeContactInfo: '',
      paramedicNames: '', ambulanceReference: '', ambulanceService: '',
      hireDetails: { enabled: false },
      storage: { enabled: false },
      recovery: { enabled: false }
    }
  });

  const watch = methods.watch;
  const showHireDetails = watch('claimReason').includes('H');
  const showStorageDetails = watch('claimReason').includes('S');
  const showVehicleDetails = watch('claimReason').includes('VD');
  const showGPInformation = watch('claimReason').includes('PI');
  const showHospitalInformation = watch('claimReason').includes('PI');
  const showRK = watch('registerKeeper.enabled');

  const onSubmit = async (data: ClaimFormData) => {
    if (!user) return toast.error('You must be logged in to submit a claim');
    setLoading(true);
    setSubmitError(null);

    try {
      // Trigger User Creation Check
      await upsertCustomerFromClaimData(data.clientInfo);

      const vehicleDocUrls: Record<string,string> = {};
      for (const [key,file] of Object.entries(data.clientVehicle!.documents || {})) {
        if (file instanceof File) {
          try { vehicleDocUrls[key] = await uploadFile(file, 'claims/vehicle-documents'); } catch {}
        } else { vehicleDocUrls[key] = file as string; }
      }
      
      const evidence = {
        images: await uploadAllFiles(data.evidence.images.filter(f=>f instanceof File) as File[], 'claims/images'),
        videos: await uploadAllFiles(data.evidence.videos.filter(f=>f instanceof File) as File[], 'claims/videos'),
        clientVehiclePhotos: await uploadAllFiles(data.evidence.clientVehiclePhotos.filter(f=>f instanceof File) as File[], 'claims/vehicle-photos'),
        engineerReport: await uploadAllFiles(data.evidence.engineerReport.filter(f=>f instanceof File) as File[], 'claims/engineer-reports'),
        bankStatement: await uploadAllFiles(data.evidence.bankStatement.filter(f=>f instanceof File) as File[], 'claims/bank-statements'),
        adminDocuments: await uploadAllFiles(data.evidence.adminDocuments.filter(f=>f instanceof File) as File[], 'claims/admin-documents')
      };

      const now = new Date();
      now.setSeconds(0, 0); 

      const claimPayload: any = {
        ...data,
        clientVehicle: {
          ...data.clientVehicle!,
          documents: vehicleDocUrls,
          motExpiry: data.clientVehicle?.motExpiry ? new Date(data.clientVehicle.motExpiry) : null,
          roadTaxExpiry: data.clientVehicle?.roadTaxExpiry ? new Date(data.clientVehicle.roadTaxExpiry) : null,
          nslExpiry: data.clientVehicle?.nslExpiry ? new Date(data.clientVehicle.nslExpiry) : null,
          insuranceExpiry: data.clientVehicle?.insuranceExpiry ? new Date(data.clientVehicle.insuranceExpiry) : null,
        },
        evidence,
        clientInfo: { ...data.clientInfo, dateOfBirth: new Date(data.clientInfo.dateOfBirth) },
        incidentDetails: { ...data.incidentDetails, date: new Date(data.incidentDetails.date) },
        hireDetails: showHireDetails && data.hireDetails?.enabled ? { ...data.hireDetails, enabled: true } : null,
        storage: showStorageDetails && data.storage?.enabled ? { ...data.storage, enabled:true } : null,
        recovery: data.recovery?.enabled ? { ...data.recovery, enabled:true } : null,
        createdBy: user.id,
        submittedAt: now, 
        updatedAt: now,   
        progressHistory: [{
          id: Date.now().toString(),
          date: now,      
          note: 'Claim submitted',
          author: user.name,
          status: 'Your Claim Has Started' 
        }]
      };

      if (data.registerKeeper.enabled) {
        claimPayload.registerKeeper = { ...data.registerKeeper, dateOfBirth: data.registerKeeper.dateOfBirth ? new Date(data.registerKeeper.dateOfBirth) : null };
      } else {
        claimPayload.registerKeeper = null;
      }

      const docRef = await addDoc(collection(db, 'claims'), claimPayload);
      const newClaimData = { id: docRef.id, ...claimPayload };
      try { await generateClaimProgressDocument(newClaimData); } catch (genError) { console.error(genError); }

      toast.success('Claim submitted successfully');
      onClose();
    } catch (err: any) {
      setSubmitError(err.message);
      toast.error(err.message || 'Failed to submit claim');
    } finally {
      setLoading(false);
    }
  };

  return (
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(onSubmit)} className="space-y-6">
        {submitError && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded"><p>{submitError}</p></div>}
        <div className="space-y-6">
          <div className="bg-white rounded-lg p-6 flex space-x-4"><ClaimProgress /><div className="w-64"><ClientRefField /></div></div>
          <div className="bg-white rounded-lg p-6"><SubmitterDetails /></div>
          <div className="bg-white rounded-lg p-6"><DriverDetails /></div>
          <div className="bg-white rounded-lg p-6"><RegisterKeeperDetails /></div>
          <div className="bg-white rounded-lg p-6"><AccidentDetails /></div>
          {showVehicleDetails && <div className="bg-white rounded-lg p-6"><VehicleDetails /></div>}
          <div className="bg-white rounded-lg p-6"><FaultPartyDetails /></div>
          {showGPInformation && <div className="bg-white rounded-lg p-6"><GPInformation /></div>}
          {showHospitalInformation && <div className="bg-white rounded-lg p-6"><Hospitalinformation /></div>}
          <div className="bg-white rounded-lg p-6"><EvidenceUpload /></div>
          <div className="bg-white rounded-lg p-6">
            <PassengerDetails
              count={methods.watch('passengers')?.length || 0}
              onCountChange={(count) => {
                const curr = methods.getValues('passengers') || [];
                const arr = Array(count).fill(null).map((_,i)=>curr[i]||{ name:'',address:'',postCode:'',dob:'',contactNumber:'' });
                methods.setValue('passengers', arr);
              }}
            />
          </div>
          <div className="bg-white rounded-lg p-6">
            <WitnessDetails
              count={methods.watch('witnesses')?.length || 0}
              onCountChange={(count) => {
                const curr = methods.getValues('witnesses') || [];
                const arr = Array(count).fill(null).map((_,i)=>curr[i]||{ name:'',address:'',postCode:'',dob:'',contactNumber:'' });
                methods.setValue('witnesses', arr);
              }}
            />
          </div>
          <div className="bg-white rounded-lg p-6"><PoliceDetails /></div>
          <div className="bg-white rounded-lg p-6"><ParamedicDetails /></div>
          <div className="bg-white rounded-lg p-6"><FileHandlers /></div>
        </div>
        <div className="flex justify-end space-x-3">
          <button type="button" onClick={onClose} className="px-4 py-2 bg-white border rounded-md">Cancel</button>
          <button type="submit" disabled={loading} className="px-4 py-2 bg-primary text-white rounded-md">{loading ? 'Submitting...' : 'Submit Claim'}</button>
        </div>
      </form>
    </FormProvider>
  );
};

export default ClaimForm;