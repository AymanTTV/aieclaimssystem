// src/components/rentals/RentalEditModal.tsx
import React, { useEffect, useMemo, useState, useRef } from 'react';
import { doc, updateDoc, Timestamp, query, collection, getDocs, orderBy, limit } from 'firebase/firestore';
import { db, storage } from '../../lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Rental, Vehicle, Customer, VehicleCondition, Claim, RentalPayment, HireSubstitutionDetails, RentalExtraCharge } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { calculateRentalCostDetailed, RENTAL_RATES } from '../../utils/rentalCalculations';
import { generateRentalDocuments } from '../../utils/generateRentalDocuments';
import { uploadRentalDocuments } from '../../utils/uploadRentalDocuments';
import FormField from '../ui/FormField';
import TextArea from '../ui/TextArea';
import FileUpload from '../ui/FileUpload';
import SignaturePad from '../ui/SignaturePad';
import Modal from '../ui/Modal';
import { X, Search, Car, User, Plus, Info, CheckCircle, AlertTriangle, Fuel, Gauge, PoundSterling, FileText, CreditCard, Trash2 } from 'lucide-react';
import { addWeeks, format, differenceInDays, isAfter, isValid } from 'date-fns';
import toast from 'react-hot-toast';
import { createFinanceTransaction } from '../../utils/financeTransactions';
import { useFormattedDisplay } from '../../hooks/useFormattedDisplay';
import { useAvailableVehicles } from '../../hooks/useAvailableVehicles';

type BaseReason = 'hired' | 'claim' | 'o/d' | 'staff' | 'workshop';
type HireVariant = 'normal' | 'h-substitute' | 'c-substitute';
type SubForm = Omit<HireSubstitutionDetails, 'givenAt' | 'expectedReturnAt'> & { givenAt: string; expectedReturnAt: string; mileage: number | ''; fuelLevel: string; isClean: boolean; hasDamage: boolean; damageDescription: string; images: string[]; };

const newSubDetail = (): SubForm => ({ make: '', model: '', registration: '', loaner: '', givenAt: '', expectedReturnAt: '', notes: '', mileage: 0, fuelLevel: '100', isClean: true, hasDamage: false, damageDescription: '', images: [] });

interface RentalEditModalProps {
  rental: Rental; vehicles: Vehicle[]; customers: Customer[]; onClose: () => void;
}

const RentalEditModal: React.FC<RentalEditModalProps> = ({ rental, vehicles, customers, onClose }) => {
  const { user } = useAuth();
  const isManager = user?.role === 'manager';
  const { formatCurrency } = useFormattedDisplay();
  const topRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'setup' | 'finance' | 'condition' | 'payment'>('setup');
  const [newImages, setNewImages] = useState<File[]>([]);
  const [subNewImages, setSubNewImages] = useState<Record<number, File[]>>({});
  const [vehicleSearchQuery, setVehicleSearchQuery] = useState('');
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [showVehicleResults, setShowVehicleResults] = useState(false);
  const [showCustomerResults, setShowCustomerResults] = useState(false);
  const [hasModifiedWeeks, setHasModifiedWeeks] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const [insurancePerDayTouched, setInsurancePerDayTouched] = useState<boolean>(() => rental.insurancePerDay != null);
  const [insurancePerWeekTouched, setInsurancePerWeekTouched] = useState<boolean>(() => (rental as any).insurancePerWeek != null);
  const isFirstRender = useRef(true);

  const [rentalAgreementNumber, setRentalAgreementNumber] = useState(rental.rentalAgreementNumber || '');
  const [existingImages, setExistingImages] = useState<string[]>(rental.checkOutCondition?.images || []);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [claimSearchQuery, setClaimSearchQuery] = useState('');
  const [showClaimResults, setShowClaimResults] = useState(false);
  const [manualClaimRef, setManualClaimRef] = useState(true);

  useEffect(() => {
    const checkAndFillAgreementNumber = async () => {
      if (!rental.rentalAgreementNumber && !rentalAgreementNumber) {
        try {
          const q = query(collection(db, 'rentals'), orderBy('rentalAgreementNumber', 'desc'), limit(1));
          const snapshot = await getDocs(q);
          let nextNum = 1;
          if (!snapshot.empty) {
            const lastData = snapshot.docs[0].data();
            const lastNumStr = lastData.rentalAgreementNumber;
            if (lastNumStr && !isNaN(parseInt(lastNumStr))) nextNum = parseInt(lastNumStr) + 1;
          }
          setRentalAgreementNumber(String(nextNum).padStart(4, '0'));
        } catch (e) {}
      }
    };
    checkAndFillAgreementNumber();
  }, [rental.rentalAgreementNumber, rentalAgreementNumber]);

  const safeFormatDate = (dateInput: Date | Timestamp | string | null | undefined, formatString: string): string => {
    if (!dateInput) return '';
    let dateObj: Date | null = null;
    if (dateInput instanceof Date) dateObj = dateInput;
    else if (typeof (dateInput as any)?.toDate === 'function') dateObj = (dateInput as Timestamp).toDate();
    else { const parsed = new Date(dateInput as any); if (isValid(parsed)) dateObj = parsed; }
    return dateObj && isValid(dateObj) ? format(dateObj, formatString) : '';
  };

  const initialSubForms: SubForm[] = useMemo(() => {
    return (rental.hireSubstitutionDetails || []).map((sub: any) => {
      const fleetVehicle = vehicles.find(v => (v.registrationNumber || '').toLowerCase() === (sub.registration || '').toLowerCase());
      return {
        ...sub, givenAt: safeFormatDate(sub.givenAt, "yyyy-MM-dd'T'HH:mm"), expectedReturnAt: safeFormatDate(sub.expectedReturnAt, "yyyy-MM-dd'T'HH:mm"),
        mileage: sub.mileage !== undefined ? sub.mileage : (fleetVehicle?.mileage || 0), fuelLevel: sub.fuelLevel || '100', isClean: sub.isClean !== undefined ? sub.isClean : true,
        hasDamage: sub.hasDamage || false, damageDescription: sub.damageDescription || '', images: sub.images || []
      };
    });
  }, [rental.id, vehicles]);

  const getBaseAmount = (amount: number | undefined | null, includesVAT: boolean | undefined | null) => {
    if (!amount) return 0;
    if (includesVAT) return parseFloat((amount / 1.2).toFixed(2));
    return amount;
  };

  const buildInitialFormData = () => ({
    vehicleId: rental.vehicleId, customerId: rental.customerId,
    startDate: safeFormatDate(rental.startDate, 'yyyy-MM-dd'), startTime: safeFormatDate(rental.startDate, 'HH:mm'),
    endDate: safeFormatDate(rental.endDate, 'yyyy-MM-dd'), endTime: safeFormatDate(rental.endDate, 'HH:mm'),
    type: rental.type, reason: rental.reason, status: rental.status, signature: rental.signature || '', numberOfWeeks: rental.numberOfWeeks || 1, claimRef: rental.claimRef || '',
    deliveryCharge: rental.deliveryCharge || 0, 
    collectionCharge: rental.collectionCharge || 0,
    insurancePerDay: rental.insurancePerDay ?? 0, insurancePerWeek: (rental as any).insurancePerWeek ?? 0,
    recoveryCost: rental.recoveryCost || 0, includeRecoveryCostVAT: rental.includeRecoveryCostVAT || false,
    storageStartDate: safeFormatDate(rental.storageStartDate, 'yyyy-MM-dd'), storageEndDate: safeFormatDate(rental.storageEndDate, 'yyyy-MM-dd'),
    storageCostPerDay: rental.storageCostPerDay || 0, storageDays: rental.storageDays || 0, includeStorageVAT: rental.includeStorageVAT || false,
    includeVAT: rental.includeVAT || false, deliveryChargeIncludeVAT: rental.deliveryChargeIncludeVAT || false, collectionChargeIncludeVAT: rental.collectionChargeIncludeVAT || false,
    insurancePerDayIncludeVAT: rental.insurancePerDayIncludeVAT || false, insurancePerWeekIncludeVAT: (rental as any).insurancePerWeekIncludeVAT || false,
    negotiatedRate: rental.negotiatedRate?.toString() || '', negotiationNotes: rental.negotiationNotes || '',
    discountPercentage: rental.discountPercentage || 0, discountAmount: rental.discountAmount || 0, discountNotes: rental.discountNotes || '',
    originalStartDate: safeFormatDate((rental.originalStartDate ?? rental.startDate) as any, "yyyy-MM-dd'T'HH:mm"),
    amountToAdd: 0, paymentMethod: 'cash' as const, paymentReference: '', paymentNotes: '',
    hireSubstitutionDetails: initialSubForms.length ? initialSubForms : [newSubDetail()],
    extraCharges: rental.extraCharges || []
  });

  const [formData, setFormData] = useState(buildInitialFormData);

  useEffect(() => {
    setFormData(buildInitialFormData());
    setExistingImages(rental.checkOutCondition?.images || []);
    setConditionData(rental.checkOutCondition ?? { mileage: 0, fuelLevel: '100', isClean: true, hasDamage: false, damageDescription: '', images: [] });
    setInsurancePerDayTouched(rental.insurancePerDay != null);
    setInsurancePerWeekTouched((rental as any).insurancePerWeek != null);
    isFirstRender.current = true; setHasModifiedWeeks(false); setInitialized(false); setSubNewImages({}); 
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
    const desiredReason = baseReason !== 'hired' ? baseReason : hireVariant === 'normal' ? 'hired' : hireVariant;
    if (formData.reason !== desiredReason) setFormData((prev) => ({ ...prev, reason: desiredReason as any }));
  }, [baseReason, hireVariant]);

  useEffect(() => {
    const { base, variant } = deriveReasonUI(formData.reason);
    if (base !== baseReason) setBaseReason(base);
    if (variant !== hireVariant) setHireVariant(variant);
  }, [formData.reason]);

  const selectedVehicle = vehicles.find((v) => v.id === formData.vehicleId);
  const selectedCustomer = customers.find((c) => c.id === formData.customerId);

  const [conditionData, setConditionData] = useState<Partial<VehicleCondition> & { mileage: number | '' }>(
    { ...(rental.checkOutCondition ?? { mileage: 0, fuelLevel: '100', isClean: true, hasDamage: false, damageDescription: '', images: [] }) }
  );

  useEffect(() => {
    if (isFirstRender.current || !selectedVehicle) return;
    if (formData.type === 'daily' && !insurancePerDayTouched) setFormData(p => ({ ...p, insurancePerDay: (selectedVehicle as any).dailyInsuranceAmount || 0 }));
    if (formData.type === 'claim' && !insurancePerDayTouched) setFormData(p => ({ ...p, insurancePerDay: (selectedVehicle as any).claimInsuranceAmount || 0 }));
    if (formData.type === 'weekly' && !insurancePerWeekTouched) setFormData(p => ({ ...p, insurancePerWeek: (selectedVehicle as any).weeklyInsuranceAmount || 0 }));
  }, [selectedVehicle?.id, formData.type, insurancePerDayTouched, insurancePerWeekTouched]);

  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    setInsurancePerDayTouched(false); setInsurancePerWeekTouched(false);
  }, [formData.type]);

  useEffect(() => {
    if (selectedVehicle) setVehicleSearchQuery(`${selectedVehicle.make} ${selectedVehicle.model} - ${selectedVehicle.registrationNumber}`);
    if (selectedCustomer) setCustomerSearchQuery(`${selectedCustomer.name} - ${selectedCustomer.mobile}`);
    if (rental.claimRef) { setClaimSearchQuery(rental.claimRef); setManualClaimRef(true); } else setManualClaimRef(false);
  }, [selectedVehicle?.id, selectedCustomer?.id, rental.claimRef]);

  useEffect(() => {
    const fetchClaims = async () => {
      try {
        const snap = await getDocs(query(collection(db, 'claims')));
        setClaims(snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Claim[]);
      } catch { }
    };
    fetchClaims();
  }, []);

  const filteredClaims = useMemo(() => {
    if (!claimSearchQuery) return [];
    const s = claimSearchQuery.toLowerCase();
    return (claims || []).filter(c => (c.clientInfo?.name?.toLowerCase() || '').includes(s) || (c.clientRef?.toLowerCase() || '').includes(s) || c.id.toLowerCase().includes(s));
  }, [claims, claimSearchQuery]);

  const filteredCustomers = useMemo(() => {
    const s = customerSearchQuery.toLowerCase();
    return customers.filter(c => c.name.toLowerCase().includes(s) || c.mobile.includes(s) || c.email.toLowerCase().includes(s));
  }, [customers, customerSearchQuery]);

  const { availableVehicles, loading: loadingVehicles } = useAvailableVehicles(
    vehicles,
    formData.startDate && formData.startTime ? new Date(`${formData.startDate}T${formData.startTime}`) : undefined,
    formData.endDate && formData.endTime ? new Date(`${formData.endDate}T${formData.endTime}`) : undefined,
    rental.id
  );

  const filteredVehicles = useMemo(() => {
    const s = vehicleSearchQuery.toLowerCase();
    return availableVehicles.filter(v => v.id === formData.vehicleId || v.make.toLowerCase().includes(s) || v.model.toLowerCase().includes(s) || v.registrationNumber.toLowerCase().includes(s));
  }, [availableVehicles, vehicleSearchQuery, formData.vehicleId]);

  useEffect(() => {
    if (formData.storageStartDate && formData.storageEndDate) {
      const start = new Date(formData.storageStartDate); const end = new Date(formData.storageEndDate);
      if (isValid(start) && isValid(end) && !isAfter(start, end)) setFormData(p => ({ ...p, storageDays: differenceInDays(end, start) + 1 }));
      else setFormData(p => ({ ...p, storageDays: 0 }));
    } else setFormData(p => ({ ...p, storageDays: 0 }));
  }, [formData.storageStartDate, formData.storageEndDate]);

  useEffect(() => {
    if (!initialized) { setInitialized(true); return; }
    if (!hasModifiedWeeks) return;
    if (formData.type === 'weekly' && formData.startDate && formData.startTime && formData.numberOfWeeks > 0) {
      const startDT = new Date(`${formData.startDate}T${formData.startTime}`);
      if (isValid(startDT)) setFormData(p => ({ ...p, endDate: format(addWeeks(startDT, formData.numberOfWeeks), 'yyyy-MM-dd'), endTime: p.startTime }));
    }
  }, [formData.type, formData.numberOfWeeks, formData.startDate, formData.startTime, hasModifiedWeeks, initialized]);

  // Extra Charges
  const handleAddExtraCharge = () => setFormData(prev => ({ ...prev, extraCharges: [...prev.extraCharges, { id: `ec_${Date.now()}`, name: '', amount: 0 }] }));
  const handleRemoveExtraCharge = (index: number) => setFormData(prev => ({ ...prev, extraCharges: prev.extraCharges.filter((_, i) => i !== index) }));
  const handleExtraChargeChange = (index: number, field: string, value: any) => {
    const newCharges = [...formData.extraCharges]; newCharges[index] = { ...newCharges[index], [field]: value }; setFormData(prev => ({ ...prev, extraCharges: newCharges }));
  };

  const costs = useMemo(() => {
    if (!selectedVehicle || !formData.startDate || !formData.endDate || !formData.startTime || !formData.endTime) return { net: 0, vat: 0, gross: 0, discountAmount: 0, baseGross: 0, baseNet: 0, baseVat: 0 };
    const s = new Date(`${formData.startDate}T${formData.startTime}`);
    const e = new Date(`${formData.endDate}T${formData.endTime}`);
    if (!isValid(s) || !isValid(e) || isAfter(s, e)) return { net: 0, vat: 0, gross: 0, discountAmount: 0, baseGross: 0, baseNet: 0, baseVat: 0 };

    let storCost = 0;
    if (formData.type === 'claim' && formData.storageStartDate && formData.storageEndDate) {
      storCost = (formData.storageDays || 0) * (formData.storageCostPerDay || 0);
    }
    
    const extraTotal = formData.extraCharges.reduce((acc, c) => acc + (Number(c.amount) || 0), 0);

    return calculateRentalCostDetailed(
      s, e, formData.type, selectedVehicle, formData.reason,
      formData.negotiatedRate ? parseFloat(formData.negotiatedRate) : undefined,
      storCost, formData.type === 'claim' ? formData.recoveryCost : 0, formData.deliveryCharge, formData.collectionCharge,
      formData.type !== 'weekly' ? formData.insurancePerDay : 0, formData.type === 'weekly' ? formData.insurancePerWeek : 0,
      formData.includeVAT, formData.deliveryChargeIncludeVAT, formData.collectionChargeIncludeVAT,
      formData.insurancePerDayIncludeVAT, formData.insurancePerWeekIncludeVAT, formData.includeRecoveryCostVAT,
      formData.includeStorageVAT, formData.discountPercentage, formData.discountAmount, formData.status,
      rental.lockedDailyRate, rental.lockedWeeklyRate, rental.lockedClaimRate, extraTotal,
      rental.discounts || [] // 👈 ADD THIS
    );
  }, [formData, selectedVehicle, rental]);

  const currentFinalCostAfterDiscount = costs.gross;
  const currentRemainingAmount = currentFinalCostAfterDiscount - (rental.paidAmount || 0);

  const handleRemoveExistingImage = (imageUrl: string) => setExistingImages(p => p.filter(img => img !== imageUrl));

  const [subVehicleSearchQueries, setSubVehicleSearchQueries] = useState<string[]>(() => (formData.hireSubstitutionDetails || []).map(() => ''));
  const [showSubVehicleResults, setShowSubVehicleResults] = useState<boolean[]>(() => (formData.hireSubstitutionDetails || []).map(() => false));

  useEffect(() => {
    const len = formData.hireSubstitutionDetails.length;
    setSubVehicleSearchQueries(p => p.length === len ? p : p.length < len ? [...p, ...Array(len - p.length).fill('')] : p.slice(0, len));
    setShowSubVehicleResults(p => p.length === len ? p : p.length < len ? [...p, ...Array(len - p.length).fill(false)] : p.slice(0, len));
  }, [formData.hireSubstitutionDetails.length]);

  const filteredSubVehicles = (index: number) => {
    const q = (subVehicleSearchQueries[index] || '').toLowerCase();
    if (!q) return availableVehicles.slice(0, 15);
    return availableVehicles.filter(v => `${v.make} ${v.model} ${v.registrationNumber}`.toLowerCase().includes(q)).slice(0, 15);
  };

  useEffect(() => {
    if (formData.storageStartDate && formData.storageEndDate) {
      const start = new Date(formData.storageStartDate); const end = new Date(formData.storageEndDate);
      // ✅ Fixed: Removed the + 1 to prevent duplication
      if (isValid(start) && isValid(end) && !isAfter(start, end)) setFormData(p => ({ ...p, storageDays: Math.max(1, differenceInDays(end, start)) }));
      else setFormData(p => ({ ...p, storageDays: 0 }));
    } else setFormData(p => ({ ...p, storageDays: 0 }));
  }, [formData.storageStartDate, formData.storageEndDate]);

  const handleSubChange = (index: number, e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const newSubs = [...formData.hireSubstitutionDetails];
    if (type === 'checkbox') (newSubs[index] as any) = { ...newSubs[index], [name]: (e.target as HTMLInputElement).checked };
    else if (type === 'number') (newSubs[index] as any) = { ...newSubs[index], [name]: value === '' ? '' : parseFloat(value) };
    else (newSubs[index] as any) = { ...newSubs[index], [name]: value };
    setFormData(p => ({ ...p, hireSubstitutionDetails: newSubs }));
  };

  const addSubstitutionVehicle = () => setFormData(p => ({ ...p, hireSubstitutionDetails: [...p.hireSubstitutionDetails, newSubDetail()] }));
  const removeSubstitutionVehicle = (index: number) => {
    setFormData(p => ({ ...p, hireSubstitutionDetails: p.hireSubstitutionDetails.filter((_, i) => i !== index) }));
    const newSubImages = { ...subNewImages }; delete newSubImages[index]; setSubNewImages(newSubImages);
  };

  const handleRemoveExistingSubImage = (index: number, urlToRemove: string) => {
    const newSubs = [...formData.hireSubstitutionDetails];
    newSubs[index].images = (newSubs[index].images || []).filter(url => url !== urlToRemove);
    setFormData(p => ({ ...p, hireSubstitutionDetails: newSubs }));
  };

  const openConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVehicle || !selectedCustomer) return toast.error('Valid vehicle and customer required.');
    
    const s = new Date(`${formData.startDate}T${formData.startTime}`);
    const eDate = new Date(`${formData.endDate}T${formData.endTime}`);
    if (!isValid(s) || !isValid(eDate)) {
        return toast.error("Valid start and end dates are required.");
    }
    
    topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setIsConfirmModalOpen(true);
  };

  // Helper to remove any undefined fields that cause Firestore rejections
  const cleanObjectForFirestore = (obj: any): any => {
    if (obj === null || obj === undefined) return null;
    if (obj instanceof Date) return obj;
    
    // ✨ FIX: Prevent stripping of Firestore Timestamps & FieldValues
    if (typeof obj === 'object' && (typeof obj.toDate === 'function' || typeof obj.isEqual === 'function')) {
      return obj;
    }

    if (Array.isArray(obj)) return obj.map(cleanObjectForFirestore);
    if (typeof obj === 'object') {
      const cleaned: any = {};
      for (const key in obj) {
        if (obj[key] !== undefined) {
          cleaned[key] = cleanObjectForFirestore(obj[key]);
        }
      }
      return cleaned;
    }
    return obj;
  };

  const executeUpdateRental = async () => {
    if (!user || !selectedVehicle || !selectedCustomer) return;
    
    if (formData.status === 'completed') {
      if (!rental.returnCondition) {
          return toast.error('Main vehicle return condition is required before completing the rental.');
      }
      if (formData.hireSubstitutionDetails?.some(sub => (sub.registration || sub.make) && !sub.returnCondition)) {
        return toast.error(`Cannot complete: All substitution vehicles must be returned.`);
      }
    }
    
    setLoading(true);

    try {
      const s = new Date(`${formData.startDate}T${formData.startTime}`);
      const e = new Date(`${formData.endDate}T${formData.endTime}`);
      
      const newPayment = parseFloat(formData.amountToAdd?.toString() || '0');
      const updatedTotalPaid = (rental.paidAmount || 0) + newPayment;
      const updatedPayments: RentalPayment[] = [...(rental.payments || [])];
      
      if (newPayment > 0) {
        updatedPayments.push({
          id: `payment_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          date: new Date(), amount: newPayment, method: formData.paymentMethod,
          ...(formData.paymentReference && { reference: formData.paymentReference }),
          ...(formData.paymentNotes && { notes: formData.paymentNotes }),
          createdAt: new Date(), createdBy: user.id
        });
      }

      const submitRemainingAmount = costs.gross - updatedTotalPaid;
      const submitPaymentStatus = submitRemainingAmount <= 0.001 ? 'paid' : updatedTotalPaid > 0 ? 'partially_paid' : 'pending';

      const newImageUrls = await Promise.all(newImages.map(async (file) => {
        const snap = await uploadBytes(ref(storage, `vehicle-conditions/${rental.id}/${Date.now()}_${file.name}`), file);
        return getDownloadURL(snap.ref);
      }));
      const allImages = [...existingImages, ...newImageUrls];

      const updatedCondition: VehicleCondition = {
        type: 'check-out', date: rental.checkOutCondition?.date || s,
        mileage: conditionData.mileage === '' ? 0 : (conditionData.mileage || 0), fuelLevel: (conditionData.fuelLevel as any) || '100',
        isClean: conditionData.isClean === undefined ? true : !!conditionData.isClean, hasDamage: !!conditionData.hasDamage,
        damageDescription: conditionData.hasDamage ? conditionData.damageDescription || '' : '', images: allImages,
        createdAt: rental.checkOutCondition?.createdAt || new Date(), createdBy: rental.checkOutCondition?.createdBy || user.id,
        id: rental.checkOutCondition?.id || `cond_${Date.now()}`, notes: (conditionData as any).notes || (rental.checkOutCondition as any)?.notes || ''
      };

      const submitHireSubstitutionDetails = await Promise.all(formData.hireSubstitutionDetails.map(async (sub, index) => {
          const filesToUpload = subNewImages[index] || [];
          const subUploadedUrls = await Promise.all(filesToUpload.map(async (f) => {
              const snap = await uploadBytes(ref(storage, `sub-conditions/${rental.id}/${index}_${Date.now()}_${f.name}`), f);
              return getDownloadURL(snap.ref);
          }));
          const combinedSubImages = [...(sub.images || []), ...subUploadedUrls];
          const originalSub = rental.hireSubstitutionDetails?.[index];
          let returnConditionToKeep = originalSub?.returnCondition;
          if (originalSub && returnConditionToKeep) {
              if (safeFormatDate(originalSub.expectedReturnAt, "yyyy-MM-dd'T'HH:mm") !== sub.expectedReturnAt) {
                  returnConditionToKeep = undefined;
              }
          }
          return {
              make: sub.make || '', model: sub.model || '', registration: sub.registration || '', loaner: sub.loaner || '',
              givenAt: new Date(sub.givenAt || Date.now()), expectedReturnAt: new Date(sub.expectedReturnAt || Date.now()),
              images: combinedSubImages, ...(returnConditionToKeep ? { returnCondition: returnConditionToKeep } : {}),
              mileage: sub.mileage === '' ? 0 : (sub.mileage || 0),
              fuelLevel: sub.fuelLevel || '100', isClean: sub.isClean ?? true, hasDamage: sub.hasDamage ?? false, damageDescription: sub.damageDescription || '',
              notes: sub.notes || ''
          };
      }));

      const finalSubs = formData.reason === 'h-substitute' && submitHireSubstitutionDetails.length > 0
        ? submitHireSubstitutionDetails.filter(sub => sub.make || sub.model || sub.registration)
        : null;

      const rentalUpdateData: Partial<Rental> = {
        rentalAgreementNumber, vehicleId: formData.vehicleId, customerId: formData.customerId,
        startDate: s, endDate: e, type: formData.type, reason: formData.reason, status: formData.status,
        cost: costs.gross, paidAmount: updatedTotalPaid, remainingAmount: submitRemainingAmount, paymentStatus: submitPaymentStatus, payments: updatedPayments,
        signature: formData.signature || null, claimRef: formData.claimRef || null,
        
        storageStartDate: formData.storageStartDate ? new Date(formData.storageStartDate) : null,
        storageEndDate: formData.storageEndDate ? new Date(formData.storageEndDate) : null,
        storageCostPerDay: formData.type === 'claim' ? formData.storageCostPerDay || 0 : null,
        storageDays: formData.type === 'claim' ? formData.storageDays : null,
        includeStorageVAT: formData.type === 'claim' ? formData.includeStorageVAT : null,
        // ✅ FIX: Removed '* 1.2' multipliers. We only save raw net amounts to the DB.
        storageCost: formData.type === 'claim' ? (formData.storageDays || 0) * (formData.storageCostPerDay || 0) : null,

        recoveryCost: formData.type === 'claim' && formData.recoveryCost > 0 ? formData.recoveryCost : null,
        includeRecoveryCostVAT: formData.type === 'claim' ? formData.includeRecoveryCostVAT : null,
        deliveryCharge: formData.deliveryCharge > 0 ? formData.deliveryCharge : null,
        collectionCharge: formData.collectionCharge > 0 ? formData.collectionCharge : null,
        insurancePerDay: formData.type !== 'weekly' && formData.insurancePerDay > 0 ? formData.insurancePerDay : null,
        insurancePerWeek: formData.type === 'weekly' && formData.insurancePerWeek > 0 ? formData.insurancePerWeek : null,

        includeVAT: formData.includeVAT, deliveryChargeIncludeVAT: formData.deliveryChargeIncludeVAT, collectionChargeIncludeVAT: formData.collectionChargeIncludeVAT,
        insurancePerDayIncludeVAT: formData.type !== 'weekly' ? formData.insurancePerDayIncludeVAT : false,
        insurancePerWeekIncludeVAT: formData.type === 'weekly' ? formData.insurancePerWeekIncludeVAT : false,

        negotiatedRate: formData.negotiatedRate ? parseFloat(formData.negotiatedRate.toString()) : null, negotiationNotes: formData.negotiationNotes || null,
        extraCharges: formData.extraCharges.filter(c => c.name.trim() !== ''),

        numberOfWeeks: formData.type === 'weekly' ? formData.numberOfWeeks || 1 : null,
        checkOutCondition: updatedCondition, hireSubstitutionDetails: finalSubs, updatedAt: new Date(), updatedBy: user.id
      };

      if (formData.originalStartDate) {
        const osd = new Date(formData.originalStartDate);
        if (isValid(osd)) rentalUpdateData.originalStartDate = osd;
      }

      // Important: clean out any lingering undefined fields to prevent Firestore crashes
      const finalUpdatePayload = cleanObjectForFirestore(rentalUpdateData);

      await updateDoc(doc(db, 'rentals', rental.id), finalUpdatePayload);
      setIsConfirmModalOpen(false);
      setLoading(false);
      onClose();
      toast.success('Rental updated! Regenerating documents in background…');

      setTimeout(async () => {
        try {
          const completeUpdatedRental = { ...rental, ...rentalUpdateData } as Rental;
          const documents = await generateRentalDocuments(completeUpdatedRental, selectedVehicle, selectedCustomer);
          const existingAgreements = rental.documents?.agreements || {};
          const agreementKeys = Object.keys(existingAgreements).sort((a, b) => parseInt(a.split('_')[1] || '0') - parseInt(b.split('_')[1] || '0'));
          const latestAgreementKey = agreementKeys.length > 0 ? agreementKeys[agreementKeys.length - 1] : null;

          let newAgreementKey: string;
          if (latestAgreementKey) {
            const ninetyDaysAgo = new Date(); ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
            const latestAgreementDate = new Date(parseInt(latestAgreementKey.split('_')[1] || '0'));
            newAgreementKey = latestAgreementDate < ninetyDaysAgo ? `agreement_${new Date().getTime()}` : latestAgreementKey;
          } else {
            const osd = (rental.originalStartDate ?? rental.startDate) as any;
            newAgreementKey = `agreement_${new Date(osd).getTime()}`;
          }

          await uploadRentalDocuments(rental.id, {
            agreements: { [newAgreementKey]: documents.agreement }, invoice: documents.invoice, permit: documents.permit, claimDocuments: documents.claimDocuments
          });
        } catch (err: any) {
          console.error("PDF Generation failed", err);
        }
      }, 150);

      if (newPayment > 0) {
        setTimeout(async () => {
          try {
            await createFinanceTransaction({
              type: 'income', category: 'Rental', amount: formData.amountToAdd,
              description: `A ${rental.type} Rental payment from customer (${selectedCustomer?.name || 'N/A'})${formData.paymentNotes ? ` – ${formData.paymentNotes}` : ''}`,
              referenceId: rental.id, paymentMethod: formData.paymentMethod, paymentReference: formData.paymentReference,
              status: 'completed', paymentStatus: submitPaymentStatus as any, date: new Date(), vehicleId: rental.vehicleId,
              accountTo: selectedVehicle.owner?.accountId || undefined
            });
          } catch {}
        }, 0);
      }
    } catch (err: any) {
      toast.error(`Failed to update rental: ${err.message}`);
      setLoading(false);
    }
  };

  return (
    <>
      <div ref={topRef} />
      {rentalAgreementNumber && (
        <div className="bg-gray-100 p-2 rounded mb-4 text-center">
            <span className="font-bold text-gray-700">Rental Agreement #{rentalAgreementNumber}</span>
        </div>
      )}

      {/* TABS NAVIGATION */}
      <div className="flex border-b border-gray-200 mb-6 sticky top-0 bg-white z-10 shadow-sm rounded-t-lg overflow-x-auto">
        {[
          { id: 'setup', label: 'Setup', icon: Car },
          { id: 'finance', label: 'Financials', icon: PoundSterling },
          { id: 'condition', label: 'Conditions', icon: CheckCircle },
          { id: 'payment', label: 'Payments', icon: CreditCard }
        ].map((tab) => (
          <button
            key={tab.id} type="button"
            className={`flex-1 min-w-[120px] py-4 text-sm font-medium border-b-2 flex items-center justify-center gap-2 transition-colors
              ${activeTab === tab.id ? 'border-primary text-primary bg-primary-50/50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
            onClick={() => setActiveTab(tab.id as any)}
          >
            <tab.icon className="w-4 h-4" /> <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      <form onSubmit={openConfirm} className="space-y-6 px-2">
        {/* SETUP TAB */}
        {activeTab === 'setup' && (
          <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <div className="col-span-1 md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Vehicle Assignment */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Vehicle</label>
                        <div className="relative">
                            <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                            <input
                              type="text" value={vehicleSearchQuery}
                              onChange={(e) => { setVehicleSearchQuery(e.target.value); setShowVehicleResults(true); }}
                              onFocus={() => setShowVehicleResults(true)}
                              onBlur={() => setTimeout(() => setShowVehicleResults(false), 200)}
                              className="w-full pl-10 pr-3 py-2 border rounded-md focus:ring-primary focus:border-primary shadow-sm"
                            />
                            {showVehicleResults && (
                               <div className="absolute z-20 mt-1 w-full bg-white shadow-xl max-h-60 rounded-md py-1 overflow-auto border border-gray-100">
                                   {filteredVehicles.map((v) => (
                                     <div key={v.id} className="cursor-pointer hover:bg-blue-50 px-4 py-3 border-b border-gray-50"
                                        onMouseDown={() => {
                                            setFormData(p => ({ ...p, vehicleId: v.id }));
                                            setVehicleSearchQuery(`${v.make} ${v.model} - ${v.registrationNumber}`);
                                            setShowVehicleResults(false);
                                            setConditionData(p => ({ ...p, mileage: v.mileage || 0 }));
                                            setInsurancePerDayTouched(false); setInsurancePerWeekTouched(false);
                                        }}>
                                        <div className="font-semibold text-gray-800">{v.make} {v.model}</div>
                                        <div className="text-sm text-primary">{v.registrationNumber}</div>
                                     </div>
                                   ))}
                               </div>
                            )}
                        </div>
                    </div>
                    {/* Customer Assignment */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Customer</label>
                        <div className="relative">
                            <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                            <input
                              type="text" value={customerSearchQuery}
                              onChange={(e) => { setCustomerSearchQuery(e.target.value); setShowCustomerResults(true); }}
                              onFocus={() => setShowCustomerResults(true)}
                              onBlur={() => setTimeout(() => setShowCustomerResults(false), 200)}
                              className="w-full pl-10 pr-3 py-2 border rounded-md focus:ring-primary focus:border-primary shadow-sm"
                            />
                            {showCustomerResults && (
                               <div className="absolute z-20 mt-1 w-full bg-white shadow-xl max-h-60 rounded-md py-1 overflow-auto border border-gray-100">
                                   {filteredCustomers.map((c) => (
                                     <div key={c.id} className="cursor-pointer hover:bg-purple-50 px-4 py-3 border-b border-gray-50"
                                        onMouseDown={() => {
                                            setFormData(p => ({ ...p, customerId: c.id, signature: c.signature || '' }));
                                            setCustomerSearchQuery(`${c.name} - ${c.mobile}`);
                                            setShowCustomerResults(false);
                                        }}>
                                        <div className="font-semibold text-gray-800">{c.name}</div>
                                        <div className="text-sm text-purple-600">{c.mobile}</div>
                                     </div>
                                   ))}
                               </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="border-t pt-4 col-span-1 md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                       <label className="block text-sm font-medium text-gray-700 mb-1">Rental Type</label>
                       <select value={formData.type} onChange={e => setFormData(p => ({...p, type: e.target.value as any}))} className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary">
                          <option value="daily">Daily</option><option value="weekly">Weekly</option><option value="claim">Claim</option>
                       </select>
                    </div>
                    <div>
                       <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                       <select value={formData.status} onChange={e => setFormData(p => ({...p, status: e.target.value as any}))} className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary">
                          <option value="scheduled">Scheduled</option><option value="active">Active</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option>
                       </select>
                    </div>
                    <div>
                       <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
                       <select value={baseReason} onChange={e => { setBaseReason(e.target.value as any); if(e.target.value !== 'hired') setHireVariant('normal'); }} className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary">
                          <option value="hired">Hire</option><option value="claim">Claim</option><option value="o/d">O/D</option><option value="staff">Staff</option><option value="workshop">Workshop</option>
                       </select>
                    </div>
                    {baseReason === 'hired' && (
                       <div>
                           <label className="block text-sm font-medium text-gray-700 mb-1">Variant</label>
                           <select value={hireVariant} onChange={e => setHireVariant(e.target.value as any)} className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary">
                              <option value="normal">Normal</option><option value="h-substitute">H Substitute</option><option value="c-substitute">C Substitute</option>
                           </select>
                       </div>
                    )}
                </div>

                <div className="border-t pt-4 col-span-1 md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                   <FormField type="date" label="Start Date" value={formData.startDate} onChange={e => setFormData(p => ({...p, startDate: e.target.value}))} required />
                   <FormField type="time" label="Start Time" value={formData.startTime} onChange={e => setFormData(p => ({...p, startTime: e.target.value}))} required />
                   {formData.type === 'weekly' ? (
                     <>
                        <FormField type="number" label="Weeks" value={formData.numberOfWeeks} onChange={e => { setHasModifiedWeeks(true); setFormData(p => ({...p, numberOfWeeks: parseInt(e.target.value)||1})); }} min="1" required />
                        <div className="grid grid-cols-2 gap-2">
                           <FormField type="date" label="End Date (Auto)" value={formData.endDate} disabled />
                           <FormField type="time" label="End Time" value={formData.endTime} onChange={e => setFormData(p => ({...p, endTime: e.target.value}))} />
                        </div>
                     </>
                   ) : (
                     <>
                        <FormField type="date" label="End Date" value={formData.endDate} onChange={e => setFormData(p => ({...p, endDate: e.target.value}))} required />
                        <FormField type="time" label="End Time" value={formData.endTime} onChange={e => setFormData(p => ({...p, endTime: e.target.value}))} required />
                     </>
                   )}
                </div>
                
                {isManager && (
                   <div className="border-t pt-4 col-span-1 md:col-span-2">
                      <FormField type="datetime-local" label="Original Start Date (System/Manager)" value={formData.originalStartDate} onChange={e => setFormData(p => ({...p, originalStartDate: e.target.value}))} />
                   </div>
                )}
             </div>

             {/* SUBSTITUTION LOGIC */}
             {formData.reason === 'h-substitute' && (
                <div className="bg-yellow-50 p-6 rounded-xl border border-yellow-200">
                   <h3 className="text-lg font-bold text-gray-900 mb-4">Substitution Details</h3>
                   
                   {formData.hireSubstitutionDetails.map((sub, index) => (
                      <div key={index} className="flex flex-col gap-5 border border-yellow-300 bg-white p-5 rounded-xl mb-4 relative shadow-sm">
                         <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                            <h4 className="font-bold text-gray-800">Substitution Vehicle #{index + 1}</h4>
                            <button 
                              type="button" 
                              onClick={() => removeSubstitutionVehicle(index)} 
                              className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1.5 rounded-md transition-colors"
                              title="Remove Substitution"
                            >
                              <X className="h-5 w-5" />
                            </button>
                         </div>

                         {/* Vehicle Search & Details Grid */}
                         <div className="space-y-4">
                            <div className="relative">
                               <input
                                 type="text"
                                 value={subVehicleSearchQueries[index]}
                                 onChange={(e) => {
                                   const val = e.target.value;
                                   const newQueries = [...subVehicleSearchQueries];
                                   newQueries[index] = val;
                                   setSubVehicleSearchQueries(newQueries);
                                   
                                   const newSubs = [...formData.hireSubstitutionDetails];
                                   newSubs[index].registration = val;
                                   setFormData({ ...formData, hireSubstitutionDetails: newSubs });
                                   
                                   const newShowResults = [...showSubVehicleResults];
                                   newShowResults[index] = true;
                                   setShowSubVehicleResults(newShowResults);
                                 }}
                                 onFocus={() => {
                                   const newShowResults = [...showSubVehicleResults];
                                   newShowResults[index] = true;
                                   setShowSubVehicleResults(newShowResults);
                                 }}
                                 onBlur={() => {
                                   setTimeout(() => {
                                     const newShowResults = [...showSubVehicleResults];
                                     newShowResults[index] = false;
                                     setShowSubVehicleResults(newShowResults);
                                   }, 200);
                                 }}
                                 placeholder="Search available substitution vehicles..."
                                 className="w-full border rounded-md p-2"
                               />
                               
                               {showSubVehicleResults[index] && (
                                 <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl max-h-56 overflow-y-auto">
                                   {filteredSubVehicles(index).map(v => (
                                     <div 
                                       key={v.id}
                                       className="px-4 py-3 hover:bg-blue-50 cursor-pointer border-b border-gray-50 last:border-0 transition-colors flex justify-between items-center"
                                       onMouseDown={(e) => {
                                         e.preventDefault();
                                         const newSubs = [...formData.hireSubstitutionDetails];
                                         newSubs[index].registration = v.registrationNumber || '';
                                         newSubs[index].make = v.make || '';
                                         newSubs[index].model = v.model || '';
                                         newSubs[index].mileage = v.mileage || 0; 
                                         setFormData({ ...formData, hireSubstitutionDetails: newSubs });
                                         
                                         const newQueries = [...subVehicleSearchQueries];
                                         newQueries[index] = `${v.make} ${v.model} - ${v.registrationNumber}`;
                                         setSubVehicleSearchQueries(newQueries);

                                         const newShowResults = [...showSubVehicleResults];
                                         newShowResults[index] = false;
                                         setShowSubVehicleResults(newShowResults);
                                       }}
                                     >
                                       <div>
                                          <div className="font-bold text-gray-900">{v.registrationNumber}</div>
                                          <div className="text-xs text-gray-500 font-medium">{v.make} {v.model}</div>
                                       </div>
                                       <div className="text-[10px] bg-green-100 text-green-700 px-2 py-1 rounded font-bold uppercase">
                                          Available
                                       </div>
                                     </div>
                                   ))}
                                   
                                   {filteredSubVehicles(index).length === 0 && (
                                     <div className="px-4 py-3 text-sm text-gray-500 italic bg-gray-50 rounded-b-xl">
                                       No available vehicles match. (Manual entry will be saved)
                                     </div>
                                   )}
                                 </div>
                               )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <FormField label="Vehicle Make" name="make" value={sub.make} onChange={e => handleSubChange(index, e)} placeholder="e.g. Toyota" />
                              <FormField label="Vehicle Model" name="model" value={sub.model} onChange={e => handleSubChange(index, e)} placeholder="e.g. Prius" />
                            </div>
                         </div>

                         {/* Timing & Loaner Details Grid */}
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-gray-100">
                            <FormField label="Date & Time Given" type="datetime-local" name="givenAt" value={sub.givenAt} onChange={e => handleSubChange(index, e)} />
                            <FormField label="Expected Return" type="datetime-local" name="expectedReturnAt" value={sub.expectedReturnAt} onChange={e => handleSubChange(index, e)} />
                         </div>
                         
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <div className="col-span-1 md:col-span-2">
                                 <FormField label="Loaner (Provider - Optional)" name="loaner" value={sub.loaner || ''} onChange={e => handleSubChange(index, e)} placeholder="e.g. Partner Co. or Internal Fleet" />
                             </div>
                             <div className="col-span-1 md:col-span-2">
                                 <TextArea label="Notes (Reason for Substitution)" name="notes" value={sub.notes} onChange={e => handleSubChange(index, e)} rows={2} />
                             </div>
                         </div>

                         {/* Check-Out Condition specifically for Substitution */}
                         <div className="mt-4 border-t border-yellow-200 pt-4 bg-gray-50 p-4 rounded-xl">
                             <h5 className="font-bold text-gray-800 mb-3 flex items-center gap-2"><Car className="text-gray-500"/> Sub Vehicle Check-Out Condition</h5>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField type="number" label="Mileage Out" name="mileage" value={sub.mileage} onChange={e => handleSubChange(index, e)} required />
                                <div>
                                   <label className="block text-sm font-medium text-gray-700 mb-1">Fuel Level</label>
                                   <select name="fuelLevel" value={sub.fuelLevel} onChange={e => handleSubChange(index, e as any)} className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary" required>
                                      <option value="0">Empty (0%)</option><option value="25">Quarter (25%)</option><option value="50">Half (50%)</option><option value="75">Three Quarters (75%)</option><option value="100">Full (100%)</option>
                                   </select>
                                </div>
                                <div className="flex gap-4 col-span-1 md:col-span-2">
                                   <label className="flex items-center gap-2 font-medium"><input type="checkbox" name="isClean" checked={!!sub.isClean} onChange={e => handleSubChange(index, e)} className="rounded w-5 h-5"/> Is Clean</label>
                                   <label className="flex items-center gap-2 font-medium"><input type="checkbox" name="hasDamage" checked={!!sub.hasDamage} onChange={e => handleSubChange(index, e)} className="rounded w-5 h-5 text-red-500"/> Has Damage</label>
                                </div>
                                {sub.hasDamage && <div className="col-span-1 md:col-span-2"><TextArea label="Damage Description" name="damageDescription" value={sub.damageDescription} onChange={e => handleSubChange(index, e as any)} /></div>}
                                <div className="col-span-1 md:col-span-2 space-y-3">
                                   <label className="block text-sm font-medium text-gray-700">Existing Images</label>
                                   {sub.images && sub.images.length > 0 && (
                                     <div className="grid grid-cols-4 gap-3">
                                        {sub.images.map((url, imgIdx) => (
                                          <div key={imgIdx} className="relative group rounded-lg overflow-hidden border">
                                            <img src={url} className="w-full h-24 object-cover" />
                                            <button type="button" onClick={() => handleRemoveExistingSubImage(index, url)} className="absolute top-1 right-1 bg-red-600 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition"><X className="w-3 h-3"/></button>
                                          </div>
                                        ))}
                                     </div>
                                   )}
                                   <FileUpload label="Add Additional Images" multiple accept="image/*" onChange={files => setSubNewImages(prev => ({ ...prev, [index]: files }))} showPreview />
                                </div>
                             </div>
                         </div>
                      </div>
                   ))}
                   
                   <button 
                     type="button" 
                     onClick={addSubstitutionVehicle} 
                     className="flex items-center px-4 py-2 border border-gray-300 rounded-lg shadow-sm text-gray-700 bg-white hover:bg-gray-50 font-bold transition-all"
                   >
                     <Plus className="h-4 w-4 mr-2" /> Add Another Substitution
                   </button>
                </div>
             )}
          </div>
        )}

        {/* FINANCE TAB */}
        {activeTab === 'finance' && (
          <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
             <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-6">
                
                <div className="flex items-center gap-3 bg-blue-50 p-4 rounded-xl border border-blue-100">
                   <input type="checkbox" id="includeVAT" checked={formData.includeVAT} onChange={e => setFormData(p => ({...p, includeVAT: e.target.checked}))} className="w-5 h-5 text-primary rounded" />
                   <label htmlFor="includeVAT" className="font-bold text-gray-800">Apply 20% VAT to Base Rental Cost</label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                   <FormField type="number" label="Negotiated Rate (£)" value={formData.negotiatedRate} onChange={e => setFormData(p => ({...p, negotiatedRate: e.target.value}))} placeholder="Leave blank for vehicle default" />
                   <div className="col-span-1 md:col-span-2 bg-purple-50 p-4 rounded-xl border border-purple-100 flex items-center justify-between">
                      <div>
                         <p className="font-bold text-purple-900">Discount Manager</p>
                         <p className="text-xs text-purple-700 mt-1">Discounts are now tracked historically. Please save and use the "Apply Discount" button on the main table to add or modify discounts.</p>
                      </div>
                      <div className="text-right">
                         <p className="text-xs font-bold text-purple-500 uppercase">Total Applied</p>
                         <p className="text-2xl font-black text-purple-700 font-mono">-{formatCurrency(((rental as any).discounts || []).reduce((acc: number, d: any) => acc + d.amount, 0) || rental.discountAmount || 0)}</p>
                      </div>
                   </div>
                   {formData.negotiatedRate && (
                     <div className="col-span-3">
                       <TextArea label="Pricing Notes" value={formData.negotiationNotes} onChange={e => setFormData(p => ({...p, negotiationNotes: e.target.value}))} rows={2} />
                     </div>
                   )}
                </div>

                <div className="border-t pt-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                   {/* Insurance Options */}
                   <div className="space-y-4">
                      <h4 className="font-bold text-gray-800 border-b pb-2">Insurance Details</h4>
                      {formData.type === 'weekly' ? (
                         <div className="flex items-end gap-3">
                           <div className="flex-1"><FormField type="number" label="Insurance Per Week (£)" value={formData.insurancePerWeek} onChange={e => { setInsurancePerWeekTouched(true); setFormData(p => ({...p, insurancePerWeek: parseFloat(e.target.value)||0})); }} /></div>
                           <label className="flex items-center gap-2 pb-2 font-medium"><input type="checkbox" checked={formData.insurancePerWeekIncludeVAT} onChange={e => setFormData(p => ({...p, insurancePerWeekIncludeVAT: e.target.checked}))} className="rounded" /> Inc VAT</label>
                         </div>
                      ) : (
                         <div className="flex items-end gap-3">
                           <div className="flex-1"><FormField type="number" label="Insurance Per Day (£)" value={formData.insurancePerDay} onChange={e => { setInsurancePerDayTouched(true); setFormData(p => ({...p, insurancePerDay: parseFloat(e.target.value)||0})); }} /></div>
                           <label className="flex items-center gap-2 pb-2 font-medium"><input type="checkbox" checked={formData.insurancePerDayIncludeVAT} onChange={e => setFormData(p => ({...p, insurancePerDayIncludeVAT: e.target.checked}))} className="rounded" /> Inc VAT</label>
                         </div>
                      )}
                   </div>

                   {/* Claim Extras */}
                   {formData.type === 'claim' && (
                     <div className="space-y-4">
                        <h4 className="font-bold text-gray-800 border-b pb-2">Claim Extras</h4>
                        <div className="grid grid-cols-2 gap-4">
                           <FormField type="date" label="Storage Start" value={formData.storageStartDate} onChange={e => setFormData(p => ({...p, storageStartDate: e.target.value}))} />
                           <FormField type="date" label="Storage End" value={formData.storageEndDate} onChange={e => setFormData(p => ({...p, storageEndDate: e.target.value}))} />
                        </div>
                        <div className="flex items-end gap-3">
                           <div className="flex-1"><FormField type="number" label="Storage Cost / Day (£)" value={formData.storageCostPerDay} onChange={e => setFormData(p => ({...p, storageCostPerDay: parseFloat(e.target.value)||0}))} /></div>
                           <label className="flex items-center gap-2 pb-2 font-medium"><input type="checkbox" checked={formData.includeStorageVAT} onChange={e => setFormData(p => ({...p, includeStorageVAT: e.target.checked}))} className="rounded" /> Inc VAT</label>
                        </div>
                        <div className="flex items-end gap-3">
                           <div className="flex-1"><FormField type="number" label="Recovery Cost (£)" value={formData.recoveryCost} onChange={e => setFormData(p => ({...p, recoveryCost: parseFloat(e.target.value)||0}))} /></div>
                           <label className="flex items-center gap-2 pb-2 font-medium"><input type="checkbox" checked={formData.includeRecoveryCostVAT} onChange={e => setFormData(p => ({...p, includeRecoveryCostVAT: e.target.checked}))} className="rounded" /> Inc VAT</label>
                        </div>
                        <div className="flex items-end gap-3">
                           <div className="flex-1"><FormField type="number" label="Delivery Charge (£)" value={formData.deliveryCharge} onChange={e => setFormData(p => ({...p, deliveryCharge: parseFloat(e.target.value)||0}))} /></div>
                           <label className="flex items-center gap-2 pb-2 font-medium"><input type="checkbox" checked={formData.deliveryChargeIncludeVAT} onChange={e => setFormData(p => ({...p, deliveryChargeIncludeVAT: e.target.checked}))} className="rounded" /> Inc VAT</label>
                        </div>
                        <div className="flex items-end gap-3">
                           <div className="flex-1"><FormField type="number" label="Collection Charge (£)" value={formData.collectionCharge} onChange={e => setFormData(p => ({...p, collectionCharge: parseFloat(e.target.value)||0}))} /></div>
                           <label className="flex items-center gap-2 pb-2 font-medium"><input type="checkbox" checked={formData.collectionChargeIncludeVAT} onChange={e => setFormData(p => ({...p, collectionChargeIncludeVAT: e.target.checked}))} className="rounded" /> Inc VAT</label>
                        </div>
                     </div>
                   )}
                   
                   {formData.type !== 'claim' && (
                     <div className="space-y-4">
                        <h4 className="font-bold text-gray-800 border-b pb-2">Logistics Charges</h4>
                        <div className="flex items-end gap-3">
                           <div className="flex-1"><FormField type="number" label="Delivery Charge (£)" value={formData.deliveryCharge} onChange={e => setFormData(p => ({...p, deliveryCharge: parseFloat(e.target.value)||0}))} /></div>
                           <label className="flex items-center gap-2 pb-2 font-medium"><input type="checkbox" checked={formData.deliveryChargeIncludeVAT} onChange={e => setFormData(p => ({...p, deliveryChargeIncludeVAT: e.target.checked}))} className="rounded" /> Inc VAT</label>
                        </div>
                        <div className="flex items-end gap-3">
                           <div className="flex-1"><FormField type="number" label="Collection Charge (£)" value={formData.collectionCharge} onChange={e => setFormData(p => ({...p, collectionCharge: parseFloat(e.target.value)||0}))} /></div>
                           <label className="flex items-center gap-2 pb-2 font-medium"><input type="checkbox" checked={formData.collectionChargeIncludeVAT} onChange={e => setFormData(p => ({...p, collectionChargeIncludeVAT: e.target.checked}))} className="rounded" /> Inc VAT</label>
                        </div>
                     </div>
                   )}
                </div>

                {/* Extra Charges Section */}
                <div className="border-t border-gray-200 pt-6">
                   <div className="flex justify-between items-center mb-4">
                      <h4 className="font-bold text-gray-800">Extra Charges</h4>
                      <button type="button" onClick={handleAddExtraCharge} className="text-sm flex items-center text-primary font-bold hover:text-primary-700">
                         <Plus className="w-4 h-4 mr-1" /> Add Charge
                      </button>
                   </div>
                   {formData.extraCharges.length === 0 ? (
                      <p className="text-sm text-gray-500 italic">No extra charges applied.</p>
                   ) : (
                      <div className="space-y-3">
                         {formData.extraCharges.map((charge, index) => (
                            <div key={charge.id} className="flex gap-3 items-end bg-gray-50 p-3 rounded-lg border border-gray-200">
                               <div className="flex-1">
                                  <FormField label="Description" value={charge.name} onChange={e => handleExtraChargeChange(index, 'name', e.target.value)} placeholder="e.g. Baby Seat" required />
                               </div>
                               <div className="w-32">
                                  <FormField type="number" label="Amount (£)" value={charge.amount} onChange={e => handleExtraChargeChange(index, 'amount', parseFloat(e.target.value) || 0)} required />
                               </div>
                               <button type="button" onClick={() => handleRemoveExtraCharge(index)} className="p-2.5 text-red-600 hover:bg-red-100 rounded-lg mb-0.5 transition-colors">
                                  <Trash2 className="w-5 h-5" />
                               </button>
                            </div>
                         ))}
                      </div>
                   )}
                </div>
             </div>
          </div>
        )}

        {/* CONDITION TAB */}
        {activeTab === 'condition' && (
          <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
             <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><Car className="text-gray-500"/> Main Vehicle Check-Out Condition</h3>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField type="number" label="Mileage Out" value={conditionData.mileage} onChange={e => setConditionData(p => ({ ...p, mileage: e.target.value === '' ? '' : parseInt(e.target.value) }))} required />
                <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">Fuel Level</label>
                   <select value={conditionData.fuelLevel} onChange={e => setConditionData(p => ({ ...p, fuelLevel: e.target.value as any }))} className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary" required>
                      <option value="0">Empty (0%)</option><option value="25">Quarter (25%)</option><option value="50">Half (50%)</option><option value="75">Three Quarters (75%)</option><option value="100">Full (100%)</option>
                   </select>
                </div>
                <div className="flex gap-6 col-span-1 md:col-span-2 bg-gray-50 p-4 rounded-lg border">
                   <label className="flex items-center gap-2 font-bold text-gray-700 cursor-pointer">
                      <input type="checkbox" checked={!!conditionData.isClean} onChange={e => setConditionData(p => ({ ...p, isClean: e.target.checked }))} className="rounded w-5 h-5 text-primary" /> Is Clean
                   </label>
                   <label className="flex items-center gap-2 font-bold text-gray-700 cursor-pointer">
                      <input type="checkbox" checked={!!conditionData.hasDamage} onChange={e => setConditionData(p => ({ ...p, hasDamage: e.target.checked }))} className="rounded w-5 h-5 text-red-500" /> Has Damage
                   </label>
                </div>
                {conditionData.hasDamage && (
                   <div className="col-span-1 md:col-span-2">
                      <TextArea label="Damage Description" value={conditionData.damageDescription || ''} onChange={e => setConditionData(p => ({ ...p, damageDescription: e.target.value }))} rows={3} required />
                   </div>
                )}
                
                <div className="col-span-1 md:col-span-2 space-y-4">
                   <label className="block text-sm font-bold text-gray-700 border-b pb-2">Vehicle Images</label>
                   {existingImages.length > 0 && (
                     <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3 mb-4">
                        {existingImages.map((url, idx) => (
                          <div key={idx} className="relative group rounded-lg overflow-hidden border shadow-sm">
                             <img src={url} alt={`Existing ${idx}`} className="w-full h-24 object-cover" />
                             <button type="button" onClick={() => handleRemoveExistingImage(url)} className="absolute top-1 right-1 bg-red-600 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition shadow-md">
                               <X className="w-3 h-3"/>
                             </button>
                          </div>
                        ))}
                     </div>
                   )}
                   <div className="bg-gray-50 p-4 rounded-lg border border-dashed border-gray-300">
                      <FileUpload label="Upload New Check-Out Images" multiple accept="image/*" onChange={files => setNewImages(files)} showPreview />
                   </div>
                </div>
             </div>
          </div>
        )}

        {/* PAYMENT TAB */}
        {activeTab === 'payment' && (
          <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
             <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-6">
                <div className="bg-green-50 p-4 rounded-xl border border-green-200 flex justify-between items-center">
                   <div>
                      <p className="text-sm font-bold text-green-900 uppercase">Total Expected (Gross)</p>
                      <p className="text-2xl font-black text-green-700">{formatCurrency(costs.gross)}</p>
                   </div>
                   <div className="text-right border-l pl-4 border-green-200">
                      <p className="text-sm font-bold text-blue-900 uppercase">Already Paid</p>
                      <p className="text-xl font-black text-blue-700">{formatCurrency(rental.paidAmount || 0)}</p>
                   </div>
                   <div className="text-right border-l pl-4 border-green-200">
                      <p className="text-sm font-bold text-red-900 uppercase">Remaining Amount</p>
                      <p className="text-xl font-black text-red-600">{formatCurrency(costs.gross - (rental.paidAmount || 0))}</p>
                   </div>
                </div>

                <div className="border-t pt-4">
                   <h4 className="font-bold text-gray-800 mb-4">Add Instant Payment</h4>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField type="number" label="Amount to Pay Now (£)" value={formData.amountToAdd} onChange={e => setFormData(p => ({...p, amountToAdd: parseFloat(e.target.value)||0}))} />
                      <div>
                         <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                         <select value={formData.paymentMethod} onChange={e => setFormData(p => ({...p, paymentMethod: e.target.value as any}))} className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary">
                            <option value="cash">Cash</option><option value="card">Card</option><option value="bank_transfer">Bank Transfer</option><option value="cheque">Cheque</option>
                         </select>
                      </div>
                      <FormField label="Payment Reference" value={formData.paymentReference} onChange={e => setFormData(p => ({...p, paymentReference: e.target.value}))} placeholder="Transaction ID, Receipt Number..." />
                      <FormField label="Payment Notes" value={formData.paymentNotes} onChange={e => setFormData(p => ({...p, paymentNotes: e.target.value}))} />
                   </div>
                </div>
             </div>
          </div>
        )}

        {/* FORM ACTIONS */}
        <div className="flex justify-end gap-3 pt-4 border-t mt-8 bg-gray-50 p-4 rounded-xl">
           <button type="button" onClick={onClose} className="px-5 py-2.5 text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-xl font-bold transition-colors">
              Cancel
           </button>
           <button type="submit" disabled={loading} className="px-6 py-2.5 bg-primary text-white hover:bg-primary-600 rounded-xl font-bold shadow-md transition-all hover:shadow-lg disabled:opacity-50">
              Review Updates
           </button>
        </div>
      </form>

      {/* CONFIRMATION & BREAKDOWN MODAL */}
      <Modal isOpen={isConfirmModalOpen} onClose={() => setIsConfirmModalOpen(false)} title="Confirm Rental Details & Save" size="lg">
        <div className="space-y-6">
          <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 shadow-inner">
            <h3 className="text-lg font-black text-gray-900 mb-4 border-b border-gray-200 pb-3">Complete Summary Breakdown</h3>

            <div className="space-y-3 text-sm">
              {/* Core Charges */}
              <div className="flex justify-between items-center text-gray-700">
                <span>Base Rental Net</span>
                <span className="font-mono font-medium">{formatCurrency(costs.baseNet)}</span>
              </div>
              
              <div className="flex justify-between items-center text-gray-700">
                <span>Total Net (Includes Logistics, Insurance, Extras)</span>
                <span className="font-mono font-medium">{formatCurrency(costs.net)}</span>
              </div>
              
              <div className="flex justify-between items-center text-gray-700">
                <span>Calculated VAT (20%)</span>
                <span className="font-mono font-medium">{formatCurrency(costs.vat)}</span>
              </div>

              {/* Discounts */}
              {costs.discountAmount > 0 && (
                <div className="flex justify-between items-center text-green-700 bg-green-50 p-2 rounded -mx-2 px-2">
                  <span className="font-bold">Total Discounts Applied</span>
                  <span className="font-mono font-black">- {formatCurrency(costs.discountAmount)}</span>
                </div>
              )}

              {/* Final Gross */}
              <div className="border-t border-gray-300 pt-3 mt-3 flex justify-between items-center">
                <span className="text-base font-black text-gray-900 uppercase">Updated Final Cost (Gross)</span>
                <span className="text-2xl font-black text-primary font-mono">{formatCurrency(costs.gross)}</span>
              </div>
            </div>
          </div>

          {/* Payment Details & Owing */}
          <div className="bg-blue-50 p-6 rounded-xl border border-blue-200">
            <h3 className="text-md font-bold text-blue-900 mb-3 border-b border-blue-200 pb-2">Payment Tracking</h3>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between text-blue-800">
                <span>Historically Paid to Date</span>
                <span className="font-bold font-mono">{formatCurrency(rental.paidAmount || 0)}</span>
              </div>

              {Number(formData.amountToAdd) > 0 && (
                <div className="flex justify-between text-emerald-700 bg-emerald-50 p-2 rounded -mx-2 px-2">
                  <span className="font-bold">Instant Payment Being Added Now</span>
                  <span className="font-bold font-mono">+ {formatCurrency(Number(formData.amountToAdd))}</span>
                </div>
              )}

              {/* Calculate dynamic owing amount based on new input */}
              {/* Calculate dynamic owing amount based on new input */}
<div className="border-t border-blue-200 pt-3 flex justify-between items-center">
  <span className="text-base font-black text-blue-950 uppercase">
    { (costs.gross - (rental.paidAmount || 0) - Number(formData.amountToAdd || 0)) < 0 ? 'Credit Amount' : 'Amount Owing (Remaining)' }
  </span>
  <span className={`text-xl font-black font-mono ${(costs.gross - (rental.paidAmount || 0) - Number(formData.amountToAdd || 0)) > 0 ? 'text-red-600' : 'text-green-600'}`}>
    {formatCurrency(Math.abs(costs.gross - (rental.paidAmount || 0) - Number(formData.amountToAdd || 0)))}
  </span>
</div>
            </div>
          </div>

          {/* Warnings */}
          {formData.status === 'completed' && (costs.gross - (rental.paidAmount || 0) - Number(formData.amountToAdd || 0)) > 0.01 && (
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-4 rounded-xl flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5 text-yellow-600" />
              <p className="text-sm font-medium">You are marking this rental as <strong>Completed</strong>, but there is still an outstanding balance of <span className="font-bold font-mono">{formatCurrency(costs.gross - (rental.paidAmount || 0) - Number(formData.amountToAdd || 0))}</span>.</p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button type="button" onClick={() => setIsConfirmModalOpen(false)} className="px-5 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl font-bold transition-colors">
              Back to Edit
            </button>
            <button onClick={executeUpdateRental} disabled={loading} className="px-6 py-2 bg-primary text-white hover:bg-primary-600 rounded-xl font-black flex items-center gap-2 transition-colors shadow-md disabled:opacity-50">
              {loading ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div> : <CheckCircle className="w-5 h-5" />}
              Save Rental Updates
            </button>
          </div>
        </div>
      </Modal>

    </>
  );
};

export default RentalEditModal;