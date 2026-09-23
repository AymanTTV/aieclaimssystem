// src/components/finance/InvoiceCommunicationModal.tsx
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Invoice, Customer, Vehicle } from '../../types/finance';
import Modal from '../ui/Modal';
import { db } from '../../lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { format } from 'date-fns';
import { useFormattedDisplay } from '../../hooks/useFormattedDisplay';
import { useAuth } from '../../context/AuthContext';
import { usePermissions } from '../../hooks/usePermissions';
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
  FileText
} from 'lucide-react';
import toast from 'react-hot-toast';
import { formatWhatsAppNumber, buildWaMeLink } from '../../utils/whatsapp';
import { sendEmail } from '../../utils/emailService';
import { logWhatsappHistory } from '../../hooks/useWhatsappHistory';
import { logEmailHistory } from '../../hooks/useEmailHistory';
import { generateInvoicePDF } from '../../utils/invoicePdfGenerator';
import { emailTemplates } from '../../constants/emailTemplates';

interface InvoiceCommunicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice | null;
  customer?: Customer;
  vehicle?: Vehicle;
  initialMode?: 'whatsapp' | 'email';
  moduleContext?: 'invoices' | 'vdInvoice';
}

interface TemplateOption {
  id: string;
  name: string;
  category: string;
  subjectTemplate: string;
  bodyTemplate: string;
}

export const InvoiceCommunicationModal: React.FC<InvoiceCommunicationModalProps> = ({
  isOpen,
  onClose,
  invoice,
  customer,
  vehicle,
  initialMode = 'whatsapp',
  moduleContext = 'invoices',
}) => {
  const { user } = useAuth();
  const { formatCurrency } = useFormattedDisplay();
  const { can, isAdmin } = usePermissions();

  const targetModule = moduleContext === 'vdInvoice' ? 'vdInvoice' : 'invoices';
  const canSendWhatsApp = isAdmin || can(targetModule, 'whatsapp') || can(targetModule, 'send');
  const canSendEmail = isAdmin || can(targetModule, 'email') || can(targetModule, 'send');
  const canUseTemplates = isAdmin || can(targetModule, 'template');
  const canEditTemplates = isAdmin || can(targetModule, 'templateEdit');
  const canCreateTemplates = isAdmin || can(targetModule, 'templateCreate') || can(targetModule, 'templateEdit');
  const canDeleteTemplates = isAdmin || can(targetModule, 'templateDelete');
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
  const [copied, setCopied] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [isPrintingPdf, setIsPrintingPdf] = useState(false);
  const [cachedPdfUrl, setCachedPdfUrl] = useState<string>('');

  // Sync mode whenever initialMode changes upon modal opening
  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setIsTemplateDropdownOpen(false);
      setTemplateSearchQuery('');
      if (invoice?.documentUrl) {
        setCachedPdfUrl(invoice.documentUrl);
      }
    } else {
      hasPreselectedRef.current = false;
    }
  }, [isOpen, initialMode, invoice?.documentUrl]);

  // Handle clicking outside the template dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
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

  // Load message templates exclusively from the "Invoice" tab storage (messageTemplates where category === 'invoice')
  // DO NOT use any hardcoded fallback templates in code
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const fetchInvoiceTemplates = async () => {
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
              category: cat || 'Invoice',
              subjectTemplate: data.subjectTemplate || data.subject || '',
              bodyTemplate: data.bodyTemplate || data.body || '',
            };
            allTpls.push(option);
            seenIds.add(d.id);
          });
        }

        // Add built-in defaults from emailTemplates.invoice if not already in Firestore
        (emailTemplates.invoice || []).forEach((et) => {
          if (!seenIds.has(et.id)) {
            allTpls.push({
              id: et.id,
              name: et.name,
              category: 'invoice',
              subjectTemplate: et.subjectTemplate,
              bodyTemplate: et.bodyTemplate,
            });
            seenIds.add(et.id);
          }
        });

        // Prioritize invoice templates at the top, then alphabetically
        allTpls.sort((a, b) => {
          const aIsInvoice = String(a.category || '').toLowerCase() === 'invoice';
          const bIsInvoice = String(b.category || '').toLowerCase() === 'invoice';
          if (aIsInvoice && !bIsInvoice) return -1;
          if (!aIsInvoice && bIsInvoice) return 1;
          return a.name.localeCompare(b.name);
        });

        if (isMounted) {
          setTemplates(allTpls);
        }
      } catch (err) {
        console.error('Failed to load templates from Firestore', err);
        if (isMounted) {
          // Fallback to built-in invoice templates
          const fallback = (emailTemplates.invoice || []).map((et) => ({
            id: et.id,
            name: et.name,
            category: 'invoice',
            subjectTemplate: et.subjectTemplate,
            bodyTemplate: et.bodyTemplate,
          }));
          setTemplates(fallback);
        }
      } finally {
        if (isMounted) setLoadingTemplates(false);
      }
    };

    fetchInvoiceTemplates();

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  // Determine invoice payment state
  const paymentState = useMemo(() => {
    if (!invoice) return 'pending';
    const total = Number(invoice.total ?? 0);
    const paid = Number(invoice.paidAmount ?? 0);
    const owing = Number(invoice.remainingAmount ?? Math.max(0, total - paid));
    const status = String(invoice.paymentStatus || '').toLowerCase();

    // 1. Overdue
    if (status === 'overdue') return 'overdue';
    if (owing > 0.01 && invoice.dueDate) {
      try {
        const d = (invoice.dueDate as any)?.toDate 
          ? (invoice.dueDate as any).toDate() 
          : invoice.dueDate instanceof Date 
            ? invoice.dueDate 
            : new Date(invoice.dueDate);
        if (d.getTime() < Date.now()) return 'overdue';
      } catch {
        // ignore date parse issues
      }
    }

    // 2. Full payment
    if (status === 'paid' || (total > 0 && owing <= 0.01)) {
      return 'full_payment';
    }

    // 3. Partial payment
    if (status === 'partially_paid' || (paid > 0.01 && owing > 0.01)) {
      return 'partial_payment';
    }

    // 4. Pending / Unpaid
    return 'pending';
  }, [invoice]);

  // Smart Auto-Selection (PRE-SELECT ONLY once when modal opens / templates load)
  useEffect(() => {
    if (!isOpen || templates.length === 0 || !invoice || hasPreselectedRef.current) return;

    hasPreselectedRef.current = true;
    let matched: TemplateOption | undefined;

    if (paymentState === 'overdue') {
      matched = templates.find((t) => {
        const combined = `${t.id} ${t.name} ${t.subjectTemplate}`.toLowerCase();
        return (
          combined.includes('overdue') ||
          combined.includes('outstanding') ||
          combined.includes('late') ||
          combined.includes('reminder')
        );
      });
    } else if (paymentState === 'full_payment') {
      matched = templates.find((t) => {
        const combined = `${t.id} ${t.name} ${t.subjectTemplate}`.toLowerCase();
        return (
          combined.includes('paid') ||
          combined.includes('receipt') ||
          combined.includes('full payment') ||
          combined.includes('cleared') ||
          combined.includes('settled')
        );
      });
    } else if (paymentState === 'partial_payment') {
      matched = templates.find((t) => {
        const combined = `${t.id} ${t.name} ${t.subjectTemplate}`.toLowerCase();
        return (
          combined.includes('partial') ||
          combined.includes('part payment') ||
          combined.includes('installment') ||
          combined.includes('deposit') ||
          combined.includes('balance')
        );
      });
    } else {
      // Pending / Unpaid / Standard
      matched = templates.find((t) => {
        const combined = `${t.id} ${t.name} ${t.subjectTemplate}`.toLowerCase();
        return (
          combined.includes('issued') ||
          combined.includes('pending') ||
          combined.includes('standard') ||
          combined.includes('new invoice') ||
          combined.includes('invoice')
        );
      });
    }

    const finalTemplate = matched || templates[0];
    if (finalTemplate) {
      setSelectedTemplateId(finalTemplate.id);
    }
  }, [isOpen, templates, invoice, paymentState]);

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

  // Extract last payment date helper
  const getLastPaymentDate = (): string => {
    if (!invoice?.payments || invoice.payments.length === 0) return 'N/A';
    try {
      const validPayments = [...invoice.payments].filter(p => p && (p.date || (p as any).createdAt));
      if (validPayments.length === 0) return 'N/A';
      validPayments.sort((a, b) => {
        const dateA = a.date?.toDate ? a.date.toDate().getTime() : new Date(a.date || (a as any).createdAt).getTime();
        const dateB = b.date?.toDate ? b.date.toDate().getTime() : new Date(b.date || (b as any).createdAt).getTime();
        return dateB - dateA;
      });
      const latest = validPayments[0];
      const d = latest.date?.toDate ? latest.date.toDate() : new Date(latest.date || (latest as any).createdAt);
      if (isNaN(d.getTime())) return 'N/A';
      return format(d, 'dd/MM/yyyy');
    } catch {
      return 'N/A';
    }
  };

  // Comprehensive placeholder replacement function
  const populateTemplate = useCallback(
    (rawText: string, currentPdfUrl?: string): string => {
      if (!invoice || !rawText) return '';

      const clientName = invoice.customerName || customer?.name || 'Customer';
      const invoiceNo = invoice.invoiceNumber || invoice.id || 'N/A';
      const category =
        invoice.category === 'Other'
          ? invoice.customCategory || 'Other'
          : invoice.category || 'Invoice';
      const totalStr = formatCurrency(invoice.total ?? 0);
      const paidStr = formatCurrency(invoice.paidAmount ?? 0);
      const owingStr = formatCurrency(invoice.remainingAmount ?? 0);
      const netStr = formatCurrency(invoice.subTotal ?? 0);
      const vatStr = formatCurrency(invoice.vatAmount ?? 0);
      const dueDateStr = formatDateValue(invoice.dueDate);
      const invoiceDateStr = formatDateValue(invoice.date);
      const lastPaymentDateStr = getLastPaymentDate();
      const phoneStr = invoice.customerPhone || customer?.mobile || '';
      const emailStr = customer?.email || '';
      const vehicleReg = invoice.vehicleName || vehicle?.registrationNumber || 'N/A';
      const pdfUrlStr = currentPdfUrl || cachedPdfUrl || invoice.documentUrl || '';

      const paymentDetails = `🏦 Bank: Lloyds Bank\n💼 Account Name: AIE SKYLINE LIMITED\n🔢 Account Number: 30513162\n🔣 Sort Code: 30-99-50\n📝 Reference: ${invoiceNo}`;

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

        // Invoice Number
        '{invoice_number}': invoiceNo,
        '{invoice_no}': invoiceNo,
        '[invoice number]': invoiceNo,
        '[invoice no.]': invoiceNo,
        '[invoice no]': invoiceNo,

        // Category
        '{category}': category,
        '[category]': category,

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

        '{net_amount}': netStr,
        '{subtotal}': netStr,
        '[net amount]': netStr,
        '[subtotal]': netStr,

        '{vat_amount}': vatStr,
        '{vat_total}': vatStr,
        '[vat total]': vatStr,
        '[vat amount]': vatStr,

        // Dates
        '{due_date}': dueDateStr,
        '[due date]': dueDateStr,
        '{invoice_date}': invoiceDateStr,
        '{date}': invoiceDateStr,
        '[invoice date]': invoiceDateStr,
        '[date]': invoiceDateStr,
        '{last_payment_date}': lastPaymentDateStr,
        '[last payment date]': lastPaymentDateStr,

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

        // Vehicle info
        '{vehicle_reg}': vehicleReg,
        '{registration}': vehicleReg,
        '[vehicle reg]': vehicleReg,
        '[registration]': vehicleReg,

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
    [invoice, customer, vehicle, cachedPdfUrl, formatCurrency]
  );

  // Live preview update whenever selected template, mode, or invoice changes
  useEffect(() => {
    if (!invoice) return;

    // Contact info
    if (mode === 'whatsapp') {
      const phone = invoice.customerPhone || customer?.mobile || '';
      setRecipientContact(phone);
    } else {
      const email = customer?.email || '';
      setRecipientContact(email);
    }

    const currentTpl = templates.find((t) => t.id === selectedTemplateId);
    if (currentTpl) {
      const popSubject = populateTemplate(
        currentTpl.subjectTemplate || `Invoice ${invoice.invoiceNumber || ''}`
      );
      const popBody = populateTemplate(currentTpl.bodyTemplate);
      setSubject(popSubject);
      setMessage(popBody);
    } else if (templates.length === 0 && !loadingTemplates) {
      // Empty state
      setSubject(`Invoice ${invoice.invoiceNumber || ''}`);
      setMessage(
        `Hi ${invoice.customerName || customer?.name || 'Customer'},\n\nHere are your invoice details for ${invoice.invoiceNumber || 'Invoice'}:\nTotal: ${formatCurrency(invoice.total || 0)}\nOwing: ${formatCurrency(invoice.remainingAmount || 0)}\nDue Date: ${formatDateValue(invoice.dueDate)}.`
      );
    }
  }, [selectedTemplateId, mode, invoice, customer, templates, loadingTemplates, populateTemplate, formatCurrency]);

  // Re-populate from template (Reset edits)
  const handleResetToTemplate = () => {
    const currentTpl = templates.find((t) => t.id === selectedTemplateId);
    if (!currentTpl || !invoice) return;

    setSubject(populateTemplate(currentTpl.subjectTemplate));
    setMessage(populateTemplate(currentTpl.bodyTemplate));
    toast.success('Reset to original template text');
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
    if (invoice?.documentUrl) {
      setCachedPdfUrl(invoice.documentUrl);
      return invoice.documentUrl;
    }

    if (!invoice) return '';
    try {
      const blob = await generateInvoicePDF(invoice, vehicle);
      const objectUrl = URL.createObjectURL(blob);
      setCachedPdfUrl(objectUrl);
      return objectUrl;
    } catch (err) {
      console.warn('PDF generation fallback notice:', err);
      return '';
    }
  };

  // Direct PDF Print / Download handler (executes without leaving view)
  const handlePrintOrDownloadPDF = async () => {
    if (!invoice) return;
    setIsPrintingPdf(true);
    toast.loading('Preparing PDF for printing...');
    try {
      const pdfUrl = await getOrGeneratePdfUrl();
      toast.dismiss();
      if (!pdfUrl) {
        toast.error('Could not generate invoice PDF');
        return;
      }

      // Open PDF in a new window/tab for native print/download preview
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

  // Send Trigger: WhatsApp (Appends PDF download URL directly into message text)
  const handleSendWhatsApp = async () => {
    if (!invoice) return;
    if (!canSendWhatsApp) {
      toast.error(`You do not have permission to send WhatsApp messages for ${moduleContext === 'vdInvoice' ? 'VD invoices' : 'invoices'}`);
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

    if (!message.trim()) {
      toast.error('Message text cannot be empty');
      return;
    }

    // Ensure PDF URL is included if available
    let finalMessage = message;
    const pdfUrl = cachedPdfUrl || invoice.documentUrl;
    if (pdfUrl && !finalMessage.includes(pdfUrl)) {
      finalMessage = `${finalMessage}\n\n📄 View Invoice PDF: ${pdfUrl}`;
    }

    const waUrl = buildWaMeLink(digits, finalMessage);
    window.open(waUrl, '_blank', 'noopener,noreferrer');

    // Attempt to log to WhatsApp history
    try {
      await logWhatsappHistory({
        sentBy: user?.email || user?.name || 'System User',
        type: 'invoice',
        templateId: selectedTemplateId || 'custom_invoice',
        recipients: [digits],
        subject: subject || 'Invoice Details',
        body: finalMessage,
        timestamp: new Date(),
      });
    } catch (e) {
      console.warn('Could not record WhatsApp history:', e);
    }

    toast.success('WhatsApp chat opened in a new tab');
    onClose();
  };

  // Send Trigger: Email via mailto: (Includes PDF download link in body)
  const handleSendMailto = async () => {
    if (!invoice) return;
    if (!canSendEmail) {
      toast.error(`You do not have permission to send emails for ${moduleContext === 'vdInvoice' ? 'VD invoices' : 'invoices'}`);
      return;
    }

    const email = recipientContact.trim();
    if (!email) {
      toast.error('Please enter a recipient email address');
      return;
    }

    let finalBody = message;
    const pdfUrl = cachedPdfUrl || invoice.documentUrl;
    if (pdfUrl && !finalBody.includes(pdfUrl)) {
      finalBody = `${finalBody}\n\n📄 View / Download Invoice PDF:\n${pdfUrl}`;
    }

    const encodedSubject = encodeURIComponent(subject || `Invoice ${invoice.invoiceNumber || ''}`);
    const encodedBody = encodeURIComponent(finalBody);
    const mailtoUrl = `mailto:${email}?subject=${encodedSubject}&body=${encodedBody}`;

    window.location.href = mailtoUrl;

    try {
      await logEmailHistory({
        sentBy: user?.email || user?.name || 'System User',
        type: 'invoice',
        templateId: selectedTemplateId || 'custom_invoice',
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
    if (!invoice) return;
    if (!canSendEmail) {
      toast.error(`You do not have permission to send emails for ${moduleContext === 'vdInvoice' ? 'VD invoices' : 'invoices'}`);
      return;
    }

    const email = recipientContact.trim();
    if (!email) {
      toast.error('Please enter a recipient email address');
      return;
    }

    let finalBody = message;
    const pdfUrl = cachedPdfUrl || invoice.documentUrl;
    if (pdfUrl && !finalBody.includes(pdfUrl)) {
      finalBody = `${finalBody}\n\n📄 View / Download Invoice PDF:\n${pdfUrl}`;
    }

    setSendingEmail(true);
    try {
      await sendEmail({
        to_email: email,
        to_name: invoice.customerName || customer?.name || 'Client',
        subject: subject,
        message: finalBody,
        reference: invoice.invoiceNumber || invoice.id,
        from_email: 'admin@aieskyline.co.uk',
        from_name: 'AIE Skyline Fleet System',
        source_page: 'invoices',
      });

      await logEmailHistory({
        sentBy: user?.email || user?.name || 'System User',
        type: 'invoice',
        templateId: selectedTemplateId || 'custom_invoice',
        recipients: [email],
        subject: subject,
        timestamp: new Date(),
      });

      toast.success('Email dispatched successfully via provider!');
      onClose();
    } catch (err: any) {
      console.error('Provider email failed:', err);
      toast.error('Failed to send via provider. Opening standard email app instead.');
      handleSendMailto();
    } finally {
      setSendingEmail(false);
    }
  };

  // Filter templates based on user search in combobox
  const filteredTemplates = useMemo(() => {
    if (!templateSearchQuery.trim()) return templates;
    const q = templateSearchQuery.toLowerCase();
    return templates.filter((t) => {
      const nameMatch = t.name.toLowerCase().includes(q);
      const subMatch = t.subjectTemplate.toLowerCase().includes(q);
      const bodyMatch = t.bodyTemplate.toLowerCase().includes(q);
      return nameMatch || subMatch || bodyMatch;
    });
  }, [templates, templateSearchQuery]);

  const currentTemplate = templates.find((t) => t.id === selectedTemplateId);

  if (!isOpen || !invoice) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === 'whatsapp' ? 'Share Invoice via WhatsApp' : 'Send Invoice Email'}
      size="lg"
    >
      <div className="space-y-4">
        {/* Channel Switcher Tabs & Print Shortcut */}
        <div className="flex items-center justify-between border-b border-gray-200 pb-3 flex-wrap gap-2">
          <div className="flex space-x-2">
            <button
              type="button"
              onClick={() => setMode('whatsapp')}
              className={`inline-flex items-center px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                mode === 'whatsapp'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <MessageCircle className="h-4 w-4 mr-1.5" />
              WhatsApp
            </button>
            <button
              type="button"
              onClick={() => setMode('email')}
              className={`inline-flex items-center px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                mode === 'email'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Mail className="h-4 w-4 mr-1.5" />
              Email
            </button>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handlePrintOrDownloadPDF}
              disabled={isPrintingPdf}
              className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold text-purple-700 bg-purple-50 border border-purple-200 hover:bg-purple-100 transition-colors shadow-sm disabled:opacity-50"
              title="Print or download invoice PDF"
            >
              <Printer className="h-3.5 w-3.5 mr-1 text-purple-600" />
              {isPrintingPdf ? 'Generating...' : 'Print / PDF'}
            </button>

            {/* Payment State Badge */}
            {paymentState === 'overdue' && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                <AlertTriangle className="h-3.5 w-3.5 mr-1 text-red-600" />
                Overdue
              </span>
            )}
            {paymentState === 'full_payment' && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                <CheckCircle2 className="h-3.5 w-3.5 mr-1 text-green-600" />
                Fully Paid
              </span>
            )}
            {paymentState === 'partial_payment' && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                Partially Paid
              </span>
            )}
            {paymentState === 'pending' && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                Pending
              </span>
            )}
          </div>
        </div>

        {/* Invoice Summary Card */}
        <div className="bg-gray-50 rounded-xl p-3 border border-gray-200 text-xs sm:text-sm grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div>
            <span className="text-gray-500 block text-xs">Invoice #:</span>
            <span className="font-bold text-gray-900">{invoice.invoiceNumber || 'N/A'}</span>
          </div>
          <div>
            <span className="text-gray-500 block text-xs">Client:</span>
            <span className="font-bold text-gray-900 truncate block" title={invoice.customerName || customer?.name}>
              {invoice.customerName || customer?.name || 'Customer'}
            </span>
          </div>
          <div>
            <span className="text-gray-500 block text-xs">Total:</span>
            <span className="font-bold text-gray-900">{formatCurrency(invoice.total ?? 0)}</span>
          </div>
          <div>
            <span className="text-gray-500 block text-xs">Owing:</span>
            <span className={`font-bold ${Number(invoice.remainingAmount ?? 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {formatCurrency(invoice.remainingAmount ?? 0)}
            </span>
          </div>
        </div>

        {/* Searchable Template Selector Combobox */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
              Communication Template <span className="text-gray-400 font-normal lowercase">(All Communication Templates)</span>
            </label>
            {paymentState === 'overdue' && currentTemplate && (
              <span className="text-[11px] text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 font-medium">
                ⚡ Pre-selected for Overdue
              </span>
            )}
            {paymentState === 'full_payment' && currentTemplate && (
              <span className="text-[11px] text-green-800 bg-green-50 px-2 py-0.5 rounded border border-green-200 font-medium">
                ⚡ Pre-selected Paid Receipt
              </span>
            )}
            {paymentState === 'partial_payment' && currentTemplate && (
              <span className="text-[11px] text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 font-medium">
                ⚡ Pre-selected Partial Payment
              </span>
            )}
            {paymentState === 'pending' && currentTemplate && (
              <span className="text-[11px] text-blue-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 font-medium">
                ⚡ Pre-selected Standard Invoice
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
                    {currentTemplate.category || 'Invoice'}
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
            placeholder={mode === 'whatsapp' ? 'e.g. 07552 553441 or +447552553441' : 'client@example.com'}
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
              className="block w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary font-medium text-gray-900"
            />
          </div>
        )}

        {/* Populated Message Body Preview */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
              {mode === 'whatsapp' ? 'WhatsApp Message Preview' : 'Email Body Preview'}
            </label>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={handleResetToTemplate}
                title="Reset placeholders to original template"
                className="inline-flex items-center text-xs text-gray-600 hover:text-gray-900 transition-colors"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Reset
              </button>
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center text-xs text-gray-600 hover:text-gray-900 transition-colors"
              >
                {copied ? <Check className="h-3 w-3 mr-1 text-green-600" /> : <Copy className="h-3 w-3 mr-1" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>

          <textarea
            rows={7}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="block w-full px-3 py-2 text-sm font-mono border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary resize-y bg-gray-50/50 leading-relaxed"
          />
          <div className="flex justify-between items-center mt-1 text-xs text-gray-400">
            <span>
              Active variables ({'{client_name}'}, {'{invoice_number}'}, {'{total_amount}'}, {'{paid_amount}'}, {'{owing_amount}'}, {'{due_date}'}, {'{last_payment_date}'}) injected live.
            </span>
            <span>{message.length} chars</span>
          </div>
        </div>

        {/* Modal Action Buttons */}
        <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-2 pt-3 border-t border-gray-200">
          <button
            type="button"
            onClick={handlePrintOrDownloadPDF}
            disabled={isPrintingPdf}
            className="inline-flex items-center justify-center px-3.5 py-2 text-sm font-semibold text-purple-700 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 focus:outline-none shadow-sm transition-all disabled:opacity-50"
            title="Print or download invoice PDF"
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
                disabled={!canSendWhatsApp}
                className="inline-flex items-center justify-center px-4 py-2 text-sm font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 focus:outline-none shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                title={!canSendWhatsApp ? `Permission required to send WhatsApp messages for ${moduleContext === 'vdInvoice' ? 'VD invoices' : 'invoices'}` : undefined}
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
                  disabled={!canSendEmail}
                  className="inline-flex items-center justify-center px-3.5 py-2 text-sm font-semibold text-sky-700 bg-sky-50 border border-sky-200 rounded-lg hover:bg-sky-100 focus:outline-none shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  title={!canSendEmail ? `Permission required to send emails for ${moduleContext === 'vdInvoice' ? 'VD invoices' : 'invoices'}` : "Open default email application"}
                >
                  <Mail className="h-4 w-4 mr-1.5" />
                  Email App (mailto:)
                </button>
                <button
                  type="button"
                  onClick={handleSendDirectEmail}
                  disabled={sendingEmail || !canSendEmail}
                  className="inline-flex items-center justify-center px-4 py-2 text-sm font-semibold text-white bg-sky-600 rounded-lg hover:bg-sky-700 focus:outline-none shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  title={!canSendEmail ? `Permission required to send emails for ${moduleContext === 'vdInvoice' ? 'VD invoices' : 'invoices'}` : undefined}
                >
                  <Send className="h-4 w-4 mr-1.5" />
                  {sendingEmail ? 'Sending...' : 'Send via Email'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default InvoiceCommunicationModal;
