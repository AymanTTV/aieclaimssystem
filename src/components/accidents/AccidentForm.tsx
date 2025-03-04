import React, { useState } from 'react';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import FormField from '../ui/FormField';
import TextArea from '../ui/TextArea';
import toast from 'react-hot-toast';

interface AccidentFormProps {
  onClose: () => void;
}

const AccidentForm: React.FC<AccidentFormProps> = ({ onClose }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    refNo: '',
    referenceName: '',
    driverName: '',
    driverAddress: '',
    driverPostCode: '',
    driverDOB: '',
    driverPhone: '',
    driverMobile: '',
    driverNIN: '',
    vehicleMake: '',
    vehicleModel: '',
    vehicleVRN: '',
    insuranceCompany: '',
    policyNumber: '',
    policyExcess: '',
    faultPartyName: '',
    faultPartyAddress: '',
    faultPartyPostCode: '',
    faultPartyPhone: '',
    faultPartyVehicle: '',
    faultPartyVRN: '',
    faultPartyInsurance: '',
    accidentDate: '',
    accidentTime: '',
    accidentLocation: '',
    description: '',
    damageDetails: '',
    type: 'fault' as 'fault' | 'non-fault',
    amount: '', // Add amount field
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    try {
      await addDoc(collection(db, 'accidents'), {
        ...formData,
        amount: parseFloat(formData.amount) || 0, // Convert amount to number
        status: 'reported',
        submittedBy: user.id,
        submittedAt: new Date(),
        updatedAt: new Date()
      });

      toast.success('Accident reported successfully');
      onClose();
    } catch (error) {
      console.error('Error submitting accident:', error);
      toast.error('Failed to submit accident');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Reference Details */}
      <div className="grid grid-cols-2 gap-4">
        <FormField
          label="Reference No"
          value={formData.refNo}
          onChange={(e) => setFormData({ ...formData, refNo: e.target.value })}
          required
        />
        <FormField
          label="Reference Name"
          value={formData.referenceName}
          onChange={(e) => setFormData({ ...formData, referenceName: e.target.value })}
          required
        />
      </div>

      {/* Driver Details */}
      <div className="grid grid-cols-2 gap-4">
        <FormField
          label="Driver Name"
          value={formData.driverName}
          onChange={(e) => setFormData({ ...formData, driverName: e.target.value })}
          required
        />
        <FormField
          label="Driver Address"
          value={formData.driverAddress}
          onChange={(e) => setFormData({ ...formData, driverAddress: e.target.value })}
          required
        />
        <FormField
          label="Driver Post Code"
          value={formData.driverPostCode}
          onChange={(e) => setFormData({ ...formData, driverPostCode: e.target.value })}
          required
        />
        <FormField
          type="date"
          label="Driver Date of Birth"
          value={formData.driverDOB}
          onChange={(e) => setFormData({ ...formData, driverDOB: e.target.value })}
          required
        />
        <FormField
          type="tel"
          label="Driver Phone"
          value={formData.driverPhone}
          onChange={(e) => setFormData({ ...formData, driverPhone: e.target.value })}
          required
        />
        <FormField
          type="tel"
          label="Driver Mobile"
          value={formData.driverMobile}
          onChange={(e) => setFormData({ ...formData, driverMobile: e.target.value })}
          required
        />
        <FormField
          label="Driver NIN"
          value={formData.driverNIN}
          onChange={(e) => setFormData({ ...formData, driverNIN: e.target.value })}
          required
        />
      </div>

      {/* Vehicle Details */}
      <div className="grid grid-cols-2 gap-4">
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
          label="Policy Excess"
          value={formData.policyExcess}
          onChange={(e) => setFormData({ ...formData, policyExcess: e.target.value })}
        />
      </div>

      {/* Accident Type and Amount */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Accident Type</label>
          <select
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value as 'fault' | 'non-fault' })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
            required
          >
            <option value="fault">Fault</option>
            <option value="non-fault">Non-Fault</option>
          </select>
        </div>
        <FormField
          type="number"
          label={`${formData.type === 'fault' ? 'Fault' : 'Non-Fault'} Amount`}
          value={formData.amount}
          onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
          required
          min="0"
          step="0.01"
        />
      </div>

      {/* Fault Party Details */}
      <div className="grid grid-cols-2 gap-4">
        <FormField
          label="Fault Party Name"
          value={formData.faultPartyName}
          onChange={(e) => setFormData({ ...formData, faultPartyName: e.target.value })}
          required
        />
        <FormField
          label="Fault Party Address"
          value={formData.faultPartyAddress}
          onChange={(e) => setFormData({ ...formData, faultPartyAddress: e.target.value })}
        />
        <FormField
          label="Fault Party Post Code"
          value={formData.faultPartyPostCode}
          onChange={(e) => setFormData({ ...formData, faultPartyPostCode: e.target.value })}
        />
        <FormField
          type="tel"
          label="Fault Party Phone"
          value={formData.faultPartyPhone}
          onChange={(e) => setFormData({ ...formData, faultPartyPhone: e.target.value })}
        />
        <FormField
          label="Fault Party Vehicle"
          value={formData.faultPartyVehicle}
          onChange={(e) => setFormData({ ...formData, faultPartyVehicle: e.target.value })}
        />
        <FormField
          label="Fault Party VRN"
          value={formData.faultPartyVRN}
          onChange={(e) => setFormData({ ...formData, faultPartyVRN: e.target.value })}
          required
        />
        <FormField
          label="Fault Party Insurance"
          value={formData.faultPartyInsurance}
          onChange={(e) => setFormData({ ...formData, faultPartyInsurance: e.target.value })}
        />
      </div>

      {/* Accident Details */}
      <div className="grid grid-cols-2 gap-4">
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
        <div className="col-span-2">
          <FormField
            label="Accident Location"
            value={formData.accidentLocation}
            onChange={(e) => setFormData({ ...formData, accidentLocation: e.target.value })}
            required
          />
        </div>
        <div className="col-span-2">
          <TextArea
            label="Description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            required
          />
        </div>
        <div className="col-span-2">
          <TextArea
            label="Damage Details"
            value={formData.damageDetails}
            onChange={(e) => setFormData({ ...formData, damageDetails: e.target.value })}
            required
          />
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
          {loading ? 'Submitting...' : 'Submit Report'}
        </button>
      </div>
    </form>
  );
};

export default AccidentForm;