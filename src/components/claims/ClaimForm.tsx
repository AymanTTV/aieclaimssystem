import React, { useState } from 'react';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { uploadFile } from '../../utils/uploadFile';
import { uploadAllFiles } from '../../utils/uploadAllFiles';
import { generateClaimDocuments } from '../../utils/claimDocuments';
import toast from 'react-hot-toast';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { claimFormSchema, type ClaimFormData } from './ClaimForm/schema';
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
        signature: '',
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
        legalHandler: null,  // Change default to null
      },
      claimType: 'Domestic',
      caseProgress: 'Awaiting',
      progress: 'Your Claim Has Started',
      gpInformation: { visited: false },
      hospitalInformation: { visited: false },
      recovery: {
        date: '',
        locationPickup: '',
        locationDropoff: '',
        cost: 0,
        enabled: false
      }
    }
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
  const showRK = methods.watch('registerKeeper.enabled');

  const onSubmit = async (data: ClaimFormData) => {
    if (!user) {
      toast.error('You must be logged in to submit a claim');
      return;
    }

    if (data.recovery?.cost === '') {
      data.recovery.cost = undefined;
    }

    setLoading(true);
    setSubmitError(null);

    try {
      // Upload vehicle documents
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
        evidence: {
          images: evidenceUrls.images,
          videos: evidenceUrls.videos,
          clientVehiclePhotos: evidenceUrls.clientVehiclePhotos,
          engineerReport: evidenceUrls.engineerReport,
          bankStatement: evidenceUrls.bankStatement,
          adminDocuments: evidenceUrls.adminDocuments
        },
        fileHandlers: {
          aieHandler: data.fileHandlers.aieHandler,
          legalHandler: data.fileHandlers.legalHandler,
        },
        clientInfo: {
          ...data.clientInfo,
          dateOfBirth: new Date(data.clientInfo.dateOfBirth)
        },
        incidentDetails: {
          ...data.incidentDetails,
          date: new Date(data.incidentDetails.date)
        },
        // Only include hireDetails if H is selected
        hireDetails: showHireDetails && data.hireDetails?.enabled ? {
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
          vehicle: data.hireDetails.vehicle || null,
          enabled: true
        } : null,
        // Only include storage if S is selected
        storage: showStorageDetails && data.storage?.enabled ? {
          startDate: data.storage.startDate ? new Date(data.storage.startDate) : null,
          endDate: data.storage.endDate ? new Date(data.storage.endDate) : null,
          costPerDay: data.storage.costPerDay || 0,
          totalCost: data.storage.totalCost || 0,
          enabled: true
        } : null,
        recovery: data.recovery?.enabled ? {
    date: data.recovery.date ? new Date(data.recovery.date) : null,
    locationPickup: data.recovery.locationPickup || '',
    locationDropoff: data.recovery.locationDropoff || '',
    cost: data.recovery.cost || 0,
    enabled: true
  } : null,

        
        passengers: data.passengers.filter(passenger => 
        passenger.name || 
        passenger.address || 
        passenger.postCode || 
        passenger.dob || 
        passenger.contactNumber
      ),

        policeOfficerName: data.policeOfficerName || null,
  policeBadgeNumber: data.policeBadgeNumber || null,
  policeStation: data.policeStation || null, 
  policeIncidentNumber: data.policeIncidentNumber || null,
  policeContactInfo: data.policeContactInfo || null,

        paramedicNames: data.paramedicNames || null,
  ambulanceReference: data.ambulanceReference || null,
  ambulanceService: data.ambulanceService || null,
        
        // Only include GP information if PI is selected
        gpInformation: showGPInformation ? {
          ...data.gpInformation,
          visited: true
        } : { visited: false },
        hospitalInformation: showHospitalInformation ? {
          ...data.hospitalInformation,
          visited: true
        } : { visited: false },
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

      // after you build your claimData object:
      claimData.registerKeeper = data.registerKeeper.enabled
      ? {
          enabled: true,                            // ← include this!
          name: data.registerKeeper.name,
          address: data.registerKeeper.address,
          phone: data.registerKeeper.phone,
          email: data.registerKeeper.email,
          dateOfBirth: data.registerKeeper.dateOfBirth
            ? new Date(data.registerKeeper.dateOfBirth)
            : null,
          signature: data.registerKeeper.signature,
        }
      : null;

      // Add to Firestore
      const docRef = await addDoc(collection(db, 'claims'), claimData);

      // // Generate and upload documents
      // await generateClaimDocuments(docRef.id, {
      //   id: docRef.id,
      //   ...claimData
      // });

      toast.success('Claim submitted successfully');
      onClose();
    } catch (error: any) {
      console.error('Error submitting claim:', error);
      setSubmitError(error.message || 'Failed to submit claim. Please check all required fields and try again.');
      toast.error(error.message || 'Failed to submit claim');
    } finally {
      setLoading(false);
    }
  };

  return (
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(onSubmit)} className="space-y-6">
        {submitError && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
            <p className="font-medium">Error submitting claim:</p>
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
      // Create new array with empty passenger objects
      const newPassengers = Array(count).fill(null).map((_, index) => {
        // Preserve existing passenger data if available
        const currentPassengers = methods.getValues('passengers') || [];
        return currentPassengers[index] || {
          name: '',
          address: '',
          postCode: '',
          dob: '',
          contactNumber: ''
        };
      });
      // Update the form with the new array
      methods.setValue('passengers', newPassengers);
    }}
  />
</div>

          <div className="bg-white rounded-lg p-6">
           
<WitnessDetails
  count={methods.watch('witnesses')?.length || 0}
  onCountChange={(count) => {
    // Create new array with existing data preserved
    const currentWitnesses = methods.getValues('witnesses') || [];
    const newWitnesses = Array(count).fill(null).map((_, index) => {
      return currentWitnesses[index] || {
        name: '',
        address: '',
        postCode: '',
        dob: '',
        contactNumber: ''
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
            {loading ? 'Submitting...' : 'Submit Claim'}
          </button>
        </div>

        {/* Form Validation Errors Summary */}
        {/* Form Validation Errors Summary */}
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

export default ClaimForm;