import React, { useState } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { claimFormSchema, type ClaimFormData } from './ClaimForm/schema';
import { useAuth } from '../../context/AuthContext';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { uploadFile } from '../../utils/uploadFile';
import { uploadAllFiles } from '../../utils/uploadAllFiles';
import { generateClaimDocuments } from '../../utils/claimDocuments';
import toast from 'react-hot-toast';
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

interface ClaimFormProps {
  onClose: () => void;
}

const ClaimForm: React.FC<ClaimFormProps> = ({ onClose }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [passengerCount, setPassengerCount] = useState(0);
  const [witnessCount, setWitnessCount] = useState(0);

  const formatDate = (date: Date | null | undefined): string => {
    if (!date) return 'N/A';
    
    try {
      // Handle Firestore Timestamp
      if (date?.toDate) {
        date = date.toDate();
      }
      
      // Ensure we have a valid Date object
      const dateObj = date instanceof Date ? date : new Date(date);
      
      if (isNaN(dateObj.getTime())) {
        return 'N/A';
      }
      
      return format(dateObj, 'dd/MM/yyyy');
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'N/A';
    }
  };

  const formatDateTime = (date: Date | null | undefined): string => {
    if (!date) return 'N/A';
    
    try {
      // Handle Firestore Timestamp
      if (date?.toDate) {
        date = date.toDate();
      }
      
      // Ensure we have a valid Date object
      const dateObj = date instanceof Date ? date : new Date(date);
      
      if (isNaN(dateObj.getTime())) {
        return 'N/A';
      }
      
      return format(dateObj, 'dd/MM/yyyy HH:mm');
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'N/A';
    }
  };

  const methods = useForm<ClaimFormData>({
    resolver: zodResolver(claimFormSchema),
    defaultValues: {
      submitterType: 'company',
      clientRef: '',
      clientInfo: {
        name: '',
        phone: '',
        email: '',
        dateOfBirth: '',
        nationalInsuranceNumber: '',
        address: ''
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
        legalHandler: ''
      },
      claimType: 'Domestic',
      claimReason: 'VD Only',
      caseProgress: 'Awaiting',
      progress: 'in-progress'
    }
  });

  const handleSubmit = async (data: ClaimFormData) => {
    if (!user) {
      toast.error('You must be logged in to submit a claim');
      return;
    }

    try {
      setLoading(true);

      // Upload vehicle documents
      const vehicleDocumentUrls: Record<string, string> = {};
      for (const [key, file] of Object.entries(data.clientVehicle.documents)) {
        if (file instanceof File) {
          const url = await uploadFile(file, `claims/vehicle-documents`);
          vehicleDocumentUrls[key] = url;
        }
      }

      // Upload evidence files
      const evidenceUrls = {
        images: await uploadAllFiles(data.evidence.images.filter((f): f is File => f instanceof File), 'claims/images'),
        videos: await uploadAllFiles(data.evidence.videos.filter((f): f is File => f instanceof File), 'claims/videos'),
        clientVehiclePhotos: await uploadAllFiles(data.evidence.clientVehiclePhotos.filter((f): f is File => f instanceof File), 'claims/vehicle-photos'),
        engineerReport: await uploadAllFiles(data.evidence.engineerReport.filter((f): f is File => f instanceof File), 'claims/engineer-reports'),
        bankStatement: await uploadAllFiles(data.evidence.bankStatement.filter((f): f is File => f instanceof File), 'claims/bank-statements'),
        adminDocuments: await uploadAllFiles(data.evidence.adminDocuments.filter((f): f is File => f instanceof File), 'claims/admin-documents')
      };

      // Prepare claim data
      const claimData = {
        ...data,
        clientVehicle: {
          ...data.clientVehicle,
          documents: vehicleDocumentUrls
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
        // Only include hireDetails if enabled and has required data
        hireDetails: data.hireDetails?.enabled ? {
          startDate: data.hireDetails.startDate ? new Date(data.hireDetails.startDate) : null,
          endDate: data.hireDetails.endDate ? new Date(data.hireDetails.endDate) : null,
          startTime: data.hireDetails.startTime || '',
          endTime: data.hireDetails.endTime || '',
          daysOfHire: data.hireDetails.daysOfHire || 0,
          claimRate: data.hireDetails.claimRate || 340,
          deliveryCharge: data.hireDetails.deliveryCharge || 0,
          collectionCharge: data.hireDetails.collectionCharge || 0,
          insurancePerDay: data.hireDetails.insurancePerDay || 0,
          totalCost: data.hireDetails.totalCost || 0,
          vehicle: data.hireDetails.vehicle || null
        } : null,
        // Only include recovery if enabled and has required data
        recovery: data.recovery?.enabled ? {
          date: data.recovery.date ? new Date(data.recovery.date) : null,
          locationPickup: data.recovery.locationPickup || '',
          locationDropoff: data.recovery.locationDropoff || '',
          cost: data.recovery.cost || 0
        } : null,
        // Only include storage if enabled and has required data
        storage: data.storage?.enabled ? {
          startDate: data.storage.startDate ? new Date(data.storage.startDate) : null,
          endDate: data.storage.endDate ? new Date(data.storage.endDate) : null,
          costPerDay: data.storage.costPerDay || 0,
          totalCost: data.storage.totalCost || 0
        } : null,
        progress: 'Your Claim Has Started',
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

      // Generate and upload documents
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
              {loading ? 'Submitting...' : 'Submit Claim'}
            </button>
          </div>
        </div>
      </form>
    </FormProvider>
  );
};

export default ClaimForm;