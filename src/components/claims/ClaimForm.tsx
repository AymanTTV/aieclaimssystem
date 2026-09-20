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
import VehicleDocumentsUpload from './ClaimForm/sections/VehicleDocumentsUpload';
import HireDetails from './ClaimForm/sections/HireDetails';
import StorageDetails from './ClaimForm/sections/StorageDetails';
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
import { User, FileText, AlertTriangle, Users, Shield, ArrowRight, ArrowLeft, Check, CheckCircle2 } from 'lucide-react';

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

const STEPS = [
  { id: 1, title: 'Client & Vehicle Details', shortTitle: 'Client & Vehicle', description: 'Personal & policy data', icon: User },
  { id: 2, title: 'Vehicle Documents', shortTitle: 'Vehicle Docs', description: 'Compliance & licenses', icon: FileText },
  { id: 3, title: 'Incident Details', shortTitle: 'Incident Details', description: 'Date, time & location', icon: AlertTriangle },
  { id: 4, title: 'Third Party Details', shortTitle: 'Third Party', description: 'Driver & witnesses', icon: Users },
  { id: 5, title: 'Evidence & Initial Handlers', shortTitle: 'Evidence & Handlers', description: 'Uploads & assignments', icon: Shield },
];

const ClaimForm: React.FC<ClaimFormProps> = ({ onClose }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<number>(1);

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

  const handleNext = async () => {
    setSubmitError(null);
    if (currentStep === 1) {
      const isValid = await methods.trigger(['clientInfo', 'clientRef', 'submitterType', 'claimReason', 'registerKeeper'] as any);
      if (!isValid) {
        toast.error('Please complete all required client details.');
        return;
      }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      setCurrentStep(3);
    } else if (currentStep === 3) {
      const isValid = await methods.trigger(['incidentDetails'] as any);
      if (!isValid) {
        toast.error('Please complete all required incident details.');
        return;
      }
      setCurrentStep(4);
    } else if (currentStep === 4) {
      const isValid = await methods.trigger(['thirdParty'] as any);
      if (!isValid) {
        toast.error('Please complete the third-party details.');
        return;
      }
      setCurrentStep(5);
    }
  };

  const handlePrevious = () => {
    setSubmitError(null);
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleStepClick = async (stepId: number) => {
    if (stepId === currentStep) return;
    if (stepId < currentStep) {
      setCurrentStep(stepId);
      return;
    }
    if (currentStep === 1) {
      const isValid = await methods.trigger(['clientInfo', 'clientRef', 'submitterType', 'claimReason', 'registerKeeper'] as any);
      if (!isValid) return;
    }
    if (stepId > 3 && currentStep <= 3) {
      const isValid = await methods.trigger(['incidentDetails'] as any);
      if (!isValid) return;
    }
    if (stepId > 4 && currentStep <= 4) {
      const isValid = await methods.trigger(['thirdParty'] as any);
      if (!isValid) return;
    }
    setCurrentStep(stepId);
  };

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
        {/* Step-by-Step Progressive Stepper */}
        <div className="bg-gray-50 dark:bg-[#13131A] p-3 sm:p-4 rounded-xl border border-gray-200 dark:border-[#2B2B40]">
          {/* Progress Bar */}
          <div className="mb-3 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <span className="font-semibold text-gray-700 dark:text-gray-200">
              Step {currentStep} of {STEPS.length}: {STEPS[currentStep - 1].title}
            </span>
            <span className="font-mono text-primary font-bold">
              {Math.round((currentStep / STEPS.length) * 100)}% Completed
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-[#2B2B40] h-1.5 rounded-full overflow-hidden mb-4">
            <div
              className="bg-primary h-full transition-all duration-300 ease-out"
              style={{ width: `${(currentStep / STEPS.length) * 100}%` }}
            />
          </div>

          {/* Stepper Tabs */}
          <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
            {STEPS.map((step) => {
              const Icon = step.icon;
              const isCurrent = step.id === currentStep;
              const isPassed = step.id < currentStep;

              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => handleStepClick(step.id)}
                  className={`flex flex-col items-center sm:items-start p-2 sm:p-2.5 rounded-lg border text-left transition-all ${
                    isCurrent
                      ? 'bg-white dark:bg-[#1E1E2D] border-primary ring-2 ring-primary/20 shadow-xs'
                      : isPassed
                      ? 'bg-white/60 dark:bg-[#1E1E2D]/60 border-emerald-300 dark:border-emerald-800/60 hover:border-emerald-400 text-gray-700 dark:text-gray-300'
                      : 'bg-transparent border-transparent opacity-60 hover:opacity-80 text-gray-500 dark:text-gray-400'
                  }`}
                >
                  <div className="flex items-center gap-1.5 w-full">
                    <span
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
                        isCurrent
                          ? 'bg-primary text-white shadow-xs'
                          : isPassed
                          ? 'bg-emerald-500 text-white'
                          : 'bg-gray-200 dark:bg-[#2B2B40] text-gray-600 dark:text-gray-300'
                      }`}
                    >
                      {isPassed ? <Check className="w-3.5 h-3.5" /> : step.id}
                    </span>
                    <span className="hidden md:inline font-semibold text-xs truncate">
                      {step.shortTitle}
                    </span>
                  </div>
                  <span className="hidden lg:block text-[11px] text-gray-500 dark:text-gray-400 truncate mt-1 pl-7">
                    {step.description}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {submitError && (
          <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg text-sm">
            <p>{submitError}</p>
          </div>
        )}

        {/* STEP 1: Client & Vehicle Details */}
        {currentStep === 1 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="bg-white dark:bg-[#1E1E2D] rounded-xl p-5 sm:p-6 border border-gray-200 dark:border-[#2B2B40] shadow-xs">
              <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
                <ClaimProgress />
                <div className="w-full sm:w-64">
                  <ClientRefField />
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-[#1E1E2D] rounded-xl p-5 sm:p-6 border border-gray-200 dark:border-[#2B2B40] shadow-xs">
              <SubmitterDetails />
            </div>
            <div className="bg-white dark:bg-[#1E1E2D] rounded-xl p-5 sm:p-6 border border-gray-200 dark:border-[#2B2B40] shadow-xs">
              <DriverDetails />
            </div>
            <div className="bg-white dark:bg-[#1E1E2D] rounded-xl p-5 sm:p-6 border border-gray-200 dark:border-[#2B2B40] shadow-xs">
              <RegisterKeeperDetails />
            </div>
            {showVehicleDetails && (
              <div className="bg-white dark:bg-[#1E1E2D] rounded-xl p-5 sm:p-6 border border-gray-200 dark:border-[#2B2B40] shadow-xs">
                <VehicleDetails hideDocuments={true} />
              </div>
            )}
            {showHireDetails && (
              <div className="bg-white dark:bg-[#1E1E2D] rounded-xl p-5 sm:p-6 border border-gray-200 dark:border-[#2B2B40] shadow-xs">
                <HireDetails />
              </div>
            )}
            {showStorageDetails && (
              <div className="bg-white dark:bg-[#1E1E2D] rounded-xl p-5 sm:p-6 border border-gray-200 dark:border-[#2B2B40] shadow-xs">
                <StorageDetails />
              </div>
            )}
          </div>
        )}

        {/* STEP 2: Vehicle Documents */}
        {currentStep === 2 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="bg-white dark:bg-[#1E1E2D] rounded-xl p-5 sm:p-6 border border-gray-200 dark:border-[#2B2B40] shadow-xs">
              <VehicleDocumentsUpload />
            </div>
          </div>
        )}

        {/* STEP 3: Incident Details */}
        {currentStep === 3 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="bg-white dark:bg-[#1E1E2D] rounded-xl p-5 sm:p-6 border border-gray-200 dark:border-[#2B2B40] shadow-xs">
              <AccidentDetails />
            </div>
            {showGPInformation && (
              <div className="bg-white dark:bg-[#1E1E2D] rounded-xl p-5 sm:p-6 border border-gray-200 dark:border-[#2B2B40] shadow-xs">
                <GPInformation />
              </div>
            )}
            {showHospitalInformation && (
              <div className="bg-white dark:bg-[#1E1E2D] rounded-xl p-5 sm:p-6 border border-gray-200 dark:border-[#2B2B40] shadow-xs">
                <Hospitalinformation />
              </div>
            )}
            <div className="bg-white dark:bg-[#1E1E2D] rounded-xl p-5 sm:p-6 border border-gray-200 dark:border-[#2B2B40] shadow-xs">
              <PoliceDetails />
            </div>
            <div className="bg-white dark:bg-[#1E1E2D] rounded-xl p-5 sm:p-6 border border-gray-200 dark:border-[#2B2B40] shadow-xs">
              <ParamedicDetails />
            </div>
          </div>
        )}

        {/* STEP 4: Third Party Details */}
        {currentStep === 4 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="bg-white dark:bg-[#1E1E2D] rounded-xl p-5 sm:p-6 border border-gray-200 dark:border-[#2B2B40] shadow-xs">
              <FaultPartyDetails />
            </div>
            <div className="bg-white dark:bg-[#1E1E2D] rounded-xl p-5 sm:p-6 border border-gray-200 dark:border-[#2B2B40] shadow-xs">
              <PassengerDetails
                count={methods.watch('passengers')?.length || 0}
                onCountChange={(count) => {
                  const curr = methods.getValues('passengers') || [];
                  const arr = Array(count)
                    .fill(null)
                    .map((_, i) => curr[i] || { name: '', address: '', postCode: '', dob: '', contactNumber: '' });
                  methods.setValue('passengers', arr);
                }}
              />
            </div>
            <div className="bg-white dark:bg-[#1E1E2D] rounded-xl p-5 sm:p-6 border border-gray-200 dark:border-[#2B2B40] shadow-xs">
              <WitnessDetails
                count={methods.watch('witnesses')?.length || 0}
                onCountChange={(count) => {
                  const curr = methods.getValues('witnesses') || [];
                  const arr = Array(count)
                    .fill(null)
                    .map((_, i) => curr[i] || { name: '', address: '', postCode: '', dob: '', contactNumber: '' });
                  methods.setValue('witnesses', arr);
                }}
              />
            </div>
          </div>
        )}

        {/* STEP 5: Evidence & Initial Handlers */}
        {currentStep === 5 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="bg-white dark:bg-[#1E1E2D] rounded-xl p-5 sm:p-6 border border-gray-200 dark:border-[#2B2B40] shadow-xs">
              <EvidenceUpload />
            </div>
            <div className="bg-white dark:bg-[#1E1E2D] rounded-xl p-5 sm:p-6 border border-gray-200 dark:border-[#2B2B40] shadow-xs">
              <FileHandlers />
            </div>
          </div>
        )}

        {/* Bottom Navigation Buttons */}
        <div className="flex items-center justify-between pt-5 border-t border-gray-200 dark:border-[#2B2B40]">
          {currentStep === 1 ? (
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-[#1E1E2D] border border-gray-300 dark:border-[#2B2B40] rounded-lg hover:bg-gray-50 dark:hover:bg-[#2B2B40] transition-colors"
            >
              Cancel
            </button>
          ) : (
            <button
              type="button"
              onClick={handlePrevious}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-[#1E1E2D] border border-gray-300 dark:border-[#2B2B40] rounded-lg hover:bg-gray-50 dark:hover:bg-[#2B2B40] transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Previous</span>
            </button>
          )}

          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500 dark:text-gray-400 hidden sm:inline-block">
              Step {currentStep} of {STEPS.length}
            </span>
            {currentStep < 5 ? (
              <button
                type="button"
                onClick={handleNext}
                className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-primary hover:bg-primary/90 rounded-lg shadow-sm transition-all focus:outline-hidden focus:ring-2 focus:ring-primary/50"
              >
                <span>Next: {STEPS[currentStep].shortTitle}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-lg shadow-sm transition-all focus:outline-hidden focus:ring-2 focus:ring-emerald-500/50"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Submitting Claim...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Submit Claim</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </form>
    </FormProvider>
  );
};

export default ClaimForm;