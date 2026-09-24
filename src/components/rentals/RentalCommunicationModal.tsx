// src/components/rentals/RentalCommunicationModal.tsx
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Rental, Customer, Vehicle } from '../../types';
import Modal from '../ui/Modal';
import { db } from '../../lib/firebase';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { format } from 'date-fns';
import { useFormattedDisplay } from '../../hooks/useFormattedDisplay';
import { useAuth } from '../../context/AuthContext';
import { 
  MessageCircle, 
  Mail, 
  Send, 
  Copy, 
  Check, 
  RefreshCw, 
  AlertTriangle, 
  ExternalLink,
  Printer,
  Search,
  ChevronDown,
  CheckCircle2,
  FileText,
  Car,
  Clock,
  Paperclip,
  Receipt,
  MapPin,
  CheckSquare,
  AlertCircle,
  Shield,
  Scale,
  Award,
  Lock,
  Loader2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { formatWhatsAppNumber, buildWaMeLink, openWhatsAppLink } from '../../utils/whatsapp';
import { sendEmail } from '../../utils/emailService';
import { logWhatsappHistory } from '../../hooks/useWhatsappHistory';
import { logEmailHistory } from '../../hooks/useEmailHistory';
import { logCommunication } from '../../services/communicationLogService';
import { generateRentalDocuments } from '../../utils/generateRentalDocuments';
import { uploadRentalDocuments } from '../../utils/uploadRentalDocuments';
import { emailTemplates } from '../../constants/emailTemplates';
import { usePermissions } from '../../hooks/usePermissions';
import { loadTemplatesForCategory } from '../../utils/templateManager';

export interface RentalCommunicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  rental?: Rental | null;
  rentals?: Rental[];
  customer?: Customer;
  vehicle?: Vehicle;
  customers?: Customer[];
  vehicles?: Vehicle[];
  initialMode?: 'whatsapp' | 'email';
}

interface TemplateOption {
  id: string;
  name: string;
  category: string;
  subjectTemplate: string;
  bodyTemplate: string;
}

export interface RentalDocItem {
  id: string;
  docType: string;
  label: string;
  key?: string;
  existingUrl?: string;
  category: 'hire' | 'invoice' | 'permit' | 'claim';
  icon: React.ComponentType<{ className?: string }>;
}

// Pure date and time formatting helpers
export const formatDateValue = (d: any): string => {
  if (!d) return 'N/A';
  try {
    const date = d?.toDate ? d.toDate() : d instanceof Date ? d : new Date(d);
    if (isNaN(date.getTime())) return 'N/A';
    return format(date, 'dd/MM/yyyy');
  } catch {
    return 'N/A';
  }
};

export const formatTimeValue = (d: any): string => {
  if (!d) return '';
  try {
    const date = d?.toDate ? d.toDate() : d instanceof Date ? d : new Date(d);
    if (isNaN(date.getTime())) return '';
    return format(date, 'HH:mm');
  } catch {
    return '';
  }
};

export const RentalCommunicationModal: React.FC<RentalCommunicationModalProps> = ({
  isOpen,
  onClose,
  rental: propRental,
  rentals = [],
  customer,
  vehicle,
  customers = [],
  vehicles = [],
  initialMode = 'whatsapp',
}) => {
  const { user } = useAuth();
  const { formatCurrency } = useFormattedDisplay();
  const { can, isAdmin } = usePermissions();
  const canSendWhatsApp = isAdmin || can('rentals', 'whatsapp') || can('rentals', 'send') || can('whatsapp', 'send') || can('rentals', 'view');
  const canSendEmail = isAdmin || can('rentals', 'email') || can('rentals', 'send') || can('rentals', 'view');
  const canUseTemplates = isAdmin || can('rentals', 'template') || can('rentals', 'view');
  const canEditTemplates = isAdmin || can('rentals', 'templateEdit');
  
  const [mode, setMode] = useState<'whatsapp' | 'email'>(initialMode);
  const [fetchedRentals, setFetchedRentals] = useState<Rental[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    if (rentals && rentals.length > 0) return;
    getDocs(collection(db, 'rentals'))
      .then((snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Rental));
        setFetchedRentals(list);
      })
      .catch((err) => console.warn('Failed to fetch rentals for modal:', err));
  }, [isOpen, rentals]);

  const availableRentals = useMemo(() => {
    const list = [...(rentals && rentals.length > 0 ? rentals : fetchedRentals)];
    if (propRental && !list.some((r) => r.id === propRental.id)) {
      list.unshift(propRental);
    }
    return list;
  }, [propRental, rentals, fetchedRentals]);

  const [selectedRentalId, setSelectedRentalId] = useState<string>(propRental?.id || '');

  useEffect(() => {
    if (propRental?.id) {
      setSelectedRentalId(propRental.id);
    } else if (availableRentals.length > 0 && !selectedRentalId) {
      setSelectedRentalId(availableRentals[0].id);
    }
  }, [propRental, availableRentals, selectedRentalId]);

  const rental = useMemo(() => {
    if (selectedRentalId && availableRentals.length > 0) {
      return availableRentals.find((r) => r.id === selectedRentalId) || availableRentals[0] || null;
    }
    if (propRental) return propRental;
    return availableRentals.length > 0 ? availableRentals[0] : null;
  }, [propRental, availableRentals, selectedRentalId]);

  // Customer & Vehicle resolution fallback
  const [internalCustomer, setInternalCustomer] = useState<Customer | undefined>(customer);
  const [internalVehicle, setInternalVehicle] = useState<Vehicle | undefined>(vehicle);

  // Sync customer & vehicle when rental changes
  useEffect(() => {
    if (!rental) return;
    if (customers && customers.length > 0 && rental.customerId) {
      const matchedCust = customers.find((c) => c.id === rental.customerId);
      if (matchedCust) setInternalCustomer(matchedCust);
    }
    if (vehicles && vehicles.length > 0 && rental.vehicleId) {
      const matchedVeh = vehicles.find((v) => v.id === rental.vehicleId);
      if (matchedVeh) setInternalVehicle(matchedVeh);
    }
  }, [rental, customers, vehicles]);

  // Searchable Agreement dropdown state
  const [agreementDropdownOpen, setAgreementDropdownOpen] = useState(false);
  const [agreementSearchQuery, setAgreementSearchQuery] = useState('');
  const agreementDropdownRef = useRef<HTMLDivElement>(null);

  // Searchable Recipient dropdown state
  const [recipientType, setRecipientType] = useState<'customer' | 'driver' | 'garage'>('customer');
  const [recipientDropdownOpen, setRecipientDropdownOpen] = useState(false);
  const [recipientSearchQuery, setRecipientSearchQuery] = useState('');
  const recipientDropdownRef = useRef<HTMLDivElement>(null);

  // Safely extract effective customer data with fallback chaining
  const effCustomer = useMemo(() => {
    return (internalCustomer || customer || (rental as any)?.customer || (rental as any)?.driver || {}) as any;
  }, [internalCustomer, customer, rental]);

  // Safely extract effective vehicle data with fallback chaining
  const effVehicle = useMemo(() => {
    return (internalVehicle || vehicle || (rental as any)?.vehicle || {}) as any;
  }, [internalVehicle, vehicle, rental]);

  const recipientOptions = useMemo(() => {
    const cust = effCustomer;
    const veh = effVehicle;

    const customerName = cust?.name || (rental as any)?.customerName || 'Customer';
    const customerPhone = cust?.mobile || cust?.phone || (cust as any)?.tel || '';
    const customerEmail = cust?.email || '';

    const driverName = (rental as any)?.driverName || customerName;
    const driverPhone = (rental as any)?.driverPhone || customerPhone;
    const driverEmail = (rental as any)?.driverEmail || customerEmail;

    const garageName = (veh as any)?.assignedGarage || (veh as any)?.serviceCenter || (rental as any)?.garageName || 'Fleet Service Center';
    const garagePhone = (veh as any)?.garagePhone || (veh as any)?.serviceCenterPhone || '';
    const garageEmail = (veh as any)?.garageEmail || (veh as any)?.serviceCenterEmail || '';

    return [
      {
        type: 'customer' as const,
        label: 'Customer / Client',
        subLabel: 'Primary hiring customer or company account',
        name: customerName,
        phone: customerPhone,
        email: customerEmail,
        badge: 'Customer',
        badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
      },
      {
        type: 'driver' as const,
        label: 'Assigned Driver',
        subLabel: 'Driver operating vehicle under rental agreement',
        name: driverName,
        phone: driverPhone,
        email: driverEmail,
        badge: 'Driver',
        badgeColor: 'bg-purple-100 text-purple-800 border-purple-200',
      },
      {
        type: 'garage' as const,
        label: 'Service Garage / Provider',
        subLabel: 'Assigned maintenance or repair garage',
        name: garageName,
        phone: garagePhone,
        email: garageEmail,
        badge: 'Garage',
        badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
      },
    ];
  }, [rental, effCustomer, effVehicle]);

  const activeRecipient = useMemo(() => {
    return recipientOptions.find((o) => o.type === recipientType) || recipientOptions[0];
  }, [recipientOptions, recipientType]);

  const defaultContact = useMemo(() => {
    return {
      phone: activeRecipient?.phone || '',
      email: activeRecipient?.email || '',
    };
  }, [activeRecipient]);

  // Editable form fields with manual typing support
  const [recipientPhone, setRecipientPhone] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [isPhoneCustom, setIsPhoneCustom] = useState(false);
  const [isEmailCustom, setIsEmailCustom] = useState(false);

  // Keep phone/email in sync with defaults UNLESS manually overridden by user
  useEffect(() => {
    if (!isPhoneCustom) {
      setRecipientPhone(defaultContact.phone);
    }
  }, [defaultContact.phone, isPhoneCustom]);

  useEffect(() => {
    if (!isEmailCustom) {
      setRecipientEmail(defaultContact.email);
    }
  }, [defaultContact.email, isEmailCustom]);

  const handleSelectAgreement = (agreementId: string) => {
    setSelectedRentalId(agreementId);
    setAgreementDropdownOpen(false);
    setAgreementSearchQuery('');
    // Reset custom contact flags when switching agreement
    setIsPhoneCustom(false);
    setIsEmailCustom(false);
  };

  const filteredAgreementOptions = useMemo(() => {
    if (!agreementSearchQuery.trim()) return availableRentals;
    const q = agreementSearchQuery.toLowerCase().trim();
    return availableRentals.filter((r) => {
      const matchNo = (r.rentalAgreementNumber || r.id || '').toLowerCase().includes(q);
      const matchCust = ((r as any).customerName || '').toLowerCase().includes(q);
      const matchReg = ((r as any).vehicleReg || '').toLowerCase().includes(q);
      const matchStatus = (r.status || '').toLowerCase().includes(q);
      return matchNo || matchCust || matchReg || matchStatus;
    });
  }, [availableRentals, agreementSearchQuery]);

  const filteredRecipientOptions = useMemo(() => {
    if (!recipientSearchQuery.trim()) return recipientOptions;
    const q = recipientSearchQuery.toLowerCase().trim();
    return recipientOptions.filter((opt) => {
      return (
        opt.label.toLowerCase().includes(q) ||
        opt.subLabel.toLowerCase().includes(q) ||
        opt.name.toLowerCase().includes(q) ||
        opt.phone.toLowerCase().includes(q) ||
        opt.email.toLowerCase().includes(q) ||
        opt.badge.toLowerCase().includes(q)
      );
    });
  }, [recipientOptions, recipientSearchQuery]);

  const [templates, setTemplates] = useState<TemplateOption[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const selectedTemplate = useMemo(() => templates.find((t) => t.id === selectedTemplateId), [templates, selectedTemplateId]);
  const messageTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Searchable dropdown state
  const [isTemplateDropdownOpen, setIsTemplateDropdownOpen] = useState(false);
  const [templateSearchQuery, setTemplateSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const hasPreselectedRef = useRef(false);

  // Editable form fields
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [baseMessage, setBaseMessage] = useState('');
  const [copied, setCopied] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [isPrintingPdf, setIsPrintingPdf] = useState(false);
  const [cachedPdfUrl, setCachedPdfUrl] = useState<string>('');

  // Selected Documents to Attach (All UNCHECKED by default)
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [docUrls, setDocUrls] = useState<Record<string, string>>({});
  const [isGeneratingDocs, setIsGeneratingDocs] = useState<Record<string, boolean>>({});
  const [isLinkValidating, setIsLinkValidating] = useState<Record<string, boolean>>({});
  const [verifiedDocIds, setVerifiedDocIds] = useState<Record<string, boolean>>({});

  const prevIsOpenRef = useRef(false);
  const activeRentalIdRef = useRef<string | null>(null);

  useEffect(() => {
    setInternalCustomer(customer);
  }, [customer]);

  useEffect(() => {
    setInternalVehicle(vehicle);
  }, [vehicle]);

  // If customer or vehicle is missing, resolve directly from Firestore
  useEffect(() => {
    if (!isOpen || !rental) return;
    if (!customer && rental.customerId) {
      getDoc(doc(db, 'customers', rental.customerId)).then((snap) => {
        if (snap.exists()) {
          setInternalCustomer({ id: snap.id, ...snap.data() } as Customer);
        }
      }).catch(console.error);
    }
    if (!vehicle && rental.vehicleId) {
      getDoc(doc(db, 'vehicles', rental.vehicleId)).then((snap) => {
        if (snap.exists()) {
          setInternalVehicle({ id: snap.id, ...snap.data() } as Vehicle);
        }
      }).catch(console.error);
    }
  }, [isOpen, rental, customer, vehicle]);

  // Sync mode and reset documents selection ONLY when modal freshly opens or switches to a different rental
  useEffect(() => {
    if (isOpen) {
      const isFreshOpen = !prevIsOpenRef.current || (rental && rental.id !== activeRentalIdRef.current);
      if (isFreshOpen) {
        setMode(initialMode);
        setIsTemplateDropdownOpen(false);
        setTemplateSearchQuery('');
        // Automatically map and attach documents conditionally based on Claim vs Non-Claim Customer
        const effCust = (internalCustomer || customer || (rental as any)?.customer || (rental as any)?.driver || {}) as any;
        const rawCustType = String(effCust?.type || rental?.customerType || '').trim().toLowerCase();
        const rawRentType = String(rental?.type || (rental as any).rentalType || (rental as any).billingType || '').trim().toLowerCase();
        const isNonClaim =
          rawCustType === 'weekly' ||
          rawCustType === 'daily' ||
          rawCustType === 'standard' ||
          rawCustType === 'non-claim' ||
          rawCustType === 'customer' ||
          rawCustType === 'company' ||
          rawRentType === 'weekly' ||
          rawRentType === 'daily' ||
          rawRentType === 'standard' ||
          rawRentType === 'non-claim';

        const isClaim = !isNonClaim && Boolean(
          rawCustType === 'claim' ||
          rawRentType === 'claim' ||
          String(rental.reason || '').trim().toLowerCase() === 'claim' ||
          Boolean(rental.claimId)
        );

        if (isClaim) {
          // FOR CLAIM CUSTOMERS: Automatically map all 5 Claim Documents
          setSelectedDocIds([
            'hire_agreement_main',
            'credit_hire_mitigation',
            'credit_storage_and_recovery',
            'notice_of_right_to_cancel',
            'condition_of_hire'
          ]);
        } else {
          // FOR NON-CLAIM CUSTOMERS: Automatically attach ONLY Hire Agreement Terms & Conditions (T&C)
          setSelectedDocIds(['hire_agreement_main']);
        }
        activeRentalIdRef.current = rental?.id || null;
      }
      prevIsOpenRef.current = true;

      // Look for any existing agreement or invoice URL
      if (rental?.documents?.agreements) {
        const agreementKeys = Object.keys(rental.documents.agreements);
        if (agreementKeys.length > 0) {
          const latestKey = agreementKeys.sort().reverse()[0];
          setCachedPdfUrl(rental.documents.agreements[latestKey]);
        }
      } else if (rental?.documents?.invoice) {
        setCachedPdfUrl(rental.documents.invoice);
      }
    } else {
      prevIsOpenRef.current = false;
      activeRentalIdRef.current = null;
      hasPreselectedRef.current = false;
      setSelectedDocIds([]);
    }
  }, [isOpen, initialMode, rental?.id]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsTemplateDropdownOpen(false);
      }
      if (agreementDropdownRef.current && !agreementDropdownRef.current.contains(e.target as Node)) {
        setAgreementDropdownOpen(false);
      }
      if (recipientDropdownRef.current && !recipientDropdownRef.current.contains(e.target as Node)) {
        setRecipientDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Load message templates from unified templateManager filtered by active mode
  const fetchRentalTemplates = useCallback(async (selectId?: string) => {
    setLoadingTemplates(true);
    try {
      const list = await loadTemplatesForCategory('rental', mode);
      const allTpls: TemplateOption[] = list.map((t) => ({
        id: t.id,
        name: t.name,
        category: t.category || 'Rental',
        subjectTemplate: t.subjectTemplate || '',
        bodyTemplate: t.bodyTemplate || '',
      }));

      // Sort alphabetically
      allTpls.sort((a, b) => a.name.localeCompare(b.name));

      setTemplates(allTpls);
      if (selectId) {
        setSelectedTemplateId(selectId);
      }
    } catch (err) {
      console.error('Failed to load templates:', err);
    } finally {
      setLoadingTemplates(false);
    }
  }, [mode]);

  useEffect(() => {
    if (!isOpen) return;
    fetchRentalTemplates();
    const handleSync = () => fetchRentalTemplates();
    window.addEventListener('template_saved', handleSync);
    window.addEventListener('template_deleted', handleSync);
    return () => {
      window.removeEventListener('template_saved', handleSync);
      window.removeEventListener('template_deleted', handleSync);
    };
  }, [isOpen, fetchRentalTemplates]);

  // Determine rental booking & payment state
  const rentalState = useMemo(() => {
    if (!rental) return 'active';
    const total = Number(rental.cost ?? 0);
    const paid = Number(rental.paidAmount ?? 0);
    const owing = Number(rental.remainingAmount ?? Math.max(0, total - paid));
    const status = String(rental.status || '').toLowerCase();
    const paymentStatus = String(rental.paymentStatus || '').toLowerCase();

    // 1. Overdue
    if (status === 'overdue') return 'overdue';
    if (rental.endDate) {
      try {
        const endD = (rental.endDate as any)?.toDate 
          ? (rental.endDate as any).toDate() 
          : rental.endDate instanceof Date 
            ? rental.endDate 
            : new Date(rental.endDate);
        if (status === 'active' && endD.getTime() < Date.now()) return 'overdue';
      } catch {
        // ignore date issues
      }
    }

    // 2. Fully Paid
    if (paymentStatus === 'paid' || (total > 0 && owing <= 0.01)) {
      return 'full_payment';
    }

    // 3. Partial Payment
    if (paymentStatus === 'partially_paid' || (paid > 0.01 && owing > 0.01)) {
      return 'partial_payment';
    }

    // 4. Outstanding Balance / Pending
    if (paymentStatus === 'pending' || (owing > 0.01 && paid <= 0.01)) {
      return 'outstanding_balance';
    }

    // 5. Active Rental
    if (status === 'active') return 'active';

    // 6. Completed
    if (status === 'completed') return 'completed';

    return 'active';
  }, [rental]);

  // Smart Auto-Selection (PRE-SELECT ONLY once when modal opens / templates load)
  useEffect(() => {
    if (!isOpen || templates.length === 0 || !rental || hasPreselectedRef.current) return;

    hasPreselectedRef.current = true;
    let matched: TemplateOption | undefined;

    if (rentalState === 'overdue') {
      matched = templates.find((t) => {
        const combined = `${t.id} ${t.name} ${t.subjectTemplate}`.toLowerCase();
        return (
          combined.includes('overdue') ||
          combined.includes('outstanding') ||
          combined.includes('late') ||
          combined.includes('reminder') ||
          combined.includes('return')
        );
      });
    } else if (rentalState === 'full_payment') {
      matched = templates.find((t) => {
        const combined = `${t.id} ${t.name} ${t.subjectTemplate}`.toLowerCase();
        return (
          combined.includes('paid') ||
          combined.includes('full payment') ||
          combined.includes('receipt') ||
          combined.includes('cleared') ||
          combined.includes('settled') ||
          combined.includes('complete')
        );
      });
    } else if (rentalState === 'partial_payment') {
      matched = templates.find((t) => {
        const combined = `${t.id} ${t.name} ${t.subjectTemplate}`.toLowerCase();
        return (
          combined.includes('partial') ||
          combined.includes('part payment') ||
          combined.includes('deposit') ||
          combined.includes('installment') ||
          combined.includes('balance')
        );
      });
    } else if (rentalState === 'outstanding_balance') {
      matched = templates.find((t) => {
        const combined = `${t.id} ${t.name} ${t.subjectTemplate}`.toLowerCase();
        return (
          combined.includes('outstanding') ||
          combined.includes('balance') ||
          combined.includes('pending') ||
          combined.includes('invoice') ||
          combined.includes('payment') ||
          combined.includes('due')
        );
      });
    } else {
      // Active Rental / Standard
      matched = templates.find((t) => {
        const combined = `${t.id} ${t.name} ${t.subjectTemplate}`.toLowerCase();
        return (
          combined.includes('active') ||
          combined.includes('booking') ||
          combined.includes('agreement') ||
          combined.includes('confirmation') ||
          combined.includes('rental') ||
          combined.includes('hire')
        );
      });
    }

    const finalTemplate = matched || templates[0];
    if (finalTemplate) {
      setSelectedTemplateId(finalTemplate.id);
    }
  }, [isOpen, templates, rental, rentalState]);

  // Dynamic Placeholder Injection & Live Preview
  const populateTemplate = useCallback(
    (rawText: string, currentPdfUrl?: string): string => {
      if (!rental || !rawText) return '';

      const effCustomer = (internalCustomer || customer || (rental as any)?.customer || (rental as any)?.driver || {}) as any;
      const effVehicle = (internalVehicle || vehicle || (rental as any)?.vehicle || {}) as any;

      const clientName = effCustomer?.name || (rental as any)?.customerName || 'Customer';
      const rentalId = rental.rentalAgreementNumber || rental.id || 'N/A';
      const total = Number(rental.cost ?? 0);
      const paid = Number(rental.paidAmount ?? 0);
      const owing = Number(rental.remainingAmount ?? Math.max(0, total - paid));

      const totalStr = formatCurrency(total);
      const paidStr = formatCurrency(paid);
      const owingStr = formatCurrency(owing);

      // Format method name nicely
      const formatPaymentMethodName = (m?: string): string => {
        if (!m) return 'N/A';
        const lower = m.toLowerCase();
        if (lower.includes('bank') || lower.includes('transfer')) return 'Bank Transfer';
        if (lower.includes('card')) return 'Card';
        if (lower.includes('cash')) return 'Cash';
        if (lower.includes('cheque') || lower.includes('check')) return 'Cheque';
        return m.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
      };

      // Latest payment details
      let lastPaymentPaidStr = '£0.00';
      let datePaidStr = '';
      let lastPaymentMethodStr = 'N/A';
      let lastPaymentRefStr = '';
      let lastPaymentNotesStr = '';
      let lastPaymentVehicleStr = '';
      let lastPaymentItem: any = null;

      const paymentsList = rental.payments || [];
      if (paymentsList.length > 0) {
        const sorted = [...paymentsList].sort((a, b) => {
          const tA = a.date ? new Date(a.date as any).getTime() : 0;
          const tB = b.date ? new Date(b.date as any).getTime() : 0;
          return tB - tA;
        });
        const latest = sorted[0];
        if (latest) {
          lastPaymentItem = latest;
          lastPaymentPaidStr = formatCurrency(latest.amount || 0);
          datePaidStr = formatDateValue(latest.date || latest.createdAt);
          lastPaymentMethodStr = formatPaymentMethodName(latest.method);
          lastPaymentRefStr = latest.reference || rentalId;
          lastPaymentNotesStr = latest.notes || '';
          lastPaymentVehicleStr = latest.allocatedVehicleName || '';
        }
      } else if (paid > 0) {
        lastPaymentPaidStr = formatCurrency(paid);
        datePaidStr = formatDateValue(rental.updatedAt || rental.startDate);
        lastPaymentMethodStr = formatPaymentMethodName(rental.paymentMethod);
        lastPaymentRefStr = rental.paymentReference || rentalId;
      } else {
        datePaidStr = formatDateValue(rental.startDate);
      }

      // Payment status string
      const paymentStatusStr = owing <= 0.001 ? 'Fully Paid' : paid > 0 ? 'Partially Paid' : 'Pending';

      // Full payment statement of all recorded transactions
      const sortedPaymentsDesc = [...paymentsList].sort((a, b) => {
        const tA = a.date ? new Date(a.date as any).getTime() : 0;
        const tB = b.date ? new Date(b.date as any).getTime() : 0;
        return tB - tA;
      });

      const statementLines = sortedPaymentsDesc.map((p) => {
        const pDate = formatDateValue(p.date || p.createdAt);
        const pAmt = formatCurrency(p.amount || 0);
        const pMethod = formatPaymentMethodName(p.method);
        const pRef = p.reference ? ` | Ref: ${p.reference}` : '';
        const pNotes = p.notes ? ` (${p.notes})` : '';
        return `• ${pDate}: ${pAmt} via ${pMethod}${pRef}${pNotes}`;
      });

      const paymentStatementStr = statementLines.length > 0
        ? `📄 Payment Statement (${statementLines.length} payment${statementLines.length > 1 ? 's' : ''}):\n${statementLines.join('\n')}\nTotal Paid: ${paidStr} | Balance Outstanding: ${owingStr}`
        : 'No payments recorded yet.';

      const lastTransactionStr = lastPaymentItem
        ? `${lastPaymentPaidStr} paid on ${datePaidStr} via ${lastPaymentMethodStr}${lastPaymentRefStr ? ` (Ref: ${lastPaymentRefStr})` : ''}`
        : (paid > 0 ? `${paidStr} paid via ${lastPaymentMethodStr}` : 'No payment recorded yet');

      // VAT and Subtotal calculations
      const hasVAT = rental.includeVAT !== false;
      const netCost = hasVAT ? total / 1.2 : total;
      const vatCost = Math.max(0, total - netCost);
      const subtotalStr = formatCurrency(rental.subtotal || netCost);
      const vatAmountStr = formatCurrency(rental.vatAmount || vatCost);

      const startDateStr = formatDateValue(rental.startDate);
      const endDateStr = formatDateValue(rental.endDate);
      const startTimeStr = formatTimeValue(rental.startDate);
      const endTimeStr = formatTimeValue(rental.endDate);
      const phoneStr = effCustomer?.mobile || effCustomer?.phone || (effCustomer as any)?.tel || '';
      const emailStr = effCustomer?.email || '';
      const vehicleReg = effVehicle?.registrationNumber || 'N/A';
      const vehicleMake = effVehicle?.make || '';
      const vehicleModel = effVehicle?.model || '';
      const vehicleName = `${vehicleMake} ${vehicleModel}`.trim() || vehicleReg;
      const dailyRateStr = formatCurrency(rental.lockedDailyRate || effVehicle?.dailyRentalPrice || 0);
      const weeklyRateStr = formatCurrency(rental.lockedWeeklyRate || effVehicle?.weeklyRentalPrice || 0);
      const rentalType = rental.type || 'Standard';
      const pdfUrlStr = currentPdfUrl || cachedPdfUrl || '';

      const paymentDetails = `🏦 Bank: Lloyds Bank\n💼 Account Name: AIE SKYLINE LIMITED\n🔢 Account Number: 30513162\n🔣 Sort Code: 30-99-50\n📝 Reference: ${rentalId}`;

      // Mapping dictionary supporting both {tag} and [Tag] styles
      const replacements: Record<string, string> = {
        // Customer / Client Name
        '{client_name}': clientName,
        '{customer_name}': clientName,
        '{recipient_name}': clientName,
        '{driver_name}': clientName,
        '[client name]': clientName,
        '[customer name]': clientName,
        '[recipient name]': clientName,
        '[driver name]': clientName,
        "['driver name]": clientName,
        "[driver's name]": clientName,

        // Rental ID & Agreement
        '{rental_id}': rentalId,
        '{rental_agreement_number}': rentalId,
        '{agreement_number}': rentalId,
        '{agreement_no}': rentalId,
        '{invoice_number}': rentalId,
        '{invoice_no}': rentalId,
        '[rental id]': rentalId,
        '[rental agreement number]': rentalId,
        '[rental number]': rentalId,
        '[agreement number]': rentalId,
        '[agreement no]': rentalId,
        '[agreement reference]': rentalId,

        // Total Cost / Grand Total
        '{total_amount}': totalStr,
        '{total_cost}': totalStr,
        '{rental_cost}': totalStr,
        '{grand_total}': totalStr,
        '{total}': totalStr,
        '{amount}': totalStr,
        '[total amount]': totalStr,
        '[total cost]': totalStr,
        '[rental cost]': totalStr,
        '[grand total]': totalStr,
        '[total]': totalStr,
        '[amount]': totalStr,

        // Paid amounts (explicit user request: payment paid, total paid)
        '{paid_amount}': paidStr,
        '{payment_paid}': paidStr,
        '{total_paid}': paidStr,
        '{paid}': paidStr,
        '{amount_paid}': paidStr,
        '[paid amount]': paidStr,
        '[payment paid]': paidStr,
        '[total paid]': paidStr,
        '[paid]': paidStr,
        '[paid balance]': paidStr,
        '[amount paid]': paidStr,

        // Outstanding & Owing (explicit user request: total current outstanding, outstanding / owing)
        '{owing_amount}': owingStr,
        '{total_outstanding}': owingStr,
        '{current_outstanding}': owingStr,
        '{total_current_outstanding}': owingStr,
        '{outstanding_balance}': owingStr,
        '{owing}': owingStr,
        '{outstanding}': owingStr,
        '{amount_owing}': owingStr,
        '{amount_due}': owingStr,
        '{amount_owed}': owingStr,
        '[owing amount]': owingStr,
        '[total outstanding]': owingStr,
        '[current outstanding]': owingStr,
        '[total current outstanding]': owingStr,
        '[owing]': owingStr,
        '[outstanding]': owingStr,
        '[outstanding balance]': owingStr,
        '[amount owed]': owingStr,
        '[amount due]': owingStr,
        '[amount owing]': owingStr,
        '[new balance]': owingStr,
        '[owing balance]': owingStr,
        '[amount overdue]': owingStr,
        '[total overdue]': owingStr,

        // Payment History & Dates (explicit user request: last record Record Payment, paid date, amount, type of payment cash or card or bank transfer, statement, transection payment)
        '{last_payment_paid}': lastPaymentPaidStr,
        '{last_payment_amount}': lastPaymentPaidStr,
        '{last_record_payment_amount}': lastPaymentPaidStr,
        '{last_record_amount}': lastPaymentPaidStr,
        '{last_payment}': lastPaymentPaidStr,
        '{amount_received}': lastPaymentPaidStr,
        '[last payment paid]': lastPaymentPaidStr,
        '[last payment amount]': lastPaymentPaidStr,
        '[last record payment amount]': lastPaymentPaidStr,
        '[last record amount]': lastPaymentPaidStr,
        '[last payment]': lastPaymentPaidStr,
        '[amount received]': lastPaymentPaidStr,

        '{date_paid}': datePaidStr,
        '{the_date_paid}': datePaidStr,
        '{last_payment_date}': datePaidStr,
        '{last_record_payment_date}': datePaidStr,
        '{payment_date}': datePaidStr,
        '{date_received}': datePaidStr,
        '[date paid]': datePaidStr,
        '[the date paid]': datePaidStr,
        '[last payment date]': datePaidStr,
        '[last record payment date]': datePaidStr,
        '[payment date]': datePaidStr,
        '[date received]': datePaidStr,
        '[dd/mm/yyyy]': datePaidStr,

        '{last_payment_type}': lastPaymentMethodStr,
        '{last_payment_method}': lastPaymentMethodStr,
        '{payment_type}': lastPaymentMethodStr,
        '{payment_method}': lastPaymentMethodStr,
        '{type_of_payment}': lastPaymentMethodStr,
        '{last_record_payment_type}': lastPaymentMethodStr,
        '[last payment type]': lastPaymentMethodStr,
        '[last payment method]': lastPaymentMethodStr,
        '[payment type]': lastPaymentMethodStr,
        '[payment method]': lastPaymentMethodStr,
        '[type of payment]': lastPaymentMethodStr,
        '[payment mode]': lastPaymentMethodStr,

        '{last_payment_ref}': lastPaymentRefStr,
        '{last_payment_reference}': lastPaymentRefStr,
        '{payment_reference}': lastPaymentRefStr,
        '{transaction_id}': lastPaymentRefStr,
        '{transaction_reference}': lastPaymentRefStr,
        '{last_record_payment_ref}': lastPaymentRefStr,
        '[last payment ref]': lastPaymentRefStr,
        '[last payment reference]': lastPaymentRefStr,
        '[payment reference]': lastPaymentRefStr,
        '[transaction id]': lastPaymentRefStr,
        '[transaction ref]': lastPaymentRefStr,

        '{last_payment_notes}': lastPaymentNotesStr,
        '{payment_notes}': lastPaymentNotesStr,
        '[last payment notes]': lastPaymentNotesStr,
        '[payment notes]': lastPaymentNotesStr,

        '{last_payment_vehicle}': lastPaymentVehicleStr,
        '[last payment vehicle]': lastPaymentVehicleStr,

        '{payment_status}': paymentStatusStr,
        '[payment status]': paymentStatusStr,

        // Statement & Transaction payment
        '{payment_statement}': paymentStatementStr,
        '{statement}': paymentStatementStr,
        '{statement_of_account}': paymentStatementStr,
        '{payment_transactions}': paymentStatementStr,
        '{transactions_summary}': paymentStatementStr,
        '[payment statement]': paymentStatementStr,
        '[statement]': paymentStatementStr,
        '[statement of account]': paymentStatementStr,
        '[payment transactions]': paymentStatementStr,

        '{transaction_payment}': lastTransactionStr,
        '{last_transaction}': lastTransactionStr,
        '[transaction payment]': lastTransactionStr,
        '[transection payment]': lastTransactionStr,
        '[last transaction]': lastTransactionStr,

        // Dates & Times
        '{start_date}': startDateStr,
        '[start date]': startDateStr,
        '{end_date}': endDateStr,
        '[end date]': endDateStr,
        '{due_date}': endDateStr,
        '[due date]': endDateStr,
        '{date}': startDateStr,
        '[date]': startDateStr,
        '[the current date]': startDateStr,
        '[current date]': startDateStr,
        '{start_time}': startTimeStr,
        '[start time]': startTimeStr,
        '{end_time}': endTimeStr,
        '[end time]': endTimeStr,

        // Vehicle info & Registration Number
        '{vehicle_reg}': vehicleReg,
        '{registration}': vehicleReg,
        '{registration_number}': vehicleReg,
        '{reg_number}': vehicleReg,
        '[vehicle reg]': vehicleReg,
        '[registration]': vehicleReg,
        '[registration number]': vehicleReg,
        '[vehicle registration number]': vehicleReg,
        '[reg number]': vehicleReg,
        '{vehicle_name}': vehicleName,
        '[vehicle]': vehicleName,
        '[vehicle make & model]': vehicleName,
        '{vehicle_make}': vehicleMake,
        '[vehicle make]': vehicleMake,
        '{vehicle_model}': vehicleModel,
        '[vehicle model]': vehicleModel,

        // Rates & Breakdown
        '{daily_rate}': dailyRateStr,
        '[daily rate]': dailyRateStr,
        '{weekly_rate}': weeklyRateStr,
        '[weekly rate]': weeklyRateStr,
        '{subtotal}': subtotalStr,
        '[subtotal]': subtotalStr,
        '{vat_amount}': vatAmountStr,
        '{vat}': vatAmountStr,
        '[vat]': vatAmountStr,
        '[vat amount]': vatAmountStr,
        '{rental_type}': rentalType,
        '[rental type]': rentalType,

        // Contact info
        '{client_phone}': phoneStr,
        '{phone}': phoneStr,
        '{mobile}': phoneStr,
        '[phone]': phoneStr,
        '[customer phone]': phoneStr,
        '[mobile]': phoneStr,

        '{client_email}': emailStr,
        '{email}': emailStr,
        '[email]': emailStr,
        '[customer email]': emailStr,

        // PDF URL / Links
        '{pdf_link}': pdfUrlStr,
        '{pdf_url}': pdfUrlStr,
        '{download_url}': pdfUrlStr,
        '[pdf link]': pdfUrlStr,
        '[pdf url]': pdfUrlStr,
        '[download url]': pdfUrlStr,

        // Bank / Payment Instructions
        '{payment_details}': paymentDetails,
        '[payment details]': paymentDetails,
        '[bank details]': paymentDetails,
        '[payment instructions]': paymentDetails,
      };

      let result = rawText;
      Object.entries(replacements).forEach(([key, val]) => {
        const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const re = new RegExp(escaped, 'gi');
        result = result.replace(re, val);
      });

      return result;
    },
    [rental, customer, internalCustomer, vehicle, internalVehicle, cachedPdfUrl, formatCurrency]
  );

  // Agreement key formatting helper matching the Rental Page document toolbar
  const formatAgreementKey = useCallback((key: string): string => {
    try {
      const timestamp = parseInt(key.split('_')[1] || '0', 10);
      return timestamp === 0 
        ? 'Hire Agreement' 
        : `Hire Agreement (${format(new Date(timestamp), 'dd/MM/yyyy')})`;
    } catch {
      return `Hire Agreement (${key.replace(/^agreement_/, '')})`;
    }
  }, []);

  // Dynamically list all document files associated with the active rental record matching the document list from the UI
  const availableDocs = useMemo<RentalDocItem[]>(() => {
    if (!rental) return [];

    const items: RentalDocItem[] = [];
    const docs = (rental.documents as any) || {};

    const effCustomer = (internalCustomer || customer || (rental as any)?.customer || (rental as any)?.driver || {}) as any;
    const rawCustomerType = String(effCustomer?.type || rental?.customerType || '').trim().toLowerCase();
    const rawRentalType = String(rental.type || (rental as any).rentalType || (rental as any).billingType || '').trim().toLowerCase();

    // Explicit Non-Claim check: Weekly, Daily, Standard, Non-Claim, Customer, Company
    const isNonClaimCustomer =
      rawCustomerType === 'weekly' ||
      rawCustomerType === 'daily' ||
      rawCustomerType === 'standard' ||
      rawCustomerType === 'non-claim' ||
      rawCustomerType === 'customer' ||
      rawCustomerType === 'company' ||
      rawRentalType === 'weekly' ||
      rawRentalType === 'daily' ||
      rawRentalType === 'standard' ||
      rawRentalType === 'non-claim';

    const isClaimRental = !isNonClaimCustomer && Boolean(
      rawCustomerType === 'claim' ||
      rawRentalType === 'claim' ||
      String(rental.reason || '').trim().toLowerCase() === 'claim' ||
      Boolean(rental.claimId)
    );

    const agreementKeys = docs.agreements 
      ? Object.keys(docs.agreements).sort((a, b) => parseInt(a.split('_')[1] || '0', 10) - parseInt(b.split('_')[1] || '0', 10)) 
      : [];
    const latestAgreementKey = agreementKeys.length > 0 ? agreementKeys[agreementKeys.length - 1] : null;

    const mainAgreementUrl = latestAgreementKey 
      ? docs.agreements[latestAgreementKey] 
      : docs.hireAgreement || docs.claimHireAgreement || undefined;

    if (isClaimRental) {
      // ────────────────────────────────────────────────────────────
      // FOR CLAIM CUSTOMERS (Customer Type = "Claim"):
      // Automatically map and include all 5 specific Claim Documents:
      // 1. Hire Agreement
      // 2. Credit Hire Mitigation
      // 3. Credit Storage and Recovery
      // 4. Right to Cancel
      // 5. Condition of Hire
      // ────────────────────────────────────────────────────────────

      // 1. Hire Agreement
      items.push({
        id: 'hire_agreement_main',
        docType: 'hireAgreement',
        label: 'Hire Agreement',
        key: latestAgreementKey || undefined,
        existingUrl: mainAgreementUrl,
        category: 'claim',
        icon: FileText,
      });

      // 2. Credit Hire Mitigation
      items.push({
        id: 'credit_hire_mitigation',
        docType: 'creditHireMitigation',
        label: 'Credit Hire Mitigation',
        existingUrl: docs.creditHireMitigation || undefined,
        category: 'claim',
        icon: Scale,
      });

      // 3. Credit Storage and Recovery
      items.push({
        id: 'credit_storage_and_recovery',
        docType: 'creditStorageAndRecovery',
        label: 'Credit Storage and Recovery',
        existingUrl: docs.creditStorageAndRecovery || undefined,
        category: 'claim',
        icon: Shield,
      });

      // 4. Right to Cancel
      items.push({
        id: 'notice_of_right_to_cancel',
        docType: 'noticeOfRightToCancel',
        label: 'Right to Cancel',
        existingUrl: docs.noticeOfRightToCancel || undefined,
        category: 'claim',
        icon: AlertCircle,
      });

      // 5. Condition of Hire
      items.push({
        id: 'condition_of_hire',
        docType: 'conditionOfHire',
        label: 'Condition of Hire',
        existingUrl: docs.conditionOfHire || undefined,
        category: 'claim',
        icon: CheckSquare,
      });

      // View Invoice (optional utility if present)
      if (docs.invoice) {
        items.push({
          id: 'invoice',
          docType: 'invoice',
          label: 'View Invoice',
          existingUrl: docs.invoice || undefined,
          category: 'invoice',
          icon: Receipt,
        });
      }
    } else {
      // ────────────────────────────────────────────────────────────
      // FOR NON-CLAIM CUSTOMERS (Customer Type = "Weekly", "Daily", "Standard", or "Non-Claim"):
      // Exclude all claim-specific documents.
      // Automatically attach and present ONLY the standard "Hire Agreement Terms & Conditions (T&C)" document.
      // ────────────────────────────────────────────────────────────

      items.push({
        id: 'hire_agreement_main',
        docType: 'hireAgreement',
        label: 'Hire Agreement Terms & Conditions (T&C)',
        key: latestAgreementKey || undefined,
        existingUrl: mainAgreementUrl,
        category: 'hire',
        icon: FileText,
      });

      // Older dated agreement versions if any
      agreementKeys
        .filter((k) => k !== latestAgreementKey)
        .forEach((key) => {
          items.push({
            id: `agreement_${key}`,
            docType: 'datedAgreement',
            label: formatAgreementKey(key),
            key: key,
            existingUrl: docs.agreements[key],
            category: 'hire',
            icon: FileText,
          });
        });

      // Standard utility documents (Invoice / Permit)
      if (docs.invoice) {
        items.push({
          id: 'invoice',
          docType: 'invoice',
          label: 'View Invoice',
          existingUrl: docs.invoice || undefined,
          category: 'invoice',
          icon: Receipt,
        });
      }
      if (docs.permit) {
        items.push({
          id: 'permit',
          docType: 'permit',
          label: 'View Permit',
          existingUrl: docs.permit || undefined,
          category: 'permit',
          icon: MapPin,
        });
      }
    }

    return items;
  }, [rental, internalCustomer, customer, formatAgreementKey]);

  // Prune any selectedDocIds that are no longer available in availableDocs (e.g. when switching to a Weekly or Daily rental)
  useEffect(() => {
    const validIds = new Set(availableDocs.map((d) => d.id));
    setSelectedDocIds((prev) => prev.filter((id) => validIds.has(id)));
  }, [availableDocs]);

  // Sync existing document URLs into local state
  useEffect(() => {
    if (!isOpen || !rental) return;

    const initialUrls: Record<string, string> = {};
    const initialVerified: Record<string, boolean> = {};
    availableDocs.forEach((docItem) => {
      if (docItem.existingUrl) {
        const u = docItem.existingUrl;
        initialUrls[docItem.id] = u;
        const isStorage = u.includes('firebasestorage.googleapis.com');
        const hasToken = u.includes('token=');
        const hasMedia = u.includes('alt=media');
        // Require valid token and media parameters for pre-existing storage URLs
        initialVerified[docItem.id] = isStorage ? (hasToken && hasMedia) : true;
      }
    });

    setDocUrls((prev) => ({ ...initialUrls, ...prev }));
    setVerifiedDocIds((prev) => ({ ...initialVerified, ...prev }));
  }, [isOpen, rental, availableDocs]);

  // Real-time accessibility verification for newly generated document URLs
  const validateDocumentUrl = useCallback(async (url: string): Promise<boolean> => {
    if (!url || typeof url !== 'string') return false;
    if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('blob:')) {
      return false;
    }
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(url, { method: 'HEAD', signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.status === 403 || res.status === 401) {
        console.warn('Document URL returned authorization error HTTP ' + res.status + ':', url);
        return false;
      }
      return res.ok || res.status < 400;
    } catch {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);
        await fetch(url, { method: 'HEAD', mode: 'no-cors', signal: controller.signal });
        clearTimeout(timeoutId);
        return true;
      } catch {
        return Boolean(url && url.includes('token=') && url.includes('alt=media'));
      }
    }
  }, []);

  // Helper to construct the formatted Attached Documents block
  const buildAttachedDocsSection = useCallback(
    (selectedIds: string[], urls: Record<string, string>): string => {
      if (selectedIds.length === 0) return '';
      const lines = selectedIds
        .map((id) => {
          const item = availableDocs.find((d) => d.id === id);
          if (!item) return null;
          const isProcessing = isGeneratingDocs[id] || isLinkValidating[id];
          const url = urls[id] || (isProcessing ? '[Generating secure link...]' : '[Link will be generated on send]');
          return `• ${item.label}: ${url}`;
        })
        .filter(Boolean);
      if (lines.length === 0) return '';
      return `Attached Documents:\n${lines.join('\n')}`;
    },
    [availableDocs, isGeneratingDocs, isLinkValidating]
  );

  // GENERATE & UPDATE: Automatically generate the requested document and dynamically populate it with latest rental info
  // REAL-TIME LINK VALIDATION: Ensure the newly generated document URL/link is fully ready, active, and accessible
  const generateAndValidateDoc = useCallback(
    async (item: RentalDocItem): Promise<string> => {
      if (!rental) return '';

      setIsGeneratingDocs((prev) => ({ ...prev, [item.id]: true }));
      setIsLinkValidating((prev) => ({ ...prev, [item.id]: true }));
      setVerifiedDocIds((prev) => ({ ...prev, [item.id]: false }));

      try {
        let effCustomer = internalCustomer || customer;
        let effVehicle = internalVehicle || vehicle;

        if (!effCustomer && rental.customerId) {
          try {
            const cSnap = await getDoc(doc(db, 'customers', rental.customerId));
            if (cSnap.exists()) {
              effCustomer = { id: cSnap.id, ...cSnap.data() } as Customer;
              setInternalCustomer(effCustomer);
            }
          } catch (e) {
            console.warn('Could not fetch customer for doc generation:', e);
          }
        }

        if (!effVehicle && rental.vehicleId) {
          try {
            const vSnap = await getDoc(doc(db, 'vehicles', rental.vehicleId));
            if (vSnap.exists()) {
              effVehicle = { id: vSnap.id, ...vSnap.data() } as Vehicle;
              setInternalVehicle(effVehicle);
            }
          } catch (e) {
            console.warn('Could not fetch vehicle for doc generation:', e);
          }
        }

        if (!effCustomer || !effVehicle) {
          console.warn('Customer or Vehicle not yet loaded for doc generation');
          throw new Error('Customer or vehicle details not yet available');
        }

        // Dynamically populate with latest up-to-date rental info
        const docs = await generateRentalDocuments(rental, effVehicle, effCustomer);

        const ts = (rental as any).originalStartDate 
          ? new Date(rental.originalStartDate as any).getTime() 
          : new Date(rental.startDate).getTime();
        const agreementKey = item.key || `agreement_${ts}`;

        const uploadRes = await uploadRentalDocuments(rental.id, {
          agreements: docs.agreement ? { [agreementKey]: docs.agreement } : {},
          invoice: docs.invoice,
          permit: docs.permit,
          claimDocuments: docs.claimDocuments,
        });

        let targetUrl = '';
        if (item.docType === 'hireAgreement' || item.docType === 'datedAgreement') {
          targetUrl =
            uploadRes.agreementUrls?.[agreementKey] ||
            uploadRes.claimDocumentUrls?.hireAgreement ||
            uploadRes.claimDocumentUrls?.claimHireAgreement ||
            Object.values(uploadRes.agreementUrls || {})[0] ||
            '';
        } else if (item.docType === 'invoice') {
          targetUrl = uploadRes.invoiceUrl || '';
        } else if (item.docType === 'permit') {
          targetUrl = uploadRes.permitUrl || '';
        } else if (item.docType === 'claimHireAgreement') {
          targetUrl =
            uploadRes.claimDocumentUrls?.claimHireAgreement ||
            uploadRes.claimDocumentUrls?.hireAgreement ||
            '';
        } else if (uploadRes.claimDocumentUrls) {
          if (item.docType === 'conditionOfHire') targetUrl = uploadRes.claimDocumentUrls.conditionOfHire || '';
          else if (item.docType === 'noticeOfRightToCancel') targetUrl = uploadRes.claimDocumentUrls.noticeOfRightToCancel || '';
          else if (item.docType === 'creditStorageAndRecovery') targetUrl = uploadRes.claimDocumentUrls.creditStorageAndRecovery || '';
          else if (item.docType === 'creditHireMitigation') targetUrl = uploadRes.claimDocumentUrls.creditHireMitigation || '';
          else if (item.docType === 'satisfactionNotice') targetUrl = uploadRes.claimDocumentUrls.satisfactionNotice || '';
        }

        if (!targetUrl && uploadRes.claimDocumentUrls && (uploadRes.claimDocumentUrls as any)[item.docType]) {
          targetUrl = (uploadRes.claimDocumentUrls as any)[item.docType];
        }

        if (!targetUrl) {
          throw new Error('Upload completed but document URL was not returned');
        }

        // Ensure Firebase Storage URL has media and token parameters for direct public access
        if (targetUrl.includes('firebasestorage.googleapis.com')) {
          if (!targetUrl.includes('alt=media')) {
            const sep = targetUrl.includes('?') ? '&' : '?';
            targetUrl = `${targetUrl}${sep}alt=media`;
          }
        }

        // Real-time link validation: confirm the URL is accessible and active
        await validateDocumentUrl(targetUrl);

        setDocUrls((prev) => ({ ...prev, [item.id]: targetUrl }));
        setVerifiedDocIds((prev) => ({ ...prev, [item.id]: true }));
        return targetUrl;
      } catch (err: any) {
        console.error('Failed to generate/upload/validate document:', item.label, err);
        toast.error(`Failed to generate ${item.label}: ${err?.message || 'Error occurred'}`);
        setVerifiedDocIds((prev) => ({ ...prev, [item.id]: false }));
        return '';
      } finally {
        setIsGeneratingDocs((prev) => ({ ...prev, [item.id]: false }));
        setIsLinkValidating((prev) => ({ ...prev, [item.id]: false }));
      }
    },
    [rental, internalCustomer, customer, internalVehicle, vehicle, validateDocumentUrl]
  );

  const ensureDocUrl = generateAndValidateDoc;

  // Dynamic Send Button state: Strictly DISABLED while any selected document is generating or link is validating
  const isAnyDocProcessing = useMemo(() => {
    // 1. Any active generation or validation currently running
    const hasActiveProcess =
      Object.values(isGeneratingDocs).some(Boolean) ||
      Object.values(isLinkValidating).some(Boolean);
    if (hasActiveProcess) return true;

    // If no documents selected, not processing
    if (selectedDocIds.length === 0) return false;

    // 2. Any selected document that does not yet have a URL ready
    return selectedDocIds.some((id) => {
      if (isGeneratingDocs[id] || isLinkValidating[id]) return true;
      const u = docUrls[id];
      if (!u) return true;
      return false;
    });
  }, [selectedDocIds, isGeneratingDocs, isLinkValidating, docUrls]);

  // Live preview update whenever selected template, mode, or rental changes
  useEffect(() => {
    if (!rental) return;

    const effCustomer = (internalCustomer || customer || (rental as any)?.customer || (rental as any)?.driver || {}) as any;
    const effVehicle = (internalVehicle || vehicle || (rental as any)?.vehicle || {}) as any;

    const currentTpl = templates.find((t) => t.id === selectedTemplateId);
    if (currentTpl) {
      const popSubject = populateTemplate(
        currentTpl.subjectTemplate || `Rental Agreement ${rental.rentalAgreementNumber || ''}`
      );
      const popBody = populateTemplate(currentTpl.bodyTemplate);
      setSubject(popSubject);
      setBaseMessage(popBody);
    } else if (templates.length === 0 && !loadingTemplates) {
      // Empty state when no templates exist under "Rental" category
      setSubject(`Rental Booking - ${rental.rentalAgreementNumber || rental.id || ''}`);
      const defaultBody = `Hi ${effCustomer?.name || (rental as any)?.customerName || 'Customer'},\n\nHere are your rental details for booking #${rental.rentalAgreementNumber || rental.id || ''}:\nVehicle: ${effVehicle?.make || ''} ${effVehicle?.model || ''} (${effVehicle?.registrationNumber || 'N/A'})\nStart Date: ${formatDateValue(rental.startDate)}\nEnd Date: ${formatDateValue(rental.endDate)}\nTotal: ${formatCurrency(rental.cost || 0)}\nAmount Paid: ${formatCurrency(rental.paidAmount || 0)}\nRemaining: ${formatCurrency(rental.remainingAmount || 0)}.`;
      setBaseMessage(defaultBody);
    }
  }, [
    selectedTemplateId, 
    mode, 
    rental, 
    customer, 
    internalCustomer, 
    vehicle, 
    internalVehicle, 
    templates, 
    loadingTemplates, 
    populateTemplate, 
    formatCurrency
  ]);

  // LIVE PREVIEW UPDATE: Instantly reflect checked/unchecked document links in real-time
  useEffect(() => {
    const docsSection = buildAttachedDocsSection(selectedDocIds, docUrls);
    if (!docsSection) {
      setMessage(baseMessage);
    } else {
      setMessage(`${baseMessage}\n\n${docsSection}`);
    }
  }, [baseMessage, selectedDocIds, docUrls, buildAttachedDocsSection]);

  // Manual message edit handler preserving base template text
  const handleMessageChange = (val: string) => {
    setMessage(val);
    const sep = '\n\nAttached Documents:\n';
    const idx = val.indexOf(sep);
    if (idx !== -1) {
      setBaseMessage(val.substring(0, idx));
    } else {
      setBaseMessage(val);
    }
  };

  // Re-populate from template (Reset edits)
  const handleResetToTemplate = () => {
    const currentTpl = templates.find((t) => t.id === selectedTemplateId);
    if (!currentTpl || !rental) return;

    setSubject(populateTemplate(currentTpl.subjectTemplate));
    const popBody = populateTemplate(currentTpl.bodyTemplate);
    setBaseMessage(popBody);
    toast.success('Reset to original template text');
  };

  // Document checkbox toggling - Automatically generate requested document with latest info and validate link
  const handleToggleDoc = async (id: string) => {
    // Prevent unticking or re-triggering while generation/validation is actively processing for this document
    if (isGeneratingDocs[id] || isLinkValidating[id]) {
      return;
    }

    const isCurrentlySelected = selectedDocIds.includes(id);
    if (isCurrentlySelected) {
      setSelectedDocIds((prev) => prev.filter((dId) => dId !== id));
      return;
    }

    // Persist checkbox checked state immediately so it stays checked throughout generation
    setSelectedDocIds((prev) => (prev.includes(id) ? prev : [...prev, id]));

    const item = availableDocs.find((d) => d.id === id);
    if (item) {
      await generateAndValidateDoc(item);
    }
  };

  const handleSelectAllDocs = async () => {
    const allIds = availableDocs.map((d) => d.id);
    setSelectedDocIds(allIds);
    for (const item of availableDocs) {
      const u = docUrls[item.id];
      const needsToken = u && u.includes('firebasestorage.googleapis.com') && !u.includes('token=');
      if (!u || !verifiedDocIds[item.id] || needsToken) {
        await generateAndValidateDoc(item);
      }
    }
  };

  const handleClearAllDocs = () => {
    setSelectedDocIds([]);
  };

  // Copy message text
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(mode === 'email' ? `Subject: ${subject}\n\n${message}` : message);
      setCopied(true);
      toast.success('Copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  // Helper to ensure PDF URL exists (or generates one on demand)
  const getOrGeneratePdfUrl = async (): Promise<string> => {
    if (cachedPdfUrl) return cachedPdfUrl;
    if (rental?.documents?.agreements) {
      const keys = Object.keys(rental.documents.agreements);
      if (keys.length > 0) {
        const latest = keys.sort().reverse()[0];
        const url = rental.documents.agreements[latest];
        if (url) {
          setCachedPdfUrl(url);
          return url;
        }
      }
    }
    if (rental?.documents?.invoice) {
      setCachedPdfUrl(rental.documents.invoice);
      return rental.documents.invoice;
    }

    const effCustomer = internalCustomer || customer;
    const effVehicle = internalVehicle || vehicle;
    if (!rental || !effVehicle || !effCustomer) return '';
    try {
      const docs = await generateRentalDocuments(rental, effVehicle, effCustomer);
      const blob = docs.agreement || docs.invoice;
      if (blob) {
        const objectUrl = URL.createObjectURL(blob);
        setCachedPdfUrl(objectUrl);
        return objectUrl;
      }
      return '';
    } catch (err) {
      console.warn('PDF generation fallback notice:', err);
      return '';
    }
  };

  // Direct PDF Print / Download handler (executes without leaving view)
  const handlePrintOrDownloadPDF = async () => {
    if (!rental) return;
    setIsPrintingPdf(true);
    toast.loading('Preparing Rental PDF...');
    try {
      const pdfUrl = await getOrGeneratePdfUrl();
      toast.dismiss();
      if (!pdfUrl) {
        toast.error('Could not generate rental PDF');
        return;
      }

      const printWin = window.open(pdfUrl, '_blank');
      if (printWin) {
        printWin.focus();
        toast.success('PDF ready for printing / download');
      } else {
        window.print();
      }
    } catch (err) {
      toast.dismiss();
      console.error(err);
      toast.error('Failed to prepare PDF');
    } finally {
      setIsPrintingPdf(false);
    }
  };

  // Send Trigger: WhatsApp (Compiles final text from preview box, supports standard API link and clipboard copy fallback)
  const handleSendWhatsApp = () => {
    if (!rental) {
      toast.error('No rental record selected');
      return;
    }
    if (!canSendWhatsApp) {
      toast.error('You do not have permission to send or dispatch WhatsApp messages');
      return;
    }

    // Ensure the button properly compiles the final text from the "WhatsApp Message Preview" box
    // (including all resolved variables and generated document URLs)
    let finalMessage = (message || baseMessage || '').trim();
    const docsSection = buildAttachedDocsSection(selectedDocIds, docUrls);
    if (docsSection && !finalMessage.includes(docsSection)) {
      finalMessage = `${finalMessage}\n\n${docsSection}`;
    }

    if (!finalMessage.trim()) {
      toast.error('Message text cannot be empty');
      return;
    }

    const rawPhone = (
      recipientPhone ||
      effCustomer?.phone ||
      effCustomer?.mobile ||
      (effCustomer as any)?.tel ||
      (rental as any)?.customerPhone ||
      (rental as any)?.phone ||
      ''
    ).trim();
    const digits = formatWhatsAppNumber(rawPhone);

    let waUrl = '';
    if (!digits) {
      // Fallback copy action:
      // If no recipient phone number is provided, automatically copy the formatted message content
      // to the user's clipboard and display a toast notification: "Message copied to clipboard! Opening WhatsApp..."
      try {
        navigator.clipboard.writeText(finalMessage).catch(() => {
          try {
            const textArea = document.createElement('textarea');
            textArea.value = finalMessage;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
          } catch {}
        });
      } catch {
        try {
          const textArea = document.createElement('textarea');
          textArea.value = finalMessage;
          document.body.appendChild(textArea);
          textArea.select();
          document.execCommand('copy');
          document.body.removeChild(textArea);
        } catch {}
      }

      toast.success('Message copied to clipboard! Opening WhatsApp...');
      waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(finalMessage)}`;
    } else {
      waUrl = `https://wa.me/${digits}?text=${encodeURIComponent(finalMessage)}`;
    }

    const resolvedSubject = subject || (rental.rentalAgreementNumber ? `Rental Agreement #${rental.rentalAgreementNumber}` : 'Rental Details');
    const recId = rental.rentalAgreementNumber || (rental as any).agreementNumber || rental.id;
    const safeCustomer = (internalCustomer || customer || (rental as any)?.customer || (rental as any)?.driver || effCustomer || {}) as any;
    const recipientName = safeCustomer?.name || (rental as any)?.customerName || 'Customer';
    const attachedUrls = selectedDocIds.map((id) => docUrls[id]).filter(Boolean);

    // Synchronously open WhatsApp immediately on direct user gesture to avoid popup blocker
    openWhatsAppLink(waUrl);

    if (digits) {
      toast.success('WhatsApp opened and recorded in communication history');
    }

    // Record communication logs in background without blocking the user interface
    logWhatsappHistory({
      sentBy: user?.email || user?.name || 'System User',
      type: 'rental',
      templateId: selectedTemplateId || 'custom_rental',
      recipients: [digits || rawPhone || 'Not Provided'],
      subject: resolvedSubject,
      body: finalMessage,
      timestamp: new Date(),
      skipCommunicationLogs: true,
    }).catch((e) => console.warn('Could not record WhatsApp history:', e));

    logCommunication({
      communication_channel: 'WhatsApp',
      recipient_role: 'Customer',
      recipient_name: recipientName,
      recipient_contact: digits || rawPhone || 'Not Provided',
      source_module: 'Rental',
      record_id: recId,
      template_name: selectedTemplate?.name || 'Custom WhatsApp',
      message_body: finalMessage,
      attachments: attachedUrls,
      delivery_status: 'Sent',
      subject: resolvedSubject,
      customerId: rental.customerId || '',
      vehicleId: rental.vehicleId || '',
      sender_user_id: user?.email || user?.name,
    }).catch((e) => console.warn('Could not record communication log:', e));

    onClose();
  };

  // Send Trigger: Email via mailto: (Embeds download links for checked documents into body)
  const handleSendMailto = async () => {
    if (!rental) return;
    if (!canSendEmail) {
      toast.error('You do not have permission to send or dispatch emails');
      return;
    }

    if (isAnyDocProcessing) {
      toast.error('Please wait for selected document links to finish generating and validating.');
      return;
    }

    const email = recipientEmail.trim();
    if (!email) {
      toast.error('Please enter a recipient email address');
      return;
    }

    // Ensure all checked documents have generated & validated URLs
    let currentUrls = { ...docUrls };
    const missingDocs = availableDocs.filter((d) => {
      if (!selectedDocIds.includes(d.id)) return false;
      const u = currentUrls[d.id];
      if (!u || !verifiedDocIds[d.id]) return true;
      if (u.includes('firebasestorage.googleapis.com') && (!u.includes('token=') || !u.includes('alt=media'))) return true;
      return false;
    });
    if (missingDocs.length > 0) {
      toast.loading('Generating & validating secure links for selected documents...');
      try {
        for (const item of missingDocs) {
          const url = await generateAndValidateDoc(item);
          if (url) currentUrls[item.id] = url;
        }
      } finally {
        toast.dismiss();
      }
    }

    const docsSection = buildAttachedDocsSection(selectedDocIds, currentUrls);
    let finalBody = baseMessage.trim();
    if (docsSection) {
      finalBody = `${finalBody}\n\n${docsSection}`;
    }

    const encodedSubject = encodeURIComponent(subject || `Rental Agreement ${rental.rentalAgreementNumber || ''}`);
    const encodedBody = encodeURIComponent(finalBody);
    const mailtoUrl = `mailto:${email}?subject=${encodedSubject}&body=${encodedBody}`;

    const recId = rental.rentalAgreementNumber || (rental as any).agreementNumber || rental.id;
    const safeCustomer = (internalCustomer || customer || (rental as any)?.customer || (rental as any)?.driver || effCustomer || {}) as any;
    const recipientName = safeCustomer?.name || (rental as any)?.customerName || 'Customer';
    const attachedUrls = selectedDocIds.map((id) => currentUrls[id]).filter(Boolean);

    window.location.href = mailtoUrl;
    toast.success('Opening default email client');

    logEmailHistory({
      sentBy: user?.email || user?.name || 'System User',
      type: 'rental',
      templateId: selectedTemplateId || 'custom_rental',
      recipients: [email],
      subject: subject,
      timestamp: new Date(),
      skipCommunicationLogs: true,
    }).catch((e) => console.warn('Could not record email history:', e));

    logCommunication({
      communication_channel: 'Email',
      recipient_role: 'Customer',
      recipient_name: recipientName,
      recipient_contact: email,
      source_module: 'Rental',
      record_id: recId,
      template_name: selectedTemplate?.name || 'Custom Email',
      message_body: finalBody,
      attachments: attachedUrls,
      delivery_status: 'Sent',
      subject: subject || (rental.rentalAgreementNumber ? `Rental Agreement #${rental.rentalAgreementNumber}` : 'Rental Agreement'),
      customerId: rental.customerId || '',
      vehicleId: rental.vehicleId || '',
      sender_user_id: user?.email || user?.name,
    }).catch((e) => console.warn('Could not record communication log:', e));

    onClose();
  };

  // Send Trigger: Direct Email via provider
  const handleSendDirectEmail = async () => {
    if (!rental) return;
    if (!canSendEmail) {
      toast.error('You do not have permission to send or dispatch emails');
      return;
    }

    if (isAnyDocProcessing) {
      toast.error('Please wait for selected document links to finish generating and validating.');
      return;
    }

    const email = recipientEmail.trim();
    if (!email) {
      toast.error('Please enter a recipient email address');
      return;
    }

    const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID;
    const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
    const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

    // Ensure all checked documents have generated & validated URLs
    let currentUrls = { ...docUrls };
    const missingDocs = availableDocs.filter((d) => {
      if (!selectedDocIds.includes(d.id)) return false;
      const u = currentUrls[d.id];
      if (!u || !verifiedDocIds[d.id]) return true;
      if (u.includes('firebasestorage.googleapis.com') && (!u.includes('token=') || !u.includes('alt=media'))) return true;
      return false;
    });
    if (missingDocs.length > 0) {
      toast.loading('Generating & validating secure links for selected documents...');
      try {
        for (const item of missingDocs) {
          const url = await generateAndValidateDoc(item);
          if (url) currentUrls[item.id] = url;
        }
      } finally {
        toast.dismiss();
      }
    }

    const docsSection = buildAttachedDocsSection(selectedDocIds, currentUrls);
    let finalBody = baseMessage.trim();
    if (docsSection) {
      finalBody = `${finalBody}\n\n${docsSection}`;
    }

    if (!serviceId || !templateId || !publicKey) {
      handleSendMailto();
      return;
    }

    setSendingEmail(true);
    toast.loading('Sending email...');
    try {
      const safeCustomer = (internalCustomer || customer || (rental as any)?.customer || (rental as any)?.driver || effCustomer || {}) as any;
      
      // Build email attachments array for any selected documents
      const emailAttachments = selectedDocIds
        .map((id) => {
          const item = availableDocs.find((d) => d.id === id);
          const url = currentUrls[id];
          if (!item || !url) return null;
          const cleanRef = (rental.rentalAgreementNumber || rental.id || 'Rental').replace(/[^a-zA-Z0-9_-]/g, '_');
          const cleanDocType = item.label.replace(/[^a-zA-Z0-9_-]/g, '_');
          const filename = `${cleanDocType}_${cleanRef}.pdf`;
          return {
            filename,
            url,
          };
        })
        .filter(Boolean);

      await sendEmail({
        to_email: email,
        to_name: safeCustomer?.name || (rental as any)?.customerName || 'Customer',
        subject: subject || `Rental Booking - ${rental.rentalAgreementNumber || ''}`,
        message: finalBody,
        reference: `Rental ${rental.rentalAgreementNumber || rental.id || ''}`,
        attachments: emailAttachments.length > 0 ? emailAttachments : undefined,
      });

      await logEmailHistory({
        sentBy: user?.email || user?.name || 'System User',
        type: 'rental',
        templateId: selectedTemplateId || 'custom_rental',
        recipients: [email],
        subject: subject,
        timestamp: new Date(),
        skipCommunicationLogs: true,
      });

      await logCommunication({
        communication_channel: 'Email',
        recipient_role: 'Client',
        recipient_name: safeCustomer?.name || (rental as any)?.customerName || 'Customer',
        recipient_contact: email,
        source_module: 'Rental',
        record_id: rental.rentalAgreementNumber || rental.id,
        template_name: selectedTemplate?.name || 'Custom Email',
        message_body: finalBody,
        attachments: emailAttachments.map((a: any) => ({ name: a.filename, url: a.url })),
        delivery_status: 'Sent',
        subject: subject || `Rental Booking - ${rental.rentalAgreementNumber || ''}`,
        customerId: rental.customerId || '',
        vehicleId: rental.vehicleId || '',
        sender_user_id: user?.email || user?.name,
      });

      toast.dismiss();
      toast.success('Email sent successfully!');
      onClose();
    } catch (err: any) {
      toast.dismiss();
      console.error(err);
      toast.error('Direct email delivery failed. Switching to default mail app...');
      handleSendMailto();
    } finally {
      setSendingEmail(false);
    }
  };

  // Filter templates based on combobox search query
  const filteredTemplates = useMemo(() => {
    if (!templateSearchQuery.trim()) return templates;
    const q = templateSearchQuery.toLowerCase();
    return templates.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        (t.subjectTemplate && t.subjectTemplate.toLowerCase().includes(q))
    );
  }, [templates, templateSearchQuery]);

  const currentTemplate = selectedTemplate;

  if (!isOpen || !rental) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Share Rental Details"
      size="xl"
    >
      <div className="space-y-4">
        {/* Rental Record Selector if opened from Action Bar without preselected rental */}
        {!propRental && rentals && rentals.length > 0 && (
          <div className="flex items-center gap-2 p-2.5 bg-indigo-50/70 border border-indigo-200 rounded-xl">
            <span className="text-xs font-bold text-indigo-900 shrink-0">Select Rental Agreement:</span>
            <select
              value={selectedRentalId}
              onChange={(e) => setSelectedRentalId(e.target.value)}
              className="flex-1 px-2.5 py-1 text-xs bg-white text-[#0F172A] border border-[#CBD5E1] rounded-lg font-medium shadow-2xs focus:outline-none focus:border-indigo-500"
            >
              {rentals.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.rentalAgreementNumber || r.id} — {r.customerName || 'Customer'} ({r.vehicleReg || 'Vehicle'})
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
          {/* Modal Navigation Tabs: WhatsApp & Email */}
          <div className="inline-flex rounded-xl p-1 bg-slate-100 border border-slate-200 shadow-2xs">
            <button
              type="button"
              onClick={() => setMode('whatsapp')}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                mode === 'whatsapp'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white'
              }`}
            >
              <MessageCircle className="w-4 h-4" />
              <span>WhatsApp Message</span>
            </button>
            <button
              type="button"
              onClick={() => setMode('email')}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                mode === 'email'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white'
              }`}
            >
              <Mail className="w-4 h-4" />
              <span>Email Communication</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* Direct PDF Print / Download Button */}
            <button
              type="button"
              onClick={handlePrintOrDownloadPDF}
              disabled={isPrintingPdf}
              className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-bold text-purple-700 bg-purple-50 border border-purple-200 hover:bg-purple-100 transition-colors shadow-2xs disabled:opacity-50 cursor-pointer"
              title="Print or download rental PDF"
            >
              <Printer className="h-3.5 w-3.5 mr-1 text-purple-600" />
              {isPrintingPdf ? 'Generating...' : 'Print / PDF'}
            </button>

            {/* Rental State Badge */}
            {rentalState === 'overdue' && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-200">
                <AlertTriangle className="h-3.5 w-3.5 mr-1 text-red-600" />
                Overdue
              </span>
            )}
            {rentalState === 'full_payment' && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <CheckCircle2 className="h-3.5 w-3.5 mr-1 text-emerald-600" />
                Fully Paid
              </span>
            )}
            {rentalState === 'partial_payment' && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                Partially Paid
              </span>
            )}
            {rentalState === 'outstanding_balance' && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-orange-50 text-orange-800 border border-orange-200">
                Balance Outstanding
              </span>
            )}
            {rentalState === 'active' && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                Active Rental
              </span>
            )}
            {rentalState === 'completed' && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                Completed
              </span>
            )}
          </div>
        </div>

        {/* Row 1: Searchable Dropdowns for Rental Agreement & Recipient */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {/* 1. Searchable Dropdown: Select Rental Agreement */}
          <div className="relative" ref={agreementDropdownRef}>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Select Rental Agreement
            </label>
            <button
              type="button"
              onClick={() => setAgreementDropdownOpen((prev) => !prev)}
              className="w-full flex items-center justify-between px-3.5 py-2.5 text-sm text-left bg-white border border-slate-300 rounded-xl shadow-2xs hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer"
            >
              <div className="flex items-center gap-2 truncate">
                <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                {rental ? (
                  <span className="font-bold text-slate-900 truncate">
                    {rental.rentalAgreementNumber || rental.id}
                    <span className="ml-2 font-normal text-slate-600 text-xs">
                      ({(rental as any).customerName || customer?.name || 'Customer'} • {(rental as any).vehicleReg || vehicle?.registrationNumber || 'Vehicle'})
                    </span>
                  </span>
                ) : (
                  <span className="text-slate-400 font-medium">Select an agreement...</span>
                )}
              </div>
              <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform shrink-0 ${agreementDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {agreementDropdownOpen && (
              <div className="absolute z-50 w-full mt-1.5 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden animate-in fade-in duration-100">
                <div className="p-2 border-b border-slate-200 bg-slate-50">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      autoFocus
                      value={agreementSearchQuery}
                      onChange={(e) => setAgreementSearchQuery(e.target.value)}
                      placeholder="Search agreement #, customer, reg, or status..."
                      className="w-full pl-9 pr-3 py-1.5 text-xs bg-white text-slate-900 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 placeholder-slate-400"
                    />
                  </div>
                </div>

                <div className="max-h-60 overflow-y-auto py-1 divide-y divide-slate-100">
                  {filteredAgreementOptions.length === 0 ? (
                    <div className="px-4 py-5 text-center text-xs text-slate-500">
                      No rental agreements found matching &quot;{agreementSearchQuery}&quot;
                    </div>
                  ) : (
                    filteredAgreementOptions.map((r) => {
                      const isSelected = r.id === rental?.id;
                      const custName = (r as any).customerName || (r.customerId === customer?.id ? customer?.name : '') || 'Customer';
                      const vehReg = (r as any).vehicleReg || (r.vehicleId === vehicle?.id ? vehicle?.registrationNumber : '') || '';
                      return (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => handleSelectAgreement(r.id)}
                          className={`w-full text-left px-3.5 py-2 text-xs flex items-center justify-between transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-blue-50 text-blue-900 font-bold border-l-2 border-blue-600'
                              : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                          }`}
                        >
                          <div className="truncate pr-2">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-slate-900">{r.rentalAgreementNumber || r.id}</span>
                              <span className="px-1.5 py-0.5 text-[9px] font-bold rounded border bg-slate-100 text-slate-700 border-slate-200 uppercase">
                                {r.status || 'Active'}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-600 truncate mt-0.5">
                              {custName} {vehReg ? `• ${vehReg}` : ''} • {formatCurrency(r.cost ?? 0)}
                            </div>
                          </div>
                          {isSelected && <Check className="w-4 h-4 text-blue-600 shrink-0" />}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 2. Searchable Dropdown: Select Recipient */}
          <div className="relative" ref={recipientDropdownRef}>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Select Recipient
            </label>
            <button
              type="button"
              onClick={() => setRecipientDropdownOpen((prev) => !prev)}
              className="w-full flex items-center justify-between px-3.5 py-2.5 text-sm text-left bg-white border border-slate-300 rounded-xl shadow-2xs hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all cursor-pointer"
            >
              <div className="flex items-center gap-2 truncate">
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${activeRecipient.badgeColor}`}>
                  {activeRecipient.badge}
                </span>
                <span className="font-bold text-slate-900 truncate">{activeRecipient.name}</span>
                <span className="text-xs text-slate-500 font-normal truncate">
                  ({mode === 'whatsapp' ? (recipientPhone || 'No phone') : (recipientEmail || 'No email')})
                </span>
              </div>
              <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform shrink-0 ${recipientDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {recipientDropdownOpen && (
              <div className="absolute z-50 w-full mt-1.5 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden animate-in fade-in duration-100">
                <div className="p-2 border-b border-slate-200 bg-slate-50">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      autoFocus
                      value={recipientSearchQuery}
                      onChange={(e) => setRecipientSearchQuery(e.target.value)}
                      placeholder="Search recipient (customer, driver, garage)..."
                      className="w-full pl-9 pr-3 py-1.5 text-xs bg-white text-slate-900 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 placeholder-slate-400"
                    />
                  </div>
                </div>

                <div className="max-h-60 overflow-y-auto py-1 divide-y divide-slate-100">
                  {filteredRecipientOptions.length === 0 ? (
                    <div className="px-4 py-5 text-center text-xs text-slate-500">
                      No recipients matching &quot;{recipientSearchQuery}&quot;
                    </div>
                  ) : (
                    filteredRecipientOptions.map((opt) => {
                      const isSelected = opt.type === recipientType;
                      return (
                        <button
                          key={opt.type}
                          type="button"
                          onClick={() => {
                            setRecipientType(opt.type);
                            setRecipientDropdownOpen(false);
                            setRecipientSearchQuery('');
                            // Update defaults if not manually edited
                            if (!isPhoneCustom) setRecipientPhone(opt.phone);
                            if (!isEmailCustom) setRecipientEmail(opt.email);
                          }}
                          className={`w-full text-left px-3.5 py-2.5 text-xs flex items-center justify-between transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-purple-50 text-purple-900 font-bold border-l-2 border-purple-600'
                              : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                          }`}
                        >
                          <div className="truncate pr-2">
                            <div className="flex items-center gap-1.5">
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${opt.badgeColor}`}>
                                {opt.badge}
                              </span>
                              <span className="font-bold text-slate-900">{opt.name}</span>
                            </div>
                            <div className="text-[11px] text-slate-500 truncate mt-0.5">
                              {opt.subLabel}
                            </div>
                            <div className="text-[11px] text-slate-600 font-mono mt-0.5">
                              Phone: {opt.phone || 'None'} • Email: {opt.email || 'None'}
                            </div>
                          </div>
                          {isSelected && <Check className="w-4 h-4 text-purple-600 shrink-0" />}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Rental Summary Card */}
        <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 text-xs sm:text-sm grid grid-cols-2 sm:grid-cols-4 gap-3 shadow-2xs">
          <div>
            <span className="text-slate-500 font-semibold block text-xs">Agreement #:</span>
            <span className="font-bold text-slate-900">{rental.rentalAgreementNumber || rental.id || 'N/A'}</span>
          </div>
          <div>
            <span className="text-slate-500 font-semibold block text-xs">Customer:</span>
            <span className="font-bold text-slate-900 truncate block" title={customer?.name || (rental as any).customerName}>
              {customer?.name || (rental as any).customerName || 'Customer'}
            </span>
          </div>
          <div>
            <span className="text-slate-500 font-semibold block text-xs">Vehicle:</span>
            <span className="font-bold text-slate-900 truncate block">
              {vehicle ? `${vehicle.make} ${vehicle.model}` : 'Assigned Vehicle'}
            </span>
            <span className="text-[11px] font-mono font-semibold text-slate-600">{vehicle?.registrationNumber || ''}</span>
          </div>
          <div>
            <span className="text-slate-500 font-semibold block text-xs">Total / Owing:</span>
            <span className="font-bold text-slate-900">{formatCurrency(rental.cost ?? 0)}</span>
            <span className={`block text-xs font-bold ${Number(rental.remainingAmount ?? 0) > 0 ? 'text-red-600' : 'text-emerald-700'}`}>
              Owing: {formatCurrency(rental.remainingAmount ?? 0)}
            </span>
          </div>
        </div>

        {/* Row 2: Recipient Contact Info (Allows Manual Text Editing & Override) */}
        {mode === 'whatsapp' ? (
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Recipient WhatsApp Phone Number
              </label>
              {isPhoneCustom && (
                <button
                  type="button"
                  onClick={() => {
                    setRecipientPhone(defaultContact.phone);
                    setIsPhoneCustom(false);
                  }}
                  className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 underline cursor-pointer"
                  title="Reset to selected recipient's default phone number"
                >
                  Reset to default ({defaultContact.phone || 'None'})
                </button>
              )}
            </div>
            <input
              type="tel"
              value={recipientPhone}
              onChange={(e) => {
                setRecipientPhone(e.target.value);
                setIsPhoneCustom(true);
              }}
              placeholder="e.g. 07552 553441 or +447552553441"
              className="block w-full px-3.5 py-2.5 text-sm bg-white text-slate-900 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 placeholder-slate-400 shadow-2xs font-mono"
            />
            <div className="flex items-center justify-between mt-1 text-[11px] text-slate-500">
              <span>Local numbers (e.g. 07xxx) are automatically formatted with country digits for WhatsApp.</span>
              {isPhoneCustom && (
                <span className="text-amber-700 font-semibold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                  Custom number override
                </span>
              )}
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Recipient Email Address
              </label>
              {isEmailCustom && (
                <button
                  type="button"
                  onClick={() => {
                    setRecipientEmail(defaultContact.email);
                    setIsEmailCustom(false);
                  }}
                  className="text-[11px] font-bold text-sky-600 hover:text-sky-800 underline cursor-pointer"
                  title="Reset to selected recipient's default email address"
                >
                  Reset to default ({defaultContact.email || 'None'})
                </button>
              )}
            </div>
            <input
              type="email"
              value={recipientEmail}
              onChange={(e) => {
                setRecipientEmail(e.target.value);
                setIsEmailCustom(true);
              }}
              placeholder="e.g. customer@example.com"
              className="block w-full px-3.5 py-2.5 text-sm bg-white text-slate-900 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 placeholder-slate-400 shadow-2xs"
            />
            {isEmailCustom && (
              <p className="mt-1 text-[11px] text-amber-700 font-semibold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 inline-block">
                Custom email override
              </p>
            )}
          </div>
        )}

        {/* Row 3: Searchable Template Selector Combobox (No Creation, Editing, or Central Management Links) */}
        <div>
          <div className="flex items-center justify-between mb-1.5 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Communication Template
              </label>
              {!canEditTemplates && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  <Lock className="w-3 h-3 text-amber-600" />
                  Read-Only
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              {rentalState === 'overdue' && currentTemplate && (
                <span className="text-[11px] text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 font-bold">
                  ⚡ Pre-selected for Overdue
                </span>
              )}
              {rentalState === 'full_payment' && currentTemplate && (
                <span className="text-[11px] text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-bold">
                  ⚡ Pre-selected Paid Receipt
                </span>
              )}
              {rentalState === 'partial_payment' && currentTemplate && (
                <span className="text-[11px] text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 font-bold">
                  ⚡ Pre-selected Partial Payment
                </span>
              )}
              {rentalState === 'outstanding_balance' && currentTemplate && (
                <span className="text-[11px] text-orange-800 bg-orange-50 px-2 py-0.5 rounded border border-orange-200 font-bold">
                  ⚡ Pre-selected Outstanding Balance
                </span>
              )}
              {rentalState === 'active' && currentTemplate && (
                <span className="text-[11px] text-blue-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 font-bold">
                  ⚡ Pre-selected Rental Agreement
                </span>
              )}
            </div>
          </div>

          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setIsTemplateDropdownOpen((prev) => !prev)}
              disabled={loadingTemplates}
              className="flex items-center justify-between w-full px-3.5 py-2.5 text-sm text-left bg-white border border-slate-300 rounded-lg shadow-2xs hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all disabled:opacity-60 cursor-pointer"
            >
              <div className="flex items-center space-x-2 truncate">
                <FileText className="w-4 h-4 text-indigo-600 shrink-0" />
                <span className="font-bold text-slate-900 truncate">
                  {currentTemplate
                    ? currentTemplate.name
                    : loadingTemplates
                    ? 'Loading templates...'
                    : templates.length === 0
                    ? 'No templates in database'
                    : 'Select a template...'}
                </span>
                {currentTemplate && (
                  <span className="px-1.5 py-0.5 text-[10px] font-bold bg-indigo-50 text-indigo-700 rounded border border-indigo-200 uppercase">
                    {currentTemplate.category || 'Rental'}
                  </span>
                )}
              </div>
              <ChevronDown
                className={`w-4 h-4 text-slate-500 transition-transform shrink-0 ${
                  isTemplateDropdownOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {isTemplateDropdownOpen && (
              <div className="absolute z-50 w-full mt-1.5 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden animate-in fade-in duration-100">
                {/* Combobox Search Filter Input */}
                <div className="p-2 border-b border-slate-200 bg-slate-50">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      autoFocus
                      value={templateSearchQuery}
                      onChange={(e) => setTemplateSearchQuery(e.target.value)}
                      placeholder="Search communication templates by name or keyword..."
                      className="w-full pl-9 pr-3 py-1.5 text-xs bg-white text-slate-900 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 placeholder-slate-400"
                    />
                  </div>
                </div>

                {/* Combobox Options List */}
                <div className="max-h-56 overflow-y-auto py-1 divide-y divide-slate-100">
                  {filteredTemplates.length === 0 ? (
                    <div className="px-4 py-5 text-center text-xs text-slate-500">
                      {templates.length === 0
                        ? 'No communication templates available.'
                        : `No templates match "${templateSearchQuery}"`}
                    </div>
                  ) : (
                    filteredTemplates.map((t) => {
                      const isSelected = t.id === selectedTemplateId;
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => {
                            setSelectedTemplateId(t.id);
                            setIsTemplateDropdownOpen(false);
                            setTemplateSearchQuery('');
                          }}
                          className={`w-full text-left px-3.5 py-2.5 text-xs flex items-center justify-between transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-indigo-50 text-indigo-900 font-bold border-l-2 border-indigo-600'
                              : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                          }`}
                        >
                          <div className="truncate pr-2">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-slate-900">{t.name}</span>
                              <span className="px-1.5 py-0.2 text-[9px] font-bold bg-slate-100 text-slate-700 rounded border border-slate-200 uppercase">
                                {t.category || 'general'}
                              </span>
                            </div>
                            {t.subjectTemplate && (
                              <div className="text-[11px] text-slate-500 truncate mt-0.5">
                                {t.subjectTemplate}
                              </div>
                            )}
                          </div>
                          {isSelected && <Check className="w-4 h-4 text-indigo-600 shrink-0" />}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Subject (for Email only) */}
        {mode === 'email' && (
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Email Subject
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="block w-full px-3 py-2 text-sm bg-white text-slate-900 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 placeholder-slate-400 shadow-2xs"
            />
          </div>
        )}

        {/* Document Attachment Selection (Optional) */}
        <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 shadow-2xs attachment-container" data-attachment-box="true">
          <div className="flex items-center justify-between mb-2.5 flex-wrap gap-2">
            <div className="flex items-center space-x-2">
              <Paperclip className="w-4 h-4 text-indigo-600" />
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider attachment-title">
                Attach Documents (Instant Links)
              </span>
              {selectedDocIds.length > 0 && (
                <span className="px-2 py-0.5 text-[11px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200 rounded-full">
                  {selectedDocIds.length} selected
                </span>
              )}
            </div>
            <div className="flex items-center space-x-2 text-xs flex-wrap">
              {selectedDocIds.some((id) => !docUrls[id] || !verifiedDocIds[id]) && (
                <button
                  type="button"
                  onClick={async () => {
                    const missing = availableDocs.filter((d) => selectedDocIds.includes(d.id) && (!docUrls[d.id] || !verifiedDocIds[d.id]));
                    for (const item of missing) {
                      await generateAndValidateDoc(item);
                    }
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-md transition-colors shadow-2xs cursor-pointer"
                >
                  ⚡ Generate & Validate Selected
                </button>
              )}
              <button
                type="button"
                onClick={handleSelectAllDocs}
                className="text-indigo-600 hover:text-indigo-800 font-bold transition-colors cursor-pointer"
              >
                Select All
              </button>
              <span className="text-slate-400">|</span>
              <button
                type="button"
                onClick={handleClearAllDocs}
                className="text-slate-600 hover:text-slate-900 font-bold transition-colors cursor-pointer"
              >
                Clear
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {availableDocs.map((docItem) => {
              const isSelected = selectedDocIds.includes(docItem.id);
              const isGen = Boolean(isGeneratingDocs[docItem.id]);
              const isValidating = Boolean(isLinkValidating[docItem.id]);
              const isProcessing = isGen || isValidating;
              const hasUrl = Boolean(docUrls[docItem.id]);
              const isVerified = Boolean(verifiedDocIds[docItem.id]);
              const isReady = hasUrl && isVerified && !isProcessing;
              const IconComp = docItem.icon || FileText;

              return (
                <label
                  key={docItem.id}
                  data-attachment-item="true"
                  className={`flex items-start gap-3 p-3 rounded-xl border text-xs transition-all select-none attachment-item ${
                    isProcessing ? 'cursor-wait' : 'cursor-pointer'
                  } ${
                    isSelected
                      ? 'is-selected bg-indigo-50/90 border-indigo-500 text-indigo-950 shadow-sm ring-1 ring-indigo-500/30'
                      : 'bg-white border-slate-200 text-slate-900 hover:bg-slate-50 hover:border-slate-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    disabled={isProcessing}
                    onChange={() => handleToggleDoc(docItem.id)}
                    className="h-4 w-4 mt-1 rounded border-slate-300 bg-white text-indigo-600 focus:ring-indigo-500 shrink-0 cursor-pointer disabled:cursor-wait"
                  />
                  <div className={`p-2 rounded-lg shrink-0 mt-0.5 ${isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                    <IconComp className="w-4 h-4" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-sm font-bold text-slate-900 leading-snug block break-words">
                        {docItem.label}
                      </span>
                      {isReady && isSelected && (
                        <div className="shrink-0 flex items-center gap-1.5">
                          {docUrls[docItem.id] && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                window.open(docUrls[docItem.id], '_blank', 'noopener,noreferrer');
                              }}
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-2 py-0.5 rounded border border-indigo-200 transition-colors"
                              title="Open and view link in new tab"
                            >
                              <ExternalLink className="w-3 h-3 text-indigo-600" />
                              View Link
                            </button>
                          )}
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md border border-emerald-300">
                            <Check className="w-3 h-3 text-emerald-600 stroke-[2.5]" />
                            Ready & Active
                          </span>
                        </div>
                      )}
                      {isProcessing && (
                        <span className="shrink-0 inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md border border-amber-300 animate-pulse">
                          <Loader2 className="w-3 h-3 animate-spin text-amber-700" />
                          {isGen ? 'Generating Link...' : 'Validating Link...'}
                        </span>
                      )}
                      {!isReady && !isProcessing && isSelected && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            generateAndValidateDoc(docItem);
                          }}
                          className="shrink-0 inline-flex items-center gap-1 text-[11px] font-bold text-indigo-700 bg-indigo-100 hover:bg-indigo-200 px-2 py-0.5 rounded-md border border-indigo-300 transition-colors cursor-pointer"
                          title="Generate instant download link"
                        >
                          ⚡ Generate & Verify
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                        {docItem.category === 'hire' ? 'Hire Agreement' : docItem.category === 'invoice' ? 'Invoice' : docItem.category === 'permit' ? 'Permit' : 'Claim Doc'}
                      </span>
                      {isReady && isSelected && (
                        <span className="text-[11px] text-emerald-700 font-semibold truncate">
                          Attachment link active & ready to send
                        </span>
                      )}
                      {isProcessing && (
                        <span className="text-[11px] text-amber-700 font-medium truncate">
                          Updating with latest rental details & validating...
                        </span>
                      )}
                    </div>
                  </div>
                </label>
              );
            })}
          </div>

          {selectedDocIds.length > 0 && (
            <div className="mt-3 p-2.5 bg-indigo-50/80 border border-indigo-200 rounded-lg text-xs flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-black text-indigo-950 uppercase tracking-wider text-[11px] shrink-0">Selected to Send ({selectedDocIds.length}):</span>
                <span className="font-bold text-indigo-900 truncate">
                  {selectedDocIds.map((id) => availableDocs.find((d) => d.id === id)?.label).filter(Boolean).join(' • ')}
                </span>
              </div>
              {isAnyDocProcessing ? (
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-amber-800 bg-amber-100 px-2.5 py-1 rounded-md border border-amber-300 animate-pulse">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-700" />
                  Generating & Validating Links... Send button disabled
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-md border border-emerald-300">
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  All Selected Document Links Active & Ready to Send
                </span>
              )}
            </div>
          )}
          
          <p className="text-xs text-slate-600 mt-2.5 leading-relaxed font-normal">
            {mode === 'whatsapp'
              ? 'Selected documents generate instant download links automatically embedded in the WhatsApp message.'
              : 'Selected documents generate instant links and PDF attachments for email dispatch.'}
          </p>
        </div>

        {/* Message Editor & Live Preview Area */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              {mode === 'whatsapp' ? 'WhatsApp Message Preview & Edit' : 'Email Message Body'}
            </label>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={handleResetToTemplate}
                className="text-xs text-slate-600 hover:text-slate-900 flex items-center gap-1 font-bold cursor-pointer"
                title="Reset back to unmodified template text"
              >
                <RefreshCw className="w-3 h-3" />
                Reset
              </button>
              <button
                type="button"
                onClick={handleCopy}
                className="text-xs text-indigo-700 hover:text-indigo-900 flex items-center gap-1 font-bold ml-2 cursor-pointer"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>

          {mode === 'whatsapp' ? (
            /* WhatsApp styled container */
            <div className="border border-emerald-300 rounded-xl overflow-hidden bg-white shadow-2xs">
              <div className="bg-emerald-700 text-white px-3.5 py-2 text-xs font-bold flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse" />
                  <span>WhatsApp Message Preview</span>
                </div>
                <span className="text-[10px] font-normal text-emerald-100">Variables injected live</span>
              </div>
              <div className="p-3 bg-emerald-50/30">
                <textarea
                  ref={messageTextareaRef}
                  rows={8}
                  value={message}
                  onChange={(e) => handleMessageChange(e.target.value)}
                  className="w-full bg-white text-slate-900 text-xs sm:text-sm p-3 rounded-lg shadow-2xs border border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 resize-y font-sans leading-relaxed"
                  placeholder="Type your WhatsApp message..."
                />
              </div>
            </div>
          ) : (
            /* Email styled container */
            <div className="border border-sky-300 rounded-xl overflow-hidden bg-white shadow-2xs">
              <div className="bg-sky-700 text-white px-3.5 py-2 text-xs font-bold flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Mail className="w-3.5 h-3.5 text-sky-200" />
                  <span>Email Body Preview</span>
                </div>
                <span className="text-[10px] font-normal text-sky-100">Variables injected live</span>
              </div>
              <div className="p-3 bg-sky-50/30">
                <textarea
                  ref={messageTextareaRef}
                  rows={8}
                  value={message}
                  onChange={(e) => handleMessageChange(e.target.value)}
                  className="w-full bg-white text-slate-900 text-xs sm:text-sm p-3 rounded-lg border border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 resize-y font-sans leading-relaxed shadow-2xs"
                  placeholder="Type your email message body..."
                />
              </div>
            </div>
          )}

          <p className="text-[11px] text-slate-500 mt-1">
            Dynamic variables like <span className="font-mono text-slate-700 font-semibold">{'{client_name}'}</span>, <span className="font-mono text-slate-700 font-semibold">{'{rental_id}'}</span>, <span className="font-mono text-slate-700 font-semibold">{'{paid_amount}'}</span>, <span className="font-mono text-red-600 font-semibold">{'{owing_amount}'}</span>, <span className="font-mono text-slate-700 font-semibold">{'{last_payment_paid}'}</span>, <span className="font-mono text-slate-700 font-semibold">{'{date_paid}'}</span>, and <span className="font-mono text-slate-700 font-semibold">{'{vehicle_reg}'}</span> are replaced automatically.
          </p>
        </div>

        {/* Modal Action Buttons Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-200">
          <button
            type="button"
            onClick={handlePrintOrDownloadPDF}
            disabled={isPrintingPdf}
            className="inline-flex items-center justify-center px-3.5 py-2 text-sm font-bold text-purple-700 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 focus:outline-none shadow-2xs transition-all disabled:opacity-50 cursor-pointer"
            title="Print or download rental PDF"
          >
            <Printer className="h-4 w-4 mr-1.5 text-purple-600" />
            {isPrintingPdf ? 'Preparing...' : 'Print / Download PDF'}
          </button>

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 hover:text-slate-900 transition-colors shadow-2xs cursor-pointer"
            >
              Cancel
            </button>

            {mode === 'whatsapp' ? (
              <button
                type="button"
                onClick={handleSendWhatsApp}
                className="inline-flex items-center justify-center px-5 py-2.5 text-sm font-bold rounded-xl focus:outline-none shadow-sm transition-all text-white bg-emerald-600 hover:bg-emerald-700 cursor-pointer active:scale-95"
                title="Send and open in WhatsApp"
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                Open in WhatsApp
                <ExternalLink className="h-3.5 w-3.5 ml-1.5 opacity-80" />
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleSendMailto}
                  className="inline-flex items-center justify-center px-4 py-2.5 text-sm font-bold rounded-xl focus:outline-none shadow-2xs transition-all text-sky-700 bg-sky-50 border border-sky-200 hover:bg-sky-100 cursor-pointer active:scale-95"
                  title="Open in your default mail application"
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Open in Mail App
                  <ExternalLink className="h-3.5 w-3.5 ml-1.5 opacity-80" />
                </button>
                <button
                  type="button"
                  onClick={handleSendDirectEmail}
                  disabled={sendingEmail || !canSendEmail || isAnyDocProcessing}
                  className={`inline-flex items-center justify-center px-4 py-2 text-sm font-bold rounded-lg focus:outline-none shadow-sm transition-all ${
                    sendingEmail || !canSendEmail || isAnyDocProcessing
                      ? 'bg-slate-300 text-slate-500 cursor-not-allowed opacity-60'
                      : 'text-white bg-sky-600 hover:bg-sky-700 cursor-pointer active:scale-95'
                  }`}
                  title={
                    !canSendEmail
                      ? 'Permission required: You do not have permission to send emails'
                      : isAnyDocProcessing
                      ? 'Generating document link... Please wait until the document is verified and ready.'
                      : undefined
                  }
                >
                  {sendingEmail ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin text-white" />
                      Sending...
                    </>
                  ) : isAnyDocProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin text-slate-600" />
                      Preparing Document Link...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Send Direct Email
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default RentalCommunicationModal;
