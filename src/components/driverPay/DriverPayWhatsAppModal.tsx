// src/components/driverPay/DriverPayWhatsAppModal.tsx
import React, { useState, useEffect, useMemo } from 'react';
import Modal from '../ui/Modal';
import { DriverPay } from '../../types/driverPay';
import {
  DriverPayTemplateOption,
  resolveDriverPayContext,
  replaceDriverPayPlaceholders,
  fetchDriverPayTemplates,
  getActiveDriverPayTemplate,
  buildDriverPayWhatsAppLink,
  dispatchDriverPayWhatsApp,
  dispatchDriverPayEmail,
} from '../../utils/driverPayWhatsApp';
import { useAuth } from '../../context/AuthContext';
import { usePermissions } from '../../hooks/usePermissions';
import {
  MessageCircle,
  Mail,
  ExternalLink,
  Copy,
  Check,
  AlertCircle,
  Phone,
  User,
  Calendar,
  CreditCard,
  RefreshCw,
} from 'lucide-react';
import toast from 'react-hot-toast';

export interface DriverPayCommunicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  record?: DriverPay | null;
  records?: DriverPay[];
  initialChannel?: 'whatsapp' | 'email';
  onSuccess?: () => void;
}

export const DriverPayWhatsAppModal: React.FC<DriverPayCommunicationModalProps> = ({
  isOpen,
  onClose,
  record,
  records,
  initialChannel = 'whatsapp',
  onSuccess,
}) => {
  const { user } = useAuth();
  const { can, isAdmin } = usePermissions();

  const canSendWhatsApp = isAdmin || can('driverPay', 'whatsapp') || can('driverPay', 'send');
  const canSendEmail = isAdmin || can('driverPay', 'email') || can('driverPay', 'send');
  const canUseTemplates = isAdmin || can('driverPay', 'template');

  const [channel, setChannel] = useState<'whatsapp' | 'email'>(initialChannel);
  const [selectedRecordId, setSelectedRecordId] = useState<string>(record?.id || '');

  useEffect(() => {
    if (record?.id) {
      setSelectedRecordId(record.id);
    } else if (records && records.length > 0 && !selectedRecordId) {
      setSelectedRecordId(records[0].id);
    }
  }, [record, records, selectedRecordId]);

  useEffect(() => {
    if (initialChannel) {
      setChannel(initialChannel);
    }
  }, [initialChannel]);

  const targetRecord = useMemo(() => {
    if (record) return record;
    if (records && selectedRecordId) {
      return records.find((r) => r.id === selectedRecordId) || records[0] || null;
    }
    return records && records.length > 0 ? records[0] : null;
  }, [record, records, selectedRecordId]);

  const [templates, setTemplates] = useState<DriverPayTemplateOption[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [subject, setSubject] = useState<string>('');
  const [customMessage, setCustomMessage] = useState<string>('');
  const [phoneOverride, setPhoneOverride] = useState<string>('');
  const [emailOverride, setEmailOverride] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [sending, setSending] = useState(false);

  // Context resolved from targetRecord and phone override
  const context = useMemo(() => {
    if (!targetRecord) return null;
    const ctx = resolveDriverPayContext(targetRecord);
    if (phoneOverride) {
      ctx.driver_phone = phoneOverride;
    }
    return ctx;
  }, [targetRecord, phoneOverride]);

  // Load active templates for channel
  const loadTemplates = React.useCallback(async (chan: 'whatsapp' | 'email') => {
    setLoadingTemplates(true);
    try {
      const tpls = await fetchDriverPayTemplates(chan);
      setTemplates(tpls);

      // Select active default custom template if available
      const activeTpl = getActiveDriverPayTemplate(tpls);
      if (activeTpl) {
        setSelectedTemplateId(activeTpl.id);
        if (targetRecord) {
          const ctx = resolveDriverPayContext(targetRecord);
          if (phoneOverride) ctx.driver_phone = phoneOverride;
          const hydratedBody = replaceDriverPayPlaceholders(activeTpl.bodyTemplate, ctx);
          const hydratedSubject = replaceDriverPayPlaceholders(activeTpl.subjectTemplate || 'Driver Payment Advice', ctx);
          setCustomMessage(hydratedBody);
          setSubject(hydratedSubject);
        }
      }
    } catch (err) {
      console.error('Failed to load templates:', err);
      toast.error('Failed to load templates');
    } finally {
      setLoadingTemplates(false);
    }
  }, [targetRecord, phoneOverride]);

  // Sync templates on mount and on channel change
  useEffect(() => {
    if (isOpen) {
      if (targetRecord) {
        setPhoneOverride(targetRecord.phoneNumber || '');
        setEmailOverride(targetRecord.email || '');
      }
      loadTemplates(channel);
    }
  }, [isOpen, targetRecord?.id, channel, loadTemplates]);

  // Reactive listener for centralized template changes
  useEffect(() => {
    if (!isOpen) return;
    const handleSync = () => loadTemplates(channel);
    window.addEventListener('template_saved', handleSync);
    window.addEventListener('template_deleted', handleSync);
    return () => {
      window.removeEventListener('template_saved', handleSync);
      window.removeEventListener('template_deleted', handleSync);
    };
  }, [isOpen, channel, loadTemplates]);

  // Current selected template
  const currentTemplate = useMemo(() => {
    return templates.find((t) => t.id === selectedTemplateId) || templates[0];
  }, [templates, selectedTemplateId]);

  // Handle template selection
  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplateId(templateId);
    const chosen = templates.find((t) => t.id === templateId);
    if (chosen && context) {
      const hydratedBody = replaceDriverPayPlaceholders(chosen.bodyTemplate, context);
      const hydratedSubject = replaceDriverPayPlaceholders(chosen.subjectTemplate || 'Driver Payment Advice', context);
      setCustomMessage(hydratedBody);
      setSubject(hydratedSubject);
    }
  };

  const handleResetDefaults = () => {
    if (currentTemplate && context) {
      const hydratedBody = replaceDriverPayPlaceholders(currentTemplate.bodyTemplate, context);
      const hydratedSubject = replaceDriverPayPlaceholders(currentTemplate.subjectTemplate || 'Driver Payment Advice', context);
      setCustomMessage(hydratedBody);
      setSubject(hydratedSubject);
      toast.success('Reset message to template defaults');
    }
  };

  if (!targetRecord || !context) return null;

  const currentRecordWithPhone: DriverPay = {
    ...targetRecord,
    phoneNumber: phoneOverride || targetRecord.phoneNumber,
    email: emailOverride || targetRecord.email,
  };

  const { url, isValidPhone } = buildDriverPayWhatsAppLink(currentRecordWithPhone, customMessage);
  const isValidEmail = !!emailOverride && emailOverride.includes('@');

  const handleOpenWhatsApp = async () => {
    if (!canSendWhatsApp) {
      toast.error('You do not have permission to send WhatsApp messages for driver pay.');
      return;
    }
    if (!isValidPhone) {
      toast.error('Please enter a valid driver phone number before launching WhatsApp.');
      return;
    }

    setSending(true);
    try {
      const res = await dispatchDriverPayWhatsApp(
        currentRecordWithPhone,
        customMessage,
        user?.email,
        selectedTemplateId
      );

      if (res.success) {
        toast.success(`WhatsApp chat opened for ${targetRecord.name}`);
        if (onSuccess) onSuccess();
        onClose();
      } else {
        toast.error(res.error || 'Failed to open WhatsApp');
      }
    } finally {
      setSending(false);
    }
  };

  const handleOpenEmail = async () => {
    if (!canSendEmail) {
      toast.error('You do not have permission to send emails for driver pay.');
      return;
    }
    if (!isValidEmail) {
      toast.error('Please enter a valid driver email address.');
      return;
    }

    setSending(true);
    try {
      const res = await dispatchDriverPayEmail(
        currentRecordWithPhone,
        subject || `Driver Payment Advice - ${targetRecord.name}`,
        customMessage,
        emailOverride,
        user?.email,
        selectedTemplateId
      );

      if (res.success) {
        toast.success(`Email client opened for ${targetRecord.name}`);
        if (onSuccess) onSuccess();
        onClose();
      } else {
        toast.error(res.error || 'Failed to dispatch email');
      }
    } finally {
      setSending(false);
    }
  };

  const handleCopyLink = () => {
    if (!url) {
      toast.error('No valid WhatsApp link generated');
      return;
    }
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success('WhatsApp link copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center space-x-2">
          {channel === 'whatsapp' ? (
            <div className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg">
              <MessageCircle className="h-5 w-5" />
            </div>
          ) : (
            <div className="p-1.5 bg-sky-100 text-sky-700 rounded-lg">
              <Mail className="h-5 w-5" />
            </div>
          )}
          <span className="font-semibold text-gray-900">
            {channel === 'whatsapp' ? 'Driver Pay WhatsApp Dispatch' : 'Driver Pay Email Dispatch'}
          </span>
        </div>
      }
      size="xl"
    >
      <div className="space-y-5 text-gray-800">
        {/* Record Selector if opened from Action Bar */}
        {!record && records && records.length > 0 && (
          <div className="flex items-center gap-2 p-2.5 bg-blue-50/70 border border-blue-200 rounded-xl">
            <span className="text-xs font-bold text-blue-900 shrink-0">Select Driver:</span>
            <select
              value={selectedRecordId}
              onChange={(e) => setSelectedRecordId(e.target.value)}
              className="flex-1 px-2.5 py-1 text-xs bg-white text-[#0F172A] border border-[#CBD5E1] rounded-lg font-medium shadow-2xs focus:outline-none focus:border-blue-500"
            >
              {records.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} {r.driverNo ? `(${r.driverNo})` : ''} — Pay: {r.paidAmount ? `£${r.paidAmount}` : '£0'}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Channel Switcher */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-200">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Communication Channel
          </label>
          <div className="flex items-center bg-gray-100 p-1 rounded-lg">
            <button
              type="button"
              onClick={() => setChannel('whatsapp')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                channel === 'whatsapp'
                  ? 'bg-white text-emerald-700 shadow-xs border border-emerald-200'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <MessageCircle className="h-3.5 w-3.5" />
              <span>WhatsApp</span>
            </button>
            <button
              type="button"
              onClick={() => setChannel('email')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                channel === 'email'
                  ? 'bg-white text-sky-700 shadow-xs border border-sky-200'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Mail className="h-3.5 w-3.5" />
              <span>Email</span>
            </button>
          </div>
        </div>

        {/* Driver Pay Summary Card */}
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3.5 flex flex-wrap items-center justify-between gap-3 text-sm">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-emerald-700" />
            <span className="font-semibold text-emerald-950">{context.driver_name}</span>
            <span className="text-emerald-700 font-mono text-xs bg-emerald-100 px-2 py-0.5 rounded">
              Ref: {context.payment_id}
            </span>
          </div>

          <div className="flex items-center gap-4 text-emerald-900">
            <div className="flex items-center gap-1.5">
              <CreditCard className="h-4 w-4 text-emerald-600" />
              <span className="font-semibold">{context.amount_paid}</span>
              <span className="text-xs text-emerald-700 font-medium">({context.payment_status})</span>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-emerald-700">
              <Calendar className="h-3.5 w-3.5" />
              <span>{context.period_start} – {context.period_end}</span>
            </div>
          </div>
        </div>

        {/* Recipient Details: Phone or Email */}
        {channel === 'whatsapp' ? (
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
              Driver WhatsApp Phone Number
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                <Phone className="h-4 w-4" />
              </div>
              <input
                type="tel"
                value={phoneOverride}
                onChange={(e) => {
                  const val = e.target.value;
                  setPhoneOverride(val);
                  if (currentTemplate && targetRecord) {
                    const updatedCtx = { ...context, driver_phone: val };
                    const rehydrated = replaceDriverPayPlaceholders(currentTemplate.bodyTemplate, updatedCtx);
                    setCustomMessage(rehydrated);
                  }
                }}
                placeholder="e.g. 07123456789 or +447123456789"
                className={`w-full pl-9 pr-4 py-2 border rounded-md text-sm focus:ring-emerald-500 focus:border-emerald-500 ${
                  !isValidPhone ? 'border-amber-400 bg-amber-50/50' : 'border-gray-300'
                }`}
              />
            </div>
            {!isValidPhone && (
              <p className="mt-1 text-xs text-amber-700 flex items-center gap-1">
                <AlertCircle className="h-3.5 w-3.5" />
                Please provide a valid phone number (e.g. UK mobile starting with 07 or international with country code).
              </p>
            )}
          </div>
        ) : (
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
              Driver Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                <Mail className="h-4 w-4" />
              </div>
              <input
                type="email"
                value={emailOverride}
                onChange={(e) => setEmailOverride(e.target.value)}
                placeholder="driver@example.com"
                className={`w-full pl-9 pr-4 py-2 border rounded-md text-sm focus:ring-sky-500 focus:border-sky-500 ${
                  !isValidEmail ? 'border-amber-400 bg-amber-50/50' : 'border-gray-300'
                }`}
              />
            </div>
            {!isValidEmail && (
              <p className="mt-1 text-xs text-amber-700 flex items-center gap-1">
                <AlertCircle className="h-3.5 w-3.5" />
                Please provide a valid email address.
              </p>
            )}
          </div>
        )}

        {/* Centralized Template Selector */}
        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
            <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
              {channel === 'whatsapp' ? 'WhatsApp Template' : 'Email Template'} ({templates.length} available)
            </label>
            <button
              type="button"
              onClick={handleResetDefaults}
              className="text-xs text-primary hover:text-primary-700 flex items-center gap-1 font-medium transition-colors"
              title="Reset message to template defaults"
            >
              <RefreshCw className="h-3 w-3" />
              <span>Reset to defaults</span>
            </button>
          </div>

          <select
            value={selectedTemplateId}
            onChange={(e) => handleTemplateChange(e.target.value)}
            disabled={loadingTemplates}
            className="w-full border border-gray-300 rounded-lg py-2 px-3 text-sm focus:ring-primary focus:border-primary bg-white shadow-2xs"
          >
            {templates.map((tpl) => (
              <option key={tpl.id} value={tpl.id}>
                {tpl.name}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-gray-500">
            Source: {channel === 'whatsapp' ? 'WhatsApp Communication Page' : 'Bulk Email Page'}. Templates can only be created or modified on the centralized page.
          </p>
        </div>

        {/* Email Subject if channel is email */}
        {channel === 'email' && (
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
              Email Subject
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Driver Payment Advice..."
              className="w-full border border-gray-300 rounded-md py-2 px-3 text-sm focus:ring-sky-500 focus:border-sky-500 bg-white shadow-xs"
            />
          </div>
        )}

        {/* Message Pre-fill Preview & Editor */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
              Message Pre-Fill Preview
            </label>
            <span className="text-xs text-gray-400">{customMessage.length} characters</span>
          </div>
          <textarea
            value={customMessage}
            onChange={(e) => setCustomMessage(e.target.value)}
            rows={8}
            className="w-full border border-gray-300 rounded-md p-3 text-sm font-sans focus:ring-primary focus:border-primary leading-relaxed shadow-inner"
            placeholder="Hydrated message preview..."
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
          {channel === 'whatsapp' ? (
            <button
              type="button"
              onClick={handleCopyLink}
              disabled={!isValidPhone || !canSendWhatsApp}
              className="inline-flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              title={!canSendWhatsApp ? 'Permission required to use WhatsApp' : 'Copy wa.me link'}
            >
              {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4 text-gray-500" />}
              <span>{copied ? 'Copied Link' : 'Copy WhatsApp Link'}</span>
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            {channel === 'whatsapp' ? (
              <button
                type="button"
                onClick={handleOpenWhatsApp}
                disabled={!isValidPhone || !canSendWhatsApp || sending}
                className="inline-flex items-center gap-2 px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                title={!canSendWhatsApp ? 'Permission required to dispatch WhatsApp messages' : undefined}
              >
                <MessageCircle className="h-4 w-4" />
                <span>Open in WhatsApp</span>
                <ExternalLink className="h-3.5 w-3.5 ml-0.5 opacity-80" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleOpenEmail}
                disabled={!isValidEmail || !canSendEmail || sending}
                className="inline-flex items-center gap-2 px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <Mail className="h-4 w-4" />
                <span>Send Email</span>
                <ExternalLink className="h-3.5 w-3.5 ml-0.5 opacity-80" />
              </button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};

export const DriverPayCommunicationModal = DriverPayWhatsAppModal;
export default DriverPayWhatsAppModal;
