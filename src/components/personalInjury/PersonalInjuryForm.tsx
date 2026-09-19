import React, { useState, useEffect } from 'react';
import { addDoc, collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { PersonalInjury } from '../../types/personalInjury';
import { useAuth } from '../../context/AuthContext';
import FormField from '../ui/FormField';
import SearchableSelect from '../ui/SearchableSelect';
import toast from 'react-hot-toast';
import { ensureValidDate } from '../../utils/dateHelpers';
import { combineFullName, combineFullAddress, splitFullName, splitFullAddress } from '../../utils/nameAddressUtils';

interface PersonalInjuryFormProps {
  injury?: PersonalInjury;
  onClose: () => void;
}

const PersonalInjuryForm: React.FC<PersonalInjuryFormProps> = ({ injury, onClose }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [claims, setClaims] = useState<any[]>([]);
  const [selectedClaim, setSelectedClaim] = useState<any | null>(null);
  const [manualEntry, setManualEntry] = useState(true);

  const initialName = injury?.firstName
    ? { firstName: injury.firstName, middleName: injury.middleName || '', lastName: injury.lastName || '' }
    : splitFullName(injury?.fullName);

  const initialAddress = (injury?.buildingFlat || injury?.streetName)
    ? {
        buildingFlat: injury.buildingFlat || '',
        streetName: injury.streetName || '',
        townCity: injury.townCity || '',
        postcode: injury.postcode || '',
        country: injury.country || 'United Kingdom',
      }
    : splitFullAddress(injury?.address ? `${injury.address}${injury.postcode ? ', ' + injury.postcode : ''}` : '');

  const [formData, setFormData] = useState({
    reference: injury?.reference || '',
    fullName: injury?.fullName || '',
    firstName: initialName.firstName,
    middleName: initialName.middleName,
    lastName: initialName.lastName,
    dateOfBirth: injury?.dateOfBirth ? new Date(injury.dateOfBirth).toISOString().split('T')[0] : '',
    address: injury?.address || '',
    buildingFlat: initialAddress.buildingFlat,
    streetName: initialAddress.streetName,
    townCity: initialAddress.townCity,
    postcode: injury?.postcode || initialAddress.postcode,
    country: injury?.country || initialAddress.country || 'United Kingdom',
    contactNumber: injury?.contactNumber || '',
    emailAddress: injury?.emailAddress || '',
    
    incidentDate: injury?.incidentDate ? new Date(injury.incidentDate).toISOString().split('T')[0] : '',
    incidentTime: injury?.incidentTime || '',
    incidentLocation: injury?.incidentLocation || '',
    description: injury?.description || '',
    
    injuries: injury?.injuries || '',
    receivedMedicalTreatment: injury?.receivedMedicalTreatment || false,
    medicalDetails: injury?.medicalDetails || '',
    
    hasWitnesses: injury?.hasWitnesses || false,
    witnesses: injury?.witnesses || [],
    
    reportedToAuthorities: injury?.reportedToAuthorities || false,
    policeReferenceNumber: injury?.policeReferenceNumber || '',
    hasEvidence: injury?.hasEvidence || false,
    
    signature: injury?.signature || '',
  });

  const handleFirstNameChange = (firstName: string) => {
    setFormData(prev => {
      const fullName = combineFullName(firstName, prev.middleName, prev.lastName);
      return { ...prev, firstName, fullName };
    });
  };

  const handleMiddleNameChange = (middleName: string) => {
    setFormData(prev => {
      const fullName = combineFullName(prev.firstName, middleName, prev.lastName);
      return { ...prev, middleName, fullName };
    });
  };

  const handleLastNameChange = (lastName: string) => {
    setFormData(prev => {
      const fullName = combineFullName(prev.firstName, prev.middleName, lastName);
      return { ...prev, lastName, fullName };
    });
  };

  const handleBuildingFlatChange = (buildingFlat: string) => {
    setFormData(prev => {
      const address = combineFullAddress(buildingFlat, prev.streetName, prev.townCity, prev.postcode, prev.country);
      return { ...prev, buildingFlat, address };
    });
  };

  const handleStreetNameChange = (streetName: string) => {
    setFormData(prev => {
      const address = combineFullAddress(prev.buildingFlat, streetName, prev.townCity, prev.postcode, prev.country);
      return { ...prev, streetName, address };
    });
  };

  const handleTownCityChange = (townCity: string) => {
    setFormData(prev => {
      const address = combineFullAddress(prev.buildingFlat, prev.streetName, townCity, prev.postcode, prev.country);
      return { ...prev, townCity, address };
    });
  };

  const handlePostcodeChange = (postcode: string) => {
    setFormData(prev => {
      const address = combineFullAddress(prev.buildingFlat, prev.streetName, prev.townCity, postcode, prev.country);
      return { ...prev, postcode, address };
    });
  };

  const handleCountryChange = (country: string) => {
    setFormData(prev => {
      const address = combineFullAddress(prev.buildingFlat, prev.streetName, prev.townCity, prev.postcode, country);
      return { ...prev, country, address };
    });
  };

  useEffect(() => {
    const fetchClaims = async () => {
      try {
        console.log('Fetching claims...');
        const q = query(
          collection(db, 'claims'),
          where('progress', '!=', 'Claim Complete')
        );
        const snapshot = await getDocs(q);
        const claimsData = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            // Convert dates using ensureValidDate
            submittedAt: ensureValidDate(data.submittedAt),
            updatedAt: ensureValidDate(data.updatedAt),
            clientInfo: {
              ...data.clientInfo,
              dateOfBirth: ensureValidDate(data.clientInfo.dateOfBirth)
            },
            incidentDetails: {
              ...data.incidentDetails,
              date: ensureValidDate(data.incidentDetails.date)
            }
          };
        });
        console.log('Fetched claims:', claimsData);
        setClaims(claimsData);

        if (injury?.claimId) {
          const claim = claimsData.find(c => c.id === injury.claimId);
          if (claim) {
            setSelectedClaim(claim);
            setManualEntry(false);
          }
        }
      } catch (error) {
        console.error('Error fetching claims:', error);
        toast.error('Failed to fetch claims');
      }
    };

    fetchClaims();
  }, [injury?.claimId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    try {
      const injuryData = {
        ...formData,
        dateOfBirth: new Date(formData.dateOfBirth),
        incidentDate: new Date(formData.incidentDate),
        signatureDate: new Date(),
        status: 'pending' as const,
        updatedAt: new Date(),
        claimId: selectedClaim?.id
      };

      if (injury) {
        await updateDoc(doc(db, 'personalInjuries', injury.id), {
          ...injuryData,
          updatedBy: user.id,
        });
        toast.success('Personal injury claim updated successfully');
      } else {
        await addDoc(collection(db, 'personalInjuries'), {
          ...injuryData,
          createdAt: new Date(),
          createdBy: user.id,
        });
        toast.success('Personal injury claim submitted successfully');
      }

      onClose();
    } catch (error) {
      console.error('Error saving personal injury claim:', error);
      toast.error('Failed to save personal injury claim');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-gray-700">Claim Details</label>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={manualEntry}
              onChange={(e) => {
                setManualEntry(e.target.checked);
                if (e.target.checked) {
                  setSelectedClaim(null);
                }
              }}
              className="rounded border-gray-300 text-primary focus:ring-primary"
            />
            <span className="text-sm text-gray-600">Manual Entry</span>
          </label>
        </div>

        {!manualEntry && (
          <SearchableSelect
            label="Select Claim"
            options={claims.map(claim => ({
              id: claim.id,
              label: claim.clientInfo.name,
              subLabel: `Ref: ${claim.clientRef || 'N/A'} | Status: ${claim.status}`
            }))}
            value={selectedClaim?.id || ''}
            onChange={(id) => {
              const claim = claims.find(c => c.id === id);
              if (claim) {
                setSelectedClaim(claim);
                const parsedName = splitFullName(claim.clientInfo.name);
                const parsedAddr = splitFullAddress(claim.clientInfo.address);
                setFormData(prev => ({
                  ...prev,
                  reference: claim.clientRef || '',
                  fullName: claim.clientInfo.name,
                  firstName: parsedName.firstName,
                  middleName: parsedName.middleName,
                  lastName: parsedName.lastName,
                  dateOfBirth: new Date(claim.clientInfo.dateOfBirth).toISOString().split('T')[0],
                  address: claim.clientInfo.address,
                  buildingFlat: parsedAddr.buildingFlat,
                  streetName: parsedAddr.streetName,
                  townCity: parsedAddr.townCity,
                  postcode: parsedAddr.postcode,
                  country: parsedAddr.country || 'United Kingdom',
                  contactNumber: claim.clientInfo.phone,
                  emailAddress: claim.clientInfo.email,
                  incidentDate: new Date(claim.incidentDetails.date).toISOString().split('T')[0],
                  incidentTime: claim.incidentDetails.time,
                  incidentLocation: claim.incidentDetails.location,
                  description: claim.incidentDetails.description
                }));
              }
            }}
            placeholder="Search claims..."
          />
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <FormField
            label="Reference"
            value={formData.reference}
            onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
            disabled={!manualEntry && !!selectedClaim}
          />
        </div>

        <div className="col-span-2">
          <FormField
            label="First Name"
            value={formData.firstName}
            onChange={(e) => handleFirstNameChange(e.target.value)}
            required
            disabled={!manualEntry && !!selectedClaim}
          />
        </div>

        <div className="col-span-2">
          <FormField
            label="Middle Name"
            value={formData.middleName}
            onChange={(e) => handleMiddleNameChange(e.target.value)}
            disabled={!manualEntry && !!selectedClaim}
          />
        </div>

        <div className="col-span-2">
          <FormField
            label="Last Name"
            value={formData.lastName}
            onChange={(e) => handleLastNameChange(e.target.value)}
            required
            disabled={!manualEntry && !!selectedClaim}
          />
        </div>

        <div className="col-span-2">
          <FormField
            type="date"
            label="Date of Birth"
            value={formData.dateOfBirth}
            onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
            required
            disabled={!manualEntry && !!selectedClaim}
          />
        </div>

        <div className="col-span-2">
          <FormField
            label="Building Name / Flat Number"
            value={formData.buildingFlat}
            onChange={(e) => handleBuildingFlatChange(e.target.value)}
            required
            disabled={!manualEntry && !!selectedClaim}
          />
        </div>

        <div className="col-span-2">
          <FormField
            label="Street Name"
            value={formData.streetName}
            onChange={(e) => handleStreetNameChange(e.target.value)}
            required
            disabled={!manualEntry && !!selectedClaim}
          />
        </div>

        <div className="col-span-2">
          <FormField
            label="Town / City"
            value={formData.townCity}
            onChange={(e) => handleTownCityChange(e.target.value)}
            required
            disabled={!manualEntry && !!selectedClaim}
          />
        </div>

        <div className="col-span-2">
          <FormField
            label="Postcode"
            value={formData.postcode}
            onChange={(e) => handlePostcodeChange(e.target.value)}
            required
            disabled={!manualEntry && !!selectedClaim}
          />
        </div>

        <div className="col-span-2">
          <FormField
            label="Country"
            value={formData.country}
            onChange={(e) => handleCountryChange(e.target.value)}
            required
            disabled={!manualEntry && !!selectedClaim}
          />
        </div>

        <FormField
          type="tel"
          label="Contact Number"
          value={formData.contactNumber}
          onChange={(e) => setFormData({ ...formData, contactNumber: e.target.value })}
          required
          disabled={!manualEntry && !!selectedClaim}
        />

        <FormField
          type="email"
          label="Email Address"
          value={formData.emailAddress}
          onChange={(e) => setFormData({ ...formData, emailAddress: e.target.value })}
          required
          disabled={!manualEntry && !!selectedClaim}
        />
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Incident Details</h3>
        <div className="grid grid-cols-2 gap-4">
          <FormField
            type="date"
            label="Date of Incident"
            value={formData.incidentDate}
            onChange={(e) => setFormData({ ...formData, incidentDate: e.target.value })}
            required
          />
          <FormField
            type="time"
            label="Time of Incident"
            value={formData.incidentTime}
            onChange={(e) => setFormData({ ...formData, incidentTime: e.target.value })}
            required
          />
          <div className="col-span-2">
            <FormField
              label="Location of Incident"
              value={formData.incidentLocation}
              onChange={(e) => setFormData({ ...formData, incidentLocation: e.target.value })}
              required
            />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
              required
            />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Injury Details</h3>
        <div>
          <label className="block text-sm font-medium text-gray-700">Describe Your Injuries</label>
          <textarea
            value={formData.injuries}
            onChange={(e) => setFormData({ ...formData, injuries: e.target.value })}
            rows={3}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
            required
          />
        </div>
        <div className="space-y-2">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={formData.receivedMedicalTreatment}
              onChange={(e) => setFormData({ ...formData, receivedMedicalTreatment: e.target.checked })}
              className="rounded border-gray-300 text-primary focus:ring-primary"
            />
            <span className="text-sm text-gray-700">Received Medical Treatment</span>
          </label>
          {formData.receivedMedicalTreatment && (
            <div>
              <label className="block text-sm font-medium text-gray-700">Medical Treatment Details</label>
              <textarea
                value={formData.medicalDetails}
                onChange={(e) => setFormData({ ...formData, medicalDetails: e.target.value })}
                rows={3}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                placeholder="Enter hospital name, GP details, etc."
              />
            </div>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Witness Details</h3>
        <div className="space-y-2">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={formData.hasWitnesses}
              onChange={(e) => setFormData({ ...formData, hasWitnesses: e.target.checked })}
              className="rounded border-gray-300 text-primary focus:ring-primary"
            />
            <span className="text-sm text-gray-700">Were There Any Witnesses?</span>
          </label>
          {formData.hasWitnesses && (
            <div className="space-y-4">
              {formData.witnesses.map((witness, index) => (
                <div key={index} className="grid grid-cols-2 gap-4 p-4 border rounded-lg">
                  <FormField
                    label="Witness Name"
                    value={witness.name}
                    onChange={(e) => {
                      const newWitnesses = [...formData.witnesses];
                      newWitnesses[index] = { ...witness, name: e.target.value };
                      setFormData({ ...formData, witnesses: newWitnesses });
                    }}
                  />
                  <FormField
                    label="Contact Information"
                    value={witness.contactInfo}
                    onChange={(e) => {
                      const newWitnesses = [...formData.witnesses];
                      newWitnesses[index] = { ...witness, contactInfo: e.target.value };
                      setFormData({ ...formData, witnesses: newWitnesses });
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const newWitnesses = formData.witnesses.filter((_, i) => i !== index);
                      setFormData({ ...formData, witnesses: newWitnesses });
                    }}
                    className="col-span-2 text-red-600 hover:text-red-800"
                  >
                    Remove Witness
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => {
                  setFormData({
                    ...formData,
                    witnesses: [...formData.witnesses, { name: '', contactInfo: '' }]
                  });
                }}
                className="text-primary hover:text-primary-600"
              >
                Add Witness
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Additional Information</h3>
        <div className="space-y-4">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={formData.reportedToAuthorities}
              onChange={(e) => setFormData({ ...formData, reportedToAuthorities: e.target.checked })}
              className="rounded border-gray-300 text-primary focus:ring-primary"
            />
            <span className="text-sm text-gray-700">Reported to Authorities</span>
          </label>
          {formData.reportedToAuthorities && (
            <FormField
              label="Police Reference Number"
              value={formData.policeReferenceNumber}
              onChange={(e) => setFormData({ ...formData, policeReferenceNumber: e.target.value })}
            />
          )}
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={formData.hasEvidence}
              onChange={(e) => setFormData({ ...formData, hasEvidence: e.target.checked })}
              className="rounded border-gray-300 text-primary focus:ring-primary"
            />
            <span className="text-sm text-gray-700">Supporting Evidence Available</span>
          </label>
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
          className="px-4 py-2 text-sm font-medium text-white bg-primary border border-transparent rounded-md hover:bg-primary-600"
        >
          {loading ? 'Saving...' : injury ? 'Update Claim' : 'Submit Claim'}
        </button>
      </div>
    </form>
  );
};

export default PersonalInjuryForm;