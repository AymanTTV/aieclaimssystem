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
  Pencil,
  Plus,
  Sparkles,
  Trash2,
  Lock
} from 'lucide-react';
import toast from 'react-hot-toast';
import { formatWhatsAppNumber, buildWaMeLink } from '../../utils/whatsapp';
import { sendEmail } from '../../utils/emailService';
import { logWhatsappHistory } from '../../hooks/useWhatsappHistory';
import { logEmailHistory } from '../../hooks/useEmailHistory';
import { generateRentalDocuments } from '../../utils/generateRentalDocuments';
import { uploadRentalDocuments } from '../../utils/uploadRentalDocuments';
import { emailTemplates } from '../../constants/emailTemplates';
import { usePermissions } from '../../hooks/usePermissions';
import RentalTemplateEditorModal, { RentalTemplateData, RENTAL_DATA_TOOLS } from './RentalTemplateEditorModal';
import RentalTemplatesModal from './RentalTemplatesModal';

interface RentalCommunicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  rental: Rental | null;
  customer?: Customer;
  vehicle?: Vehicle;
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
  rental,
  customer,
  vehicle,
  initialMode = 'whatsapp',
}) => {
  const { user } = useAuth();
  const { formatCurrency } = useFormattedDisplay();
  const { can, isAdmin } = usePermissions();
  const canEditTemplates = isAdmin || can('rentals', 'templateEdit');
  const canSendWhatsApp = isAdmin || can('rentals', 'whatsapp');
  const canSendEmail = isAdmin || can('rentals', 'email');
  
  const [mode, setMode] = useState<'whatsapp' | 'email'>(initialMode);
  const [templates, setTemplates] = useState<TemplateOption[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  
  // Dedicated Modal Navigation Tabs for WhatsApp & Email Templates
  const [isTemplatesModalOpen, setIsTemplatesModalOpen] = useState(false);

  // Template Editor Modal state for editing & creating WhatsApp/Email templates
  const [isTemplateEditorOpen, setIsTemplateEditorOpen] = useState(false);
  const [templateEditorMode, setTemplateEditorMode] = useState<'create' | 'edit'>('create');
  const [templateToEdit, setTemplateToEdit] = useState<RentalTemplateData | null>(null);
  const messageTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Searchable dropdown state
  const [isTemplateDropdownOpen, setIsTemplateDropdownOpen] = useState(false);
  const [templateSearchQuery, setTemplateSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const hasPreselectedRef = useRef(false);

  // Editable form fields
  const [recipientContact, setRecipientContact] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [baseMessage, setBaseMessage] = useState('');
  const [copied, setCopied] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [isPrintingPdf, setIsPrintingPdf] = useState(false);
  const [cachedPdfUrl, setCachedPdfUrl] = useState<string>('');

  // Customer & Vehicle resolution fallback
  const [internalCustomer, setInternalCustomer] = useState<Customer | undefined>(customer);
  const [internalVehicle, setInternalVehicle] = useState<Vehicle | undefined>(vehicle);

  // Selected Documents to Attach (All UNCHECKED by default)
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [docUrls, setDocUrls] = useState<Record<string, string>>({});
  const [isGeneratingDocs, setIsGeneratingDocs] = useState<Record<string, boolean>>({});

  // Quick Data Tools UI State
  const [dataToolInsertMode, setDataToolInsertMode] = useState<'value' | 'tag'>('value');
  const [dataToolCategory, setDataToolCategory] = useState<'all' | 'payment' | 'vehicle' | 'customer'>('all');

  // Computed latest recorded payment details for instant tool buttons & validation
  const latestPayment = useMemo(() => {
    if (!rental?.payments || rental.payments.length === 0) return null;
    const sorted = [...rental.payments].sort((a, b) => {
      const tA = a.date ? new Date(a.date as any).getTime() : 0;
      const tB = b.date ? new Date(b.date as any).getTime() : 0;
      return tB - tA;
    });
    return sorted[0] || null;
  }, [rental?.payments]);

  const latestPaymentDetails = useMemo(() => {
    const formatMethod = (m?: string): string => {
      if (!m) return 'N/A';
      const lower = m.toLowerCase();
      if (lower.includes('bank') || lower.includes('transfer')) return 'Bank Transfer';
      if (lower.includes('card')) return 'Card';
      if (lower.includes('cash')) return 'Cash';
      if (lower.includes('cheque') || lower.includes('check')) return 'Cheque';
      return m.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
    };

    if (latestPayment) {
      return {
        amount: formatCurrency(latestPayment.amount || 0),
        date: formatDateValue(latestPayment.date || latestPayment.createdAt),
        method: formatMethod(latestPayment.method),
        ref: latestPayment.reference || '',
        notes: latestPayment.notes || '',
      };
    }
    if (rental && Number(rental.paidAmount ?? 0) > 0) {
      return {
        amount: formatCurrency(rental.paidAmount || 0),
        date: formatDateValue(rental.updatedAt || rental.startDate),
        method: formatMethod(rental.paymentMethod),
        ref: rental.paymentReference || '',
        notes: '',
      };
    }
    return {
      amount: '£0.00',
      date: rental ? formatDateValue(rental.startDate) : '',
      method: 'N/A',
      ref: '',
      notes: '',
    };
  }, [latestPayment, rental, formatCurrency]);

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

  // Sync mode and reset documents selection whenever modal opens
  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setIsTemplateDropdownOpen(false);
      setTemplateSearchQuery('');
      setSelectedDocIds([]); // CRITICAL REQUIREMENT: Always unchecked by default
      
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
      hasPreselectedRef.current = false;
      setSelectedDocIds([]);
    }
  }, [isOpen, initialMode, rental]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsTemplateDropdownOpen(false);
      }
    };
    if (isTemplateDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isTemplateDropdownOpen]);

  // Load message templates from Firestore (with fallbacks)
  const fetchRentalTemplates = useCallback(async (selectId?: string) => {
    setLoadingTemplates(true);
    try {
      const snap = await getDocs(collection(db, 'messageTemplates'));
      const allTpls: TemplateOption[] = [];
      const seenIds = new Set<string>();

      if (!snap.empty) {
        snap.docs.forEach((d) => {
          const data = d.data() as any;
          const cat = String(data.category || 'Rental').trim();
          const option: TemplateOption = {
            id: d.id,
            name: data.name || 'Untitled Template',
            category: cat || 'Rental',
            subjectTemplate: data.subjectTemplate || data.subject || '',
            bodyTemplate: data.bodyTemplate || data.body || '',
          };
          allTpls.push(option);
          seenIds.add(d.id);
        });
      }

      // Add built-in defaults from emailTemplates.rental if not already in Firestore
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

      // Prioritize rental templates at the top, then alphabetically
      allTpls.sort((a, b) => {
        const aIsRental = String(a.category || '').toLowerCase() === 'rental';
        const bIsRental = String(b.category || '').toLowerCase() === 'rental';
        if (aIsRental && !bIsRental) return -1;
        if (!aIsRental && bIsRental) return 1;
        return a.name.localeCompare(b.name);
      });

      setTemplates(allTpls);
      if (selectId) {
        setSelectedTemplateId(selectId);
      }
    } catch (err) {
      console.error('Failed to load templates from Firestore', err);
      // Fallback to built-in rental templates
      const fallback = (emailTemplates.rental || []).map((et) => ({
        id: et.id,
        name: et.name,
        category: 'rental',
        subjectTemplate: et.subjectTemplate,
        bodyTemplate: et.bodyTemplate,
      }));
      setTemplates(fallback);
      if (selectId) {
        setSelectedTemplateId(selectId);
      }
    } finally {
      setLoadingTemplates(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    fetchRentalTemplates();
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

      const effCustomer = internalCustomer || customer;
      const effVehicle = internalVehicle || vehicle;

      const clientName = effCustomer?.name || (rental as any).customerName || 'Customer';
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

    // 1. Hire Agreement (Main / Dated Versions)
    const agreementKeys = docs.agreements 
      ? Object.keys(docs.agreements).sort((a, b) => parseInt(a.split('_')[1] || '0', 10) - parseInt(b.split('_')[1] || '0', 10)) 
      : [];
    const latestAgreementKey = agreementKeys.length > 0 ? agreementKeys[agreementKeys.length - 1] : null;

    const mainAgreementUrl = latestAgreementKey 
      ? docs.agreements[latestAgreementKey] 
      : docs.hireAgreement || undefined;

    const mainLabel = rental.rentalAgreementNumber 
      ? `Hire Agreement #${rental.rentalAgreementNumber} (Main)` 
      : 'Hire Agreement (Main)';

    items.push({
      id: 'hire_agreement_main',
      docType: 'hireAgreement',
      label: mainLabel,
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

    // 2. View Invoice
    items.push({
      id: 'invoice',
      docType: 'invoice',
      label: 'View Invoice',
      existingUrl: docs.invoice || undefined,
      category: 'invoice',
      icon: Receipt,
    });

    // 3. View Permit
    items.push({
      id: 'permit',
      docType: 'permit',
      label: 'View Permit',
      existingUrl: docs.permit || undefined,
      category: 'permit',
      icon: MapPin,
    });

    // 4. Condition Of Hire
    items.push({
      id: 'condition_of_hire',
      docType: 'conditionOfHire',
      label: 'Condition Of Hire',
      existingUrl: docs.conditionOfHire || undefined,
      category: 'claim',
      icon: CheckSquare,
    });

    // 5. Notice Of Right To Cancel
    items.push({
      id: 'notice_of_right_to_cancel',
      docType: 'noticeOfRightToCancel',
      label: 'Notice Of Right To Cancel',
      existingUrl: docs.noticeOfRightToCancel || undefined,
      category: 'claim',
      icon: AlertCircle,
    });

    // 6. Credit Storage And Recovery
    items.push({
      id: 'credit_storage_and_recovery',
      docType: 'creditStorageAndRecovery',
      label: 'Credit Storage And Recovery',
      existingUrl: docs.creditStorageAndRecovery || undefined,
      category: 'claim',
      icon: Shield,
    });

    // 7. Credit Hire Mitigation
    items.push({
      id: 'credit_hire_mitigation',
      docType: 'creditHireMitigation',
      label: 'Credit Hire Mitigation',
      existingUrl: docs.creditHireMitigation || undefined,
      category: 'claim',
      icon: Scale,
    });

    // 8. Satisfaction Notice
    items.push({
      id: 'satisfaction_notice',
      docType: 'satisfactionNotice',
      label: 'Satisfaction Notice',
      existingUrl: docs.satisfactionNotice || undefined,
      category: 'claim',
      icon: Award,
    });

    return items;
  }, [rental, formatAgreementKey]);

  // Sync existing document URLs into local state
  useEffect(() => {
    if (!isOpen || !rental) return;

    const initialUrls: Record<string, string> = {};
    availableDocs.forEach((docItem) => {
      if (docItem.existingUrl) {
        initialUrls[docItem.id] = docItem.existingUrl;
      }
    });

    setDocUrls(initialUrls);
  }, [isOpen, rental, availableDocs]);

  // Helper to construct the formatted Attached Documents block
  const buildAttachedDocsSection = useCallback(
    (selectedIds: string[], urls: Record<string, string>): string => {
      if (selectedIds.length === 0) return '';
      const lines = selectedIds
        .map((id) => {
          const item = availableDocs.find((d) => d.id === id);
          if (!item) return null;
          const url = urls[id] || (isGeneratingDocs[id] ? '[Generating secure link...]' : '[Link will be generated on send]');
          return `• ${item.label}: ${url}`;
        })
        .filter(Boolean);
      if (lines.length === 0) return '';
      return `Attached Documents:\n${lines.join('\n')}`;
    },
    [availableDocs, isGeneratingDocs]
  );

  // Generate and upload document on demand to obtain secure persistent download URL
  const ensureDocUrl = useCallback(
    async (item: RentalDocItem): Promise<string> => {
      if (docUrls[item.id] && typeof docUrls[item.id] === 'string' && docUrls[item.id].startsWith('http')) {
        return docUrls[item.id];
      }
      if (!rental) return '';

      if (item.existingUrl && typeof item.existingUrl === 'string' && item.existingUrl.startsWith('http')) {
        setDocUrls((prev) => ({ ...prev, [item.id]: item.existingUrl! }));
        return item.existingUrl;
      }

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
        return '';
      }

      setIsGeneratingDocs((prev) => ({ ...prev, [item.id]: true }));
      try {
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
          targetUrl = uploadRes.agreementUrls?.[agreementKey] || Object.values(uploadRes.agreementUrls || {})[0] || '';
        } else if (item.docType === 'invoice') {
          targetUrl = uploadRes.invoiceUrl || '';
        } else if (item.docType === 'permit') {
          targetUrl = uploadRes.permitUrl || '';
        } else if (uploadRes.claimDocumentUrls) {
          if (item.docType === 'conditionOfHire') targetUrl = uploadRes.claimDocumentUrls.conditionOfHire || '';
          else if (item.docType === 'noticeOfRightToCancel') targetUrl = uploadRes.claimDocumentUrls.noticeOfRightToCancel || '';
          else if (item.docType === 'creditStorageAndRecovery') targetUrl = uploadRes.claimDocumentUrls.creditStorageAndRecovery || '';
          else if (item.docType === 'creditHireMitigation') targetUrl = uploadRes.claimDocumentUrls.creditHireMitigation || '';
          else if (item.docType === 'satisfactionNotice') targetUrl = uploadRes.claimDocumentUrls.satisfactionNotice || '';
        }

        if (targetUrl) {
          setDocUrls((prev) => ({ ...prev, [item.id]: targetUrl }));
          return targetUrl;
        }
        return '';
      } catch (err: any) {
        console.error('Failed to generate/upload document:', item.label, err);
        return '';
      } finally {
        setIsGeneratingDocs((prev) => ({ ...prev, [item.id]: false }));
      }
    },
    [rental, internalCustomer, customer, internalVehicle, vehicle, docUrls]
  );

  // Insert evaluated or raw data tool into message at cursor position
  const handleInsertDataTool = (tag: string, forceAsTag = false) => {
    const shouldInsertTag = forceAsTag || dataToolInsertMode === 'tag';
    const textToInsert = shouldInsertTag ? tag : populateTemplate(tag);
    const textarea = messageTextareaRef.current;
    if (textarea) {
      const start = textarea.selectionStart || 0;
      const end = textarea.selectionEnd || 0;
      const current = message;
      const updated = current.slice(0, start) + textToInsert + current.slice(end);
      handleMessageChange(updated);
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + textToInsert.length, start + textToInsert.length);
      }, 0);
    } else {
      handleMessageChange(`${message} ${textToInsert}`);
    }
    const previewText = shouldInsertTag ? tag : (textToInsert.length > 25 ? textToInsert.slice(0, 22) + '...' : textToInsert);
    toast.success(`Inserted ${previewText}`);
  };

  // Live preview update whenever selected template, mode, or rental changes
  useEffect(() => {
    if (!rental) return;

    const effCustomer = internalCustomer || customer;
    const effVehicle = internalVehicle || vehicle;

    // Contact info
    if (mode === 'whatsapp') {
      const phone = effCustomer?.mobile || effCustomer?.phone || (effCustomer as any)?.tel || '';
      setRecipientContact(phone);
    } else {
      const email = effCustomer?.email || '';
      setRecipientContact(email);
    }

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
      const defaultBody = `Hi ${effCustomer?.name || (rental as any).customerName || 'Customer'},\n\nHere are your rental details for booking #${rental.rentalAgreementNumber || rental.id || ''}:\nVehicle: ${effVehicle?.make || ''} ${effVehicle?.model || ''} (${effVehicle?.registrationNumber || 'N/A'})\nStart Date: ${formatDateValue(rental.startDate)}\nEnd Date: ${formatDateValue(rental.endDate)}\nTotal: ${formatCurrency(rental.cost || 0)}\nAmount Paid: ${formatCurrency(rental.paidAmount || 0)}\nRemaining: ${formatCurrency(rental.remainingAmount || 0)}.`;
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

  // Document checkbox toggling
  const handleToggleDoc = (id: string) => {
    setSelectedDocIds((prev) => {
      const isCurrentlySelected = prev.includes(id);
      const next = isCurrentlySelected ? prev.filter((dId) => dId !== id) : [...prev, id];
      
      // If newly selected and has no url yet, kick off generation in background
      if (!isCurrentlySelected && !docUrls[id]) {
        const item = availableDocs.find((d) => d.id === id);
        if (item) {
          ensureDocUrl(item);
        }
      }
      return next;
    });
  };

  const handleSelectAllDocs = () => {
    const allIds = availableDocs.map((d) => d.id);
    setSelectedDocIds(allIds);
    allIds.forEach((id) => {
      if (!docUrls[id]) {
        const item = availableDocs.find((d) => d.id === id);
        if (item) ensureDocUrl(item);
      }
    });
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

  // Send Trigger: WhatsApp (Appends secure download URLs for checked documents to WhatsApp message)
  const handleSendWhatsApp = async () => {
    if (!rental) return;
    if (!canSendWhatsApp) {
      toast.error('You do not have permission to send or dispatch WhatsApp messages');
      return;
    }

    const rawPhone = recipientContact.trim();
    if (!rawPhone) {
      toast.error('Please enter a recipient WhatsApp phone number');
      return;
    }

    const digits = formatWhatsAppNumber(rawPhone);
    if (!digits) {
      toast.error('Invalid phone number for WhatsApp');
      return;
    }

    // Ensure all checked documents have generated URLs
    let currentUrls = { ...docUrls };
    const missingDocs = availableDocs.filter((d) => selectedDocIds.includes(d.id) && !currentUrls[d.id]);
    if (missingDocs.length > 0) {
      toast.loading('Generating secure links for selected documents...');
      try {
        for (const item of missingDocs) {
          const url = await ensureDocUrl(item);
          if (url) currentUrls[item.id] = url;
        }
      } finally {
        toast.dismiss();
      }
    }

    const docsSection = buildAttachedDocsSection(selectedDocIds, currentUrls);
    let finalMessage = baseMessage.trim();
    if (docsSection) {
      finalMessage = `${finalMessage}\n\n${docsSection}`;
    }

    if (!finalMessage.trim()) {
      toast.error('Message text cannot be empty');
      return;
    }

    const waUrl = buildWaMeLink(digits, finalMessage);
    window.open(waUrl, '_blank', 'noopener,noreferrer');

    try {
      await logWhatsappHistory({
        sentBy: user?.email || user?.name || 'System User',
        type: 'rental',
        templateId: selectedTemplateId || 'custom_rental',
        recipients: [digits],
        subject: subject || 'Rental Details',
        body: finalMessage,
        timestamp: new Date(),
      });
    } catch (e) {
      console.warn('Could not record WhatsApp history:', e);
    }

    toast.success('WhatsApp chat opened in a new tab');
    onClose();
  };

  // Send Trigger: Email via mailto: (Embeds download links for checked documents into body)
  const handleSendMailto = async () => {
    if (!rental) return;
    if (!canSendEmail) {
      toast.error('You do not have permission to send or dispatch emails');
      return;
    }

    const email = recipientContact.trim();
    if (!email) {
      toast.error('Please enter a recipient email address');
      return;
    }

    // Ensure all checked documents have generated URLs
    let currentUrls = { ...docUrls };
    const missingDocs = availableDocs.filter((d) => selectedDocIds.includes(d.id) && !currentUrls[d.id]);
    if (missingDocs.length > 0) {
      toast.loading('Generating secure links for selected documents...');
      try {
        for (const item of missingDocs) {
          const url = await ensureDocUrl(item);
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

    window.location.href = mailtoUrl;

    try {
      await logEmailHistory({
        sentBy: user?.email || user?.name || 'System User',
        type: 'rental',
        templateId: selectedTemplateId || 'custom_rental',
        recipients: [email],
        subject: subject,
        timestamp: new Date(),
      });
    } catch (e) {
      console.warn('Could not record email history:', e);
    }

    toast.success('Opening default email client');
    onClose();
  };

  // Send Trigger: Direct Email via provider
  const handleSendDirectEmail = async () => {
    if (!rental) return;
    if (!canSendEmail) {
      toast.error('You do not have permission to send or dispatch emails');
      return;
    }

    const email = recipientContact.trim();
    if (!email) {
      toast.error('Please enter a recipient email address');
      return;
    }

    const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID;
    const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
    const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

    // Ensure all checked documents have generated URLs
    let currentUrls = { ...docUrls };
    const missingDocs = availableDocs.filter((d) => selectedDocIds.includes(d.id) && !currentUrls[d.id]);
    if (missingDocs.length > 0) {
      toast.loading('Generating secure links for selected documents...');
      try {
        for (const item of missingDocs) {
          const url = await ensureDocUrl(item);
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
      const effCustomer = internalCustomer || customer;
      
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
        to_name: effCustomer?.name || (rental as any).customerName || 'Customer',
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

  const currentTemplate = templates.find((t) => t.id === selectedTemplateId);

  if (!isOpen || !rental) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Share Rental Details"
      size="xl"
    >
      <div className="space-y-4">
        {/* Top Control Bar: Mode Toggle & Status Badges */}
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

        {/* Searchable Template Selector Combobox */}
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
              {/* Button to open the full WhatsApp & Email Template Tabs Modal */}
              <button
                type="button"
                onClick={() => setIsTemplatesModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors cursor-pointer shadow-2xs"
                title="Manage templates in WhatsApp & Email Navigation Tabs"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                <span>Template Tabs</span>
              </button>

              {currentTemplate && (
                <button
                  type="button"
                  onClick={() => {
                    setTemplateToEdit({
                      id: currentTemplate.id,
                      name: currentTemplate.name,
                      category: currentTemplate.category || 'Rental',
                      subjectTemplate: currentTemplate.subjectTemplate,
                      bodyTemplate: currentTemplate.bodyTemplate,
                    });
                    setTemplateEditorMode('edit');
                    setIsTemplateEditorOpen(true);
                  }}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg transition-colors border cursor-pointer shadow-2xs ${
                    canEditTemplates
                      ? 'text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border-indigo-200'
                      : 'text-slate-700 bg-slate-50 hover:bg-slate-100 border-slate-200'
                  }`}
                  title={canEditTemplates ? "Edit this template in the Template Editor" : "View template details (Read-Only)"}
                >
                  {canEditTemplates ? <Pencil className="w-3.5 h-3.5 text-indigo-600" /> : <Lock className="w-3.5 h-3.5 text-amber-600" />}
                  <span>{canEditTemplates ? 'Edit Template' : 'View Template'}</span>
                </button>
              )}

              {canEditTemplates ? (
                <button
                  type="button"
                  onClick={() => {
                    setTemplateToEdit(null);
                    setTemplateEditorMode('create');
                    setIsTemplateEditorOpen(true);
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors cursor-pointer shadow-2xs"
                  title="Create a new communication template"
                >
                  <Plus className="w-3.5 h-3.5 text-emerald-600" />
                  <span>New Template</span>
                </button>
              ) : (
                <button
                  type="button"
                  disabled
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-slate-400 bg-slate-100 border border-slate-200 rounded-lg opacity-60 cursor-not-allowed"
                  title="Template editing permission required to create templates"
                >
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                  <span>New Template</span>
                </button>
              )}

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

        {/* Recipient Contact Input */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
            {mode === 'whatsapp' ? 'Recipient WhatsApp Phone Number' : 'Recipient Email Address'}
          </label>
          <input
            type={mode === 'whatsapp' ? 'tel' : 'email'}
            value={recipientContact}
            onChange={(e) => setRecipientContact(e.target.value)}
            placeholder={mode === 'whatsapp' ? 'e.g. 07552 553441 or +447552553441' : 'customer@example.com'}
            className="block w-full px-3 py-2 text-sm bg-white text-slate-900 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 placeholder-slate-400 shadow-2xs"
          />
          {mode === 'whatsapp' && (
            <p className="text-xs text-slate-500 mt-1">
              Local numbers (e.g. 07xxx) are automatically formatted with international digits for WhatsApp.
            </p>
          )}
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
              {selectedDocIds.some((id) => !docUrls[id]) && (
                <button
                  type="button"
                  onClick={async () => {
                    const missing = availableDocs.filter((d) => selectedDocIds.includes(d.id) && !docUrls[d.id]);
                    for (const item of missing) {
                      await ensureDocUrl(item);
                    }
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-md transition-colors shadow-2xs cursor-pointer"
                >
                  ⚡ Generate Selected Links Now
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

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {availableDocs.map((docItem) => {
              const isSelected = selectedDocIds.includes(docItem.id);
              const isGen = isGeneratingDocs[docItem.id];
              const hasUrl = Boolean(docUrls[docItem.id]);
              const IconComp = docItem.icon || FileText;

              return (
                <label
                  key={docItem.id}
                  data-attachment-item="true"
                  title={docItem.label}
                  className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs cursor-pointer transition-all select-none attachment-item ${
                    isSelected
                      ? 'is-selected bg-indigo-50/90 border-indigo-400 text-indigo-950 shadow-2xs ring-1 ring-indigo-400'
                      : 'bg-white border-slate-200 text-slate-900 hover:bg-slate-50 hover:border-slate-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleToggleDoc(docItem.id)}
                    className="h-4 w-4 rounded border-slate-300 bg-white text-indigo-600 focus:ring-indigo-500 shrink-0 cursor-pointer"
                  />
                  <IconComp className={`w-4 h-4 shrink-0 ${isSelected ? 'text-indigo-600' : 'text-slate-500'}`} />
                  <span
                    title={docItem.label}
                    className={`flex-1 min-w-0 truncate text-xs font-semibold attachment-label ${
                      isSelected ? 'font-bold text-indigo-950' : 'text-slate-900'
                    }`}
                  >
                    {docItem.label}
                  </span>
                  {hasUrl && !isGen && (
                    <span className="ml-auto shrink-0 inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300">
                      <Check className="w-2.5 h-2.5 text-emerald-600 stroke-[2.5]" />
                      Ready
                    </span>
                  )}
                  {isGen && (
                    <span className="ml-auto shrink-0 inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded border border-amber-300 animate-pulse">
                      Generating...
                    </span>
                  )}
                  {!hasUrl && !isGen && isSelected && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        ensureDocUrl(docItem);
                      }}
                      className="ml-auto shrink-0 inline-flex items-center gap-1 text-[10px] font-bold text-indigo-700 bg-indigo-100 hover:bg-indigo-200 px-2 py-0.5 rounded border border-indigo-300 transition-colors cursor-pointer"
                      title="Generate instant link now"
                    >
                      ⚡ Generate
                    </button>
                  )}
                </label>
              );
            })}
          </div>
          
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

          {/* Quick Data Tools Bar */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 mb-2.5 space-y-2 shadow-2xs">
            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-700 border-b border-slate-200 pb-2">
              <div className="flex items-center gap-2">
                <span className="font-bold uppercase tracking-wider flex items-center gap-1.5 text-slate-800">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                  Data Tools:
                </span>

                {/* Category Filter Pills */}
                <div className="flex items-center bg-white p-0.5 rounded-lg border border-slate-200 shadow-2xs">
                  {(
                    [
                      { id: 'all', label: 'All' },
                      { id: 'payment', label: 'Payment & Receipts' },
                      { id: 'vehicle', label: 'Vehicle & Rental' },
                      { id: 'customer', label: 'Customer' },
                    ] as const
                  ).map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setDataToolCategory(cat.id)}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-colors cursor-pointer ${
                        dataToolCategory === cat.id
                          ? 'bg-indigo-600 text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* Insert Mode Toggle (Value vs Tag) */}
                <div className="flex items-center bg-white p-0.5 rounded-lg border border-slate-200 shadow-2xs text-[10px]">
                  <button
                    type="button"
                    onClick={() => setDataToolInsertMode('value')}
                    className={`px-2 py-0.5 rounded-md transition-colors cursor-pointer ${
                      dataToolInsertMode === 'value'
                        ? 'bg-emerald-600 text-white font-bold shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                    title="Insert real current dynamic value into message"
                  >
                    Insert Value
                  </button>
                  <button
                    type="button"
                    onClick={() => setDataToolInsertMode('tag')}
                    className={`px-2 py-0.5 rounded-md transition-colors cursor-pointer ${
                      dataToolInsertMode === 'tag'
                        ? 'bg-indigo-600 text-white font-bold shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                    title="Insert dynamic template tag {tag} into message"
                  >
                    Insert Tag {'{...}'}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setIsTemplatesModalOpen(true)}
                  className="text-indigo-600 hover:text-indigo-800 font-bold cursor-pointer flex items-center gap-1 text-[11px]"
                >
                  Manage Templates &rarr;
                </button>
              </div>
            </div>

            {/* Buttons list */}
            <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1">
              {/* Payment & Receipts Tools */}
              {(dataToolCategory === 'all' || dataToolCategory === 'payment') && (
                <>
                  <button
                    type="button"
                    onClick={() => handleInsertDataTool('{date_paid}')}
                    className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-white hover:bg-amber-50 text-amber-800 border border-amber-300 transition-colors shadow-2xs cursor-pointer"
                    title="Insert Date Paid (e.g. 18/09/2026)"
                  >
                    + Date Paid: {latestPaymentDetails.date || 'N/A'}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleInsertDataTool('{last_payment_amount}')}
                    className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-white hover:bg-blue-50 text-blue-800 border border-blue-300 transition-colors shadow-2xs cursor-pointer"
                    title="Insert Last Payment Amount"
                  >
                    + Last Paid: {latestPaymentDetails.amount}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleInsertDataTool('{last_payment_type}')}
                    className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-white hover:bg-cyan-50 text-cyan-800 border border-cyan-300 transition-colors shadow-2xs cursor-pointer"
                    title="Insert Payment Method (Bank Transfer, Card, Cash, Cheque)"
                  >
                    + Type: {latestPaymentDetails.method}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleInsertDataTool('{last_payment_ref}')}
                    className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-white hover:bg-teal-50 text-teal-800 border border-teal-300 transition-colors shadow-2xs cursor-pointer"
                    title="Insert Transaction Reference"
                  >
                    + Ref: {latestPaymentDetails.ref || rental.rentalAgreementNumber || 'Ref'}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleInsertDataTool('{owing_amount}')}
                    className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-white hover:bg-red-50 text-red-700 border border-red-300 transition-colors shadow-2xs cursor-pointer"
                    title="Insert Total Current Outstanding Balance"
                  >
                    + Outstanding: {formatCurrency(rental.remainingAmount ?? 0)}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleInsertDataTool('{paid_amount}')}
                    className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-300 transition-colors shadow-2xs cursor-pointer"
                    title="Insert Total Amount Paid"
                  >
                    + Total Paid: {formatCurrency(rental.paidAmount ?? 0)}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleInsertDataTool('{total_amount}')}
                    className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-white hover:bg-violet-50 text-violet-800 border border-violet-300 transition-colors shadow-2xs cursor-pointer"
                    title="Insert Total Rental Cost"
                  >
                    + Total Cost: {formatCurrency(rental.cost ?? 0)}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleInsertDataTool('{payment_status}')}
                    className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 transition-colors shadow-2xs cursor-pointer"
                    title="Insert Payment Status (Paid, Partially Paid, Pending)"
                  >
                    + Status: {Number(rental.remainingAmount ?? 0) <= 0.001 ? 'Fully Paid' : Number(rental.paidAmount ?? 0) > 0 ? 'Partially Paid' : 'Pending'}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleInsertDataTool('{transaction_payment}')}
                    className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-white hover:bg-blue-50 text-blue-800 border border-blue-300 transition-colors shadow-2xs cursor-pointer"
                    title="Insert single-line Last Transaction summary"
                  >
                    + Last Txn Summary
                  </button>

                  <button
                    type="button"
                    onClick={() => handleInsertDataTool('{payment_statement}')}
                    className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-white hover:bg-amber-50 text-amber-800 border border-amber-300 transition-colors shadow-2xs cursor-pointer"
                    title="Insert complete statement listing all recorded payment transactions"
                  >
                    + Full Statement ({rental.payments?.length || 0} Txns)
                  </button>

                  <button
                    type="button"
                    onClick={() => handleInsertDataTool('{payment_details}')}
                    className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-white hover:bg-purple-50 text-purple-800 border border-purple-300 transition-colors shadow-2xs cursor-pointer"
                    title="Insert Lloyds Bank Transfer Instructions"
                  >
                    + Lloyds Bank Details
                  </button>
                </>
              )}

              {/* Vehicle & Rental Agreement Tools */}
              {(dataToolCategory === 'all' || dataToolCategory === 'vehicle') && (
                <>
                  <button
                    type="button"
                    onClick={() => handleInsertDataTool('{vehicle_reg}')}
                    className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 transition-colors shadow-2xs cursor-pointer"
                    title="Insert Vehicle Registration Plate"
                  >
                    + Reg: {(internalVehicle || vehicle)?.registrationNumber || 'N/A'}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleInsertDataTool('{vehicle_name}')}
                    className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 transition-colors shadow-2xs cursor-pointer"
                    title="Insert Vehicle Make & Model"
                  >
                    + Vehicle: {((internalVehicle || vehicle)?.make || '')} {((internalVehicle || vehicle)?.model || '')}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleInsertDataTool('{agreement_number}')}
                    className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 transition-colors shadow-2xs cursor-pointer"
                    title="Insert Agreement Number"
                  >
                    + Agr #: {rental.rentalAgreementNumber || rental.id || 'N/A'}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleInsertDataTool('{rental_type}')}
                    className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 transition-colors shadow-2xs cursor-pointer"
                    title="Insert Rental Type"
                  >
                    + Type: {rental.type || 'Standard'}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleInsertDataTool('{start_date}')}
                    className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 transition-colors shadow-2xs cursor-pointer"
                    title="Insert Start Date"
                  >
                    + Start: {formatDateValue(rental.startDate)}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleInsertDataTool('{end_date}')}
                    className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 transition-colors shadow-2xs cursor-pointer"
                    title="Insert End / Due Date"
                  >
                    + Due: {formatDateValue(rental.endDate)}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleInsertDataTool('{weekly_rate}')}
                    className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 transition-colors shadow-2xs cursor-pointer"
                    title="Insert Weekly Rental Rate"
                  >
                    + Weekly: {formatCurrency(rental.lockedWeeklyRate || (internalVehicle || vehicle)?.weeklyRentalPrice || 0)}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleInsertDataTool('{daily_rate}')}
                    className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 transition-colors shadow-2xs cursor-pointer"
                    title="Insert Daily Rental Rate"
                  >
                    + Daily: {formatCurrency(rental.lockedDailyRate || (internalVehicle || vehicle)?.dailyRentalPrice || 0)}
                  </button>
                </>
              )}

              {/* Customer & Document Tools */}
              {(dataToolCategory === 'all' || dataToolCategory === 'customer') && (
                <>
                  <button
                    type="button"
                    onClick={() => handleInsertDataTool('{client_name}')}
                    className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 transition-colors shadow-2xs cursor-pointer"
                    title="Insert Customer / Driver Name"
                  >
                    + Customer: {(internalCustomer || customer)?.name || 'Customer'}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleInsertDataTool('{client_phone}')}
                    className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 transition-colors shadow-2xs cursor-pointer"
                    title="Insert Customer Phone / Mobile"
                  >
                    + Phone: {(internalCustomer || customer)?.mobile || (internalCustomer || customer)?.phone || 'N/A'}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleInsertDataTool('{client_email}')}
                    className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 transition-colors shadow-2xs cursor-pointer"
                    title="Insert Customer Email"
                  >
                    + Email: {(internalCustomer || customer)?.email || 'N/A'}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleInsertDataTool('{pdf_link}')}
                    className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-white hover:bg-indigo-50 text-indigo-800 border border-indigo-300 transition-colors shadow-2xs cursor-pointer"
                    title="Insert Document PDF download link"
                  >
                    + PDF Doc Link
                  </button>
                </>
              )}
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
                className="inline-flex items-center justify-center px-4 py-2 text-sm font-bold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 focus:outline-none shadow-sm transition-all cursor-pointer active:scale-95"
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
                  className="inline-flex items-center justify-center px-3.5 py-2 text-sm font-bold text-sky-700 bg-sky-50 border border-sky-200 rounded-lg hover:bg-sky-100 focus:outline-none shadow-2xs transition-all cursor-pointer"
                  title="Open default email application"
                >
                  <Mail className="h-4 w-4 mr-1.5 text-sky-600" />
                  Open in Email Client
                </button>
                <button
                  type="button"
                  onClick={handleSendDirectEmail}
                  disabled={sendingEmail}
                  className="inline-flex items-center justify-center px-4 py-2 text-sm font-bold text-white bg-sky-600 rounded-lg hover:bg-sky-700 focus:outline-none shadow-sm transition-all disabled:opacity-50 cursor-pointer active:scale-95"
                >
                  <Send className="h-4 w-4 mr-2" />
                  {sendingEmail ? 'Sending...' : 'Send Direct Email'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal Navigation Tabs: Dedicated WhatsApp & Email Templates Manager */}
      <RentalTemplatesModal
        isOpen={isTemplatesModalOpen}
        onClose={() => setIsTemplatesModalOpen(false)}
        initialTab={mode}
        rental={rental}
        customer={internalCustomer || customer}
        vehicle={internalVehicle || vehicle}
        onSelectTemplate={(tpl) => {
          setSelectedTemplateId(tpl.id || '');
          if (tpl.channel === 'whatsapp' || tpl.channel === 'email') {
            setMode(tpl.channel);
          }
          if (tpl.subjectTemplate && mode === 'email') {
            setSubject(populateTemplate(tpl.subjectTemplate));
          }
          setBaseMessage(tpl.bodyTemplate);
          setMessage(populateTemplate(tpl.bodyTemplate));
          setIsTemplatesModalOpen(false);
          toast.success(`Loaded "${tpl.name}" template`);
        }}
      />

      {/* Template Editor / Creator Modal */}
      <RentalTemplateEditorModal
        isOpen={isTemplateEditorOpen}
        onClose={() => setIsTemplateEditorOpen(false)}
        mode={templateEditorMode}
        templateToEdit={templateToEdit}
        initialTemplate={templateToEdit}
        rental={rental}
        customer={internalCustomer || customer}
        vehicle={internalVehicle || vehicle}
        populateFn={populateTemplate}
        readOnly={!canEditTemplates}
        onSaved={async (savedTemplateId) => {
          await fetchRentalTemplates();
          setSelectedTemplateId(savedTemplateId);
        }}
      />
    </Modal>
  );
};

export default RentalCommunicationModal;
