import React, { useState, useMemo } from 'react';
import { addDoc, collection, doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import FormField from '../ui/FormField';
import TextArea from '../ui/TextArea';
import { Upload, X, Save, Shield, Banknote, PoundSterling, Clock, Check, Lock, AlertTriangle, CheckCircle2 } from 'lucide-react';
import SearchableSelect from '../ui/SearchableSelect';
import { useCustomers } from '../../hooks/useCustomers';
import { useVehicles } from '../../hooks/useVehicles';
import { Accident } from '../../types';
import { calculateReportingTiming } from '../../utils/accidentCalculations';

interface AccidentClaimFormProps {
  onClose: () => void;
  accident?: Accident | null;
}

const AccidentClaimForm: React.FC<AccidentClaimFormProps> = ({ onClose, accident }) => {
  const isEditing = Boolean(accident);
  const { customers } = useCustomers();
  const { vehicles } = useVehicles();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [passengerCount, setPassengerCount] = useState(accident?.passengers?.length || 0);
  const [witnessCount, setWitnessCount] = useState(accident?.witnesses?.length || 0);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [manualVehicleEntry, setManualVehicleEntry] = useState(Boolean(accident));
  const [manualEntry, setManualEntry] = useState(Boolean(accident));

  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>(accident?.images || []);

  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [selectedVehicle, setSelectedVehicle] = useState(null);

  const [driverDetailsVisible, setDriverDetailsVisible] = useState(Boolean(accident));
  const [vehicleDetailsVisible, setVehicleDetailsVisible] = useState(Boolean(accident));

  const [errors, setErrors] = useState({
    refNo: '',
    referenceName: '',
  });

  const [formData, setFormData] = useState({
    isReported: accident?.isReported || false,
    status: accident?.status === 'reported' ? 'pending' : (accident?.status || 'pending'), 
    type: accident?.type || 'pending',
    otherTypeDescription: accident?.otherTypeDescription || '', // <-- NEW
    claimStatus: accident?.claimStatus || 'pending',
    amount: accident?.amount !== undefined ? accident.amount : 0,
    
    refNo: accident ? (accident.refNo || accident.referenceNo || '').toString() : '',
    referenceName: accident?.referenceName || '',
    driverName: accident?.driverName || '',
    driverAddress: accident?.driverAddress || '',
    driverDOB: accident?.driverDOB || '',
    driverPhone: accident?.driverPhone || '',
    driverMobile: accident?.driverMobile || '',
    driverNIN: accident?.driverNIN || '',
    registeredKeeperName: accident?.registeredKeeperName || '',
    registeredKeeperAddress: accident?.registeredKeeperAddress || '',
    vehicleMake: accident?.vehicleMake || '',
    vehicleModel: accident?.vehicleModel || '',
    vehicleVRN: accident?.vehicleVRN || '',
    insuranceCompany: accident?.insuranceCompany || '',
    policyNumber: accident?.policyNumber || '',
    policyExcess: accident?.policyExcess || '',
    faultPartyName: accident?.faultPartyName || '',
    faultPartyAddress: accident?.faultPartyAddress || '',
    faultPartyPhone: accident?.faultPartyPhone || '',
    faultPartyVehicle: accident?.faultPartyVehicle || '',
    faultPartyVRN: accident?.faultPartyVRN || '',
    faultPartyInsurance: accident?.faultPartyInsurance || '',
    accidentDate: accident?.accidentDate || '',
    accidentTime: accident?.accidentTime || '',
    accidentLocation: accident?.accidentLocation || '',
    description: accident?.description || '',
    damageDetails: accident?.damageDetails || '',
    policeOfficerName: accident?.policeOfficerName || '',
    policeBadgeNumber: accident?.policeBadgeNumber || '',
    policeStation: accident?.policeStation || '',
    policeIncidentNumber: accident?.policeIncidentNumber || '',
    policeContactInfo: accident?.policeContactInfo || '',
    paramedicNames: accident?.paramedicNames || '',
    ambulanceReference: accident?.ambulanceReference || '',
    ambulanceService: accident?.ambulanceService || '',
    passengers: accident?.passengers || Array(4).fill({
      name: '',
      address: '',
      dob: '',
      contactNumber: ''
    }),
    witnesses: accident?.witnesses || Array(3).fill({
      name: '',
      address: '',
      dob: '',
      contactNumber: ''
    }),

    // Insurance Response Details (Insurer Spreadsheet Layout)
    claimNo: accident?.claimNo || (accident?.refNo ? String(accident.refNo) : ''),
    insuranceRefNo: accident?.insuranceRefNo || '',
    insuranceClaimStatus: accident?.insuranceClaimStatus || 'pending',
    dateFormReceivedFromInsurance: accident?.dateFormReceivedFromInsurance || '',
    reportedDate: accident?.reportedDate || (accident?.submittedAt ? new Date(accident.submittedAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]),
    reportedTime: accident?.reportedTime || (accident?.submittedAt ? new Date(accident.submittedAt).toTimeString().substring(0, 5) : new Date().toTimeString().substring(0, 5)),
    daysTakenToReport: accident?.daysTakenToReport !== undefined ? accident.daysTakenToReport : 0,
    claimReportedBy: accident?.claimReportedBy || '',
    regNo: accident?.regNo || accident?.vehicleVRN || '',

    // 24-Hour Late Reporting & Penalty State
    lateReportingPenalty: accident?.lateReportingPenalty !== undefined ? accident.lateReportingPenalty : (accident?.penaltyPayment || 0),

    // Outside Settlement
    settledOutsideInsurance: accident?.settledOutsideInsurance || false,
    outsideSettlementAmount: accident?.outsideSettlementAmount !== undefined ? accident.outsideSettlementAmount : 0,
    settlementNotes: accident?.settlementNotes || '',

    // Financials & Fault Tracking
    accCd: accident?.accCd || '',
    fault: accident?.fault || accident?.faultType || (accident?.type === 'fault' ? 'Fault' : accident?.type === 'non-fault' ? 'Non-Fault' : 'Fault'),
    faultType: accident?.faultType || accident?.fault || (accident?.type === 'fault' ? 'Fault' : accident?.type === 'non-fault' ? 'Non-Fault' : 'Fault'),
    lateReporting: accident?.lateReporting !== undefined ? (accident.lateReporting === true || accident.lateReporting === 'Yes' ? 'Yes' : 'No') : 'No',
    adEst: accident?.adEst !== undefined ? accident.adEst : 0,
    adPaid: accident?.adPaid !== undefined ? accident.adPaid : 0,
    tpPaid: accident?.tpPaid !== undefined ? accident.tpPaid : 0,
    tpPiEst: accident?.tpPiEst !== undefined ? accident.tpPiEst : 0,
    tpDamageEst: accident?.tpDamageEst !== undefined ? accident.tpDamageEst : 0,
    tpHireEst: accident?.tpHireEst !== undefined ? accident.tpHireEst : 0,
    totalTpEst: accident?.totalTpEst !== undefined ? accident.totalTpEst : 0,
    actRecovery: accident?.actRecovery !== undefined ? accident.actRecovery : 0,
    incurred: accident?.incurred !== undefined ? accident.incurred : 0,
    excessApplies: accident?.excessApplies || false,
    excessRecovered: accident?.excessRecovered || false,
    outstandingRecovery: accident?.outstandingRecovery !== undefined ? accident.outstandingRecovery : 0,
  });

  // Calculate 24-hour reporting timing live
  const reportingTiming = useMemo(() => {
    return calculateReportingTiming({
      accidentDate: formData.accidentDate,
      accidentTime: formData.accidentTime,
      reportedDate: formData.reportedDate,
      reportedTime: formData.reportedTime,
      submittedAt: accident?.submittedAt,
      existingPenalty: formData.lateReportingPenalty,
    });
  }, [
    formData.accidentDate,
    formData.accidentTime,
    formData.reportedDate,
    formData.reportedTime,
    formData.lateReportingPenalty,
    accident?.submittedAt,
  ]);

  const [displayAmount, setDisplayAmount] = useState('0');

  const handleDisplayAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDisplayAmount(e.target.value);
  };

  const handleAmountBlur = () => {
    const parsedValue = parseFloat(displayAmount);
    if (!isNaN(parsedValue)) {
      const roundedAmount = Math.round(parsedValue * 100) / 100;
      setFormData({ ...formData, amount: roundedAmount });
      setDisplayAmount(roundedAmount.toFixed(2));
    } else {
      setDisplayAmount(formData.amount.toFixed(2));
    }
  };

  const handleRefNoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData({ ...formData, refNo: value });

    if (value && !isNaN(Number(value)) && Number(value) > 0) {
      setErrors({ ...errors, refNo: '' });
    } else {
      setErrors({ ...errors, refNo: 'Ref No must be a valid number greater than 0.' });
    }
  };

  const handleReferenceNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData({ ...formData, referenceName: value });

    if (value.trim()) {
      setErrors({ ...errors, referenceName: '' });
    } else {
      setErrors({ ...errors, referenceName: 'Reference Name cannot be empty.' });
    }
  };

  const validateForm = (): boolean => {
    let isValid = true;

    if (!formData.refNo || isNaN(Number(formData.refNo)) || Number(formData.refNo) <= 0) {
      isValid = false;
      setErrors((prevErrors) => ({
        ...prevErrors,
        refNo: "Ref No must be a valid number greater than 0.",
      }));
    }

    if (!formData.referenceName.trim()) {
      isValid = false;
      setErrors((prevErrors) => ({
        ...prevErrors,
        referenceName: "Reference Name cannot be empty.",
      }));
    }

    return isValid;
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setImageFiles(filesArray);
      const previews = filesArray.map(file => URL.createObjectURL(file));
      setImagePreviews(previews);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);

    if (!validateForm()) {
      setLoading(false);
      return;
    }

    try {
      const imageUrls = await Promise.all(
        imageFiles.map(async (file) => {
          const timestamp = Date.now();
          const storageRef = ref(storage, `accidents/${timestamp}_${file.name}`);
          const snapshot = await uploadBytes(storageRef, file);
          return getDownloadURL(snapshot.ref);
        })
      );

      const refNoValueRaw = (formData.refNo ?? '').toString().trim();
      const refNoValue = refNoValueRaw ? Number(refNoValueRaw) : null;

      const isLate = reportingTiming.isLate;
      const finalLateReporting = isLate ? 'Yes' : 'No';
      const finalPenalty = isLate ? (Number(formData.lateReportingPenalty) || 0) : 0;

      const timingPayload = {
        daysTakenToReport: reportingTiming.diffDays,
        timeToReportHours: reportingTiming.diffHours,
        timeToReportDisplay: reportingTiming.timeToReportDisplay,
        lateReporting: finalLateReporting,
        lateReportingPenalty: finalPenalty,
        penaltyPayment: finalPenalty,
      };

      if (isEditing && accident?.id) {
        const accidentRef = doc(db, 'accidents', accident.id);
        const updatedImages = accident.images || [];
        const allImages = [...updatedImages, ...imageUrls];
        await updateDoc(accidentRef, {
          ...formData,
          ...timingPayload,
          refNo: refNoValue,
          referenceNo: refNoValue,
          referenceName: formData.referenceName,
          passengers: formData.passengers.slice(0, passengerCount || (accident.passengers?.length ?? 4)),
          witnesses: formData.witnesses.slice(0, witnessCount || (accident.witnesses?.length ?? 3)),
          images: allImages,
          otherTypeDescription: formData.type === 'other' ? formData.otherTypeDescription : '',
          updatedAt: new Date(),
          updatedBy: user.id,
        });

        toast.success('Accident claim updated successfully');
      } else {
        const accidentData = {
          ...formData,
          ...timingPayload,
          refNo: refNoValue,
          referenceNo: refNoValue,
          referenceName: formData.referenceName,
          passengers: formData.passengers.slice(0, passengerCount),
          witnesses: formData.witnesses.slice(0, witnessCount),
          images: imageUrls,
          otherTypeDescription: formData.type === 'other' ? formData.otherTypeDescription : '',
          submittedBy: user.id,
          submittedAt: new Date(),
          updatedAt: new Date(),
        };

        await addDoc(collection(db, 'accidents'), accidentData);
        toast.success('Accident claim submitted successfully');
      }

      onClose();
    } catch (error) {
      console.error('Error submitting claim:', error);
      toast.error(isEditing ? 'Failed to update accident claim' : 'Failed to submit claim');
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
      {/* Top Action Bar for Quick Update / Save */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
        <div>
          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-blue-100 text-blue-800">
              {isEditing ? 'Update Mode' : 'New Report'}
            </span>
            <span className="text-sm font-semibold text-slate-800">
              {isEditing ? `Editing Claim: ${formData.referenceName || formData.refNo || 'Accident'}` : 'Accident Claim Entry'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Save initial accident details now. Insurance, settlements, and financial tracking can be updated at any time.
          </p>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center space-x-1.5 px-4 py-2 text-xs font-semibold text-white bg-primary rounded-md shadow-sm hover:bg-primary-600 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary whitespace-nowrap"
        >
          <Save className="w-3.5 h-3.5" />
          <span>{loading ? 'Saving...' : isEditing ? 'Update Claim' : 'Save Changes'}</span>
        </button>
      </div>

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
          <FormField
            label="Reference Name"
            value={formData.referenceName}
            onChange={handleReferenceNameChange}
            required
          />
        </div>
      </div>

      {/* Claim Status & Workflow */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Claim Status & Workflow</h3>
        
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
          <label className="flex items-center space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.isReported}
              onChange={(e) => setFormData({ ...formData, isReported: e.target.checked })}
              className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-blue-900">Mark Accident as Officially Reported</span>
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Workflow Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
              required
            >
              <option value="pending">Pending</option>
              <option value="investigating">Investigating</option>
              <option value="processing">Processing</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Claim Type</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
              required
            >
              <option value="pending">Pending</option>
              <option value="fault">Fault</option>
              <option value="non-fault">Non-Fault</option>
              <option value="other">Other</option>
            </select>
          </div>
          
          {formData.type === 'other' && (
            <div className="md:col-span-2">
              <FormField
                label="Please describe the 'Other' type"
                value={formData.otherTypeDescription}
                onChange={(e) => setFormData({ ...formData, otherTypeDescription: e.target.value })}
                required
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700">Claim Approval Status</label>
            <select
              value={formData.claimStatus}
              onChange={(e) => setFormData({ ...formData, claimStatus: e.target.value as any })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
              required
            >
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="settled">Settled</option>
            </select>
          </div>
          <FormField
            type="number"
            label={`${formData.type === 'fault' ? 'Fault' : formData.type === 'non-fault' ? 'Non-Fault' : 'Claim'} Amount`}
            value={displayAmount}
            onChange={handleDisplayAmountChange}
            onBlur={handleAmountBlur}
            required
            min="0"
            step="0.01"
          />
        </div>
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
                  setFormData(prev => ({
                    ...prev,
                    driverName: '',
                    driverAddress: '',
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
              setDriverDetailsVisible(!!customer);

              if (customer) {
                setFormData(prev => ({
                  ...prev,
                  driverName: customer.name,
                  driverAddress: customer.address,
                  driverDOB: customer.dateOfBirth.toISOString().split('T')[0],
                  driverPhone: customer.mobile,
                  driverMobile: customer.mobile,
                  driverNIN: customer.nationalInsuranceNumber
                }));
              } else {
                setFormData(prev => ({
                  ...prev,
                  driverName: '',
                  driverAddress: '',
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
              setVehicleDetailsVisible(!!vehicle);

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

      {/* Insurance Response Details */}
      <div className="space-y-4 border-t pt-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Shield className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-medium text-gray-900">Insurance Response Details</h3>
          </div>
          <span className="text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full border border-blue-200">
            Progressive Updates
          </span>
        </div>
        <p className="text-sm text-gray-500">
          Track insurer communications, claims reference numbers, and received response dates. Editable at any stage.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <FormField
            label="Claim No"
            placeholder="e.g. CLM-84920"
            value={formData.claimNo}
            onChange={(e) => setFormData({ ...formData, claimNo: e.target.value })}
          />
          <FormField
            label="Insurance Ref No"
            placeholder="e.g. INS-984210"
            value={formData.insuranceRefNo}
            onChange={(e) => setFormData({ ...formData, insuranceRefNo: e.target.value })}
          />
          <FormField
            label="Acc Cd (Accident Code)"
            placeholder="e.g. ACC-01"
            value={formData.accCd}
            onChange={(e) => setFormData({ ...formData, accCd: e.target.value })}
          />
          <div>
            <label className="block text-sm font-medium text-gray-700">Insurance Claim Status</label>
            <select
              value={formData.insuranceClaimStatus}
              onChange={(e) => setFormData({ ...formData, insuranceClaimStatus: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
            >
              <option value="pending">Pending</option>
              <option value="submitted">Submitted to Insurer</option>
              <option value="under_review">Under Review / Investigation</option>
              <option value="accepted">Liability Accepted</option>
              <option value="disputed">Liability Disputed</option>
              <option value="settled">Settled</option>
              <option value="closed">Closed / Repudiated</option>
            </select>
          </div>
          <FormField
            type="date"
            label="Reported Date"
            value={formData.reportedDate}
            onChange={(e) => setFormData({ ...formData, reportedDate: e.target.value })}
          />
          <FormField
            type="time"
            label="Reported Time"
            value={formData.reportedTime}
            onChange={(e) => setFormData({ ...formData, reportedTime: e.target.value })}
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 flex items-center space-x-1">
              <Lock className="w-3.5 h-3.5 text-gray-400 inline" />
              <span>Time to Report (Locked)</span>
            </label>
            <div className="mt-1 flex items-center bg-gray-100 border border-gray-300 rounded-md px-3 py-2 text-sm font-semibold text-gray-800">
              <Clock className="w-4 h-4 text-blue-600 mr-2" />
              <span>{reportingTiming.timeToReportDisplay}</span>
            </div>
            <p className="text-[11px] text-gray-500 mt-0.5">Auto-calculated difference from accident time</p>
          </div>
          <FormField
            label="Claim Reported By"
            placeholder="e.g. Driver / Controller"
            value={formData.claimReportedBy}
            onChange={(e) => setFormData({ ...formData, claimReportedBy: e.target.value })}
          />
          <FormField
            type="date"
            label="Date Form Rec'd from Ins."
            value={formData.dateFormReceivedFromInsurance}
            onChange={(e) => setFormData({ ...formData, dateFormReceivedFromInsurance: e.target.value })}
          />
        </div>

        {/* 24-Hour Late Reporting Engine Result Banner */}
        <div className={`mt-4 p-4 rounded-lg border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 ${
          reportingTiming.isLate 
            ? 'bg-rose-50/80 border-rose-200 text-rose-950' 
            : 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
        }`}>
          <div className="flex items-start space-x-3">
            {reportingTiming.isLate ? (
              <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
            )}
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-semibold uppercase tracking-wide">24-Hour Reporting Rule:</span>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-bold ${
                  reportingTiming.isLate ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'
                }`}>
                  Late Reporting: {reportingTiming.lateReporting} {reportingTiming.isLate ? '(> 24 Hours)' : '(≤ 24 Hours)'}
                </span>
              </div>
              <p className="text-xs text-gray-700 mt-1">
                {reportingTiming.isLate
                  ? `Reported after 24 hours (${reportingTiming.timeToReportDisplay}). Late reporting penalty applies.`
                  : `Reported within 24 hours (${reportingTiming.timeToReportDisplay}). No penalty applies (£0.00).`
                }
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="bg-white border rounded-md px-3 py-1.5 shadow-2xs text-center min-w-[140px]">
              <span className="block text-[10px] text-gray-500 uppercase font-semibold">Penalty Payment</span>
              <span className={`text-base font-bold ${reportingTiming.isLate ? 'text-rose-700' : 'text-emerald-700'}`}>
                £{reportingTiming.isLate ? (Number(formData.lateReportingPenalty) || 0).toFixed(2) : '0.00'}
              </span>
            </div>
          </div>
        </div>

        {/* Editable Late Reporting Penalty (£) if Late */}
        {reportingTiming.isLate && (
          <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <span className="text-xs font-bold text-amber-900">Late Reporting Penalty (£)</span>
              <p className="text-[11px] text-amber-700">Enter penalty amount charged to driver for late reporting (&gt; 24 hrs).</p>
            </div>
            <div className="w-full sm:w-48">
              <FormField
                type="number"
                step="0.01"
                min="0"
                placeholder="e.g. 50.00"
                value={formData.lateReportingPenalty || ''}
                onChange={(e) => setFormData({ ...formData, lateReportingPenalty: parseFloat(e.target.value) || 0 })}
              />
            </div>
          </div>
        )}
      </div>

      {/* Outside Settlement */}
      <div className="space-y-4 border-t pt-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Banknote className="w-5 h-5 text-emerald-600" />
            <h3 className="text-lg font-medium text-gray-900">Outside Settlement</h3>
          </div>
          <span className="text-xs bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full border border-emerald-200">
            Direct & Private
          </span>
        </div>
        
        {/* Toggle Settled Outside Insurance */}
        <div className="bg-emerald-50/50 p-4 rounded-lg border border-emerald-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <span className="text-sm font-semibold text-gray-900">Settled Outside Insurance?</span>
            <p className="text-xs text-gray-500">Enable if agreement or payout was reached directly without insurer involvement</p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => setFormData({ ...formData, settledOutsideInsurance: false })}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                !formData.settledOutsideInsurance
                  ? 'bg-gray-200 text-gray-800 shadow-xs'
                  : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              No
            </button>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, settledOutsideInsurance: true })}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                formData.settledOutsideInsurance
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              Yes
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            type="number"
            step="0.01"
            min="0"
            label="Outside Settlement Amount Paid Out (£)"
            placeholder="0.00"
            value={formData.outsideSettlementAmount || ''}
            onChange={(e) => setFormData({ ...formData, outsideSettlementAmount: parseFloat(e.target.value) || 0 })}
          />
          <div className="md:col-span-2">
            <TextArea
              label="Settlement Notes"
              placeholder="Enter details of outside settlement, payment terms, receipts, or third-party agreement..."
              rows={3}
              value={formData.settlementNotes}
              onChange={(e) => setFormData({ ...formData, settlementNotes: e.target.value })}
            />
          </div>
        </div>
      </div>

      {/* Financials & Fault Tracking */}
      <div className="space-y-4 border-t pt-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <PoundSterling className="w-5 h-5 text-indigo-600" />
            <h3 className="text-lg font-medium text-gray-900">Financials & Fault Tracking</h3>
          </div>
          <span className="text-xs bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full border border-indigo-200">
            Cost & Recovery Tracking
          </span>
        </div>
        <p className="text-sm text-gray-500">
          Record accidental damage costs, third-party claims, excess status, and recoveries.
        </p>

        {/* Fault Type & Excess Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fault Type</label>
            <div className="flex rounded-md shadow-xs">
              {(['Fault', 'Non-Fault', 'Split'] as const).map((ft) => (
                <button
                  key={ft}
                  type="button"
                  onClick={() => setFormData({ ...formData, faultType: ft, fault: ft })}
                  className={`flex-1 py-1.5 text-xs font-semibold border first:rounded-l-md last:rounded-r-md -ml-px first:ml-0 transition-colors ${
                    formData.faultType === ft
                      ? ft === 'Fault'
                        ? 'bg-rose-600 text-white border-rose-600 z-10'
                        : ft === 'Non-Fault'
                        ? 'bg-emerald-600 text-white border-emerald-600 z-10'
                        : 'bg-amber-600 text-white border-amber-600 z-10'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {ft}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Late Reporting (24h Rule)</label>
            <div className="flex items-center space-x-2 mt-1">
              <span className={`inline-flex items-center px-2.5 py-1.5 rounded-md text-xs font-bold ${
                reportingTiming.isLate
                  ? 'bg-rose-100 text-rose-800 border border-rose-200'
                  : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
              }`}>
                {reportingTiming.lateReporting} {reportingTiming.isLate ? '(> 24h)' : '(≤ 24h)'}
              </span>
              <span className="text-xs text-gray-500 font-medium">
                Penalty: <strong className={reportingTiming.isLate && reportingTiming.penaltyPayment > 0 ? 'text-rose-700' : 'text-gray-900'}>
                  £{reportingTiming.penaltyPayment.toFixed(2)}
                </strong>
              </span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Excess Applies?</label>
            <div className="flex items-center space-x-2 mt-1">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, excessApplies: false })}
                className={`px-3 py-1.5 text-xs font-medium rounded-md ${
                  !formData.excessApplies
                    ? 'bg-gray-300 text-gray-800 font-semibold'
                    : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                No
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, excessApplies: true })}
                className={`px-3 py-1.5 text-xs font-medium rounded-md ${
                  formData.excessApplies
                    ? 'bg-indigo-600 text-white font-semibold'
                    : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                Yes
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Excess Recovered?</label>
            <div className="flex items-center space-x-2 mt-1">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, excessRecovered: false })}
                className={`px-3 py-1.5 text-xs font-medium rounded-md ${
                  !formData.excessRecovered
                    ? 'bg-gray-300 text-gray-800 font-semibold'
                    : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                No
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, excessRecovered: true })}
                className={`px-3 py-1.5 text-xs font-medium rounded-md ${
                  formData.excessRecovered
                    ? 'bg-emerald-600 text-white font-semibold'
                    : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                Yes
              </button>
            </div>
          </div>
        </div>

        {/* Financial Numbers Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <FormField
            type="number"
            step="0.01"
            min="0"
            label="AD Est (£)"
            placeholder="0.00"
            value={formData.adEst || ''}
            onChange={(e) => setFormData({ ...formData, adEst: parseFloat(e.target.value) || 0 })}
          />
          <FormField
            type="number"
            step="0.01"
            min="0"
            label="AD Paid (£)"
            placeholder="0.00"
            value={formData.adPaid || ''}
            onChange={(e) => setFormData({ ...formData, adPaid: parseFloat(e.target.value) || 0 })}
          />
          <FormField
            type="number"
            step="0.01"
            min="0"
            label="TP Paid (£)"
            placeholder="0.00"
            value={formData.tpPaid || ''}
            onChange={(e) => setFormData({ ...formData, tpPaid: parseFloat(e.target.value) || 0 })}
          />
          <div className="relative">
            <FormField
              type="number"
              step="0.01"
              min="0"
              label="Incurred (£)"
              placeholder="0.00"
              value={formData.incurred || ''}
              onChange={(e) => setFormData({ ...formData, incurred: parseFloat(e.target.value) || 0 })}
            />
            <button
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, incurred: Number(((prev.adPaid || 0) + (prev.tpPaid || 0)).toFixed(2)) }))}
              className="text-[10px] text-indigo-600 hover:underline absolute right-0 top-0 font-medium"
            >
              Sum (AD+TP Paid)
            </button>
          </div>

          <FormField
            type="number"
            step="0.01"
            min="0"
            label="TP PI Est (£)"
            placeholder="0.00"
            value={formData.tpPiEst || ''}
            onChange={(e) => setFormData({ ...formData, tpPiEst: parseFloat(e.target.value) || 0 })}
          />
          <FormField
            type="number"
            step="0.01"
            min="0"
            label="TP Damage Est (£)"
            placeholder="0.00"
            value={formData.tpDamageEst || ''}
            onChange={(e) => setFormData({ ...formData, tpDamageEst: parseFloat(e.target.value) || 0 })}
          />
          <FormField
            type="number"
            step="0.01"
            min="0"
            label="TP Hire Est (£)"
            placeholder="0.00"
            value={formData.tpHireEst || ''}
            onChange={(e) => setFormData({ ...formData, tpHireEst: parseFloat(e.target.value) || 0 })}
          />
          <div className="relative">
            <FormField
              type="number"
              step="0.01"
              min="0"
              label="Total TP Est (£)"
              placeholder="0.00"
              value={formData.totalTpEst || ''}
              onChange={(e) => setFormData({ ...formData, totalTpEst: parseFloat(e.target.value) || 0 })}
            />
            <button
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, totalTpEst: Number(((prev.tpPiEst || 0) + (prev.tpDamageEst || 0) + (prev.tpHireEst || 0)).toFixed(2)) }))}
              className="text-[10px] text-indigo-600 hover:underline absolute right-0 top-0 font-medium"
            >
              Sum (PI+Dmg+Hire)
            </button>
          </div>
          <FormField
            type="number"
            step="0.01"
            min="0"
            label="Act Recovery (£)"
            placeholder="0.00"
            value={formData.actRecovery || ''}
            onChange={(e) => setFormData({ ...formData, actRecovery: parseFloat(e.target.value) || 0 })}
          />

          <div className="relative md:col-span-2">
            <FormField
              type="number"
              step="0.01"
              min="0"
              label="Outstanding Recovery (£)"
              placeholder="0.00"
              value={formData.outstandingRecovery || ''}
              onChange={(e) => setFormData({ ...formData, outstandingRecovery: parseFloat(e.target.value) || 0 })}
            />
            <button
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, outstandingRecovery: Number(Math.max(0, (prev.totalTpEst || 0) - (prev.actRecovery || 0)).toFixed(2)) }))}
              className="text-[10px] text-indigo-600 hover:underline absolute right-0 top-0 font-medium"
            >
              Calc (Total TP - Act Recovery)
            </button>
          </div>
        </div>
      </div>

      {/* Images Section */}
      <div>
        <label className="block text-sm font-medium text-gray-700">Images</label>
        <div className="mt-2 flex flex-wrap gap-2">
          {imagePreviews.map((img, index) => (
            <div key={index} className="relative">
              <img src={img} alt={`preview-${index}`} className="h-20 w-20 object-cover" />
              <button
                type="button"
                onClick={() => {
                  setImageFiles(prev => prev.filter((_, i) => i !== index));
                  setImagePreviews(prev => prev.filter((_, i) => i !== index));
                }}
                className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-1"
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
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
                  id="fileInput"
                />
              </label>
              <p className="pl-1">or drag and drop</p>
            </div>
            <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB each</p>
          </div>
        </div>
      </div>

      {/* Explicit Update Claim / Save Changes Controls */}
      <div className="flex items-center justify-between border-t pt-4">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 shadow-xs"
        >
          Cancel
        </button>
        <div className="flex items-center space-x-3">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center space-x-2 px-5 py-2 text-sm font-semibold text-white bg-primary rounded-md shadow-xs hover:bg-primary-600 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
          >
            <Save className="w-4 h-4" />
            <span>{loading ? 'Saving...' : isEditing ? 'Update Claim' : 'Submit Claim'}</span>
          </button>
        </div>
      </div>
    </form>
  );
};

export default AccidentClaimForm;