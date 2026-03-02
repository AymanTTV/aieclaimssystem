import React, { useState, useEffect, useRef } from 'react';
import { addDoc, collection, updateDoc, doc, query, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../../lib/firebase';

import {
  Vehicle,
  Customer,
  Claim,
  RentalPayment,
  VehicleCondition,
  Rental,
  HireSubstitutionDetails
} from '../../types';
import { useAuth } from '../../context/AuthContext';
import { calculateRentalCost } from '../../utils/rentalCalculations';
import { generateRentalDocuments } from '../../utils/generateRentalDocuments';
import { uploadRentalDocuments } from '../../utils/uploadRentalDocuments';
import FormField from '../ui/FormField';
import SignaturePad from '../ui/SignaturePad';
import { addWeeks, format, differenceInDays, differenceInHours, isAfter, isValid } from 'date-fns';
import toast from 'react-hot-toast';
import { Search, Car, X, Plus, AlertTriangle, CheckCircle, Info, User } from 'lucide-react';
import { useAvailableVehicles } from '../../hooks/useAvailableVehicles';
import { createFinanceTransaction } from '../../utils/financeTransactions';
import { useFormattedDisplay } from '../../hooks/useFormattedDisplay';
import FileUpload from '../ui/FileUpload';
import TextArea from '../ui/TextArea';
import Modal from '../ui/Modal'; 

interface RentalFormProps {
  vehicles: Vehicle[];
  customers: Customer[];
  onClose: () => void;
}

// --- Empty state for a substitution vehicle ---
const newSubDetail = (): Omit<HireSubstitutionDetails, 'givenAt' | 'expectedReturnAt'> & {
  givenAt: string;
  expectedReturnAt: string;
} => ({
  make: '',
  model: '',
  registration: '',
  loaner: '',
  givenAt: '',
  expectedReturnAt: '',
  notes: ''
});

const RentalForm: React.FC<RentalFormProps> = ({ vehicles, customers, onClose }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const { formatCurrency } = useFormattedDisplay();
   
  // ✅ REF for scrolling to top
  const topRef = useRef<HTMLDivElement>(null);

  // Search States
  const [vehicleSearchQuery, setVehicleSearchQuery] = useState('');
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [showVehicleResults, setShowVehicleResults] = useState(false);
  const [showCustomerResults, setShowCustomerResults] = useState(false);
  const [images, setImages] = useState<File[]>([]);

  // Claim Search States
  const [showClaimResults, setShowClaimResults] = useState(false);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [claimSearchQuery, setClaimSearchQuery] = useState('');
  const [manualClaimRef, setManualClaimRef] = useState(false);

  // Modal State
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

  // --- Auto-Generated Agreement Number ---
  const [rentalAgreementNumber, setRentalAgreementNumber] = useState('');

  useEffect(() => {
    const fetchNextNumber = async () => {
      try {
        const q = query(collection(db, 'rentals'), orderBy('createdAt', 'desc'), limit(1));
        const snapshot = await getDocs(q);
        let nextNum = 1;

        if (!snapshot.empty) {
          const lastData = snapshot.docs[0].data();
          const lastNumStr = lastData.rentalAgreementNumber;
          // Check if the last number is numeric, then increment
          if (lastNumStr && !isNaN(parseInt(lastNumStr))) {
            nextNum = parseInt(lastNumStr) + 1;
          }
        }
        // Pad with leading zeros (e.g., 0001)
        setRentalAgreementNumber(String(nextNum).padStart(4, '0'));
      } catch (err) {
        console.error("Error fetching next agreement number:", err);
        // Fallback to timestamp if fetch fails
        setRentalAgreementNumber(String(Date.now()).slice(-4)); 
      }
    };
    fetchNextNumber();
  }, []);

  const [formData, setFormData] = useState({
    vehicleId: '',
    customerId: '',
    startDate: new Date().toISOString().split('T')[0],
    startTime: new Date().toTimeString().slice(0, 5),
    endDate: '',
    endTime: '',
    type: 'daily' as const,
    reason: 'hired' as const,
    status: 'scheduled' as const,
    numberOfWeeks: 1,
    signature: '',
    paidAmount: 0,
    paymentMethod: 'cash' as const,
    paymentReference: '',
    paymentNotes: '',
    negotiatedRate: '',
    negotiationNotes: '',
    discountPercentage: 0,
    discountNotes: '',
    storageStartDate: '',
    storageEndDate: '',
    storageCostPerDay: 0,
    storageDays: 0,
    includeStorageVAT: false,
    recoveryCost: 0,
    includeRecoveryCostVAT: false,
    deliveryCharge: 0,
    collectionCharge: 0,

    // Insurance (Daily/Claim uses per day, Weekly uses per week)
    insurancePerDay: 0,
    insurancePerWeek: 0,

    claimRef: '',
    includeVAT: false,
    deliveryChargeIncludeVAT: false,
    collectionChargeIncludeVAT: false,

    insurancePerDayIncludeVAT: false,
    insurancePerWeekIncludeVAT: false,

    hireSubstitutionDetails: [] as (Omit<HireSubstitutionDetails, 'givenAt' | 'expectedReturnAt'> & {
      givenAt: string;
      expectedReturnAt: string;
    })[]
  });

  // Track manual edits so auto-fill doesn't overwrite
  const [insurancePerDayTouched, setInsurancePerDayTouched] = useState(false);
  const [insurancePerWeekTouched, setInsurancePerWeekTouched] = useState(false);

  // Fetch claims when component mounts
  useEffect(() => {
    const fetchClaims = async () => {
      try {
        const claimsQuery = query(collection(db, 'claims'));
        const snapshot = await getDocs(claimsQuery);
        const claimsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Claim[];
        setClaims(claimsData);
      } catch (error) {
        console.error('Error fetching claims:', error);
        toast.error('Failed to fetch claims');
      }
    };
    fetchClaims();
  }, []);

  const filteredClaims = (claims || []).filter(claim => {
    if (!claimSearchQuery) return false;
    const searchLower = claimSearchQuery.toLowerCase();
    const clientNameLower = (claim.clientInfo?.name || '').toLowerCase();
    const clientRefLower = (claim.clientRef || '').toLowerCase();
    const claimIdLower = (claim.id || '').toLowerCase();
    return (
      clientNameLower.includes(searchLower) ||
      clientRefLower.includes(searchLower) ||
      claimIdLower.includes(searchLower)
    );
  });

  const [conditionData, setConditionData] = useState<Partial<VehicleCondition>>({
    mileage: 0,
    fuelLevel: '100',
    isClean: true,
    hasDamage: false,
    damageDescription: '',
    images: []
  });

  // Available vehicles from date range
  const { availableVehicles, loading: loadingVehicles } = useAvailableVehicles(
    vehicles,
    formData.startDate && formData.startTime ? new Date(`${formData.startDate}T${formData.startTime}`) : undefined,
    formData.endDate && formData.endTime ? new Date(`${formData.endDate}T${formData.endTime}`) : undefined
  );

  const filteredVehicles = availableVehicles.filter(vehicle => {
    const searchLower = vehicleSearchQuery.toLowerCase();
    return (
      vehicle.make.toLowerCase().includes(searchLower) ||
      vehicle.model.toLowerCase().includes(searchLower) ||
      vehicle.registrationNumber.toLowerCase().includes(searchLower)
    );
  });

  const filteredCustomers = customers.filter(customer => {
    const searchLower = customerSearchQuery.toLowerCase();
    return (
      customer.name.toLowerCase().includes(searchLower) ||
      customer.mobile.includes(searchLower) ||
      customer.email.toLowerCase().includes(searchLower)
    );
  });

  const selectedVehicle = vehicles.find(v => v.id === formData.vehicleId);
  const selectedCustomer = customers.find(c => c.id === formData.customerId);

  // ✅ Auto-fill insurance from Vehicle page (Daily/Weekly/Claim)
  useEffect(() => {
    if (!selectedVehicle) return;

    // Daily
    if (formData.type === 'daily' && !insurancePerDayTouched) {
      const vAmt =
        typeof (selectedVehicle as any).dailyInsuranceAmount === 'number'
          ? (selectedVehicle as any).dailyInsuranceAmount
          : 0;
      setFormData(prev => ({ ...prev, insurancePerDay: vAmt }));
    }

    // Claim (also per day)
    if (formData.type === 'claim' && !insurancePerDayTouched) {
      const vAmt =
        typeof (selectedVehicle as any).claimInsuranceAmount === 'number'
          ? (selectedVehicle as any).claimInsuranceAmount
          : 0;
      setFormData(prev => ({ ...prev, insurancePerDay: vAmt }));
    }

    // Weekly (per week)
    if (formData.type === 'weekly' && !insurancePerWeekTouched) {
      const vAmt =
        typeof (selectedVehicle as any).weeklyInsuranceAmount === 'number'
          ? (selectedVehicle as any).weeklyInsuranceAmount
          : 0;
      setFormData(prev => ({ ...prev, insurancePerWeek: vAmt }));
    }
  }, [selectedVehicle?.id, formData.type, insurancePerDayTouched, insurancePerWeekTouched]);

  // Reset touched flags when user changes rental type (so auto-fill works per type)
  useEffect(() => {
    setInsurancePerDayTouched(false);
    setInsurancePerWeekTouched(false);
  }, [formData.type]);

  const calculateTotalCost = () => {
    if (!selectedVehicle || !formData.startDate || !formData.endDate || !formData.startTime || !formData.endTime) {
      return 0;
    }
    const startDateTime = new Date(`${formData.startDate}T${formData.startTime}`);
    const endDateTime = new Date(`${formData.endDate}T${formData.endTime}`);

    if (!isValid(startDateTime) || !isValid(endDateTime) || isAfter(startDateTime, endDateTime)) {
      return 0;
    }

    const negotiatedRate = formData.negotiatedRate ? parseFloat(formData.negotiatedRate) : undefined;

    let calculatedStorageCost = 0;
    if (formData.type === 'claim' && formData.storageStartDate && formData.storageEndDate) {
      const storageStart = new Date(formData.storageStartDate);
      const storageEnd = new Date(formData.storageEndDate);
      if (isValid(storageStart) && isValid(storageEnd) && !isAfter(storageStart, storageEnd)) {
        const storageDays = differenceInDays(storageEnd, storageStart) + 1;
        const dailyCost = formData.storageCostPerDay || 0;
        calculatedStorageCost = storageDays * dailyCost * (formData.includeStorageVAT ? 1.2 : 1);
      }
    }

    const totalCost = calculateRentalCost(
      startDateTime,
      endDateTime,
      formData.type,
      selectedVehicle,
      formData.reason,
      negotiatedRate,

      // storage/recovery (claim only)
      formData.type === 'claim' ? calculatedStorageCost : undefined,
      formData.type === 'claim' ? formData.recoveryCost : undefined,

      // delivery/collection
      formData.deliveryCharge,
      formData.collectionCharge,

      // insurance day/week (Pass 0 if not relevant to type, for safety)
      formData.type !== 'weekly' ? formData.insurancePerDay : 0,
      formData.type === 'weekly' ? formData.insurancePerWeek : 0,

      // VAT flags
      formData.includeVAT,
      formData.deliveryChargeIncludeVAT,
      formData.collectionChargeIncludeVAT,
      formData.insurancePerDayIncludeVAT,
      formData.insurancePerWeekIncludeVAT,
      formData.includeRecoveryCostVAT
    );

    return totalCost;
  };

  const totalCost = calculateTotalCost();
  const discountAmount = (totalCost * (formData.discountPercentage || 0)) / 100;
  const finalCostAfterDiscount = totalCost - discountAmount;
  const finalRemainingAmount = finalCostAfterDiscount - (formData.paidAmount || 0);

  // --- Handlers for H Substitute array ---
  const handleSubChange = (index: number, e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    const newSubs = [...formData.hireSubstitutionDetails];
    newSubs[index] = { ...newSubs[index], [name]: value };
    setFormData(prev => ({
      ...prev,
      hireSubstitutionDetails: newSubs
    }));
  };

  const addSubstitutionVehicle = () => {
    setFormData(prev => ({
      ...prev,
      hireSubstitutionDetails: [...prev.hireSubstitutionDetails, newSubDetail()]
    }));
  };

  const removeSubstitutionVehicle = (index: number) => {
    setFormData(prev => ({
      ...prev,
      hireSubstitutionDetails: prev.hireSubstitutionDetails.filter((_, i) => i !== index)
    }));
  };

  // --- VALIDATION BEFORE CONFIRMATION ---
  const handleInitialSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error('You must be logged in.');
      return;
    }
    if (!selectedVehicle) {
      toast.error('Please select a vehicle.');
      return;
    }
    if (!selectedCustomer) {
      toast.error('Please select a customer.');
      return;
    }
    if (!formData.startDate || !formData.startTime || !formData.endDate || !formData.endTime) {
      toast.error('Date and time fields are required.');
      return;
    }
    const startDateTime = new Date(`${formData.startDate}T${formData.startTime}`);
    const endDateTime = new Date(`${formData.endDate}T${formData.endTime}`);
    if (!isValid(startDateTime) || !isValid(endDateTime)) {
      toast.error('Invalid dates.');
      return;
    }
    if (isAfter(startDateTime, endDateTime)) {
      toast.error('End Date cannot be before Start Date.');
      return;
    }

    // ✅ SCROLL TO TOP
    topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    
    // Fallback
    window.scrollTo(0, 0);

    // If valid, open confirmation modal
    setIsConfirmModalOpen(true);
  };

  // --- FINAL CREATION LOGIC ---
  const executeCreateRental = async () => {
    if (!user || !selectedVehicle || !selectedCustomer) return;
    setLoading(true);
    setIsConfirmModalOpen(false); // Close modal

    try {
      const startDateTime = new Date(`${formData.startDate}T${formData.startTime}`);
      const endDateTime = new Date(`${formData.endDate}T${formData.endTime}`);

      let calculatedStorageCost = 0,
        storageDays = 0;
      let storageStartDateObj: Date | undefined,
        storageEndDateObj: Date | undefined;

      if (formData.type === 'claim' && formData.storageStartDate && formData.storageEndDate) {
        storageStartDateObj = new Date(formData.storageStartDate);
        storageEndDateObj = new Date(formData.storageEndDate);

        if (isValid(storageStartDateObj) && isValid(storageEndDateObj) && !isAfter(storageStartDateObj, storageEndDateObj)) {
          storageDays = differenceInDays(storageEndDateObj, storageStartDateObj) + 1;
          const dailyCost = formData.storageCostPerDay || 0;
          calculatedStorageCost = storageDays * dailyCost * (formData.includeStorageVAT ? 1.2 : 1);
        } else {
          storageStartDateObj = undefined;
          storageEndDateObj = undefined;
          calculatedStorageCost = 0;
          storageDays = 0;
        }
      }

      // Standard cost: usually implies No VAT
      const standardCost = calculateRentalCost(
        startDateTime,
        endDateTime,
        formData.type,
        selectedVehicle,
        formData.reason,
        undefined,
        formData.type === 'claim' ? calculatedStorageCost : undefined,
        formData.type === 'claim' ? formData.recoveryCost || 0 : undefined,
        formData.type === 'claim' ? formData.deliveryCharge || 0 : undefined,
        formData.type === 'claim' ? formData.collectionCharge || 0 : undefined,
        
        // Pass specific insurance depending on type, nullify the other
        formData.type !== 'weekly' ? formData.insurancePerDay || 0 : 0,
        formData.type === 'weekly' ? formData.insurancePerWeek || 0 : 0,
        
        false,
        formData.deliveryChargeIncludeVAT,
        formData.collectionChargeIncludeVAT,
        formData.insurancePerDayIncludeVAT,
        formData.insurancePerWeekIncludeVAT,
        formData.includeRecoveryCostVAT
      );

      // Total Cost
      const totalCostBeforeDiscount = calculateRentalCost(
        startDateTime,
        endDateTime,
        formData.type,
        selectedVehicle,
        formData.reason,
        formData.negotiatedRate ? parseFloat(formData.negotiatedRate) : undefined,
        formData.type === 'claim' ? calculatedStorageCost : undefined,
        formData.type === 'claim' ? formData.recoveryCost || 0 : undefined,
        formData.deliveryCharge || 0,
        formData.collectionCharge || 0,
        
        // Pass specific insurance depending on type
        formData.type !== 'weekly' ? formData.insurancePerDay || 0 : 0,
        formData.type === 'weekly' ? formData.insurancePerWeek || 0 : 0,
        
        formData.includeVAT,
        formData.deliveryChargeIncludeVAT,
        formData.collectionChargeIncludeVAT,
        formData.insurancePerDayIncludeVAT,
        formData.insurancePerWeekIncludeVAT,
        formData.includeRecoveryCostVAT
      );

      const discountAmountToSave = (totalCostBeforeDiscount * (formData.discountPercentage || 0)) / 100;
      const finalCostToSave = totalCostBeforeDiscount - discountAmountToSave;
      const finalRemainingAmountCalc = finalCostToSave - (formData.paidAmount || 0);

      const payments: RentalPayment[] = [];
      if (formData.paidAmount > 0) {
        payments.push({
          id: `payment_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          date: new Date(),
          amount: formData.paidAmount,
          method: formData.paymentMethod,
          ...(formData.paymentReference && { reference: formData.paymentReference }),
          ...(formData.paymentNotes && { notes: formData.paymentNotes }),
          createdAt: new Date(),
          createdBy: (user as any).id
        });
      }

      const submitHireSubstitutionDetails =
        formData.reason === 'h-substitute' && formData.hireSubstitutionDetails.length > 0
          ? formData.hireSubstitutionDetails
              .filter(sub => sub.make || sub.loaner)
              .map(sub => ({
                ...sub,
                givenAt: new Date(sub.givenAt || Date.now()),
                expectedReturnAt: new Date(sub.expectedReturnAt || Date.now())
              }))
          : null;

      const rentalData: Omit<Rental, 'id' | 'checkOutCondition' | 'checkInCondition' | 'returnCondition'> = {
        rentalAgreementNumber, // ✅ Saved to Firestore
        vehicleId: formData.vehicleId,
        customerId: formData.customerId,
        startDate: startDateTime,
        endDate: endDateTime,
        type: formData.type,
        reason: formData.reason,
        status: formData.status,
        cost: finalCostToSave,
        standardCost: standardCost,
        paidAmount: formData.paidAmount || 0,
        remainingAmount: finalRemainingAmountCalc,
        paymentStatus:
          finalRemainingAmountCalc <= 0.001
            ? 'paid'
            : (formData.paidAmount || 0) > 0
            ? 'partially_paid'
            : 'pending',
        payments,
        signature: formData.signature || null,
        ...(formData.claimRef && { claimRef: formData.claimRef }),

        ...(formData.type === 'claim' &&
          calculatedStorageCost > 0 &&
          storageStartDateObj &&
          storageEndDateObj && {
            storageStartDate: storageStartDateObj,
            storageEndDate: storageEndDateObj,
            storageCostPerDay: formData.storageCostPerDay || 0,
            storageDays,
            includeStorageVAT: formData.includeStorageVAT,
            storageCost: calculatedStorageCost
          }),

        ...(formData.type === 'claim' &&
          formData.recoveryCost > 0 && {
            recoveryCost: formData.recoveryCost,
            includeRecoveryCostVAT: formData.includeRecoveryCostVAT
          }),

        ...(formData.deliveryCharge > 0 && {
          deliveryCharge: formData.deliveryCharge * (formData.deliveryChargeIncludeVAT ? 1.2 : 1)
        }),
        ...(formData.collectionCharge > 0 && {
          collectionCharge: formData.collectionCharge * (formData.collectionChargeIncludeVAT ? 1.2 : 1)
        }),

        // ✅ FIXED: Only save insurance relevant to type
        insurancePerDay: formData.type !== 'weekly' && formData.insurancePerDay > 0 ? formData.insurancePerDay : null,
        insurancePerWeek: formData.type === 'weekly' && formData.insurancePerWeek > 0 ? formData.insurancePerWeek : null,

        includeVAT: formData.includeVAT,
        deliveryChargeIncludeVAT: formData.deliveryChargeIncludeVAT,
        collectionChargeIncludeVAT: formData.collectionChargeIncludeVAT,
        
        // ✅ FIXED: Only save VAT flag relevant to type
        insurancePerDayIncludeVAT: formData.type !== 'weekly' ? formData.insurancePerDayIncludeVAT : false,
        insurancePerWeekIncludeVAT: formData.type === 'weekly' ? formData.insurancePerWeekIncludeVAT : false,

        ...(formData.negotiatedRate
          ? { negotiatedRate: parseFloat(formData.negotiatedRate), negotiationNotes: formData.negotiationNotes || null }
          : { negotiatedRate: null, negotiationNotes: null }),

        ...(formData.discountPercentage > 0
          ? {
              discountPercentage: formData.discountPercentage,
              discountAmount: discountAmountToSave,
              discountNotes: formData.discountNotes || null
            }
          : { discountPercentage: null, discountAmount: null, discountNotes: null }),

        hireSubstitutionDetails: submitHireSubstitutionDetails,

        ...(formData.type === 'weekly' && { numberOfWeeks: formData.numberOfWeeks || 1 }),

        originalStartDate: startDateTime,
        createdAt: new Date(),
        createdBy: (user as any).id,
        updatedAt: new Date(),
        updatedBy: (user as any).id,
        ongoingCharges: 0,
        documents: {},
        extensionHistory: [],
        paymentMethod: formData.paymentMethod,
        paymentReference: formData.paymentReference?.trim() || null
      } as Rental;

      const docRef = await addDoc(collection(db, 'rentals'), rentalData);

      let conditionImageUrls: string[] = [];
      if (images.length > 0) {
        const uploadPromises = images.map(async file => {
          const ts = Date.now();
          const storageRef = ref(storage, `vehicle-conditions/${docRef.id}/${ts}_${file.name}`);
          const snap = await uploadBytes(storageRef, file);
          return getDownloadURL(snap.ref);
        });
        try {
          conditionImageUrls = await Promise.all(uploadPromises);
        } catch (imgErr) {
          console.error('Failed to upload condition images:', imgErr);
          toast.error('Rental created, but failed to upload condition images.');
        }
      }

      const checkOutCondition: VehicleCondition = {
        id: `cond_${Date.now()}`,
        type: 'check-out',
        date: startDateTime,
        mileage: Number(conditionData.mileage) || 0,
        fuelLevel: (conditionData.fuelLevel as VehicleCondition['fuelLevel']) || '100',
        isClean: conditionData.isClean ?? true,
        hasDamage: !!conditionData.hasDamage,
        damageDescription: conditionData.hasDamage ? conditionData.damageDescription || '' : '',
        images: conditionImageUrls,
        createdAt: new Date(),
        createdBy: (user as any).id
      };
      await updateDoc(doc(db, 'rentals', docRef.id), { checkOutCondition });

      setLoading(false);
      onClose();
      toast.success('Rental created! Generating documents in background…');

      setTimeout(async () => {
        try {
          const fullRental = { id: docRef.id, ...rentalData } as Rental;
          const documents = await generateRentalDocuments(fullRental, selectedVehicle!, selectedCustomer!);
          const agreementTimestamp = fullRental.originalStartDate
            ? new Date(fullRental.originalStartDate).getTime()
            : new Date(fullRental.startDate).getTime();
          const agreementKey = `agreement_${agreementTimestamp}`;
          const agreementsMap = { [agreementKey]: documents.agreement };
          await uploadRentalDocuments(docRef.id, {
            agreements: agreementsMap,
            invoice: documents.invoice,
            permit: documents.permit,
            claimDocuments: documents.claimDocuments
          });
          toast.success('Agreement & Invoice uploaded!');
        } catch (err) {
          console.error('Background PDF gen/upload failed:', err);
          toast.error('Created rental, but failed to generate documents.');
        }
      }, 0);

      const initialPaymentStatus: 'paid' | 'partially_paid' | 'unpaid' =
        finalRemainingAmountCalc <= 0.001
          ? 'paid'
          : (formData.paidAmount || 0) > 0
          ? 'partially_paid'
          : 'unpaid';

      if (formData.paidAmount > 0) {
        setTimeout(async () => {
          try {
            const vehicleOwner = selectedVehicle?.owner
              ? { name: selectedVehicle.owner.name, isDefault: selectedVehicle.owner.isDefault ?? false }
              : undefined;

            await createFinanceTransaction({
              type: 'income',
              category: 'Rental',
              amount: formData.paidAmount,
              description: `A ${formData.type} Rental payment from customer (${selectedCustomer?.name || 'N/A'})${
                formData.paymentNotes ? ` – ${formData.paymentNotes}` : ''
              }`,
              referenceId: docRef.id,
              paymentMethod: formData.paymentMethod,
              paymentReference: formData.paymentReference,
              status: 'completed',
              paymentStatus: initialPaymentStatus,
              date: new Date(),
              vehicleId: formData.vehicleId,
              vehicleName: `${selectedVehicle!.make} ${selectedVehicle!.model} (${selectedVehicle!.registrationNumber})`,
              vehicleOwner,
              customerId: formData.customerId,
              customerName: selectedCustomer?.name,
              // ✅ NEW: Credit vehicle finance account if set
              accountTo: selectedVehicle?.owner?.accountId || undefined
            });
          } catch {
            toast.error('Rental created, but failed to record finance transaction.');
          }
        }, 0);
      }
    } catch (error: any) {
      console.error('Error creating rental:', error);
      toast.error(`Failed to create rental: ${error.message || String(error)}`);
      setLoading(false);
    }
  };

  // Weekly auto-calc end date
  useEffect(() => {
    if (formData.type === 'weekly' && formData.startDate && formData.startTime) {
      const startDateTime = new Date(`${formData.startDate}T${formData.startTime}`);
      if (isValid(startDateTime)) {
        const endDateTime = addWeeks(startDateTime, formData.numberOfWeeks);
        setFormData(prev => ({
          ...prev,
          endDate: endDateTime.toISOString().split('T')[0],
          endTime: formData.startTime
        }));
      }
    }
  }, [formData.type, formData.numberOfWeeks, formData.startDate, formData.startTime]);

  // Recalculate storage days
  useEffect(() => {
    if (formData.storageStartDate && formData.storageEndDate) {
      const startDate = new Date(formData.storageStartDate);
      const endDate = new Date(formData.storageEndDate);
      if (isValid(startDate) && isValid(endDate) && !isAfter(startDate, endDate)) {
        const days = differenceInDays(endDate, startDate) + 1;
        setFormData(prev => ({ ...prev, storageDays: days }));
      } else {
        setFormData(prev => ({ ...prev, storageDays: 0 }));
      }
    }
  }, [formData.storageStartDate, formData.storageEndDate]);

  return (
    <>
      <div ref={topRef} /> {/* ✅ Anchor at the very top of the modal content */}
      <form onSubmit={handleInitialSubmit} className="space-y-6">
        {/* Vehicle Search */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Vehicle</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              value={vehicleSearchQuery}
              onChange={e => {
                setVehicleSearchQuery(e.target.value);
                setShowVehicleResults(true);
              }}
              onFocus={() => setShowVehicleResults(true)}
              onBlur={() => setTimeout(() => setShowVehicleResults(false), 200)}
              placeholder="Search vehicles..."
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
            />
          </div>
          {showVehicleResults && (
            <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base overflow-auto focus:outline-none sm:text-sm">
              {loadingVehicles ? (
                <div className="px-4 py-2 text-sm text-gray-500">Loading vehicles...</div>
              ) : filteredVehicles.length > 0 ? (
                filteredVehicles.map(vehicle => (
                  <div
                    key={vehicle.id}
                    className="cursor-pointer hover:bg-gray-100 px-4 py-2"
                    onMouseDown={() => {
                      setFormData(prev => ({ ...prev, vehicleId: vehicle.id }));
                      setVehicleSearchQuery(`${vehicle.make} ${vehicle.model} - ${vehicle.registrationNumber}`);
                      setShowVehicleResults(false);
                      setConditionData(prev => ({ ...prev, mileage: vehicle.mileage || 0 }));
                    }}
                  >
                    <div className="flex items-center">
  <Car className="h-5 w-5 text-gray-400 mr-2" />
  <div className="flex-1">
    <div className="font-medium">
      {vehicle.make} {vehicle.model}
    </div>
    <div className="text-sm text-gray-500">
      {vehicle.registrationNumber}
    </div>
    {/* ✅ NEW: Show Substitution details in dropdown */}
    {vehicle.isSubstitution && (
      <div className="mt-1 text-[10px] font-bold text-orange-700 bg-orange-50 border border-orange-200 px-1.5 py-0.5 rounded inline-block">
        {vehicle.message}
      </div>
    )}
  </div>
</div>
                  </div>
                ))
              ) : (
                <div className="px-4 py-2 text-sm text-gray-500">No available vehicles found</div>
              )}
            </div>
          )}
        </div>

        {/* Customer Search */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Customer</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              value={customerSearchQuery}
              onChange={e => {
                setCustomerSearchQuery(e.target.value);
                setShowCustomerResults(true);
              }}
              onFocus={() => setShowCustomerResults(true)}
              onBlur={() => setTimeout(() => setShowCustomerResults(false), 200)}
              placeholder="Search customers..."
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
            />
          </div>
          {showCustomerResults && (
            <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base overflow-auto focus:outline-none sm:text-sm">
              {filteredCustomers.length > 0 ? (
                filteredCustomers.map(customer => (
                  <div
                    key={customer.id}
                    className="cursor-pointer hover:bg-gray-100 px-4 py-2"
                    onMouseDown={() => {
                      setFormData(prev => ({ ...prev, customerId: customer.id, signature: customer.signature || '' }));
                      setCustomerSearchQuery(customer.name);
                      setShowCustomerResults(false);
                    }}
                  >
                    <div className="font-medium">{customer.name}</div>
                    <div className="text-sm text-gray-500 truncate">{customer.email}</div>
                    <div className="text-xs text-gray-400">{customer.mobile}</div>
                  </div>
                ))
              ) : (
                <div className="px-4 py-2 text-sm text-gray-500">No customers found</div>
              )}
            </div>
          )}
          {selectedCustomer && !showCustomerResults && (
            <div className="mt-2 p-4 bg-gray-50 rounded-lg">
              <h4 className="text-sm font-medium text-gray-900">Selected Customer</h4>
              <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Name:</span>
                  <span className="ml-2">{selectedCustomer.name}</span>
                </div>
                <div>
                  <span className="text-gray-500">Mobile:</span>
                  <span className="ml-2">{selectedCustomer.mobile}</span>
                </div>
                <div>
                  <span className="text-gray-500">Email:</span>
                  <span className="ml-2">{selectedCustomer.email}</span>
                </div>
                {selectedCustomer.licenseExpiry && (
                  <div>
                    <span className="text-gray-500">License Expiry:</span>
                    <span className="ml-2">{format(new Date(selectedCustomer.licenseExpiry), 'dd/MM/yyyy')}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Rental Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50 p-6 rounded-lg border border-gray-200">
          <div>
            <label className="block text-sm font-medium text-gray-700">Rental Type</label>
            <select
              value={formData.type}
              onChange={e => setFormData({ ...formData, type: e.target.value as any })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
              required
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="claim">Claim</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Status</label>
            <select
              value={formData.status}
              onChange={e => setFormData({ ...formData, status: e.target.value as any })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
              required
            >
              <option value="scheduled">Scheduled</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <p className="text-xs text-gray-500 mt-1 italic">Please select the status you want for the rental.</p>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700">Reason</label>
            <select
              value={formData.reason}
              onChange={e => setFormData({ ...formData, reason: e.target.value as any })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
              required
            >
              <option value="hired">Hire</option>
              <option value="claim">Claim</option>
              <option value="o/d">O/D</option>
              <option value="staff">Staff</option>
              <option value="workshop">Workshop</option>
            </select>
            <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" /> C Substitute and H Substitute cannot be selected on creation.
            </p>
          </div>

          {/* Claim Reference Logic */}
          {formData.type === 'claim' && (
            <div className="md:col-span-2 space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-700">Claim Reference</label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={manualClaimRef}
                    onChange={e => setManualClaimRef(e.target.checked)}
                    className="rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <span className="text-sm text-gray-700">Enter Manually</span>
                </label>
              </div>
              {manualClaimRef ? (
                <FormField
                  label="Claim Reference"
                  value={formData.claimRef}
                  onChange={e => setFormData({ ...formData, claimRef: e.target.value })}
                  placeholder="Enter claim reference"
                />
              ) : (
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    value={claimSearchQuery}
                    onChange={e => {
                      setClaimSearchQuery(e.target.value);
                      setShowClaimResults(true);
                    }}
                    onFocus={() => setShowClaimResults(true)}
                    onBlur={() => setTimeout(() => setShowClaimResults(false), 200)}
                    placeholder="Search claims..."
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                  />
                  {showClaimResults && (
                    <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base overflow-auto focus:outline-none sm:text-sm">
                      {filteredClaims.length > 0 ? (
                        filteredClaims.map(claim => (
                          <div
                            key={claim.id}
                            className="cursor-pointer hover:bg-gray-100 px-4 py-2"
                            onMouseDown={() => {
                              setFormData(prev => ({ ...prev, claimRef: claim.clientRef || claim.id }));
                              setClaimSearchQuery(claim.clientRef || claim.id);
                              setShowClaimResults(false);
                            }}
                          >
                            <div className="font-medium">{claim.clientRef || `Claim #${claim.id}`}</div>
                            <div className="text-sm text-gray-500">{claim.clientInfo?.name}</div>
                          </div>
                        ))
                      ) : (
                        <div className="px-4 py-2 text-sm text-gray-500">No claims found</div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="flex items-center space-x-2 md:col-span-2">
            <input
              type="checkbox"
              id="includeVAT"
              checked={formData.includeVAT}
              onChange={e => setFormData({ ...formData, includeVAT: e.target.checked })}
              className="rounded border-gray-300 text-primary focus:ring-primary"
            />
            <label htmlFor="includeVAT" className="text-sm font-medium text-gray-700">
              Include HIRE VAT (20%)
            </label>
          </div>

          <FormField
            type="date"
            label="Start Date"
            value={formData.startDate}
            onChange={e => setFormData({ ...formData, startDate: e.target.value })}
            required
          />
          <FormField
            type="time"
            label="Start Time"
            value={formData.startTime}
            onChange={e => setFormData({ ...formData, startTime: e.target.value })}
            required
          />

          {(formData.type === 'daily' || formData.type === 'claim') && (
            <>
              <FormField
                type="date"
                label="End Date"
                value={formData.endDate}
                onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                required
                min={formData.startDate}
              />
              <FormField
                type="time"
                label="End Time"
                value={formData.endTime}
                onChange={e => setFormData({ ...formData, endTime: e.target.value })}
                required
              />
            </>
          )}

          {formData.type === 'weekly' && (
            <>
              <FormField
                type="number"
                label="Number of Weeks"
                value={formData.numberOfWeeks}
                onChange={e => setFormData(p => ({ ...p, numberOfWeeks: parseInt(e.target.value) || 1 }))}
                min="1"
                required
              />
              <div className="md:col-span-2 grid grid-cols-2 gap-4 bg-white p-3 rounded border">
                <FormField
                  type="date"
                  label="End Date (Auto)"
                  value={formData.endDate}
                  onChange={e => setFormData(p => ({ ...p, endDate: e.target.value }))}
                  min={formData.startDate}
                />
                <FormField
                  type="time"
                  label="End Time"
                  value={formData.endTime}
                  onChange={e => setFormData(p => ({ ...p, endTime: e.target.value }))}
                />
              </div>
            </>
          )}

          {/* ✅ Daily Insurance (per day) */}
          {formData.type === 'daily' && (
            <div className="md:col-span-2 space-y-2 pt-2 border-t">
              {selectedVehicle && typeof (selectedVehicle as any).dailyInsuranceAmount === 'number' ? (
                <p className="text-xs font-semibold text-blue-700 flex items-center gap-1">
                  <Info className="h-3 w-3" /> Auto-filled from Vehicle (Daily Insurance). You can update if needed.
                </p>
              ) : (
                <p className="text-xs font-semibold text-red-600 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" /> Enter the vehicle insurance amount — it wasn’t provided in the Vehicle page.
                </p>
              )}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  type="number"
                  step="0.001"
                  label="Insurance / Day (£)"
                  value={formData.insurancePerDay}
                  onChange={e => {
                    setInsurancePerDayTouched(true);
                    setFormData(p => ({ ...p, insurancePerDay: parseFloat(e.target.value) || 0 }));
                  }}
                  min="0"
                />
                <div className="flex items-center pt-6">
                  <input
                    type="checkbox"
                    checked={formData.insurancePerDayIncludeVAT}
                    onChange={e => setFormData(p => ({ ...p, insurancePerDayIncludeVAT: e.target.checked }))}
                    className="mr-2 rounded border-gray-300 text-primary"
                  />
                  <label className="text-sm">Inc VAT</label>
                </div>
              </div>
            </div>
          )}

          {/* ✅ Weekly Insurance (per week) */}
          {formData.type === 'weekly' && (
            <div className="md:col-span-2 space-y-2 pt-2 border-t">
              {selectedVehicle && typeof (selectedVehicle as any).weeklyInsuranceAmount === 'number' ? (
                <p className="text-xs font-semibold text-blue-700 flex items-center gap-1">
                  <Info className="h-3 w-3" /> Auto-filled from Vehicle (Weekly Insurance). You can update if needed.
                </p>
              ) : (
                <p className="text-xs font-semibold text-red-600 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" /> Enter the vehicle insurance amount — it wasn’t provided in the Vehicle page.
                </p>
              )}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  type="number"
                  step="0.001"
                  label="Insurance / Week (£)"
                  value={formData.insurancePerWeek}
                  onChange={e => {
                    setInsurancePerWeekTouched(true);
                    setFormData(p => ({ ...p, insurancePerWeek: parseFloat(e.target.value) || 0 }));
                  }}
                  min="0"
                />
                <div className="flex items-center pt-6">
                  <input
                    type="checkbox"
                    checked={formData.insurancePerWeekIncludeVAT}
                    onChange={e => setFormData(p => ({ ...p, insurancePerWeekIncludeVAT: e.target.checked }))}
                    className="mr-2 rounded border-gray-300 text-primary"
                  />
                  <label className="text-sm">Inc VAT</label>
                </div>
              </div>
            </div>
          )}

          {/* Claim specific fields */}
          {formData.type === 'claim' && (
            <div className="md:col-span-2 space-y-4 pt-4 border-t">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  type="number"
                  label="Delivery Charge (£)"
                  value={formData.deliveryCharge}
                  onChange={e => setFormData(p => ({ ...p, deliveryCharge: parseFloat(e.target.value) || 0 }))}
                  step="0.001"
                />
                <div className="flex items-center pt-6">
                  <input
                    type="checkbox"
                    checked={formData.deliveryChargeIncludeVAT}
                    onChange={e => setFormData(p => ({ ...p, deliveryChargeIncludeVAT: e.target.checked }))}
                    className="mr-2 rounded border-gray-300 text-primary"
                  />
                  <label className="text-sm">Inc VAT</label>
                </div>

                <FormField
                  type="number"
                  label="Collection Charge (£)"
                  value={formData.collectionCharge}
                  onChange={e => setFormData(p => ({ ...p, collectionCharge: parseFloat(e.target.value) || 0 }))}
                  step="0.001"
                />
                <div className="flex items-center pt-6">
                  <input
                    type="checkbox"
                    checked={formData.collectionChargeIncludeVAT}
                    onChange={e => setFormData(p => ({ ...p, collectionChargeIncludeVAT: e.target.checked }))}
                    className="mr-2 rounded border-gray-300 text-primary"
                  />
                  <label className="text-sm">Inc VAT</label>
                </div>

                {/* ✅ Claim Insurance (auto-fill + message) */}
                <div className="md:col-span-2">
                  {selectedVehicle && typeof (selectedVehicle as any).claimInsuranceAmount === 'number' ? (
                    <p className="text-xs font-semibold text-blue-700 flex items-center gap-1 mb-2">
                      <Info className="h-3 w-3" /> Auto-filled from Vehicle (Claim Insurance). You can update if needed.
                    </p>
                  ) : (
                    <p className="text-xs font-semibold text-red-600 flex items-center gap-1 mb-2">
                      <AlertTriangle className="h-3 w-3" /> Enter the vehicle insurance amount — it wasn’t provided in the Vehicle page.
                    </p>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      type="number"
                      step="0.001"
                      label="Insurance / Day (£)"
                      value={formData.insurancePerDay}
                      onChange={e => {
                        setInsurancePerDayTouched(true);
                        setFormData(p => ({ ...p, insurancePerDay: parseFloat(e.target.value) || 0 }));
                      }}
                    />
                    <div className="flex items-center pt-6">
                      <input
                        type="checkbox"
                        checked={formData.insurancePerDayIncludeVAT}
                        onChange={e => setFormData(p => ({ ...p, insurancePerDayIncludeVAT: e.target.checked }))}
                        className="mr-2 rounded border-gray-300 text-primary"
                      />
                      <label className="text-sm">Inc VAT</label>
                    </div>
                  </div>
                </div>

                <h4 className="md:col-span-2 font-medium pt-2">Storage</h4>
                <FormField
                  type="date"
                  label="Storage Start"
                  value={formData.storageStartDate}
                  onChange={e => setFormData(p => ({ ...p, storageStartDate: e.target.value }))}
                />
                <FormField
                  type="date"
                  label="Storage End"
                  value={formData.storageEndDate}
                  onChange={e => setFormData(p => ({ ...p, storageEndDate: e.target.value }))}
                />
                <FormField
                  type="number"
                  step="0.001"
                  label="Storage Cost/Day (£)"
                  value={formData.storageCostPerDay}
                  onChange={e => setFormData(p => ({ ...p, storageCostPerDay: parseFloat(e.target.value) || 0 }))}
                />
                <div className="flex items-center pt-6">
                  <input
                    type="checkbox"
                    checked={formData.includeStorageVAT}
                    onChange={e => setFormData(p => ({ ...p, includeStorageVAT: e.target.checked }))}
                    className="mr-2 rounded border-gray-300 text-primary"
                  />
                  <label className="text-sm">Inc VAT</label>
                </div>

                <h4 className="md:col-span-2 font-medium pt-2">Recovery</h4>
                <FormField
                  type="number"
                  step="0.001"
                  label="Recovery Cost (£)"
                  value={formData.recoveryCost}
                  onChange={e => setFormData(p => ({ ...p, recoveryCost: parseFloat(e.target.value) || 0 }))}
                />
                <div className="flex items-center pt-6">
                  <input
                    type="checkbox"
                    checked={formData.includeRecoveryCostVAT}
                    onChange={e => setFormData(p => ({ ...p, includeRecoveryCostVAT: e.target.checked }))}
                    className="mr-2 rounded border-gray-300 text-primary"
                  />
                  <label className="text-sm">Inc VAT</label>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Hire Substitution Details */}
        {formData.reason === 'h-substitute' && (
          <div className="border-t pt-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Hire Substitution Details (Optional)</h3>
            {formData.hireSubstitutionDetails.map((sub, index) => (
              <div key={index} className="grid grid-cols-2 gap-4 border p-4 rounded-lg mb-4 relative">
                <div className="col-span-2 flex justify-between items-center">
                  <h4 className="font-medium text-gray-800">Substitution Vehicle {index + 1}</h4>
                  <button
                    type="button"
                    onClick={() => removeSubstitutionVehicle(index)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <FormField label="Vehicle Make" name="make" value={sub.make} onChange={e => handleSubChange(index, e)} />
                <FormField label="Vehicle Model" name="model" value={sub.model} onChange={e => handleSubChange(index, e)} />
                <FormField
                  label="Vehicle Registration"
                  name="registration"
                  value={sub.registration}
                  onChange={e => handleSubChange(index, e)}
                />
                <FormField label="Loaner (Provider)" name="loaner" value={sub.loaner} onChange={e => handleSubChange(index, e)} />
                <FormField
                  label="Date & Time Given"
                  type="datetime-local"
                  name="givenAt"
                  value={sub.givenAt}
                  onChange={e => handleSubChange(index, e)}
                />
                <FormField
                  label="Date & Time Expected Return"
                  type="datetime-local"
                  name="expectedReturnAt"
                  value={sub.expectedReturnAt}
                  onChange={e => handleSubChange(index, e)}
                />
                <div className="col-span-2">
                  <TextArea label="Notes (Reason)" name="notes" value={sub.notes} onChange={e => handleSubChange(index, e)} rows={3} />
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={addSubstitutionVehicle}
              className="mt-2 flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <Plus className="h-5 w-5 mr-2" /> Add Another Substitution Vehicle
            </button>
          </div>
        )}

        {/* Negotiation & Discount */}
        <div className="grid grid-cols-2 gap-6 pt-4 border-t">
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Rate Negotiation</h3>
            <FormField
              type="number"
              label="Negotiated Rate (Optional)"
              value={formData.negotiatedRate}
              onChange={e => setFormData({ ...formData, negotiatedRate: e.target.value })}
              min="0"
              step="0.01"
              placeholder={`Enter custom rate`}
            />
            {formData.negotiatedRate && (
              <textarea
                value={formData.negotiationNotes}
                onChange={e => setFormData({ ...formData, negotiationNotes: e.target.value })}
                rows={2}
                className="mt-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                placeholder="Add notes about rate negotiation..."
              />
            )}
          </div>
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Discount</h3>
            <FormField
              type="number"
              label="Discount Percentage"
              value={formData.discountPercentage}
              onChange={e => setFormData({ ...formData, discountPercentage: parseFloat(e.target.value) || 0 })}
              min="0"
              max="100"
              step="0.1"
            />
            {formData.discountPercentage > 0 && (
              <textarea
                value={formData.discountNotes}
                onChange={e => setFormData({ ...formData, discountNotes: e.target.value })}
                rows={2}
                className="mt-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                placeholder="Add notes about the discount..."
                required
              />
            )}
          </div>
        </div>

        {/* Cost Summary */}
        <div className="border-t pt-4">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Cost Summary</h3>

          {(() => {
            // --- Helpers for breakdown (matches RentalDetails idea) ---
            if (!selectedVehicle || !formData.startDate || !formData.startTime) {
              return (
                <div className="bg-gray-50 p-4 rounded-lg text-sm text-gray-600">
                  Select a vehicle and dates to see the cost breakdown.
                </div>
              );
            }

            const startDateTime = new Date(`${formData.startDate}T${formData.startTime}`);
            const endDateTime =
              formData.endDate && formData.endTime ? new Date(`${formData.endDate}T${formData.endTime}`) : null;

            const negotiatedRate = formData.negotiatedRate ? parseFloat(formData.negotiatedRate) : undefined;

            // Days (inclusive) for daily/claim insurance calc
            let insuranceDays = 0;
            if (endDateTime && isValid(startDateTime) && isValid(endDateTime) && !isAfter(startDateTime, endDateTime)) {
               const hours = differenceInHours(endDateTime, startDateTime);
               // If 0 or negative hours, charge 1 day minimum. Otherwise round up every 24h chunk.
               // e.g. 24h = 1 day, 25h = 2 days.
               insuranceDays = hours <= 0 ? 1 : Math.ceil(hours / 24);
            }

            // Weeks for weekly insurance calc
            const weeks = formData.type === 'weekly' ? Number(formData.numberOfWeeks || 1) : 0;

            // 1) Base cost: ONLY the hire cost (no extras, no VAT toggles)
            const baseCost =
              endDateTime && isValid(startDateTime) && isValid(endDateTime) && !isAfter(startDateTime, endDateTime)
                ? calculateRentalCost(
                    startDateTime,
                    endDateTime,
                    formData.type,
                    selectedVehicle,
                    formData.reason,
                    negotiatedRate,

                    // extras off
                    0, // storage
                    0, // recovery
                    0, // delivery
                    0, // collection
                    0, // insurancePerDay
                    0, // insurancePerWeek

                    // VAT flags OFF for base display
                    false,
                    false,
                    false,
                    false,
                    false,
                    false
                  )
                : 0;

            // 2) Extras (each includes its OWN VAT toggle if checked)
            // Claim storage (already calculated as inc VAT if includeStorageVAT)
            let displayStorageCost = 0;
            if (formData.type === 'claim' && formData.storageStartDate && formData.storageEndDate) {
              const s = new Date(formData.storageStartDate);
              const e = new Date(formData.storageEndDate);
              if (isValid(s) && isValid(e) && !isAfter(s, e)) {
                const storageDays = differenceInDays(e, s) + 1;
                displayStorageCost = storageDays * (formData.storageCostPerDay || 0) * (formData.includeStorageVAT ? 1.2 : 1);
              }
            }

            const displayRecoveryCost = (formData.recoveryCost || 0) * (formData.includeRecoveryCostVAT ? 1.2 : 1);
            const displayDeliveryCharge = (formData.deliveryCharge || 0) * (formData.deliveryChargeIncludeVAT ? 1.2 : 1);
            const displayCollectionCharge = (formData.collectionCharge || 0) * (formData.collectionChargeIncludeVAT ? 1.2 : 1);

            const displayInsuranceCost =
              formData.type === 'weekly'
                ? (formData.insurancePerWeek || 0) * weeks * (formData.insurancePerWeekIncludeVAT ? 1.2 : 1)
                : insuranceDays * (formData.insurancePerDay || 0) * (formData.insurancePerDayIncludeVAT ? 1.2 : 1);

            // --- CORRECTED VAT LOGIC ---
            
            // 1. Calculate sum of extras (already VAT inclusive where applicable)
            const totalExtras = 
                (formData.type === 'claim' ? displayStorageCost + displayRecoveryCost + displayDeliveryCharge + displayCollectionCharge : 0) + 
                displayInsuranceCost;

            // 2. Calculate Hire VAT (applies ONLY to Base Cost)
            const hireVatAmount = formData.includeVAT ? baseCost * 0.2 : 0;

            // 3. Gross Subtotal = Base + HireVAT + Extras
            const subtotalWithOverallVAT = baseCost + hireVatAmount + totalExtras;

            // 4. Discount
            const discountAmountLocal = (subtotalWithOverallVAT * (formData.discountPercentage || 0)) / 100;

            // 5. Final
            const totalDue = subtotalWithOverallVAT - discountAmountLocal;
            const paid = formData.paidAmount || 0;
            const remaining = totalDue - paid;

            return (
              <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Base Rental Cost:</span>
                  <span className="font-medium">{formatCurrency(baseCost)}</span>
                </div>

                {formData.includeVAT && (
                    <div className="flex justify-between text-sm text-blue-600">
                    <span>Hire VAT (20%):</span>
                    <span className="font-medium">{formatCurrency(hireVatAmount)}</span>
                    </div>
                )}

                {/* Separator if extras exist */}
                {totalExtras > 0 && <div className="border-t border-gray-200 my-1"></div>}

                {/* Claim extras breakdown */}
                {formData.type === 'claim' && (
                  <>
                    <div className="flex justify-between text-sm">
                      <span>Storage Cost{formData.includeStorageVAT ? ' (Inc. VAT)' : ''}:</span>
                      <span className="font-medium">{formatCurrency(displayStorageCost)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Recovery Cost{formData.includeRecoveryCostVAT ? ' (Inc. VAT)' : ''}:</span>
                      <span className="font-medium">{formatCurrency(displayRecoveryCost)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Delivery Charge{formData.deliveryChargeIncludeVAT ? ' (Inc. VAT)' : ''}:</span>
                      <span className="font-medium">{formatCurrency(displayDeliveryCharge)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Collection Charge{formData.collectionChargeIncludeVAT ? ' (Inc. VAT)' : ''}:</span>
                      <span className="font-medium">{formatCurrency(displayCollectionCharge)}</span>
                    </div>
                  </>
                )}

                {/* Insurance breakdown */}
                {displayInsuranceCost > 0 && (
                    <div className="flex justify-between text-sm">
                    <span>
                        Insurance{' '}
                        {formData.type === 'weekly'
                        ? `(${weeks} week${weeks === 1 ? '' : 's'})`
                        : `(${insuranceDays} day${insuranceDays === 1 ? '' : 's'})`}
                        {formData.type === 'weekly'
                        ? formData.insurancePerWeekIncludeVAT
                            ? ' (Inc. VAT)'
                            : ''
                        : formData.insurancePerDayIncludeVAT
                        ? ' (Inc. VAT)'
                        : ''}
                        :
                    </span>
                    <span className="font-medium">{formatCurrency(displayInsuranceCost)}</span>
                    </div>
                )}

                <div className="flex justify-between text-sm pt-2 border-t">
                  <span>Subtotal (Gross):</span>
                  <span className="font-medium">{formatCurrency(subtotalWithOverallVAT)}</span>
                </div>

                {(formData.discountPercentage || 0) > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Discount ({formData.discountPercentage}%):</span>
                    <span>-{formatCurrency(discountAmountLocal)}</span>
                  </div>
                )}

                {formData.discountNotes && (formData.discountPercentage || 0) > 0 && (
                  <div className="text-sm italic text-gray-700 mt-1">{formData.discountNotes}</div>
                )}

                <div className="flex justify-between text-lg font-semibold pt-2 border-t mt-2">
                  <span>Total Amount Due:</span>
                  <span className="font-medium">{formatCurrency(totalDue)}</span>
                </div>

                <div className="flex justify-between text-sm text-green-600">
                  <span>Amount Paid:</span>
                  <span>{formatCurrency(paid)}</span>
                </div>

                <div className="flex justify-between text-sm font-medium text-red-600">
                  <span>Remaining Amount:</span>
                  <span>{formatCurrency(remaining)}</span>
                </div>
              </div>
            );
          })()}
        </div>


        {/* Vehicle Condition */}
        {selectedVehicle && (
          <div className="border-t pt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
              <Car className="w-5 h-5 text-gray-500" /> Vehicle Condition Check
            </h3>
            <div className="space-y-6 bg-white p-4 rounded-lg border border-gray-200">
              <div className="p-4 bg-blue-50 border-l-4 border-blue-500 rounded">
                <label className="block text-sm font-bold text-gray-800 mb-1">Current Mileage</label>
                <input
                  type="number"
                  value={conditionData.mileage}
                  onChange={e => setConditionData({ ...conditionData, mileage: parseInt(e.target.value) || 0 })}
                  min={selectedVehicle.mileage}
                  className="block w-full border-2 border-blue-300 rounded-md py-2 px-3 focus:border-blue-500 focus:ring-blue-500 font-mono text-lg"
                  required
                />
                <p className="text-xs font-semibold text-blue-700 mt-1 flex items-center gap-1">
                  <Info className="w-3 h-3" /> Please update to the latest vehicle mileage
                </p>
              </div>

              <div className="p-4 bg-orange-50 border-l-4 border-orange-500 rounded">
                <label className="block text-sm font-bold text-gray-800 mb-1">Fuel Level</label>
                <select
                  value={conditionData.fuelLevel}
                  onChange={e => setConditionData({ ...conditionData, fuelLevel: e.target.value as any })}
                  className="block w-full border-2 border-orange-300 rounded-md py-2 px-3 focus:border-orange-500 focus:ring-orange-500"
                  required
                >
                  <option value="0">Empty (0%)</option>
                  <option value="25">Quarter (25%)</option>
                  <option value="50">Half (50%)</option>
                  <option value="75">Three Quarters (75%)</option>
                  <option value="100">Full (100%)</option>
                </select>
                <p className="text-xs font-semibold text-orange-700 mt-1 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> Please check the fuel level correctly
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center space-x-2 border p-3 rounded bg-gray-50">
                  <input
                    type="checkbox"
                    id="isClean"
                    checked={!!conditionData.isClean}
                    onChange={e => setConditionData({ ...conditionData, isClean: e.target.checked })}
                    className="rounded border-gray-300 text-primary"
                  />
                  <label htmlFor="isClean" className="text-sm font-medium text-gray-700">
                    Vehicle is clean
                  </label>
                </div>
                <div className="flex items-center space-x-2 border p-3 rounded bg-gray-50">
                  <input
                    type="checkbox"
                    id="hasDamage"
                    checked={!!conditionData.hasDamage}
                    onChange={e => setConditionData({ ...conditionData, hasDamage: e.target.checked })}
                    className="rounded border-gray-300 text-primary"
                  />
                  <label htmlFor="hasDamage" className="text-sm font-medium text-gray-700">
                    Vehicle has damage
                  </label>
                </div>
              </div>

              {conditionData.hasDamage && (
                <TextArea
                  label="Damage Description"
                  value={conditionData.damageDescription}
                  onChange={e => setConditionData({ ...conditionData, damageDescription: e.target.value })}
                  required
                />
              )}

              <FileUpload
                label="Vehicle Condition Images (max 5)"
                accept="image/*"
                multiple
                onChange={files => {
                  setImages(Array.from(files).slice(0, 5));
                }}
                showPreview
              />
            </div>
          </div>
        )}

        {/* Payment Details */}
        <div className="border-t pt-4">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Payment Details</h3>
          <div className="space-y-4">
            <FormField
              type="number"
              label="Amount to Pay"
              value={formData.paidAmount}
              onChange={e => setFormData({ ...formData, paidAmount: parseFloat(e.target.value) || 0 })}
              min="0"
              max={finalCostAfterDiscount > 0 ? finalCostAfterDiscount : undefined}
              step="0.01"
            />
            <div>
              <label className="block text-sm font-medium text-gray-700">Payment Method</label>
              <select
                value={formData.paymentMethod}
                onChange={e => setFormData({ ...formData, paymentMethod: e.target.value as any })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
              >
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="cheque">Cheque</option>
              </select>
            </div>
            <FormField
              label="Payment Reference"
              value={formData.paymentReference}
              onChange={e => setFormData({ ...formData, paymentReference: e.target.value })}
              placeholder="Enter payment reference or transaction ID"
            />
            <div>
              <label className="block text-sm font-medium text-gray-700">Payment Notes</label>
              <textarea
                value={formData.paymentNotes}
                onChange={e => setFormData({ ...formData, paymentNotes: e.target.value })}
                rows={2}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                placeholder="Add any notes about this payment"
              />
            </div>
          </div>
        </div>

        {/* Signature */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Customer Signature</label>
          <SignaturePad
            value={formData.signature}
            onChange={signature => setFormData({ ...formData, signature })}
            className="mt-1 border rounded-md"
          />
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
            type="button"
            onClick={handleInitialSubmit}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-white bg-primary border border-transparent rounded-md hover:bg-primary-600 disabled:bg-gray-400"
          >
            {loading ? 'Processing...' : 'Create Rental'}
          </button>
        </div>
      </form>

      {/* CONFIRMATION MODAL */}
      <Modal isOpen={isConfirmModalOpen} onClose={() => setIsConfirmModalOpen(false)} title="Confirm Rental Details" size="lg">
        <div className="space-y-6">
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r flex items-start gap-3">
            <Info className="h-6 w-6 text-blue-500 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-medium text-blue-800">Please Review</h3>
              <p className="text-sm text-blue-700 mt-1">
                Review the details below. You can update the Status, Reason, Dates, Mileage, and Fuel right here before creating.
              </p>
            </div>
          </div>

          {/* Selected Customer & Vehicle */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-50 p-4 rounded border border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <User className="w-4 h-4 text-gray-500" />
                <h4 className="text-sm font-bold text-gray-700 uppercase">Selected Customer</h4>
              </div>
              <div className="text-sm">
                <p className="font-semibold text-gray-900">{selectedCustomer?.name}</p>
                <p className="text-gray-500">{selectedCustomer?.mobile}</p>
              </div>
            </div>
            <div className="bg-gray-50 p-4 rounded border border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <Car className="w-4 h-4 text-gray-500" />
                <h4 className="text-sm font-bold text-gray-700 uppercase">Selected Vehicle</h4>
              </div>
              <div className="text-sm">
                <p className="font-semibold text-gray-900">
                  {selectedVehicle?.make} {selectedVehicle?.model}
                </p>
                <p className="text-gray-500 font-mono">{selectedVehicle?.registrationNumber}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Status & Reason */}
            <div className="bg-white p-4 rounded border shadow-sm">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Status</label>
              <select
                value={formData.status}
                onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
              >
                <option value="scheduled">Scheduled</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div className="bg-white p-4 rounded border shadow-sm">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Reason</label>
              <select
                value={formData.reason}
                onChange={e => setFormData({ ...formData, reason: e.target.value as any })}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
              >
                <option value="hired">Hire</option>
                <option value="claim">Claim</option>
                <option value="o/d">O/D</option>
                <option value="staff">Staff</option>
                <option value="workshop">Workshop</option>
              </select>
            </div>

            {/* Dates */}
            <div className="bg-white p-4 rounded border shadow-sm">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Start Date</label>
              <input
                type="date"
                value={formData.startDate}
                onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
              />
            </div>
            <div className="bg-white p-4 rounded border shadow-sm">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">End Date</label>
              <input
                type="date"
                value={formData.endDate}
                onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
              />
            </div>

            {/* Condition Check */}
            <div className="md:col-span-2 border-t pt-4 mt-2">
              <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600" /> Verify Vehicle Condition
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Mileage</label>
                  <div className="relative mt-1">
                    <input
                      type="number"
                      value={conditionData.mileage}
                      onChange={e => setConditionData({ ...conditionData, mileage: parseInt(e.target.value) || 0 })}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm font-mono"
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 sm:text-xs">miles</span>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Fuel Level</label>
                  <select
                    value={conditionData.fuelLevel}
                    onChange={e => setConditionData({ ...conditionData, fuelLevel: e.target.value as any })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                  >
                    <option value="0">Empty (0%)</option>
                    <option value="25">Quarter (25%)</option>
                    <option value="50">Half (50%)</option>
                    <option value="75">Three Quarters (75%)</option>
                    <option value="100">Full (100%)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t pt-4 mt-4">
            <button
              onClick={() => setIsConfirmModalOpen(false)}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Back to Edit
            </button>
            <button
              onClick={executeCreateRental}
              disabled={loading}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              {loading ? (
                'Creating...'
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" /> Confirm & Create
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default RentalForm;