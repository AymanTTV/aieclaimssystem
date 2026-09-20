// src/components/maintenance/MaintenanceCommunicationModal.tsx

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Modal from '../ui/Modal';
import { MaintenanceLog } from '../../types';
import { useAuth } from '../../context/AuthContext';
import {
  ResolvedMaintenanceContext,
  MaintenanceChannelMode,
  MaintenanceRecipientType,
  MaintenanceTemplateOption,
  fetchMaintenanceTemplates,
  replaceMaintenancePlaceholders,
  executeMaintenanceWhatsApp,
  executeMaintenanceEmail,
} from '../../utils/maintenanceCommunication';
import { formatWhatsAppNumber, buildWaMeLink } from '../../utils/whatsapp';
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
  Info,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface MaintenanceCommunicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  log: MaintenanceLog | null;
  context: ResolvedMaintenanceContext | null;
  initialMode?: MaintenanceChannelMode;
  initialRecipient?: MaintenanceRecipientType;
}

export const MaintenanceCommunicationModal: React.FC<
  MaintenanceCommunicationModalProps
> = ({
  isOpen,
  onClose,
  log,
  context,
  initialMode = 'whatsapp',
  initialRecipient = 'driver',
}) => {
  const { user } = useAuth();

  const [mode, setMode] = useState<MaintenanceChannelMode>(initialMode);
  const [recipientType, setRecipientType] = useState<MaintenanceRecipientType>(initialRecipient);
  const [templates, setTemplates] = useState<MaintenanceTemplateOption[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');

  // Editable fields
  const [recipientContact, setRecipientContact] = useState<string>('');
  const [subject, setSubject] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [isSending, setIsSending] = useState<boolean>(false);

  // Sync initial state when modal opens
  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setRecipientType(initialRecipient);
      setCopied(false);
      setCopiedLink(false);
      setIsSending(false);
    }
  }, [isOpen, initialMode, initialRecipient]);

  // Load templates
  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;
    setLoadingTemplates(true);

    fetchMaintenanceTemplates()
      .then((items) => {
        if (isMounted) {
          setTemplates(items);
        }
      })
      .catch((err) => {
        console.error('Failed to load maintenance templates:', err);
      })
      .finally(() => {
        if (isMounted) setLoadingTemplates(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  // Filter templates relevant for current channel & recipient
  const relevantTemplates = useMemo(() => {
    return templates.filter((t) => {
      // Prioritize matching recipientType
      const matchRecipient = t.recipientType === recipientType;
      // Secondary preference for channel
      return matchRecipient;
    });
  }, [templates, recipientType]);

  // Auto-select best template whenever recipient or mode changes
  useEffect(() => {
    if (!isOpen || templates.length === 0) return;

    // Try finding exact match for recipientType AND channel
    let best = templates.find(
      (t) => t.recipientType === recipientType && t.channel === mode
    );

    // Fallback to matching recipient
    if (!best) {
      best = templates.find((t) => t.recipientType === recipientType);
    }

    // Fallback to first available
    if (!best && templates.length > 0) {
      best = templates[0];
    }

    if (best) {
      setSelectedTemplateId(best.id);
    }
  }, [isOpen, templates, recipientType, mode]);

  // Update contact details and message body whenever template, context, or recipient changes
  useEffect(() => {
    if (!context || !isOpen) return;

    // 1. Update contact info based on recipient and mode
    if (recipientType === 'driver') {
      setRecipientContact(mode === 'whatsapp' ? context.driverPhone : context.driverEmail);
    } else {
      setRecipientContact(mode === 'whatsapp' ? context.garagePhone : context.garageEmail);
    }

    // 2. Resolve template content
    const tmpl = templates.find((t) => t.id === selectedTemplateId);
    if (tmpl) {
      const replacedSubject = replaceMaintenancePlaceholders(
        tmpl.subjectTemplate,
        context,
        recipientType
      );
      const replacedBody = replaceMaintenancePlaceholders(
        tmpl.bodyTemplate,
        context,
        recipientType
      );
      setSubject(replacedSubject);
      setMessage(replacedBody);
    }
  }, [selectedTemplateId, context, recipientType, mode, isOpen, templates]);

  // Handle WhatsApp dispatch
  const handleOpenWhatsApp = async () => {
    if (!context || !log) return;
    const digits = formatWhatsAppNumber(recipientContact);
    if (!digits) {
      toast.error('Please enter a valid phone number with country code (e.g. +44...).');
      return;
    }

    try {
      await executeMaintenanceWhatsApp({
        phone: digits,
        message,
        recipientName: recipientType === 'driver' ? context.driverName : context.garageName,
        recipientType,
        log,
        userName: user?.name || user?.email || 'Fleet Coordinator',
      });
      toast.success('Opened WhatsApp chat with pre-filled maintenance template!');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to open WhatsApp');
    }
  };

  // Handle Email dispatch
  const handleSendEmail = async () => {
    if (!context || !log) return;
    if (!recipientContact || !recipientContact.includes('@')) {
      toast.error('Please provide a valid recipient email address.');
      return;
    }
    if (!subject.trim()) {
      toast.error('Subject line is required.');
      return;
    }
    if (!message.trim()) {
      toast.error('Message body cannot be empty.');
      return;
    }

    setIsSending(true);
    const toastId = toast.loading(`Sending email to ${recipientContact}...`);
    try {
      await executeMaintenanceEmail({
        toEmail: recipientContact.trim(),
        toName: recipientType === 'driver' ? context.driverName : context.garageName,
        subject: subject.trim(),
        message: message.trim(),
        recipientType,
        log,
        userName: user?.name || user?.email || 'Fleet Coordinator',
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
    const digits = formatWhatsAppNumber(recipientContact);
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

  if (!isOpen || !log || !context) return null;

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
              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-700 border border-gray-200">
                {context.orderNumber}
              </span>
            </h3>
            <p className="text-xs text-gray-500 font-normal">
              Vehicle {context.vehicleReg} • {context.serviceType}
            </p>
          </div>
        </div>
      }
      size="xl"
    >
      <div className="space-y-4 pt-1">
        {/* TOP CONTROLS BAR: RECIPIENT TOGGLE & CHANNEL TOGGLE */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 bg-gray-50 rounded-2xl border border-gray-200">
          {/* Recipient Switcher */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-gray-600 mr-1 hidden sm:inline">
              Recipient:
            </span>
            <div className="inline-flex p-1 bg-gray-200/80 rounded-xl">
              <button
                type="button"
                onClick={() => setRecipientType('driver')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  recipientType === 'driver'
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                Send to Driver (Active Rental)
              </button>
              <button
                type="button"
                onClick={() => setRecipientType('garage')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  recipientType === 'garage'
                    ? 'bg-white text-amber-700 shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Wrench className="w-3.5 h-3.5" />
                Send to Garage
              </button>
            </div>
          </div>

          {/* Channel Switcher */}
          <div className="flex items-center gap-1.5 justify-end">
            <span className="text-xs font-semibold text-gray-600 mr-1 hidden sm:inline">
              Channel:
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
        </div>

        {/* Dynamic Warning for Driver when no active rental exists */}
        {recipientType === 'driver' && !context.hasActiveRental && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-800">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Notice: No Active Rental Assigned</p>
              <p className="text-amber-700 text-[11px] mt-0.5">
                Vehicle {context.vehicleReg} currently has no active rental record. Please enter contact details manually or switch recipient to "Send to Garage".
              </p>
            </div>
          </div>
        )}

        {/* RECIPIENT SUMMARY BADGE */}
        <div
          className={`p-3 rounded-xl border text-xs flex flex-wrap items-center justify-between gap-2 ${
            recipientType === 'driver'
              ? 'bg-blue-50/70 border-blue-200 text-blue-900'
              : 'bg-amber-50/70 border-amber-200 text-amber-900'
          }`}
        >
          <div className="flex items-center gap-2">
            {recipientType === 'driver' ? (
              <User className="w-4 h-4 text-blue-600" />
            ) : (
              <Wrench className="w-4 h-4 text-amber-600" />
            )}
            <div>
              <span className="font-bold">
                {recipientType === 'driver' ? 'Active Rental Driver:' : 'Garage / Service Center:'}
              </span>{' '}
              <span className="font-semibold">
                {recipientType === 'driver'
                  ? context.driverName || 'No Active Driver Assigned'
                  : context.garageName}
              </span>
              {recipientType === 'driver' && context.rentalAgreementNumber && (
                <span className="text-blue-700 text-[11px] ml-1.5 font-medium bg-blue-100/70 px-1.5 py-0.5 rounded">
                  Agreement #{context.rentalAgreementNumber}
                </span>
              )}
              {recipientType === 'garage' && context.garageAddress && (
                <span className="text-gray-600 text-[11px] ml-1.5">
                  ({context.garageAddress})
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 text-[11px]">
            <span className="inline-flex items-center gap-1 font-mono">
              <strong>Reg:</strong> {context.vehicleReg}
            </span>
            <span className="inline-flex items-center gap-1">
              <strong>Scheduled:</strong> {context.scheduledDate}
            </span>
          </div>
        </div>

        {/* TEMPLATE SELECTION */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-gray-700">
            Select Active Template:
          </label>
          <div className="relative">
            <select
              value={selectedTemplateId}
              onChange={(e) => setSelectedTemplateId(e.target.value)}
              className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-xs text-gray-800 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-medium"
            >
              {relevantTemplates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.channel.toUpperCase()})
                </option>
              ))}
              {templates
                .filter((t) => t.recipientType !== recipientType)
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    [Other] {t.name}
                  </option>
                ))}
            </select>
          </div>
        </div>

        {/* RECIPIENT CONTACT INPUT */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              {mode === 'whatsapp' ? 'Recipient WhatsApp Phone Number:' : 'Recipient Email Address:'}
            </label>
            <input
              type={mode === 'whatsapp' ? 'tel' : 'email'}
              value={recipientContact}
              onChange={(e) => setRecipientContact(e.target.value)}
              placeholder={
                mode === 'whatsapp'
                  ? 'e.g. +447999558801 or 07999558801'
                  : 'e.g. recipient@example.com'
              }
              className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-xs text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
            {mode === 'whatsapp' && (
              <p className="text-[10px] text-gray-500 mt-1">
                Formats automatically to international format (UK +44 by default) for wa.me link.
              </p>
            )}
          </div>

          {mode === 'email' && (
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Email Subject Line:
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Subject"
                className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-xs text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          )}
        </div>

        {/* MESSAGE BODY (EDITABLE & PREVIEW) */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-semibold text-gray-700">
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
            rows={mode === 'whatsapp' ? 9 : 11}
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
              <span className="font-semibold text-gray-800 truncate block">{context.driverName}</span>
            </div>
            <div className="bg-white p-2 rounded-lg border border-gray-200">
              <span className="text-gray-400 block text-[10px]">{'{vehicle_reg}'}</span>
              <span className="font-semibold text-gray-800 truncate block">{context.vehicleReg}</span>
            </div>
            <div className="bg-white p-2 rounded-lg border border-gray-200">
              <span className="text-gray-400 block text-[10px]">{'{maintenance_id}'}</span>
              <span className="font-semibold text-gray-800 truncate block">{context.orderNumber}</span>
            </div>
            <div className="bg-white p-2 rounded-lg border border-gray-200">
              <span className="text-gray-400 block text-[10px]">{'{service_type}'}</span>
              <span className="font-semibold text-gray-800 truncate block">{context.serviceType}</span>
            </div>
            <div className="bg-white p-2 rounded-lg border border-gray-200">
              <span className="text-gray-400 block text-[10px]">{'{scheduled_date}'}</span>
              <span className="font-semibold text-gray-800 truncate block">{context.scheduledDate}</span>
            </div>
            <div className="bg-white p-2 rounded-lg border border-gray-200">
              <span className="text-gray-400 block text-[10px]">{'{garage_name}'}</span>
              <span className="font-semibold text-gray-800 truncate block">{context.garageName}</span>
            </div>
            <div className="bg-white p-2 rounded-lg border border-gray-200">
              <span className="text-gray-400 block text-[10px]">{'{garage_address}'}</span>
              <span className="font-semibold text-gray-800 truncate block">{context.garageAddress || 'N/A'}</span>
            </div>
            <div className="bg-white p-2 rounded-lg border border-gray-200">
              <span className="text-gray-400 block text-[10px]">{'{driver_phone}'}</span>
              <span className="font-semibold text-gray-800 truncate block">{context.driverPhone || 'N/A'}</span>
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
                  className="px-3.5 py-2 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                >
                  {copiedLink ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedLink ? 'Link Copied' : 'Copy Direct Link'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleOpenWhatsApp}
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-xl transition flex items-center gap-1.5 shadow-sm cursor-pointer"
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
                disabled={isSending}
                className="px-5 py-2 text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 active:bg-sky-800 disabled:opacity-50 rounded-xl transition flex items-center gap-1.5 shadow-sm cursor-pointer"
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
