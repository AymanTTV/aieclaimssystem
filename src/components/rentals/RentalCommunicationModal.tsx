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
  Award
} from 'lucide-react';
import toast from 'react-hot-toast';
import { formatWhatsAppNumber, buildWaMeLink } from '../../utils/whatsapp';
import { sendEmail } from '../../utils/emailService';
import { logWhatsappHistory } from '../../hooks/useWhatsappHistory';
import { logEmailHistory } from '../../hooks/useEmailHistory';
import { generateRentalDocuments } from '../../utils/generateRentalDocuments';
import { uploadRentalDocuments } from '../../utils/uploadRentalDocuments';
import { emailTemplates } from '../../constants/emailTemplates';

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
  const [mode, setMode] = useState<'whatsapp' | 'email'>(initialMode);
  const [templates, setTemplates] = useState<TemplateOption[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  
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

  // Load message templates strictly from the "Rental" category tab
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const fetchRentalTemplates = async () => {
      setLoadingTemplates(true);
      try {
        const snap = await getDocs(collection(db, 'messageTemplates'));
        const allTpls: TemplateOption[] = [];
        const seenIds = new Set<string>();

        if (!snap.empty && isMounted) {
          snap.docs.forEach((d) => {
            const data = d.data() as any;
            const cat = String(data.category || 'general').trim();
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

        if (isMounted) {
          setTemplates(allTpls);
        }
      } catch (err) {
        console.error('Failed to load templates from Firestore', err);
        if (isMounted) {
          // Fallback to built-in rental templates
          const fallback = (emailTemplates.rental || []).map((et) => ({
            id: et.id,
            name: et.name,
            category: 'rental',
            subjectTemplate: et.subjectTemplate,
            bodyTemplate: et.bodyTemplate,
          }));
          setTemplates(fallback);
        }
      } finally {
        if (isMounted) setLoadingTemplates(false);
      }
    };

    fetchRentalTemplates();

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

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

  // Format date helper
  const formatDateValue = (d: any): string => {
    if (!d) return 'N/A';
    try {
      const date = d?.toDate ? d.toDate() : d instanceof Date ? d : new Date(d);
      if (isNaN(date.getTime())) return 'N/A';
      return format(date, 'dd/MM/yyyy');
    } catch {
      return 'N/A';
    }
  };

  // Format time helper
  const formatTimeValue = (d: any): string => {
    if (!d) return '';
    try {
      const date = d?.toDate ? d.toDate() : d instanceof Date ? d : new Date(d);
      if (isNaN(date.getTime())) return '';
      return format(date, 'HH:mm');
    } catch {
      return '';
    }
  };

  // Dynamic Placeholder Injection & Live Preview
  const populateTemplate = useCallback(
    (rawText: string, currentPdfUrl?: string): string => {
      if (!rental || !rawText) return '';

      const clientName = customer?.name || (rental as any).customerName || 'Customer';
      const rentalId = rental.rentalAgreementNumber || rental.id || 'N/A';
      const totalStr = formatCurrency(rental.cost ?? 0);
      const paidStr = formatCurrency(rental.paidAmount ?? 0);
      const owingStr = formatCurrency(rental.remainingAmount ?? 0);
      const startDateStr = formatDateValue(rental.startDate);
      const endDateStr = formatDateValue(rental.endDate);
      const startTimeStr = formatTimeValue(rental.startDate);
      const endTimeStr = formatTimeValue(rental.endDate);
      const phoneStr = customer?.mobile || customer?.phone || (customer as any)?.tel || '';
      const emailStr = customer?.email || '';
      const vehicleReg = vehicle?.registrationNumber || 'N/A';
      const vehicleMake = vehicle?.make || '';
      const vehicleModel = vehicle?.model || '';
      const vehicleName = `${vehicleMake} ${vehicleModel}`.trim() || vehicleReg;
      const dailyRateStr = formatCurrency(rental.lockedDailyRate || vehicle?.dailyRentalPrice || 0);
      const weeklyRateStr = formatCurrency(rental.lockedWeeklyRate || vehicle?.weeklyRentalPrice || 0);
      const rentalType = rental.type || 'Standard';
      const pdfUrlStr = currentPdfUrl || cachedPdfUrl || '';

      const paymentDetails = `🏦 Bank: Lloyds Bank\n💼 Account Name: AIE SKYLINE LIMITED\n🔢 Account Number: 30513162\n🔣 Sort Code: 30-99-50\n📝 Reference: ${rentalId}`;

      // Mapping dictionary supporting both {tag} and [Tag] styles
      const replacements: Record<string, string> = {
        // Customer / Client Name
        '{client_name}': clientName,
        '{customer_name}': clientName,
        '{recipient_name}': clientName,
        '[client name]': clientName,
        '[customer name]': clientName,
        '[recipient name]': clientName,
        "['driver name]": clientName,
        "[driver's name]": clientName,

        // Rental ID & Agreement
        '{rental_id}': rentalId,
        '{rental_agreement_number}': rentalId,
        '{agreement_number}': rentalId,
        '{invoice_number}': rentalId,
        '{invoice_no}': rentalId,
        '[rental id]': rentalId,
        '[rental agreement number]': rentalId,
        '[rental number]': rentalId,
        '[agreement number]': rentalId,

        // Amounts
        '{total_amount}': totalStr,
        '{total}': totalStr,
        '{amount}': totalStr,
        '[total amount]': totalStr,
        '[total]': totalStr,
        '[amount]': totalStr,
        '[grand total]': totalStr,

        '{paid_amount}': paidStr,
        '{paid}': paidStr,
        '[paid amount]': paidStr,
        '[paid]': paidStr,
        '[paid balance]': paidStr,
        '[amount paid]': paidStr,

        '{owing_amount}': owingStr,
        '{owing}': owingStr,
        '{amount_owing}': owingStr,
        '{amount_due}': owingStr,
        '{outstanding_balance}': owingStr,
        '[owing amount]': owingStr,
        '[owing]': owingStr,
        '[outstanding balance]': owingStr,
        '[amount owed]': owingStr,
        '[amount due]': owingStr,
        '[new balance]': owingStr,

        // Dates & Times
        '{start_date}': startDateStr,
        '[start date]': startDateStr,
        '{end_date}': endDateStr,
        '[end date]': endDateStr,
        '{due_date}': endDateStr,
        '[due date]': endDateStr,
        '{date}': startDateStr,
        '[date]': startDateStr,
        '{start_time}': startTimeStr,
        '{end_time}': endTimeStr,

        // Vehicle info
        '{vehicle_reg}': vehicleReg,
        '{registration}': vehicleReg,
        '[vehicle reg]': vehicleReg,
        '[registration]': vehicleReg,
        '{vehicle_name}': vehicleName,
        '[vehicle]': vehicleName,
        '{vehicle_make}': vehicleMake,
        '{vehicle_model}': vehicleModel,

        // Rates
        '{daily_rate}': dailyRateStr,
        '[daily rate]': dailyRateStr,
        '{weekly_rate}': weeklyRateStr,
        '[weekly rate]': weeklyRateStr,
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
      };

      let result = rawText;
      Object.entries(replacements).forEach(([key, val]) => {
        const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const re = new RegExp(escaped, 'gi');
        result = result.replace(re, val);
      });

      return result;
    },
    [rental, customer, vehicle, cachedPdfUrl, formatCurrency]
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
      if (docUrls[item.id]) return docUrls[item.id];
      if (!rental) return '';

      const effCustomer = internalCustomer || customer;
      const effVehicle = internalVehicle || vehicle;
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-200">
          {/* Mode Switcher Tabs */}
          <div className="inline-flex rounded-lg p-1 bg-gray-100 border border-gray-200">
            <button
              type="button"
              onClick={() => setMode('whatsapp')}
              className={`inline-flex items-center px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                mode === 'whatsapp'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <MessageCircle className="w-3.5 h-3.5 mr-1.5" />
              WhatsApp Message
            </button>
            <button
              type="button"
              onClick={() => setMode('email')}
              className={`inline-flex items-center px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                mode === 'email'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Mail className="w-3.5 h-3.5 mr-1.5" />
              Email Communication
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* Direct PDF Print / Download Button */}
            <button
              type="button"
              onClick={handlePrintOrDownloadPDF}
              disabled={isPrintingPdf}
              className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold text-purple-700 bg-purple-50 border border-purple-200 hover:bg-purple-100 transition-colors shadow-sm disabled:opacity-50"
              title="Print or download rental PDF"
            >
              <Printer className="h-3.5 w-3.5 mr-1 text-purple-600" />
              {isPrintingPdf ? 'Generating...' : 'Print / PDF'}
            </button>

            {/* Rental State Badge */}
            {rentalState === 'overdue' && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                <AlertTriangle className="h-3.5 w-3.5 mr-1 text-red-600" />
                Overdue
              </span>
            )}
            {rentalState === 'full_payment' && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                <CheckCircle2 className="h-3.5 w-3.5 mr-1 text-green-600" />
                Fully Paid
              </span>
            )}
            {rentalState === 'partial_payment' && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                Partially Paid
              </span>
            )}
            {rentalState === 'outstanding_balance' && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-800">
                Balance Outstanding
              </span>
            )}
            {rentalState === 'active' && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                Active Rental
              </span>
            )}
            {rentalState === 'completed' && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                Completed
              </span>
            )}
          </div>
        </div>

        {/* Rental Summary Card */}
        <div className="bg-gray-50 rounded-xl p-3 border border-gray-200 text-xs sm:text-sm grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div>
            <span className="text-gray-500 block text-xs">Agreement #:</span>
            <span className="font-bold text-gray-900">{rental.rentalAgreementNumber || rental.id || 'N/A'}</span>
          </div>
          <div>
            <span className="text-gray-500 block text-xs">Customer:</span>
            <span className="font-bold text-gray-900 truncate block" title={customer?.name || (rental as any).customerName}>
              {customer?.name || (rental as any).customerName || 'Customer'}
            </span>
          </div>
          <div>
            <span className="text-gray-500 block text-xs">Vehicle:</span>
            <span className="font-bold text-gray-900 truncate block">
              {vehicle ? `${vehicle.make} ${vehicle.model}` : 'Assigned Vehicle'}
            </span>
            <span className="text-[11px] font-mono text-gray-500">{vehicle?.registrationNumber || ''}</span>
          </div>
          <div>
            <span className="text-gray-500 block text-xs">Total / Owing:</span>
            <span className="font-bold text-gray-900">{formatCurrency(rental.cost ?? 0)}</span>
            <span className={`block text-xs font-bold ${Number(rental.remainingAmount ?? 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>
              Owing: {formatCurrency(rental.remainingAmount ?? 0)}
            </span>
          </div>
        </div>

        {/* Searchable Template Selector Combobox */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
              Communication Template <span className="text-gray-400 font-normal lowercase">(All Communication Templates)</span>
            </label>
            {rentalState === 'overdue' && currentTemplate && (
              <span className="text-[11px] text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 font-medium">
                ⚡ Pre-selected for Overdue
              </span>
            )}
            {rentalState === 'full_payment' && currentTemplate && (
              <span className="text-[11px] text-green-800 bg-green-50 px-2 py-0.5 rounded border border-green-200 font-medium">
                ⚡ Pre-selected Paid Receipt
              </span>
            )}
            {rentalState === 'partial_payment' && currentTemplate && (
              <span className="text-[11px] text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 font-medium">
                ⚡ Pre-selected Partial Payment
              </span>
            )}
            {rentalState === 'outstanding_balance' && currentTemplate && (
              <span className="text-[11px] text-orange-800 bg-orange-50 px-2 py-0.5 rounded border border-orange-200 font-medium">
                ⚡ Pre-selected Outstanding Balance
              </span>
            )}
            {rentalState === 'active' && currentTemplate && (
              <span className="text-[11px] text-blue-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 font-medium">
                ⚡ Pre-selected Rental Agreement
              </span>
            )}
          </div>

          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setIsTemplateDropdownOpen((prev) => !prev)}
              disabled={loadingTemplates}
              className="flex items-center justify-between w-full px-3.5 py-2.5 text-sm text-left bg-white border border-gray-300 rounded-lg shadow-sm hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all disabled:opacity-60"
            >
              <div className="flex items-center space-x-2 truncate">
                <FileText className="w-4 h-4 text-primary shrink-0" />
                <span className="font-semibold text-gray-900 truncate">
                  {currentTemplate
                    ? currentTemplate.name
                    : loadingTemplates
                    ? 'Loading templates...'
                    : templates.length === 0
                    ? 'No templates in database'
                    : 'Select a template...'}
                </span>
                {currentTemplate && (
                  <span className="px-1.5 py-0.5 text-[10px] font-bold bg-blue-50 text-blue-700 rounded border border-blue-200 uppercase">
                    {currentTemplate.category || 'Rental'}
                  </span>
                )}
              </div>
              <ChevronDown
                className={`w-4 h-4 text-gray-500 transition-transform shrink-0 ${
                  isTemplateDropdownOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {isTemplateDropdownOpen && (
              <div className="absolute z-50 w-full mt-1.5 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden animate-in fade-in duration-100">
                {/* Combobox Search Filter Input */}
                <div className="p-2 border-b border-gray-100 bg-gray-50">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      autoFocus
                      value={templateSearchQuery}
                      onChange={(e) => setTemplateSearchQuery(e.target.value)}
                      placeholder="Search communication templates by name or keyword..."
                      className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                    />
                  </div>
                </div>

                {/* Combobox Options List */}
                <div className="max-h-56 overflow-y-auto py-1 divide-y divide-gray-50">
                  {filteredTemplates.length === 0 ? (
                    <div className="px-4 py-5 text-center text-xs text-gray-500">
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
                          className={`w-full text-left px-3.5 py-2.5 text-xs flex items-center justify-between transition-colors ${
                            isSelected
                              ? 'bg-primary/10 text-primary font-semibold'
                              : 'text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          <div className="truncate pr-2">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-gray-900">{t.name}</span>
                              <span className="px-1.5 py-0.2 text-[9px] font-semibold bg-gray-100 text-gray-600 rounded border border-gray-200 uppercase">
                                {t.category || 'general'}
                              </span>
                            </div>
                            {t.subjectTemplate && (
                              <div className="text-[11px] text-gray-500 truncate mt-0.5">
                                {t.subjectTemplate}
                              </div>
                            )}
                          </div>
                          {isSelected && <Check className="w-4 h-4 text-primary shrink-0" />}
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
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
            {mode === 'whatsapp' ? 'Recipient WhatsApp Phone Number' : 'Recipient Email Address'}
          </label>
          <input
            type={mode === 'whatsapp' ? 'tel' : 'email'}
            value={recipientContact}
            onChange={(e) => setRecipientContact(e.target.value)}
            placeholder={mode === 'whatsapp' ? 'e.g. 07552 553441 or +447552553441' : 'customer@example.com'}
            className="block w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
          />
          {mode === 'whatsapp' && (
            <p className="text-xs text-gray-500 mt-1">
              Local numbers (e.g. 07xxx) are automatically formatted with international digits for WhatsApp.
            </p>
          )}
        </div>

        {/* Subject (for Email only) */}
        {mode === 'email' && (
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              Email Subject
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="block w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
            />
          </div>
        )}

        {/* Document Attachment Selection (Optional) */}
        <div className="bg-[#1E1E2D] rounded-xl p-3.5 border border-[#2B2B40] shadow-sm attachment-container" data-attachment-box="true">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <Paperclip className="w-4 h-4 text-primary" />
              <label className="text-xs font-bold text-gray-200 uppercase tracking-wider attachment-title">
                Select Attachments (Optional)
              </label>
              {selectedDocIds.length > 0 && (
                <span className="px-1.5 py-0.5 text-[10px] font-bold bg-primary/20 text-primary-300 border border-primary/30 rounded-full">
                  {selectedDocIds.length} selected
                </span>
              )}
            </div>
            <div className="flex items-center space-x-2 text-xs">
              <button
                type="button"
                onClick={handleSelectAllDocs}
                className="text-primary-400 hover:text-primary-300 font-medium transition-colors"
              >
                Select All
              </button>
              <span className="text-[#3E3E5B]">|</span>
              <button
                type="button"
                onClick={handleClearAllDocs}
                className="text-gray-400 hover:text-gray-200 font-medium transition-colors"
              >
                Clear
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {availableDocs.map((docItem) => {
              const isSelected = selectedDocIds.includes(docItem.id);
              const isGen = isGeneratingDocs[docItem.id];
              const IconComp = docItem.icon || FileText;

              return (
                <label
                  key={docItem.id}
                  data-attachment-item="true"
                  className={`flex items-center space-x-2.5 p-2 rounded-lg border text-xs cursor-pointer transition-all select-none attachment-item ${
                    isSelected
                      ? 'is-selected bg-primary/20 border-primary text-white shadow-xs ring-1 ring-primary/30'
                      : 'bg-[#13131A] border-[#2B2B40] text-gray-200 hover:bg-[#1A1A26] hover:border-[#3E3E5B]'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleToggleDoc(docItem.id)}
                    className="h-4 w-4 rounded border-[#3E3E5B] bg-[#1E1E2D] text-primary focus:ring-primary shrink-0"
                  />
                  <IconComp className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-primary-400' : 'text-gray-400'}`} />
                  <span className={`truncate attachment-label ${isSelected ? 'font-semibold text-white' : 'text-gray-200 font-medium'}`}>
                    {docItem.label}
                  </span>
                  {isGen && (
                    <span className="ml-auto text-[10px] text-amber-400 animate-pulse shrink-0">
                      Generating...
                    </span>
                  )}
                </label>
              );
            })}
          </div>
          
          <p className="text-[11px] text-gray-400 mt-2">
            {mode === 'whatsapp'
              ? 'Selected documents will have secure download links attached to the WhatsApp message.'
              : 'Selected documents will be attached as PDF files to the email dispatch.'}
          </p>
        </div>

        {/* Message Editor & Live Preview Area */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
              {mode === 'whatsapp' ? 'WhatsApp Message Preview & Edit' : 'Email Message Body'}
            </label>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={handleResetToTemplate}
                className="text-xs text-gray-500 hover:text-gray-800 flex items-center gap-1 font-medium"
                title="Reset back to unmodified template text"
              >
                <RefreshCw className="w-3 h-3" />
                Reset
              </button>
              <button
                type="button"
                onClick={handleCopy}
                className="text-xs text-primary hover:text-primary-700 flex items-center gap-1 font-semibold ml-2"
              >
                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>

          {mode === 'whatsapp' ? (
            /* WhatsApp styled container */
            <div className="border border-gray-300 rounded-xl overflow-hidden bg-[#e5ddd5] dark:bg-gray-900 shadow-inner">
              <div className="bg-[#075e54] text-white px-3 py-2 text-xs font-bold flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>WhatsApp Message Preview</span>
                </div>
                <span className="text-[10px] font-normal opacity-80">Variables injected live</span>
              </div>
              <div className="p-3">
                <textarea
                  rows={8}
                  value={message}
                  onChange={(e) => handleMessageChange(e.target.value)}
                  className="w-full bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-xs sm:text-sm p-3 rounded-lg shadow-sm border border-gray-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-y font-sans leading-relaxed"
                  placeholder="Type your WhatsApp message..."
                />
              </div>
            </div>
          ) : (
            /* Email styled container */
            <div className="border border-gray-300 rounded-xl overflow-hidden bg-white shadow-sm">
              <div className="bg-sky-700 text-white px-3 py-2 text-xs font-bold flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Mail className="w-3.5 h-3.5" />
                  <span>Email Body Preview</span>
                </div>
                <span className="text-[10px] font-normal opacity-80">Variables injected live</span>
              </div>
              <div className="p-3">
                <textarea
                  rows={8}
                  value={message}
                  onChange={(e) => handleMessageChange(e.target.value)}
                  className="w-full bg-gray-50 text-gray-900 text-xs sm:text-sm p-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-1 focus:ring-sky-500 resize-y font-sans leading-relaxed"
                  placeholder="Type your email message body..."
                />
              </div>
            </div>
          )}

          <p className="text-[11px] text-gray-500 mt-1">
            Dynamic variables like <span className="font-mono text-gray-700">{'{client_name}'}</span>, <span className="font-mono text-gray-700">{'{rental_id}'}</span>, <span className="font-mono text-gray-700">{'{total_amount}'}</span>, <span className="font-mono text-gray-700">{'{owing_amount}'}</span>, <span className="font-mono text-gray-700">{'{due_date}'}</span>, <span className="font-mono text-gray-700">{'{start_date}'}</span>, and <span className="font-mono text-gray-700">{'{end_date}'}</span> are replaced automatically.
          </p>
        </div>

        {/* Modal Action Buttons Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-gray-200">
          <button
            type="button"
            onClick={handlePrintOrDownloadPDF}
            disabled={isPrintingPdf}
            className="inline-flex items-center justify-center px-3.5 py-2 text-sm font-semibold text-purple-700 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 focus:outline-none shadow-sm transition-all disabled:opacity-50"
            title="Print or download rental PDF"
          >
            <Printer className="h-4 w-4 mr-1.5 text-purple-600" />
            {isPrintingPdf ? 'Preparing...' : 'Print / Download PDF'}
          </button>

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none"
            >
              Cancel
            </button>

            {mode === 'whatsapp' ? (
              <button
                type="button"
                onClick={handleSendWhatsApp}
                className="inline-flex items-center justify-center px-4 py-2 text-sm font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 focus:outline-none shadow-sm transition-all"
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                Open in WhatsApp
                <ExternalLink className="h-3.5 w-3.5 ml-1.5 opacity-70" />
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleSendMailto}
                  className="inline-flex items-center justify-center px-3.5 py-2 text-sm font-semibold text-sky-700 bg-sky-50 border border-sky-200 rounded-lg hover:bg-sky-100 focus:outline-none shadow-sm transition-all"
                  title="Open default email application"
                >
                  <Mail className="h-4 w-4 mr-1.5 text-sky-600" />
                  Open in Email Client
                </button>
                <button
                  type="button"
                  onClick={handleSendDirectEmail}
                  disabled={sendingEmail}
                  className="inline-flex items-center justify-center px-4 py-2 text-sm font-semibold text-white bg-sky-600 rounded-lg hover:bg-sky-700 focus:outline-none shadow-sm transition-all disabled:opacity-50"
                >
                  <Send className="h-4 w-4 mr-2" />
                  {sendingEmail ? 'Sending...' : 'Send Direct Email'}
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
