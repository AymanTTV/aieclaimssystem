import React, { useState } from 'react';
import { addDoc, collection } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import FormField from '../ui/FormField';
import TextArea from '../ui/TextArea';
import { Upload } from 'lucide-react';
import SearchableSelect from '../ui/SearchableSelect';
import { useCustomers } from '../../hooks/useCustomers';
import { useVehicles } from '../../hooks/useVehicles';
import { X } from 'lucide-react';

interface AccidentClaimFormProps {
  onClose: () => void;
}

const AccidentClaimForm: React.FC<AccidentClaimFormProps> = ({ onClose }) => {
  const { customers } = useCustomers();
const { vehicles } = useVehicles();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [passengerCount, setPassengerCount] = useState(0);
  const [witnessCount, setWitnessCount] = useState(0);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [manualVehicleEntry, setManualVehicleEntry] = useState(false);
  const [manualEntry, setManualEntry] = useState(false);

  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);

  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [selectedVehicle, setSelectedVehicle] = useState(null);

  const [driverDetailsVisible, setDriverDetailsVisible] = useState(false); // New state
  const [vehicleDetailsVisible, setVehicleDetailsVisible] = useState(false); // New state


  const [errors, setErrors] = useState({
    refNo: '',
    referenceName: '',
  });

  
  
  const handleRefNoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData({ ...formData, refNo: value });

    // Clear error when user starts typing
    if (value && !isNaN(Number(value)) && Number(value) > 0) {
      setErrors({ ...errors, refNo: '' });
    } else {
      setErrors({ ...errors, refNo: 'Ref No must be a valid number greater than 0.' });
    }
  };

  const handleReferenceNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData({ ...formData, referenceName: value });

    // Clear error when user starts typing
    if (value.trim()) {
      setErrors({ ...errors, referenceName: '' });
    } else {
      setErrors({ ...errors, referenceName: 'Reference Name cannot be empty.' });
    }
  };

  const validateForm = (): boolean => {
    let isValid = true;

    // Validate Ref No - should be a valid number and greater than 0
    if (!formData.refNo || isNaN(Number(formData.refNo)) || Number(formData.refNo) <= 0) {
      isValid = false;
      setErrors((prevErrors) => ({
        ...prevErrors,
        refNo: "Ref No must be a valid number greater than 0.",
      }));
    }

    // Validate Reference Name - should not be empty
    if (!formData.referenceName.trim()) {
      isValid = false;
      setErrors((prevErrors) => ({
        ...prevErrors,
        referenceName: "Reference Name cannot be empty.",
      }));
    }

    return isValid;
  };


  const [formData, setFormData] = useState({
    refNo: '',
    referenceName: '',
    // Driver Details
    driverName: '',
    driverAddress: '',
    driverPostCode: '',
    driverDOB: '',
    driverPhone: '',
    driverMobile: '',
    driverNIN: '',

    // Vehicle Details
    registeredKeeperName: '',
    registeredKeeperAddress: '',
    vehicleMake: '',
    vehicleModel: '',
    vehicleVRN: '',
    insuranceCompany: '',
    policyNumber: '',
    policyExcess: '',

    // Fault Party Details
    faultPartyName: '',
    faultPartyAddress: '',
    faultPartyPostCode: '',
    faultPartyPhone: '',
    faultPartyVehicle: '',
    faultPartyVRN: '',
    faultPartyInsurance: '',

    // Accident Details
    accidentDate: '',
    accidentTime: '',
    accidentLocation: '',
    description: '',
    damageDetails: '',

    // Police Details
    policeOfficerName: '',
    policeBadgeNumber: '',
    policeStation: '',
    policeIncidentNumber: '',
    policeContactInfo: '',

    // Paramedic Details
    paramedicNames: '',
    ambulanceReference: '',
    ambulanceService: '',

    // Arrays for dynamic fields
    passengers: Array(4).fill({
      name: '',
      address: '',
      postCode: '',
      dob: '',
      contactNumber: ''
    }),
    witnesses: Array(3).fill({
      name: '',
      address: '',
      postCode: '',
      dob: '',
      contactNumber: ''
    })
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  if (e.target.files) {
    const filesArray = Array.from(e.target.files);
    setImageFiles(filesArray);

    // Create previews
    const previews = filesArray.map(file => URL.createObjectURL(file));
    setImagePreviews(previews);
  }
};

  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!user) return;

  setLoading(true);

  // If validation fails, turn off loading and exit early
  if (!validateForm()) {
    setLoading(false);
    return;
  }

  try {
    // Upload images to Firebase Storage and collect their download URLs
    const imageUrls = await Promise.all(
      imageFiles.map(async (file) => {
        const timestamp = Date.now();
        const storageRef = ref(storage, `accidents/${timestamp}_${file.name}`);
        const snapshot = await uploadBytes(storageRef, file);
        return getDownloadURL(snapshot.ref);
      })
    );

    // Build the accident claim object to save
    const accidentData = {
      ...formData,
      refNo: Number(formData.refNo),
      referenceName: formData.referenceName,
      passengers: formData.passengers.slice(0, passengerCount),
      witnesses: formData.witnesses.slice(0, witnessCount),
      images: imageUrls,
      status: 'reported',
      submittedBy: user.id,
      submittedAt: new Date(),
      updatedAt: new Date(),
    };

    // Add a new document to the "accidents" collection
    await addDoc(collection(db, 'accidents'), accidentData);

    toast.success('Accident claim submitted successfully');
    onClose();
  } catch (error) {
    console.error('Error submitting claim:', error);
    toast.error('Failed to submit claim');
  } finally {
    setLoading(false);
  }
};


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

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Reference Details */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Reference Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            label="Ref No"
            type="number"
            value={formData.refNo}
            onChange={handleRefNoChange}
            required
            
          />
          {/* errorMessage={errors.refNo} */}
          <FormField
            label="Reference Name"
            value={formData.referenceName}
            onChange={handleReferenceNameChange}
            required
            
          />
        </div>
        {/* errorMessage={errors.referenceName} */}
      </div>
      
      {/* Driver Details */}
      <div className="space-y-4">
  <div>
    <label className="flex items-center space-x-2">
      <input
        type="checkbox"
        checked={manualEntry}
        onChange={(e) => {
          setManualEntry(e.target.checked);
          if (!e.target.checked) {
            // Clear driver details if switching back to selection
            setFormData(prev => ({
              ...prev,
              driverName: '',
              driverAddress: '',
              driverPostCode: '',
              driverDOB: '',
              driverPhone: '',
              driverMobile: '',
              driverNIN: ''
            }));
          }
        }}
        className="rounded border-gray-300 text-primary focus:ring-primary"
      />
      <span className="text-sm text-gray-700">Enter Driver Details Manually</span>
    </label>
  </div>

  {!manualEntry ? (
    <SearchableSelect
      label="Select Customer"
      options={customers.map(c => ({
        id: c.id,
        label: c.name,
        subLabel: `${c.mobile} - ${c.email}`
      }))}
      value={selectedCustomerId}
      onChange={(id) => {
              const customer = customers.find(c => c.id === id);
              setSelectedCustomer(customer);
              setDriverDetailsVisible(!!customer); // Show if customer is selected

              if (customer) {
                setFormData(prev => ({
                  ...prev,
                  driverName: customer.name,
                  driverAddress: customer.address,
                  driverPostCode: '', // Leave empty as requested
                  driverDOB: customer.dateOfBirth.toISOString().split('T')[0],
                  driverPhone: customer.mobile,
                  driverMobile: customer.mobile,
                  driverNIN: customer.nationalInsuranceNumber
                }));
              } else {
                // Clear and hide if customer is not found
                setFormData(prev => ({
                  ...prev,
                  driverName: '',
                  driverAddress: '',
                  driverPostCode: '',
                  driverDOB: '',
                  driverPhone: '',
                  driverMobile: '',
                  driverNIN: ''
                }));
                setDriverDetailsVisible(false);
              }
            }}
      placeholder="Search customers..."
    />
  ) : (
    // Existing manual entry fields
      
    <div className="grid grid-cols-2 gap-4">
      
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
      
      
  )}
  {driverDetailsVisible && !manualEntry && ( 
      <div className="grid grid-cols-2 gap-4">
      
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
  
      )}
        
</div>
      
        

      {/* Vehicle Details */}
      <div className="space-y-4">
  <div>
    <label className="flex items-center space-x-2">
      <input
        type="checkbox"
        checked={manualVehicleEntry}
        onChange={(e) => setManualVehicleEntry(e.target.checked)}
        className="rounded border-gray-300 text-primary focus:ring-primary"
      />
      <span className="text-sm text-gray-700">Enter Vehicle Details Manually</span>
    </label>
  </div>

  {!manualVehicleEntry ? (
    <SearchableSelect
      label="Select Vehicle"
      options={vehicles.map(v => ({
        id: v.id,
        label: `${v.make} ${v.model}`,
        subLabel: v.registrationNumber
      }))}
      value={selectedVehicleId}
      onChange={(id) => {
              const vehicle = vehicles.find(v => v.id === id);
              setSelectedVehicle(vehicle);
              setVehicleDetailsVisible(!!vehicle); // Show if vehicle is selected

              if (vehicle) {
                setFormData(prev => ({
                  ...prev,
                  registeredKeeperName: vehicle.owner?.name || 'AIE Skyline',
                  registeredKeeperAddress: vehicle.owner?.address || '',
                  vehicleMake: vehicle.make,
                  vehicleModel: vehicle.model,
                  vehicleVRN: vehicle.registrationNumber
                }));
              } else {
                // Clear and hide if vehicle is not found
                setFormData(prev => ({
                   ...prev,
                  registeredKeeperName: '',
                  registeredKeeperAddress: '',
                  vehicleMake: '',
                  vehicleModel: '',
                  vehicleVRN: ''
                }));
                setVehicleDetailsVisible(false);
              }
            }}
      placeholder="Search vehicles..."
    />
  ) : (
    // Existing manual entry fields
    <div className="grid grid-cols-2 gap-4">
     
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
            
          />
          <FormField
            label="Policy Number"
            value={formData.policyNumber}
            onChange={(e) => setFormData({ ...formData, policyNumber: e.target.value })}
            
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
  )}
        {vehicleDetailsVisible && !manualVehicleEntry && (
        <div className="grid grid-cols-2 gap-4">
     
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
            
          />
          <FormField
            label="Policy Number"
            value={formData.policyNumber}
            onChange={(e) => setFormData({ ...formData, policyNumber: e.target.value })}
            
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
        )}
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
      {/* Image preview section */}

  {imagePreviews.map((preview, index) => (
    <div key={index} className="relative w-24 h-24">
      <img
        src={preview}
        alt={`Selected ${index}`}
        className="w-full h-full object-cover rounded-md"
      />
      <button
        type="button"
        onClick={() => {
          setImageFiles(prev => prev.filter((_, i) => i !== index));
          setImagePreviews(prev => prev.filter((_, i) => i !== index));
        }}
        className="absolute -top-2 -right-2 bg-red-100 rounded-full p-1 hover:bg-red-200"
      >
        <X className="h-4 w-4 text-red-600" />
      </button>
    </div>
  ))}


      {/* Images */}
      <div>
        
        <label className="block text-sm font-medium text-gray-700">Images</label>
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
                className="hidden"
                id="fileInput"
              />

              </label>
              <p className="pl-1">or drag and drop</p>
            </div>
            <p className="text-xs text-gray-500">PNG, JPG, GIF </p>
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
          {loading ? 'Submitting...' : 'Submit Claim'}
        </button>
      </div>
    </form>
  );
};

export default AccidentClaimForm;


