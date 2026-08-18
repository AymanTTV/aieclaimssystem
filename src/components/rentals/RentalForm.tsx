// src/components/rentals/RentalForm.tsx
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { addDoc, collection, updateDoc, doc, query, getDocs, orderBy, limit } from 'firebase/firestore';
import { db, storage } from '../../lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Vehicle, Customer, Claim, RentalPayment, VehicleCondition, Rental, HireSubstitutionDetails } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { calculateRentalCostDetailed, RENTAL_RATES } from '../../utils/rentalCalculations';
import { generateRentalDocuments } from '../../utils/generateRentalDocuments';
import { uploadRentalDocuments } from '../../utils/uploadRentalDocuments';
import FormField from '../ui/FormField';
import { addWeeks, differenceInDays, isAfter, isValid } from 'date-fns';
import toast from 'react-hot-toast';
import { Search, Car, X, AlertTriangle, CheckCircle, Info, User, FileText, PoundSterling, Plus } from 'lucide-react';
import { useAvailableVehicles } from '../../hooks/useAvailableVehicles';
import { createFinanceTransaction } from '../../utils/financeTransactions';
import { useFormattedDisplay } from '../../hooks/useFormattedDisplay';
import FileUpload from '../ui/FileUpload';
import TextArea from '../ui/TextArea';
import Modal from '../ui/Modal'; 
import SignaturePad from '../ui/SignaturePad';

interface RentalFormProps {
  vehicles: Vehicle[];
  customers: Customer[];
  onClose: () => void;
}

type SubForm = Omit<HireSubstitutionDetails, 'givenAt' | 'expectedReturnAt'> & { 
  givenAt: string; 
  expectedReturnAt: string; 
  mileage: number | ''; 
  fuelLevel: string; 
  isClean: boolean; 
  hasDamage: boolean; 
  damageDescription: string; 
  images: string[]; 
};

const newSubDetail = (): SubForm => ({
  make: '', model: '', registration: '', loaner: '', givenAt: '', expectedReturnAt: '', notes: '',
  mileage: 0, fuelLevel: '100', isClean: true, hasDamage: false, damageDescription: '', images: []
});

const RentalForm: React.FC<RentalFormProps> = ({ vehicles, customers, onClose }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const { formatCurrency } = useFormattedDisplay();
  const topRef = useRef<HTMLDivElement>(null);

  const [vehicleSearchQuery, setVehicleSearchQuery] = useState('');
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [showVehicleResults, setShowVehicleResults] = useState(false);
  const [showCustomerResults, setShowCustomerResults] = useState(false);
  const [images, setImages] = useState<File[]>([]);
  
  const [subNewImages, setSubNewImages] = useState<Record<number, File[]>>({});
  const [subVehicleSearchQueries, setSubVehicleSearchQueries] = useState<string[]>([]);
  const [showSubVehicleResults, setShowSubVehicleResults] = useState<boolean[]>([]);

  const [showClaimResults, setShowClaimResults] = useState(false);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [claimSearchQuery, setClaimSearchQuery] = useState('');
  const [manualClaimRef, setManualClaimRef] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [rentalAgreementNumber, setRentalAgreementNumber] = useState('');

  // Active step for new visual overhaul
  const [activeStep, setActiveStep] = useState<1 | 2 | 3>(1);

  useEffect(() => {
    const fetchNextNumber = async () => {
      try {
        const q = query(collection(db, 'rentals'), orderBy('createdAt', 'desc'), limit(1));
        const snapshot = await getDocs(q);
        let nextNum = 1;
        if (!snapshot.empty) {
          const lastData = snapshot.docs[0].data();
          const lastNumStr = lastData.rentalAgreementNumber;
          if (lastNumStr && !isNaN(parseInt(lastNumStr))) nextNum = parseInt(lastNumStr) + 1;
        }
        setRentalAgreementNumber(String(nextNum).padStart(4, '0'));
      } catch (err) {
        setRentalAgreementNumber(String(Date.now()).slice(-4)); 
      }
    };
    fetchNextNumber();
  }, []);

  useEffect(() => {
    const fetchClaims = async () => {
      try {
        const snap = await getDocs(query(collection(db, 'claims')));
        setClaims(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Claim[]);
      } catch {}
    };
    fetchClaims();
  }, []);

  const filteredClaims = useMemo(() => {
    if (!claimSearchQuery) return [];
    const s = claimSearchQuery.toLowerCase();
    return (claims || []).filter(c => 
      (c.clientInfo?.name?.toLowerCase() || '').includes(s) || 
      (c.clientRef?.toLowerCase() || '').includes(s) || 
      c.id.toLowerCase().includes(s)
    );
  }, [claims, claimSearchQuery]);

  const [formData, setFormData] = useState({
    vehicleId: '', customerId: '',
    startDate: new Date().toISOString().split('T')[0],
    startTime: new Date().toTimeString().slice(0, 5),
    endDate: '', 
    endTime: new Date().toTimeString().slice(0, 5), 
    type: 'daily' as const, reason: 'hired' as const, status: 'scheduled' as const,
    numberOfWeeks: 1, signature: '',
    paidAmount: 0, paymentMethod: 'cash' as const, paymentReference: '', paymentNotes: '',
    negotiatedRate: '', negotiationNotes: '',
    discountPercentage: 0, discountAmount: 0, discountNotes: '',
    storageStartDate: '', storageEndDate: '', storageCostPerDay: 0, storageDays: 0, includeStorageVAT: false,
    recoveryCost: 0, includeRecoveryCostVAT: false,
    deliveryCharge: 0, collectionCharge: 0,
    insurancePerDay: 0, insurancePerWeek: 0,
    claimRef: '', includeVAT: false,
    deliveryChargeIncludeVAT: false, collectionChargeIncludeVAT: false,
    insurancePerDayIncludeVAT: false, insurancePerWeekIncludeVAT: false,
    hireSubstitutionDetails: [] as SubForm[]
  });

  const [insurancePerDayTouched, setInsurancePerDayTouched] = useState(false);
  const [insurancePerWeekTouched, setInsurancePerWeekTouched] = useState(false);

  const [conditionData, setConditionData] = useState<Partial<VehicleCondition> & { mileage: number | '' }>({
    mileage: 0, fuelLevel: '100', isClean: true, hasDamage: false, damageDescription: '', images: []
  });

  useEffect(() => {
    if (formData.storageStartDate && formData.storageEndDate) {
      const start = new Date(formData.storageStartDate); 
      const end = new Date(formData.storageEndDate);
      if (isValid(start) && isValid(end) && !isAfter(start, end)) {
         setFormData(p => ({ ...p, storageDays: Math.max(1, differenceInDays(end, start)) }));
      } else setFormData(p => ({ ...p, storageDays: 0 }));
    } else setFormData(p => ({ ...p, storageDays: 0 }));
  }, [formData.storageStartDate, formData.storageEndDate]);

  const { availableVehicles, loading: loadingVehicles } = useAvailableVehicles(
    vehicles,
    formData.startDate && formData.startTime ? new Date(`${formData.startDate}T${formData.startTime}`) : undefined,
    formData.endDate && formData.endTime ? new Date(`${formData.endDate}T${formData.endTime}`) : undefined
  );

  const filteredVehicles = availableVehicles.filter(v => 
    `${v.make} ${v.model} ${v.registrationNumber}`.toLowerCase().includes(vehicleSearchQuery.toLowerCase())
  );
  const filteredCustomers = customers.filter(c => 
    `${c.name} ${c.mobile} ${c.email}`.toLowerCase().includes(customerSearchQuery.toLowerCase())
  );

  const selectedVehicle = vehicles.find(v => v.id === formData.vehicleId);
  const selectedCustomer = customers.find(c => c.id === formData.customerId);

  useEffect(() => {
    if (!selectedVehicle) return;
    if (formData.type === 'daily' && !insurancePerDayTouched) setFormData(p => ({ ...p, insurancePerDay: (selectedVehicle as any).dailyInsuranceAmount || 0 }));
    if (formData.type === 'claim' && !insurancePerDayTouched) setFormData(p => ({ ...p, insurancePerDay: (selectedVehicle as any).claimInsuranceAmount || 0 }));
    if (formData.type === 'weekly' && !insurancePerWeekTouched) setFormData(p => ({ ...p, insurancePerWeek: (selectedVehicle as any).weeklyInsuranceAmount || 0 }));
  }, [selectedVehicle?.id, formData.type, insurancePerDayTouched, insurancePerWeekTouched]);

  useEffect(() => {
    setInsurancePerDayTouched(false);
    setInsurancePerWeekTouched(false);
  }, [formData.type]);

  const [lastDiscountEdit, setLastDiscountEdit] = useState<'pct'|'amt'|null>(null);

  const calculatedCosts = () => {
    if (!selectedVehicle || !formData.startDate || !formData.endDate || !formData.startTime || !formData.endTime) 
      return { net: 0, vat: 0, gross: 0, discountAmount: 0 };
    
    const s = new Date(`${formData.startDate}T${formData.startTime}`);
    const e = new Date(`${formData.endDate}T${formData.endTime}`);
    if (!isValid(s) || !isValid(e) || isAfter(s, e)) return { net: 0, vat: 0, gross: 0, discountAmount: 0 };

    let storCost = 0;
    if (formData.type === 'claim' && formData.storageStartDate && formData.storageEndDate) {
      const ss = new Date(formData.storageStartDate); const se = new Date(formData.storageEndDate);
      if (isValid(ss) && isValid(se) && !isAfter(ss, se)) {
        storCost = Math.max(1, differenceInDays(se, ss)) * formData.storageCostPerDay;
      }
    }

    return calculateRentalCostDetailed(
      s, e, formData.type, selectedVehicle, formData.reason,
      formData.negotiatedRate ? parseFloat(formData.negotiatedRate) : undefined,
      formData.type === 'claim' ? storCost : 0,
      formData.type === 'claim' ? formData.recoveryCost : 0,
      formData.deliveryCharge, formData.collectionCharge,
      formData.type !== 'weekly' ? formData.insurancePerDay : 0,
      formData.type === 'weekly' ? formData.insurancePerWeek : 0,
      formData.includeVAT, formData.deliveryChargeIncludeVAT, formData.collectionChargeIncludeVAT,
      formData.insurancePerDayIncludeVAT, formData.insurancePerWeekIncludeVAT, formData.includeRecoveryCostVAT,
      formData.includeStorageVAT,
      lastDiscountEdit === 'amt' ? 0 : formData.discountPercentage,
      lastDiscountEdit === 'amt' ? formData.discountAmount : 0,
      'scheduled',
      selectedVehicle.dailyRentalPrice || RENTAL_RATES.daily,
      selectedVehicle.weeklyRentalPrice || RENTAL_RATES.weekly,
      selectedVehicle.claimRentalPrice || RENTAL_RATES.claim,
      0 
    );
  };

  const costs = calculatedCosts();
  const finalRemainingAmountCalc = costs.gross - (formData.paidAmount || 0);

  useEffect(() => {
    if ((costs as any).baseNet === 0 && costs.gross === 0) return;
    if (lastDiscountEdit === 'amt') {
        const pct = (costs as any).baseNet > 0 ? (formData.discountAmount / (costs as any).baseNet) * 100 : 0;
        setFormData(p => ({ ...p, discountPercentage: parseFloat(pct.toFixed(2)) }));
    } else if (lastDiscountEdit === 'pct') {
        setFormData(p => ({ ...p, discountAmount: costs.discountAmount }));
    }
  }, [costs.discountAmount, lastDiscountEdit]);

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

  const handleSubChange = (index: number, e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const newSubs = [...formData.hireSubstitutionDetails];
    if (type === 'checkbox') (newSubs[index] as any) = { ...newSubs[index], [name]: (e.target as HTMLInputElement).checked };
    else if (type === 'number') (newSubs[index] as any) = { ...newSubs[index], [name]: value === '' ? '' : parseFloat(value) };
    else (newSubs[index] as any) = { ...newSubs[index], [name]: value };
    setFormData(prev => ({ ...prev, hireSubstitutionDetails: newSubs }));
  };

  const addSubstitutionVehicle = () => {
    setFormData(prev => ({ ...prev, hireSubstitutionDetails: [...prev.hireSubstitutionDetails, newSubDetail()] }));
  };

  const removeSubstitutionVehicle = (index: number) => {
    setFormData(prev => ({ ...prev, hireSubstitutionDetails: prev.hireSubstitutionDetails.filter((_, i) => i !== index) }));
    const newSubImages = { ...subNewImages }; delete newSubImages[index]; setSubNewImages(newSubImages);
  };

  const handleInitialSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVehicle || !selectedCustomer) return toast.error('Vehicle and Customer required');
    if (!formData.startDate || !formData.endDate) return toast.error('Dates required');
    topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setIsConfirmModalOpen(true);
  };

  const executeCreateRental = async () => {
    if (!user || !selectedVehicle || !selectedCustomer) return;
    setLoading(true);
    setIsConfirmModalOpen(false);

    try {
      const s = new Date(`${formData.startDate}T${formData.startTime}`);
      const e = new Date(`${formData.endDate}T${formData.endTime}`);

      const payments: RentalPayment[] = [];
      if (formData.paidAmount > 0) {
        payments.push({
          id: `payment_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          date: new Date(), amount: formData.paidAmount, method: formData.paymentMethod,
          reference: formData.paymentReference || undefined, notes: formData.paymentNotes || undefined,
          createdAt: new Date(), createdBy: user.id
        });
      }

      const submitHireSubstitutionDetails = formData.reason === 'h-substitute' && formData.hireSubstitutionDetails.length > 0
        ? await Promise.all(formData.hireSubstitutionDetails.filter(sub => sub.make || sub.loaner || sub.registration).map(async (sub, index) => {
            let subImageUrls: string[] = [];
            const files = subNewImages[index] || [];
            if (files.length > 0) {
              subImageUrls = await Promise.all(files.map(async file => {
                 const snap = await uploadBytes(ref(storage, `sub-conditions/${Date.now()}_${index}_${file.name}`), file);
                 return getDownloadURL(snap.ref);
              }));
            }
            return {
              ...sub,
              givenAt: new Date(sub.givenAt || Date.now()),
              expectedReturnAt: new Date(sub.expectedReturnAt || Date.now()),
              mileage: sub.mileage === '' ? 0 : Number(sub.mileage),
              fuelLevel: sub.fuelLevel,
              isClean: sub.isClean,
              hasDamage: sub.hasDamage,
              damageDescription: sub.hasDamage ? sub.damageDescription : '',
              images: subImageUrls
            };
          }))
        : null;

      const rentalData: Omit<Rental, 'id' | 'checkOutCondition' | 'checkInCondition' | 'returnCondition'> = {
        rentalAgreementNumber,
        vehicleId: formData.vehicleId, customerId: formData.customerId,
        startDate: s, endDate: e, originalStartDate: s,
        type: formData.type, reason: formData.reason, status: formData.status,
        
        lockedDailyRate: selectedVehicle.dailyRentalPrice || RENTAL_RATES.daily,
        lockedWeeklyRate: selectedVehicle.weeklyRentalPrice || RENTAL_RATES.weekly,
        lockedClaimRate: selectedVehicle.claimRentalPrice || RENTAL_RATES.claim,

        cost: costs.gross,
        paidAmount: formData.paidAmount || 0,
        remainingAmount: finalRemainingAmountCalc,
        paymentStatus: finalRemainingAmountCalc <= 0.001 ? 'paid' : formData.paidAmount > 0 ? 'partially_paid' : 'pending',
        payments, signature: formData.signature || null, claimRef: formData.claimRef || null,

        deliveryCharge: formData.deliveryCharge, collectionCharge: formData.collectionCharge,
        insurancePerDay: formData.type !== 'weekly' ? formData.insurancePerDay : null,
        insurancePerWeek: formData.type === 'weekly' ? formData.insurancePerWeek : null,
        includeVAT: formData.includeVAT,
        deliveryChargeIncludeVAT: formData.deliveryChargeIncludeVAT, collectionChargeIncludeVAT: formData.collectionChargeIncludeVAT,
        insurancePerDayIncludeVAT: formData.type !== 'weekly' ? formData.insurancePerDayIncludeVAT : false,
        insurancePerWeekIncludeVAT: formData.type === 'weekly' ? formData.insurancePerWeekIncludeVAT : false,

        storageStartDate: formData.type === 'claim' && formData.storageStartDate ? new Date(formData.storageStartDate) : null,
        storageEndDate: formData.type === 'claim' && formData.storageEndDate ? new Date(formData.storageEndDate) : null,
        storageCostPerDay: formData.type === 'claim' ? formData.storageCostPerDay || 0 : null,
        storageDays: formData.type === 'claim' ? formData.storageDays || 0 : null,
        includeStorageVAT: formData.type === 'claim' ? formData.includeStorageVAT : null,
        recoveryCost: formData.type === 'claim' ? formData.recoveryCost || 0 : null,
        includeRecoveryCostVAT: formData.type === 'claim' ? formData.includeRecoveryCostVAT : null,

        negotiatedRate: formData.negotiatedRate ? parseFloat(formData.negotiatedRate) : null,
        
        extraCharges: [],
        discounts: costs.discountAmount > 0 ? [{
           id: `disc_${Date.now()}`,
           percentage: formData.discountPercentage || 0,
           amount: costs.discountAmount,
           reason: formData.negotiationNotes || 'Initial Discount',
           createdAt: new Date(),
           createdBy: user.id
        }] : [],
        
        discountPercentage: null, 
        discountAmount: costs.discountAmount || null, 
        
        hireSubstitutionDetails: submitHireSubstitutionDetails,

        createdAt: new Date(), createdBy: user.id, updatedAt: new Date(), updatedBy: user.id,
        paymentMethod: formData.paymentMethod
      } as Rental;

      const docRef = await addDoc(collection(db, 'rentals'), rentalData);

      let conditionImageUrls: string[] = [];
      if (images.length > 0) {
        conditionImageUrls = await Promise.all(images.map(async file => {
          const snap = await uploadBytes(ref(storage, `vehicle-conditions/${docRef.id}/${Date.now()}_${file.name}`), file);
          return getDownloadURL(snap.ref);
        }));
      }

      await updateDoc(doc(db, 'rentals', docRef.id), { 
        checkOutCondition: {
          id: `cond_${Date.now()}`, type: 'check-out', date: s,
          mileage: conditionData.mileage === '' ? 0 : Number(conditionData.mileage), fuelLevel: conditionData.fuelLevel || '100',
          isClean: conditionData.isClean ?? true, hasDamage: !!conditionData.hasDamage,
          damageDescription: conditionData.hasDamage ? conditionData.damageDescription || '' : '',
          images: conditionImageUrls, createdAt: new Date(), createdBy: user.id
        } 
      });

      setLoading(false);
      onClose();
      toast.success('Rental created securely.');

      setTimeout(async () => {
         try {
           const fullRental = { id: docRef.id, ...rentalData } as Rental;
           const docs = await generateRentalDocuments(fullRental, selectedVehicle, selectedCustomer);
           await uploadRentalDocuments(docRef.id, {
             agreements: { [`agreement_${s.getTime()}`]: docs.agreement },
             invoice: docs.invoice, permit: docs.permit, claimDocuments: docs.claimDocuments
           });
         } catch {}
         
         if (formData.paidAmount > 0) {
            await createFinanceTransaction({
              type: 'income', category: 'Rental', amount: formData.paidAmount,
              description: `A ${formData.type} Rental payment`,
              referenceId: docRef.id, paymentMethod: formData.paymentMethod,
              status: 'completed', paymentStatus: finalRemainingAmountCalc <= 0 ? 'paid' : 'partially_paid',
              date: new Date(), vehicleId: formData.vehicleId, customerId: formData.customerId,
              accountTo: selectedVehicle?.owner?.accountId,
              groupId: selectedVehicle?.assignedGroupId || undefined // ✅ Attach Group ID
            });
         }
      }, 500);
    } catch (e: any) {
      toast.error('Failed to create rental');
      setLoading(false);
    }
  };

  useEffect(() => {
    if (formData.type === 'weekly' && formData.startDate && formData.startTime) {
      const s = new Date(`${formData.startDate}T${formData.startTime}`);
      if (isValid(s)) {
        const currentDay = s.getDay();
        const daysUntilMonday = currentDay === 0 ? 1 : 8 - currentDay; 
        
        const targetDate = new Date(s);
        targetDate.setDate(targetDate.getDate() + daysUntilMonday + ((formData.numberOfWeeks || 1) - 1) * 7);

        setFormData(p => ({ 
          ...p, 
          endDate: targetDate.toISOString().split('T')[0],
          endTime: '12:00'
        }));
      }
    }
  }, [formData.type, formData.numberOfWeeks, formData.startDate, formData.startTime]);

  return (
    <>
      <div ref={topRef} />
      
      <div className="flex border-b border-gray-200 mb-6 sticky top-0 bg-white z-10 shadow-sm rounded-t-lg">
        {[
          { step: 1, label: 'Vehicle & Customer', icon: User },
          { step: 2, label: 'Rental Config & Finance', icon: PoundSterling },
          { step: 3, label: 'Checkout Condition', icon: CheckCircle }
        ].map((s) => (
          <button
            key={s.step} type="button"
            className={`flex-1 py-4 text-sm font-medium border-b-2 flex items-center justify-center gap-2 transition-colors
              ${activeStep === s.step ? 'border-primary text-primary bg-primary-50/50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
            onClick={() => setActiveStep(s.step as any)}
          >
            <s.icon className="w-4 h-4" /> <span className="hidden sm:inline">{s.label}</span>
          </button>
        ))}
      </div>

      <form onSubmit={handleInitialSubmit} className="space-y-6 px-2">
        {/* STEP 1 */}
        {activeStep === 1 && (
          <div className="space-y-8 animate-in fade-in zoom-in-95 duration-200">
             <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Car className="text-primary" /> Assign Vehicle
                </h3>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <input
                    type="text" value={vehicleSearchQuery}
                    onChange={e => { setVehicleSearchQuery(e.target.value); setShowVehicleResults(true); }}
                    onFocus={() => setShowVehicleResults(true)}
                    onBlur={() => setTimeout(() => setShowVehicleResults(false), 200)}
                    placeholder="Search by make, model, or plate..."
                    className="block w-full pl-10 pr-3 py-3 border-gray-300 rounded-lg focus:ring-primary focus:border-primary shadow-sm"
                  />
                  {showVehicleResults && (
                    <div className="absolute z-20 mt-1 w-full bg-white shadow-xl max-h-60 rounded-md py-1 overflow-auto border border-gray-100">
                      {filteredVehicles.map(v => (
                        <div key={v.id} 
                           className={`px-4 py-3 border-b border-gray-50 ${(v as any).hasConflict ? 'opacity-50' : 'cursor-pointer hover:bg-blue-50'}`}
                           onMouseDown={(e) => {
                             e.preventDefault();
                             if ((v as any).hasConflict) return toast.error(`Busy: ${(v as any).message}`);
                             setFormData(p => ({ ...p, vehicleId: v.id }));
                             setVehicleSearchQuery(`${v.make} ${v.model} - ${v.registrationNumber}`);
                             setShowVehicleResults(false);
                             setConditionData(p => ({ ...p, mileage: v.mileage || 0 }));
                           }}
                        >
                          <div className="font-semibold text-gray-800">{v.make} {v.model} <span className="text-primary ml-2">{v.registrationNumber}</span></div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {selectedVehicle && (
                  <div className="mt-4 p-4 bg-white border border-green-200 rounded-lg flex items-center gap-4">
                    <CheckCircle className="text-green-500 w-6 h-6" />
                    <div><p className="font-bold">{selectedVehicle.make} {selectedVehicle.model}</p><p className="text-sm text-gray-500">{selectedVehicle.registrationNumber}</p></div>
                  </div>
                )}
             </div>

             <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <User className="text-blue-600" /> Assign Customer
                </h3>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <input
                    type="text" value={customerSearchQuery}
                    onChange={e => { setCustomerSearchQuery(e.target.value); setShowCustomerResults(true); }}
                    onFocus={() => setShowCustomerResults(true)}
                    onBlur={() => setTimeout(() => setShowCustomerResults(false), 200)}
                    placeholder="Search by name, email, or mobile..."
                    className="block w-full pl-10 pr-3 py-3 border-gray-300 rounded-lg focus:ring-primary focus:border-primary shadow-sm"
                  />
                 {showCustomerResults && (
                    <div className="absolute z-20 mt-1 w-full bg-white shadow-xl max-h-60 rounded-md py-1 overflow-auto border border-gray-100">
                      {filteredCustomers.map(c => (
                        <div key={c.id} className="px-4 py-3 border-b border-gray-50 cursor-pointer hover:bg-blue-50"
                           onMouseDown={() => { 
                             setFormData(p => ({...p, customerId: c.id, signature: c.signature || ''})); 
                             setCustomerSearchQuery(c.name); 
                             setShowCustomerResults(false); 
                           }}
                        >
                          <div className="font-semibold">{c.name}</div><div className="text-sm text-gray-500">{c.email} | {c.mobile}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                {selectedCustomer && (
                  <div className="mt-4 p-4 bg-white border border-green-200 rounded-lg flex flex-col gap-4">
                    <div className="flex items-center gap-4">
                      <CheckCircle className="text-green-500 w-6 h-6" />
                      <div>
                        <p className="font-bold">{selectedCustomer.name}</p>
                        <p className="text-sm text-gray-500">{selectedCustomer.mobile}</p>
                      </div>
                    </div>
                    
                    <div className="border-t border-gray-100 pt-4 mt-2">
                      <div className="flex justify-between items-center mb-2">
                         <label className="block text-sm font-bold text-gray-700">Customer Signature</label>
                         {formData.signature ? (
                           <span className="text-[10px] font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded border border-green-200 uppercase tracking-wider">Attached</span>
                         ) : (
                           <span className="text-[10px] font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-200 uppercase tracking-wider">Required</span>
                         )}
                      </div>
                      <SignaturePad
                        value={formData.signature}
                        onChange={(sig) => setFormData(p => ({ ...p, signature: sig }))}
                      />
                      <p className="text-xs text-gray-500 mt-2">
                        {formData.signature 
                          ? 'Signature is loaded from profile. You can clear and re-sign above if needed.' 
                          : 'Please have the customer sign above.'}
                      </p>
                    </div>
                  </div>
                )}
             </div>

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
                                   <FileUpload label="Add Check-Out Images" multiple accept="image/*" onChange={files => setSubNewImages(prev => ({ ...prev, [index]: files }))} showPreview />
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

        {/* STEP 2 */}
        {activeStep === 2 && (
          <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
               <h3 className="col-span-2 text-lg font-bold border-b pb-2">Scheduling</h3>
               <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Rental Type</label>
                  <select value={formData.type} onChange={e => setFormData(p => ({ ...p, type: e.target.value as any }))} className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary">
                    <option value="daily">Daily</option><option value="weekly">Weekly</option><option value="claim">Claim</option>
                  </select>
               </div>
               <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select value={formData.status} onChange={e => setFormData(p => ({ ...p, status: e.target.value as any }))} className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary">
                    <option value="scheduled">Scheduled</option><option value="active">Active</option>
                  </select>
               </div>
               
               <div className="col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
                    <select value={formData.reason} onChange={e => setFormData(p => ({ ...p, reason: e.target.value as any }))} className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary">
                      <option value="hired">Hire</option><option value="claim">Claim</option><option value="o/d">O/D</option><option value="staff">Staff</option><option value="workshop">Workshop</option>
                    </select>
                 </div>
                 {formData.type === 'claim' && (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-sm font-medium text-gray-700">Claim Reference</label>
                        <label className="flex items-center space-x-2 text-xs"><input type="checkbox" checked={manualClaimRef} onChange={e => setManualClaimRef(e.target.checked)} className="rounded" /><span>Manual</span></label>
                      </div>
                      {manualClaimRef ? (
                        <input type="text" value={formData.claimRef} onChange={e => setFormData(p => ({...p, claimRef: e.target.value}))} className="w-full rounded border-gray-300 shadow-sm" placeholder="Enter claim ref" />
                      ) : (
                        <div className="relative">
                          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                          <input type="text" value={claimSearchQuery} onChange={e => { setClaimSearchQuery(e.target.value); setShowClaimResults(true); }} onFocus={() => setShowClaimResults(true)} onBlur={() => setTimeout(() => setShowClaimResults(false), 200)} placeholder="Search claims..." className="w-full pl-9 py-2 border rounded-md shadow-sm" />
                          {showClaimResults && (
                            <div className="absolute z-10 w-full mt-1 bg-white border rounded shadow-lg max-h-48 overflow-auto">
                              {filteredClaims.map(c => (
                                <div key={c.id} className="p-2 border-b cursor-pointer hover:bg-gray-50" onMouseDown={() => { setFormData(p => ({...p, claimRef: c.clientRef || c.id})); setClaimSearchQuery(c.clientRef || c.id); setShowClaimResults(false); }}>
                                  <div className="font-bold text-sm">{c.clientRef || c.id}</div><div className="text-xs text-gray-500">{c.clientInfo?.name}</div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                 )}
               </div>

               <div className="col-span-2 flex items-center gap-3 bg-blue-50/50 p-3 rounded-lg border border-blue-100">
                  <input type="checkbox" id="includeVAT" checked={formData.includeVAT} onChange={e => setFormData(p => ({ ...p, includeVAT: e.target.checked }))} className="w-5 h-5 text-primary rounded border-gray-300" />
                  <label htmlFor="includeVAT" className="font-bold text-gray-800">Apply Standard 20% VAT to Base Rental Cost</label>
               </div>

               <FormField type="date" label="Start Date" value={formData.startDate} onChange={e => setFormData(p => ({ ...p, startDate: e.target.value }))} required />
               <FormField type="time" label="Start Time" value={formData.startTime} onChange={e => setFormData(p => ({ ...p, startTime: e.target.value }))} required />
               
               {formData.type === 'weekly' ? (
                 <>
                   <FormField type="number" label="Weeks" value={formData.numberOfWeeks} onChange={e => { setFormData(p => ({ ...p, numberOfWeeks: parseInt(e.target.value)||1 })); }} min="1" required />
                   <div className="grid grid-cols-2 gap-2">
                     <FormField type="date" label="End Date (Auto)" value={formData.endDate} disabled />
                     <FormField type="time" label="End Time" value={formData.endTime} disabled />
                   </div>
                 </>
               ) : (
                 <>
                   <FormField type="date" label="End Date" value={formData.endDate} onChange={e => setFormData(p => ({ ...p, endDate: e.target.value }))} required />
                   <FormField type="time" label="End Time" value={formData.endTime} onChange={e => setFormData(p => ({ ...p, endTime: e.target.value }))} required />
                 </>
               )}
            </div>

            {/* Insurance Blocks */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
               <h3 className="col-span-1 md:col-span-2 text-lg font-bold border-b pb-2">Insurance & Extras</h3>
               {formData.type === 'weekly' ? (
                  <div className="flex items-end gap-3 col-span-2 border p-3 rounded bg-gray-50">
                    <div className="flex-1"><FormField type="number" label="Insurance Per Week (£)" value={formData.insurancePerWeek} onChange={e => { setInsurancePerWeekTouched(true); setFormData(p => ({...p, insurancePerWeek: parseFloat(e.target.value)||0})); }} /></div>
                    <label className="flex items-center gap-2 pb-2 font-medium"><input type="checkbox" checked={formData.insurancePerWeekIncludeVAT} onChange={e => setFormData(p => ({...p, insurancePerWeekIncludeVAT: e.target.checked}))} className="rounded" /> Inc VAT</label>
                  </div>
               ) : (
                  <div className="flex items-end gap-3 col-span-2 border p-3 rounded bg-gray-50">
                    <div className="flex-1"><FormField type="number" label="Insurance Per Day (£)" value={formData.insurancePerDay} onChange={e => { setInsurancePerDayTouched(true); setFormData(p => ({...p, insurancePerDay: parseFloat(e.target.value)||0})); }} /></div>
                    <label className="flex items-center gap-2 pb-2 font-medium"><input type="checkbox" checked={formData.insurancePerDayIncludeVAT} onChange={e => setFormData(p => ({...p, insurancePerDayIncludeVAT: e.target.checked}))} className="rounded" /> Inc VAT</label>
                  </div>
               )}
               {/* Claim Specific Extras */}
               {formData.type === 'claim' && (
                 <div className="col-span-2 grid grid-cols-2 gap-4 border-t pt-4">
                    <FormField type="date" label="Storage Start" value={formData.storageStartDate} onChange={e => setFormData(p => ({...p, storageStartDate: e.target.value}))} />
                    <FormField type="date" label="Storage End" value={formData.storageEndDate} onChange={e => setFormData(p => ({...p, storageEndDate: e.target.value}))} />
                    <div className="flex items-end gap-2"><div className="flex-1"><FormField type="number" label="Storage/Day (£)" value={formData.storageCostPerDay} onChange={e => setFormData(p => ({...p, storageCostPerDay: parseFloat(e.target.value)||0}))} /></div><input type="checkbox" checked={formData.includeStorageVAT} onChange={e => setFormData(p => ({...p, includeStorageVAT: e.target.checked}))} className="rounded mb-3" /></div>
                    <div className="flex items-end gap-2"><div className="flex-1"><FormField type="number" label="Recovery (£)" value={formData.recoveryCost} onChange={e => setFormData(p => ({...p, recoveryCost: parseFloat(e.target.value)||0}))} /></div><input type="checkbox" checked={formData.includeRecoveryCostVAT} onChange={e => setFormData(p => ({...p, includeRecoveryCostVAT: e.target.checked}))} className="rounded mb-3" /></div>
                    <div className="flex items-end gap-2"><div className="flex-1"><FormField type="number" label="Delivery (£)" value={formData.deliveryCharge} onChange={e => setFormData(p => ({...p, deliveryCharge: parseFloat(e.target.value)||0}))} /></div><input type="checkbox" checked={formData.deliveryChargeIncludeVAT} onChange={e => setFormData(p => ({...p, deliveryChargeIncludeVAT: e.target.checked}))} className="rounded mb-3" /></div>
                    <div className="flex items-end gap-2"><div className="flex-1"><FormField type="number" label="Collection (£)" value={formData.collectionCharge} onChange={e => setFormData(p => ({...p, collectionCharge: parseFloat(e.target.value)||0}))} /></div><input type="checkbox" checked={formData.collectionChargeIncludeVAT} onChange={e => setFormData(p => ({...p, collectionChargeIncludeVAT: e.target.checked}))} className="rounded mb-3" /></div>
                 </div>
               )}
            </div>

            <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 shadow-sm">
               <h3 className="text-lg font-bold text-gray-900 border-b pb-2 mb-4">Financials & Discounts</h3>
               <div className="grid grid-cols-2 gap-4">
                  <FormField type="number" label="Negotiated Override Rate (£)" value={formData.negotiatedRate} onChange={e => setFormData(p => ({ ...p, negotiatedRate: e.target.value }))} placeholder="Leave blank for default" />
                  <FormField type="number" label="Discount % (Applied BEFORE VAT)" value={formData.discountPercentage} onChange={e => { setLastDiscountEdit('pct'); setFormData(p => ({ ...p, discountPercentage: parseFloat(e.target.value)||0 })); }} />
                  <FormField type="number" label="Fixed Discount Amount (£)" value={formData.discountAmount} onChange={e => { setLastDiscountEdit('amt'); setFormData(p => ({ ...p, discountAmount: parseFloat(e.target.value)||0 })); }} />
                  
                  <div className="col-span-2 bg-blue-900 text-white p-5 rounded-xl shadow-inner mt-4 flex items-center justify-between">
                     <div>
                       <p className="text-blue-200 text-sm font-semibold uppercase tracking-wider">Gross Total</p>
                       <p className="text-4xl font-black tracking-tight">{formatCurrency(costs.gross)}</p>
                     </div>
                     <div className="text-right text-xs text-blue-300 space-y-1">
                       <p>Net: {formatCurrency(costs.net)}</p>
                       <p>VAT: {formatCurrency(costs.vat)}</p>
                       {costs.discountAmount > 0 && <p className="text-yellow-300 font-bold">Saved: {formatCurrency(costs.discountAmount)}</p>}
                     </div>
                  </div>
               </div>
            </div>
          </div>
        )}

        {/* STEP 3 */}
        {activeStep === 3 && (
          <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
             <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
               <h3 className="text-lg font-bold text-gray-900 border-b pb-2 mb-4 flex items-center gap-2"><Car className="text-primary"/> Main Vehicle Check-Out Condition</h3>
               <div className="grid grid-cols-2 gap-6">
                 <FormField type="number" label="Current Mileage" value={conditionData.mileage} onChange={e => setConditionData(p => ({ ...p, mileage: e.target.value === '' ? '' : parseInt(e.target.value, 10) }))} required />
                 <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Fuel Level</label>
                    <select value={conditionData.fuelLevel} onChange={e => setConditionData(p => ({ ...p, fuelLevel: e.target.value as any }))} className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary" required>
                       <option value="0">Empty (0%)</option><option value="25">Quarter (25%)</option><option value="50">Half (50%)</option><option value="75">Three Quarters (75%)</option><option value="100">Full (100%)</option>
                    </select>
                 </div>
                 <div className="flex gap-4 col-span-2 bg-gray-50 p-4 rounded-lg border">
                    <label className="flex items-center gap-2 font-bold text-gray-700 cursor-pointer">
                       <input type="checkbox" checked={!!conditionData.isClean} onChange={e => setConditionData(p => ({...p, isClean: e.target.checked}))} className="rounded w-5 h-5 text-primary"/> Is Clean
                    </label>
                    <label className="flex items-center gap-2 font-bold text-gray-700 cursor-pointer">
                       <input type="checkbox" checked={!!conditionData.hasDamage} onChange={e => setConditionData(p => ({...p, hasDamage: e.target.checked}))} className="rounded w-5 h-5 text-red-500"/> Has Damage
                    </label>
                 </div>
                 {conditionData.hasDamage && <div className="col-span-2"><TextArea label="Damage Description" value={conditionData.damageDescription as any} onChange={e => setConditionData(p => ({...p, damageDescription: e.target.value}))} rows={3} required /></div>}
               </div>
               <div className="mt-6">
                 <FileUpload label="Condition Evidence Photos" multiple accept="image/*" onChange={setImages} showPreview />
               </div>
             </div>

             <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <h3 className="text-lg font-bold text-gray-900 border-b pb-2 mb-4">Initial Payment</h3>
                <div className="grid grid-cols-2 gap-4">
                   <FormField type="number" label="Amount to Pay Now (£)" value={formData.paidAmount} onChange={e => setFormData(p => ({...p, paidAmount: parseFloat(e.target.value)||0}))} />
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
        )}

        {/* Fixed Footer */}
        <div className="flex justify-between items-center sticky bottom-0 bg-white border-t p-4 z-10">
          <button type="button" onClick={() => setActiveStep(p => p > 1 ? p - 1 : 1 as any)} disabled={activeStep === 1} className="px-4 py-2 border rounded-md disabled:opacity-50 font-medium text-gray-700 hover:bg-gray-50">Back</button>
          
          {activeStep === 1 && <button type="button" onClick={() => setActiveStep(2)} className="px-6 py-2 bg-gray-900 text-white rounded-md font-bold hover:bg-gray-800 shadow-md">Next Step</button>}
          {activeStep === 2 && <button type="button" onClick={() => setActiveStep(3)} className="px-6 py-2 bg-gray-900 text-white rounded-md font-bold hover:bg-gray-800 shadow-md">Next Step</button>}
          
          {activeStep === 3 && (
             <button type="submit" disabled={loading} className="px-6 py-2 bg-green-600 text-white rounded-md font-bold hover:bg-green-700 shadow-md flex items-center gap-2">
               {loading ? 'Processing...' : <><CheckCircle className="w-5 h-5"/> Verify & Confirm</>}
             </button>
          )}
        </div>
      </form>

      {/* Confirmation Modal */}
      <Modal isOpen={isConfirmModalOpen} onClose={() => setIsConfirmModalOpen(false)} title="Confirm Rental Details" size="lg">
         <div className="p-4 space-y-4">
            <div className="bg-blue-50 p-4 border-l-4 border-blue-500 rounded">
               <h3 className="font-bold text-blue-800 mb-1">Final Review</h3>
               <p className="text-sm text-blue-700">Please confirm these details before finalizing creation.</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
               <div className="bg-white border p-3 rounded">
                  <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Customer</p>
                  <p className="font-medium text-gray-900 mt-1">{selectedCustomer?.name}</p>
                  <p className="text-sm text-gray-600">{selectedCustomer?.mobile}</p>
               </div>
               <div className="bg-white border p-3 rounded">
                  <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Vehicle</p>
                  <p className="font-medium text-gray-900 mt-1">{selectedVehicle?.make} {selectedVehicle?.model}</p>
                  <p className="text-sm font-mono text-gray-600">{selectedVehicle?.registrationNumber}</p>
               </div>
               <div className="bg-white border p-3 rounded">
                  <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Timing</p>
                  <p className="font-medium text-gray-900 mt-1">{formData.startDate} @ {formData.startTime}</p>
                  <p className="text-sm text-gray-600">To: {formData.endDate} @ {formData.endTime}</p>
               </div>
               <div className="bg-white border p-3 rounded">
                  <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Parameters</p>
                  <p className="font-medium text-gray-900 mt-1 capitalize">Type: {formData.type}</p>
                  <p className="text-sm text-gray-600 capitalize">Reason: {formData.reason}</p>
               </div>
               <div className="col-span-2 bg-white border p-3 rounded flex justify-between">
                  <div>
                    <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Checkout Mileage</p>
                    <p className="font-medium text-gray-900 mt-1">{conditionData.mileage} miles</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Fuel Level</p>
                    <p className="font-medium text-gray-900 mt-1">{conditionData.fuelLevel}%</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Status</p>
                    <p className="font-medium text-gray-900 mt-1 capitalize">{formData.status}</p>
                  </div>
               </div>
            </div>

            {/* Finances */}
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mt-4">
               <p className="font-bold text-gray-800 border-b pb-2 mb-2">Cost Breakdown</p>
               <div className="flex justify-between py-1"><span className="text-gray-500">Net Cost</span><span className="font-mono">{formatCurrency((costs as any).baseNet)}</span></div>
               <div className="flex justify-between py-1"><span className="text-gray-500">VAT Total</span><span className="font-mono">{formatCurrency((costs as any).baseVat)}</span></div>
               {costs.discountAmount > 0 && <div className="flex justify-between py-1 text-green-700"><span className="font-bold">Discount Applied</span><span className="font-mono font-bold">-{formatCurrency(costs.discountAmount)}</span></div>}
               <div className="border-t mt-2 pt-2 flex justify-between font-bold text-lg text-gray-900">
                  <span>Gross Total</span><span>{formatCurrency(costs.gross)}</span>
               </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setIsConfirmModalOpen(false)} className="px-4 py-2 border rounded-md font-medium text-gray-700">Cancel</button>
              <button onClick={executeCreateRental} className="px-4 py-2 bg-green-600 text-white rounded-md font-bold flex items-center gap-2"><CheckCircle className="w-4 h-4" /> Finalize Creation</button>
            </div>
         </div>
      </Modal>
    </>
  );
};

export default RentalForm;