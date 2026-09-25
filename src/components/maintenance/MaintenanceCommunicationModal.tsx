// src/components/maintenance/MaintenanceCommunicationModal.tsx

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import Modal from '../ui/Modal';
import { MaintenanceLog } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { usePermissions } from '../../hooks/usePermissions';
import {
  ResolvedMaintenanceContext,
  MaintenanceChannelMode,
  MaintenanceRecipientType,
  MaintenanceTemplateOption,
  fetchMaintenanceTemplates,
  replaceMaintenancePlaceholders,
  executeMaintenanceWhatsApp,
  executeMaintenanceEmail,
  resolveMaintenanceContext,
} from '../../utils/maintenanceCommunication';
import { MaintenanceTemplateSearchableSelect } from './MaintenanceTemplateSearchableSelect';
import { formatWhatsAppNumber, buildWaMeLink } from '../../utils/whatsapp';
import { Vehicle, Customer, Rental } from '../../types';
import {
  MessageCircle,
  Mail,
  Send,
  Copy,
  Check,
  ExternalLink,
  Car,
  User,
  Wrench,
  Calendar,
  AlertCircle,
  Sparkles,
  Loader2,
  Search,
  ChevronDown,
  RotateCcw,
  Paperclip,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { CustomAttachmentUploader } from '../common/CustomAttachmentUploader';
import { CustomAttachment } from '../../utils/attachmentUpload';

interface MaintenanceCommunicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  log?: MaintenanceLog | null;
  logs?: MaintenanceLog[];
  context?: ResolvedMaintenanceContext | null;
  vehicles?: Vehicle[];
  customers?: Customer[];
  rentals?: Rental[];
  initialMode?: MaintenanceChannelMode;
  initialRecipient?: MaintenanceRecipientType;
}

export const MaintenanceCommunicationModal: React.FC<
  MaintenanceCommunicationModalProps
> = ({
  isOpen,
  onClose,
  log,
  logs = [],
  context,
  vehicles = [],
  customers = [],
  rentals = [],
  initialMode = 'whatsapp',
  initialRecipient = 'driver',
}) => {
  const { user } = useAuth();
  const { can, isAdmin } = usePermissions();

  // Combine log and logs to ensure complete order list
  const availableLogs = useMemo(() => {
    const list = [...(logs || [])];
    if (log && !list.some((l) => l.id === log.id)) {
      list.unshift(log);
    }
    return list;
  }, [log, logs]);

  const [selectedLogId, setSelectedLogId] = useState<string>(log?.id || (availableLogs[0]?.id ?? ''));

  // Sync initial log when modal opens or log changes
  useEffect(() => {
    if (log?.id) {
      setSelectedLogId(log.id);
    } else if (availableLogs.length > 0 && !selectedLogId) {
      setSelectedLogId(availableLogs[0].id);
    }
  }, [log, availableLogs, selectedLogId]);

  const effLog = useMemo(() => {
    if (selectedLogId && availableLogs.length > 0) {
      return availableLogs.find((l) => l.id === selectedLogId) || availableLogs[0] || null;
    }
    if (log) return log;
    return availableLogs.length > 0 ? availableLogs[0] : null;
  }, [log, availableLogs, selectedLogId]);

  const effContext = useMemo(() => {
    if (context && effLog && effLog.id === log?.id) return context;
    if (!effLog) return null;
    const vMap: Record<string, Vehicle> = {};
    (vehicles || []).forEach((v) => {
      if (v.id) vMap[v.id] = v;
    });
    const cMap: Record<string, Customer> = {};
    (customers || []).forEach((c) => {
      if (c.id) cMap[c.id] = c;
    });
    return resolveMaintenanceContext(effLog, vMap, cMap, [], rentals || []);
  }, [context, effLog, log, vehicles, customers, rentals]);

  const canSendWhatsApp = isAdmin || can('maintenance', 'whatsapp') || can('maintenance', 'send');
  const canSendEmail = isAdmin || can('maintenance', 'email') || can('maintenance', 'send');

  const [mode, setMode] = useState<MaintenanceChannelMode>(() => {
    if (initialMode === 'whatsapp' && canSendWhatsApp) return 'whatsapp';
    if (initialMode === 'email' && canSendEmail) return 'email';
    return canSendWhatsApp ? 'whatsapp' : canSendEmail ? 'email' : 'whatsapp';
  });
  const [recipientType, setRecipientType] = useState<MaintenanceRecipientType>(initialRecipient);
  const [templates, setTemplates] = useState<MaintenanceTemplateOption[]>([]);
  const [, setLoadingTemplates] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');

  // Dropdown states for searchable dropdowns
  const [orderDropdownOpen, setOrderDropdownOpen] = useState(false);
  const [orderSearchQuery, setOrderSearchQuery] = useState('');
  const orderDropdownRef = useRef<HTMLDivElement>(null);

  const [recipientDropdownOpen, setRecipientDropdownOpen] = useState(false);
  const [recipientSearchQuery, setRecipientSearchQuery] = useState('');
  const recipientDropdownRef = useRef<HTMLDivElement>(null);

  // Manual editable contact fields
  const [recipientPhone, setRecipientPhone] = useState<string>('');
  const [recipientEmail, setRecipientEmail] = useState<string>('');
  const [isPhoneCustom, setIsPhoneCustom] = useState<boolean>(false);
  const [isEmailCustom, setIsEmailCustom] = useState<boolean>(false);

  const [subject, setSubject] = useState<string>('');
  const [baseMessage, setBaseMessage] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [isSending, setIsSending] = useState<boolean>(false);

  // Document attachment selection states
  const [includeWorkOrder, setIncludeWorkOrder] = useState<boolean>(false);
  const [includeInvoice, setIncludeInvoice] = useState<boolean>(false);
  const [includeHireAgreement, setIncludeHireAgreement] = useState<boolean>(false);
  const [includePermit, setIncludePermit] = useState<boolean>(false);
  const [customAttachments, setCustomAttachments] = useState<CustomAttachment[]>([]);

  // Default contact info computed from active context and recipient type
  const targetLog = effLog;
  const targetContext = effContext;

  const defaultPhone = useMemo(() => {
    if (!targetContext) return '';
    return recipientType === 'driver' ? (targetContext.driverPhone || '') : (targetContext.garagePhone || '');
  }, [targetContext, recipientType]);

  const defaultEmail = useMemo(() => {
    if (!targetContext) return '';
    return recipientType === 'driver' ? (targetContext.driverEmail || '') : (targetContext.garageEmail || '');
  }, [targetContext, recipientType]);

  // Sync initial state when modal opens
  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setRecipientType(initialRecipient);
      setIsPhoneCustom(false);
      setIsEmailCustom(false);
      setCopied(false);
      setCopiedLink(false);
      setIsSending(false);
      setOrderDropdownOpen(false);
      setRecipientDropdownOpen(false);
      setOrderSearchQuery('');
      setRecipientSearchQuery('');
      setIncludeWorkOrder(false);
      setIncludeInvoice(false);
      setIncludeHireAgreement(false);
      setIncludePermit(false);
      setCustomAttachments([]);
    } else {
      setCustomAttachments([]);
    }
  }, [isOpen, initialMode, initialRecipient]);

  // Sync defaults into phone and email inputs unless the user manually modified them
  useEffect(() => {
    if (!isOpen) return;
    if (!isPhoneCustom) {
      setRecipientPhone(defaultPhone);
    }
    if (!isEmailCustom) {
      setRecipientEmail(defaultEmail);
    }
  }, [isOpen, defaultPhone, defaultEmail, isPhoneCustom, isEmailCustom]);

  // Close dropdowns on outside clicks
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (orderDropdownRef.current && !orderDropdownRef.current.contains(event.target as Node)) {
        setOrderDropdownOpen(false);
      }
      if (recipientDropdownRef.current && !recipientDropdownRef.current.contains(event.target as Node)) {
        setRecipientDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Load templates strictly for active channel mode from centralized pages
  const fetchTemplates = React.useCallback(async () => {
    setLoadingTemplates(true);
    try {
      const items = await fetchMaintenanceTemplates(mode);
      setTemplates(items);
    } catch (err) {
      console.error('Failed to load maintenance templates:', err);
    } finally {
      setLoadingTemplates(false);
    }
  }, [mode]);

  useEffect(() => {
    if (!isOpen) return;
    fetchTemplates();
    const handleSync = () => fetchTemplates();
    window.addEventListener('template_saved', handleSync);
    window.addEventListener('template_deleted', handleSync);
    return () => {
      window.removeEventListener('template_saved', handleSync);
      window.removeEventListener('template_deleted', handleSync);
    };
  }, [isOpen, fetchTemplates]);

  // Auto-select template matching recipient & channel
  useEffect(() => {
    if (!isOpen || templates.length === 0) return;

    const isChanMatch = (ch?: string) => ch === mode || ch === 'all' || !ch;

    const current = templates.find((t) => t.id === selectedTemplateId);
    if (current && current.recipientType === recipientType && isChanMatch(current.channel)) {
      return;
    }

    let best = templates.find((t) => t.recipientType === recipientType && isChanMatch(t.channel));
    if (!best) {
      best = templates.find((t) => t.recipientType === recipientType);
    }
    if (!best && templates.length > 0) {
      best = templates.find((t) => isChanMatch(t.channel)) || templates[0];
    }
    if (best) {
      setSelectedTemplateId(best.id);
    }
  }, [isOpen, templates, recipientType, mode, selectedTemplateId]);

  // Handle template selection from searchable dropdown
  const handleTemplateSelect = (template: MaintenanceTemplateOption) => {
    setSelectedTemplateId(template.id);
    if (template.recipientType && template.recipientType !== recipientType) {
      handleSelectRecipient(template.recipientType);
    }
  };

  // Switch recipient and reset custom overrides to pull fresh defaults
  const handleSelectRecipient = (type: MaintenanceRecipientType) => {
    setRecipientType(type);
    setIsPhoneCustom(false);
    setIsEmailCustom(false);
    const newPhone = type === 'driver' ? (targetContext?.driverPhone || '') : (targetContext?.garagePhone || '');
    const newEmail = type === 'driver' ? (targetContext?.driverEmail || '') : (targetContext?.garageEmail || '');
    setRecipientPhone(newPhone);
    setRecipientEmail(newEmail);
    setRecipientDropdownOpen(false);
  };

  // Switch maintenance order and pull fresh defaults
  const handleSelectOrder = (orderId: string) => {
    setSelectedLogId(orderId);
    setIsPhoneCustom(false);
    setIsEmailCustom(false);
    setOrderDropdownOpen(false);
  };

  // Helper to construct formatted Attached Documents section for Maintenance
  const buildMaintenanceAttachedDocs = useCallback(() => {
    const lines: string[] = [];
    const origin = window.location.origin;

    if (includeWorkOrder && targetLog) {
      const logRef = targetLog.orderNumber || targetLog.id;
      const url = targetLog.invoiceUrl || `${origin}/view-document?maintenanceId=${encodeURIComponent(targetLog.id)}&docType=workOrder`;
      lines.push(`• Work Order #${logRef}:\n  ${url}`);
    }

    if (includeInvoice && targetLog) {
      const invUrl = (targetLog as any).invoiceDocumentUrl || targetLog.invoiceUrl || `${origin}/view-document?maintenanceId=${encodeURIComponent(targetLog.id)}&docType=invoice`;
      lines.push(`• Maintenance Invoice:\n  ${invUrl}`);
    }

    if (includeHireAgreement && (targetContext?.rentalAgreementNumber || (targetLog as any)?.rentalId)) {
      const rId = targetContext?.rentalAgreementNumber || (targetLog as any)?.rentalId;
      lines.push(`• Hire Agreement T&C:\n  ${origin}/doc/${encodeURIComponent(rId)}/hireAgreement`);
    }

    if (includePermit && (targetContext?.vehicleReg || targetLog?.vehicleReg)) {
      const vReg = targetContext?.vehicleReg || targetLog?.vehicleReg;
      lines.push(`• Vehicle Permit:\n  ${origin}/doc/${encodeURIComponent(vReg)}/permit`);
    }

    customAttachments
      .filter((a) => a.selected !== false && a.url && !a.isUploading)
      .forEach((a) => {
        lines.push(`• ${a.name}:\n  ${a.url}`);
      });

    if (lines.length === 0) return '';
    return `Attached Documents:\n${lines.join('\n')}`;
  }, [includeWorkOrder, includeInvoice, includeHireAgreement, includePermit, targetLog, targetContext, customAttachments]);

  // Update message body and subject whenever template or context changes (does NOT wipe out typed contact)
  useEffect(() => {
    if (!targetContext || !isOpen) return;

    const tmpl = templates.find((t) => t.id === selectedTemplateId);
    if (tmpl) {
      const replacedSubject = replaceMaintenancePlaceholders(
        tmpl.subjectTemplate,
        targetContext,
        recipientType
      );
      const replacedBody = replaceMaintenancePlaceholders(
        tmpl.bodyTemplate,
        targetContext,
        recipientType
      );
      setSubject(replacedSubject);
      setBaseMessage(replacedBody);
    }
  }, [selectedTemplateId, targetContext, recipientType, isOpen, templates]);

  // LIVE PREVIEW: Reflect document attachments and custom uploaded files in real-time
  useEffect(() => {
    const docs = buildMaintenanceAttachedDocs();
    if (!docs) {
      setMessage(baseMessage);
    } else {
      setMessage(`${baseMessage}\n\n${docs}`);
    }
  }, [baseMessage, buildMaintenanceAttachedDocs]);

  // Handle WhatsApp dispatch
  const handleOpenWhatsApp = async () => {
    if (!targetContext || !targetLog) return;
    if (!canSendWhatsApp) {
      toast.error('You do not have permission to send or dispatch WhatsApp messages for maintenance.');
      return;
    }
    const digits = formatWhatsAppNumber(recipientPhone);
    if (!digits) {
      toast.error('Please enter a valid phone number with country code (e.g. +44...).');
      return;
    }

    let finalMessage = (message || baseMessage || '').trim();
    const docs = buildMaintenanceAttachedDocs();
    if (docs && !finalMessage.includes(docs)) {
      finalMessage = `${finalMessage}\n\n${docs}`;
    }

    const allAttachments = customAttachments
      .filter((a) => a.selected !== false && a.url && !a.isUploading)
      .map((a) => a.url);

    try {
      await executeMaintenanceWhatsApp({
        phone: digits,
        message: finalMessage,
        recipientName: recipientType === 'driver' ? targetContext.driverName : targetContext.garageName,
        recipientType,
        log: targetLog,
        userName: user?.name || user?.email || 'Fleet Coordinator',
        attachments: allAttachments,
      });
      toast.success('Opened WhatsApp chat with pre-filled maintenance template!');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to open WhatsApp');
    }
  };

  // Handle Email dispatch
  const handleSendEmail = async () => {
    if (!targetContext || !targetLog) return;
    if (!canSendEmail) {
      toast.error('You do not have permission to send or dispatch emails for maintenance.');
      return;
    }
    if (!recipientEmail || !recipientEmail.includes('@')) {
      toast.error('Please provide a valid recipient email address.');
      return;
    }
    if (!subject.trim()) {
      toast.error('Subject line is required.');
      return;
    }

    let finalMessage = (message || baseMessage || '').trim();
    const docs = buildMaintenanceAttachedDocs();
    if (docs && !finalMessage.includes(docs)) {
      finalMessage = `${finalMessage}\n\n${docs}`;
    }

    if (!finalMessage.trim()) {
      toast.error('Message body cannot be empty.');
      return;
    }

    const emailAttachments = customAttachments
      .filter((a) => a.selected !== false && a.url && !a.isUploading)
      .map((a) => ({ filename: a.name, url: a.url }));

    setIsSending(true);
    const toastId = toast.loading(`Sending email to ${recipientEmail}...`);
    try {
      await executeMaintenanceEmail({
        toEmail: recipientEmail.trim(),
        toName: recipientType === 'driver' ? targetContext.driverName : targetContext.garageName,
        subject: subject.trim(),
        message: finalMessage,
        recipientType,
        log: targetLog,
        userName: user?.name || user?.email || 'Fleet Coordinator',
        attachments: emailAttachments.length > 0 ? emailAttachments : undefined,
      });
      toast.success('Maintenance email dispatched successfully!', { id: toastId });
      onClose();
    } catch (err: any) {
      console.error('Email sending failed:', err);
      toast.error(err?.message || 'Failed to send email. Check EmailJS configuration.', {
        id: toastId,
      });
    } finally {
      setIsSending(false);
    }
  };

  // Copy helpers
  const handleCopyMessage = () => {
    if (!message) return;
    navigator.clipboard.writeText(message);
    setCopied(true);
    toast.success('Message copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyWhatsAppLink = () => {
    const digits = formatWhatsAppNumber(recipientPhone);
    if (!digits) {
      toast.error('Valid phone number needed for WhatsApp link');
      return;
    }
    const url = buildWaMeLink(digits, message);
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    toast.success('WhatsApp link copied to clipboard');
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Filtered maintenance orders for searchable dropdown
  const filteredOrders = useMemo(() => {
    if (!orderSearchQuery.trim()) return availableLogs;
    const q = orderSearchQuery.toLowerCase().trim();
    return availableLogs.filter((l) => {
      const orderNum = (l.orderNumber || l.id || '').toLowerCase();
      const reg = (l.vehicleReg || '').toLowerCase();
      const type = (l.type || '').toLowerCase();
      const provider = (l.serviceProvider || '').toLowerCase();
      const status = (l.status || '').toLowerCase();
      return (
        orderNum.includes(q) ||
        reg.includes(q) ||
        type.includes(q) ||
        provider.includes(q) ||
        status.includes(q)
      );
    });
  }, [availableLogs, orderSearchQuery]);

  // Recipient options for searchable dropdown
  const recipientOptions = useMemo(() => {
    return [
      {
        id: 'driver' as MaintenanceRecipientType,
        title: 'Driver (Active Rental)',
        subtitle: targetContext?.driverName
          ? `${targetContext.driverName} • ${targetContext.driverPhone || targetContext.driverEmail || 'No contact on file'}`
          : 'No active rental driver assigned',
        icon: User,
        badge: targetContext?.rentalAgreementNumber ? `Agmt #${targetContext.rentalAgreementNumber}` : 'Rental Driver',
      },
      {
        id: 'garage' as MaintenanceRecipientType,
        title: 'Garage (Service Center / Provider)',
        subtitle: targetContext?.garageName
          ? `${targetContext.garageName} • ${targetContext.garageAddress || targetContext.garagePhone || 'Provider'}`
          : 'Service Center Provider',
        icon: Wrench,
        badge: 'Service Garage',
      },
    ];
  }, [targetContext]);

  const filteredRecipients = useMemo(() => {
    if (!recipientSearchQuery.trim()) return recipientOptions;
    const q = recipientSearchQuery.toLowerCase().trim();
    return recipientOptions.filter((r) => {
      return (
        r.title.toLowerCase().includes(q) ||
        r.subtitle.toLowerCase().includes(q) ||
        r.id.toLowerCase().includes(q)
      );
    });
  }, [recipientOptions, recipientSearchQuery]);

  if (!isOpen || !targetLog || !targetContext) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-3">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center ${
              mode === 'whatsapp'
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-sky-100 text-sky-700'
            }`}
          >
            {mode === 'whatsapp' ? (
              <MessageCircle className="w-5 h-5" />
            ) : (
              <Mail className="w-5 h-5" />
            )}
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900 leading-snug flex items-center gap-2">
              Maintenance {mode === 'whatsapp' ? 'WhatsApp' : 'Email'} Dispatch
              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-700 border border-gray-200 font-mono">
                {targetContext.orderNumber}
              </span>
            </h3>
            <p className="text-xs text-gray-500 font-normal">
              Vehicle {targetContext.vehicleReg} • {targetContext.serviceType}
            </p>
          </div>
        </div>
      }
      size="xl"
    >
      <div className="space-y-4 pt-1">
        {/* ROW 1: SEARCHABLE DROPDOWNS (SELECT MAINTENANCE ORDER & RECIPIENT) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* 1. SELECT MAINTENANCE ORDER (SEARCHABLE DROPDOWN) */}
          <div className="relative" ref={orderDropdownRef}>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              Select Maintenance Order:
            </label>
            <button
              type="button"
              onClick={() => {
                setOrderDropdownOpen((prev) => !prev);
                setRecipientDropdownOpen(false);
              }}
              className="w-full flex items-center justify-between px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs text-left shadow-2xs hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2 truncate">
                <span className="font-bold text-blue-900 font-mono">
                  {targetLog.orderNumber || targetLog.id}
                </span>
                <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-700 font-mono font-semibold text-[11px]">
                  {targetLog.vehicleReg || 'Vehicle'}
                </span>
                <span className="text-gray-500 truncate text-[11px]">
                  ({targetLog.type || 'Service'})
                </span>
              </div>
              <ChevronDown className="w-4 h-4 text-gray-400 shrink-0 ml-1.5" />
            </button>

            {/* Floating Dropdown for Orders */}
            {orderDropdownOpen && (
              <div className="absolute z-50 mt-1.5 w-full bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                <div className="p-2 border-b border-gray-100 bg-gray-50">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      autoFocus
                      value={orderSearchQuery}
                      onChange={(e) => setOrderSearchQuery(e.target.value)}
                      placeholder="Search order #, reg, type, garage..."
                      className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-gray-200 rounded-lg text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="max-h-56 overflow-y-auto divide-y divide-gray-100">
                  {filteredOrders.length === 0 ? (
                    <div className="p-3 text-center text-xs text-gray-400">
                      No matching maintenance orders found.
                    </div>
                  ) : (
                    filteredOrders.map((ord) => {
                      const isSelected = ord.id === effLog?.id;
                      return (
                        <button
                          key={ord.id}
                          type="button"
                          onClick={() => handleSelectOrder(ord.id)}
                          className={`w-full text-left px-3 py-2 text-xs transition-colors flex items-center justify-between cursor-pointer ${
                            isSelected
                              ? 'bg-blue-50 text-blue-900 font-semibold'
                              : 'hover:bg-gray-50 text-gray-800'
                          }`}
                        >
                          <div className="truncate mr-2">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-bold text-gray-900">
                                {ord.orderNumber || ord.id}
                              </span>
                              <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-700 text-[10px] font-mono font-semibold">
                                {ord.vehicleReg || 'N/A'}
                              </span>
                            </div>
                            <div className="text-[11px] text-gray-500 truncate mt-0.5">
                              {ord.type || 'Service'} • {ord.serviceProvider || 'Garage'}
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

          {/* 2. RECIPIENT SELECTION (SEARCHABLE DROPDOWN) */}
          <div className="relative" ref={recipientDropdownRef}>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              Select Recipient:
            </label>
            <button
              type="button"
              onClick={() => {
                setRecipientDropdownOpen((prev) => !prev);
                setOrderDropdownOpen(false);
              }}
              className="w-full flex items-center justify-between px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs text-left shadow-2xs hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2 truncate">
                {recipientType === 'driver' ? (
                  <User className="w-4 h-4 text-blue-600 shrink-0" />
                ) : (
                  <Wrench className="w-4 h-4 text-amber-600 shrink-0" />
                )}
                <span className="font-bold text-gray-900">
                  {recipientType === 'driver' ? 'Driver (Active Rental)' : 'Garage / Service Center'}
                </span>
                <span className="text-gray-500 text-[11px] truncate">
                  {recipientType === 'driver'
                    ? targetContext.driverName || '(Unassigned)'
                    : targetContext.garageName}
                </span>
              </div>
              <ChevronDown className="w-4 h-4 text-gray-400 shrink-0 ml-1.5" />
            </button>

            {/* Floating Dropdown for Recipients */}
            {recipientDropdownOpen && (
              <div className="absolute z-50 mt-1.5 w-full bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                <div className="p-2 border-b border-gray-100 bg-gray-50">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      autoFocus
                      value={recipientSearchQuery}
                      onChange={(e) => setRecipientSearchQuery(e.target.value)}
                      placeholder="Search recipient (driver or garage)..."
                      className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-gray-200 rounded-lg text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="max-h-56 overflow-y-auto divide-y divide-gray-100">
                  {filteredRecipients.length === 0 ? (
                    <div className="p-3 text-center text-xs text-gray-400">
                      No matching recipient types.
                    </div>
                  ) : (
                    filteredRecipients.map((rec) => {
                      const isSelected = rec.id === recipientType;
                      const IconComp = rec.icon;
                      return (
                        <button
                          key={rec.id}
                          type="button"
                          onClick={() => handleSelectRecipient(rec.id)}
                          className={`w-full text-left px-3 py-2 text-xs transition-colors flex items-center justify-between cursor-pointer ${
                            isSelected
                              ? 'bg-blue-50 text-blue-900 font-semibold'
                              : 'hover:bg-gray-50 text-gray-800'
                          }`}
                        >
                          <div className="flex items-start gap-2.5 mr-2">
                            <div className="mt-0.5 p-1 rounded-md bg-gray-100 text-gray-700">
                              <IconComp className="w-3.5 h-3.5" />
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-semibold text-gray-900">{rec.title}</span>
                                <span className="px-1.5 py-0.2 rounded bg-gray-100 text-gray-600 text-[10px]">
                                  {rec.badge}
                                </span>
                              </div>
                              <div className="text-[11px] text-gray-500 mt-0.5">
                                {rec.subtitle}
                              </div>
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
        </div>

        {/* ROW 2: CHANNEL SWITCHER (WHATSAPP VS EMAIL) */}
        <div className="flex items-center justify-between p-2.5 bg-gray-50 rounded-xl border border-gray-200 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
              Dispatch Channel:
            </span>
            <div className="inline-flex p-1 bg-gray-200/80 rounded-xl">
              <button
                type="button"
                onClick={() => setMode('whatsapp')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  mode === 'whatsapp'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <MessageCircle className="w-3.5 h-3.5" />
                WhatsApp
              </button>
              <button
                type="button"
                onClick={() => setMode('email')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  mode === 'email'
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Mail className="w-3.5 h-3.5" />
                Email
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span className="inline-flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-gray-400" />
              <strong>Date:</strong> {targetContext.scheduledDate}
            </span>
            <span className="inline-flex items-center gap-1 font-mono">
              <Car className="w-3.5 h-3.5 text-gray-400" />
              <strong>Reg:</strong> {targetContext.vehicleReg}
            </span>
          </div>
        </div>

        {/* WARNING IF DRIVER HAS NO ACTIVE RENTAL */}
        {recipientType === 'driver' && !targetContext.hasActiveRental && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-800">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Notice: No Active Rental Assigned</p>
              <p className="text-amber-700 text-[11px] mt-0.5">
                Vehicle {targetContext.vehicleReg} currently has no active rental contract. You can type recipient contact details manually or switch recipient to "Garage".
              </p>
            </div>
          </div>
        )}

        {/* TEMPLATE SELECTION (SEARCHABLE SELECT WITH ZERO MANAGEMENT LINKS) */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
              Select Active Template:
            </label>
            <span className="text-[11px] text-gray-400 font-medium">
              Source: Automation Control (Maintenance &amp; Custom folders)
            </span>
          </div>
          <MaintenanceTemplateSearchableSelect
            templates={templates}
            selectedTemplateId={selectedTemplateId}
            onSelectTemplate={handleTemplateSelect}
            currentChannel={mode}
            currentRecipientType={recipientType}
            label=""
            placeholder="Search templates by keyword, channel, or recipient..."
          />
        </div>

        {/* MANUAL INPUT FOR CONTACT INFO (FULL OVERRIDE & TEXT TYPING SUPPORT) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Contact Input Field (WhatsApp Phone or Email Address) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-gray-700">
                {mode === 'whatsapp' ? 'Recipient WhatsApp Phone Number:' : 'Recipient Email Address:'}
              </label>
              {(mode === 'whatsapp' ? isPhoneCustom : isEmailCustom) && (
                <button
                  type="button"
                  onClick={() => {
                    if (mode === 'whatsapp') {
                      setRecipientPhone(defaultPhone);
                      setIsPhoneCustom(false);
                    } else {
                      setRecipientEmail(defaultEmail);
                      setIsEmailCustom(false);
                    }
                  }}
                  className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-800 font-medium cursor-pointer"
                  title="Revert back to default contact on record"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset to default</span>
                </button>
              )}
            </div>

            {mode === 'whatsapp' ? (
              <div>
                <input
                  type="tel"
                  value={recipientPhone}
                  onChange={(e) => {
                    setRecipientPhone(e.target.value);
                    setIsPhoneCustom(true);
                  }}
                  placeholder="e.g. +447999558801 or 07999558801"
                  className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-xs text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
                <div className="flex items-center justify-between text-[10px] text-gray-500 mt-1">
                  <span>Formats automatically to international format (UK +44 by default) for wa.me.</span>
                  {isPhoneCustom && (
                    <span className="text-amber-600 font-semibold">Custom number entered</span>
                  )}
                </div>
              </div>
            ) : (
              <div>
                <input
                  type="email"
                  value={recipientEmail}
                  onChange={(e) => {
                    setRecipientEmail(e.target.value);
                    setIsEmailCustom(true);
                  }}
                  placeholder="e.g. recipient@example.com"
                  className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-xs text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
                <div className="flex items-center justify-between text-[10px] text-gray-500 mt-1">
                  <span>Manual email entry supported for custom dispatches.</span>
                  {isEmailCustom && (
                    <span className="text-amber-600 font-semibold">Custom email entered</span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Email Subject Line (When Email) OR Recipient Details (When WhatsApp) */}
          {mode === 'email' ? (
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Email Subject Line:
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Subject line"
                className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-xs text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
              <p className="text-[10px] text-gray-500 mt-1">
                Editable subject line populated from template placeholders.
              </p>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Target Recipient Name & Details:
              </label>
              <div className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-700 flex items-center justify-between">
                <span className="font-semibold text-gray-900 truncate">
                  {recipientType === 'driver'
                    ? targetContext.driverName || 'No Active Driver'
                    : targetContext.garageName}
                </span>
                <span className="text-[11px] text-gray-500 font-mono shrink-0 ml-2">
                  {recipientType === 'driver'
                    ? (targetContext.rentalAgreementNumber ? `Agmt #${targetContext.rentalAgreementNumber}` : 'Rental')
                    : (targetContext.garageAddress ? targetContext.garageAddress.slice(0, 24) : 'Service Center')}
                </span>
              </div>
              <p className="text-[10px] text-gray-500 mt-1">
                {recipientType === 'driver' ? 'Associated rental driver on file.' : 'Assigned service center provider.'}
              </p>
            </div>
          )}
        </div>

        {/* Document Attachment Selection (Instant Links & Custom Uploads) */}
        <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 shadow-2xs attachment-container" data-attachment-box="true">
          <div className="flex items-center justify-between mb-2.5 flex-wrap gap-2">
            <div className="flex items-center space-x-2">
              <Paperclip className="w-4 h-4 text-indigo-600" />
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider attachment-title">
                Attach Documents (Instant Links)
              </span>
              {(includeWorkOrder || includeInvoice || includeHireAgreement || includePermit || customAttachments.some((a) => a.selected)) && (
                <span className="px-2 py-0.5 text-[11px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200 rounded-full">
                  {[includeWorkOrder, includeInvoice, includeHireAgreement, includePermit].filter(Boolean).length +
                    customAttachments.filter((a) => a.selected).length}{' '}
                  selected
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {/* Predefined Work Order Card */}
            <label
              className={`flex items-start gap-2.5 p-3 rounded-xl border text-xs cursor-pointer select-none transition-all ${
                includeWorkOrder
                  ? 'bg-indigo-50/70 border-indigo-300 ring-1 ring-indigo-400/20 shadow-2xs'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <input
                type="checkbox"
                checked={includeWorkOrder}
                onChange={() => setIncludeWorkOrder((p) => !p)}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer shrink-0"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-sm font-bold text-slate-900 leading-snug block truncate">
                    Work Order #{targetLog.orderNumber || targetLog.id}
                  </span>
                  {includeWorkOrder && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md border border-emerald-300 shrink-0">
                      <Check className="w-3 h-3 text-emerald-600 stroke-[2.5]" />
                      Ready
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                    Work Order
                  </span>
                  {includeWorkOrder && (
                    <span className="text-[11px] text-emerald-700 font-semibold truncate">
                      Instant link attached
                    </span>
                  )}
                </div>
              </div>
            </label>

            {/* Predefined Invoice Card */}
            <label
              className={`flex items-start gap-2.5 p-3 rounded-xl border text-xs cursor-pointer select-none transition-all ${
                includeInvoice
                  ? 'bg-indigo-50/70 border-indigo-300 ring-1 ring-indigo-400/20 shadow-2xs'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <input
                type="checkbox"
                checked={includeInvoice}
                onChange={() => setIncludeInvoice((p) => !p)}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer shrink-0"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-sm font-bold text-slate-900 leading-snug block truncate">
                    Maintenance Invoice
                  </span>
                  {includeInvoice && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md border border-emerald-300 shrink-0">
                      <Check className="w-3 h-3 text-emerald-600 stroke-[2.5]" />
                      Ready
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                    Invoice
                  </span>
                </div>
              </div>
            </label>

            {/* Optional Rental Agreement Card if linked */}
            {(targetContext?.rentalAgreementNumber || (targetLog as any)?.rentalId) && (
              <label
                className={`flex items-start gap-2.5 p-3 rounded-xl border text-xs cursor-pointer select-none transition-all ${
                  includeHireAgreement
                    ? 'bg-indigo-50/70 border-indigo-300 ring-1 ring-indigo-400/20 shadow-2xs'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <input
                  type="checkbox"
                  checked={includeHireAgreement}
                  onChange={() => setIncludeHireAgreement((p) => !p)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm font-bold text-slate-900 leading-snug block truncate">
                      Hire Agreement T&C
                    </span>
                    {includeHireAgreement && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md border border-emerald-300 shrink-0">
                        <Check className="w-3 h-3 text-emerald-600 stroke-[2.5]" />
                        Ready
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                      Rental Agreement
                    </span>
                  </div>
                </div>
              </label>
            )}

            {/* Optional Vehicle Permit Card if linked */}
            {(targetContext?.vehicleReg || targetLog?.vehicleReg) && (
              <label
                className={`flex items-start gap-2.5 p-3 rounded-xl border text-xs cursor-pointer select-none transition-all ${
                  includePermit
                    ? 'bg-indigo-50/70 border-indigo-300 ring-1 ring-indigo-400/20 shadow-2xs'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <input
                  type="checkbox"
                  checked={includePermit}
                  onChange={() => setIncludePermit((p) => !p)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm font-bold text-slate-900 leading-snug block truncate">
                      Parking Permit
                    </span>
                    {includePermit && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md border border-emerald-300 shrink-0">
                        <Check className="w-3 h-3 text-emerald-600 stroke-[2.5]" />
                        Ready
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                      Permit
                    </span>
                  </div>
                </div>
              </label>
            )}
          </div>

          {/* Upload Additional File / Custom Attachment Input */}
          <div className="mt-3 pt-3 border-t border-slate-200">
            <CustomAttachmentUploader
              attachments={customAttachments}
              onChange={setCustomAttachments}
              moduleContext="maintenance"
              recordId={targetLog?.id}
            />
          </div>
        </div>

        {/* MESSAGE BODY (EDITABLE & PREVIEW) */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold text-gray-700">
              Message Content (Placeholders Replaced & Editable):
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyMessage}
                className="inline-flex items-center gap-1 text-[11px] text-indigo-600 hover:text-indigo-800 font-medium cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied!' : 'Copy Message'}
              </button>
            </div>
          </div>
          <textarea
            rows={mode === 'whatsapp' ? 8 : 10}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full bg-white border border-gray-300 rounded-xl p-3 text-xs text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono leading-relaxed"
          />
        </div>

        {/* PLACEHOLDERS CHEAT SHEET */}
        <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
          <div className="flex items-center gap-1.5 text-xs font-bold text-gray-700 mb-2">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            <span>Active Placeholders Context:</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
            <div className="bg-white p-2 rounded-lg border border-gray-200">
              <span className="text-gray-400 block text-[10px]">{'{driver_name}'}</span>
              <span className="font-semibold text-gray-800 truncate block">{targetContext.driverName || 'N/A'}</span>
            </div>
            <div className="bg-white p-2 rounded-lg border border-gray-200">
              <span className="text-gray-400 block text-[10px]">{'{vehicle_reg}'}</span>
              <span className="font-semibold text-gray-800 truncate block">{targetContext.vehicleReg}</span>
            </div>
            <div className="bg-white p-2 rounded-lg border border-gray-200">
              <span className="text-gray-400 block text-[10px]">{'{maintenance_id}'}</span>
              <span className="font-semibold text-gray-800 truncate block">{targetContext.orderNumber}</span>
            </div>
            <div className="bg-white p-2 rounded-lg border border-gray-200">
              <span className="text-gray-400 block text-[10px]">{'{service_type}'}</span>
              <span className="font-semibold text-gray-800 truncate block">{targetContext.serviceType}</span>
            </div>
            <div className="bg-white p-2 rounded-lg border border-gray-200">
              <span className="text-gray-400 block text-[10px]">{'{date_time}'}</span>
              <span className="font-semibold text-gray-800 truncate block">{targetContext.scheduledDateTime}</span>
            </div>
            <div className="bg-white p-2 rounded-lg border border-gray-200">
              <span className="text-gray-400 block text-[10px]">{'{time}'}</span>
              <span className="font-semibold text-gray-800 truncate block">{targetContext.scheduledTime || 'N/A'}</span>
            </div>
            <div className="bg-white p-2 rounded-lg border border-gray-200">
              <span className="text-gray-400 block text-[10px]">{'{additional_notes}'}</span>
              <span className="font-semibold text-gray-800 truncate block">{targetContext.additionalNotes || '(None)'}</span>
            </div>
            <div className="bg-white p-2 rounded-lg border border-gray-200">
              <span className="text-gray-400 block text-[10px]">{'{garage_name}'}</span>
              <span className="font-semibold text-gray-800 truncate block">{targetContext.garageName}</span>
            </div>
          </div>
        </div>

        {/* BOTTOM ACTION BUTTONS */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-2 border-t border-gray-200">
          <div className="text-xs text-gray-500">
            {mode === 'whatsapp' ? (
              <span>Opens direct wa.me link and records to WhatsApp history.</span>
            ) : (
              <span>Dispatches via EmailJS and records to Email audit history.</span>
            )}
          </div>

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-100 rounded-xl transition cursor-pointer"
            >
              Cancel
            </button>

            {mode === 'whatsapp' ? (
              <>
                <button
                  type="button"
                  onClick={handleCopyWhatsAppLink}
                  disabled={!canSendWhatsApp}
                  className="px-3.5 py-2 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  title={!canSendWhatsApp ? "Permission required to use WhatsApp" : undefined}
                >
                  {copiedLink ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedLink ? 'Link Copied' : 'Copy Direct Link'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleOpenWhatsApp}
                  disabled={!canSendWhatsApp}
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-xl transition flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  title={!canSendWhatsApp ? "Permission required to dispatch WhatsApp messages" : undefined}
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Open WhatsApp Direct</span>
                  <ExternalLink className="w-3 h-3 ml-0.5 opacity-80" />
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={handleSendEmail}
                disabled={isSending || !canSendEmail}
                className="px-5 py-2 text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 active:bg-sky-800 disabled:opacity-50 rounded-xl transition flex items-center gap-1.5 shadow-sm cursor-pointer disabled:cursor-not-allowed"
                title={!canSendEmail ? "Permission required to dispatch emails" : undefined}
              >
                {isSending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Sending Email...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Send Email Now</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default MaintenanceCommunicationModal;
