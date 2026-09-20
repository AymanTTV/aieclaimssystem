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
} from '../../utils/driverPayWhatsApp';
import { useAuth } from '../../context/AuthContext';
import { MessageCircle, ExternalLink, Copy, Check, AlertCircle, Phone, User, Calendar, CreditCard, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

interface DriverPayWhatsAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: DriverPay | null;
  onSuccess?: () => void;
}

export const DriverPayWhatsAppModal: React.FC<DriverPayWhatsAppModalProps> = ({
  isOpen,
  onClose,
  record,
  onSuccess,
}) => {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<DriverPayTemplateOption[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [customMessage, setCustomMessage] = useState<string>('');
  const [phoneOverride, setPhoneOverride] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  // Load active templates strictly from the Custom folder under WhatsApp communication settings
  const loadTemplates = async () => {
    setLoadingTemplates(true);
    try {
      const tpls = await fetchDriverPayTemplates();
      setTemplates(tpls);

      // Select active default custom template if available
      const activeTpl = getActiveDriverPayTemplate(tpls);
      if (activeTpl) {
        setSelectedTemplateId(activeTpl.id);
        if (record) {
          const ctx = resolveDriverPayContext(record);
          if (phoneOverride) {
            ctx.driver_phone = phoneOverride;
          }
          const hydrated = replaceDriverPayPlaceholders(activeTpl.bodyTemplate, ctx);
          setCustomMessage(hydrated);
        }
      }
    } catch (err) {
      console.error('Failed to load WhatsApp custom templates:', err);
      toast.error('Failed to load WhatsApp custom templates');
    } finally {
      setLoadingTemplates(false);
    }
  };

  // Fetch templates when opened
  useEffect(() => {
    if (isOpen) {
      if (record) {
        setPhoneOverride(record.phoneNumber || '');
      }
      loadTemplates();
    }
  }, [isOpen, record?.id]);

  // Context resolved from record and phone override
  const context = useMemo(() => {
    if (!record) return null;
    const ctx = resolveDriverPayContext(record);
    if (phoneOverride) {
      ctx.driver_phone = phoneOverride;
    }
    return ctx;
  }, [record, phoneOverride]);

  // Current selected template
  const currentTemplate = useMemo(() => {
    return templates.find((t) => t.id === selectedTemplateId) || templates[0];
  }, [templates, selectedTemplateId]);

  // When user selects a template from the dropdown list, load its content into the message pre-fill preview
  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplateId(templateId);
    const chosen = templates.find((t) => t.id === templateId);
    if (chosen && context) {
      const hydrated = replaceDriverPayPlaceholders(chosen.bodyTemplate, context);
      setCustomMessage(hydrated);
    }
  };

  if (!record || !context) return null;

  const currentRecordWithPhone: DriverPay = {
    ...record,
    phoneNumber: phoneOverride || record.phoneNumber,
  };

  const { url, isValidPhone } = buildDriverPayWhatsAppLink(currentRecordWithPhone, customMessage);

  const handleOpenWhatsApp = async () => {
    if (!isValidPhone) {
      toast.error('Please enter a valid driver phone number before launching WhatsApp.');
      return;
    }

    const res = await dispatchDriverPayWhatsApp(
      currentRecordWithPhone,
      customMessage,
      user?.email,
      selectedTemplateId
    );

    if (res.success) {
      toast.success(`WhatsApp chat opened for ${record.name}`);
      if (onSuccess) onSuccess();
      onClose();
    } else {
      toast.error(res.error || 'Failed to open WhatsApp');
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
    <Modal isOpen={isOpen} onClose={onClose} title="WhatsApp Template Selector & Message Preview" size="xl">
      <div className="space-y-5">
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

        {/* Driver Phone Field */}
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
                // Also update dynamic placeholder if phone changed
                if (currentTemplate && record) {
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

        {/* Template Selector Strictly from Custom Folder */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
              WhatsApp Custom Template
            </label>
            <div className="flex items-center gap-2">
              <span className="text-xs text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded font-medium">
                WhatsApp "Custom" Folder ({templates.length} available)
              </span>
              <button
                type="button"
                onClick={loadTemplates}
                disabled={loadingTemplates}
                title="Refresh templates from WhatsApp Custom folder"
                className="text-gray-400 hover:text-emerald-600 transition-colors"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loadingTemplates ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
          <select
            value={selectedTemplateId}
            onChange={(e) => handleTemplateChange(e.target.value)}
            disabled={loadingTemplates}
            className="w-full border border-gray-300 rounded-md py-2 px-3 text-sm focus:ring-emerald-500 focus:border-emerald-500 bg-white shadow-sm"
          >
            {templates.map((tpl) => (
              <option key={tpl.id} value={tpl.id}>
                {tpl.name}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-gray-500">
            Source: WhatsApp Communication Settings &gt; Custom folder. Selecting a template instantly loads its hydrated content into the preview below.
          </p>
        </div>

        {/* Message Pre-fill Preview & Editor */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
              Message Pre-Fill Preview
            </label>
            <span className="text-xs text-gray-400">
              {customMessage.length} characters
            </span>
          </div>
          <textarea
            value={customMessage}
            onChange={(e) => setCustomMessage(e.target.value)}
            rows={10}
            className="w-full border border-gray-300 rounded-md p-3 text-sm font-sans focus:ring-emerald-500 focus:border-emerald-500 leading-relaxed shadow-inner"
            placeholder="Hydrated WhatsApp message preview..."
          />
        </div>

        {/* Dynamic Placeholders Strip */}
        <div>
          <p className="text-xs text-gray-500 mb-1.5 font-medium">
            Dynamic Placeholders (Hydrated from Driver Pay row data):
          </p>
          <div className="flex flex-wrap gap-1.5 text-xs">
            {[
              { tag: '{driver_name}', desc: context.driver_name },
              { tag: '{driver_phone}', desc: context.driver_phone || 'None' },
              { tag: '{payment_id}', desc: context.payment_id },
              { tag: '{amount_paid}', desc: context.amount_paid },
              { tag: '{payment_date}', desc: context.payment_date },
              { tag: '{payment_status}', desc: context.payment_status },
              { tag: '{period_start}', desc: context.period_start },
              { tag: '{period_end}', desc: context.period_end },
              { tag: '{notes}', desc: context.notes },
            ].map(({ tag, desc }) => (
              <button
                key={tag}
                type="button"
                onClick={() => setCustomMessage((prev) => prev + ' ' + tag)}
                className="inline-flex items-center gap-1 bg-gray-100 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700 text-gray-700 px-2 py-0.5 rounded font-mono text-[11px] transition-colors border border-gray-200"
                title={`Click to insert ${tag} (Current value: ${desc})`}
              >
                <span>{tag}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={handleCopyLink}
            disabled={!isValidPhone}
            className="inline-flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors disabled:opacity-50"
            title="Copy wa.me link"
          >
            {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4 text-gray-500" />}
            <span>{copied ? 'Copied Link' : 'Copy WhatsApp Link'}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleOpenWhatsApp}
              disabled={!isValidPhone}
              className="inline-flex items-center gap-2 px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <MessageCircle className="h-4 w-4" />
              <span>Open in WhatsApp</span>
              <ExternalLink className="h-3.5 w-3.5 ml-0.5 opacity-80" />
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default DriverPayWhatsAppModal;
