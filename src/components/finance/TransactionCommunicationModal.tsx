// src/components/finance/TransactionCommunicationModal.tsx
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../../routes';
import { Transaction, Vehicle, Account, Customer } from '../../types';
import Modal from '../ui/Modal';
import { format, isValid } from 'date-fns';
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
  ExternalLink,
  Search,
  CheckCircle2,
  FileText,
  Paperclip,
  Zap,
  User,
  Phone,
  Wallet,
  Calendar,
  Layers,
  Sparkles
} from 'lucide-react';
import toast from 'react-hot-toast';
import { formatWhatsAppNumber, buildWaMeLink, openWhatsAppLink } from '../../utils/whatsapp';
import { sendEmail } from '../../utils/emailService';
import { logWhatsappHistory } from '../../hooks/useWhatsappHistory';
import { logEmailHistory } from '../../hooks/useEmailHistory';
import { logCommunication } from '../../services/communicationLogService';
import { loadTemplatesForCategory, AppMessageTemplate } from '../../utils/templateManager';
import { CustomAttachmentUploader } from '../common/CustomAttachmentUploader';
import { CustomAttachment } from '../../utils/attachmentUpload';

interface TransactionCommunicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction | null;
  vehicles?: Vehicle[];
  accounts?: Account[];
  customers?: Customer[];
  initialMode?: 'whatsapp' | 'email';
  runningBalance?: number;
}

interface TemplateOption {
  id: string;
  name: string;
  category: string;
  subjectTemplate: string;
  bodyTemplate: string;
}

export const TransactionCommunicationModal: React.FC<TransactionCommunicationModalProps> = ({
  isOpen,
  onClose,
  transaction,
  vehicles = [],
  accounts = [],
  customers = [],
  initialMode = 'whatsapp',
  runningBalance,
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { formatCurrency } = useFormattedDisplay();
  const { can, isManager } = usePermissions();

  const [mode, setMode] = useState<'whatsapp' | 'email'>(initialMode);
  const [templates, setTemplates] = useState<TemplateOption[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  
  // Searchable dropdown state
  const [isTemplateDropdownOpen, setIsTemplateDropdownOpen] = useState(false);
  const [templateSearchQuery, setTemplateSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const hasPreselectedRef = useRef(false);

  // Form states
  const [recipientContact, setRecipientContact] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [copied, setCopied] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [customAttachments, setCustomAttachments] = useState<CustomAttachment[]>([]);
  const [includePdfLink, setIncludePdfLink] = useState(true);

  // Resolve associated entities
  const associatedVehicle = useMemo(() => {
    if (!transaction?.vehicleId) return undefined;
    return vehicles.find((v) => v.id === transaction.vehicleId);
  }, [transaction?.vehicleId, vehicles]);

  const associatedCustomer = useMemo(() => {
    if (transaction?.customerId) {
      const c = customers.find((cust) => cust.id === transaction.customerId);
      if (c) return c;
    }
    if (transaction?.customerName) {
      const c = customers.find(
        (cust) => cust.name?.toLowerCase() === transaction.customerName?.toLowerCase()
      );
      if (c) return c;
    }
    return undefined;
  }, [transaction, customers]);

  const associatedAccount = useMemo(() => {
    const accId = transaction?.type === 'income' 
      ? transaction.accountsTo?.[0] 
      : transaction?.accountsFrom?.[0];
    if (!accId) return undefined;
    return accounts.find((a) => a.id === accId);
  }, [transaction, accounts]);

  // Derived effective customer name, phone, and email
  const customerName = useMemo(() => {
    return (
      transaction?.customerName ||
      associatedCustomer?.name ||
      associatedVehicle?.owner?.name ||
      'Valued Customer'
    );
  }, [transaction, associatedCustomer, associatedVehicle]);

  const customerPhone = useMemo(() => {
    return (
      (transaction as any)?.customerPhone ||
      associatedCustomer?.mobile ||
      associatedCustomer?.phone ||
      ''
    );
  }, [transaction, associatedCustomer]);

  const customerEmail = useMemo(() => {
    return (
      (transaction as any)?.customerEmail ||
      associatedCustomer?.email ||
      ''
    );
  }, [transaction, associatedCustomer]);

  const statementDocUrl = useMemo(() => {
    return transaction?.documentUrl || transaction?.receiptUrl || '';
  }, [transaction]);

  // Sync mode and reset state upon modal opening
  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setIsTemplateDropdownOpen(false);
      setTemplateSearchQuery('');
      setCustomAttachments([]);
      setIncludePdfLink(true);
      hasPreselectedRef.current = false;
      if (initialMode === 'whatsapp') {
        setRecipientContact(customerPhone);
      } else {
        setRecipientContact(customerEmail);
      }
    }
  }, [isOpen, initialMode, customerPhone, customerEmail]);

  // When switching mode between whatsapp and email, update recipient contact
  const handleModeSwitch = (newMode: 'whatsapp' | 'email') => {
    setMode(newMode);
    if (newMode === 'whatsapp') {
      setRecipientContact(customerPhone);
    } else {
      setRecipientContact(customerEmail);
    }
  };

  // Close dropdown on outside click
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

  // Fetch live templates from Automation Control (category 'finance' + 'custom')
  const fetchFinanceTemplates = useCallback(async () => {
    setLoadingTemplates(true);
    try {
      const list = await loadTemplatesForCategory('finance', mode, { includeCustom: true });
      const mapped: TemplateOption[] = list.map((t: AppMessageTemplate) => ({
        id: t.id,
        name: t.name,
        category: t.category || 'finance',
        subjectTemplate: t.subjectTemplate || '',
        bodyTemplate: t.bodyTemplate || '',
      }));
      setTemplates(mapped);
    } catch (err) {
      console.error('Failed to load templates from templateManager:', err);
    } finally {
      setLoadingTemplates(false);
    }
  }, [mode]);

  useEffect(() => {
    if (!isOpen) return;
    fetchFinanceTemplates();

    const handleSync = () => {
      fetchFinanceTemplates();
    };

    window.addEventListener('template_saved', handleSync);
    window.addEventListener('template_deleted', handleSync);
    return () => {
      window.removeEventListener('template_saved', handleSync);
      window.removeEventListener('template_deleted', handleSync);
    };
  }, [isOpen, fetchFinanceTemplates]);

  // Helper date formatter
  const formatDateValue = (d: any): string => {
    if (!d) return 'N/A';
    try {
      const date = d?.toDate ? d.toDate() : d instanceof Date ? d : new Date(d);
      if (!isValid(date)) return 'N/A';
      return format(date, 'dd/MM/yyyy');
    } catch {
      return 'N/A';
    }
  };

  // ── DYNAMIC VARIABLE REPLACEMENT ENGINE ──
  const populateTemplate = useCallback(
    (rawText: string): string => {
      if (!transaction || !rawText) return '';

      const txnRef =
        transaction.referenceId ||
        transaction.orderNumber ||
        transaction.invoiceNumber ||
        transaction.id.slice(-8).toUpperCase();
      const amountStr = formatCurrency(transaction.amount || 0);
      const dateStr = formatDateValue(transaction.date);
      const balanceStr = runningBalance !== undefined 
        ? formatCurrency(runningBalance) 
        : formatCurrency(transaction.amount || 0);
      const vehicleReg =
        transaction.vehicleName ||
        associatedVehicle?.registrationNumber ||
        'N/A';
      const accName = associatedAccount?.name || 'Main Operating Account';
      const pdfLinkStr = statementDocUrl
        ? statementDocUrl
        : `[Official Statement Generated on AIE Skyline Portal]`;

      const paymentDetails = `🏦 Bank: Lloyds Bank\n💼 Account Name: AIE SKYLINE LIMITED\n🔢 Account Number: 30513162\n🔣 Sort Code: 30-99-50\n📝 Payment Reference: ${txnRef}`;

      // Mapping dictionary supporting {Variable} and [Variable] casing styles
      const replacements: Record<string, string> = {
        // Customer Name
        '{Customer_Name}': customerName,
        '{customer_name}': customerName,
        '{client_name}': customerName,
        '{recipient_name}': customerName,
        '[Customer Name]': customerName,
        '[Recipient Name]': customerName,
        '[client name]': customerName,
        '[driver name]': customerName,

        // Amount
        '{Amount}': amountStr,
        '{amount}': amountStr,
        '{amount_paid}': amountStr,
        '[Amount]': amountStr,
        '[Amount Paid]': amountStr,
        '[Total Amount]': amountStr,
        '[owing balance]': amountStr,
        '[owing Balance]': amountStr,

        // Transaction Ref
        '{Transaction_Ref}': txnRef,
        '{transaction_ref}': txnRef,
        '{payment_id}': txnRef,
        '{reference}': txnRef,
        '{invoice_number}': txnRef,
        '[Bank Reference]': txnRef,
        '[Payment Reference]': txnRef,
        '[Invoice Number]': txnRef,
        '[Vehicle Reg]': vehicleReg,

        // Date
        '{Date}': dateStr,
        '{date}': dateStr,
        '{payment_date}': dateStr,
        '[Date]': dateStr,
        '[Date Received]': dateStr,
        "[Today's Date]": format(new Date(), 'dd/MM/yyyy'),
        '[the current date]': format(new Date(), 'dd/MM/yyyy'),

        // Running Balance
        '{Running_Balance}': balanceStr,
        '{running_balance}': balanceStr,
        '{Remaining_Balance}': balanceStr,
        '{remaining_balance}': balanceStr,
        '[New Balance]': balanceStr,
        '[Remaining Balance]': balanceStr,

        // Direct Attachment Link to Statement PDF
        '{Statement_PDF_Link}': pdfLinkStr,
        '{statement_pdf_link}': pdfLinkStr,
        '{Document_Url}': pdfLinkStr,
        '{document_url}': pdfLinkStr,
        '[Statement Link]': pdfLinkStr,

        // Additional Context
        '{Vehicle_Reg}': vehicleReg,
        '{Account_Name}': accName,
        '[Account Name]': accName,
        '[selected account name]': accName,
        '{Description}': transaction.description || 'General Account Transaction',
        '{Category}': transaction.category || 'Finance',
        '{Payment_Details}': paymentDetails,
      };

      let result = rawText;
      Object.entries(replacements).forEach(([tag, val]) => {
        // Escape bracket/brace characters for RegExp safely
        const escaped = tag.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, '\\$1');
        result = result.replace(new RegExp(escaped, 'gi'), val);
      });

      return result;
    },
    [transaction, customerName, associatedVehicle, associatedAccount, runningBalance, statementDocUrl, formatCurrency]
  );

  // Smart Pre-selection of Template
  useEffect(() => {
    if (!isOpen || templates.length === 0 || !transaction || hasPreselectedRef.current) return;

    hasPreselectedRef.current = true;
    const isCredit = transaction.type === 'income' || transaction.entryType === 'CREDIT';

    let matched: TemplateOption | undefined;
    if (isCredit) {
      // Find "Transaction Receipt" or "Payment Received"
      matched = templates.find((t) => {
        const n = t.name.toLowerCase();
        return n.includes('receipt') || n.includes('payment received') || n.includes('confirmation');
      });
    } else {
      // Find "Payment Reminder" or "Statement Notification"
      matched = templates.find((t) => {
        const n = t.name.toLowerCase();
        return n.includes('statement notification') || n.includes('reminder') || n.includes('statement of account');
      });
    }

    if (!matched) {
      matched = templates.find((t) => t.name.toLowerCase().includes('statement notification')) || templates[0];
    }

    if (matched) {
      setSelectedTemplateId(matched.id);
    }
  }, [isOpen, templates, transaction]);

  // When selectedTemplateId changes, update subject and message body
  useEffect(() => {
    const tpl = templates.find((t) => t.id === selectedTemplateId);
    if (tpl) {
      setSubject(populateTemplate(tpl.subjectTemplate || 'Statement Notification'));
      setMessage(populateTemplate(tpl.bodyTemplate));
    }
  }, [selectedTemplateId, templates, populateTemplate]);

  // Filter templates for search
  const filteredTemplates = useMemo(() => {
    if (!templateSearchQuery.trim()) return templates;
    const q = templateSearchQuery.toLowerCase();
    return templates.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q) ||
        t.subjectTemplate.toLowerCase().includes(q)
    );
  }, [templates, templateSearchQuery]);

  const selectedTemplate = useMemo(() => {
    return templates.find((t) => t.id === selectedTemplateId);
  }, [templates, selectedTemplateId]);

  // ── SEND WHATSAPP ──
  const handleSendWhatsApp = () => {
    if (!recipientContact.trim()) {
      toast.error('Please enter a valid recipient WhatsApp phone number.');
      return;
    }

    const digits = formatWhatsAppNumber(recipientContact);
    if (!digits) {
      toast.error('The phone number format is invalid.');
      return;
    }

    let fullMessage = message;
    if (includePdfLink && statementDocUrl && !fullMessage.includes(statementDocUrl)) {
      fullMessage = `${fullMessage}\n\n📄 Statement PDF Document:\n${statementDocUrl}`;
    }

    const url = buildWaMeLink(digits, fullMessage);
    const opened = openWhatsAppLink(url);

    if (opened) {
      toast.success('Opening WhatsApp chat with pre-filled message...');
      // Log communication activity
      logCommunication({
        recipientType: 'customer',
        recipientId: transaction?.customerId || 'general',
        recipientName: customerName,
        recipientPhone: recipientContact,
        channel: 'whatsapp',
        direction: 'outbound',
        subject: `WhatsApp: ${selectedTemplate?.name || 'Statement Notification'}`,
        message: fullMessage,
        status: 'sent',
        module: 'finance',
        recordId: transaction?.id,
        senderEmail: user?.email || undefined,
        senderName: user?.displayName || undefined,
      });

      logWhatsappHistory({
        customerId: transaction?.customerId || 'general',
        customerName: customerName,
        phone: recipientContact,
        message: fullMessage,
        type: 'finance',
        status: 'sent',
        senderName: user?.displayName || 'Finance Officer',
      });
      onClose();
    } else {
      toast.error('Could not open WhatsApp. Please check popup permissions.');
    }
  };

  // ── SEND EMAIL ──
  const handleSendEmail = async () => {
    if (!recipientContact.trim() || !recipientContact.includes('@')) {
      toast.error('Please enter a valid recipient email address.');
      return;
    }
    if (!subject.trim()) {
      toast.error('Please provide an email subject line.');
      return;
    }
    if (!message.trim()) {
      toast.error('Message body cannot be empty.');
      return;
    }

    setSendingEmail(true);
    const toastId = toast.loading('Sending official financial email...');

    try {
      let finalBody = message;
      if (includePdfLink && statementDocUrl && !finalBody.includes(statementDocUrl)) {
        finalBody = `${finalBody}\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n📄 Direct Link to Statement PDF Document:\n${statementDocUrl}`;
      }

      const attachmentsToSend = customAttachments
        .filter((a) => a.selected && a.url)
        .map((a) => ({ filename: a.name, path: a.url }));

      if (includePdfLink && statementDocUrl) {
        attachmentsToSend.push({
          filename: `Statement_${transaction?.referenceId || transaction?.id.slice(-6)}.pdf`,
          path: statementDocUrl,
        });
      }

      await sendEmail({
        to: recipientContact.trim(),
        subject: subject.trim(),
        text: finalBody,
        html: `<div style="font-family: Arial, sans-serif; white-space: pre-wrap; line-height: 1.5; color: #1e293b;">${finalBody.replace(/\n/g, '<br/>')}</div>`,
        attachments: attachmentsToSend.length > 0 ? attachmentsToSend : undefined,
      });

      toast.success('Email sent successfully!', { id: toastId });

      // Log communication activity
      logCommunication({
        recipientType: 'customer',
        recipientId: transaction?.customerId || 'general',
        recipientName: customerName,
        recipientEmail: recipientContact,
        channel: 'email',
        direction: 'outbound',
        subject: subject.trim(),
        message: finalBody,
        status: 'sent',
        module: 'finance',
        recordId: transaction?.id,
        senderEmail: user?.email || undefined,
        senderName: user?.displayName || undefined,
      });

      logEmailHistory({
        customerId: transaction?.customerId || 'general',
        customerName: customerName,
        email: recipientContact,
        subject: subject.trim(),
        body: finalBody,
        type: 'finance',
        status: 'sent',
        senderName: user?.displayName || 'Finance Office',
      });

      onClose();
    } catch (err: any) {
      console.error('Failed to send email:', err);
      toast.error(`Email delivery failed: ${err?.message || 'Server error'}`, { id: toastId });
    } finally {
      setSendingEmail(false);
    }
  };

  // Copy text helper
  const handleCopyMessage = () => {
    let fullText = message;
    if (includePdfLink && statementDocUrl && !fullText.includes(statementDocUrl)) {
      fullText = `${fullText}\n\n📄 Statement PDF Document:\n${statementDocUrl}`;
    }
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    toast.success('Message copied to clipboard!');
    setTimeout(() => setCopied(false), 2500);
  };

  if (!isOpen || !transaction) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Communication Hub (Automation Templates)"
      size="2xl"
    >
      <div className="space-y-5 text-left text-slate-800">
        {/* Top Header Card with Quick Transaction Context */}
        <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                transaction.type === 'income' || transaction.entryType === 'CREDIT'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                  : 'bg-rose-500/20 text-rose-300 border border-rose-400/30'
              }`}>
                {transaction.type === 'income' || transaction.entryType === 'CREDIT' ? 'Credit Income' : 'Debit Expense'}
              </span>
              <span className="text-xs text-indigo-300 font-mono">
                Ref: {transaction.referenceId || transaction.id.slice(-8).toUpperCase()}
              </span>
            </div>
            <h3 className="text-base font-bold text-white tracking-tight">
              {transaction.description || 'General Account Transaction'}
            </h3>
            <p className="text-xs text-slate-300 flex items-center gap-2">
              <span>Customer: <strong className="text-white">{customerName}</strong></span>
              <span>•</span>
              <span>Amount: <strong className="text-emerald-400 font-mono">{formatCurrency(transaction.amount)}</strong></span>
              {runningBalance !== undefined && (
                <>
                  <span>•</span>
                  <span>Running Balance: <strong className="text-indigo-300 font-mono">{formatCurrency(runningBalance)}</strong></span>
                </>
              )}
            </p>
          </div>

          {/* Direct Link to Central Automation Control */}
          <div className="flex sm:flex-col items-end gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => {
                onClose();
                navigate(ROUTES.AUTOMATION);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600/60 hover:bg-indigo-600 text-white text-xs font-semibold rounded-xl border border-indigo-400/40 transition cursor-pointer shadow-xs"
              title="Open Automation Control to create or edit templates"
            >
              <Zap className="w-3.5 h-3.5 text-amber-300" />
              <span>Automation Control</span>
              <ExternalLink className="w-3 h-3 text-indigo-200" />
            </button>
            <span className="text-[10px] text-indigo-300/80">Central Template Hub</span>
          </div>
        </div>

        {/* Channel Switcher Tabs */}
        <div className="flex border-b border-slate-200">
          <button
            type="button"
            onClick={() => handleModeSwitch('whatsapp')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition cursor-pointer ${
              mode === 'whatsapp'
                ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <MessageCircle className={`w-4 h-4 ${mode === 'whatsapp' ? 'text-emerald-600' : 'text-slate-400'}`} />
            <span>WhatsApp Message</span>
          </button>

          <button
            type="button"
            onClick={() => handleModeSwitch('email')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition cursor-pointer ${
              mode === 'email'
                ? 'border-sky-600 text-sky-700 bg-sky-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Mail className={`w-4 h-4 ${mode === 'email' ? 'text-sky-600' : 'text-slate-400'}`} />
            <span>Email Communication</span>
          </button>
        </div>

        {/* Dynamic Template Selector (From Automation Control) */}
        <div className="bg-slate-50/80 border border-slate-200 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span>Dynamic Automation Template</span>
            </label>
            <span className="text-[11px] text-slate-500">
              Source: <strong className="text-indigo-600">Automation Control (Finance Folder)</strong>
            </span>
          </div>

          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setIsTemplateDropdownOpen(!isTemplateDropdownOpen)}
              className="w-full flex items-center justify-between px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-800 shadow-2xs hover:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
            >
              <div className="flex items-center gap-2 truncate">
                <span className="font-bold text-indigo-900">
                  {selectedTemplate?.name || 'Select a template...'}
                </span>
                {selectedTemplate && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 uppercase font-mono">
                    {selectedTemplate.category}
                  </span>
                )}
              </div>
              <RefreshCw className={`w-3.5 h-3.5 text-slate-400 ${loadingTemplates ? 'animate-spin' : ''}`} />
            </button>

            {isTemplateDropdownOpen && (
              <div className="absolute left-0 right-0 mt-1 z-30 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden animate-in fade-in">
                <div className="p-2 border-b border-slate-100 bg-slate-50">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                    <input
                      type="text"
                      placeholder="Search templates from Automation Control..."
                      value={templateSearchQuery}
                      onChange={(e) => setTemplateSearchQuery(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      autoFocus
                    />
                  </div>
                </div>

                <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 text-xs">
                  {filteredTemplates.map((tpl) => {
                    const isSelected = tpl.id === selectedTemplateId;
                    return (
                      <button
                        key={tpl.id}
                        type="button"
                        onClick={() => {
                          setSelectedTemplateId(tpl.id);
                          setIsTemplateDropdownOpen(false);
                        }}
                        className={`w-full text-left p-3 flex items-start justify-between gap-2 hover:bg-slate-50 cursor-pointer transition ${
                          isSelected ? 'bg-indigo-50/60 font-semibold' : ''
                        }`}
                      >
                        <div>
                          <p className="text-slate-800 font-bold">{tpl.name}</p>
                          <p className="text-[11px] text-slate-500 truncate mt-0.5 max-w-md">
                            {tpl.subjectTemplate || tpl.bodyTemplate.slice(0, 70)}...
                          </p>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-indigo-600 shrink-0" />}
                      </button>
                    );
                  })}
                  {filteredTemplates.length === 0 && (
                    <div className="p-4 text-center text-slate-400 text-xs">
                      No matching templates found.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Quick Variable Badges */}
          <div className="pt-1 flex flex-wrap items-center gap-1.5 text-[10px] text-slate-600">
            <span className="font-semibold text-slate-400">Auto-filled Variables:</span>
            <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 font-mono text-indigo-700">
              {'{Customer_Name}'}: {customerName}
            </span>
            <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 font-mono text-emerald-700">
              {'{Amount}'}: {formatCurrency(transaction.amount)}
            </span>
            <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 font-mono text-slate-700">
              {'{Transaction_Ref}'}: {transaction.referenceId || transaction.id.slice(-8).toUpperCase()}
            </span>
            <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 font-mono text-slate-700">
              {'{Date}'}: {formatDateValue(transaction.date)}
            </span>
            {runningBalance !== undefined && (
              <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 font-mono text-purple-700">
                {'{Running_Balance}'}: {formatCurrency(runningBalance)}
              </span>
            )}
          </div>
        </div>

        {/* Recipient Details & Subject Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
              {mode === 'whatsapp' ? 'Recipient WhatsApp Phone' : 'Recipient Email Address'}
            </label>
            <div className="relative">
              {mode === 'whatsapp' ? (
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              ) : (
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              )}
              <input
                type={mode === 'whatsapp' ? 'tel' : 'email'}
                placeholder={mode === 'whatsapp' ? 'e.g. 07552 553441 or 447552553441' : 'customer@example.com'}
                value={recipientContact}
                onChange={(e) => setRecipientContact(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-mono"
              />
            </div>
            {mode === 'whatsapp' && (
              <p className="text-[10px] text-slate-400 mt-1">
                Normalizes to international standard e.g. 447552553441 for direct wa.me chat.
              </p>
            )}
          </div>

          {mode === 'email' && (
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                Email Subject
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Subject line..."
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          )}
        </div>

        {/* Message Editor */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-bold text-slate-600 uppercase">
              Message Content (Resolved Dynamic Text)
            </label>
            <button
              type="button"
              onClick={handleCopyMessage}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 transition cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy Text'}</span>
            </button>
          </div>
          <textarea
            rows={mode === 'whatsapp' ? 8 : 10}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full p-3 text-xs border border-slate-300 rounded-xl font-sans focus:outline-none focus:ring-2 focus:ring-indigo-500/20 leading-relaxed"
            placeholder="Type your message or select an Automation template..."
          />
        </div>

        {/* Direct Attachment Link to Statement PDF */}
        {statementDocUrl && (
          <div className="p-3 bg-indigo-50/60 border border-indigo-200 rounded-xl flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 truncate">
              <FileText className="w-4 h-4 text-indigo-600 shrink-0" />
              <div className="truncate">
                <span className="font-bold text-indigo-900 block truncate">
                  Official Statement Document Attached
                </span>
                <span className="text-[11px] text-slate-500 truncate block font-mono">
                  {statementDocUrl}
                </span>
              </div>
            </div>
            <label className="flex items-center gap-2 cursor-pointer shrink-0 text-xs font-semibold text-indigo-900">
              <input
                type="checkbox"
                checked={includePdfLink}
                onChange={(e) => setIncludePdfLink(e.target.checked)}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span>Include Link</span>
            </label>
          </div>
        )}

        {/* Optional Custom Attachments for Email */}
        {mode === 'email' && (
          <div className="border border-slate-200 rounded-xl p-3 bg-white space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Paperclip className="w-3.5 h-3.5 text-slate-500" />
                <span>Custom Attachments &amp; Receipts</span>
              </span>
              <span className="text-[11px] text-slate-400">PDF, PNG, JPG</span>
            </div>
            <CustomAttachmentUploader
              attachments={customAttachments}
              onChange={setCustomAttachments}
              moduleContext="finance"
              recordId={transaction.id}
            />
          </div>
        )}

        {/* Modal Footer Controls */}
        <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition cursor-pointer"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyMessage}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5 text-slate-500" />
              <span>Copy</span>
            </button>

            {mode === 'whatsapp' ? (
              <button
                type="button"
                onClick={handleSendWhatsApp}
                className="inline-flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Open in WhatsApp</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSendEmail}
                disabled={sendingEmail}
                className="inline-flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-sky-600 to-indigo-700 hover:from-sky-700 hover:to-indigo-800 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                <span>{sendingEmail ? 'Sending Email...' : 'Send Email Now'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default TransactionCommunicationModal;
