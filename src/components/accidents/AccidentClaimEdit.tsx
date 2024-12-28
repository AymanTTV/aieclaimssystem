import React, { useState } from 'react';
import { Accident } from '../../types';
import { doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import FormField from '../ui/FormField';
import TextArea from '../ui/TextArea';
import { Upload } from 'lucide-react';
import { validateImage } from '../../utils/imageUpload';

interface AccidentClaimEditProps {
  accident: Accident;
  onClose: () => void;
}

const AccidentClaimEdit: React.FC<AccidentClaimEditProps> = ({ accident, onClose }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [passengerCount, setPassengerCount] = useState(accident.passengers?.length || 0);
  const [witnessCount, setWitnessCount] = useState(accident.witnesses?.length || 0);
  const [images, setImages] = useState<FileList | null>(null);
  const [existingImages] = useState<string[]>(accident.images || []);

  const [formData, setFormData] = useState({
    // Driver Details
    driverName: accident.driverName,
    driverAddress: accident.driverAddress,
    driverPostCode: accident.driverPostCode,
    driverDOB: accident.driverDOB,
    driverPhone: accident.driverPhone,
    driverMobile: accident.driverMobile,
    driverNIN: accident.driverNIN,

    // Vehicle Details
    registeredKeeperName: accident.registeredKeeperName,
    registeredKeeperAddress: accident.registeredKeeperAddress || '',
    vehicleMake: accident.vehicleMake,
    vehicleModel: accident.vehicleModel,
    vehicleVRN: accident.vehicleVRN,
    insuranceCompany: accident.insuranceCompany,
    policyNumber: accident.policyNumber,
    policyExcess: accident.policyExcess || '',

    // Fault Party Details
    faultPartyName: accident.faultPartyName,
    faultPartyAddress: accident.faultPartyAddress || '',
    faultPartyPostCode: accident.faultPartyPostCode || '',
    faultPartyPhone: accident.faultPartyPhone || '',
    faultPartyVehicle: accident.faultPartyVehicle || '',
    faultPartyVRN: accident.faultPartyVRN,
    faultPartyInsurance: accident.faultPartyInsurance || '',

    // Accident Details
    accidentDate: accident.accidentDate,
    accidentTime: accident.accidentTime,
    accidentLocation: accident.accidentLocation,
    description: accident.description,
    damageDetails: accident.damageDetails,

    // Police Details
    policeOfficerName: accident.policeOfficerName || '',
    policeBadgeNumber: accident.policeBadgeNumber || '',
    policeStation: accident.policeStation || '',
    policeIncidentNumber: accident.policeIncidentNumber || '',
    policeContactInfo: accident.policeContactInfo || '',

    // Paramedic Details
    paramedicNames: accident.paramedicNames || '',
    ambulanceReference: accident.ambulanceReference || '',
    ambulanceService: accident.ambulanceService || '',

    // Status and Type
    status: accident.status,
    type: accident.type || 'pending',

    // Arrays for dynamic fields
    passengers: accident.passengers || Array(4).fill({
      name: '',
      address: '',
      postCode: '',
      dob: '',
      contactNumber: ''
    }),
    witnesses: accident.witnesses || Array(3).fill({
      name: '',
      address: '',
      postCode: '',
      dob: '',
      contactNumber: ''
    })
  });

  const handlePassengerChange = (index: number, field: string, value: string) => {
    const newPassengers = [...formData.passengers];
    newPassengers[index] = { ...newPassengers[index], [field]: value };
    setFormData({ ...formData, passengers: newPassengers });
  };

  const handleWitnessChange = (index: number, field: string, value: string) => {
    const newWitnesses = [...formData.witnesses];
    newWitnesses[index] = { ...newWitnesses[index], [field]: value };
    setFormData({ ...formData, witnesses: newWitnesses });
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    // Validate each image
    for (let i = 0; i < files.length; i++) {
      if (!validateImage(files[i])) {
        return;
      }
    }

    setImages(files);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    try {
      const imageUrls = [...existingImages];

      if (images) {
        for (let i = 0; i < images.length; i++) {
          const imageRef = ref(storage, `accidents/${accident.id}/${Date.now()}_${images[i].name}`);
          const snapshot = await uploadBytes(imageRef, images[i]);
          const url = await getDownloadURL(snapshot.ref);
          imageUrls.push(url);
        }
      }

      const accidentRef = doc(db, 'accidents', accident.id);
      await updateDoc(accidentRef, {
        ...formData,
        passengers: formData.passengers.slice(0, passengerCount),
        witnesses: formData.witnesses.slice(0, witnessCount),
        images: imageUrls,
        updatedAt: new Date(),
        updatedBy: user.id
      });

      toast.success('Accident claim updated successfully');
      onClose();
    } catch (error) {
      console.error('Error updating accident claim:', error);
      toast.error('Failed to update accident claim');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Driver Details */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Driver Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            label="Name"
            value={formData.driverName}
            onChange={(e) => setFormData({ ...formData, driverName: e.target.value })}
            required
          />
          <FormField
            label="Address"
            value={formData.driverAddress}
            onChange={(e) => setFormData({ ...formData, driverAddress: e.target.value })}
            required
          />
          <FormField
            label="Post Code"
            value={formData.driverPostCode}
            onChange={(e) => setFormData({ ...formData, driverPostCode: e.target.value })}
            required
          />
          <FormField
            type="date"
            label="Date of Birth"
            value={formData.driverDOB}
            onChange={(e) => setFormData({ ...formData, driverDOB: e.target.value })}
            required
          />
          <FormField
            type="tel"
            label="Telephone Number"
            value={formData.driverPhone}
            onChange={(e) => setFormData({ ...formData, driverPhone: e.target.value })}
            required
          />
          <FormField
            type="tel"
            label="Mobile Number"
            value={formData.driverMobile}
            onChange={(e) => setFormData({ ...formData, driverMobile: e.target.value })}
            required
          />
          <FormField
            label="National Insurance Number"
            value={formData.driverNIN}
            onChange={(e) => setFormData({ ...formData, driverNIN: e.target.value })}
            required
          />
        </div>
      </div>

      {/* Vehicle Details */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Vehicle Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            label="Registered Keeper Name"
            value={formData.registeredKeeperName}
            onChange={(e) => setFormData({ ...formData, registeredKeeperName: e.target.value })}
            required
          />
          <FormField
            label="Registered Keeper Address"
            value={formData.registeredKeeperAddress}
            onChange={(e) => setFormData({ ...formData, registeredKeeperAddress: e.target.value })}
          />
          <FormField
            label="Vehicle Make"
            value={formData.vehicleMake}
            onChange={(e) => setFormData({ ...formData, vehicleMake: e.target.value })}
            required
          />
          <FormField
            label="Vehicle Model"
            value={formData.vehicleModel}
            onChange={(e) => setFormData({ ...formData, vehicleModel: e.target.value })}
            required
          />
          <FormField
            label="Vehicle VRN"
            value={formData.vehicleVRN}
            onChange={(e) => setFormData({ ...formData, vehicleVRN: e.target.value })}
            required
          />
          <FormField
            label="Insurance Company"
            value={formData.insuranceCompany}
            onChange={(e) => setFormData({ ...formData, insuranceCompany: e.target.value })}
            required
          />
          <FormField
            label="Policy Number"
            value={formData.policyNumber}
            onChange={(e) => setFormData({ ...formData, policyNumber: e.target.value })}
            required
          />
          <FormField
            type="number"
            label="Policy Excess (£)"
            value={formData.policyExcess}
            onChange={(e) => setFormData({ ...formData, policyExcess: e.target.value })}
            min="0"
            step="0.01"
          />
        </div>
      </div>

      {/* Fault Party Details */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Fault Party Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            label="Name"
            value={formData.faultPartyName}
            onChange={(e) => setFormData({ ...formData, faultPartyName: e.target.value })}
            required
          />
          <FormField
            label="Address"
            value={formData.faultPartyAddress}
            onChange={(e) => setFormData({ ...formData, faultPartyAddress: e.target.value })}
          />
          <FormField
            label="Post Code"
            value={formData.faultPartyPostCode}
            onChange={(e) => setFormData({ ...formData, faultPartyPostCode: e.target.value })}
          />
          <FormField
            type="tel"
            label="Phone Number"
            value={formData.faultPartyPhone}
            onChange={(e) => setFormData({ ...formData, faultPartyPhone: e.target.value })}
          />
          <FormField
            label="Vehicle (Make and Model)"
            value={formData.faultPartyVehicle}
            onChange={(e) => setFormData({ ...formData, faultPartyVehicle: e.target.value })}
          />
          <FormField
            label="Vehicle Registration Number"
            value={formData.faultPartyVRN}
            onChange={(e) => setFormData({ ...formData, faultPartyVRN: e.target.value })}
            required
          />
          <FormField
            label="Insurance Company"
            value={formData.faultPartyInsurance}
            onChange={(e) => setFormData({ ...formData, faultPartyInsurance: e.target.value })}
          />
        </div>
      </div>

      {/* Accident Details */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Accident Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            type="date"
            label="Accident Date"
            value={formData.accidentDate}
            onChange={(e) => setFormData({ ...formData, accidentDate: e.target.value })}
            required
          />
          <FormField
            type="time"
            label="Accident Time"
            value={formData.accidentTime}
            onChange={(e) => setFormData({ ...formData, accidentTime: e.target.value })}
            required
          />
          <div className="md:col-span-2">
            <FormField
              label="Accident Location"
              value={formData.accidentLocation}
              onChange={(e) => setFormData({ ...formData, accidentLocation: e.target.value })}
              required
            />
          </div>
          <div className="md:col-span-2">
            <TextArea
              label="Describe what happened"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
            />
          </div>
          <div className="md:col-span-2">
            <TextArea
              label="Damage Details"
              value={formData.damageDetails}
              onChange={(e) => setFormData({ ...formData, damageDetails: e.target.value })}
              required
            />
          </div>
        </div>
      </div>

      {/* Status and Type */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Claim Status</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as Accident['status'] })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
            >
              <option value="reported">Reported</option>
              <option value="investigating">Investigating</option>
              <option value="processing">Processing</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Type</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
            >
              <option value="pending">Pending</option>
              <option value="fault">Fault</option>
              <option value="non-fault">Non-Fault</option>
            </select>
          </div>
        </div>
      </div>

      {/* Passenger Details */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900">Passenger Details</h3>
          <select
            value={passengerCount}
            onChange={(e) => setPassengerCount(parseInt(e.target.value))}
            className="block rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
          >
            <option value="0">No passengers</option>
            {[1, 2, 3, 4].map(num => (
              <option key={num} value={num}>{num} passenger{num !== 1 ? 's' : ''}</option>
            ))}
          </select>
        </div>
        {Array.from({ length: passengerCount }).map((_, index) => (
          <div key={index} className="border rounded-lg p-4 space-y-4">
            <h4 className="font-medium">Passenger {index + 1}</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                label="Name"
                value={formData.passengers[index].name}
                onChange={(e) => handlePassengerChange(index, 'name', e.target.value)}
              />
              <FormField
                label="Address"
                value={formData.passengers[index].address}
                onChange={(e) => handlePassengerChange(index, 'address', e.target.value)}
              />
              <FormField
                label="Post Code"
                value={formData.passengers[index].postCode}
                onChange={(e) => handlePassengerChange(index, 'postCode', e.target.value)}
              />
              <FormField
                type="date"
                label="Date of Birth"
                value={formData.passengers[index].dob}
                onChange={(e) => handlePassengerChange(index, 'dob', e.target.value)}
              />
              <FormField
                type="tel"
                label="Contact Number"
                value={formData.passengers[index].contactNumber}
                onChange={(e) => handlePassengerChange(index, 'contactNumber', e.target.value)}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Witness Details */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900">Witness Details</h3>
          <select
            value={witnessCount}
            onChange={(e) => setWitnessCount(parseInt(e.target.value))}
            className="block rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
          >
            <option value="0">No witnesses</option>
            {[1, 2, 3].map(num => (
              <option key={num} value={num}>{num} witness{num !== 1 ? 'es' : ''}</option>
            ))}
          </select>
        </div>
        {Array.from({ length: witnessCount }).map((_, index) => (
          <div key={index} className="border rounded-lg p-4 space-y-4">
            <h4 className="font-medium">Witness {index + 1}</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                label="Name"
                value={formData.witnesses[index].name}
                onChange={(e) => handleWitnessChange(index, 'name', e.target.value)}
              />
              <FormField
                label="Address"
                value={formData.witnesses[index].address}
                onChange={(e) => handleWitnessChange(index, 'address', e.target.value)}
              />
              <FormField
                label="Post Code"
                value={formData.witnesses[index].postCode}
                onChange={(e) => handleWitnessChange(index, 'postCode', e.target.value)}
              />
              <FormField
                type="date"
                label="Date of Birth"
                value={formData.witnesses[index].dob}
                onChange={(e) => handleWitnessChange(index, 'dob', e.target.value)}
              />
              <FormField
                type="tel"
                label="Contact Number"
                value={formData.witnesses[index].contactNumber}
                onChange={(e) => handleWitnessChange(index, 'contactNumber', e.target.value)}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Police Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Police Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            label="Officer's Name"
            value={formData.policeOfficerName}
            onChange={(e) => setFormData({ ...formData, policeOfficerName: e.target.value })}
          />
          <FormField
            label="Badge/ID Number"
            value={formData.policeBadgeNumber}
            onChange={(e) => setFormData({ ...formData, policeBadgeNumber: e.target.value })}
          />
          <FormField
            label="Police Station"
            value={formData.policeStation}
            onChange={(e) => setFormData({ ...formData, policeStation: e.target.value })}
          />
          <FormField
            label="Incident Number (CAD No)"
            value={formData.policeIncidentNumber}
            onChange={(e) => setFormData({ ...formData, policeIncidentNumber: e.target.value })}
          />
          <div className="md:col-span-2">
            <TextArea
              label="Additional Contact Information"
              value={formData.policeContactInfo}
              onChange={(e) => setFormData({ ...formData, policeContactInfo: e.target.value })}
            />
          </div>
        </div>
      </div>

      {/* Paramedic Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Paramedic Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            label="Names of Paramedics"
            value={formData.paramedicNames}
            onChange={(e) => setFormData({ ...formData, paramedicNames: e.target.value })}
          />
          <FormField
            label="Ambulance Reference"
            value={formData.ambulanceReference}
            onChange={(e) => setFormData({ ...formData, ambulanceReference: e.target.value })}
          />
          <FormField
            label="Ambulance Service"
            value={formData.ambulanceService}
            onChange={(e) => setFormData({ ...formData, ambulanceService: e.target.value })}
          />
        </div>
      </div>

      {/* Images */}
      <div>
        <label className="block text-sm font-medium text-gray-700">Additional Images</label>
        {existingImages.length > 0 && (
          <div className="mt-2 grid grid-cols-3 gap-4 mb-4">
            {existingImages.map((url, index) => (
              <img
                key={index}
                src={url}
                alt={`Existing image ${index + 1}`}
                className="h-24 w-full object-cover rounded-md"
              />
            ))}
          </div>
        )}
        <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
          <div className="space-y-1 text-center">
            <Upload className="mx-auto h-12 w-12 text-gray-400" />
            <div className="flex text-sm text-gray-600">
              <label className="relative cursor-pointer bg-white rounded-md font-medium text-primary hover:text-primary-dark focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary">
                <span>Upload images</span>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleImageChange}
                  className="sr-only"
                />
              </label>
              <p className="pl-1">or drag and drop</p>
            </div>
            <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB each</p>
          </div>
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
          {loading ? 'Updating...' : 'Update Claim'}
        </button>
      </div>
    </form>
  );
};

export default AccidentClaimEdit;