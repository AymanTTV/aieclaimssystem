// src/components/rentals/RentalDetails.tsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Rental, Vehicle, Customer } from '../../types';
import { 
  format, 
  isAfter, 
  differenceInHours,
  addDays, 
  isValid 
} from 'date-fns';
import StatusBadge from '../ui/StatusBadge';
import { 
  FileText, 
  Download, 
  Car, 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  CheckCircle, 
  ArrowRightLeft,
  Receipt,
  StickyNote,
  AlertTriangle,
  Plus,
  Clock,
  Send,
  ChevronLeft,
  ChevronRight,
  X,
  CreditCard,
  Shield,
  Gauge,
  ClipboardCheck,
  CheckCircle2,
  ExternalLink,
  MessageCircle,
  Copy,
  Check,
  Sparkles,
  Share2,
  RefreshCw,
  Smartphone,
  Lock
} from 'lucide-react';
import { doc, getDoc, updateDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { ensureValidDate } from '../../utils/dateHelpers';
import { useFormattedDisplay } from '../../hooks/useFormattedDisplay';
import { usePermissions } from '../../hooks/usePermissions';
import VehicleConditionDetails from './VehicleConditionDetails';
import { 
  calculateRentalCostDetailed, 
  calculateOverdueCost, 
  calculateTotalSubstitutionCharges,
  getCalendarWeeks,
  getWeeklyHybridUnits,
  getRentalUnpaidWarningInfo
} from '../../utils/rentalCalculations';
import RentalPaymentHistory from './RentalPaymentHistory';
import RentalMondayAutoEmailToggle from './RentalMondayAutoEmailToggle';
import { sendSingleRentalTestEmail } from '../../jobs/mondayAutoEmailJob';
import { emailTemplates } from '../../constants/emailTemplates';
import { RentalCommunicationModal } from './RentalCommunicationModal';
import RentalTemplatesModal from './RentalTemplatesModal';
import RentalTemplateEditorModal, { RentalTemplateData, RENTAL_DATA_TOOLS } from './RentalTemplateEditorModal';
import toast from 'react-hot-toast';

interface RentalDetailsProps {
  rental: Rental;
  vehicle: Vehicle | null;
  customer: Customer | null;
  onDownloadInvoice?: () => void;
  onDownloadPermit?: () => void;
  onClose?: () => void;
}

type RentalDetailTab = 'overview' | 'financials' | 'condition' | 'substitutions' | 'documents' | 'payments' | 'whatsapp' | 'email';

const RentalDetails: React.FC<RentalDetailsProps> = ({
  rental,
  vehicle,
  customer,
  onDownloadInvoice,
  onDownloadPermit,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<RentalDetailTab>('overview');
  const [createdByName, setCreatedByName] = useState<string | null>(null);
  const { formatCurrency } = useFormattedDisplay();

  const start = ensureValidDate(rental.startDate);
  const end = ensureValidDate(rental.endDate);

  // --- 1. DETAILED COSTS & TOTALS ---
  const detailedCosts = useMemo(() => {
    if (!vehicle) return { net: 0, vat: 0, gross: 0, discountAmount: 0, baseGross: 0, baseNet: 0, baseVat: 0 };
    const storageNet = rental.type === 'claim' ? (rental.storageDays || 0) * (rental.storageCostPerDay || 0) : 0;
    
    // Sum up manual extra charges
    const extraTotal = (rental.extraCharges || []).reduce((acc, c) => acc + (Number(c.amount) || 0), 0);
    
    return calculateRentalCostDetailed(
      start, end, rental.type, vehicle, rental.reason, rental.negotiatedRate ?? undefined,
      storageNet,
      rental.type === 'claim' ? (rental.recoveryCost || 0) : 0,
      rental.deliveryCharge || 0, rental.collectionCharge || 0,
      rental.type !== 'weekly' ? (rental.insurancePerDay || 0) : 0,
      rental.type === 'weekly' ? ((rental as any).insurancePerWeek || 0) : 0,
      rental.includeVAT || false, rental.deliveryChargeIncludeVAT || false, rental.collectionChargeIncludeVAT || false,
      rental.insurancePerDayIncludeVAT || false, (rental as any).insurancePerWeekIncludeVAT || false, rental.includeRecoveryCostVAT || false, rental.includeStorageVAT || false,
      rental.discountPercentage || 0, rental.discountAmount || 0, rental.status,
      rental.lockedDailyRate, rental.lockedWeeklyRate, rental.lockedClaimRate, extraTotal,
      rental.discounts || []
    );
  }, [rental, vehicle, start, end]);

  // Overdue / Ongoing
  const ongoingCharges = useMemo(() => {
    if (!vehicle) return 0;
    const now = new Date();
    if (rental.status === 'active' && isAfter(now, end)) return calculateOverdueCost(rental, now, vehicle);
    return 0;
  }, [rental, vehicle, end]);

  // Return Charges
  const subCharges = calculateTotalSubstitutionCharges(rental);
  const totalReturnCharges = (rental.returnCondition?.totalCharges ?? 0) + subCharges;

  const totalAmountDue = detailedCosts.gross + ongoingCharges + totalReturnCharges;
  const paid = rental.paidAmount || 0;
  const remaining = totalAmountDue - paid;

  const unpaidWarningInfo = useMemo(() => {
    return getRentalUnpaidWarningInfo(rental, remaining, vehicle || undefined);
  }, [rental, remaining, vehicle]);

  // --- 2. ITEMIZED BREAKDOWN HELPER ---
  const pureBaseDetailed = useMemo(() => {
    if (!vehicle) return 0;
    return calculateRentalCostDetailed(
      start, end, rental.type, vehicle, rental.reason, rental.negotiatedRate ?? undefined,
      0, 0, 0, 0, 0, 0, false, false, false, false, false, false, false, 0, 0, rental.status,
      rental.lockedDailyRate, rental.lockedWeeklyRate, rental.lockedClaimRate, 0
    ).gross;
  }, [start, end, rental, vehicle]);

  const insuranceDays = useMemo(() => {
    try {
      if (start && end && !isAfter(start, end)) {
        const hours = differenceInHours(end, start);
        return hours <= 0 ? 1 : Math.ceil(hours / 24);
      }
    } catch {}
    return 0;
  }, [start, end]);

  const hybridUnits = getWeeklyHybridUnits(start, end);

  // --- 3. TIMELINE CALCULATION ---
  const hasSubs = rental.hireSubstitutionDetails && rental.hireSubstitutionDetails.length > 0;
  
  const timelineSegments = useMemo(() => {
    if (!hasSubs) return [];
    const segments: Array<{ type: 'main' | 'sub'; label: string; start: Date; end: Date; registration?: string }> = [];
    const subs = (rental.hireSubstitutionDetails || []).slice().sort((a, b) => (ensureValidDate(a.givenAt)?.getTime() || 0) - (ensureValidDate(b.givenAt)?.getTime() || 0));

    let currentCursor = start;
    if (subs.length === 0) {
      segments.push({ type: 'main', label: 'Main', start: currentCursor, end: end });
    } else {
      for (let i = 0; i < subs.length; i++) {
        const sub = subs[i];
        const subGiven = ensureValidDate(sub.givenAt);
        if (!subGiven) continue;
        if (subGiven > currentCursor) segments.push({ type: 'main', label: 'Main Vehicle', start: currentCursor, end: subGiven });
        
        let subEnd = ensureValidDate(sub.returnCondition?.date || sub.expectedReturnAt) || addDays(subGiven, 1);
        if (subEnd <= subGiven) subEnd = addDays(subGiven, 1);
        
        segments.push({ type: 'sub', label: 'Substitute', start: subGiven, end: subEnd, registration: sub.registration });
        currentCursor = subEnd;
      }
      if (currentCursor < end) segments.push({ type: 'main', label: 'Main Vehicle', start: currentCursor, end: end });
    }
    return segments;
  }, [rental, start, end, hasSubs]);

  // User Fetch
  useEffect(() => {
    const fetchCreatedByName = async () => {
      if (rental.createdBy) {
        try {
          const userDoc = await getDoc(doc(db, 'users', rental.createdBy));
          setCreatedByName(userDoc.exists() ? userDoc.data().name : 'Unknown User');
        } catch { setCreatedByName('Unknown User'); }
      }
    };
    fetchCreatedByName();
  }, [rental.createdBy]);

  // Formatting Helpers
  const formatDateTime = (date: any): string => {
    if (!date) return 'N/A';
    try {
      const d = date?.toDate ? date.toDate() : new Date(date);
      return isNaN(d.getTime()) ? 'N/A' : format(d, 'dd/MM/yyyy HH:mm');
    } catch { return 'N/A'; }
  };

  const formatNoteDate = (date: any) => {
    try {
      const d = date?.toDate ? date.toDate() : new Date(date);
      return isValid(d) ? format(d, 'dd MMM yyyy HH:mm') : 'Unknown Date';
    } catch { return 'Unknown Date'; }
  };

  const formatAgreementKey = (key: string): string => {
    try {
      const timestamp = parseInt(key.split('_')[1] || '0', 10);
      return timestamp === 0 ? 'Hire Agreement' : `Hire Agreement (${format(new Date(timestamp), 'dd/MM/yy')})`;
    } catch { return 'Hire Agreement'; }
  };

  const formatLatestAgreementLabel = () => {
    try {
      return `Hire Agreement (${format(start, 'dd/MM/yyyy HH:mm')} → ${end ? format(end, 'dd/MM/yyyy HH:mm') : '—'})`;
    } catch { return 'Hire Agreement (Latest)'; }
  };

  const agreementKeys = rental.documents?.agreements ? Object.keys(rental.documents.agreements).sort((a, b) => parseInt(a.split('_')[1] || '0', 10) - parseInt(b.split('_')[1] || '0', 10)) : [];
  const latestAgreementKey = agreementKeys.length > 0 ? agreementKeys[agreementKeys.length - 1] : null;

  const displayReason = (() => {
    let reason = rental.reason;
    if (reason === 'h-substitute') {
      const subs = rental.hireSubstitutionDetails || [];
      if (subs.length > 0 && !subs.some(s => !s.returnCondition)) reason = 'hired';
    }
    return reason;
  })();

  const claimDocsCount = useMemo(() => {
    if (rental.type !== 'claim' || !rental.documents) return 0;
    return ['conditionOfHire', 'noticeOfRightToCancel', 'hireAgreement', 'creditStorageAndRecovery', 'creditHireMitigation', 'satisfactionNotice'].filter(
      docKey => !!(rental.documents as any)?.[docKey]
    ).length;
  }, [rental]);

  const docsCount = agreementKeys.length + (rental.documents?.invoice ? 1 : 0) + (rental.documents?.permit ? 1 : 0) + claimDocsCount;
  const paymentsCount = rental.payments?.length || 0;

  // Communication & Messaging State for WhatsApp and Email tabs
  interface TemplateOption {
    id: string;
    name: string;
    category: string;
    subjectTemplate: string;
    bodyTemplate: string;
  }

  const [commTemplates, setCommTemplates] = useState<TemplateOption[]>([]);
  const [loadingCommTemplates, setLoadingCommTemplates] = useState(false);
  const [selectedCommTemplateId, setSelectedCommTemplateId] = useState<string>('');
  const [commRecipientPhone, setCommRecipientPhone] = useState<string>(customer?.mobile || customer?.phone || '');
  const [commRecipientEmail, setCommRecipientEmail] = useState<string>(customer?.email || '');
  const [commSubject, setCommSubject] = useState<string>('Rental Agreement & Balance Notification');
  const [commMessage, setCommMessage] = useState<string>('');
  const [commCopied, setCommCopied] = useState<boolean>(false);
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);

  // Dedicated Pop-up modal state
  const [isCommModalOpen, setIsCommModalOpen] = useState(false);
  const [commModalMode, setCommModalMode] = useState<'whatsapp' | 'email'>('whatsapp');

  // Permissions & Templates Navigation Tabs modal state
  const { can, isAdmin } = usePermissions();
  const canEditTemplates = isAdmin || can('rentals', 'templateEdit');
  const canSendWhatsApp = isAdmin || can('rentals', 'whatsapp');
  const canSendEmail = isAdmin || can('rentals', 'email');
  const [isTemplatesNavModalOpen, setIsTemplatesNavModalOpen] = useState(false);
  const [templatesNavModalTab, setTemplatesNavModalTab] = useState<'whatsapp' | 'email'>('whatsapp');

  // Template editor modal state
  const [isTemplateEditorOpen, setIsTemplateEditorOpen] = useState(false);
  const [templateEditorMode, setTemplateEditorMode] = useState<'create' | 'edit'>('create');
  const [templateToEdit, setTemplateToEdit] = useState<RentalTemplateData | null>(null);

  // Sync customer contacts if customer updates
  useEffect(() => {
    if (customer?.mobile || customer?.phone) {
      setCommRecipientPhone(customer.mobile || customer.phone || '');
    }
    if (customer?.email) {
      setCommRecipientEmail(customer.email || '');
    }
  }, [customer]);

  // Live Template Populator for Data Tools
  const populateTemplate = useCallback((rawTemplate: string): string => {
    if (!rawTemplate) return '';

    let res = rawTemplate;

    const custName = customer?.name || rental.customerName || rental.driverName || 'Customer';
    const vehReg = vehicle?.registrationNumber || rental.vehicleReg || 'N/A';
    const agrNo = rental.rentalAgreementNumber || rental.id || 'N/A';
    const totalAmt = formatCurrency(totalAmountDue);
    const paidAmt = formatCurrency(paid);
    const owingAmt = formatCurrency(remaining);

    // Last payment info
    const paymentsList = rental.payments || [];
    const sortedPayments = paymentsList.slice().sort((a, b) => {
      const timeA = a.date ? (a.date.toDate ? a.date.toDate().getTime() : new Date(a.date).getTime()) : 0;
      const timeB = b.date ? (b.date.toDate ? b.date.toDate().getTime() : new Date(b.date).getTime()) : 0;
      return timeB - timeA;
    });
    const lastPayment = sortedPayments[0];
    const lastPaymentAmt = lastPayment ? formatCurrency(lastPayment.amount) : '£0.00';
    const lastPaymentDateStr = lastPayment?.date ? formatDateTime(lastPayment.date) : 'N/A';

    const replacements: Record<string, string> = {
      '{client_name}': custName,
      '{customer_name}': custName,
      '{driver_name}': custName,
      '{vehicle_reg}': vehReg,
      '{registration_number}': vehReg,
      '{agreement_number}': agrNo,
      '{rental_id}': agrNo,
      '{total_amount}': totalAmt,
      '{total_cost}': totalAmt,
      '{paid_amount}': paidAmt,
      '{owing_amount}': owingAmt,
      '{outstanding_balance}': owingAmt,
      '{last_payment_amount}': lastPaymentAmt,
      '{last_payment_paid}': lastPaymentAmt,
      '{date_paid}': lastPaymentDateStr,
      '{last_payment_date}': lastPaymentDateStr,
      '{start_date}': formatDateTime(start),
      '{end_date}': formatDateTime(end),
      '{client_phone}': customer?.mobile || customer?.phone || 'N/A',
      '{client_email}': customer?.email || 'N/A',
      '{payment_details}': `Bank: Lloyds Bank | Name: AIE SKYLINE LIMITED | Sort Code: 30-99-50 | Account: 86450668 | Ref: ${agrNo}`,
    };

    Object.entries(replacements).forEach(([tag, val]) => {
      if (res.includes(tag)) {
        res = res.split(tag).join(val);
      }
    });

    return res;
  }, [customer, rental, vehicle, totalAmountDue, paid, remaining, formatCurrency, start, end]);

  // Load message templates from Firestore or fallback
  const fetchCommTemplates = useCallback(async (selectId?: string) => {
    setLoadingCommTemplates(true);
    try {
      const snap = await getDocs(collection(db, 'messageTemplates'));
      const allTpls: TemplateOption[] = [];
      const seenIds = new Set<string>();

      if (!snap.empty) {
        snap.docs.forEach((d) => {
          const data = d.data() as any;
          const cat = String(data.category || 'Rental').trim();
          allTpls.push({
            id: d.id,
            name: data.name || 'Untitled Template',
            category: cat || 'Rental',
            subjectTemplate: data.subjectTemplate || data.subject || '',
            bodyTemplate: data.bodyTemplate || data.body || '',
          });
          seenIds.add(d.id);
        });
      }

      (emailTemplates.rental || []).forEach((et) => {
        if (!seenIds.has(et.id)) {
          allTpls.push({
            id: et.id,
            name: et.name,
            category: 'rental',
            subjectTemplate: et.subjectTemplate,
            bodyTemplate: et.bodyTemplate,
          });
          seenIds.add(et.id);
        }
      });

      allTpls.sort((a, b) => {
        const aIsRental = String(a.category || '').toLowerCase() === 'rental';
        const bIsRental = String(b.category || '').toLowerCase() === 'rental';
        if (aIsRental && !bIsRental) return -1;
        if (!aIsRental && bIsRental) return 1;
        return a.name.localeCompare(b.name);
      });

      setCommTemplates(allTpls);

      const targetId = selectId || selectedCommTemplateId || (allTpls[0] ? allTpls[0].id : '');
      if (targetId) {
        setSelectedCommTemplateId(targetId);
        const tpl = allTpls.find(t => t.id === targetId);
        if (tpl && !commMessage) {
          setCommMessage(populateTemplate(tpl.bodyTemplate));
          setCommSubject(populateTemplate(tpl.subjectTemplate || 'Rental Update'));
        }
      }
    } catch (err) {
      console.error('Failed to load communication templates', err);
      const fallback = (emailTemplates.rental || []).map((et) => ({
        id: et.id,
        name: et.name,
        category: 'rental',
        subjectTemplate: et.subjectTemplate,
        bodyTemplate: et.bodyTemplate,
      }));
      setCommTemplates(fallback);
      if (fallback.length > 0 && !selectedCommTemplateId) {
        setSelectedCommTemplateId(fallback[0].id);
        if (!commMessage) {
          setCommMessage(populateTemplate(fallback[0].bodyTemplate));
          setCommSubject(populateTemplate(fallback[0].subjectTemplate || 'Rental Update'));
        }
      }
    } finally {
      setLoadingCommTemplates(false);
    }
  }, [selectedCommTemplateId, commMessage, populateTemplate]);

  useEffect(() => {
    fetchCommTemplates();
  }, []);

  const handleSelectCommTemplate = (tplId: string) => {
    setSelectedCommTemplateId(tplId);
    const tpl = commTemplates.find(t => t.id === tplId);
    if (tpl) {
      setCommMessage(populateTemplate(tpl.bodyTemplate));
      setCommSubject(populateTemplate(tpl.subjectTemplate || 'Rental Update'));
    }
  };

  const handleInsertTag = (tag: string) => {
    const val = populateTemplate(tag);
    setCommMessage(prev => prev ? `${prev} ${val}` : val);
    toast.success(`Inserted ${tag}`);
  };

  const handleToggleDocAttachment = (docType: string, label: string, url?: string) => {
    if (!url) {
      toast.error(`${label} is not available for this rental.`);
      return;
    }
    const isAttached = selectedDocIds.includes(docType);
    if (isAttached) {
      setSelectedDocIds(prev => prev.filter(id => id !== docType));
      const docLine = `\n📄 ${label}: ${url}`;
      setCommMessage(prev => prev.replace(docLine, ''));
    } else {
      setSelectedDocIds(prev => [...prev, docType]);
      const docLine = `\n📄 ${label}: ${url}`;
      setCommMessage(prev => `${prev.trim()}${docLine}`);
      toast.success(`Attached ${label} link`);
    }
  };

  const handleOpenWhatsApp = () => {
    if (!canSendWhatsApp) {
      toast.error('You do not have permission to send or dispatch WhatsApp messages');
      return;
    }
    if (!commRecipientPhone.trim()) {
      toast.error('Please enter a recipient mobile number');
      return;
    }
    let cleanPhone = commRecipientPhone.replace(/[^0-9+]/g, '');
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '44' + cleanPhone.slice(1);
    } else if (cleanPhone.startsWith('+')) {
      cleanPhone = cleanPhone.slice(1);
    }
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(commMessage)}`;
    window.open(url, '_blank');
    toast.success('Opening WhatsApp...');
  };

  const handleSendEmail = () => {
    if (!canSendEmail) {
      toast.error('You do not have permission to send or dispatch emails');
      return;
    }
    if (!commRecipientEmail.trim()) {
      toast.error('Please enter a recipient email address');
      return;
    }
    const mailtoUrl = `mailto:${encodeURIComponent(commRecipientEmail)}?subject=${encodeURIComponent(commSubject)}&body=${encodeURIComponent(commMessage)}`;
    window.location.href = mailtoUrl;
    toast.success('Opened in your email client');
  };

  const handleSendTestStatementEmail = async () => {
    if (!canSendEmail) {
      toast.error('You do not have permission to send or dispatch emails');
      return;
    }
    const toastId = toast.loading('Sending test rental statement email...');
    try {
      const res = await sendSingleRentalTestEmail(rental, vehicle, customer);
      toast.success(res.message, { id: toastId, duration: 6000 });
    } catch (err: any) {
      toast.error(err?.message || 'Failed to send test email', { id: toastId });
    }
  };

  const handleCopyMessage = async () => {
    try {
      await navigator.clipboard.writeText(commMessage);
      setCommCopied(true);
      toast.success('Message copied to clipboard');
      setTimeout(() => setCommCopied(false), 2500);
    } catch {
      toast.error('Failed to copy to clipboard');
    }
  };

  const tabs: { id: RentalDetailTab; label: string; icon: React.ComponentType<{ className?: string }>; count?: number }[] = [
    { id: 'overview', label: 'Overview', icon: Calendar },
    { id: 'financials', label: 'Financials', icon: Receipt },
    { id: 'condition', label: 'Condition', icon: ClipboardCheck },
    { id: 'substitutions', label: 'Substitutions', icon: ArrowRightLeft, count: rental.hireSubstitutionDetails?.length || 0 },
    { id: 'documents', label: 'Documents', icon: FileText, count: docsCount },
    { id: 'payments', label: 'Payments', icon: CreditCard, count: paymentsCount },
    { id: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
    { id: 'email', label: 'Email', icon: Mail },
  ];

  const currentTabIndex = tabs.findIndex(t => t.id === activeTab);

  const handlePrevTab = () => {
    if (currentTabIndex > 0) {
      setActiveTab(tabs[currentTabIndex - 1].id);
    }
  };

  const handleNextTab = () => {
    if (currentTabIndex < tabs.length - 1) {
      setActiveTab(tabs[currentTabIndex + 1].id);
    }
  };

  return (
    <div className="flex flex-col flex-1 h-full min-h-0 overflow-hidden text-white bg-[#16192B]">
      
      {/* ========================================================================= */}
      {/* 1. MODAL NAVIGATION TABS (PINNED AT THE VERY TOP - ZERO SCROLLING)         */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-4 sm:grid-cols-8 w-full border-b border-[#2B314E] shrink-0 bg-[#0F111A] overflow-hidden select-none divide-x divide-[#2B314E]/30">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          const isWhatsApp = tab.id === 'whatsapp';
          const isEmail = tab.id === 'email';

          let tabStyle = 'border-transparent text-slate-200 font-semibold hover:text-white hover:bg-slate-800/40';
          if (isActive) {
            if (isWhatsApp) {
              tabStyle = 'border-emerald-500 text-emerald-300 font-extrabold bg-emerald-500/20 shadow-inner';
            } else if (isEmail) {
              tabStyle = 'border-sky-500 text-sky-300 font-extrabold bg-sky-500/20 shadow-inner';
            } else {
              tabStyle = 'border-blue-500 text-blue-300 font-extrabold bg-blue-500/20 shadow-inner';
            }
          } else {
            if (isWhatsApp) {
              tabStyle = 'border-transparent text-emerald-400 font-bold hover:text-emerald-200 hover:bg-emerald-500/10';
            } else if (isEmail) {
              tabStyle = 'border-transparent text-sky-400 font-bold hover:text-sky-200 hover:bg-sky-500/10';
            }
          }

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center justify-center space-x-1.5 py-3 px-2 border-b-2 text-xs sm:text-sm transition-all cursor-pointer truncate ${tabStyle}`}
            >
              <Icon className="w-4 h-4 pointer-events-none shrink-0" />
              <span className="truncate">{tab.label}</span>
              {tab.count !== undefined && tab.count > 0 && (
                <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                  isActive ? 'bg-blue-500 text-white' : 'bg-[#2B314E] text-slate-200'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* 2. COMPACT SUMMARY STRIP (SMALL PICTURE, CLEAR & UN-CRAMPED DETAILS)       */}
      {/* ========================================================================= */}
      <div className="px-4 py-3 sm:px-6 shrink-0 bg-[#121524] border-b border-[#2B314E]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          
          {/* Vehicle & Customer Identity */}
          <div className="flex items-center gap-3 min-w-0">
            {/* Small vehicle picture - constrained strictly so it never blows up */}
            {vehicle?.image ? (
              <div className="w-12 h-12 min-w-[48px] min-h-[48px] max-w-[48px] max-h-[48px] rounded-xl overflow-hidden border border-[#2B314E] bg-[#0F111A] shrink-0">
                <img 
                  src={vehicle.image} 
                  alt={`${vehicle.make} ${vehicle.model}`}
                  className="w-full h-full object-cover"
                  style={{ width: '48px', height: '48px', minWidth: '48px', minHeight: '48px', objectFit: 'cover' }}
                />
              </div>
            ) : (
              <div className="w-12 h-12 min-w-[48px] min-h-[48px] bg-[#1E2238] border border-[#2B314E] rounded-xl flex items-center justify-center shrink-0">
                <Car className="h-5 w-5 text-blue-400" />
              </div>
            )}
            
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-black text-white text-sm sm:text-base truncate max-w-md">
                  {vehicle ? `${vehicle.make} ${vehicle.model}` : 'Vehicle Not Found'}
                </h3>
                {vehicle?.registrationNumber && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-black uppercase font-mono tracking-wider bg-[#FDD835] text-black border border-yellow-500 shadow-xs shrink-0">
                    {vehicle.registrationNumber}
                  </span>
                )}
                {rental.rentalAgreementNumber && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold font-mono bg-blue-500/10 text-blue-300 border border-blue-500/30 shrink-0">
                    #{rental.rentalAgreementNumber}
                  </span>
                )}
              </div>
              
              <div className="mt-1 flex items-center gap-3 text-xs text-slate-300 flex-wrap">
                <span className="flex items-center gap-1.5 font-medium text-slate-200 truncate">
                  <User className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                  {customer ? customer.name : 'Unknown Customer'}
                </span>
                {customer?.mobile && (
                  <span className="flex items-center gap-1 text-slate-400 shrink-0">
                    <Phone className="w-3 h-3 text-slate-500 shrink-0" />
                    {customer.mobile}
                  </span>
                )}
                {vehicle?.mileage !== undefined && (
                  <span className="flex items-center gap-1 text-slate-400 font-mono shrink-0">
                    <Gauge className="w-3 h-3 text-slate-500 shrink-0" />
                    {vehicle.mileage.toLocaleString()} mi
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Badges & Financial Numbers */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <StatusBadge status={rental.type} />
              <StatusBadge status={displayReason as any} />
              <StatusBadge status={rental.status} />
              <StatusBadge 
                status={unpaidWarningInfo.effectivePaymentStatus} 
                className={unpaidWarningInfo.effectivePaymentStatus === 'unpaid' ? '!bg-red-600 !text-white border border-red-700 font-extrabold animate-blink shadow-sm' : ''}
              />
              {unpaidWarningInfo.urgencyLevel === 'red' && unpaidWarningInfo.warningMessage && (
                <div className="flex items-center gap-1.5 bg-red-600 text-white border border-red-700 px-2.5 py-1 rounded-xl text-xs font-bold animate-blink shadow-sm">
                  <AlertTriangle className="w-3.5 h-3.5 text-white shrink-0" />
                  <span className="text-white font-bold">{unpaidWarningInfo.warningMessage}</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 bg-[#0F111A] px-3 py-1.5 rounded-xl border border-[#2B314E] shrink-0">
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-slate-400 block leading-tight">Total</span>
                <span className="text-sm font-mono font-black text-white leading-tight">{formatCurrency(totalAmountDue)}</span>
              </div>
              <div className="w-px h-6 bg-[#2B314E]" />
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-slate-400 block leading-tight">Owing</span>
                <span className={`text-sm font-mono font-black leading-tight ${remaining <= 0.001 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {formatCurrency(remaining)}
                </span>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. SCROLLABLE TAB CONTENT BODY                                            */}
      {/* ========================================================================= */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 custom-scrollbar text-white">

        {/* ========================================================================= */}
        {/* TAB 1: OVERVIEW & TIMELINE                                                */}
        {/* ========================================================================= */}
        {activeTab === 'overview' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            
            {/* Assigned Vehicle & Customer Profile Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              
              {/* Vehicle Profile Card */}
              <div className="bg-[#0F111A] border border-[#2B314E] rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-[#2B314E] pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20">
                      <Car className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Assigned Vehicle</p>
                      <h4 className="text-base font-bold text-white">
                        {vehicle ? `${vehicle.make} ${vehicle.model}` : 'Vehicle Not Assigned'}
                      </h4>
                    </div>
                  </div>
                  {vehicle?.registrationNumber && (
                    <span className="px-2.5 py-1 bg-[#FDD835] text-black text-xs font-mono font-black rounded-md border border-yellow-500">
                      {vehicle.registrationNumber}
                    </span>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                  {/* Small vehicle preview */}
                  {vehicle?.image && (
                    <div className="w-16 h-14 min-w-[64px] min-h-[56px] max-w-[64px] max-h-[56px] bg-[#121524] rounded-xl border border-[#2B314E] overflow-hidden p-1 shrink-0 flex items-center justify-center">
                      <img 
                        src={vehicle.image} 
                        alt="Vehicle" 
                        className="w-full h-full object-contain"
                        style={{ width: '56px', height: '48px', objectFit: 'contain' }}
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3 flex-1 text-xs">
                    <div className="bg-[#121524] p-3 rounded-xl border border-[#2B314E]">
                      <span className="text-slate-400 block font-medium">Mileage</span>
                      <span className="font-mono font-bold text-white text-sm mt-0.5 block">{vehicle?.mileage !== undefined ? `${vehicle.mileage.toLocaleString()} mi` : 'N/A'}</span>
                    </div>
                    <div className="bg-[#121524] p-3 rounded-xl border border-[#2B314E]">
                      <span className="text-slate-400 block font-medium">Status</span>
                      <span className="font-bold text-white text-sm mt-0.5 block capitalize">{vehicle?.status || 'Active'}</span>
                    </div>
                    <div className="bg-[#121524] p-3 rounded-xl border border-[#2B314E]">
                      <span className="text-slate-400 block font-medium">Agreement #</span>
                      <span className="font-mono font-bold text-blue-300 text-sm mt-0.5 block">{rental.rentalAgreementNumber || 'N/A'}</span>
                    </div>
                    <div className="bg-[#121524] p-3 rounded-xl border border-[#2B314E]">
                      <span className="text-slate-400 block font-medium">Rental Type</span>
                      <span className="font-bold text-white text-sm mt-0.5 block capitalize">{rental.type || 'Standard'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Customer Profile Card */}
              <div className="bg-[#0F111A] border border-[#2B314E] rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-[#2B314E] pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-purple-500/10 text-purple-400 rounded-xl border border-purple-500/20">
                      <User className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Customer Profile</p>
                      <h4 className="text-base font-bold text-white truncate max-w-[240px]">
                        {customer ? customer.name : 'Unknown Customer'}
                      </h4>
                    </div>
                  </div>
                  {customer?.badgeNumber && (
                    <span className="px-2 py-0.5 bg-purple-500/10 text-purple-300 text-xs font-mono font-bold rounded-md border border-purple-500/30">
                      Badge: {customer.badgeNumber}
                    </span>
                  )}
                </div>

                {customer ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs text-slate-300">
                    <div className="flex items-center gap-2 bg-[#121524] p-2.5 rounded-xl border border-[#2B314E]">
                      <Phone className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                      <span className="font-medium text-white truncate">{customer.mobile || 'No phone recorded'}</span>
                    </div>
                    <div className="flex items-center gap-2 bg-[#121524] p-2.5 rounded-xl border border-[#2B314E]">
                      <Mail className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                      <span className="font-medium text-slate-200 truncate">{customer.email || 'No email recorded'}</span>
                    </div>
                    {customer.address && (
                      <div className="sm:col-span-2 flex items-center gap-2 bg-[#121524] p-2.5 rounded-xl border border-[#2B314E]">
                        <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span className="font-medium text-slate-200 truncate">{customer.address}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-rose-400 text-xs">Customer information not found.</p>
                )}
              </div>

            </div>

            {/* Schedule & Timeline Card */}
            <div className="bg-[#0F111A] border border-[#2B314E] rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#2B314E] pb-3">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-blue-400" />
                  <h3 className="text-base font-bold text-white">Rental Schedule & Timeline</h3>
                </div>
                {rental.originalStartDate && (
                  <div className="inline-flex items-center gap-1.5 text-xs bg-[#121524] px-3 py-1 rounded-lg border border-[#2B314E]">
                    <span className="text-slate-400 uppercase font-bold text-[10px]">Original Start:</span>
                    <span className="font-mono text-slate-200">{formatDateTime(rental.originalStartDate)}</span>
                  </div>
                )}
              </div>

              {/* Standard Outbound / Return Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-[#121524] p-4 rounded-xl border border-[#2B314E] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20">
                      <Car className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Outbound (Start)</span>
                      <span className="font-mono font-bold text-white text-sm">{formatDateTime(start)}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-[#121524] p-4 rounded-xl border border-[#2B314E] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-purple-500/10 text-purple-400 rounded-xl border border-purple-500/20">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Expected Return</span>
                      <span className="font-mono font-bold text-white text-sm">{formatDateTime(end)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Timeline Segments if Substitutions Exist */}
              {hasSubs && (
                <div className="mt-4 pt-4 border-t border-[#2B314E]/60 space-y-3">
                  <div className="flex items-center gap-2">
                    <ArrowRightLeft className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Vehicle Substitution Sequence</span>
                  </div>
                  <div className="flex flex-col lg:flex-row gap-3 overflow-x-auto pb-1">
                    {timelineSegments.map((seg, idx) => (
                      <div 
                        key={idx} 
                        className={`flex-1 min-w-[220px] p-3.5 rounded-xl border shadow-sm ${
                          seg.type === 'main' 
                            ? 'bg-[#121524] border-[#2B314E]' 
                            : 'bg-amber-950/20 border-amber-500/40 text-amber-200'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-[#2B314E]">
                          <div className={`flex items-center gap-1.5 font-bold uppercase tracking-wider text-xs ${
                            seg.type === 'main' ? 'text-slate-300' : 'text-amber-400'
                          }`}>
                            {seg.type === 'main' ? <Car className="w-3.5 h-3.5 text-blue-400" /> : <ArrowRightLeft className="w-3.5 h-3.5 text-amber-400" />}
                            {seg.label}
                          </div>
                          {seg.registration && (
                            <span className="font-mono bg-[#FDD835] text-black px-2 py-0.5 rounded text-[10px] font-black border border-yellow-500">
                              {seg.registration}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-col text-xs font-medium text-slate-300 space-y-1 font-mono">
                          <div className="flex justify-between items-center">
                            <span className="text-slate-400 flex items-center gap-1"><Clock className="w-3 h-3"/> Start:</span>
                            <span className="text-white">{formatDateTime(seg.start)}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-slate-400 flex items-center gap-1"><CheckCircle className="w-3 h-3"/> End:</span>
                            <span className="text-white">{formatDateTime(seg.end)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Automated Monday Email Reminders Setting */}
            {(() => {
              const isClaim = ['claim', 'claims'].includes(String(rental.type || rental.reason || rental.category || '').trim().toLowerCase());
              const isEnabled = rental.enable_monday_auto_email !== false;

              return (
                <div className="bg-[#0F111A] p-5 rounded-2xl border border-[#2B314E] flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl border shrink-0 ${
                      isClaim 
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' 
                        : isEnabled 
                          ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' 
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}>
                      <Mail className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-bold text-white">Monday Automated Email Reminders</h4>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isClaim 
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : isEnabled 
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' 
                              : 'bg-slate-800 text-slate-300 border border-slate-700'
                        }`}>
                          {isClaim ? 'Excluded (Claim Rental)' : isEnabled ? 'Active' : 'Disabled'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1 max-w-xl leading-relaxed">
                        {isClaim 
                          ? 'This rental has TYPE set to Claim/Claims and is strictly excluded from weekly automated emails.'
                          : 'Automatically sends weekly statement breakdown on Mondays at 12:00 AM when owing balance is greater than £0.'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                    <button
                      type="button"
                      onClick={async () => {
                        const targetName = rental.customerName || rental.driverName || 'driver';
                        const toastId = toast.loading(`Sending test email to ${targetName}...`);
                        try {
                          const res = await sendSingleRentalTestEmail(rental, vehicle, customer);
                          toast.success(res.message, { id: toastId, duration: 6000 });
                        } catch (err: any) {
                          toast.error(err?.message || 'Failed to send test email', { id: toastId, duration: 6000 });
                        }
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 text-xs font-bold rounded-xl border border-purple-500/30 transition shadow-xs cursor-pointer"
                      title="Send test email now with active Rental Bulk Email template"
                    >
                      <Send className="w-3.5 h-3.5 text-purple-400" />
                      Send Test Email
                    </button>

                    {isClaim ? (
                      <span className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-slate-800 text-slate-400 border border-slate-700">
                        Not Applicable
                      </span>
                    ) : (
                      <RentalMondayAutoEmailToggle
                        rentalId={rental.id}
                        enabled={isEnabled}
                        onToggle={async (id, newState) => {
                          try {
                            await updateDoc(doc(db, 'rentals', id), {
                              enable_monday_auto_email: newState,
                              updatedAt: new Date(),
                            });
                            rental.enable_monday_auto_email = newState;
                          } catch (err) {
                            console.error('Failed to update rental enable_monday_auto_email:', err);
                            throw err;
                          }
                        }}
                      />
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Claims & Storage Section (if applicable) */}
            {(rental.claimRef || (rental.type === 'claim' && rental.storageStartDate)) && (
              <div className="bg-[#0F111A] border border-[#2B314E] rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex items-center gap-2 border-b border-[#2B314E] pb-3">
                  <Shield className="w-5 h-5 text-amber-400" />
                  <h3 className="text-base font-bold text-white">Claim & Storage Information</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {rental.claimRef && (
                    <div className="bg-[#121524] p-4 rounded-xl border border-[#2B314E]">
                      <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Claim Reference</span>
                      <span className="text-base font-bold text-amber-300 font-mono mt-1 block">{rental.claimRef}</span>
                    </div>
                  )}

                  {rental.type === 'claim' && rental.storageStartDate && rental.storageEndDate && (
                    <div className="bg-[#121524] p-4 rounded-xl border border-[#2B314E]">
                      <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Storage Duration</span>
                      <div className="mt-1 flex items-center justify-between text-xs font-mono">
                        <span className="text-white">{formatDateTime(rental.storageStartDate)}</span>
                        <span className="text-slate-400">→</span>
                        <span className="text-white">{formatDateTime(rental.storageEndDate)}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Rental Notes Card */}
            {rental.notes && rental.notes.length > 0 && (
              <div className="bg-[#0F111A] border border-[#2B314E] rounded-2xl p-5 shadow-sm space-y-3">
                <div className="flex items-center justify-between border-b border-[#2B314E] pb-3">
                  <h3 className="flex items-center gap-2 text-white font-bold text-sm">
                    <StickyNote className="w-4 h-4 text-amber-400" /> Rental Notes ({rental.notes.length})
                  </h3>
                </div>
                <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
                  {rental.notes.slice().reverse().map((note) => (
                    <div key={note.id} className="bg-[#121524] p-3.5 rounded-xl border border-[#2B314E] text-sm">
                      <div className="flex items-center gap-2 text-[10px] text-amber-400 font-bold uppercase mb-1">
                        <span>{formatNoteDate(note.createdAt)}</span>
                        <span className="text-slate-500">•</span>
                        <span className="text-slate-300">{note.createdByName || 'Staff'}</span>
                      </div>
                      <p className="text-slate-100 font-medium whitespace-pre-wrap leading-relaxed italic">"{note.text}"</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: FINANCIALS & BILLING                                              */}
        {/* ========================================================================= */}
        {activeTab === 'financials' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            
            {/* Financial Overview Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
              <div className="bg-[#0F111A] border border-[#2B314E] p-4 rounded-2xl shadow-sm">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Net</p>
                <p className="text-xl font-bold font-mono text-white mt-1">{formatCurrency(detailedCosts.net)}</p>
              </div>

              <div className="bg-[#0F111A] border border-[#2B314E] p-4 rounded-2xl shadow-sm">
                <p className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">Total Discount</p>
                <p className="text-xl font-bold font-mono text-amber-400 mt-1">-{formatCurrency(detailedCosts.discountAmount)}</p>
              </div>

              <div className="bg-[#0F111A] border border-[#2B314E] p-4 rounded-2xl shadow-sm">
                <p className="text-[10px] text-blue-300 font-bold uppercase tracking-wider">Total VAT</p>
                <p className="text-xl font-bold font-mono text-blue-300 mt-1">{formatCurrency(detailedCosts.vat)}</p>
              </div>

              <div className="bg-[#0F111A] border border-[#2B314E] p-4 rounded-2xl shadow-sm">
                <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">Amount Paid</p>
                <p className="text-xl font-bold font-mono text-emerald-400 mt-1">{formatCurrency(paid)}</p>
              </div>

              <div className="col-span-2 lg:col-span-1 bg-[#0F111A] border border-[#2B314E] p-4 rounded-2xl shadow-sm">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Remaining Balance</p>
                <p className={`text-xl font-black font-mono mt-1 ${remaining <= 0.001 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {formatCurrency(remaining)}
                </p>
              </div>
            </div>

            {/* Quick Action Billing Links */}
            <div className="flex flex-wrap items-center gap-2.5 bg-[#0F111A] p-4 rounded-2xl border border-[#2B314E]">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 mr-2 flex items-center gap-1.5">
                <Receipt className="w-4 h-4 text-emerald-400" /> Billing Documents:
              </span>

              <button
                type="button"
                onClick={() => rental.documents?.invoice ? window.open(rental.documents.invoice, '_blank') : onDownloadInvoice?.()}
                className={`inline-flex items-center px-3.5 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                  rental.documents?.invoice 
                    ? 'border-emerald-500/40 text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20' 
                    : 'border-blue-500/40 text-blue-300 bg-blue-500/10 hover:bg-blue-500/20'
                }`}
              >
                {rental.documents?.invoice ? <Receipt className="h-3.5 w-3.5 mr-1.5 text-emerald-400" /> : <Download className="h-3.5 w-3.5 mr-1.5" />}
                {rental.documents?.invoice ? 'View Invoice PDF' : 'Generate Rental Invoice'}
              </button>

              <button
                type="button"
                onClick={() => rental.documents?.permit ? window.open(rental.documents.permit, '_blank') : onDownloadPermit?.()}
                className={`inline-flex items-center px-3.5 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                  rental.documents?.permit 
                    ? 'border-purple-500/40 text-purple-300 bg-purple-500/10 hover:bg-purple-500/20' 
                    : 'border-slate-600 text-slate-300 bg-slate-800 hover:bg-slate-700'
                }`}
              >
                {rental.documents?.permit ? <FileText className="h-3.5 w-3.5 mr-1.5 text-purple-400" /> : <Download className="h-3.5 w-3.5 mr-1.5" />}
                {rental.documents?.permit ? 'View Permit PDF' : 'Generate Parking Permit'}
              </button>
            </div>

            {/* Itemized Cost Summary Table */}
            <div className="bg-[#0F111A] border border-[#2B314E] rounded-2xl overflow-hidden shadow-sm">
              <div className="p-4 bg-[#121524] border-b border-[#2B314E] flex items-center justify-between">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-blue-400" />
                  Detailed Itemized Cost Breakdown
                </h3>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-[#121524] text-slate-300 border-b border-[#2B314E]">
                    <tr>
                      <th className="px-5 py-3 text-left font-bold uppercase tracking-wider text-[11px]">Item Description</th>
                      <th className="px-5 py-3 text-right font-bold uppercase tracking-wider text-[11px]">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Raw Base */}
                    <tr className="bg-[#0F111A] hover:bg-[#1C2038] border-b border-[#2B314E]/60 transition-colors">
                      <td className="px-5 py-3 font-bold text-white">Base Rental Cost</td>
                      <td className="px-5 py-3 font-mono text-right font-black text-white">{formatCurrency(pureBaseDetailed)}</td>
                    </tr>
                    
                    {/* Hire VAT */}
                    {detailedCosts.vat > 0 && (
                      <tr className="bg-[#121524]/60 hover:bg-[#1C2038] border-b border-[#2B314E]/60 transition-colors">
                        <td className="px-5 py-2.5 font-bold text-blue-300">Calculated VAT</td>
                        <td className="px-5 py-2.5 font-mono text-right text-blue-300 font-black">{formatCurrency(detailedCosts.vat)}</td>
                      </tr>
                    )}
                    
                    {/* Claim Extras */}
                    {rental.type === 'claim' && (rental.storageDays || 0) > 0 && (
                      <tr className="bg-[#0F111A] hover:bg-[#1C2038] border-b border-[#2B314E]/60 transition-colors">
                        <td className="px-5 py-2.5 text-slate-300 font-medium">Storage ({rental.storageDays} days) {rental.includeStorageVAT ? 'Inc VAT' : ''}</td>
                        <td className="px-5 py-2.5 font-mono text-right font-bold text-white">{formatCurrency((rental.storageDays || 0) * (rental.storageCostPerDay || 0) * (rental.includeStorageVAT ? 1.2 : 1))}</td>
                      </tr>
                    )}
                    {rental.type === 'claim' && (rental.recoveryCost || 0) > 0 && (
                      <tr className="bg-[#121524]/60 hover:bg-[#1C2038] border-b border-[#2B314E]/60 transition-colors">
                        <td className="px-5 py-2.5 text-slate-300 font-medium">Recovery {rental.includeRecoveryCostVAT ? 'Inc VAT' : ''}</td>
                        <td className="px-5 py-2.5 font-mono text-right font-bold text-white">{formatCurrency((rental.recoveryCost || 0) * (rental.includeRecoveryCostVAT ? 1.2 : 1))}</td>
                      </tr>
                    )}
                    {(rental.deliveryCharge || 0) > 0 && (
                      <tr className="bg-[#0F111A] hover:bg-[#1C2038] border-b border-[#2B314E]/60 transition-colors">
                        <td className="px-5 py-2.5 text-slate-300 font-medium">Delivery {rental.deliveryChargeIncludeVAT ? 'Inc VAT' : ''}</td>
                        <td className="px-5 py-2.5 font-mono text-right font-bold text-white">{formatCurrency((rental.deliveryCharge || 0) * (rental.deliveryChargeIncludeVAT ? 1.2 : 1))}</td>
                      </tr>
                    )}
                    {(rental.collectionCharge || 0) > 0 && (
                      <tr className="bg-[#121524]/60 hover:bg-[#1C2038] border-b border-[#2B314E]/60 transition-colors">
                        <td className="px-5 py-2.5 text-slate-300 font-medium">Collection {rental.collectionChargeIncludeVAT ? 'Inc VAT' : ''}</td>
                        <td className="px-5 py-2.5 font-mono text-right font-bold text-white">{formatCurrency((rental.collectionCharge || 0) * (rental.collectionChargeIncludeVAT ? 1.2 : 1))}</td>
                      </tr>
                    )}
                    
                    {/* Insurance */}
                    {rental.type !== 'weekly' && (rental.insurancePerDay || 0) > 0 && (
                      <tr className="bg-[#0F111A] hover:bg-[#1C2038] border-b border-[#2B314E]/60 transition-colors">
                        <td className="px-5 py-2.5 text-slate-300 font-medium">Daily Insurance ({insuranceDays} days) {rental.insurancePerDayIncludeVAT ? 'Inc VAT' : ''}</td>
                        <td className="px-5 py-2.5 font-mono text-right font-bold text-white">{formatCurrency((rental.insurancePerDay || 0) * insuranceDays * (rental.insurancePerDayIncludeVAT ? 1.2 : 1))}</td>
                      </tr>
                    )}
                    
                    {rental.type === 'weekly' && (
                      <>
                        {hybridUnits.dailyDays > 0 && (rental.insurancePerDay || 0) > 0 && (
                          <tr className="bg-[#0F111A] hover:bg-[#1C2038] border-b border-[#2B314E]/60 transition-colors">
                            <td className="px-5 py-2.5 text-slate-300 font-medium">Partial Week Insurance ({hybridUnits.dailyDays} days) {rental.insurancePerDayIncludeVAT ? 'Inc VAT' : ''}</td>
                            <td className="px-5 py-2.5 font-mono text-right font-bold text-white">{formatCurrency((rental.insurancePerDay || 0) * hybridUnits.dailyDays * (rental.insurancePerDayIncludeVAT ? 1.2 : 1))}</td>
                          </tr>
                        )}
                        {hybridUnits.weeklyWeeks > 0 && ((rental as any).insurancePerWeek || 0) > 0 && (
                          <tr className="bg-[#121524]/60 hover:bg-[#1C2038] border-b border-[#2B314E]/60 transition-colors">
                            <td className="px-5 py-2.5 text-slate-300 font-medium">Weekly Insurance ({hybridUnits.weeklyWeeks} weeks) {(rental as any).insurancePerWeekIncludeVAT ? 'Inc VAT' : ''}</td>
                            <td className="px-5 py-2.5 font-mono text-right font-bold text-white">{formatCurrency(((rental as any).insurancePerWeek || 0) * hybridUnits.weeklyWeeks * ((rental as any).insurancePerWeekIncludeVAT ? 1.2 : 1))}</td>
                          </tr>
                        )}
                      </>
                    )}
                    
                    {/* Extra Charges */}
                    {rental.extraCharges && rental.extraCharges.length > 0 && rental.extraCharges.map((charge, cIdx) => (
                      <tr key={charge.id} className={`${cIdx % 2 === 1 ? 'bg-[#121524]/60' : 'bg-[#0F111A]'} hover:bg-[#1C2038] border-b border-[#2B314E]/60 transition-colors`}>
                        <td className="px-5 py-2.5 text-slate-200 font-medium flex items-center gap-1.5"><Plus className="w-3 h-3 text-slate-400"/> {charge.name}</td>
                        <td className="px-5 py-2.5 font-mono text-right font-bold text-white">{formatCurrency(charge.amount)}</td>
                      </tr>
                    ))}

                    {/* Discount History */}
                    {rental.discounts && rental.discounts.length > 0 ? (
                      rental.discounts.map(d => (
                        <tr key={d.id} className="bg-emerald-950/25 border-b border-[#2B314E]/60">
                          <td className="px-5 py-3">
                            <span className="font-bold text-emerald-400 flex items-center gap-2">
                              Discount Applied {d.percentage > 0 && <span className="bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded text-[10px] border border-emerald-500/40">({d.percentage}%)</span>}
                            </span>
                            <span className="block text-emerald-300 italic mt-0.5 text-xs">"{d.reason}"</span>
                            <span className="block text-emerald-400/70 text-[10px] uppercase font-bold mt-1 font-mono">{formatDateTime(d.createdAt)}</span>
                          </td>
                          <td className="px-5 py-3 font-mono text-right text-emerald-400 font-black align-top">-{formatCurrency(d.amount)}</td>
                        </tr>
                      ))
                    ) : (
                      detailedCosts.discountAmount > 0 && (
                        <tr className="bg-emerald-950/25 border-b border-[#2B314E]/60">
                          <td className="px-5 py-3 font-bold text-emerald-400">
                            Discount Applied {rental.discountPercentage ? `(${rental.discountPercentage}%)` : ''}
                            {rental.discountNotes && <span className="block italic text-xs mt-1 text-emerald-300">"{rental.discountNotes}"</span>}
                          </td>
                          <td className="px-5 py-3 font-mono text-right text-emerald-400 font-black">-{formatCurrency(detailedCosts.discountAmount)}</td>
                        </tr>
                      )
                    )}
                    
                    {/* Penalties & Overdue */}
                    {ongoingCharges > 0 && (
                      <tr className="bg-rose-950/30 border-b border-rose-900/40">
                        <td className="px-5 py-2.5 text-rose-300 font-bold flex items-center gap-2">
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-400"/> Ongoing (Overdue) Charges
                        </td>
                        <td className="px-5 py-2.5 font-mono text-right font-black text-rose-400">{formatCurrency(ongoingCharges)}</td>
                      </tr>
                    )}
                    {totalReturnCharges > 0 && (
                      <tr className="bg-amber-950/30 border-b border-amber-900/40">
                        <td className="px-5 py-2.5 text-amber-300 font-bold">Return Charges (Damage / Fuel / Cleaning)</td>
                        <td className="px-5 py-2.5 font-mono text-right font-black text-amber-400">{formatCurrency(totalReturnCharges)}</td>
                      </tr>
                    )}
                    
                    {/* Final Totals */}
                    <tr className="bg-[#121524] text-white border-t-2 border-[#2B314E]">
                      <td className="px-5 py-3.5 font-black text-xs uppercase tracking-wider text-white">Total Amount Due</td>
                      <td className="px-5 py-3.5 font-mono text-right text-base font-black text-white">{formatCurrency(totalAmountDue)}</td>
                    </tr>
                    <tr className="bg-[#0F111A] text-slate-300 border-b border-[#2B314E]">
                      <td className="px-5 py-2.5 font-bold uppercase text-[11px] text-slate-400">Amount Paid</td>
                      <td className="px-5 py-2.5 font-mono text-right text-emerald-400 font-black">{formatCurrency(paid)}</td>
                    </tr>
                    <tr className="bg-[#121524] text-white">
                      <td className="px-5 py-3 font-black uppercase text-[11px] text-white">Remaining Balance</td>
                      <td className={`px-5 py-3 font-mono text-right text-base font-black ${remaining <= 0.001 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {formatCurrency(remaining)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {rental.discountNotes && detailedCosts.discountAmount > 0 && (
                <div className="p-3 bg-[#121524] border-t border-[#2B314E] text-xs text-slate-400 italic">
                  Discount Note: {rental.discountNotes}
                </div>
              )}
            </div>

          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: VEHICLE CONDITION                                                 */}
        {/* ========================================================================= */}
        {activeTab === 'condition' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            
            {/* Check-Out Condition Card */}
            {rental.checkOutCondition ? (
              <div className="bg-[#0F111A] border border-[#2B314E] rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex items-center gap-2 border-b border-[#2B314E] pb-3">
                  <CheckCircle className="w-5 h-5 text-blue-400" />
                  <h3 className="text-base font-bold text-white">Check-Out Inspection Condition</h3>
                </div>
                
                <VehicleConditionDetails condition={rental.checkOutCondition} type="check-out" />
                
                {/* Check-Out Photos */}
                {rental.checkOutCondition.images && rental.checkOutCondition.images.length > 0 && (
                  <div className="pt-4 border-t border-[#2B314E]/60">
                    <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-3">
                      Check-Out Evidence Photos ({rental.checkOutCondition.images.length})
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                      {rental.checkOutCondition.images.map((url, i) => (
                        <a 
                          key={i} 
                          href={url} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="block relative aspect-square group rounded-xl overflow-hidden border border-[#2B314E] hover:border-blue-400 transition shadow-xs"
                          title="Click to view full photo"
                        >
                          <img 
                            src={url} 
                            alt={`Check-out evidence ${i+1}`} 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200" 
                          />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-[#0F111A] border border-[#2B314E] rounded-2xl p-6 text-center text-slate-400">
                <ClipboardCheck className="w-8 h-8 text-slate-600 mx-auto mb-2 opacity-50" />
                <p className="text-sm font-medium">No check-out condition inspection logged for this rental.</p>
              </div>
            )}

            {/* Return Condition Card */}
            {rental.returnCondition ? (
              <div className="bg-[#0F111A] border border-emerald-500/40 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-[#2B314E] pb-3">
                  <div className="flex items-center gap-2 text-emerald-400">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    <h3 className="text-base font-bold text-white">Return Inspection Condition (Check-In)</h3>
                  </div>
                  {rental.returnCondition.totalCharges > 0 && (
                    <span className="bg-rose-500/20 text-rose-300 border border-rose-500/40 px-2.5 py-0.5 rounded-full text-xs font-bold">
                      Return Charges: {formatCurrency(rental.returnCondition.totalCharges)}
                    </span>
                  )}
                </div>
                
                <VehicleConditionDetails condition={rental.returnCondition} type="return" />
                
                {/* Return Photos */}
                {rental.returnCondition.images && rental.returnCondition.images.length > 0 && (
                  <div className="pt-4 border-t border-[#2B314E]/60">
                    <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider block mb-3">
                      Return Evidence Photos ({rental.returnCondition.images.length})
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                      {rental.returnCondition.images.map((url, i) => (
                        <a 
                          key={i} 
                          href={url} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="block relative aspect-square group rounded-xl overflow-hidden border border-[#2B314E] hover:border-emerald-400 transition shadow-xs"
                          title="Click to view full photo"
                        >
                          <img 
                            src={url} 
                            alt={`Return evidence ${i+1}`} 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200" 
                          />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-[#0F111A] border border-amber-500/30 rounded-2xl p-6 text-center text-slate-400 space-y-2">
                <div className="w-10 h-10 bg-amber-500/10 text-amber-400 rounded-xl flex items-center justify-center mx-auto border border-amber-500/20">
                  <Clock className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-bold text-white">Vehicle Currently on Active Hire</h4>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Vehicle return inspection, fuel check, mileage logging, and evidence photos will be recorded upon vehicle return.
                </p>
              </div>
            )}

          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: SUBSTITUTIONS                                                     */}
        {/* ========================================================================= */}
        {activeTab === 'substitutions' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {hasSubs ? (
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <ArrowRightLeft className="w-5 h-5 text-amber-400" />
                    Substitution Vehicle Records ({rental.hireSubstitutionDetails!.length})
                  </h3>
                </div>

                {rental.hireSubstitutionDetails!.map((sub, index) => (
                  <div key={index} className="bg-[#0F111A] border border-[#2B314E] rounded-2xl p-5 shadow-sm space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#2B314E] pb-3">
                      <div className="flex items-center gap-2.5">
                        <span className="p-2 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
                          <ArrowRightLeft className="w-4 h-4" />
                        </span>
                        <div>
                          <h4 className="font-bold text-white text-base">
                            Substitution #{index + 1}: {sub.make} {sub.model}
                          </h4>
                          <span className="text-xs text-slate-400">Provider: <span className="text-slate-200 font-medium">{sub.loaner || 'Internal Fleet'}</span></span>
                        </div>
                      </div>
                      <span className="font-mono bg-[#FDD835] text-black px-3 py-1 border border-yellow-500 rounded-md text-xs font-black shadow-xs self-start sm:self-auto">
                        {sub.registration}
                      </span>
                    </div>
                    
                    {/* Dates & Notes */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="bg-[#121524] p-3 rounded-xl border border-[#2B314E] space-y-1">
                        <span className="text-slate-400 block font-bold uppercase text-[10px]">Handover (Given At)</span>
                        <span className="font-mono font-bold text-white">{formatDateTime(sub.givenAt)}</span>
                      </div>
                      <div className="bg-[#121524] p-3 rounded-xl border border-[#2B314E] space-y-1">
                        <span className="text-slate-400 block font-bold uppercase text-[10px]">Expected / Returned</span>
                        <span className="font-mono font-bold text-white">{formatDateTime(sub.returnCondition?.date || sub.expectedReturnAt)}</span>
                      </div>
                    </div>

                    {sub.notes && (
                      <div className="text-xs text-slate-300 italic bg-[#121524] p-3 rounded-xl border border-[#2B314E]">
                        "{sub.notes}"
                      </div>
                    )}

                    {/* Sub Check-Out Condition */}
                    <div className="bg-[#121524] border border-[#2B314E] rounded-xl p-4 space-y-3">
                      <div className="flex items-center gap-2 text-slate-200 font-bold text-xs uppercase tracking-wider">
                        <CheckCircle className="w-4 h-4 text-blue-400"/> Substitute Check-Out Condition
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase font-bold">Mileage Out</span>
                          <span className="font-mono font-bold text-white mt-0.5 block">{(sub.mileage || 0).toLocaleString()} mi</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase font-bold">Fuel Level</span>
                          <span className="font-bold text-white mt-0.5 block">{sub.fuelLevel || '100'}%</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase font-bold">Clean</span>
                          <span className={`font-bold mt-0.5 block ${sub.isClean ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {sub.isClean ? 'Yes' : 'No'}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase font-bold">Damage</span>
                          <span className={`font-bold mt-0.5 block ${sub.hasDamage ? 'text-rose-400' : 'text-emerald-400'}`}>
                            {sub.hasDamage ? 'Reported' : 'None'}
                          </span>
                        </div>
                      </div>
                      {sub.hasDamage && sub.damageDescription && (
                        <div className="bg-rose-950/40 p-2.5 rounded-lg text-xs text-rose-200 border border-rose-500/40">
                          {sub.damageDescription}
                        </div>
                      )}
                      {sub.images && sub.images.length > 0 && (
                        <div className="pt-2 border-t border-[#2B314E]">
                          <span className="text-[10px] text-slate-400 uppercase font-bold block mb-2">Check-Out Photos</span>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {sub.images.map((url, i) => (
                              <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="block relative aspect-square group rounded-lg overflow-hidden border border-[#2B314E]">
                                <img src={url} alt={`Check-out ${i+1}`} className="w-full h-full object-cover group-hover:scale-105 transition" />
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Sub Return Condition */}
                    {sub.returnCondition ? (
                      <div className="bg-[#121524] border border-emerald-500/40 rounded-xl p-4 space-y-3">
                        <div className="flex items-center justify-between gap-2 border-b border-[#2B314E] pb-2">
                          <span className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider">
                            <CheckCircle2 className="w-4 h-4"/> Substitute Return Info (Check-In)
                          </span>
                          {sub.returnCondition.totalCharges > 0 && (
                            <span className="bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded text-xs font-bold border border-rose-500/40">
                              Charges: {formatCurrency(sub.returnCondition.totalCharges)}
                            </span>
                          )}
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                          <div>
                            <span className="text-slate-400 block text-[10px] uppercase font-bold">Mileage In</span>
                            <span className="font-mono font-bold text-white mt-0.5 block">{sub.returnCondition.mileage} mi</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px] uppercase font-bold">Fuel In</span>
                            <span className="font-bold text-white mt-0.5 block">{sub.returnCondition.fuelLevel}%</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px] uppercase font-bold">Clean</span>
                            <span className={`font-bold mt-0.5 block ${sub.returnCondition.isClean ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {sub.returnCondition.isClean ? 'Yes' : 'No'}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px] uppercase font-bold">Damage</span>
                            <span className={`font-bold mt-0.5 block ${sub.returnCondition.hasDamage ? 'text-rose-400' : 'text-emerald-400'}`}>
                              {sub.returnCondition.hasDamage ? 'Reported' : 'None'}
                            </span>
                          </div>
                        </div>
                        {sub.returnCondition.totalCharges > 0 && (
                          <div className="text-xs text-amber-300 font-mono bg-[#0F111A] p-2.5 rounded-lg border border-[#2B314E] space-y-1">
                            {sub.returnCondition.cleaningCharge > 0 && <div>Cleaning Charge: {formatCurrency(sub.returnCondition.cleaningCharge)}</div>}
                            {sub.returnCondition.fuelCharge > 0 && <div>Fuel Charge: {formatCurrency(sub.returnCondition.fuelCharge)}</div>}
                            {sub.returnCondition.damageCost > 0 && <div>Damage Cost: {formatCurrency(sub.returnCondition.damageCost)}</div>}
                          </div>
                        )}
                        {sub.returnCondition.images && sub.returnCondition.images.length > 0 && (
                          <div className="pt-2 border-t border-[#2B314E]">
                            <span className="text-[10px] text-slate-400 uppercase font-bold block mb-2">Return Photos</span>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                              {sub.returnCondition.images.map((url, i) => (
                                <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="block relative aspect-square group rounded-lg overflow-hidden border border-[#2B314E]">
                                  <img src={url} alt={`Return ${i+1}`} className="w-full h-full object-cover group-hover:scale-105 transition" />
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="bg-amber-950/20 border border-amber-500/40 rounded-xl p-3 flex items-center justify-center text-amber-300 font-bold text-xs">
                        Substitute Currently Active / Not Returned Yet
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-[#0F111A] border border-[#2B314E] rounded-2xl p-8 text-center text-slate-400 space-y-3">
                <div className="w-12 h-12 bg-blue-500/10 text-blue-400 rounded-2xl flex items-center justify-center mx-auto border border-blue-500/20">
                  <ArrowRightLeft className="w-6 h-6" />
                </div>
                <h4 className="text-base font-bold text-white">No Substitution Vehicles</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  No substitution vehicles have been assigned to this rental booking. The customer is assigned to the primary vehicle.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 5: DOCUMENTS                                                          */}
        {/* ========================================================================= */}
        {activeTab === 'documents' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            
            {/* Documents & Agreements Section */}
            <div className="bg-[#0F111A] border border-[#2B314E] rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-[#2B314E] pb-3">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-400" />
                  <h3 className="text-base font-bold text-white">Legal Documents & Agreements</h3>
                </div>
                {docsCount > 0 && (
                  <span className="text-xs font-mono font-bold text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-lg border border-blue-500/20">
                    {docsCount} {docsCount === 1 ? 'Document' : 'Documents'}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-2.5">
                {latestAgreementKey && (
                  <button
                    type="button"
                    onClick={() => window.open(rental.documents!.agreements![latestAgreementKey], '_blank')}
                    className="inline-flex items-center px-3.5 py-2 border border-blue-500/50 shadow-xs text-xs font-bold rounded-xl text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 transition cursor-pointer"
                  >
                    <FileText className="h-4 w-4 mr-2 text-blue-400" /> {formatLatestAgreementLabel()} (Main)
                  </button>
                )}

                {agreementKeys.filter((k) => k !== latestAgreementKey).map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => window.open(rental.documents!.agreements![key], '_blank')}
                    className="inline-flex items-center px-3.5 py-2 border border-[#2B314E] shadow-xs text-xs font-medium rounded-xl text-slate-300 bg-[#121524] hover:bg-[#1C2038] transition cursor-pointer"
                  >
                    <FileText className="h-4 w-4 mr-2 text-slate-400" /> {formatAgreementKey(key)}
                  </button>
                ))}

                <button
                  type="button"
                  onClick={() => rental.documents?.invoice ? window.open(rental.documents.invoice, '_blank') : onDownloadInvoice?.()}
                  className={`inline-flex items-center px-3.5 py-2 border shadow-xs text-xs font-bold rounded-xl transition cursor-pointer ${
                    rental.documents?.invoice 
                      ? 'border-emerald-500/40 text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20' 
                      : 'border-blue-500/40 text-blue-300 bg-blue-500/10 hover:bg-blue-500/20'
                  }`}
                >
                  {rental.documents?.invoice ? <Receipt className="h-4 w-4 mr-2 text-emerald-400" /> : <Download className="h-4 w-4 mr-2" />}
                  {rental.documents?.invoice ? 'View Rental Invoice' : 'Generate Invoice'}
                </button>

                <button
                  type="button"
                  onClick={() => rental.documents?.permit ? window.open(rental.documents.permit, '_blank') : onDownloadPermit?.()}
                  className={`inline-flex items-center px-3.5 py-2 border shadow-xs text-xs font-bold rounded-xl transition cursor-pointer ${
                    rental.documents?.permit 
                      ? 'border-purple-500/40 text-purple-300 bg-purple-500/10 hover:bg-purple-500/20' 
                      : 'border-[#2B314E] text-slate-300 bg-[#121524] hover:bg-[#1C2038]'
                  }`}
                >
                  {rental.documents?.permit ? <MapPin className="h-4 w-4 mr-2 text-purple-400" /> : <Download className="h-4 w-4 mr-2" />}
                  {rental.documents?.permit ? 'View Parking Permit' : 'Generate Permit'}
                </button>
              </div>

              {/* Claim Documents */}
              {rental.type === 'claim' && (
                <div className="pt-3 border-t border-[#2B314E]">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Claim Documentation</span>
                  <div className="flex flex-wrap gap-2">
                    {['conditionOfHire', 'noticeOfRightToCancel', 'hireAgreement', 'creditStorageAndRecovery', 'creditHireMitigation', 'satisfactionNotice'].map(docKey => {
                      if (!rental.documents?.[docKey]) return null;
                      const formattedName = docKey.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                      const label = docKey === 'hireAgreement' && rental.rentalAgreementNumber
                        ? `Hire Agreement #${rental.rentalAgreementNumber}`
                        : formattedName;
                      return (
                        <button
                          key={docKey} 
                          type="button"
                          onClick={() => window.open((rental.documents as any)[docKey], '_blank')}
                          className="inline-flex items-center px-3 py-1.5 border border-[#2B314E] shadow-xs text-xs font-medium rounded-lg text-slate-300 bg-[#121524] hover:bg-[#1C2038] cursor-pointer"
                          title={label}
                        >
                          <FileText className="h-3 w-3 mr-1.5 text-blue-400" />
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Customer Signature Card */}
            {rental.signature && (
              <div className="bg-[#0F111A] border border-[#2B314E] rounded-2xl p-5 shadow-sm space-y-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-purple-400" /> Customer Digital Signature
                </h3>
                <div className="bg-[#121524] p-4 rounded-xl border border-[#2B314E] w-full max-w-sm">
                  <img src={rental.signature} alt="Customer Signature" className="max-h-24 object-contain bg-white/95 rounded-lg border border-slate-700 p-2" />
                </div>
              </div>
            )}

            {/* Footer Audit Information */}
            <div className="text-xs text-slate-400 flex flex-col sm:flex-row justify-between gap-2 border-t border-[#2B314E] pt-4 font-mono">
              <div>Created by: <span className="text-slate-200 font-bold">{createdByName || rental.createdBy || 'Unknown'}</span></div>
              <div>Last Updated: <span className="text-slate-200 font-bold">{formatDateTime(rental.updatedAt)}</span></div>
            </div>

          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 6: PAYMENTS                                                           */}
        {/* ========================================================================= */}
        {activeTab === 'payments' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            
            {/* Payment Summary Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div className="bg-[#0F111A] border border-[#2B314E] p-4 rounded-2xl shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Rental Due</span>
                  <Receipt className="w-4 h-4 text-slate-400" />
                </div>
                <p className="text-xl font-bold font-mono text-white mt-1.5">{formatCurrency(totalAmountDue)}</p>
              </div>

              <div className="bg-[#0F111A] border border-[#2B314E] p-4 rounded-2xl shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">Total Paid</span>
                  <CreditCard className="w-4 h-4 text-emerald-400" />
                </div>
                <p className="text-xl font-bold font-mono text-emerald-400 mt-1.5">{formatCurrency(paid)}</p>
              </div>

              <div className="bg-[#0F111A] border border-[#2B314E] p-4 rounded-2xl shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Outstanding Balance</span>
                  <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                    remaining <= 0.001 
                      ? 'bg-emerald-500/20 text-emerald-300' 
                      : (unpaidWarningInfo.effectivePaymentStatus === 'unpaid' 
                          ? '!bg-red-600 !text-white border border-red-700 font-extrabold animate-blink shadow-sm' 
                          : 'bg-rose-500/20 text-rose-300')
                  }`}>
                    {unpaidWarningInfo.effectivePaymentStatus.toUpperCase()}
                  </span>
                </div>
                <p className={`text-xl font-black font-mono mt-1.5 ${remaining <= 0.001 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {formatCurrency(remaining)}
                </p>
              </div>
            </div>

            {/* Blinking Urgent Warning Banner */}
            {unpaidWarningInfo.urgencyLevel === 'red' && unpaidWarningInfo.warningMessage && (
              <div className="flex items-center justify-between gap-3 bg-red-600 border-2 border-red-700 text-white p-4 rounded-2xl shadow-lg animate-blink">
                <div className="flex items-center gap-2.5">
                  <AlertTriangle className="w-5 h-5 text-white shrink-0" />
                  <span className="text-sm font-bold tracking-tight text-white">{unpaidWarningInfo.warningMessage}</span>
                </div>
                <span className="text-xs font-mono font-extrabold bg-white text-red-700 px-2.5 py-1 rounded-lg shrink-0 shadow-sm">
                  ACTION REQUIRED
                </span>
              </div>
            )}

            {/* Payment History Component */}
            <div className="bg-[#0F111A] border border-[#2B314E] rounded-2xl p-5 shadow-sm">
              <RentalPaymentHistory 
                payments={rental.payments || []} 
                onDownloadDocument={(url) => window.open(url, '_blank')} 
              />
            </div>

            {/* Footer Audit Information */}
            <div className="text-xs text-slate-300 flex flex-col sm:flex-row justify-between gap-2 border-t border-[#2B314E] pt-4 font-mono">
              <div>Payment Status: <span className="text-white font-bold capitalize">{rental.paymentStatus || 'Pending'}</span></div>
              <div>Last Updated: <span className="text-white font-bold">{formatDateTime(rental.updatedAt)}</span></div>
            </div>

          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 7: WHATSAPP DIRECT MESSAGING                                          */}
        {/* ========================================================================= */}
        {activeTab === 'whatsapp' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            
            {/* WhatsApp Branded Header Banner */}
            <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-2xl border border-emerald-500/30 shrink-0">
                  <MessageCircle className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-white">WhatsApp Customer Messaging</h3>
                    <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full">
                      Direct WhatsApp
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1 max-w-xl leading-relaxed">
                    Compose and send payment reminders, hire agreement links, balance alerts, and notices directly to the customer on WhatsApp.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setCommModalMode('whatsapp');
                    setIsCommModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 text-xs font-bold rounded-xl border border-emerald-500/30 transition cursor-pointer"
                  title="Open in dedicated pop-up modal"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Pop-out Window
                </button>
              </div>
            </div>

            {/* Recipient & Template Config Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Recipient Phone */}
              <div className="bg-[#0F111A] border border-[#2B314E] rounded-2xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-emerald-400" /> Recipient Mobile Number
                  </label>
                  {customer?.mobile ? (
                    <span className="text-[10px] text-emerald-300 font-bold bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-md">
                      Customer Profile Mobile
                    </span>
                  ) : (
                    <span className="text-[10px] text-amber-300 font-bold bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-md">
                      Enter Mobile Below
                    </span>
                  )}
                </div>
                <div className="relative">
                  <input
                    type="text"
                    value={commRecipientPhone}
                    onChange={(e) => setCommRecipientPhone(e.target.value)}
                    placeholder="e.g. 07123 456789 or +447123456789"
                    className="w-full bg-[#121524] text-white border border-[#2B314E] focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl px-3.5 py-2.5 text-sm font-mono placeholder-slate-400 outline-none transition"
                  />
                </div>
              </div>

              {/* Template Selector */}
              <div className="bg-[#0F111A] border border-[#2B314E] rounded-2xl p-4 space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-blue-400" /> Select Message Template
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setTemplatesNavModalTab('whatsapp');
                        setIsTemplatesNavModalOpen(true);
                      }}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 px-2 py-1 rounded-lg border border-emerald-500/30 transition cursor-pointer"
                      title="Open WhatsApp & Email Template Navigation Tabs"
                    >
                      <Sparkles className="w-3 h-3" />
                      Template Navigation Tabs
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const curTpl = commTemplates.find(t => t.id === selectedCommTemplateId);
                        setTemplateToEdit(curTpl ? {
                          id: curTpl.id,
                          name: curTpl.name,
                          category: curTpl.category,
                          subjectTemplate: curTpl.subjectTemplate,
                          bodyTemplate: curTpl.bodyTemplate,
                        } : null);
                        setTemplateEditorMode(curTpl ? 'edit' : 'create');
                        setIsTemplateEditorOpen(true);
                      }}
                      className="inline-flex items-center gap-1 text-[10px] text-blue-300 hover:text-white font-bold cursor-pointer"
                    >
                      {!canEditTemplates && <Lock className="w-3 h-3 text-amber-400" />}
                      {canEditTemplates ? '+ / Edit Template' : 'View (Read-Only)'}
                    </button>
                  </div>
                </div>
                <select
                  value={selectedCommTemplateId}
                  onChange={(e) => handleSelectCommTemplate(e.target.value)}
                  className="w-full bg-[#121524] text-white border border-[#2B314E] focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl px-3.5 py-2.5 text-sm outline-none cursor-pointer transition font-medium"
                >
                  {commTemplates.map((t) => (
                    <option key={t.id} value={t.id} className="bg-[#121524] text-white">
                      [{t.category.toUpperCase()}] {t.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Quick Data Tools Bar */}
            <div className="bg-[#0F111A] border border-[#2B314E] rounded-2xl p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-200">
                  Quick Data Insert Tools (Click to Insert Live Values)
                </span>
                <span className="text-[10px] text-slate-400">Values are injected live</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleInsertTag('{paid_amount}')}
                  className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 transition cursor-pointer"
                >
                  + Paid: {formatCurrency(paid)}
                </button>
                <button
                  type="button"
                  onClick={() => handleInsertTag('{owing_amount}')}
                  className="px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/40 transition cursor-pointer"
                >
                  + Owing: {formatCurrency(remaining)}
                </button>
                <button
                  type="button"
                  onClick={() => handleInsertTag('{last_payment_amount}')}
                  className="px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-500/15 hover:bg-blue-500/25 text-blue-300 border border-blue-500/40 transition cursor-pointer"
                >
                  + Last Payment
                </button>
                <button
                  type="button"
                  onClick={() => handleInsertTag('{date_paid}')}
                  className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/40 transition cursor-pointer"
                >
                  + Date Paid
                </button>
                <button
                  type="button"
                  onClick={() => handleInsertTag('{vehicle_reg}')}
                  className="px-2.5 py-1 rounded-lg text-xs font-bold bg-[#1E2238] hover:bg-[#2B314E] text-white border border-[#2B314E] transition cursor-pointer"
                >
                  + Reg: {vehicle?.registrationNumber || rental.vehicleReg || 'N/A'}
                </button>
                <button
                  type="button"
                  onClick={() => handleInsertTag('{agreement_number}')}
                  className="px-2.5 py-1 rounded-lg text-xs font-bold bg-[#1E2238] hover:bg-[#2B314E] text-white border border-[#2B314E] transition cursor-pointer"
                >
                  + Agr #: {rental.rentalAgreementNumber || rental.id || 'N/A'}
                </button>
                <button
                  type="button"
                  onClick={() => handleInsertTag('{client_name}')}
                  className="px-2.5 py-1 rounded-lg text-xs font-bold bg-[#1E2238] hover:bg-[#2B314E] text-white border border-[#2B314E] transition cursor-pointer"
                >
                  + Customer: {customer?.name || rental.customerName || 'Customer'}
                </button>
                <button
                  type="button"
                  onClick={() => handleInsertTag('{payment_details}')}
                  className="px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/40 transition cursor-pointer"
                >
                  + Lloyds Bank Details
                </button>
              </div>
            </div>

            {/* Document Link Attachments */}
            <div className="bg-[#0F111A] border border-[#2B314E] rounded-2xl p-4 space-y-2.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-200 block">
                Attach Document Download Links into Message
              </span>
              <div className="flex flex-wrap gap-2.5">
                {latestAgreementKey && rental.documents?.agreements?.[latestAgreementKey] && (
                  <button
                    type="button"
                    onClick={() => handleToggleDocAttachment('hireAgreement', 'Hire Agreement', rental.documents!.agreements![latestAgreementKey])}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                      selectedDocIds.includes('hireAgreement')
                        ? 'bg-blue-500/20 text-blue-200 border-blue-400'
                        : 'bg-[#121524] text-slate-300 border-[#2B314E] hover:border-slate-500'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5 text-blue-400" />
                    {selectedDocIds.includes('hireAgreement') ? '✓ Hire Agreement Attached' : '+ Attach Hire Agreement'}
                  </button>
                )}

                {rental.documents?.invoice && (
                  <button
                    type="button"
                    onClick={() => handleToggleDocAttachment('invoice', 'Rental Invoice', rental.documents!.invoice)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                      selectedDocIds.includes('invoice')
                        ? 'bg-emerald-500/20 text-emerald-200 border-emerald-400'
                        : 'bg-[#121524] text-slate-300 border-[#2B314E] hover:border-slate-500'
                    }`}
                  >
                    <Receipt className="w-3.5 h-3.5 text-emerald-400" />
                    {selectedDocIds.includes('invoice') ? '✓ Invoice Attached' : '+ Attach Rental Invoice'}
                  </button>
                )}

                {rental.documents?.permit && (
                  <button
                    type="button"
                    onClick={() => handleToggleDocAttachment('permit', 'Parking Permit', rental.documents!.permit)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                      selectedDocIds.includes('permit')
                        ? 'bg-purple-500/20 text-purple-200 border-purple-400'
                        : 'bg-[#121524] text-slate-300 border-[#2B314E] hover:border-slate-500'
                    }`}
                  >
                    <MapPin className="w-3.5 h-3.5 text-purple-400" />
                    {selectedDocIds.includes('permit') ? '✓ Permit Attached' : '+ Attach Parking Permit'}
                  </button>
                )}
              </div>
            </div>

            {/* WhatsApp Message Preview & Textarea */}
            <div className="border border-[#2B314E] rounded-2xl overflow-hidden bg-[#0c1317] shadow-inner">
              <div className="bg-[#075e54] text-white px-4 py-2.5 text-xs font-bold flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>WhatsApp Message Preview</span>
                </div>
                <span className="text-[10px] text-emerald-200 font-normal">Fully editable message</span>
              </div>
              <div className="p-4">
                <textarea
                  rows={9}
                  value={commMessage}
                  onChange={(e) => setCommMessage(e.target.value)}
                  className="w-full bg-[#162026] text-white text-xs sm:text-sm p-3.5 rounded-xl shadow-inner border border-[#2B314E] focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 resize-y font-sans leading-relaxed"
                  placeholder="Type your WhatsApp message..."
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleOpenWhatsApp}
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-sm rounded-xl shadow-md transition active:scale-95 cursor-pointer"
                >
                  <MessageCircle className="w-4 h-4" />
                  Open in WhatsApp
                </button>

                <button
                  type="button"
                  onClick={handleCopyMessage}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-[#1E2238] hover:bg-[#2B314E] text-white font-bold text-xs rounded-xl border border-[#2B314E] transition cursor-pointer"
                >
                  {commCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-slate-300" />}
                  {commCopied ? 'Copied' : 'Copy'}
                </button>
              </div>

              <span className="text-xs text-slate-400 font-mono">
                Recipient: <strong className="text-white">{commRecipientPhone || 'Not Set'}</strong>
              </span>
            </div>

          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 8: EMAIL DIRECT MESSAGING                                             */}
        {/* ========================================================================= */}
        {activeTab === 'email' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            
            {/* Email Branded Header Banner */}
            <div className="bg-sky-950/40 border border-sky-500/40 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-sky-500/20 text-sky-400 rounded-2xl border border-sky-500/30 shrink-0">
                  <Mail className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-white">Direct Customer Email Messaging</h3>
                    <span className="bg-sky-500/20 text-sky-300 border border-sky-500/40 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full">
                      Direct Email
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1 max-w-xl leading-relaxed">
                    Send invoices, rental statements, booking confirmations, or overdue notifications directly to the customer's email.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setCommModalMode('email');
                    setIsCommModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 text-xs font-bold rounded-xl border border-sky-500/30 transition cursor-pointer"
                  title="Open in dedicated pop-up modal"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Pop-out Window
                </button>
              </div>
            </div>

            {/* Recipient & Subject & Template Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Recipient Email */}
              <div className="bg-[#0F111A] border border-[#2B314E] rounded-2xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-sky-400" /> Recipient Email Address
                  </label>
                  {customer?.email ? (
                    <span className="text-[10px] text-sky-300 font-bold bg-sky-500/10 border border-sky-500/30 px-2 py-0.5 rounded-md">
                      Customer Profile Email
                    </span>
                  ) : (
                    <span className="text-[10px] text-amber-300 font-bold bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-md">
                      Enter Email Below
                    </span>
                  )}
                </div>
                <input
                  type="email"
                  value={commRecipientEmail}
                  onChange={(e) => setCommRecipientEmail(e.target.value)}
                  placeholder="e.g. driver@example.com"
                  className="w-full bg-[#121524] text-white border border-[#2B314E] focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded-xl px-3.5 py-2.5 text-sm placeholder-slate-400 outline-none transition"
                />
              </div>

              {/* Template Selector */}
              <div className="bg-[#0F111A] border border-[#2B314E] rounded-2xl p-4 space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-blue-400" /> Select Email Template
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setTemplatesNavModalTab('email');
                        setIsTemplatesNavModalOpen(true);
                      }}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-sky-400 hover:text-sky-300 bg-sky-500/10 hover:bg-sky-500/20 px-2 py-1 rounded-lg border border-sky-500/30 transition cursor-pointer"
                      title="Open WhatsApp & Email Template Navigation Tabs"
                    >
                      <Sparkles className="w-3 h-3" />
                      Template Navigation Tabs
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const curTpl = commTemplates.find(t => t.id === selectedCommTemplateId);
                        setTemplateToEdit(curTpl ? {
                          id: curTpl.id,
                          name: curTpl.name,
                          category: curTpl.category,
                          subjectTemplate: curTpl.subjectTemplate,
                          bodyTemplate: curTpl.bodyTemplate,
                        } : null);
                        setTemplateEditorMode(curTpl ? 'edit' : 'create');
                        setIsTemplateEditorOpen(true);
                      }}
                      className="inline-flex items-center gap-1 text-[10px] text-blue-300 hover:text-white font-bold cursor-pointer"
                    >
                      {!canEditTemplates && <Lock className="w-3 h-3 text-amber-400" />}
                      {canEditTemplates ? '+ / Edit Template' : 'View (Read-Only)'}
                    </button>
                  </div>
                </div>
                <select
                  value={selectedCommTemplateId}
                  onChange={(e) => handleSelectCommTemplate(e.target.value)}
                  className="w-full bg-[#121524] text-white border border-[#2B314E] focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded-xl px-3.5 py-2.5 text-sm outline-none cursor-pointer transition font-medium"
                >
                  {commTemplates.map((t) => (
                    <option key={t.id} value={t.id} className="bg-[#121524] text-white">
                      [{t.category.toUpperCase()}] {t.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Subject Line (Spans 2 columns) */}
              <div className="md:col-span-2 bg-[#0F111A] border border-[#2B314E] rounded-2xl p-4 space-y-2">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
                  Subject Line
                </label>
                <input
                  type="text"
                  value={commSubject}
                  onChange={(e) => setCommSubject(e.target.value)}
                  placeholder="Email Subject Line..."
                  className="w-full bg-[#121524] text-white border border-[#2B314E] focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded-xl px-3.5 py-2.5 text-sm placeholder-slate-400 outline-none transition font-medium"
                />
              </div>
            </div>

            {/* Quick Data Tools Bar */}
            <div className="bg-[#0F111A] border border-[#2B314E] rounded-2xl p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-200">
                  Quick Data Insert Tools (Click to Insert Live Values)
                </span>
                <span className="text-[10px] text-slate-400">Values are injected live</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleInsertTag('{paid_amount}')}
                  className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 transition cursor-pointer"
                >
                  + Paid: {formatCurrency(paid)}
                </button>
                <button
                  type="button"
                  onClick={() => handleInsertTag('{owing_amount}')}
                  className="px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/40 transition cursor-pointer"
                >
                  + Owing: {formatCurrency(remaining)}
                </button>
                <button
                  type="button"
                  onClick={() => handleInsertTag('{last_payment_amount}')}
                  className="px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-500/15 hover:bg-blue-500/25 text-blue-300 border border-blue-500/40 transition cursor-pointer"
                >
                  + Last Payment
                </button>
                <button
                  type="button"
                  onClick={() => handleInsertTag('{date_paid}')}
                  className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/40 transition cursor-pointer"
                >
                  + Date Paid
                </button>
                <button
                  type="button"
                  onClick={() => handleInsertTag('{vehicle_reg}')}
                  className="px-2.5 py-1 rounded-lg text-xs font-bold bg-[#1E2238] hover:bg-[#2B314E] text-white border border-[#2B314E] transition cursor-pointer"
                >
                  + Reg: {vehicle?.registrationNumber || rental.vehicleReg || 'N/A'}
                </button>
                <button
                  type="button"
                  onClick={() => handleInsertTag('{agreement_number}')}
                  className="px-2.5 py-1 rounded-lg text-xs font-bold bg-[#1E2238] hover:bg-[#2B314E] text-white border border-[#2B314E] transition cursor-pointer"
                >
                  + Agr #: {rental.rentalAgreementNumber || rental.id || 'N/A'}
                </button>
                <button
                  type="button"
                  onClick={() => handleInsertTag('{client_name}')}
                  className="px-2.5 py-1 rounded-lg text-xs font-bold bg-[#1E2238] hover:bg-[#2B314E] text-white border border-[#2B314E] transition cursor-pointer"
                >
                  + Customer: {customer?.name || rental.customerName || 'Customer'}
                </button>
                <button
                  type="button"
                  onClick={() => handleInsertTag('{payment_details}')}
                  className="px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/40 transition cursor-pointer"
                >
                  + Lloyds Bank Details
                </button>
              </div>
            </div>

            {/* Document Link Attachments */}
            <div className="bg-[#0F111A] border border-[#2B314E] rounded-2xl p-4 space-y-2.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-200 block">
                Attach Document Download Links into Message
              </span>
              <div className="flex flex-wrap gap-2.5">
                {latestAgreementKey && rental.documents?.agreements?.[latestAgreementKey] && (
                  <button
                    type="button"
                    onClick={() => handleToggleDocAttachment('hireAgreement', 'Hire Agreement', rental.documents!.agreements![latestAgreementKey])}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                      selectedDocIds.includes('hireAgreement')
                        ? 'bg-blue-500/20 text-blue-200 border-blue-400'
                        : 'bg-[#121524] text-slate-300 border-[#2B314E] hover:border-slate-500'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5 text-blue-400" />
                    {selectedDocIds.includes('hireAgreement') ? '✓ Hire Agreement Attached' : '+ Attach Hire Agreement'}
                  </button>
                )}

                {rental.documents?.invoice && (
                  <button
                    type="button"
                    onClick={() => handleToggleDocAttachment('invoice', 'Rental Invoice', rental.documents!.invoice)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                      selectedDocIds.includes('invoice')
                        ? 'bg-emerald-500/20 text-emerald-200 border-emerald-400'
                        : 'bg-[#121524] text-slate-300 border-[#2B314E] hover:border-slate-500'
                    }`}
                  >
                    <Receipt className="w-3.5 h-3.5 text-emerald-400" />
                    {selectedDocIds.includes('invoice') ? '✓ Invoice Attached' : '+ Attach Rental Invoice'}
                  </button>
                )}

                {rental.documents?.permit && (
                  <button
                    type="button"
                    onClick={() => handleToggleDocAttachment('permit', 'Parking Permit', rental.documents!.permit)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                      selectedDocIds.includes('permit')
                        ? 'bg-purple-500/20 text-purple-200 border-purple-400'
                        : 'bg-[#121524] text-slate-300 border-[#2B314E] hover:border-slate-500'
                    }`}
                  >
                    <MapPin className="w-3.5 h-3.5 text-purple-400" />
                    {selectedDocIds.includes('permit') ? '✓ Permit Attached' : '+ Attach Parking Permit'}
                  </button>
                )}
              </div>
            </div>

            {/* Email Message Preview & Textarea */}
            <div className="border border-[#2B314E] rounded-2xl overflow-hidden bg-[#0F111A] shadow-inner">
              <div className="bg-sky-700 text-white px-4 py-2.5 text-xs font-bold flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Mail className="w-3.5 h-3.5 text-sky-200" />
                  <span>Email Body Preview</span>
                </div>
                <span className="text-[10px] text-sky-200 font-normal">Fully editable message</span>
              </div>
              <div className="p-4">
                <textarea
                  rows={9}
                  value={commMessage}
                  onChange={(e) => setCommMessage(e.target.value)}
                  className="w-full bg-[#121524] text-white text-xs sm:text-sm p-3.5 rounded-xl shadow-inner border border-[#2B314E] focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 resize-y font-sans leading-relaxed"
                  placeholder="Type your email message body..."
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
                <button
                  type="button"
                  onClick={handleSendEmail}
                  className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-extrabold text-sm rounded-xl shadow-md transition active:scale-95 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  Send Email
                </button>

                <button
                  type="button"
                  onClick={handleSendTestStatementEmail}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 font-bold text-xs rounded-xl border border-purple-500/30 transition cursor-pointer"
                  title="Send immediate Monday Statement test email"
                >
                  <Send className="w-3.5 h-3.5 text-purple-400" />
                  Send Test Statement
                </button>

                <button
                  type="button"
                  onClick={handleCopyMessage}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-[#1E2238] hover:bg-[#2B314E] text-white font-bold text-xs rounded-xl border border-[#2B314E] transition cursor-pointer"
                >
                  {commCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-slate-300" />}
                  {commCopied ? 'Copied' : 'Copy'}
                </button>
              </div>

              <span className="text-xs text-slate-400 font-mono">
                Recipient: <strong className="text-white">{commRecipientEmail || 'Not Set'}</strong>
              </span>
            </div>

          </div>
        )}

      </div>

      {/* ========================================================================= */}
      {/* 4. PINNED BOTTOM ACTION BAR                                               */}
      {/* ========================================================================= */}
      <div className="p-3 sm:px-6 bg-[#121524] border-t border-[#2B314E] shrink-0 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={handlePrevTab}
          disabled={currentTabIndex === 0}
          className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
            currentTabIndex === 0
              ? 'opacity-40 cursor-not-allowed text-slate-500'
              : 'text-slate-200 hover:text-white bg-[#1E2238] hover:bg-[#2B314E] border border-[#2B314E]'
          }`}
        >
          <ChevronLeft className="w-4 h-4" />
          Previous
        </button>

        <div className="hidden sm:flex items-center gap-3 text-xs font-mono">
          <span className="text-slate-300">Total Due: <strong className="text-white">{formatCurrency(totalAmountDue)}</strong></span>
          <span className="text-slate-500">•</span>
          <span className="text-slate-300">Owing: <strong className={remaining <= 0.001 ? 'text-emerald-400' : 'text-rose-400'}>{formatCurrency(remaining)}</strong></span>
        </div>

        <div className="flex items-center gap-2">
          {currentTabIndex < tabs.length - 1 ? (
            <button
              type="button"
              onClick={handleNextTab}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            onClose && (
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
              >
                Close
              </button>
            )
          )}
        </div>
      </div>

      {/* Pop-up Communication Modal if triggered */}
      {isCommModalOpen && (
        <RentalCommunicationModal
          isOpen={isCommModalOpen}
          onClose={() => setIsCommModalOpen(false)}
          rental={rental}
          customer={customer || undefined}
          vehicle={vehicle || undefined}
          initialMode={commModalMode}
        />
      )}

      {/* Modal Navigation Tabs for WhatsApp & Email Templates */}
      {isTemplatesNavModalOpen && (
        <RentalTemplatesModal
          isOpen={isTemplatesNavModalOpen}
          onClose={() => setIsTemplatesNavModalOpen(false)}
          initialTab={templatesNavModalTab}
          rental={rental}
          customer={customer}
          vehicle={vehicle}
          onSelectTemplate={(tpl) => {
            setSelectedCommTemplateId(tpl.id || '');
            if (tpl.channel === 'whatsapp' || tpl.channel === 'email') {
              setActiveTab(tpl.channel);
            }
            if (tpl.subjectTemplate) {
              setCommSubject(populateTemplate(tpl.subjectTemplate));
            }
            setCommMessage(populateTemplate(tpl.bodyTemplate));
            setIsTemplatesNavModalOpen(false);
            toast.success(`Loaded "${tpl.name}" template`);
          }}
        />
      )}

      {/* Template Editor / Creator Modal */}
      {isTemplateEditorOpen && (
        <RentalTemplateEditorModal
          isOpen={isTemplateEditorOpen}
          onClose={() => setIsTemplateEditorOpen(false)}
          mode={templateEditorMode}
          templateToEdit={templateToEdit}
          initialTemplate={templateToEdit || undefined}
          populateFn={populateTemplate}
          rental={rental}
          customer={customer || undefined}
          vehicle={vehicle || undefined}
          readOnly={!canEditTemplates}
          onSave={async (saved) => {
            setIsTemplateEditorOpen(false);
            await fetchCommTemplates(saved.id || selectedCommTemplateId);
          }}
        />
      )}

    </div>
  );
};

export default RentalDetails;
