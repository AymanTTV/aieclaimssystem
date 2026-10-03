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
import { Search, Car, X, AlertTriangle, CheckCircle, Info, User, FileText, PoundSterling, Plus, MessageCircle, Mail, Printer, Building2, Landmark, Scale, ChevronDown, ChevronUp, Sparkles, Eye, Check, Lock } from 'lucide-react';
import { useAvailableVehicles } from '../../hooks/useAvailableVehicles';
import { createFinanceTransaction } from '../../utils/financeTransactions';
import { syncRentalRecord } from '../../services/unifiedSync.service';
import { useFormattedDisplay } from '../../hooks/useFormattedDisplay';
import { useCompanyDetails } from '../../hooks/useCompanyDetails';
import { CompanyEntity, getAvailableCompanyEntities } from '../../utils/entityBranding';
import { CompanyBankAccount, getEffectiveBankAccounts } from '../../utils/bankAccountAllocation';
import {
  DynamicTermTemplate,
  getTemplatesForDocumentType,
  fetchLatestDynamicTermTemplates,
} from '../../utils/documentTemplateTerms';
import FileUpload from '../ui/FileUpload';
import TextArea from '../ui/TextArea';
import Modal from '../ui/Modal'; 
import RentalCommunicationModal from './RentalCommunicationModal';
import { resolveCustomerOrUserSignature, saveSignatureEverywhere } from '../../utils/signatureStorage';
import { formatExecutionDateTime } from '../../utils/legalDocumentUtils';

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

  // Post-save quick action states & Share modal
  const [postSaveActions, setPostSaveActions] = useState({
    whatsapp: false,
    email: false,
    printPdf: false,
  });
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareInitialMode, setShareInitialMode] = useState<'whatsapp' | 'email'>('whatsapp');
  const [savedRentalForShare, setSavedRentalForShare] = useState<Rental | null>(null);
  const [isPrintingPdf, setIsPrintingPdf] = useState(false);

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

  const { companyDetails } = useCompanyDetails();
  const availableEntities = useMemo(
    () => getAvailableCompanyEntities(companyDetails),
    [companyDetails]
  );
  const availableBanks = useMemo(
    () => getEffectiveBankAccounts(companyDetails),
    [companyDetails]
  );
  const [dynamicTemplates, setDynamicTemplates] = useState<DynamicTermTemplate[]>([]);
  const [showTermsPreview, setShowTermsPreview] = useState(false);

  useEffect(() => {
    fetchLatestDynamicTermTemplates()
      .then((res) => {
        if (Array.isArray(res) && res.length > 0) {
          setDynamicTemplates(res);
        }
      })
      .catch(() => {});
  }, []);

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
    hireSubstitutionDetails: [] as SubForm[],

    // Corporate Entity & Logo Selection
    corporateEntityKey: 'aie_skyline',
    corporateEntityName: 'AIE Skyline Limited',
    corporateEntityLogo: '',

    // Bank Account Selection
    bankAccountId: '',
    bankAccountDetails: null as any,

    // Agreement Template & Statutory Terms Selection
    agreementTemplateId: 'daily_hire_terms',
    agreementTemplateTitle: 'DAILY VEHICLE HIRE TERMS & CONDITIONS',
    agreementTemplateContent: '',
  });

  const availableAgreementTemplates = useMemo(() => {
    return getTemplatesForDocumentType('rental_agreement', companyDetails, {
      documentScope: 'rental',
      hireType: formData.type,
    });
  }, [companyDetails, formData.type]);

  // Pre-populate Entity, Bank, and Agreement Template automatically based on Hire Type
  const handleHireTypeChange = (newType: 'daily' | 'weekly' | 'claim') => {
    // 1. Entity: AIE Claims Ltd for claims, AIE Skyline Limited for daily/weekly
    const targetEntityKey = newType === 'claim' ? 'aie_claims' : 'aie_skyline';
    const matchedEntity =
      availableEntities.find((e) => e.key === targetEntityKey) || availableEntities[0];

    // 2. Bank: NatWest/Claims recovery for claims, Lloyds/Default for daily/weekly
    let matchedBank = availableBanks[0];
    if (newType === 'claim') {
      const claimsBank = availableBanks.find(
        (b) => b.id.includes('claims') || b.id.includes('natwest')
      );
      if (claimsBank) matchedBank = claimsBank;
    } else {
      const mainBank = availableBanks.find((b) => b.isDefault || b.id.includes('lloyds'));
      if (mainBank) matchedBank = mainBank;
    }

    // 3. Agreement Template
    let matchedTemplate: { id: string; title: string; content: string } | null = null;
    if (dynamicTemplates.length > 0) {
      const found = dynamicTemplates.find(
        (t) =>
          t.isActive &&
          (newType === 'claim'
            ? t.hireType === 'claim' || t.id.includes('claim')
            : t.hireType === newType)
      );
      if (found) {
        matchedTemplate = { id: found.id, title: found.title, content: found.content };
      }
    }
    if (!matchedTemplate) {
      const rentalTemplates = getTemplatesForDocumentType('rental_agreement', companyDetails, {
        documentScope: 'rental',
        hireType: newType,
      });
      const t =
        rentalTemplates.find((tmpl) =>
          newType === 'claim'
            ? tmpl.category === 'Claims' || tmpl.id.includes('claim')
            : tmpl.isDefault
        ) ||
        rentalTemplates[0];
      if (t) {
        matchedTemplate = { id: t.id, title: t.title, content: t.content };
      } else {
        matchedTemplate = { id: '', title: '', content: '' };
      }
    }

    setFormData((prev) => ({
      ...prev,
      type: newType,
      corporateEntityKey: matchedEntity?.key || prev.corporateEntityKey,
      corporateEntityName: matchedEntity?.fullName || prev.corporateEntityName,
      corporateEntityLogo: matchedEntity?.logoUrl || prev.corporateEntityLogo,
      bankAccountId: matchedBank?.id || prev.bankAccountId,
      bankAccountDetails: matchedBank
        ? {
            bankName: matchedBank.bankName,
            accountName: matchedBank.accountName,
            accountNumber: matchedBank.accountNumber,
            sortCode: matchedBank.sortCode,
            iban: matchedBank.iban,
            bic: matchedBank.bic,
          }
        : prev.bankAccountDetails,
      agreementTemplateId: matchedTemplate?.id || prev.agreementTemplateId,
      agreementTemplateTitle: matchedTemplate?.title || prev.agreementTemplateTitle,
      agreementTemplateContent: matchedTemplate?.content || prev.agreementTemplateContent,
    }));
  };

  // Initial synchronization of Entity, Bank, and Template on load
  useEffect(() => {
    if (availableEntities.length > 0 && !formData.corporateEntityLogo) {
      const targetEntityKey = formData.type === 'claim' ? 'aie_claims' : 'aie_skyline';
      const ent = availableEntities.find((e) => e.key === targetEntityKey) || availableEntities[0];
      if (ent) {
        setFormData((p) => ({
          ...p,
          corporateEntityKey: ent.key,
          corporateEntityName: ent.fullName,
          corporateEntityLogo: ent.logoUrl || '',
        }));
      }
    }
    if (availableBanks.length > 0 && !formData.bankAccountId) {
      const b =
        formData.type === 'claim'
          ? availableBanks.find((x) => x.id.includes('claims') || x.id.includes('natwest')) ||
            availableBanks[0]
          : availableBanks.find((x) => x.isDefault || x.id.includes('lloyds')) ||
            availableBanks[0];
      if (b) {
        setFormData((p) => ({
          ...p,
          bankAccountId: b.id,
          bankAccountDetails: {
            bankName: b.bankName,
            accountName: b.accountName,
            accountNumber: b.accountNumber,
            sortCode: b.sortCode,
            iban: b.iban,
            bic: b.bic,
          },
        }));
      }
    }
    if (!formData.agreementTemplateContent) {
      const rentalTemplates = getTemplatesForDocumentType('rental_agreement', companyDetails, {
        documentScope: 'rental',
        hireType: formData.type,
      });
      const t = rentalTemplates[0];
      if (t) {
        setFormData((p) => ({
          ...p,
          agreementTemplateId: t.id,
          agreementTemplateTitle: t.title,
          agreementTemplateContent: t.content,
        }));
      }
    }
  }, [availableEntities, availableBanks, companyDetails]);

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

  const buildActiveRental = (): Rental => {
    const s = formData.startDate && formData.startTime ? new Date(`${formData.startDate}T${formData.startTime}`) : new Date();
    const e = formData.endDate && formData.endTime ? new Date(`${formData.endDate}T${formData.endTime}`) : new Date();
    return {
      id: rentalAgreementNumber || 'draft',
      rentalAgreementNumber,
      vehicleId: formData.vehicleId,
      customerId: formData.customerId,
      startDate: s,
      endDate: e,
      type: formData.type,
      reason: formData.reason,
      status: formData.status,
      cost: costs.gross,
      paidAmount: formData.paidAmount || 0,
      remainingAmount: finalRemainingAmountCalc,
      paymentStatus: finalRemainingAmountCalc <= 0.001 ? 'paid' : (formData.paidAmount > 0 ? 'partially_paid' : 'pending'),
      lockedDailyRate: selectedVehicle?.dailyRentalPrice || RENTAL_RATES.daily,
      lockedWeeklyRate: selectedVehicle?.weeklyRentalPrice || RENTAL_RATES.weekly,
      lockedClaimRate: selectedVehicle?.claimRentalPrice || RENTAL_RATES.claim,
      includeVAT: formData.includeVAT,
    } as Rental;
  };

  const handlePrintOrDownloadPDF = async (targetRental?: Rental) => {
    const r = targetRental || savedRentalForShare || buildActiveRental();
    if (!r || !selectedVehicle || !selectedCustomer) {
      toast.error('Vehicle and Customer are required to generate PDF');
      return;
    }
    setIsPrintingPdf(true);
    toast.loading('Preparing Rental PDF...');
    try {
      if (r.documents?.agreements) {
        const keys = Object.keys(r.documents.agreements);
        if (keys.length > 0) {
          const latest = keys.sort().reverse()[0];
          const url = r.documents.agreements[latest];
          if (url) {
            toast.dismiss();
            window.open(url, '_blank');
            return;
          }
        }
      }
      const docs = await generateRentalDocuments(r, selectedVehicle, selectedCustomer);
      const blob = docs.agreement || docs.invoice;
      toast.dismiss();
      if (blob) {
        const url = URL.createObjectURL(blob);
        const printWin = window.open(url, '_blank');
        if (printWin) {
          printWin.focus();
          toast.success('Rental PDF ready');
        } else {
          window.print();
        }
      } else {
        toast.error('Could not generate PDF');
      }
    } catch (err) {
      toast.dismiss();
      console.error(err);
      toast.error('Failed to prepare PDF');
    } finally {
      setIsPrintingPdf(false);
    }
  };

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

      // Auto-populate saved signature from Customer Profile / IndexedDB / Active User
      let effectiveSignature = formData.signature || selectedCustomer?.signature || null;
      if (!effectiveSignature) {
        effectiveSignature = await resolveCustomerOrUserSignature({
          customerId: formData.customerId,
          customer: selectedCustomer,
          customerName: selectedCustomer?.name,
          userId: user?.id,
          user,
        });
      }

      const isLegallySigned = Boolean(effectiveSignature);
      const backdatedExecutionTimestamp = formatExecutionDateTime(s, 'dd/MM/yyyy HH:mm');

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
        payments,
        signature: effectiveSignature,
        customerSignature: effectiveSignature,
        isSigned: isLegallySigned,
        documentStatus: isLegallySigned ? 'Legally Signed & Verified' : null,
        signedAt: isLegallySigned ? s : null,
        customerSignatureDate: isLegallySigned ? s : null,
        signatureTimestamp: isLegallySigned ? backdatedExecutionTimestamp : null,
        claimRef: formData.claimRef || null,

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

        // Saved Corporate Entity, Bank Account & Agreement T&C Settings
        corporateEntityKey: formData.corporateEntityKey || 'aie_skyline',
        corporateEntityName: formData.corporateEntityName || 'AIE Skyline Limited',
        corporateEntityLogo: formData.corporateEntityLogo || '',
        bankAccountId: formData.bankAccountId || '',
        bankAccountDetails: formData.bankAccountDetails || null,
        agreementTemplateId: formData.agreementTemplateId || '',
        agreementTemplateTitle: formData.agreementTemplateTitle || '',
        agreementTemplateContent: formData.agreementTemplateContent || '',

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

      // Synchronize immediately with Central Finance Ledger
      syncRentalRecord(docRef.id, rentalData).catch((err) =>
        console.warn('Background sync error for new rental:', err)
      );

      const fullRental = { id: docRef.id, ...rentalData } as Rental;
      if (effectiveSignature && formData.customerId) {
        saveSignatureEverywhere(formData.customerId, effectiveSignature, {
          customerId: formData.customerId,
          customerName: selectedCustomer?.name,
          userId: user?.id,
          autoUpdateFirestore: true,
        }).catch(() => {});
      }
      setSavedRentalForShare(fullRental);
      setIsConfirmModalOpen(false);
      setLoading(false);
      toast.success('Rental created securely.');

      // Execute selected post-save actions
      const hasWhatsApp = postSaveActions.whatsapp;
      const hasEmail = postSaveActions.email;
      const hasPrintPdf = postSaveActions.printPdf;

      if (hasPrintPdf) {
        handlePrintOrDownloadPDF(fullRental);
      }

      if (hasWhatsApp) {
        setShareInitialMode('whatsapp');
        setShowShareModal(true);
      } else if (hasEmail) {
        setShareInitialMode('email');
        setShowShareModal(true);
      } else {
        onClose();
      }

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
              type: 'income',
              transactionType: 'INCOME',
              entryType: 'CREDIT',
              category: 'Vehicle Rental Income',
              departmentName: 'Vehicle Rental / Fleet',
              amount: formData.paidAmount,
              customerBilled: formData.paidAmount,
              grossBilling: formData.paidAmount,
              paid: formData.paidAmount,
              paidAmount: formData.paidAmount,
              description: `A ${formData.type} Rental payment`,
              referenceId: docRef.id,
              sourceReferenceId: docRef.id,
              linkedInvoiceRef: docRef.id,
              entityId: docRef.id,
              entityType: 'RENTAL',
              paymentReference: rentalAgreementNumber || (docRef.id ? `RA-${docRef.id.slice(-6).toUpperCase()}` : ''),
              orderNumber: rentalAgreementNumber || undefined,
              vehicleRegistration: selectedVehicle?.registrationNumber || '',
              vehicleReg: selectedVehicle?.registrationNumber || '',
              vehicleName: selectedVehicle?.registrationNumber ? `${selectedVehicle.make || ''} ${selectedVehicle.model || ''} (${selectedVehicle.registrationNumber})`.trim() : undefined,
              paymentMethod: formData.paymentMethod,
              status: 'completed',
              paymentStatus: finalRemainingAmountCalc <= 0 ? 'paid' : 'partially_paid',
              date: new Date(),
              vehicleId: formData.vehicleId,
              customerId: formData.customerId,
              accountTo: selectedVehicle?.owner?.accountId,
              accountId: selectedVehicle?.owner?.accountId,
              accountsTo: selectedVehicle?.owner?.accountId ? [selectedVehicle?.owner?.accountId] : undefined,
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
    <div className="rental-form-container flex flex-col h-full min-h-0 bg-white text-slate-900">
      <div ref={topRef} />
      
      {/* Top Tab Navigation Bar */}
      <div className="flex border-b border-slate-200 sticky top-0 bg-white z-20 shadow-xs shrink-0">
        {[
          { step: 1, label: 'Vehicle & Customer', icon: User },
          { step: 2, label: 'Rental Config & Finance', icon: PoundSterling },
          { step: 3, label: 'Checkout Condition', icon: CheckCircle }
        ].map((s) => (
          <button
            key={s.step} type="button"
            className={`flex-1 py-3.5 sm:py-4 px-3 text-sm font-bold border-b-2 flex items-center justify-center gap-2 transition-all cursor-pointer
              ${activeStep === s.step 
                ? 'border-blue-600 text-blue-700 bg-blue-50/80 shadow-xs' 
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}
            onClick={() => setActiveStep(s.step as any)}
          >
            <s.icon className={`w-4 h-4 ${activeStep === s.step ? 'text-blue-600' : 'text-slate-400'}`} />
            <span className="hidden sm:inline">{s.label}</span>
          </button>
        ))}
      </div>

      <form onSubmit={handleInitialSubmit} className="flex-1 min-h-0 flex flex-col justify-between">
        <div className="flex-1 overflow-y-auto min-h-[500px] custom-scrollbar p-4 sm:p-6 space-y-6">
          {/* STEP 1 */}
          {activeStep === 1 && (
            <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
               {/* Assign Vehicle Card */}
               <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
                  <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <Car className="text-blue-600" /> Assign Vehicle
                  </h3>
                  <div className="relative">
                    <Search className="absolute left-3.5 top-3.5 h-5 w-5 text-slate-400 pointer-events-none" />
                    <input
                      type="text" 
                      autoComplete="off"
                      data-lpignore="true"
                      value={vehicleSearchQuery}
                      onChange={e => { setVehicleSearchQuery(e.target.value); setShowVehicleResults(true); }}
                      onFocus={() => setShowVehicleResults(true)}
                      onBlur={() => setTimeout(() => setShowVehicleResults(false), 200)}
                      placeholder="Search by make, model, or plate..."
                      className="block w-full pl-10 pr-3 py-3 bg-white text-slate-900 font-semibold placeholder:text-slate-400 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-xs text-sm"
                    />
                    {showVehicleResults && (
                      <div className="absolute z-20 mt-1 w-full bg-white shadow-2xl max-h-60 rounded-xl py-1 overflow-auto border border-slate-200 custom-scrollbar">
                        {filteredVehicles.map(v => (
                          <div key={v.id} 
                             className={`px-4 py-3 border-b border-slate-200/60 ${(v as any).hasConflict ? 'opacity-50' : 'cursor-pointer hover:bg-slate-50 transition-colors'}`}
                             onMouseDown={(e) => {
                               e.preventDefault();
                               if ((v as any).hasConflict) return toast.error(`Busy: ${(v as any).message}`);
                               setFormData(p => ({ ...p, vehicleId: v.id }));
                               setVehicleSearchQuery(`${v.make} ${v.model} - ${v.registrationNumber}`);
                               setShowVehicleResults(false);
                               setConditionData(p => ({ ...p, mileage: v.mileage || 0 }));
                             }}
                          >
                            <div className="font-bold text-slate-900">{v.make} {v.model} <span className="text-blue-600 ml-2 font-black">{v.registrationNumber}</span></div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {selectedVehicle && (
                    <div className="mt-4 p-4 bg-emerald-50/80 border border-emerald-200 rounded-xl flex items-center gap-4 shadow-xs">
                      <CheckCircle className="text-emerald-600 w-6 h-6 shrink-0" />
                      <div>
                        <p className="font-bold text-slate-900">{selectedVehicle.make} {selectedVehicle.model}</p>
                        <p className="text-sm font-semibold text-slate-600">{selectedVehicle.registrationNumber}</p>
                      </div>
                    </div>
                  )}
               </div>

               {/* Assign Customer Card */}
               <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
                  <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <User className="text-blue-600" /> Assign Customer
                  </h3>
                  <div className="relative">
                    <Search className="absolute left-3.5 top-3.5 h-5 w-5 text-slate-400 pointer-events-none" />
                    <input
                      type="text" 
                      autoComplete="off"
                      data-lpignore="true"
                      value={customerSearchQuery}
                      onChange={e => { setCustomerSearchQuery(e.target.value); setShowCustomerResults(true); }}
                      onFocus={() => setShowCustomerResults(true)}
                      onBlur={() => setTimeout(() => setShowCustomerResults(false), 200)}
                      placeholder="Search by name, email, or mobile..."
                      className="block w-full pl-10 pr-3 py-3 bg-white text-slate-900 font-semibold placeholder:text-slate-400 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-xs text-sm"
                    />
                   {showCustomerResults && (
                      <div className="absolute z-20 mt-1 w-full bg-white shadow-2xl max-h-60 rounded-xl py-1 overflow-auto border border-slate-200 custom-scrollbar">
                        {filteredCustomers.map(c => (
                          <div key={c.id} className="px-4 py-3 border-b border-slate-200/60 cursor-pointer hover:bg-slate-50 transition-colors"
                             onMouseDown={async () => { 
                               let sig = c.signature || '';
                               if (!sig) {
                                 sig = (await resolveCustomerOrUserSignature({ customerId: c.id, customer: c, customerName: c.name })) || '';
                               }
                               setFormData(p => ({...p, customerId: c.id, signature: sig})); 
                               setCustomerSearchQuery(c.name); 
                               setShowCustomerResults(false); 
                             }}
                          >
                            <div className="font-bold text-slate-900">{c.name}</div>
                            <div className="text-sm text-slate-600">{c.email} | {c.mobile}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  {selectedCustomer && (
                    <div className="mt-4 p-4 bg-emerald-50/80 border border-emerald-200 rounded-xl flex flex-col gap-4 shadow-xs">
                      <div className="flex items-center gap-4">
                        <CheckCircle className="text-emerald-600 w-6 h-6 shrink-0" />
                        <div>
                          <p className="font-bold text-slate-900">{selectedCustomer.name}</p>
                          <p className="text-sm text-slate-600">{selectedCustomer.mobile}</p>
                        </div>
                      </div>
                      
                      {/* Locked Down Customer Signature Section */}
                      <div className="border-t border-slate-200 pt-4 mt-2">
                        <div className="flex justify-between items-center mb-2">
                           <div className="flex items-center gap-1.5">
                             <Lock className="w-4 h-4 text-slate-500" />
                             <label className="block text-sm font-bold text-slate-900">Customer Digital Signature</label>
                           </div>
                           {(formData.signature || selectedCustomer?.signature) ? (
                             <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded border border-emerald-300 uppercase tracking-wider">
                               <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                               Locked &amp; Legally Verified
                             </span>
                           ) : (
                             <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded border border-amber-300 uppercase tracking-wider">
                               <Lock className="w-3.5 h-3.5 text-amber-600" />
                               Signature Required
                             </span>
                           )}
                        </div>

                        {(formData.signature || selectedCustomer?.signature) ? (
                          <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2">
                            <div className="h-24 w-full bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-center p-2 shadow-inner">
                              <img
                                src={formData.signature || selectedCustomer?.signature || ''}
                                alt="Customer Signature"
                                className="max-h-full max-w-full object-contain pointer-events-none select-none"
                              />
                            </div>
                            <div className="flex items-center justify-between text-[11px] text-slate-500">
                              <span className="flex items-center gap-1 font-medium text-slate-600">
                                <Lock className="w-3 h-3 text-slate-400" />
                                Locked to protect legal contract integrity
                              </span>
                              <span className="text-slate-400 font-mono">
                                Managed via Members / Customers module
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="p-3 bg-amber-50/80 rounded-xl border border-amber-200 text-xs text-amber-900 space-y-2">
                            <p className="font-semibold flex items-center gap-1.5 text-amber-900">
                              <Lock className="w-3.5 h-3.5 text-amber-600" />
                              No signature registered under customer profile
                            </p>
                            <p className="text-[11px] text-amber-800 leading-relaxed">
                              To protect legal contract integrity, signatures cannot be hand-drawn, overwritten, or cleared inside active rental records. Please use the official <strong>&quot;Request Signature&quot;</strong> workflow from the Members / Customers module.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
               </div>

               {/* Assign Corporate Entity / Logo Card */}
               <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                      <Building2 className="text-blue-600" /> Assign Corporate Entity / Logo
                    </h3>
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                      Header Branding
                    </span>
                  </div>
                  
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Corporate Entity Profile
                  </label>
                  <select
                    value={formData.corporateEntityKey}
                    onChange={(e) => {
                      const selectedKey = e.target.value;
                      const ent = availableEntities.find(x => x.key === selectedKey);
                      if (ent) {
                        setFormData(p => ({
                          ...p,
                          corporateEntityKey: ent.key,
                          corporateEntityName: ent.fullName,
                          corporateEntityLogo: ent.logoUrl || '',
                        }));
                      }
                    }}
                    className="block w-full px-3 py-2.5 bg-white text-slate-900 font-medium border border-slate-300 rounded-lg shadow-xs text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer"
                  >
                    {availableEntities.map((ent) => (
                      <option key={ent.key} value={ent.key}>
                        {ent.tradingName} — {ent.fullName} {ent.registrationNumber ? `(Co. #${ent.registrationNumber})` : ''}
                      </option>
                    ))}
                  </select>

                  {/* Visual Card Preview of Selected Entity */}
                  {(() => {
                    const curEnt = availableEntities.find(x => x.key === formData.corporateEntityKey) || availableEntities[0];
                    if (!curEnt) return null;
                    return (
                      <div className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-4">
                        <div className="w-12 h-12 bg-white rounded-lg border border-slate-200 p-1 flex items-center justify-center shrink-0 shadow-xs">
                          {curEnt.logoUrl ? (
                            <img src={curEnt.logoUrl} alt={curEnt.tradingName} className="w-full h-full object-contain" />
                          ) : (
                            <Building2 className="w-6 h-6 text-slate-400" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-sm">{curEnt.fullName}</span>
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-indigo-100 text-indigo-800">
                              {curEnt.tradingName}
                            </span>
                          </div>
                          <div className="text-xs text-slate-500 mt-1 truncate">
                            {curEnt.officialAddress} • Tel: {curEnt.phone || 'N/A'}
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            {curEnt.registrationNumber ? `Co. Reg: ${curEnt.registrationNumber}` : ''} 
                            {curEnt.vatNumber ? ` • VAT: ${curEnt.vatNumber}` : ''}
                          </div>
                        </div>
                      </div>
                    );
                  })()}
               </div>

               {/* Assign Bank Account for Payments Card */}
               <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                      <Landmark className="text-blue-600" /> Assign Bank Account for Payments
                    </h3>
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Remittance &amp; QR
                    </span>
                  </div>
                  
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Bank Account for Invoices &amp; Agreements
                  </label>
                  <select
                    value={formData.bankAccountId}
                    onChange={(e) => {
                      const selectedId = e.target.value;
                      const b = availableBanks.find(x => x.id === selectedId);
                      if (b) {
                        setFormData(p => ({
                          ...p,
                          bankAccountId: b.id,
                          bankAccountDetails: {
                            bankName: b.bankName,
                            accountName: b.accountName,
                            accountNumber: b.accountNumber,
                            sortCode: b.sortCode,
                            iban: b.iban,
                            bic: b.bic,
                          },
                        }));
                      }
                    }}
                    className="block w-full px-3 py-2.5 bg-white text-slate-900 font-medium border border-slate-300 rounded-lg shadow-xs text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer"
                  >
                    {availableBanks.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.bankName} — {b.accountName} (A/C: {b.accountNumber} • SC: {b.sortCode})
                      </option>
                    ))}
                  </select>

                  {/* Visual Card Preview of Selected Bank */}
                  {(() => {
                    const curBank = availableBanks.find(x => x.id === formData.bankAccountId) || availableBanks[0];
                    if (!curBank) return null;
                    return (
                      <div className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-sm">{curBank.bankName}</span>
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                              {curBank.currency || 'GBP (£)'}
                            </span>
                          </div>
                          <div className="text-xs text-slate-600 font-medium mt-1">
                            Account: <span className="font-bold text-slate-800">{curBank.accountName}</span>
                          </div>
                          <div className="text-xs font-mono text-slate-500 mt-0.5">
                            Sort Code: <span className="font-bold text-slate-700">{curBank.sortCode}</span> • Number: <span className="font-bold text-slate-700">{curBank.accountNumber}</span>
                          </div>
                        </div>
                        {curBank.notes && (
                          <span className="text-[11px] text-slate-500 bg-white border border-slate-200 px-2.5 py-1 rounded-md max-w-[160px] text-right truncate">
                            {curBank.notes}
                          </span>
                        )}
                      </div>
                    );
                  })()}
               </div>

               {formData.reason === 'h-substitute' && (
                  <div className="bg-white p-6 rounded-xl border border-amber-300 shadow-xs">
                     <h3 className="text-lg font-bold text-slate-900 mb-4">Substitution Details</h3>
                     
                     {formData.hireSubstitutionDetails.map((sub, index) => (
                        <div key={index} className="flex flex-col gap-5 border border-slate-200 bg-white p-5 rounded-xl mb-4 relative shadow-xs">
                           <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                              <h4 className="font-bold text-slate-900">Substitution Vehicle #{index + 1}</h4>
                              <button 
                                type="button" 
                                onClick={() => removeSubstitutionVehicle(index)} 
                                className="text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 p-1.5 rounded-md transition-colors"
                                title="Remove Substitution"
                              >
                                <X className="h-5 w-5" />
                              </button>
                           </div>

                           <div className="space-y-4">
                              <div className="relative">
                                 <input
                                   type="text"
                                   autoComplete="off"
                                   data-lpignore="true"
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
                                   className="w-full bg-white text-slate-900 font-medium border border-slate-300 rounded-lg p-2.5 shadow-xs placeholder:text-slate-400 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                 />
                                 
                                 {showSubVehicleResults[index] && (
                                   <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl max-h-56 overflow-y-auto custom-scrollbar">
                                     {filteredSubVehicles(index).map(v => (
                                       <div 
                                         key={v.id}
                                         className="px-4 py-3 hover:bg-slate-50 cursor-pointer border-b border-slate-200/60 last:border-0 transition-colors flex justify-between items-center"
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
                                            <div className="font-bold text-slate-900">{v.registrationNumber}</div>
                                            <div className="text-xs text-slate-600 font-medium">{v.make} {v.model}</div>
                                         </div>
                                         <div className="text-xs bg-emerald-100 text-emerald-800 border border-emerald-300 px-2.5 py-1 rounded font-bold uppercase">
                                            Available
                                         </div>
                                       </div>
                                     ))}
                                     
                                     {filteredSubVehicles(index).length === 0 && (
                                       <div className="px-4 py-3 text-sm text-slate-500 italic bg-slate-50 rounded-b-xl">
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

                           <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-200">
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

                           <div className="mt-4 border-t border-slate-200 pt-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                               <h5 className="font-bold text-slate-900 mb-3 flex items-center gap-2"><Car className="text-blue-600"/> Sub Vehicle Check-Out Condition</h5>
                               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <FormField type="number" label="Mileage Out" name="mileage" value={sub.mileage} onChange={e => handleSubChange(index, e)} required />
                                  <div>
                                     <label className="block text-sm font-semibold text-slate-900 mb-1">Fuel Level</label>
                                     <select name="fuelLevel" value={sub.fuelLevel} onChange={e => handleSubChange(index, e as any)} className="w-full rounded-md border border-slate-300 bg-white text-slate-900 shadow-xs focus:border-blue-500 text-sm p-2" required>
                                        <option value="0">Empty (0%)</option><option value="25">Quarter (25%)</option><option value="50">Half (50%)</option><option value="75">Three Quarters (75%)</option><option value="100">Full (100%)</option>
                                     </select>
                                  </div>
                                  <div className="flex gap-4 col-span-1 md:col-span-2">
                                     <label className="flex items-center gap-2 font-medium text-slate-700 cursor-pointer"><input type="checkbox" name="isClean" checked={!!sub.isClean} onChange={e => handleSubChange(index, e)} className="rounded w-5 h-5 text-blue-600 border-slate-300 bg-white"/> Is Clean</label>
                                     <label className="flex items-center gap-2 font-medium text-slate-700 cursor-pointer"><input type="checkbox" name="hasDamage" checked={!!sub.hasDamage} onChange={e => handleSubChange(index, e)} className="rounded w-5 h-5 text-rose-500 border-slate-300 bg-white"/> Has Damage</label>
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
                       className="flex items-center px-4 py-2 border border-slate-300 rounded-lg shadow-xs text-slate-700 bg-white hover:bg-slate-50 font-bold transition-all cursor-pointer text-sm"
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
               <h3 className="col-span-2 text-lg font-bold text-slate-900 border-b border-slate-200 pb-2">Scheduling</h3>
               <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Rental / Agreement Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) => handleHireTypeChange(e.target.value as any)}
                    className="w-full rounded-lg border border-slate-300 bg-white text-slate-900 p-2.5 shadow-xs focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-sm font-medium cursor-pointer"
                  >
                    <option value="daily">Daily Hire</option>
                    <option value="weekly">Weekly Hire</option>
                    <option value="claim">Credit Hire / Claim</option>
                  </select>
               </div>
               <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Status</label>
                  <select value={formData.status} onChange={e => setFormData(p => ({ ...p, status: e.target.value as any }))} className="w-full rounded-lg border border-slate-300 bg-white text-slate-900 p-2.5 shadow-xs focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-sm font-medium">
                    <option value="scheduled">Scheduled</option><option value="active">Active</option>
                  </select>
               </div>
               
               <div className="col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Reason</label>
                    <select value={formData.reason} onChange={e => setFormData(p => ({ ...p, reason: e.target.value as any }))} className="w-full rounded-lg border border-slate-300 bg-white text-slate-900 p-2.5 shadow-xs focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-sm font-medium">
                      <option value="hired">Hire</option><option value="claim">Claim</option><option value="o/d">O/D</option><option value="staff">Staff</option><option value="workshop">Workshop</option>
                    </select>
                 </div>
                 {formData.type === 'claim' && (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-sm font-semibold text-slate-700">Claim Reference</label>
                        <label className="flex items-center space-x-2 text-xs text-slate-500 cursor-pointer"><input type="checkbox" checked={manualClaimRef} onChange={e => setManualClaimRef(e.target.checked)} className="rounded border-slate-300 text-blue-600 bg-white" /><span>Manual</span></label>
                      </div>
                      {manualClaimRef ? (
                        <input type="text" value={formData.claimRef} onChange={e => setFormData(p => ({...p, claimRef: e.target.value}))} className="w-full bg-white text-slate-900 font-medium rounded-lg border border-slate-300 shadow-xs p-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="Enter claim ref" />
                      ) : (
                        <div className="relative">
                          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400 pointer-events-none" />
                          <input type="text" value={claimSearchQuery} onChange={e => { setClaimSearchQuery(e.target.value); setShowClaimResults(true); }} onFocus={() => setShowClaimResults(true)} onBlur={() => setTimeout(() => setShowClaimResults(false), 200)} placeholder="Search claims..." className="w-full pl-9 py-2.5 bg-white text-slate-900 font-medium border border-slate-300 rounded-lg shadow-xs placeholder:text-slate-400 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                          {showClaimResults && (
                            <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl max-h-48 overflow-auto custom-scrollbar">
                              {filteredClaims.map(c => (
                                <div key={c.id} className="p-3 border-b border-slate-200/60 cursor-pointer hover:bg-slate-50 transition-colors" onMouseDown={() => { setFormData(p => ({...p, claimRef: c.clientRef || c.id})); setClaimSearchQuery(c.clientRef || c.id); setShowClaimResults(false); }}>
                                  <div className="font-bold text-sm text-slate-900">{c.clientRef || c.id}</div><div className="text-xs font-semibold text-slate-500">{c.clientInfo?.name}</div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                 )}
               </div>

               <div className="col-span-2 flex items-center gap-3 bg-blue-50/80 p-3.5 rounded-xl border border-blue-200">
                  <input type="checkbox" id="includeVAT" checked={formData.includeVAT} onChange={e => setFormData(p => ({ ...p, includeVAT: e.target.checked }))} className="w-5 h-5 text-blue-600 rounded border-slate-300 bg-white" />
                  <label htmlFor="includeVAT" className="font-bold text-slate-900 text-sm cursor-pointer">Apply Standard 20% VAT to Base Rental Cost</label>
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
               <h3 className="col-span-1 md:col-span-2 text-lg font-bold text-slate-900 border-b border-slate-200 pb-2">Insurance & Extras</h3>
               {formData.type === 'weekly' ? (
                  <div className="flex items-end gap-3 col-span-2 border border-slate-200 p-3.5 rounded-xl bg-slate-50">
                    <div className="flex-1"><FormField type="number" label="Insurance Per Week (£)" value={formData.insurancePerWeek} onChange={e => { setInsurancePerWeekTouched(true); setFormData(p => ({...p, insurancePerWeek: parseFloat(e.target.value)||0})); }} /></div>
                    <label className="flex items-center gap-2 pb-2 font-bold text-sm text-slate-700 cursor-pointer"><input type="checkbox" checked={formData.insurancePerWeekIncludeVAT} onChange={e => setFormData(p => ({...p, insurancePerWeekIncludeVAT: e.target.checked}))} className="rounded border-slate-300 text-blue-600 bg-white" /> Inc VAT</label>
                  </div>
               ) : (
                  <div className="flex items-end gap-3 col-span-2 border border-slate-200 p-3.5 rounded-xl bg-slate-50">
                    <div className="flex-1"><FormField type="number" label="Insurance Per Day (£)" value={formData.insurancePerDay} onChange={e => { setInsurancePerDayTouched(true); setFormData(p => ({...p, insurancePerDay: parseFloat(e.target.value)||0})); }} /></div>
                    <label className="flex items-center gap-2 pb-2 font-bold text-sm text-slate-700 cursor-pointer"><input type="checkbox" checked={formData.insurancePerDayIncludeVAT} onChange={e => setFormData(p => ({...p, insurancePerDayIncludeVAT: e.target.checked}))} className="rounded border-slate-300 text-blue-600 bg-white" /> Inc VAT</label>
                  </div>
               )}
               {/* Claim Specific Extras */}
               {formData.type === 'claim' && (
                 <div className="col-span-2 grid grid-cols-2 gap-4 border-t border-slate-200 pt-4">
                    <FormField type="date" label="Storage Start" value={formData.storageStartDate} onChange={e => setFormData(p => ({...p, storageStartDate: e.target.value}))} />
                    <FormField type="date" label="Storage End" value={formData.storageEndDate} onChange={e => setFormData(p => ({...p, storageEndDate: e.target.value}))} />
                    <div className="flex items-end gap-2"><div className="flex-1"><FormField type="number" label="Storage/Day (£)" value={formData.storageCostPerDay} onChange={e => setFormData(p => ({...p, storageCostPerDay: parseFloat(e.target.value)||0}))} /></div><input type="checkbox" checked={formData.includeStorageVAT} onChange={e => setFormData(p => ({...p, includeStorageVAT: e.target.checked}))} className="rounded mb-3 border-slate-300 text-blue-600 bg-white" /></div>
                    <div className="flex items-end gap-2"><div className="flex-1"><FormField type="number" label="Recovery (£)" value={formData.recoveryCost} onChange={e => setFormData(p => ({...p, recoveryCost: parseFloat(e.target.value)||0}))} /></div><input type="checkbox" checked={formData.includeRecoveryCostVAT} onChange={e => setFormData(p => ({...p, includeRecoveryCostVAT: e.target.checked}))} className="rounded mb-3 border-slate-300 text-blue-600 bg-white" /></div>
                    <div className="flex items-end gap-2"><div className="flex-1"><FormField type="number" label="Delivery (£)" value={formData.deliveryCharge} onChange={e => setFormData(p => ({...p, deliveryCharge: parseFloat(e.target.value)||0}))} /></div><input type="checkbox" checked={formData.deliveryChargeIncludeVAT} onChange={e => setFormData(p => ({...p, deliveryChargeIncludeVAT: e.target.checked}))} className="rounded mb-3 border-slate-300 text-blue-600 bg-white" /></div>
                    <div className="flex items-end gap-2"><div className="flex-1"><FormField type="number" label="Collection (£)" value={formData.collectionCharge} onChange={e => setFormData(p => ({...p, collectionCharge: parseFloat(e.target.value)||0}))} /></div><input type="checkbox" checked={formData.collectionChargeIncludeVAT} onChange={e => setFormData(p => ({...p, collectionChargeIncludeVAT: e.target.checked}))} className="rounded mb-3 border-slate-300 text-blue-600 bg-white" /></div>
                 </div>
               )}
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
               <h3 className="text-lg font-bold text-slate-900 border-b border-slate-200 pb-2 mb-4">Financials & Discounts</h3>
               <div className="grid grid-cols-2 gap-4">
                  <FormField type="number" label="Negotiated Override Rate (£)" value={formData.negotiatedRate} onChange={e => setFormData(p => ({ ...p, negotiatedRate: e.target.value }))} placeholder="Leave blank for default" />
                  <FormField type="number" label="Discount % (Applied BEFORE VAT)" value={formData.discountPercentage} onChange={e => { setLastDiscountEdit('pct'); setFormData(p => ({ ...p, discountPercentage: parseFloat(e.target.value)||0 })); }} />
                  <FormField type="number" label="Fixed Discount Amount (£)" value={formData.discountAmount} onChange={e => { setLastDiscountEdit('amt'); setFormData(p => ({ ...p, discountAmount: parseFloat(e.target.value)||0 })); }} />
                  
                  <div className="col-span-2 bg-amber-50/70 border border-amber-200 p-5 rounded-xl mt-4 flex items-center justify-between shadow-xs">
                     <div>
                       <p className="text-amber-800 text-xs font-bold uppercase tracking-wider">Gross Total</p>
                       <p className="text-3xl sm:text-4xl font-black tracking-tight text-amber-900 font-mono">{formatCurrency(costs.gross)}</p>
                     </div>
                     <div className="text-right text-xs space-y-1">
                       <p className="text-slate-800 font-semibold">Net: <span className="font-mono">{formatCurrency(costs.net)}</span></p>
                       <p className="text-blue-700 font-semibold">VAT: <span className="font-mono">{formatCurrency(costs.vat)}</span></p>
                       {costs.discountAmount > 0 && <p className="text-emerald-700 font-semibold">Saved: <span className="font-mono">{formatCurrency(costs.discountAmount)}</span></p>}
                     </div>
                  </div>
               </div>
            </div>

            {/* Agreement Template & Statutory Terms Selector Card */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <FileText className="text-blue-600" /> Select Agreement Template &amp; T&amp;Cs
                </h3>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                  Pre-populated for {formData.type === 'claim' ? 'Credit Hire / Claim' : formData.type === 'weekly' ? 'Weekly Hire' : 'Daily Hire'}
                </span>
              </div>

              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Standard Agreement Terms &amp; Conditions Template
              </label>
              <select
                value={formData.agreementTemplateId}
                onChange={(e) => {
                  const selId = e.target.value;
                  const tmpl = availableAgreementTemplates.find(t => t.id === selId);
                  if (tmpl) {
                    setFormData(p => ({
                      ...p,
                      agreementTemplateId: tmpl.id,
                      agreementTemplateTitle: tmpl.title,
                      agreementTemplateContent: tmpl.content,
                    }));
                  }
                }}
                className="block w-full px-3 py-2.5 bg-white text-slate-900 font-medium border border-slate-300 rounded-lg shadow-xs text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer"
              >
                {availableAgreementTemplates.map((tmpl) => (
                  <option key={tmpl.id} value={tmpl.id}>
                    {tmpl.title} ({tmpl.name})
                  </option>
                ))}
              </select>

              {/* Template Content Preview Box */}
              {availableAgreementTemplates.length === 0 ? (
                <div className="mt-4 p-4 bg-red-50 border-2 border-dashed border-red-300 rounded-xl text-center">
                  <div className="text-xs font-bold text-red-800 uppercase tracking-wide mb-1">
                    ⚠️ TEMPLATE CONFIGURATION REQUIRED
                  </div>
                  <div className="text-xs text-red-700 leading-relaxed font-medium">
                    TEMPLATE CONFIGURATION REQUIRED: No active T&amp;C template mapped for {formData.type === 'weekly' ? 'Weekly Rental Agreement' : formData.type === 'daily' ? 'Daily Rental Agreement' : 'Credit Hire Agreement'} in Company Settings. Please navigate to Company Settings &gt; Dynamic T&amp;C Mapping Engine to create and activate a template.
                  </div>
                </div>
              ) : (
                <div className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-900">{formData.agreementTemplateTitle}</span>
                    <span className="text-[11px] text-slate-500 font-mono">Bound to Agreement Page 3</span>
                  </div>
                  <div className="text-xs text-slate-600 line-clamp-4 font-mono whitespace-pre-line bg-white p-3 rounded-lg border border-slate-200">
                    {formData.agreementTemplateContent}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 3 */}
        {activeStep === 3 && (
          <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
             <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
               <h3 className="text-lg font-bold text-slate-900 border-b border-slate-200 pb-2 mb-4 flex items-center gap-2">
                 <Car className="text-blue-600"/> Main Vehicle Check-Out Condition
               </h3>
               <div className="grid grid-cols-2 gap-6">
                 <FormField type="number" label="Current Mileage" value={conditionData.mileage} onChange={e => setConditionData(p => ({ ...p, mileage: e.target.value === '' ? '' : parseInt(e.target.value, 10) }))} required />
                 <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Fuel Level</label>
                    <select value={conditionData.fuelLevel} onChange={e => setConditionData(p => ({ ...p, fuelLevel: e.target.value as any }))} className="w-full rounded-lg border border-slate-300 bg-white text-slate-900 p-2.5 shadow-xs focus:border-blue-500 text-sm font-medium" required>
                       <option value="0">Empty (0%)</option><option value="25">Quarter (25%)</option><option value="50">Half (50%)</option><option value="75">Three Quarters (75%)</option><option value="100">Full (100%)</option>
                    </select>
                 </div>
                 <div className="flex gap-4 col-span-2 bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <label className="flex items-center gap-2 font-bold text-slate-700 cursor-pointer">
                       <input type="checkbox" checked={!!conditionData.isClean} onChange={e => setConditionData(p => ({...p, isClean: e.target.checked}))} className="rounded w-5 h-5 text-blue-600 border-slate-300 bg-white"/> Is Clean
                    </label>
                    <label className="flex items-center gap-2 font-bold text-slate-700 cursor-pointer">
                       <input type="checkbox" checked={!!conditionData.hasDamage} onChange={e => setConditionData(p => ({...p, hasDamage: e.target.checked}))} className="rounded w-5 h-5 text-rose-500 border-slate-300 bg-white"/> Has Damage
                    </label>
                 </div>
                 {conditionData.hasDamage && <div className="col-span-2"><TextArea label="Damage Description" value={conditionData.damageDescription as any} onChange={e => setConditionData(p => ({...p, damageDescription: e.target.value}))} rows={3} required /></div>}
               </div>
               <div className="mt-6">
                 <FileUpload label="Condition Evidence Photos" multiple accept="image/*" onChange={setImages} showPreview />
               </div>
             </div>

             <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
                <h3 className="text-lg font-bold text-slate-900 border-b border-slate-200 pb-2 mb-4">Initial Payment</h3>
                <div className="grid grid-cols-2 gap-4">
                   <FormField type="number" label="Amount to Pay Now (£)" value={formData.paidAmount} onChange={e => setFormData(p => ({...p, paidAmount: parseFloat(e.target.value)||0}))} />
                   <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Payment Method</label>
                      <select value={formData.paymentMethod} onChange={e => setFormData(p => ({...p, paymentMethod: e.target.value as any}))} className="w-full rounded-lg border border-slate-300 bg-white text-slate-900 p-2.5 shadow-xs focus:border-blue-500 text-sm font-medium">
                         <option value="cash">Cash</option><option value="card">Card</option><option value="bank_transfer">Bank Transfer</option><option value="cheque">Cheque</option>
                      </select>
                   </div>
                   <FormField label="Payment Reference" value={formData.paymentReference} onChange={e => setFormData(p => ({...p, paymentReference: e.target.value}))} placeholder="Transaction ID, Receipt Number..." />
                   <FormField label="Payment Notes" value={formData.paymentNotes} onChange={e => setFormData(p => ({...p, paymentNotes: e.target.value}))} />
                </div>
             </div>
          </div>
        )}
        </div>

        {/* Fixed Footer */}
        <div className="flex justify-between items-center sticky bottom-0 bg-white border-t border-slate-200 p-4 z-20 flex-wrap gap-3 shrink-0 shadow-lg">
          <div className="flex items-center gap-2">
            <button 
              type="button" 
              onClick={() => setActiveStep(p => p > 1 ? p - 1 : 1 as any)} 
              disabled={activeStep === 1} 
              className="px-4 py-2 border border-slate-300 rounded-lg disabled:opacity-40 font-bold text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer text-sm"
            >
              Back
            </button>
            
            <div className="hidden sm:flex items-center gap-2 border-l border-slate-200 pl-3 ml-1">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Quick Actions:</span>
              <button
                type="button"
                onClick={() => {
                  setShareInitialMode('whatsapp');
                  setShowShareModal(true);
                }}
                className="px-3 py-1.5 text-xs font-bold rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-emerald-100 flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                title="Send WhatsApp"
              >
                <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
              </button>
              <button
                type="button"
                onClick={() => {
                  setShareInitialMode('email');
                  setShowShareModal(true);
                }}
                className="px-3 py-1.5 text-xs font-bold rounded-lg bg-sky-50 text-sky-700 border border-sky-300 hover:bg-sky-100 flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                title="Send Email"
              >
                <Mail className="w-3.5 h-3.5" /> Email
              </button>
              <button
                type="button"
                onClick={() => handlePrintOrDownloadPDF()}
                disabled={isPrintingPdf}
                className="px-3 py-1.5 text-xs font-bold rounded-lg bg-purple-50 text-purple-700 border border-purple-300 hover:bg-purple-100 flex items-center gap-1.5 transition disabled:opacity-40 cursor-pointer shadow-xs"
                title="Print / Download PDF"
              >
                <Printer className="w-3.5 h-3.5" /> PDF
              </button>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {activeStep === 1 && (
              <button 
                type="button" 
                onClick={() => setActiveStep(2)} 
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-sm shadow-blue-500/20 transition cursor-pointer text-sm"
              >
                Next Step
              </button>
            )}
            {activeStep === 2 && (
              <button 
                type="button" 
                onClick={() => setActiveStep(3)} 
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-sm shadow-blue-500/20 transition cursor-pointer text-sm"
              >
                Next Step
              </button>
            )}
            
            {activeStep === 3 && (
               <button 
                 type="submit" 
                 disabled={loading} 
                 className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold shadow-sm shadow-emerald-500/20 flex items-center gap-2 transition cursor-pointer text-sm"
               >
                 {loading ? 'Processing...' : <><CheckCircle className="w-5 h-5"/> Verify & Confirm</>}
               </button>
            )}
          </div>
        </div>
      </form>

      {/* Confirmation Modal */}
      <Modal 
        isOpen={isConfirmModalOpen} 
        onClose={() => setIsConfirmModalOpen(false)} 
        title="Confirm Rental Details" 
        size="lg" 
        theme="default"
        footer={
          <div className="flex justify-between items-center w-full">
            <button
              type="button"
              onClick={() => setIsConfirmModalOpen(false)}
              className="px-4 py-2 text-sm font-bold text-slate-700 hover:text-slate-900 border border-slate-300 rounded-lg hover:bg-slate-100 transition cursor-pointer"
            >
              Back to Edit
            </button>
            <button
              type="button"
              onClick={executeCreateRental}
              disabled={loading}
              className="px-5 py-2.5 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm flex items-center gap-2 disabled:opacity-50 transition cursor-pointer"
            >
              {loading ? 'Creating...' : <><CheckCircle className="w-4 h-4" /> Confirm & Save</>}
            </button>
          </div>
        }
      >
         <div className="p-4 space-y-4 text-slate-900">
            <div className="bg-blue-50 p-4 border-l-4 border-blue-600 rounded-lg">
               <h3 className="font-bold text-blue-900 mb-1">Final Review</h3>
               <p className="text-sm text-blue-700">Please confirm these details before finalizing creation.</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
               <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl">
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Customer</p>
                  <p className="font-bold text-slate-900 mt-1">{selectedCustomer?.name}</p>
                  <p className="text-sm text-slate-600">{selectedCustomer?.mobile}</p>
               </div>
               <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl">
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Vehicle</p>
                  <p className="font-bold text-slate-900 mt-1">{selectedVehicle?.make} {selectedVehicle?.model}</p>
                  <p className="text-sm font-mono font-bold text-blue-600">{selectedVehicle?.registrationNumber}</p>
               </div>
               <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl">
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Timing</p>
                  <p className="font-bold text-slate-900 mt-1">{formData.startDate} @ {formData.startTime}</p>
                  <p className="text-sm text-slate-600">To: {formData.endDate} @ {formData.endTime}</p>
               </div>
               <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl">
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Parameters</p>
                  <p className="font-bold text-slate-900 mt-1 capitalize">Type: {formData.type}</p>
                  <p className="text-sm text-slate-600 capitalize">Reason: {formData.reason}</p>
               </div>
               <div className="col-span-2 bg-slate-50 border border-slate-200 p-3 rounded-xl flex justify-between">
                  <div>
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Checkout Mileage</p>
                    <p className="font-bold text-slate-900 mt-1">{conditionData.mileage} miles</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Fuel Level</p>
                    <p className="font-bold text-slate-900 mt-1">{conditionData.fuelLevel}%</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Status</p>
                    <p className="font-bold text-slate-900 mt-1 capitalize">{formData.status}</p>
                  </div>
               </div>
            </div>

            {/* Finances */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mt-4">
               <p className="font-bold text-slate-900 border-b border-slate-200 pb-2 mb-2">Cost Breakdown</p>
               <div className="flex justify-between py-1 text-[#000000] font-semibold"><span>Net Cost</span><span className="font-mono">{formatCurrency((costs as any).baseNet)}</span></div>
               <div className="flex justify-between py-1 text-[#2563EB] font-semibold"><span>VAT Total</span><span className="font-mono">{formatCurrency((costs as any).baseVat)}</span></div>
               {costs.discountAmount > 0 && <div className="flex justify-between py-1 text-[#D97706] font-semibold"><span>Discount Applied</span><span className="font-mono">-{formatCurrency(costs.discountAmount)}</span></div>}
               <div className="border-t border-slate-200 mt-2 pt-2 flex justify-between font-bold text-lg text-[#D97706]">
                  <span>Gross Total</span><span className="font-mono">{formatCurrency(costs.gross)}</span>
               </div>
            </div>

            {/* Quick Actions / Share section */}
            <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-3 mt-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">Quick Actions</span>
                <span className="text-xs text-slate-500 font-medium">Trigger on Confirm</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <label className="flex items-center gap-2 p-2.5 rounded-lg bg-white border border-slate-200 hover:border-emerald-500 cursor-pointer transition text-xs font-medium text-slate-700 shadow-2xs">
                  <input
                    type="checkbox"
                    checked={postSaveActions.whatsapp}
                    onChange={(e) => setPostSaveActions(prev => ({ ...prev, whatsapp: e.target.checked }))}
                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 bg-white"
                  />
                  <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Send via WhatsApp</span>
                </label>
                <label className="flex items-center gap-2 p-2.5 rounded-lg bg-white border border-slate-200 hover:border-sky-500 cursor-pointer transition text-xs font-medium text-slate-700 shadow-2xs">
                  <input
                    type="checkbox"
                    checked={postSaveActions.email}
                    onChange={(e) => setPostSaveActions(prev => ({ ...prev, email: e.target.checked }))}
                    className="rounded border-slate-300 text-sky-600 focus:ring-sky-500 bg-white"
                  />
                  <Mail className="w-3.5 h-3.5 text-sky-600" />
                  <span>Send via Email</span>
                </label>
                <label className="flex items-center gap-2 p-2.5 rounded-lg bg-white border border-slate-200 hover:border-purple-500 cursor-pointer transition text-xs font-medium text-slate-700 shadow-2xs">
                  <input
                    type="checkbox"
                    checked={postSaveActions.printPdf}
                    onChange={(e) => setPostSaveActions(prev => ({ ...prev, printPdf: e.target.checked }))}
                    className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 bg-white"
                  />
                  <Printer className="w-3.5 h-3.5 text-purple-600" />
                  <span>Print / Download PDF</span>
                </label>
              </div>
            </div>
         </div>
      </Modal>

      {/* Share / Communication Modal */}
      <RentalCommunicationModal
        isOpen={showShareModal}
        onClose={() => {
          setShowShareModal(false);
          if (savedRentalForShare) {
            onClose();
          }
        }}
        rental={savedRentalForShare || buildActiveRental()}
        customer={selectedCustomer || null}
        vehicle={selectedVehicle || null}
        initialMode={shareInitialMode}
      />
    </div>
  );
};

export default RentalForm;