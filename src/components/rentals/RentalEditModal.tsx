// src/components/rentals/RentalEditModal.tsx
import React, { useEffect, useMemo, useState, useRef } from 'react';
import {
  doc,
  updateDoc,
  Timestamp,
  query,
  collection,
  getDocs,
  orderBy, // ✅ Added for Agreement Number logic
  limit    // ✅ Added for Agreement Number logic
} from 'firebase/firestore';
import { db, storage } from '../../lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

import {
  Rental,
  Vehicle,
  Customer,
  VehicleCondition,
  Claim,
  RentalPayment,
  HireSubstitutionDetails
} from '../../types';
import { useAuth } from '../../context/AuthContext';

import { calculateRentalCost } from '../../utils/rentalCalculations';
import { generateRentalDocuments } from '../../utils/generateRentalDocuments';
import { uploadRentalDocuments } from '../../utils/uploadRentalDocuments';

import FormField from '../ui/FormField';
import TextArea from '../ui/TextArea';
import FileUpload from '../ui/FileUpload';
import SignaturePad from '../ui/SignaturePad';
import Modal from '../ui/Modal';

import { 
  X, 
  Search, 
  Car, 
  User, 
  Plus, 
  Info, 
  CheckCircle, 
  AlertTriangle, 
  Fuel, 
  Gauge 
} from 'lucide-react';
import {
  addWeeks,
  format,
  differenceInDays,
  differenceInHours,
  isAfter,
  isValid
} from 'date-fns';
import toast from 'react-hot-toast';
import { createFinanceTransaction } from '../../utils/financeTransactions';
import { useFormattedDisplay } from '../../hooks/useFormattedDisplay';
import { useAvailableVehicles } from '../../hooks/useAvailableVehicles';

type BaseReason = 'hired' | 'claim' | 'o/d' | 'staff' | 'workshop';
type HireVariant = 'normal' | 'h-substitute' | 'c-substitute';

// Extended type for Form State to include Condition fields
type SubForm = Omit<HireSubstitutionDetails, 'givenAt' | 'expectedReturnAt'> & {
  givenAt: string;
  expectedReturnAt: string;
  // Condition fields
  mileage: number;
  fuelLevel: string;
  isClean: boolean;
  hasDamage: boolean;
  damageDescription: string;
  images: string[]; // Existing image URLs
};

const newSubDetail = (): SubForm => ({
  make: '',
  model: '',
  registration: '',
  loaner: '',
  givenAt: '',
  expectedReturnAt: '',
  notes: '',
  // Default Condition
  mileage: 0,
  fuelLevel: '100',
  isClean: true,
  hasDamage: false,
  damageDescription: '',
  images: []
});

interface RentalEditModalProps {
  rental: Rental;
  vehicles: Vehicle[];
  customers: Customer[];
  onClose: () => void;
}

const RentalEditModal: React.FC<RentalEditModalProps> = ({
  rental,
  vehicles,
  customers,
  onClose
}) => {
  const { user } = useAuth();
  const isManager = user?.role === 'manager';
  const { formatCurrency } = useFormattedDisplay();

  // ✅ REF for scrolling to top
  const topRef = useRef<HTMLDivElement>(null);

  const [loading, setLoading] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

  // Main Vehicle Images
  const [newImages, setNewImages] = useState<File[]>([]);
   
  // Substitution Vehicle Images (Mapped by index)
  const [subNewImages, setSubNewImages] = useState<Record<number, File[]>>({});

  const [vehicleSearchQuery, setVehicleSearchQuery] = useState('');
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [showVehicleResults, setShowVehicleResults] = useState(false);
  const [showCustomerResults, setShowCustomerResults] = useState(false);
  const [hasModifiedWeeks, setHasModifiedWeeks] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [lastEditedField, setLastEditedField] = useState<'percentage' | 'amount' | null>(null);

  const [insurancePerDayTouched, setInsurancePerDayTouched] = useState<boolean>(() => rental.insurancePerDay != null);
  const [insurancePerWeekTouched, setInsurancePerWeekTouched] = useState<boolean>(() => (rental as any).insurancePerWeek != null);

  const isFirstRender = useRef(true);

  // ✅ 1. Agreement Number State
  const [rentalAgreementNumber, setRentalAgreementNumber] = useState(rental.rentalAgreementNumber || '');

  const [existingImages, setExistingImages] = useState<string[]>(
    rental.checkOutCondition?.images || []
  );

  // Claims
  const [claims, setClaims] = useState<Claim[]>([]);
  const [claimSearchQuery, setClaimSearchQuery] = useState('');
  const [showClaimResults, setShowClaimResults] = useState(false);
  const [manualClaimRef, setManualClaimRef] = useState(true);

  // ✅ 2. Backfill Agreement Number Logic (Fixed: Order by Number)
  useEffect(() => {
    const checkAndFillAgreementNumber = async () => {
      // Only generate if the rental doesn't have one and we haven't generated one yet
      if (!rental.rentalAgreementNumber && !rentalAgreementNumber) {
        try {
          // ✅ FIX: Order by 'rentalAgreementNumber' to find the highest existing number
          // Note: If you don't have an index on this field, check your browser console for a link to create one.
          const q = query(
            collection(db, 'rentals'), 
            orderBy('rentalAgreementNumber', 'desc'), 
            limit(1)
          );
          
          const snapshot = await getDocs(q);
          let nextNum = 1;

          if (!snapshot.empty) {
            const lastData = snapshot.docs[0].data();
            const lastNumStr = lastData.rentalAgreementNumber;
            // If the highest number exists, add 1 to it
            if (lastNumStr && !isNaN(parseInt(lastNumStr))) {
              nextNum = parseInt(lastNumStr) + 1;
            }
          }
          setRentalAgreementNumber(String(nextNum).padStart(4, '0'));
        } catch (e) {
          console.error("Failed to generate backfilled agreement number", e);
        }
      }
    };
    checkAndFillAgreementNumber();
  }, [rental.rentalAgreementNumber, rentalAgreementNumber]);

  const safeFormatDate = (
    dateInput: Date | Timestamp | string | null | undefined,
    formatString: string
  ): string => {
    if (!dateInput) return '';
    let dateObj: Date | null = null;

    if (dateInput instanceof Date) {
      dateObj = dateInput;
    } else if (typeof (dateInput as any)?.toDate === 'function') {
      dateObj = (dateInput as Timestamp).toDate();
    } else {
      const parsed = new Date(dateInput as any);
      if (isValid(parsed)) dateObj = parsed;
    }

    if (dateObj && isValid(dateObj)) {
      try {
        return format(dateObj, formatString);
      } catch {
        return '';
      }
    }
    return '';
  };

  // ✅ UPDATED: Initialize sub forms with "Smart Lookup" for mileage
  const initialSubForms: SubForm[] = useMemo(() => {
    return (rental.hireSubstitutionDetails || []).map((sub: any) => {
      // Try to find the vehicle in the fleet list to get its current mileage
      const fleetVehicle = vehicles.find(v => 
        (v.registrationNumber || '').toLowerCase() === (sub.registration || '').toLowerCase()
      );

      return {
        ...sub,
        givenAt: safeFormatDate(sub.givenAt, "yyyy-MM-dd'T'HH:mm"),
        expectedReturnAt: safeFormatDate(sub.expectedReturnAt, "yyyy-MM-dd'T'HH:mm"),
        
        // Priority: 1. Saved Rental Mileage -> 2. Current Fleet Mileage -> 3. Default 0
        mileage: sub.mileage || fleetVehicle?.mileage || 0,
        
        fuelLevel: sub.fuelLevel || '100',
        isClean: sub.isClean !== undefined ? sub.isClean : true,
        hasDamage: sub.hasDamage || false,
        damageDescription: sub.damageDescription || '',
        images: sub.images || []
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rental.id, vehicles]); // Re-run if vehicles list updates

  // ✅ 1. Add this Helper Function above buildInitialFormData
  const getBaseAmount = (amount: number | undefined | null, includesVAT: boolean | undefined | null) => {
    if (!amount) return 0;
    if (includesVAT) {
      // If stored price has VAT, divide by 1.2 to get the Base price for the input field
      return parseFloat((amount / 1.2).toFixed(2));
    }
    return amount;
  };

  const buildInitialFormData = () => ({
    vehicleId: rental.vehicleId,
    customerId: rental.customerId,
    startDate: safeFormatDate(rental.startDate, 'yyyy-MM-dd'),
    startTime: safeFormatDate(rental.startDate, 'HH:mm'),
    endDate: safeFormatDate(rental.endDate, 'yyyy-MM-dd'),
    endTime: safeFormatDate(rental.endDate, 'HH:mm'),
    type: rental.type,
    reason: rental.reason,
    status: rental.status,
    signature: rental.signature || '',

    numberOfWeeks: rental.numberOfWeeks || 1,

    claimRef: rental.claimRef || '',
    // ✅ 2. UPDATE THESE LINES to use getBaseAmount
    deliveryCharge: getBaseAmount(rental.deliveryCharge, rental.deliveryChargeIncludeVAT),
    collectionCharge: getBaseAmount(rental.collectionCharge, rental.collectionChargeIncludeVAT),

    insurancePerDay: rental.insurancePerDay ?? 0,
    insurancePerWeek: (rental as any).insurancePerWeek ?? 0,

    // ✅ 3. FIX: Do NOT use getBaseAmount for Recovery Cost because it is stored as Net.
    recoveryCost: rental.recoveryCost || 0,
    includeRecoveryCostVAT: rental.includeRecoveryCostVAT || false,

    storageStartDate: safeFormatDate(rental.storageStartDate, 'yyyy-MM-dd'),
    storageEndDate: safeFormatDate(rental.storageEndDate, 'yyyy-MM-dd'),
    storageCostPerDay: rental.storageCostPerDay || 0,
    storageDays: rental.storageDays || 0,
    includeStorageVAT: rental.includeStorageVAT || false,

    includeVAT: rental.includeVAT || false,
    deliveryChargeIncludeVAT: rental.deliveryChargeIncludeVAT || false,
    collectionChargeIncludeVAT: rental.collectionChargeIncludeVAT || false,
    insurancePerDayIncludeVAT: rental.insurancePerDayIncludeVAT || false,
    insurancePerWeekIncludeVAT: (rental as any).insurancePerWeekIncludeVAT || false,

    negotiatedRate: rental.negotiatedRate?.toString() || '',
    negotiationNotes: rental.negotiationNotes || '',

    discountPercentage: rental.discountPercentage || 0,
    discountAmount: rental.discountAmount || 0,
    discountNotes: rental.discountNotes || '',

    originalStartDate: safeFormatDate(
      (rental.originalStartDate ?? rental.startDate) as any,
      "yyyy-MM-dd'T'HH:mm"
    ),

    amountToAdd: 0,
    paymentMethod: 'cash' as const,
    paymentReference: '',
    paymentNotes: '',

    hireSubstitutionDetails: initialSubForms.length ? initialSubForms : [newSubDetail()]
  });

  const [formData, setFormData] = useState(buildInitialFormData);

  useEffect(() => {
    setFormData(buildInitialFormData());
    setExistingImages(rental.checkOutCondition?.images || []);
    setConditionData(
      rental.checkOutCondition ?? {
        mileage: 0,
        fuelLevel: '100',
        isClean: true,
        hasDamage: false,
        damageDescription: '',
        images: []
      }
    );
    setInsurancePerDayTouched(rental.insurancePerDay != null);
    setInsurancePerWeekTouched((rental as any).insurancePerWeek != null);
    isFirstRender.current = true;
    setHasModifiedWeeks(false);
    setInitialized(false);
    setSubNewImages({}); 
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rental.id]);

  const deriveReasonUI = (reason: any): { base: BaseReason; variant: HireVariant } => {
    if (reason === 'h-substitute') return { base: 'hired', variant: 'h-substitute' };
    if (reason === 'c-substitute') return { base: 'hired', variant: 'c-substitute' };
    if (reason === 'hired') return { base: 'hired', variant: 'normal' };
    if (reason === 'claim') return { base: 'claim', variant: 'normal' };
    if (reason === 'o/d') return { base: 'o/d', variant: 'normal' };
    if (reason === 'staff') return { base: 'staff', variant: 'normal' };
    return { base: 'workshop', variant: 'normal' };
  };

  const initReasonUI = deriveReasonUI(formData.reason);
  const [baseReason, setBaseReason] = useState<BaseReason>(initReasonUI.base);
  const [hireVariant, setHireVariant] = useState<HireVariant>(initReasonUI.variant);

  useEffect(() => {
    const desiredReason =
      baseReason !== 'hired'
        ? baseReason
        : hireVariant === 'normal'
        ? 'hired'
        : hireVariant;

    if (formData.reason !== desiredReason) {
      setFormData((prev) => ({ ...prev, reason: desiredReason as any }));
    }
  }, [baseReason, hireVariant]);

  useEffect(() => {
    const { base, variant } = deriveReasonUI(formData.reason);
    if (base !== baseReason) setBaseReason(base);
    if (variant !== hireVariant) setHireVariant(variant);
  }, [formData.reason]);

  const selectedVehicle = vehicles.find((v) => v.id === formData.vehicleId);
  useEffect(() => {
    if (!selectedVehicle) return;
    if (rental.insurancePerDay == null) setInsurancePerDayTouched(false);
    if ((rental as any).insurancePerWeek == null) setInsurancePerWeekTouched(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedVehicle?.id]);

  const selectedCustomer = customers.find((c) => c.id === formData.customerId);

  const [conditionData, setConditionData] = useState<Partial<VehicleCondition>>(
    rental.checkOutCondition ?? {
      mileage: 0,
      fuelLevel: '100',
      isClean: true,
      hasDamage: false,
      damageDescription: '',
      images: []
    }
  );

  // --- AUTO-FILL INSURANCE LOGIC ---
  useEffect(() => {
    if (isFirstRender.current) return;
    if (!selectedVehicle) return;
    if (formData.type === 'daily' && !insurancePerDayTouched) {
      const vAmt = typeof (selectedVehicle as any).dailyInsuranceAmount === 'number' ? (selectedVehicle as any).dailyInsuranceAmount : 0;
      setFormData((prev) => ({ ...prev, insurancePerDay: vAmt }));
    }
    if (formData.type === 'claim' && !insurancePerDayTouched) {
      const vAmt = typeof (selectedVehicle as any).claimInsuranceAmount === 'number' ? (selectedVehicle as any).claimInsuranceAmount : 0;
      setFormData((prev) => ({ ...prev, insurancePerDay: vAmt }));
    }
    if (formData.type === 'weekly' && !insurancePerWeekTouched) {
      const vAmt = typeof (selectedVehicle as any).weeklyInsuranceAmount === 'number' ? (selectedVehicle as any).weeklyInsuranceAmount : 0;
      setFormData((prev) => ({ ...prev, insurancePerWeek: vAmt }));
    }
  }, [selectedVehicle?.id, formData.type, insurancePerDayTouched, insurancePerWeekTouched]);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    setInsurancePerDayTouched(false);
    setInsurancePerWeekTouched(false);
  }, [formData.type]);

  // Populate search inputs
  useEffect(() => {
    if (selectedVehicle) {
      setVehicleSearchQuery(`${selectedVehicle.make} ${selectedVehicle.model} - ${selectedVehicle.registrationNumber}`);
    }
    if (selectedCustomer) {
      setCustomerSearchQuery(`${selectedCustomer.name} - ${selectedCustomer.mobile}`);
    }
    if (rental.claimRef) {
      setClaimSearchQuery(rental.claimRef);
      setManualClaimRef(true);
    } else {
      setManualClaimRef(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedVehicle?.id, selectedCustomer?.id, rental.claimRef]);

  // Fetch claims once
  useEffect(() => {
    const fetchClaims = async () => {
      try {
        const claimsQuery = query(collection(db, 'claims'));
        const snapshot = await getDocs(claimsQuery);
        const claimsData = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data()
        })) as Claim[];
        setClaims(claimsData);
      } catch {
        toast.error('Failed to fetch claims');
      }
    };
    fetchClaims();
  }, []);

  const filteredClaims = useMemo(() => {
    if (!claimSearchQuery) return [];
    const s = claimSearchQuery.toLowerCase();
    return (claims || []).filter((claim) => {
      const name = claim.clientInfo?.name?.toLowerCase() || '';
      const refLower = claim.clientRef?.toLowerCase() || '';
      const idLower = claim.id.toLowerCase();
      return name.includes(s) || refLower.includes(s) || idLower.includes(s);
    });
  }, [claims, claimSearchQuery]);

  const filteredCustomers = useMemo(() => {
    const s = customerSearchQuery.toLowerCase();
    return customers.filter((customer) => {
      return (
        customer.name.toLowerCase().includes(s) ||
        customer.mobile.includes(s) ||
        customer.email.toLowerCase().includes(s)
      );
    });
  }, [customers, customerSearchQuery]);

  // Available vehicles
  const { availableVehicles, loading: loadingVehicles } = useAvailableVehicles(
    vehicles,
    formData.startDate && formData.startTime ? new Date(`${formData.startDate}T${formData.startTime}`) : undefined,
    formData.endDate && formData.endTime ? new Date(`${formData.endDate}T${formData.endTime}`) : undefined,
    rental.id
  );

  const filteredVehicles = useMemo(() => {
    const s = vehicleSearchQuery.toLowerCase();
    return availableVehicles.filter((vehicle) => {
      if (vehicle.id === formData.vehicleId) return true;
      return (
        vehicle.make.toLowerCase().includes(s) ||
        vehicle.model.toLowerCase().includes(s) ||
        vehicle.registrationNumber.toLowerCase().includes(s)
      );
    });
  }, [availableVehicles, vehicleSearchQuery, formData.vehicleId]);

  // Storage days
  useEffect(() => {
    if (formData.storageStartDate && formData.storageEndDate) {
      const start = new Date(formData.storageStartDate);
      const end = new Date(formData.storageEndDate);

      if (isValid(start) && isValid(end) && !isAfter(start, end)) {
        const days = differenceInDays(end, start) + 1;
        setFormData((prev) => ({ ...prev, storageDays: days }));
      } else {
        setFormData((prev) => ({ ...prev, storageDays: 0 }));
      }
    } else {
      setFormData((prev) => ({ ...prev, storageDays: 0 }));
    }
  }, [formData.storageStartDate, formData.storageEndDate]);

  // Weekly end calc
  useEffect(() => {
    if (!initialized) {
      setInitialized(true);
      return;
    }
    if (!hasModifiedWeeks) return;

    if (formData.type === 'weekly' && formData.startDate && formData.startTime && formData.numberOfWeeks > 0) {
      const startDT = new Date(`${formData.startDate}T${formData.startTime}`);
      if (isValid(startDT)) {
        const computedEnd = addWeeks(startDT, formData.numberOfWeeks);
        setFormData((prev) => ({
          ...prev,
          endDate: format(computedEnd, 'yyyy-MM-dd'),
          endTime: prev.startTime
        }));
      }
    }
  }, [
    formData.type,
    formData.numberOfWeeks,
    formData.startDate,
    formData.startTime,
    hasModifiedWeeks,
    initialized
  ]);

  const calculateCurrentTotalCost = () => {
    const vehicle = vehicles.find((v) => v.id === formData.vehicleId);

    if (!vehicle || !formData.startDate || !formData.endDate || !formData.startTime || !formData.endTime) return 0;

    const startDT = new Date(`${formData.startDate}T${formData.startTime}`);
    const endDT = new Date(`${formData.endDate}T${formData.endTime}`);

    if (!isValid(startDT) || !isValid(endDT) || isAfter(startDT, endDT)) return 0;

    const negotiatedRate = formData.negotiatedRate ? parseFloat(formData.negotiatedRate) : undefined;

    let storageCostCalc = 0;
    if (formData.type === 'claim' && formData.storageStartDate && formData.storageEndDate) {
      storageCostCalc =
        (formData.storageDays || 0) *
        (formData.storageCostPerDay || 0) *
        (formData.includeStorageVAT ? 1.2 : 1);
    }

    // Call the utility which handles proper VAT separation internally
    return calculateRentalCost(
      startDT,
      endDT,
      formData.type,
      vehicle,
      formData.reason,
      negotiatedRate,
      formData.type === 'claim' ? storageCostCalc : undefined,
      formData.type === 'claim' ? formData.recoveryCost : undefined,
      formData.deliveryCharge,
      formData.collectionCharge,

      // ✅ FIX: Conditional insurance passing for Live Calc
      formData.type !== 'weekly' ? formData.insurancePerDay : 0,
      formData.type === 'weekly' ? formData.insurancePerWeek : 0,

      formData.includeVAT,
      formData.deliveryChargeIncludeVAT,
      formData.collectionChargeIncludeVAT,
      formData.insurancePerDayIncludeVAT,
      formData.insurancePerWeekIncludeVAT,
      formData.includeRecoveryCostVAT
    );
  };

  const currentTotalCost = calculateCurrentTotalCost();
  const currentDiscountAmount = formData.discountAmount;
  const currentFinalCostAfterDiscount = currentTotalCost - currentDiscountAmount;
  const currentRemainingAmount = currentFinalCostAfterDiscount - (rental.paidAmount || 0);

  // Discount sync
  useEffect(() => {
    if (currentTotalCost <= 0) {
      if (formData.discountAmount !== 0 || formData.discountPercentage !== 0) {
        setFormData((prev) => ({ ...prev, discountAmount: 0, discountPercentage: 0 }));
      }
      return;
    }

    if (lastEditedField === 'amount') {
      const newPct = formData.discountAmount > 0 ? (formData.discountAmount / currentTotalCost) * 100 : 0;
      setFormData((prev) => ({ ...prev, discountPercentage: parseFloat(newPct.toFixed(2)) }));
    } else if (lastEditedField === 'percentage') {
      const newAmt = (currentTotalCost * (formData.discountPercentage || 0)) / 100;
      setFormData((prev) => ({ ...prev, discountAmount: parseFloat(newAmt.toFixed(2)) }));
    } else {
      if (rental.discountAmount != null) {
        const initPct = rental.discountAmount > 0 ? (rental.discountAmount / currentTotalCost) * 100 : 0;
        setFormData((prev) => ({
          ...prev,
          discountAmount: parseFloat(rental.discountAmount.toFixed(2)),
          discountPercentage: parseFloat(initPct.toFixed(2))
        }));
      } else if (rental.discountPercentage != null) {
        const initAmt = (currentTotalCost * (rental.discountPercentage || 0)) / 100;
        setFormData((prev) => ({
          ...prev,
          discountPercentage: parseFloat(rental.discountPercentage.toFixed(2)),
          discountAmount: parseFloat(initAmt.toFixed(2))
        }));
      }
    }
  }, [
    currentTotalCost,
    formData.discountAmount,
    formData.discountPercentage,
    lastEditedField,
    rental.discountAmount,
    rental.discountPercentage
  ]);

  const handleRemoveExistingImage = (imageUrl: string) => {
    setExistingImages((prev) => prev.filter((img) => img !== imageUrl));
  };

  // --- H-Substitute Search Logic ---
  const [subVehicleSearchQueries, setSubVehicleSearchQueries] = useState<string[]>(
    () => (formData.hireSubstitutionDetails || []).map(() => '')
  );
  const [showSubVehicleResults, setShowSubVehicleResults] = useState<boolean[]>(
    () => (formData.hireSubstitutionDetails || []).map(() => false)
  );

  useEffect(() => {
    const len = formData.hireSubstitutionDetails.length;
    setSubVehicleSearchQueries((prev) => {
      if (prev.length === len) return prev;
      if (prev.length < len) return [...prev, ...Array(len - prev.length).fill('')];
      return prev.slice(0, len);
    });
    setShowSubVehicleResults((prev) => {
      if (prev.length === len) return prev;
      if (prev.length < len) return [...prev, ...Array(len - prev.length).fill(false)];
      return prev.slice(0, len);
    });
  }, [formData.hireSubstitutionDetails.length]);

  const filteredSubVehicles = (index: number) => {
    const q = (subVehicleSearchQueries[index] || '').toLowerCase();
    if (!q) return vehicles.slice(0, 15);
    return vehicles
      .filter((v) => {
        const label = `${v.make} ${v.model} ${v.registrationNumber}`.toLowerCase();
        return label.includes(q);
      })
      .slice(0, 15);
  };

  const handleSubChange = (
    index: number,
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    const newSubs = [...formData.hireSubstitutionDetails];
    
    // Handle Checkboxes
    if (type === 'checkbox') {
        (newSubs[index] as any) = { ...newSubs[index], [name]: (e.target as HTMLInputElement).checked };
    } 
    // Handle Numbers
    else if (type === 'number') {
        (newSubs[index] as any) = { ...newSubs[index], [name]: parseFloat(value) || 0 };
    }
    // Handle Text/Select
    else {
        (newSubs[index] as any) = { ...newSubs[index], [name]: value };
    }

    setFormData((prev) => ({ ...prev, hireSubstitutionDetails: newSubs }));
  };

  const addSubstitutionVehicle = () => {
    setFormData((prev) => ({
      ...prev,
      hireSubstitutionDetails: [...prev.hireSubstitutionDetails, newSubDetail()]
    }));
  };

  const removeSubstitutionVehicle = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      hireSubstitutionDetails: prev.hireSubstitutionDetails.filter((_, i) => i !== index)
    }));
    // Cleanup images for that index
    const newSubImages = { ...subNewImages };
    delete newSubImages[index];
    setSubNewImages(newSubImages);
  };

  // Handle Sub Images (Remove Existing)
  const handleRemoveExistingSubImage = (index: number, urlToRemove: string) => {
    const newSubs = [...formData.hireSubstitutionDetails];
    const currentImages = newSubs[index].images || [];
    newSubs[index].images = currentImages.filter(url => url !== urlToRemove);
    setFormData(prev => ({ ...prev, hireSubstitutionDetails: newSubs }));
  };

  // ✅ UPDATED: Fill mileage from fleet upon selection
  const pickSubVehicleFromFleet = (index: number, v: Vehicle) => {
    const newSubs = [...formData.hireSubstitutionDetails];
    newSubs[index] = {
      ...newSubs[index],
      make: v.make || '',
      model: v.model || '',
      registration: v.registrationNumber || '',
      mileage: v.mileage || 0 // <--- THIS LINE ensures auto-fill on pick
    };

    setFormData((prev) => ({ ...prev, hireSubstitutionDetails: newSubs }));
    setSubVehicleSearchQueries((prev) => {
      const copy = [...prev];
      copy[index] = `${v.make} ${v.model} - ${v.registrationNumber}`;
      return copy;
    });
    setShowSubVehicleResults((prev) => {
      const copy = [...prev];
      copy[index] = false;
      return copy;
    });
  };

  const latestSubIndex = useMemo(() => {
    if (formData.reason !== 'h-substitute') return -1;
    const meaningful = formData.hireSubstitutionDetails
      .map((s, i) => ({ s, i }))
      .filter(({ s }) => !!(s.make || s.model || s.registration || s.loaner || s.givenAt || s.expectedReturnAt || s.notes));

    if (!meaningful.length) return -1;
    return meaningful[meaningful.length - 1].i;
  }, [formData.reason, formData.hireSubstitutionDetails]);

  const openConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVehicle || !selectedCustomer) {
      toast.error('Please select a valid vehicle and customer.');
      return;
    }

    // ✅ FIX: SCROLL TO TOP reliably using ref
    topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    // Fallback
    window.scrollTo(0, 0);

    setIsConfirmModalOpen(true);
  };

  const executeUpdateRental = async () => {
    const submitVehicle = vehicles.find((v) => v.id === formData.vehicleId);
    const submitCustomer = customers.find((c) => c.id === formData.customerId);

    if (!user || !submitVehicle || !submitCustomer) {
      toast.error('User, vehicle, or customer data missing.');
      return;
    }

    // --- NEW: MANDATORY COMPLETION CHECK ---
  if (formData.status === 'completed') {
    // 1. Verify Main Vehicle Return Condition
    if (!rental.returnCondition) {
      toast.error('Main vehicle return condition is required before completing the rental.');
      return;
    }

    // 2. Verify all Substitution Vehicle Returns
    if (formData.hireSubstitutionDetails && formData.hireSubstitutionDetails.length > 0) {
      const pendingSubs = formData.hireSubstitutionDetails.filter(sub => {
        // A substitution is considered active if it has a registration 
        // but no returnCondition object assigned to it.
        const hasVehicleInfo = !!(sub.registration || sub.make);
        return hasVehicleInfo && !sub.returnCondition;
      });

      if (pendingSubs.length > 0) {
        toast.error(
          `Cannot complete rental: ${pendingSubs.length} substitution vehicle(s) have not been returned yet.`
        );
        return; 
      }
    }
  }

    setLoading(true);

    try {
      if (!formData.startDate || !formData.startTime) throw new Error('Start Date and Time are required.');
      if (!formData.endDate || !formData.endTime) throw new Error('End Date and Time are required.');

      const submitStartDT = new Date(`${formData.startDate}T${formData.startTime}`);
      const submitEndDT = new Date(`${formData.endDate}T${formData.endTime}`);

      if (!isValid(submitStartDT)) throw new Error('Invalid Start Date or Time.');
      if (!isValid(submitEndDT)) throw new Error('Invalid End Date or Time.');
      if (isAfter(submitStartDT, submitEndDT)) throw new Error('End Date cannot be before Start Date.');

      // --- Storage logic ---
      let submitStorageCost = 0,
        submitStorageDays = 0;
      let storageStartObj: Date | null = null,
        storageEndObj: Date | null = null;

      if (formData.type === 'claim' && formData.storageStartDate && formData.storageEndDate) {
        storageStartObj = new Date(formData.storageStartDate);
        storageEndObj = new Date(formData.storageEndDate);

        if (isValid(storageStartObj) && isValid(storageEndObj) && !isAfter(storageStartObj, storageEndObj)) {
          submitStorageDays = differenceInDays(storageEndObj, storageStartObj) + 1;
          const dailyCost = formData.storageCostPerDay || 0;
          submitStorageCost = submitStorageDays * dailyCost * (formData.includeStorageVAT ? 1.2 : 1);
        } else {
          storageStartObj = null;
          storageEndObj = null;
          submitStorageCost = 0;
          submitStorageDays = 0;
        }
      }

      // ✅ FIX: Conditional insurance passing for Standard Cost
      const submitStandardCost = calculateRentalCost(
        submitStartDT,
        submitEndDT,
        formData.type,
        submitVehicle,
        formData.reason,
        undefined,
        formData.type === 'claim' ? submitStorageCost : undefined,
        formData.type === 'claim' ? formData.recoveryCost || 0 : undefined,
        formData.type === 'claim' ? formData.deliveryCharge || 0 : undefined,
        formData.type === 'claim' ? formData.collectionCharge || 0 : undefined,
        
        formData.type !== 'weekly' ? formData.insurancePerDay || 0 : 0,
        formData.type === 'weekly' ? formData.insurancePerWeek || 0 : 0,
        
        false,
        formData.deliveryChargeIncludeVAT,
        formData.collectionChargeIncludeVAT,
        formData.insurancePerDayIncludeVAT,
        formData.insurancePerWeekIncludeVAT,
        formData.includeRecoveryCostVAT
      );

      const negotiatedRateValue = formData.negotiatedRate ? parseFloat(formData.negotiatedRate) : undefined;

      // ✅ FIX: Conditional insurance passing for Total Cost
      const totalCostBeforeDiscount = calculateRentalCost(
        submitStartDT,
        submitEndDT,
        formData.type,
        submitVehicle,
        formData.reason,
        negotiatedRateValue,
        formData.type === 'claim' ? submitStorageCost : undefined,
        formData.type === 'claim' ? formData.recoveryCost || 0 : undefined,
        formData.deliveryCharge || 0,
        formData.collectionCharge || 0,
        
        formData.type !== 'weekly' ? formData.insurancePerDay || 0 : 0,
        formData.type === 'weekly' ? formData.insurancePerWeek || 0 : 0,
        
        formData.includeVAT,
        formData.deliveryChargeIncludeVAT,
        formData.collectionChargeIncludeVAT,
        formData.insurancePerDayIncludeVAT,
        formData.insurancePerWeekIncludeVAT,
        formData.includeRecoveryCostVAT
      );

      const submitDiscountAmount = formData.discountAmount;
      const submitFinalCostAfterDiscount = totalCostBeforeDiscount - submitDiscountAmount;

      const newPayment = parseFloat(formData.amountToAdd.toString()) || 0;
      const updatedTotalPaid = (rental.paidAmount || 0) + newPayment;

      const updatedPayments: RentalPayment[] = [...(rental.payments || [])];
      if (newPayment > 0) {
        updatedPayments.push({
          id: `payment_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          date: new Date(),
          amount: newPayment,
          method: formData.paymentMethod,
          ...(formData.paymentReference && { reference: formData.paymentReference }),
          ...(formData.paymentNotes && { notes: formData.paymentNotes }),
          createdAt: new Date(),
          createdBy: user.id
        });
      }

      const submitRemainingAmount = submitFinalCostAfterDiscount - updatedTotalPaid;
      const submitPaymentStatus =
        submitRemainingAmount <= 0.001
          ? 'paid'
          : updatedTotalPaid > 0
          ? 'partially_paid'
          : 'pending';

      const newImageUrls = await Promise.all(
        newImages.map(async (file) => {
          const ts = Date.now();
          const storageRef = ref(storage, `vehicle-conditions/${rental.id}/${ts}_${file.name}`);
          const snap = await uploadBytes(storageRef, file);
          return getDownloadURL(snap.ref);
        })
      );
      const allImages = [...existingImages, ...newImageUrls];

      const updatedCondition: VehicleCondition = {
        type: 'check-out',
        date: rental.checkOutCondition?.date || submitStartDT,
        mileage: conditionData.mileage || 0,
        fuelLevel: (conditionData.fuelLevel as any) || '100',
        isClean: conditionData.isClean === undefined ? true : !!conditionData.isClean,
        hasDamage: !!conditionData.hasDamage,
        damageDescription: conditionData.hasDamage ? conditionData.damageDescription || '' : '',
        images: allImages,
        createdAt: rental.checkOutCondition?.createdAt || new Date(),
        createdBy: rental.checkOutCondition?.createdBy || user.id,
        id: rental.checkOutCondition?.id || `cond_${Date.now()}`,
        notes: (conditionData as any).notes || (rental.checkOutCondition as any)?.notes || ''
      };

      let submitOriginalStartDate: Date | undefined = undefined;
      if (formData.originalStartDate) {
        const osd = new Date(formData.originalStartDate);
        if (isValid(osd)) submitOriginalStartDate = osd;
      }

      // Handle Substitution Images & Data
      const submitHireSubstitutionDetails = await Promise.all(
        formData.hireSubstitutionDetails.map(async (sub, index) => {
            // Upload new images for THIS sub index
            const filesToUpload = subNewImages[index] || [];
            const subUploadedUrls = await Promise.all(
                filesToUpload.map(async (file) => {
                    const ts = Date.now();
                    const storageRef = ref(storage, `sub-conditions/${rental.id}/${index}_${ts}_${file.name}`);
                    const snap = await uploadBytes(storageRef, file);
                    return getDownloadURL(snap.ref);
                })
            );

            const combinedSubImages = [...(sub.images || []), ...subUploadedUrls];

            return {
                make: sub.make || '',
                model: sub.model || '',
                registration: sub.registration || '',
                loaner: sub.loaner || '',
                notes: sub.notes || '',
                givenAt: new Date(sub.givenAt || Date.now()),
                expectedReturnAt: new Date(sub.expectedReturnAt || Date.now()),
                // New Condition Fields
                mileage: sub.mileage || 0,
                fuelLevel: sub.fuelLevel || '100',
                isClean: sub.isClean,
                hasDamage: sub.hasDamage,
                damageDescription: sub.damageDescription || '',
                images: combinedSubImages
            };
        })
      );

      const finalSubs = formData.reason === 'h-substitute' && submitHireSubstitutionDetails.length > 0
        ? submitHireSubstitutionDetails.filter(s => s.make || s.model || s.registration)
        : null;

      const rentalUpdateData: Partial<Rental> = {
        rentalAgreementNumber, // ✅ Saves the agreement number if it was backfilled
        vehicleId: formData.vehicleId,
        customerId: formData.customerId,
        startDate: submitStartDT,
        endDate: submitEndDT,
        type: formData.type,
        reason: formData.reason,
        status: formData.status,
        cost: submitFinalCostAfterDiscount,
        standardCost: submitStandardCost,
        paidAmount: updatedTotalPaid,
        remainingAmount: submitRemainingAmount,
        paymentStatus: submitPaymentStatus,
        payments: updatedPayments,
        signature: formData.signature || null,
        claimRef: formData.claimRef || null,

        storageStartDate: storageStartObj,
        storageEndDate: storageEndObj,
        storageCostPerDay: formData.type === 'claim' ? formData.storageCostPerDay || 0 : null,
        storageDays: formData.type === 'claim' ? submitStorageDays : null,
        includeStorageVAT: formData.type === 'claim' ? formData.includeStorageVAT : null,
        storageCost: formData.type === 'claim' ? submitStorageCost : null,

        recoveryCost:
          formData.type === 'claim' && formData.recoveryCost > 0 ? formData.recoveryCost : null,
        includeRecoveryCostVAT: formData.type === 'claim' ? formData.includeRecoveryCostVAT : null,

        deliveryCharge:
          formData.deliveryCharge > 0
            ? formData.deliveryCharge * (formData.deliveryChargeIncludeVAT ? 1.2 : 1)
            : null,
        collectionCharge:
          formData.collectionCharge > 0
            ? formData.collectionCharge * (formData.collectionChargeIncludeVAT ? 1.2 : 1)
            : null,

        // ✅ FIXED: Only save insurance relevant to type
        insurancePerDay: formData.type !== 'weekly' && formData.insurancePerDay > 0 ? formData.insurancePerDay : null,
        insurancePerWeek: formData.type === 'weekly' && formData.insurancePerWeek > 0 ? formData.insurancePerWeek : null,

        includeVAT: formData.includeVAT,
        deliveryChargeIncludeVAT: formData.deliveryChargeIncludeVAT,
        collectionChargeIncludeVAT: formData.collectionChargeIncludeVAT,
        
        // ✅ FIXED: Only save VAT flag relevant to type
        insurancePerDayIncludeVAT: formData.type !== 'weekly' ? formData.insurancePerDayIncludeVAT : false,
        insurancePerWeekIncludeVAT: formData.type === 'weekly' ? formData.insurancePerWeekIncludeVAT : false,

        negotiatedRate: negotiatedRateValue ?? null,
        negotiationNotes: formData.negotiationNotes || null,

        discountPercentage: formData.discountPercentage || null,
        discountAmount: submitDiscountAmount > 0 ? submitDiscountAmount : null,
        discountNotes: formData.discountNotes || null,

        numberOfWeeks: formData.type === 'weekly' ? formData.numberOfWeeks || 1 : null,

        checkOutCondition: updatedCondition,
        ...(submitOriginalStartDate !== undefined ? { originalStartDate: submitOriginalStartDate } : {}),

        hireSubstitutionDetails: finalSubs,

        updatedAt: new Date(),
        updatedBy: user.id
      };

      if (rental.status !== 'completed' && formData.status === 'completed') {
        if (!rental.returnCondition) {
          toast.error('You must fill the Return Condition before completing the rental.');
          setLoading(false);
          return;
        }

        const rcRaw = (rental.returnCondition as any).date;
        let rcDate: Date | null = null;
        if (rcRaw) {
          rcDate = typeof rcRaw?.toDate === 'function' ? rcRaw.toDate() : new Date(rcRaw);
        }

        const fmt = (d: Date) => {
          const dd = String(d.getDate()).padStart(2, '0');
          const mm = String(d.getMonth() + 1).padStart(2, '0');
          const yyyy = d.getFullYear();
          return `${dd}/${mm}/${yyyy}`;
        };

        if (!rcDate || isNaN(rcDate.getTime())) {
          toast.error('Return Condition date is missing or invalid. Please set it before completing.');
          setLoading(false);
          return;
        }

        const endYMD = `${submitEndDT.getFullYear()}-${submitEndDT.getMonth() + 1}-${submitEndDT.getDate()}`;
        const rcYMD = `${rcDate.getFullYear()}-${rcDate.getMonth() + 1}-${rcDate.getDate()}`;

        if (endYMD !== rcYMD) {
          toast.error(`Rental end date (${fmt(submitEndDT)}) and the return condition date (${fmt(rcDate)}) are not the same.`);
          setLoading(false);
          return;
        }
      }

      const rentalRef = doc(db, 'rentals', rental.id);
      await updateDoc(rentalRef, rentalUpdateData);

      setIsConfirmModalOpen(false);
      setLoading(false);
      onClose();
      toast.success('Rental updated! Regenerating documents in background…');

      setTimeout(async () => {
        try {
          const completeUpdatedRental = {
            ...rental,
            ...rentalUpdateData
          } as Rental;

          const documents = await generateRentalDocuments(
            completeUpdatedRental,
            submitVehicle,
            submitCustomer
          );

          const existingAgreements = rental.documents?.agreements || {};
          const agreementKeys = Object.keys(existingAgreements).sort(
            (a, b) => parseInt(a.split('_')[1] || '0') - parseInt(b.split('_')[1] || '0')
          );
          const latestAgreementKey = agreementKeys.length > 0 ? agreementKeys[agreementKeys.length - 1] : null;

          const agreementsToUpload: Record<string, Blob> = {};
          const originalStartDate = (rental.originalStartDate ?? rental.startDate) as any;

          if (!originalStartDate || !isValid(originalStartDate)) {
            toast.error('Original start date is invalid. Cannot version agreement.');
            throw new Error('Invalid originalStartDate for agreement versioning.');
          }

          let newAgreementKey: string;

          if (latestAgreementKey) {
            const ninetyDaysAgo = new Date();
            ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

            const latestAgreementTimestamp = parseInt(latestAgreementKey.split('_')[1] || '0');
            const latestAgreementDate = new Date(latestAgreementTimestamp);

            if (latestAgreementDate < ninetyDaysAgo) {
              newAgreementKey = `agreement_${new Date().getTime()}`;
            } else {
              newAgreementKey = latestAgreementKey;
            }
          } else {
            const originalTimestamp = originalStartDate.getTime();
            if (isNaN(originalTimestamp)) throw new Error('Original start date resulted in NaN timestamp.');
            newAgreementKey = `agreement_${originalTimestamp}`;
          }

          agreementsToUpload[newAgreementKey] = documents.agreement;

          await uploadRentalDocuments(rental.id, {
            agreements: agreementsToUpload,
            invoice: documents.invoice,
            permit: documents.permit,
            claimDocuments: documents.claimDocuments
          });

          toast.success('PDF documents regenerated!');
        } catch (err: any) {
          console.error('Background PDF regen failed:', err);
          toast.error(`Rental updated, but failed to regenerate documents: ${err.message || String(err)}`);
        }
      }, 0);

      const initialPaymentStatus: 'paid' | 'partially_paid' | 'unpaid' =
        submitRemainingAmount <= 0.001 ? 'paid' : (updatedTotalPaid || 0) > 0 ? 'partially_paid' : 'unpaid';

      if (newPayment > 0) {
        setTimeout(async () => {
          try {
            const vehicleOwner = selectedVehicle?.owner
              ? { name: selectedVehicle.owner.name, isDefault: selectedVehicle.owner.isDefault ?? false }
              : undefined;

            await createFinanceTransaction({
              type: 'income',
              category: 'Rental',
              amount: formData.amountToAdd,
              description:
                `A ${rental.type} Rental payment from customer (${selectedCustomer?.name || 'N/A'})` +
                `${formData.paymentNotes ? ` – ${formData.paymentNotes}` : ''}`,
              referenceId: rental.id,
              paymentMethod: formData.paymentMethod,
              paymentReference: formData.paymentReference,
              status: 'completed',
              paymentStatus: initialPaymentStatus,
              date: new Date(),
              vehicleId: rental.vehicleId,
              vehicleName: `${selectedVehicle!.make} ${selectedVehicle!.model} (${selectedVehicle!.registrationNumber})`,
              vehicleOwner,
              customerId: rental.customerId,
              customerName: selectedCustomer?.name,
              // ✅ Pass the linked finance account for income (credit)
              accountTo: selectedVehicle.owner?.accountId || undefined
            });
          } catch {
            toast.error('Rental updated, but failed to record finance transaction for new payment.');
          }
        }, 0);
      }
    } catch (err: any) {
      toast.error(`Failed to update rental: ${err.message || String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div ref={topRef} /> {/* ✅ Anchor at the very top of the modal content */}
      
      {/* ✅ Display Agreement Number if present */}
      {rentalAgreementNumber && (
        <div className="bg-gray-100 p-2 rounded mb-4 text-center">
            <span className="font-bold text-gray-700">Rental Agreement #{rentalAgreementNumber}</span>
        </div>
      )}

      <form onSubmit={openConfirm} className="space-y-6">
        {/* Vehicle Search/Selection */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Vehicle</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              value={vehicleSearchQuery}
              onChange={(e) => {
                setVehicleSearchQuery(e.target.value);
                setShowVehicleResults(true);
              }}
              onFocus={() => setShowVehicleResults(true)}
              onBlur={() => setTimeout(() => setShowVehicleResults(false), 200)}
              placeholder="Search vehicles..."
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md bg-white placeholder-gray-500 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
              aria-autocomplete="list"
              aria-controls="vehicle-results"
            />
            {vehicleSearchQuery && !showVehicleResults && (
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                onClick={() => {
                  setVehicleSearchQuery('');
                  setFormData((prev) => ({ ...prev, vehicleId: '' }));
                }}
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {showVehicleResults && (
  <div
    id="vehicle-results"
    className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base overflow-auto sm:text-sm"
  >
    {loadingVehicles ? (
      <div className="px-4 py-2 text-sm text-gray-500">Loading vehicles...</div>
    ) : filteredVehicles.length > 0 ? (
      filteredVehicles.map((vehicle) => (
        <div
          key={vehicle.id}
          className="cursor-pointer hover:bg-gray-100 px-4 py-2"
          onMouseDown={(e) => {
            e.preventDefault();
            setFormData((prev) => ({ ...prev, vehicleId: vehicle.id }));
            setVehicleSearchQuery(`${vehicle.make} ${vehicle.model} - ${vehicle.registrationNumber}`);
            setShowVehicleResults(false);
            setConditionData((prev) => ({ ...prev, mileage: vehicle.mileage || 0 }));

            setInsurancePerDayTouched(false);
            setInsurancePerWeekTouched(false);
          }}
          role="option"
          aria-selected={formData.vehicleId === vehicle.id}
        >
          <div className="flex items-center">
            <Car className="h-5 w-5 text-gray-400 mr-2" />
            <div className="flex-1">
              <div className="font-medium">
                {vehicle.make} {vehicle.model}
              </div>
              <div className="text-sm text-gray-500">
                {vehicle.registrationNumber}
                {vehicle.weeklyRentalPrice && ` - ${formatCurrency(vehicle.weeklyRentalPrice)}/week`}
              </div>
              
              {/* ✅ ADDED: Status Badge for Substitution or Availability Info */}
              {vehicle.message && (
                <div className={`mt-1 text-[10px] font-bold px-1.5 py-0.5 rounded border inline-block ${
                  (vehicle as any).isSubstitution 
                    ? 'bg-orange-50 text-orange-700 border-orange-200' 
                    : vehicle.message === 'Available now' 
                      ? 'bg-green-50 text-green-700 border-green-200' 
                      : 'bg-blue-50 text-blue-700 border-blue-200'
                }`}>
                  {vehicle.message}
                </div>
              )}
            </div>
            {formData.vehicleId === vehicle.id && (
              <span className="ml-auto text-primary-600 font-medium text-xs">Selected</span>
            )}
          </div>
        </div>
      ))
    ) : (
      <div className="px-4 py-2 text-sm text-gray-500">No available vehicles found</div>
    )}
  </div>
)}

          {!showVehicleResults && selectedVehicle && (
            <div className="mt-2 p-3 bg-white border border-gray-300 rounded-md flex items-center">
              <Car className="h-5 w-5 text-primary-600 mr-3 flex-shrink-0" />
              <div>
                <div className="font-semibold">
                  {selectedVehicle.make} {selectedVehicle.model}
                </div>
                <div className="text-sm text-gray-600">{selectedVehicle.registrationNumber}</div>
              </div>
            </div>
          )}

          {!showVehicleResults && !selectedVehicle && formData.vehicleId && (
            <div className="mt-2 p-3 bg-yellow-50 border border-yellow-300 rounded-md text-sm text-yellow-800">
              Warning: Vehicle with ID "{formData.vehicleId}" not found in the provided vehicle list.
            </div>
          )}
        </div>

        {/* Customer Search/Selection */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Customer</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              value={customerSearchQuery}
              onChange={(e) => {
                setCustomerSearchQuery(e.target.value);
                setShowCustomerResults(true);
              }}
              onFocus={() => setShowCustomerResults(true)}
              onBlur={() => setTimeout(() => setShowCustomerResults(false), 200)}
              placeholder="Search customers..."
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md bg-white placeholder-gray-500 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
              aria-autocomplete="list"
              aria-controls="customer-results"
            />
            {customerSearchQuery && !showCustomerResults && (
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                onClick={() => {
                  setCustomerSearchQuery('');
                  setFormData((prev) => ({ ...prev, customerId: '' }));
                }}
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {showCustomerResults && (
            <div
              id="customer-results"
              className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base overflow-auto sm:text-sm"
            >
              {filteredCustomers.length > 0 ? (
                filteredCustomers.map((customer) => (
                  <div
                    key={customer.id}
                    className="cursor-pointer hover:bg-gray-100 px-4 py-2"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setFormData((prev) => ({ ...prev, customerId: customer.id, signature: customer.signature || '' }));
                      setCustomerSearchQuery(`${customer.name} - ${customer.mobile}`);
                      setShowCustomerResults(false);
                    }}
                    role="option"
                    aria-selected={formData.customerId === customer.id}
                  >
                    <div className="flex items-center">
                      <div>
                        <div className="font-medium">{customer.name}</div>
                        <div className="text-sm text-gray-500">{customer.mobile}</div>
                      </div>
                      {formData.customerId === customer.id && (
                        <span className="ml-auto text-primary-600">Selected</span>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="px-4 py-2 text-sm text-gray-500">No customers found</div>
              )}
            </div>
          )}

          {!showCustomerResults && selectedCustomer && (
            <div className="mt-2 p-3 bg-white border border-gray-300 rounded-md flex items-center">
              <div>
                <div className="font-semibold">{selectedCustomer.name}</div>
                <div className="text-sm text-gray-600">{selectedCustomer.mobile}</div>
              </div>
            </div>
          )}

          {!showCustomerResults && !selectedCustomer && formData.customerId && (
            <div className="mt-2 p-3 bg-yellow-50 border border-yellow-300 rounded-md text-sm text-yellow-800">
              Warning: Customer with ID "{formData.customerId}" not found in the provided customer list.
            </div>
          )}
        </div>

        {/* Rental Details */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Rental Type</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData((prev) => ({ ...prev, type: e.target.value as any }))}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
              required
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="claim">Claim</option>
            </select>
          </div>

          {formData.type === 'claim' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-700">Claim Reference</label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={manualClaimRef}
                    onChange={(e) => setManualClaimRef(e.target.checked)}
                    className="rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <span className="text-sm text-gray-700">Enter Manually</span>
                </label>
              </div>

              {manualClaimRef ? (
                <FormField
                  label="Claim Reference"
                  value={formData.claimRef}
                  onChange={(e) => setFormData((prev) => ({ ...prev, claimRef: e.target.value }))}
                  placeholder="Enter claim reference"
                />
              ) : (
                <div className="space-y-2">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Search className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      value={claimSearchQuery}
                      onChange={(e) => {
                        setClaimSearchQuery(e.target.value);
                        setShowClaimResults(true);
                      }}
                      onFocus={() => setShowClaimResults(true)}
                      onBlur={() => setTimeout(() => setShowClaimResults(false), 200)}
                      placeholder="Search claims..."
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md bg-white placeholder-gray-500 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                    />
                  </div>
                  {showClaimResults && (
                    <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base overflow-auto sm:text-sm">
                      {filteredClaims.length > 0 ? (
                        filteredClaims.map((claim) => (
                          <div
                            key={claim.id}
                            className="cursor-pointer hover:bg-gray-100 px-4 py-2"
                            onMouseDown={() => {
                              const refStr = claim.clientRef || claim.id.slice(-8).toUpperCase();
                              setFormData((prev) => ({ ...prev, claimRef: refStr }));
                              setClaimSearchQuery(refStr);
                              setShowClaimResults(false);
                            }}
                          >
                            <div className="font-medium">{claim.clientRef || `Claim #${claim.id.slice(-8).toUpperCase()}`}</div>
                            <div className="text-sm text-gray-500">
                              {claim.clientInfo?.name} - {claim.clientVehicle?.registration}
                            </div>
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

          <div>
            <label className="block text-sm font-medium text-gray-700">Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData((prev) => ({ ...prev, status: e.target.value as any }))}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
              required
            >
              <option value="scheduled">Scheduled</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {/* Reason (base) + Substitute Type (only when Hire) */}
          <div className="col-span-2 grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Reason</label>
              <select
                value={baseReason}
                onChange={(e) => {
                  const next = e.target.value as BaseReason;
                  setBaseReason(next);

                  // if switching away from Hire, force variant back to normal
                  if (next !== 'hired') setHireVariant('normal');
                }}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                required
              >
                <option value="hired">Hire</option>
                <option value="claim">Claim</option>
                <option value="o/d">O/D</option>
                <option value="staff">Staff</option>
                <option value="workshop">Workshop</option>
              </select>
            </div>

            {baseReason === 'hired' ? (
              <div>
                <label className="block text-sm font-medium text-gray-700">Select Substitute</label>
                <select
                  value={hireVariant}
                  onChange={(e) => setHireVariant(e.target.value as HireVariant)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                >
                  <option value="normal">Normal Hire</option>
                  <option value="h-substitute">H Substitute</option>
                  <option value="c-substitute">C Substitute</option>
                </select>
              </div>
            ) : (
              <div className="hidden md:block" />
            )}
          </div>

          {/* System section with role-gated original start */}
          <div className="border-t pt-4 col-span-2">
            <h3 className="text-lg font-medium text-gray-900 mb-2">System</h3>
            <div className="grid grid-cols-2 gap-4">
              {isManager ? (
                <FormField
                  label="Original Rental Start Date"
                  type="datetime-local"
                  value={formData.originalStartDate}
                  onChange={(e) => setFormData((prev) => ({ ...prev, originalStartDate: e.target.value }))}
                  required
                />
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Original Rental Start Date</label>
                  <input
                    type="datetime-local"
                    value={formData.originalStartDate}
                    disabled
                    className="mt-1 block w-full rounded-md border-gray-300 bg-gray-100 text-gray-700 shadow-sm sm:text-sm cursor-not-allowed"
                  />
                  <p className="text-xs text-gray-500 mt-1">Only managers can edit this value.</p>
                </div>
              )}
            </div>
          </div>

          {/* Include overall VAT */}
          <div className="border-t pt-6 col-span-2">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="includeVAT"
                checked={formData.includeVAT}
                onChange={(e) => setFormData((prev) => ({ ...prev, includeVAT: e.target.checked }))}
                className="rounded border-gray-300 text-primary focus:ring-primary"
              />
              <label htmlFor="includeVAT" className="text-sm font-medium text-gray-700">
                Include Hire VAT (20%)
              </label>
            </div>
          </div>

          <FormField
            type="date"
            label="Start Date"
            value={formData.startDate}
            onChange={(e) => setFormData((prev) => ({ ...prev, startDate: e.target.value || '' }))}
            required
          />
          <FormField
            type="time"
            label="Start Time"
            value={formData.startTime}
            onChange={(e) => setFormData((prev) => ({ ...prev, startTime: e.target.value || '' }))}
            required
          />

          {(formData.type === 'daily' || formData.type === 'claim') && (
            <>
              <FormField
                type="date"
                label="End Date"
                value={formData.endDate}
                onChange={(e) => setFormData((prev) => ({ ...prev, endDate: e.target.value || '' }))}
                required
                min={formData.startDate}
              />
              <FormField
                type="time"
                label="End Time"
                value={formData.endTime}
                onChange={(e) => setFormData((prev) => ({ ...prev, endTime: e.target.value || '' }))}
                required
              />

              {/* --- Daily Insurance (per day) Input --- */}
              {formData.type === 'daily' && (
                <div className="col-span-2 border-t pt-4 mt-2">
                  {selectedVehicle && typeof (selectedVehicle as any).dailyInsuranceAmount === 'number' ? (
                    <p className="text-xs font-semibold text-blue-700 flex items-center gap-1 mb-2">
                      <Info className="h-3 w-3" /> Auto-filled from Vehicle (Daily Insurance). You can update if needed.
                    </p>
                  ) : (
                    <p className="text-xs font-semibold text-red-600 flex items-center gap-1 mb-2">
                      <AlertTriangle className="h-3 w-3" /> Enter the vehicle insurance amount — it wasn’t provided in the Vehicle page.
                    </p>
                  )}

                  <div className="flex items-end gap-2">
                    <div className="flex-grow">
                      <FormField
                        type="number"
                        label="Insurance Per Day (£)"
                        value={formData.insurancePerDay}
                        onChange={(e) => {
                          setInsurancePerDayTouched(true);
                          setFormData((prev) => ({ ...prev, insurancePerDay: parseFloat(e.target.value) || 0 }));
                        }}
                        min="0"
                        step="0.001"
                      />
                    </div>
                    <div className="flex items-center pb-2">
                      <input
                        type="checkbox"
                        id="insurancePerDayIncludeVAT_daily"
                        checked={formData.insurancePerDayIncludeVAT}
                        onChange={(e) => setFormData((prev) => ({ ...prev, insurancePerDayIncludeVAT: e.target.checked }))}
                        className="rounded border-gray-300 text-primary focus:ring-primary"
                      />
                      <label htmlFor="insurancePerDayIncludeVAT_daily" className="text-sm text-gray-700 ml-1">
                        VAT
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {formData.type === 'claim' && (
            <>
              {/* Delivery Charge with VAT */}
              <div className="flex items-end gap-2">
                <div className="flex-grow">
                  <FormField
                    type="number"
                    label="Delivery Charge (£)"
                    value={formData.deliveryCharge}
                    onChange={(e) => setFormData((prev) => ({ ...prev, deliveryCharge: parseFloat(e.target.value) || 0 }))}
                    min="0"
                    step="0.01"
                  />
                </div>
                <div className="flex items-center pb-2">
                  <input
                    type="checkbox"
                    id="deliveryChargeIncludeVAT"
                    checked={formData.deliveryChargeIncludeVAT}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, deliveryChargeIncludeVAT: e.target.checked }))
                    }
                    className="rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <label htmlFor="deliveryChargeIncludeVAT" className="text-sm text-gray-700 ml-1">
                    VAT
                  </label>
                </div>
              </div>

              {/* Collection Charge with VAT */}
              <div className="flex items-end gap-2">
                <div className="flex-grow">
                  <FormField
                    type="number"
                    label="Collection Charge (£)"
                    value={formData.collectionCharge}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, collectionCharge: parseFloat(e.target.value) || 0 }))
                    }
                    min="0"
                    step="0.01"
                  />
                </div>
                <div className="flex items-center pb-2">
                  <input
                    type="checkbox"
                    id="collectionChargeIncludeVAT"
                    checked={formData.collectionChargeIncludeVAT}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, collectionChargeIncludeVAT: e.target.checked }))
                    }
                    className="rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <label htmlFor="collectionChargeIncludeVAT" className="text-sm text-gray-700 ml-1">
                    VAT
                  </label>
                </div>
              </div>

              {/* Insurance Per Day with VAT (For Claim) */}
              <div className="flex items-end gap-2">
                <div className="flex-grow">
                  <FormField
                    type="number"
                    label="Insurance Per Day (£)"
                    value={formData.insurancePerDay}
                    onChange={(e) => {
                      setInsurancePerDayTouched(true);
                      setFormData((prev) => ({ ...prev, insurancePerDay: parseFloat(e.target.value) || 0 }))
                    }}
                    min="0"
                    step="0.001"
                  />
                </div>
                <div className="flex items-center pb-2">
                  <input
                    type="checkbox"
                    id="insurancePerDayIncludeVAT"
                    checked={formData.insurancePerDayIncludeVAT}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, insurancePerDayIncludeVAT: e.target.checked }))
                    }
                    className="rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <label htmlFor="insurancePerDayIncludeVAT" className="text-sm text-gray-700 ml-1">
                    VAT
                  </label>
                </div>
              </div>

              {/* Storage Details */}
              <div className="col-span-2 border-t pt-4 mt-4">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Storage Details</h3>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    type="date"
                    label="Storage Start Date"
                    value={formData.storageStartDate}
                    onChange={(e) => setFormData((prev) => ({ ...prev, storageStartDate: e.target.value || '' }))}
                  />
                  <FormField
                    type="date"
                    label="Storage End Date"
                    value={formData.storageEndDate}
                    onChange={(e) => setFormData((prev) => ({ ...prev, storageEndDate: e.target.value || '' }))}
                    min={formData.storageStartDate}
                  />

                  <div className="flex items-end gap-2">
                    <div className="flex-grow">
                      <FormField
                        type="number"
                        label="Storage Cost per Day (£)"
                        value={formData.storageCostPerDay}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, storageCostPerDay: parseFloat(e.target.value) || 0 }))
                        }
                        min="0"
                        step="0.01"
                      />
                    </div>
                    <div className="flex items-center pb-2">
                      <input
                        type="checkbox"
                        id="includeStorageVAT"
                        checked={formData.includeStorageVAT}
                        onChange={(e) => setFormData((prev) => ({ ...prev, includeStorageVAT: e.target.checked }))}
                        className="rounded border-gray-300 text-primary focus:ring-primary"
                      />
                      <label htmlFor="includeStorageVAT" className="text-sm text-gray-700 ml-1">
                        VAT
                      </label>
                    </div>
                  </div>

                  <div className="col-span-2 bg-gray-50 p-4 rounded-lg space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Days of Storage:</span>
                      <span>{formData.storageDays || 0} days</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Base Storage Cost:</span>
                      <span>£{((formData.storageDays || 0) * (formData.storageCostPerDay || 0)).toFixed(2)}</span>
                    </div>
                    {formData.includeStorageVAT && (
                      <div className="flex justify-between text-sm text-blue-600">
                        <span>VAT (20%):</span>
                        <span>
                          £
                          {((formData.storageDays || 0) * (formData.storageCostPerDay || 0) * 0.2).toFixed(2)}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm font-medium pt-2 border-t">
                      <span>Total Storage Cost:</span>
                      <span>
                        £
                        {(
                          (formData.storageDays || 0) *
                          (formData.storageCostPerDay || 0) *
                          (formData.includeStorageVAT ? 1.2 : 1)
                        ).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recovery Cost with VAT */}
              <div className="flex items-end gap-2 col-span-2">
                <div className="flex-grow">
                  <FormField
                    type="number"
                    label="Recovery Cost (£)"
                    value={formData.recoveryCost}
                    onChange={(e) => setFormData((prev) => ({ ...prev, recoveryCost: parseFloat(e.target.value) || 0 }))}
                    min="0"
                    step="0.01"
                  />
                </div>
                <div className="flex items-center pb-2">
                  <input
                    type="checkbox"
                    id="includeRecoveryCostVAT"
                    checked={formData.includeRecoveryCostVAT}
                    onChange={(e) => setFormData((prev) => ({ ...prev, includeRecoveryCostVAT: e.target.checked }))}
                    className="rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <label htmlFor="includeRecoveryCostVAT" className="text-sm text-gray-700 ml-1">
                    VAT
                  </label>
                </div>
              </div>
            </>
          )}

          {formData.type === 'weekly' && (
            <>
              <FormField
                type="number"
                label="Number of Weeks"
                value={formData.numberOfWeeks}
                onChange={(e) => {
                  const newWeeks = parseInt(e.target.value) || 1;
                  setHasModifiedWeeks(true);
                  setFormData((prev) => ({ ...prev, numberOfWeeks: newWeeks }));
                }}
                min="1"
                required
              />
              <div className="col-span-2 grid grid-cols-2 gap-4">
                <FormField
                  type="date"
                  label="End Date (auto‐calculated)"
                  value={formData.endDate}
                  onChange={(e) => setFormData((prev) => ({ ...prev, endDate: e.target.value || '' }))}
                  min={formData.startDate}
                />
                <FormField
                  type="time"
                  label="End Time"
                  value={formData.endTime}
                  onChange={(e) => setFormData((prev) => ({ ...prev, endTime: e.target.value || '' }))}
                />
              </div>

              {/* --- Weekly Insurance (per week) Input --- */}
              <div className="col-span-2 border-t pt-4 mt-2">
                {selectedVehicle && typeof (selectedVehicle as any).weeklyInsuranceAmount === 'number' ? (
                  <p className="text-xs font-semibold text-blue-700 flex items-center gap-1 mb-2">
                    <Info className="h-3 w-3" /> Auto-filled from Vehicle (Weekly Insurance). You can update if needed.
                  </p>
                ) : (
                  <p className="text-xs font-semibold text-red-600 flex items-center gap-1 mb-2">
                    <AlertTriangle className="h-3 w-3" /> Enter the vehicle insurance amount — it wasn’t provided in the Vehicle page.
                  </p>
                )}

                <div className="flex items-end gap-2">
                  <div className="flex-grow">
                    <FormField
                      type="number"
                      label="Insurance Per Week (£)"
                      value={formData.insurancePerWeek}
                      onChange={(e) => {
                        setInsurancePerWeekTouched(true);
                        setFormData((prev) => ({ ...prev, insurancePerWeek: parseFloat(e.target.value) || 0 }));
                      }}
                      min="0"
                      step="0.001"
                    />
                  </div>
                  <div className="flex items-center pb-2">
                    <input
                      type="checkbox"
                      id="insurancePerWeekIncludeVAT"
                      checked={formData.insurancePerWeekIncludeVAT}
                      onChange={(e) => setFormData((prev) => ({ ...prev, insurancePerWeekIncludeVAT: e.target.checked }))}
                      className="rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <label htmlFor="insurancePerWeekIncludeVAT" className="text-sm text-gray-700 ml-1">
                      VAT
                    </label>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* H Substitute details */}
        {formData.reason === 'h-substitute' && (
          <div className="border-t pt-4 mt-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Hire Substitution Details</h3>

            {formData.hireSubstitutionDetails.map((sub, index) => (
              <div key={index} className="border p-4 rounded-lg mb-6 bg-gray-50 relative">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="font-bold text-gray-800 flex items-center gap-2">
                    <Car className="w-4 h-4" /> Substitution Vehicle {index + 1}
                  </h4>
                  {formData.hireSubstitutionDetails.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeSubstitutionVehicle(index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  )}
                </div>

                {/* Fleet Picker */}
                <div className="mb-4">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Pick from Vehicles</label>
                  <div className="relative">
                      <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        value={subVehicleSearchQueries[index] || ''}
                        onChange={(e) => {
                            const val = e.target.value;
                            setSubVehicleSearchQueries((prev) => { const c = [...prev]; c[index] = val; return c; });
                            setShowSubVehicleResults((prev) => { const c = [...prev]; c[index] = true; return c; });
                        }}
                        onBlur={() => setTimeout(() => setShowSubVehicleResults(p => { const c=[...p]; c[index]=false; return c;}), 200)}
                        className="pl-10 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                        placeholder="Search fleet..."
                      />
                      {showSubVehicleResults[index] && (
                        <div className="absolute z-20 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 overflow-auto sm:text-sm">
                            {filteredSubVehicles(index).length ? (
                                filteredSubVehicles(index).map((v) => (
                                    <div
                                        key={v.id}
                                        className="cursor-pointer hover:bg-gray-100 px-4 py-2"
                                        onMouseDown={(e) => {
                                            e.preventDefault();
                                            pickSubVehicleFromFleet(index, v);
                                        }}
                                    >
                                        <div className="font-medium">{v.make} {v.model}</div>
                                        <div className="text-xs text-gray-500">{v.registrationNumber}</div>
                                    </div>
                                ))
                            ) : (
                                <div className="px-4 py-2 text-sm text-gray-500">No vehicles found</div>
                            )}
                        </div>
                      )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                   <FormField label="Make" name="make" value={sub.make} onChange={(e) => handleSubChange(index, e)} />
                   <FormField label="Model" name="model" value={sub.model} onChange={(e) => handleSubChange(index, e)} />
                   <FormField label="Registration" name="registration" value={sub.registration} onChange={(e) => handleSubChange(index, e)} />
                   <FormField label="Loaner/Provider" name="loaner" value={sub.loaner} onChange={(e) => handleSubChange(index, e)} />
                   <FormField label="Date Given" type="datetime-local" name="givenAt" value={sub.givenAt} onChange={(e) => handleSubChange(index, e)} />
                   <FormField label="Expected Return" type="datetime-local" name="expectedReturnAt" value={sub.expectedReturnAt} onChange={(e) => handleSubChange(index, e)} />
                </div>

                {/* Substitution Condition Report */}
                <div className="bg-white p-4 rounded border border-gray-200">
                    <h5 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600" /> Condition Report
                    </h5>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        {/* Mileage */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Mileage Out</label>
                            <div className="relative mt-1">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Gauge className="h-4 w-4 text-gray-400" />
                                </div>
                                <input
                                    type="number"
                                    name="mileage"
                                    value={sub.mileage}
                                    onChange={(e) => handleSubChange(index, e)}
                                    className="pl-10 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                                />
                            </div>
                        </div>

                        {/* Fuel */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Fuel Level</label>
                            <div className="relative mt-1">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Fuel className="h-4 w-4 text-gray-400" />
                                </div>
                                <select
                                    name="fuelLevel"
                                    value={sub.fuelLevel}
                                    onChange={(e) => handleSubChange(index, e)}
                                    className="pl-10 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
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

                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="flex items-center space-x-2 border p-2 rounded bg-gray-50">
                            <input
                                type="checkbox"
                                id={`sub_clean_${index}`}
                                name="isClean"
                                checked={sub.isClean}
                                onChange={(e) => handleSubChange(index, e)}
                                className="rounded border-gray-300 text-primary focus:ring-primary"
                            />
                            <label htmlFor={`sub_clean_${index}`} className="text-sm text-gray-700">Vehicle is Clean</label>
                        </div>
                        <div className="flex items-center space-x-2 border p-2 rounded bg-gray-50">
                            <input
                                type="checkbox"
                                id={`sub_damage_${index}`}
                                name="hasDamage"
                                checked={sub.hasDamage}
                                onChange={(e) => handleSubChange(index, e)}
                                className="rounded border-gray-300 text-primary focus:ring-primary"
                            />
                            <label htmlFor={`sub_damage_${index}`} className="text-sm text-gray-700">Has Damage</label>
                        </div>
                    </div>

                    {sub.hasDamage && (
                        <div className="mb-4">
                            <TextArea 
                                label="Damage Description" 
                                name="damageDescription" 
                                value={sub.damageDescription} 
                                onChange={(e) => handleSubChange(index, e)} 
                            />
                        </div>
                    )}

                    {/* Sub Images */}
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">Condition Images</label>
                        
                        {/* Existing Sub Images */}
                        {sub.images && sub.images.length > 0 && (
                            <div className="grid grid-cols-4 gap-2 mb-2">
                                {sub.images.map((url, imgIdx) => (
                                    <div key={imgIdx} className="relative group">
                                        <img src={url} alt="Sub Condition" className="w-full h-16 object-cover rounded border" />
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveExistingSubImage(index, url)}
                                            className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        <FileUpload
                            label={sub.images.length > 0 ? "Add More Images" : "Upload Images"}
                            accept="image/*"
                            multiple
                            onChange={(files) => setSubNewImages(prev => ({ ...prev, [index]: files }))}
                            showPreview
                        />
                    </div>
                </div>

                <div className="mt-4">
                      <TextArea label="General Notes" name="notes" value={sub.notes} onChange={(e) => handleSubChange(index, e)} rows={2} />
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={addSubstitutionVehicle}
              className="mt-2 flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <Plus className="h-5 w-5 mr-2" />
              Add Another Substitution Vehicle
            </button>
          </div>
        )}

        {/* Negotiation Section */}
        <div className="border-t pt-4">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Rate Negotiation</h3>
          <div className="space-y-4">
            <FormField
              type="number"
              label="Negotiated Rate (Optional)"
              value={formData.negotiatedRate}
              onChange={(e) => setFormData((prev) => ({ ...prev, negotiatedRate: e.target.value }))}
              min="0"
              step="0.01"
              placeholder={`Enter custom ${formData.type === 'weekly' ? 'weekly' : 'daily'} rate`}
            />
            {formData.negotiatedRate && (
              <TextArea
                label="Negotiation Notes"
                value={formData.negotiationNotes}
                onChange={(e) => setFormData((prev) => ({ ...prev, negotiationNotes: e.target.value }))}
                rows={2}
                placeholder="Add notes about rate negotiation..."
              />
            )}
          </div>
        </div>

        {/* Discount Section */}
        <div className="border-t pt-4">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Discount</h3>
          <div className="space-y-4">
            <FormField
              type="number"
              label="Discount Percentage"
              value={formData.discountPercentage}
              onChange={(e) => {
                const pct = parseFloat(e.target.value) || 0;
                setFormData((prev) => ({ ...prev, discountPercentage: pct }));
                setLastEditedField('percentage');
              }}
              min="0"
              max="100"
              step="0.01"
            />
            <FormField
              type="number"
              label="Discount Amount (£)"
              value={formData.discountAmount}
              onChange={(e) => {
                const amt = parseFloat(e.target.value) || 0;
                setFormData((prev) => ({ ...prev, discountAmount: amt }));
                setLastEditedField('amount');
              }}
              min="0"
              step="0.01"
            />
            {(formData.discountPercentage > 0 || formData.discountAmount > 0) && (
              <TextArea
                label="Discount Notes"
                value={formData.discountNotes}
                onChange={(e) => setFormData((prev) => ({ ...prev, discountNotes: e.target.value }))}
                rows={2}
                placeholder="Add notes about the discount..."
                required={formData.discountPercentage > 0 || formData.discountAmount > 0}
              />
            )}
          </div>
        </div>

        {/* Cost Summary */}
        <div className="border-t pt-4">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Cost Summary</h3>
          <div className="bg-gray-50 p-4 rounded-lg space-y-2">
            
            {/* 1. Base Cost (Raw) */}
            <div className="flex justify-between text-sm">
              <span>Base Rental Cost:</span>
              <span className="font-medium">
                {formatCurrency(
                  calculateRentalCost(
                    new Date(`${formData.startDate}T${formData.startTime}`),
                    new Date(`${formData.endDate}T${formData.endTime}`),
                    formData.type,
                    selectedVehicle!,
                    formData.reason,
                    formData.negotiatedRate ? parseFloat(formData.negotiatedRate) : undefined,
                    0,0,0,0,0,0,
                    false, false, false, false, false, false
                  )
                )}
              </span>
            </div>

            {/* 2. Hire VAT (Only if checked) */}
            {formData.includeVAT && (
               <div className="flex justify-between text-sm text-blue-600">
                 <span>Hire VAT (20%):</span>
                 <span className="font-medium">
                   {formatCurrency(
                     calculateRentalCost(
                       new Date(`${formData.startDate}T${formData.startTime}`),
                       new Date(`${formData.endDate}T${formData.endTime}`),
                       formData.type,
                       selectedVehicle!,
                       formData.reason,
                       formData.negotiatedRate ? parseFloat(formData.negotiatedRate) : undefined,
                       0,0,0,0,0,0,
                       false, false, false, false, false, false
                     ) * 0.2
                   )}
                 </span>
               </div>
            )}

            {/* Separator for Extras */}
            <div className="border-t border-gray-200 my-1"></div>

            {/* 3. Extras Breakdown */}
            {formData.type === 'claim' &&
              formData.storageStartDate &&
              formData.storageEndDate &&
              formData.storageCostPerDay > 0 && (
                <div className="flex justify-between text-sm">
                  <span>
                    Storage Cost ({formData.storageDays || 0} days)
                    {formData.includeStorageVAT ? ' (Inc. VAT)' : ''}:
                  </span>
                  <span className="font-medium">
                    {formatCurrency(
                      (formData.storageDays || 0) *
                        (formData.storageCostPerDay || 0) *
                        (formData.includeStorageVAT ? 1.2 : 1)
                    )}
                  </span>
                </div>
              )}

            {formData.type === 'claim' && formData.recoveryCost > 0 && (
              <div className="flex justify-between text-sm">
                <span>Recovery Cost{formData.includeRecoveryCostVAT ? ' (Inc. VAT)' : ''}:</span>
                <span className="font-medium">
                  {formatCurrency(formData.recoveryCost * (formData.includeRecoveryCostVAT ? 1.2 : 1))}
                </span>
              </div>
            )}

            {formData.deliveryCharge > 0 && (
              <div className="flex justify-between text-sm">
                <span>Delivery Charge{formData.deliveryChargeIncludeVAT ? ' (Inc. VAT)' : ''}:</span>
                <span className="font-medium">
                  {formatCurrency(formData.deliveryCharge * (formData.deliveryChargeIncludeVAT ? 1.2 : 1))}
                </span>
              </div>
            )}

            {formData.collectionCharge > 0 && (
              <div className="flex justify-between text-sm">
                <span>Collection Charge{formData.collectionChargeIncludeVAT ? ' (Inc. VAT)' : ''}:</span>
                <span className="font-medium">
                  {formatCurrency(
                    formData.collectionCharge * (formData.collectionChargeIncludeVAT ? 1.2 : 1)
                  )}
                </span>
              </div>
            )}

            {/* Insurance Display */}
            {((formData.type === 'weekly' ? formData.insurancePerWeek > 0 : formData.insurancePerDay > 0) &&
              formData.startDate &&
              formData.endDate &&
              (() => {
                const start = new Date(`${formData.startDate}T${formData.startTime}`);
                const end = new Date(`${formData.endDate}T${formData.endTime}`);
                if (isValid(start) && isValid(end) && !isAfter(start, end)) {
                  if (formData.type === 'weekly') {
                    const weeks = Number(formData.numberOfWeeks || 1);
                    const insuranceCost =
                      weeks * (formData.insurancePerWeek || 0) * (formData.insurancePerWeekIncludeVAT ? 1.2 : 1);
                    return (
                      <div className="flex justify-between text-sm">
                        <span>
                          Insurance ({weeks} week{weeks === 1 ? '' : 's'})
                          {formData.insurancePerWeekIncludeVAT ? ' (Inc. VAT)' : ''}:
                        </span>
                        <span className="font-medium">{formatCurrency(insuranceCost)}</span>
                      </div>
                    );
                  }

                  // ✅ FIXED LOGIC HERE: Use differenceInHours / 24 rounded up
                  const hours = differenceInHours(end, start);
                  const days = hours <= 0 ? 1 : Math.ceil(hours / 24);
                  
                  const insuranceCost =
                    days * (formData.insurancePerDay || 0) * (formData.insurancePerDayIncludeVAT ? 1.2 : 1);
                  return (
                    <div className="flex justify-between text-sm">
                      <span>
                        Insurance ({days} day{days === 1 ? '' : 's'})
                        {formData.insurancePerDayIncludeVAT ? ' (Inc. VAT)' : ''}:
                      </span>
                      <span className="font-medium">{formatCurrency(insuranceCost)}</span>
                    </div>
                  );
                }
                return null;
              })())}

            {/* 4. Gross Subtotal */}
            <div className="flex justify-between text-sm pt-2 border-t font-semibold text-gray-700">
              <span>Subtotal (Gross):</span>
              <span className="font-medium">{formatCurrency(currentTotalCost)}</span>
            </div>

            {currentDiscountAmount > 0 && (
              <div className="flex justify-between text-sm text-green-600">
                <span>Discount ({formData.discountPercentage}%):</span>
                <span>-{formatCurrency(currentDiscountAmount)}</span>
              </div>
            )}

            {/* 5. Total Due */}
            <div className="flex justify-between text-lg font-semibold pt-2 border-t mt-2">
              <span>Total Amount Due:</span>
              <span className="font-medium">{formatCurrency(currentFinalCostAfterDiscount)}</span>
            </div>

            <div className="flex justify-between text-sm text-green-600">
              <span>Amount Paid (Previously):</span>
              <span>{formatCurrency(rental.paidAmount || 0)}</span>
            </div>

            <div className="flex justify-between text-sm font-medium text-red-600">
              <span>Remaining Amount Due:</span>
              <span>{formatCurrency(currentRemainingAmount)}</span>
            </div>

            <div className="flex justify-between text-sm font-medium pt-2 border-t">
              <span>Payment Status:</span>
              <span
                className={`capitalize font-semibold ${
                  (rental.paidAmount || 0) + (formData.amountToAdd || 0) >= currentFinalCostAfterDiscount - 0.001
                    ? 'text-green-600'
                    : (rental.paidAmount || 0) + (formData.amountToAdd || 0) > 0
                    ? 'text-orange-600'
                    : 'text-red-600'
                }`}
              >
                {(rental.paidAmount || 0) + (formData.amountToAdd || 0) >= currentFinalCostAfterDiscount - 0.001
                  ? 'Paid'
                  : (rental.paidAmount || 0) + (formData.amountToAdd || 0) > 0
                  ? 'Partially Paid'
                  : 'Pending'}
              </span>
            </div>
          </div>
        </div>

        {/* Vehicle Condition Section */}
        <div className="border-t pt-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
            <Car className="w-5 h-5 text-gray-500" /> Main Vehicle Check-Out Condition
          </h3>
          <div className="space-y-6 bg-white p-4 rounded-lg border border-gray-200">
            {/* Mileage Box */}
            <div className="p-4 bg-blue-50 border-l-4 border-blue-500 rounded">
              <label className="block text-sm font-bold text-gray-800 mb-1">
                Mileage at Check-Out
              </label>
              <input
                type="number"
                value={conditionData.mileage}
                onChange={(e) => setConditionData((prev) => ({ ...prev, mileage: Number(e.target.value) || 0 }))}
                min={rental.checkOutCondition?.mileage ?? selectedVehicle?.mileage ?? 0}
                className="block w-full border-2 border-blue-300 rounded-md py-2 px-3 focus:border-blue-500 focus:ring-blue-500 font-mono text-lg"
                required
              />
              <p className="text-xs font-semibold text-blue-700 mt-1 flex items-center gap-1">
                <Info className="w-3 h-3" /> Please update to the latest vehicle mileage
              </p>
            </div>

            {/* Fuel Box */}
            <div className="p-4 bg-orange-50 border-l-4 border-orange-500 rounded">
              <label className="block text-sm font-bold text-gray-800 mb-1">
                Fuel Level
              </label>
              <select
                value={conditionData.fuelLevel as any}
                onChange={(e) => setConditionData((prev) => ({ ...prev, fuelLevel: e.target.value as any }))}
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
                  onChange={(e) => setConditionData((prev) => ({ ...prev, isClean: e.target.checked }))}
                  className="rounded border-gray-300 text-primary focus:ring-primary"
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
                  onChange={(e) => setConditionData((prev) => ({ ...prev, hasDamage: e.target.checked }))}
                  className="rounded border-gray-300 text-primary focus:ring-primary"
                />
                <label htmlFor="hasDamage" className="text-sm font-medium text-gray-700">
                  Vehicle has damage
                </label>
              </div>
            </div>

            {conditionData.hasDamage && (
              <TextArea
                label="Damage Description"
                value={conditionData.damageDescription as any}
                onChange={(e) => setConditionData((prev) => ({ ...prev, damageDescription: e.target.value }))}
                required={!!conditionData.hasDamage}
              />
            )}

            {existingImages.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Existing Images ({existingImages.length})
                </label>
                <div className="grid grid-cols-3 gap-4">
                  {existingImages.map((url, idx) => (
                    <div key={idx} className="relative group">
                      <img
                        src={url}
                        alt={`Condition ${idx + 1}`}
                        className="w-full h-32 object-cover rounded-lg border border-gray-200"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveExistingImage(url)}
                        className="absolute -top-2 -right-2 bg-red-500 rounded-full p-1 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Remove Image"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <FileUpload
              label="Add New Condition Images"
              accept="image/*"
              multiple
              onChange={setNewImages}
              showPreview
            />
          </div>
        </div>

        {/* Add New Payment */}
        <div className="border-t pt-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Add New Payment</h3>
          <p className="text-sm text-gray-500 mb-3">Record a new payment made towards this rental's balance.</p>
          <div className="space-y-4">
            <FormField
              type="number"
              label="Amount to Add (£)"
              value={formData.amountToAdd}
              onChange={(e) => setFormData((prev) => ({ ...prev, amountToAdd: parseFloat(e.target.value) || 0 }))}
              min="0"
              max={Math.max(0, currentRemainingAmount)}
              step="0.01"
            />
            <div>
              <label className="block text-sm font-medium text-gray-700">Payment Method</label>
              <select
                value={formData.paymentMethod}
                onChange={(e) => setFormData((prev) => ({ ...prev, paymentMethod: e.target.value as any }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                disabled={formData.amountToAdd <= 0}
              >
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="cheque">Cheque</option>
              </select>
            </div>
            <FormField
              label="Payment Reference (Optional)"
              value={formData.paymentReference}
              onChange={(e) => setFormData((prev) => ({ ...prev, paymentReference: e.target.value }))}
              placeholder="Transaction ID, check number, etc."
              disabled={formData.amountToAdd <= 0}
            />
            <TextArea
              label="Payment Notes (Optional)"
              value={formData.paymentNotes}
              onChange={(e) => setFormData((prev) => ({ ...prev, paymentNotes: e.target.value }))}
              rows={2}
              placeholder="Notes about this specific payment"
              disabled={formData.amountToAdd <= 0}
            />
          </div>
        </div>

        {/* Customer Signature */}
        <div className="border-t pt-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Customer Signature</label>
          <p className="text-sm text-gray-500 mb-3">If changes require re-confirmation, ask the customer to sign again.</p>
          <SignaturePad
            value={formData.signature}
            onChange={(signature) => setFormData((prev) => ({ ...prev, signature }))}
            className="mt-1 border rounded-md"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 border-t pt-6 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || !selectedVehicle || !selectedCustomer}
            className={`inline-flex justify-center px-4 py-2 text-sm font-medium text-white border border-transparent rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 ${
              loading || !selectedVehicle || !selectedCustomer
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-primary hover:bg-primary-dark focus:ring-primary'
            }`}
          >
            {loading ? 'Updating...' : 'Update Rental'}
          </button>
        </div>
      </form>

      {/* CONFIRMATION MODAL (Edit) */}
      <Modal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        title="Confirm Rental Update"
        size="lg"
      >
        <div className="space-y-6">
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r flex items-start gap-3">
            <Info className="h-6 w-6 text-blue-500 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-medium text-blue-800">Please Review</h3>
              <p className="text-sm text-blue-700 mt-1">
                Review the details below. You can update the Status, Reason, Dates, Mileage, Fuel, and (if applicable) the latest substitution times right here before saving.
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
            {/* Status */}
            <div className="bg-white p-4 rounded border shadow-sm">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData((prev) => ({ ...prev, status: e.target.value as any }))}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
              >
                <option value="scheduled">Scheduled</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            {/* Reason + Substitute */}
            <div className="bg-white p-4 rounded border shadow-sm">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Reason</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <select
                  value={baseReason}
                  onChange={(e) => {
                    const next = e.target.value as BaseReason;
                    setBaseReason(next);
                    if (next !== 'hired') setHireVariant('normal');
                  }}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                >
                  <option value="hired">Hire</option>
                  <option value="claim">Claim</option>
                  <option value="o/d">O/D</option>
                  <option value="staff">Staff</option>
                  <option value="workshop">Workshop</option>
                </select>

                {baseReason === 'hired' ? (
                  <select
                    value={hireVariant}
                    onChange={(e) => setHireVariant(e.target.value as HireVariant)}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                  >
                    <option value="normal">Normal Hire</option>
                    <option value="h-substitute">H Substitute</option>
                    <option value="c-substitute">C Substitute</option>
                  </select>
                ) : (
                  <div className="hidden sm:block" />
                )}
              </div>
            </div>

            {/* Dates */}
            <div className="bg-white p-4 rounded border shadow-sm">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Start Date</label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData((prev) => ({ ...prev, startDate: e.target.value }))}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
              />
            </div>

            <div className="bg-white p-4 rounded border shadow-sm">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">End Date</label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData((prev) => ({ ...prev, endDate: e.target.value }))}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
              />
            </div>

            {/* Latest substitution confirmation */}
            {formData.reason === 'h-substitute' && latestSubIndex >= 0 && (
              <div className="md:col-span-2 bg-white p-4 rounded border shadow-sm">
                <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  Confirm Latest Substitution Times
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                      Date & Time Given
                    </label>
                    <input
                      type="datetime-local"
                      value={formData.hireSubstitutionDetails[latestSubIndex].givenAt}
                      onChange={(e) => {
                        const newSubs = [...formData.hireSubstitutionDetails];
                        newSubs[latestSubIndex] = { ...newSubs[latestSubIndex], givenAt: e.target.value };
                        setFormData((prev) => ({ ...prev, hireSubstitutionDetails: newSubs }));
                      }}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                      Date & Time Expected Return
                    </label>
                    <input
                      type="datetime-local"
                      value={formData.hireSubstitutionDetails[latestSubIndex].expectedReturnAt}
                      onChange={(e) => {
                        const newSubs = [...formData.hireSubstitutionDetails];
                        newSubs[latestSubIndex] = { ...newSubs[latestSubIndex], expectedReturnAt: e.target.value };
                        setFormData((prev) => ({ ...prev, hireSubstitutionDetails: newSubs }));
                      }}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                    />
                  </div>

                  <div className="md:col-span-2 text-sm text-gray-700 bg-gray-50 border rounded p-3">
                    <div className="font-semibold mb-1">
                      {formData.hireSubstitutionDetails[latestSubIndex].make}{' '}
                      {formData.hireSubstitutionDetails[latestSubIndex].model}{' '}
                      <span className="font-mono text-gray-600">
                        ({formData.hireSubstitutionDetails[latestSubIndex].registration})
                      </span>
                    </div>
                    {formData.hireSubstitutionDetails[latestSubIndex].loaner && (
                      <div className="text-gray-600">Provider: {formData.hireSubstitutionDetails[latestSubIndex].loaner}</div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Condition verify */}
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
                      value={Number(conditionData.mileage || 0)}
                      onChange={(e) => setConditionData((prev) => ({ ...prev, mileage: parseInt(e.target.value) || 0 }))}
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
                    value={conditionData.fuelLevel as any}
                    onChange={(e) => setConditionData((prev) => ({ ...prev, fuelLevel: e.target.value as any }))}
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
              onClick={executeUpdateRental}
              disabled={loading}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              {loading ? (
                'Updating...'
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Confirm & Update
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default RentalEditModal;
