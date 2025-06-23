import React, { useState } from 'react';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { uploadFile } from '../../utils/uploadFile';
import { uploadAllFiles } from '../../utils/uploadAllFiles';
import toast from 'react-hot-toast';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { claimFormSchema, type ClaimFormData } from './ClaimForm/schema';
import RegisterKeeperDetails from './ClaimForm/sections/RegisterKeeperDetails';

// Import all other sections
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
      clientInfo: {
        name: '',
        phone: '',
        email: '',
        dateOfBirth: '',
        nationalInsuranceNumber: '',
        occupation: '',
        injuryDetails: '',
        address: ''
      },
      registerKeeper: {
        enabled: false,
        name: '',
        address: '',
        phone: '',
        email: '',
        dateOfBirth: '',
        signature: ''
      },
      clientVehicle: {
        registration: '',
        documents: {},
        motExpiry: '',
        roadTaxExpiry: ''
      },
      incidentDetails: {
        date: '',
        time: '',
        location: '',
        description: '',
        damageDetails: ''
      },
      thirdParty: {
        name: '',
        phone: '',
        address: '',
        email: '',
        registration: ''
      },
      passengers: [],
      witnesses: [],
      evidence: {
        images: [],
        videos: [],
        clientVehiclePhotos: [],
        engineerReport: [],
        bankStatement: [],
        adminDocuments: []
      },
      fileHandlers: {
        aieHandler: '',
        legalHandler: null
      },
      claimType: 'Domestic',
      caseProgress: 'Awaiting',
      progress: 'Your Claim Has Started',
      gpInformation: { visited: false },
      hospitalInformation: { visited: false },
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
    if (!user) {
      toast.error('You must be logged in to submit a claim');
      return;
    }
    setLoading(true);
    setSubmitError(null);

    try {
      // Upload documents & build URLs...
      const vehicleDocUrls: Record<string,string> = {};
      for (const [key,file] of Object.entries(data.clientVehicle!.documents || {})) {
        if (file instanceof File) {
          try {
            const url = await uploadFile(file, 'claims/vehicle-documents');
            vehicleDocUrls[key] = url;
          } catch {}
        } else {
          vehicleDocUrls[key] = file as string;
        }
      }
      const evidence = {
        images: await uploadAllFiles(data.evidence.images.filter(f=>f instanceof File) as File[], 'claims/images'),
        videos: await uploadAllFiles(data.evidence.videos.filter(f=>f instanceof File) as File[], 'claims/videos'),
        clientVehiclePhotos: await uploadAllFiles(data.evidence.clientVehiclePhotos.filter(f=>f instanceof File) as File[], 'claims/vehicle-photos'),
        engineerReport: await uploadAllFiles(data.evidence.engineerReport.filter(f=>f instanceof File) as File[], 'claims/engineer-reports'),
        bankStatement: await uploadAllFiles(data.evidence.bankStatement.filter(f=>f instanceof File) as File[], 'claims/bank-statements'),
        adminDocuments: await uploadAllFiles(data.evidence.adminDocuments.filter(f=>f instanceof File) as File[], 'claims/admin-documents')
      };

      const claimPayload: any = {
        ...data,
        clientVehicle: {
          ...data.clientVehicle!,
          documents: vehicleDocUrls
        },
        evidence,
        clientInfo: {
          ...data.clientInfo,
          dateOfBirth: new Date(data.clientInfo.dateOfBirth)
        },
        incidentDetails: {
          ...data.incidentDetails,
          date: new Date(data.incidentDetails.date)
        },
        hireDetails: showHireDetails && data.hireDetails?.enabled ? { ...data.hireDetails, enabled: true } : null,
        storage: showStorageDetails && data.storage?.enabled ? { ...data.storage, enabled:true } : null,
        recovery: data.recovery?.enabled ? { ...data.recovery, enabled:true } : null,
        createdBy: user.id,
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

      // Include registerKeeper only when enabled
      if (data.registerKeeper.enabled) {
        claimPayload.registerKeeper = {
          ...data.registerKeeper,
          dateOfBirth: data.registerKeeper.dateOfBirth ? new Date(data.registerKeeper.dateOfBirth) : null
        };
      } else {
        claimPayload.registerKeeper = null;
      }

      await addDoc(collection(db, 'claims'), claimPayload);
      toast.success('Claim submitted successfully');
      onClose();
    } catch (err: any) {
      console.error(err);
      setSubmitError(err.message);
      toast.error(err.message || 'Failed to submit claim');
    } finally {
      setLoading(false);
    }
  };

  return (
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(onSubmit)} className="space-y-6">
        {submitError && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            <p>{submitError}</p>
          </div>
        )}

        <div className="space-y-6">
          <div className="bg-white rounded-lg p-6 flex space-x-4">
            <ClaimProgress />
            <div className="w-64"><ClientRefField /></div>
          </div>

          <div className="bg-white rounded-lg p-6"><SubmitterDetails /></div>
          <div className="bg-white rounded-lg p-6"><DriverDetails /></div>

          
            <div className="bg-white rounded-lg p-6">
              <RegisterKeeperDetails />
            </div>
          

          <div className="bg-white rounded-lg p-6"><AccidentDetails /></div>

          {showVehicleDetails && (
            <div className="bg-white rounded-lg p-6"><VehicleDetails /></div>
          )}

          <div className="bg-white rounded-lg p-6"><FaultPartyDetails /></div>

          {showGPInformation && (
            <div className="bg-white rounded-lg p-6"><GPInformation /></div>
          )}
          {showHospitalInformation && (
            <div className="bg-white rounded-lg p-6"><Hospitalinformation /></div>
          )}

          <div className="bg-white rounded-lg p-6"><EvidenceUpload /></div>
          <div className="bg-white rounded-lg p-6">{/* Hire & Storage not shown here by default */}</div>

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
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white border rounded-md"
          >Cancel</button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-primary text-white rounded-md"
          >
            {loading ? 'Submitting...' : 'Submit Claim'}
          </button>
        </div>

        {Object.keys(methods.formState.errors).length > 0 && (
          <p className="text-red-600">*</p>
        )}
      </form>
    </FormProvider>
  );
};

export default ClaimForm;
