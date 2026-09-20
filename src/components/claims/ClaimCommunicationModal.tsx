// src/components/claims/ClaimCommunicationModal.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { Claim } from '../../types';
import Modal from '../ui/Modal';
import {
  ClaimCommunicationChannel,
  ClaimTemplateCategory,
  ClaimTemplateOption,
  resolveClaimContext,
  replaceClaimTemplatePlaceholders,
  fetchClaimTemplates,
  executeClaimWhatsApp,
  executeClaimEmail,
} from '../../utils/claimCommunication';
import { useAuth } from '../../context/AuthContext';
import {
  MessageCircle,
  Mail,
  Send,
  ExternalLink,
  CheckCircle2,
  FileText,
  Clock,
  Sparkles,
  Phone,
  User,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface ClaimCommunicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  claim: Claim | null;
  initialChannel?: ClaimCommunicationChannel;
  initialCategory?: ClaimTemplateCategory;
  overrideNotes?: string;
  overrideStage?: string;
  onSuccess?: () => void;
}

export const ClaimCommunicationModal: React.FC<ClaimCommunicationModalProps> = ({
  isOpen,
  onClose,
  claim,
  initialChannel = 'whatsapp',
  initialCategory = 'general',
  overrideNotes,
  overrideStage,
  onSuccess,
}) => {
  const { user } = useAuth();

  const [channel, setChannel] = useState<ClaimCommunicationChannel>(initialChannel);
  const [category, setCategory] = useState<ClaimTemplateCategory>(initialCategory);

  const [templates, setTemplates] = useState<ClaimTemplateOption[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  // Recipient info
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');

  // Message fields
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  // When modal opens or claim changes, re-sync state
  useEffect(() => {
    if (!isOpen || !claim) return;

    setChannel(initialChannel);
    setCategory(initialCategory);

    const ctx = resolveClaimContext(claim, overrideNotes, overrideStage);
    setClientName(ctx.client_name);
    setClientPhone(ctx.client_phone);
    setClientEmail(ctx.client_email);

    // Load templates
    setLoadingTemplates(true);
    fetchClaimTemplates()
      .then((loaded) => {
        setTemplates(loaded);

        // Pick a default template matching category
        const matching = loaded.filter(
          (t) =>
            t.category === initialCategory &&
            (t.channel === 'all' || !t.channel || t.channel === initialChannel)
        );
        const defaultChoice = matching[0] || loaded[0];
        if (defaultChoice) {
          setSelectedTemplateId(defaultChoice.id);
          applyTemplate(defaultChoice, ctx);
        }
      })
      .catch((err) => {
        console.error('Failed to load templates:', err);
        toast.error('Could not load claim message templates');
      })
      .finally(() => {
        setLoadingTemplates(false);
      });
  }, [isOpen, claim, initialChannel, initialCategory, overrideNotes, overrideStage]);

  // Available templates filtered by current category
  const filteredTemplates = useMemo(() => {
    return templates.filter((t) => t.category === category);
  }, [templates, category]);

  // Context resolution helper
  const currentContext = useMemo(() => {
    if (!claim) return null;
    const base = resolveClaimContext(claim, overrideNotes, overrideStage);
    return {
      ...base,
      client_name: clientName || base.client_name,
      client_phone: clientPhone || base.client_phone,
      client_email: clientEmail || base.client_email,
    };
  }, [claim, overrideNotes, overrideStage, clientName, clientPhone, clientEmail]);

  // Apply a template to subject and body
  const applyTemplate = (tpl: ClaimTemplateOption, ctx = currentContext) => {
    if (!ctx) return;
    const resolvedSubject = replaceClaimTemplatePlaceholders(tpl.subjectTemplate, ctx);
    const resolvedBody = replaceClaimTemplatePlaceholders(tpl.bodyTemplate, ctx);
    setSubject(resolvedSubject);
    setMessage(resolvedBody);
  };

  // When category changes, select the first available template in that category
  const handleCategoryChange = (newCat: ClaimTemplateCategory) => {
    setCategory(newCat);
    const matching = templates.filter((t) => t.category === newCat);
    if (matching.length > 0 && currentContext) {
      setSelectedTemplateId(matching[0].id);
      applyTemplate(matching[0], currentContext);
    }
  };

  // When template dropdown changes
  const handleTemplateSelect = (tplId: string) => {
    setSelectedTemplateId(tplId);
    const found = templates.find((t) => t.id === tplId);
    if (found && currentContext) {
      applyTemplate(found, currentContext);
    }
  };

  // Re-apply current template to refresh placeholders
  const handleRefreshPlaceholders = () => {
    const found = templates.find((t) => t.id === selectedTemplateId);
    if (found && currentContext) {
      applyTemplate(found, currentContext);
      toast.success('Message refreshed with current details');
    }
  };

  // Insert a specific placeholder token at cursor or append
  const handleInsertPlaceholder = (token: string) => {
    if (!currentContext) return;
    const val = (currentContext as any)[token.replace(/[{}]/g, '')] || token;
    setMessage((prev) => `${prev} ${val}`);
  };

  // Send action
  const handleSend = async () => {
    if (!claim || !currentContext) return;

    if (channel === 'whatsapp') {
      if (!clientPhone.trim()) {
        toast.error('Client phone number is required to send via WhatsApp.');
        return;
      }
      if (!message.trim()) {
        toast.error('Please enter a message to send.');
        return;
      }

      setSending(true);
      try {
        await executeClaimWhatsApp({
          phone: clientPhone,
          message,
          clientName,
          claim,
          userName: user?.name,
          templateId: selectedTemplateId,
          subject,
        });

        toast.success('WhatsApp link opened successfully!');
        if (onSuccess) onSuccess();
        onClose();
      } catch (err: any) {
        console.error(err);
        toast.error(err.message || 'Failed to generate WhatsApp link');
      } finally {
        setSending(false);
      }
    } else {
      // Email
      if (!clientEmail.trim() || !clientEmail.includes('@')) {
        toast.error('A valid client email address is required.');
        return;
      }
      if (!subject.trim()) {
        toast.error('Please provide an email subject line.');
        return;
      }
      if (!message.trim()) {
        toast.error('Please enter an email body message.');
        return;
      }

      setSending(true);
      const toastId = toast.loading('Sending email to client...');
      try {
        const res = await executeClaimEmail({
          email: clientEmail,
          clientName,
          subject,
          body: message,
          claim,
          userName: user?.name,
          templateId: selectedTemplateId,
        });

        if (res.mode === 'provider') {
          toast.success('Email dispatched successfully!', { id: toastId });
        } else {
          toast.success('Mail client opened for direct sending', { id: toastId });
        }
        if (onSuccess) onSuccess();
        onClose();
      } catch (err: any) {
        console.error(err);
        toast.error(err.message || 'Failed to send email', { id: toastId });
      } finally {
        setSending(false);
      }
    }
  };

  if (!isOpen || !claim) return null;

  const claimRef = claim.claimId || (claim.id ? `#${claim.id.slice(-8).toUpperCase()}` : 'N/A');

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center justify-between w-full pr-6">
          <div className="flex items-center space-x-2">
            {channel === 'whatsapp' ? (
              <div className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg">
                <MessageCircle className="h-5 w-5" />
              </div>
            ) : (
              <div className="p-1.5 bg-indigo-100 text-indigo-700 rounded-lg">
                <Mail className="h-5 w-5" />
              </div>
            )}
            <div>
              <span className="font-semibold text-gray-900">
                {channel === 'whatsapp' ? 'WhatsApp Client Message' : 'Email Client Message'}
              </span>
              <span className="ml-2 text-xs font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full border border-gray-200">
                Claim {claimRef}
              </span>
            </div>
          </div>
        </div>
      }
      size="xl"
    >
      <div className="space-y-5 text-gray-800">
        {/* Top Controls: Channel Toggle & Category Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-2 border-b border-gray-200">
          {/* Channel Selector */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Communication Channel
            </label>
            <div className="grid grid-cols-2 gap-2 bg-gray-100 p-1 rounded-lg">
              <button
                type="button"
                onClick={() => setChannel('whatsapp')}
                className={`flex items-center justify-center space-x-2 py-2 px-3 rounded-md text-sm font-medium transition-all ${
                  channel === 'whatsapp'
                    ? 'bg-white text-emerald-700 shadow-sm border border-emerald-200 font-semibold'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <MessageCircle className="h-4 w-4" />
                <span>WhatsApp</span>
              </button>
              <button
                type="button"
                onClick={() => setChannel('email')}
                className={`flex items-center justify-center space-x-2 py-2 px-3 rounded-md text-sm font-medium transition-all ${
                  channel === 'email'
                    ? 'bg-white text-indigo-700 shadow-sm border border-indigo-200 font-semibold'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Mail className="h-4 w-4" />
                <span>Email</span>
              </button>
            </div>
          </div>

          {/* Template Category Selector (Requirement 1: Choose between General vs Progress Update) */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Template Type
            </label>
            <div className="grid grid-cols-2 gap-2 bg-gray-100 p-1 rounded-lg">
              <button
                type="button"
                onClick={() => handleCategoryChange('general')}
                className={`flex items-center justify-center space-x-2 py-2 px-3 rounded-md text-sm font-medium transition-all ${
                  category === 'general'
                    ? 'bg-white text-blue-700 shadow-sm border border-blue-200 font-semibold'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <FileText className="h-4 w-4" />
                <span>General Claim</span>
              </button>
              <button
                type="button"
                onClick={() => handleCategoryChange('progress')}
                className={`flex items-center justify-center space-x-2 py-2 px-3 rounded-md text-sm font-medium transition-all ${
                  category === 'progress'
                    ? 'bg-white text-purple-700 shadow-sm border border-purple-200 font-semibold'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Clock className="h-4 w-4" />
                <span>Progress Update</span>
              </button>
            </div>
          </div>
        </div>

        {/* Template Picker */}
        <div className="bg-gray-50 p-3.5 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-semibold text-gray-700">
              Select {category === 'progress' ? 'Claim Progress' : 'General Claim'} Template
            </label>
            <button
              type="button"
              onClick={handleRefreshPlaceholders}
              className="text-xs text-primary hover:text-primary-700 flex items-center gap-1 font-medium"
              title="Re-populate template with current field values"
            >
              <RefreshCw className="h-3 w-3" />
              <span>Reset to template defaults</span>
            </button>
          </div>

          {loadingTemplates ? (
            <div className="text-xs text-gray-500 py-2 flex items-center gap-2">
              <RefreshCw className="h-3.5 w-3.5 animate-spin text-primary" />
              <span>Loading saved templates...</span>
            </div>
          ) : (
            <select
              value={selectedTemplateId}
              onChange={(e) => handleTemplateSelect(e.target.value)}
              className="block w-full border border-gray-300 rounded-md py-2 px-3 text-sm bg-white focus:ring-primary focus:border-primary shadow-sm"
            >
              {filteredTemplates.map((tpl) => (
                <option key={tpl.id} value={tpl.id}>
                  {tpl.name} {tpl.isCustom ? '(Custom)' : ''}
                </option>
              ))}
              {filteredTemplates.length === 0 && (
                <option value="">No active templates in this category</option>
              )}
            </select>
          )}
        </div>

        {/* Recipient Details */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white p-3.5 rounded-lg border border-gray-200 shadow-sm">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1 flex items-center gap-1">
              <User className="h-3 w-3 text-gray-400" />
              Client Name
            </label>
            <input
              type="text"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="e.g. John Smith"
              className="w-full text-xs sm:text-sm border border-gray-300 rounded px-2.5 py-1.5 focus:ring-primary focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1 flex items-center gap-1">
              <Phone className="h-3 w-3 text-gray-400" />
              Client Phone {channel === 'whatsapp' && <span className="text-red-500">*</span>}
            </label>
            <input
              type="tel"
              value={clientPhone}
              onChange={(e) => setClientPhone(e.target.value)}
              placeholder="e.g. 07123456789 or +44..."
              className={`w-full text-xs sm:text-sm border rounded px-2.5 py-1.5 focus:ring-primary focus:border-primary ${
                channel === 'whatsapp' && !clientPhone.trim()
                  ? 'border-amber-400 bg-amber-50/50'
                  : 'border-gray-300'
              }`}
            />
            {channel === 'whatsapp' && !clientPhone && (
              <p className="text-[11px] text-amber-600 mt-0.5">Required for WhatsApp link</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1 flex items-center gap-1">
              <Mail className="h-3 w-3 text-gray-400" />
              Client Email {channel === 'email' && <span className="text-red-500">*</span>}
            </label>
            <input
              type="email"
              value={clientEmail}
              onChange={(e) => setClientEmail(e.target.value)}
              placeholder="e.g. client@example.com"
              className={`w-full text-xs sm:text-sm border rounded px-2.5 py-1.5 focus:ring-primary focus:border-primary ${
                channel === 'email' && !clientEmail.trim()
                  ? 'border-amber-400 bg-amber-50/50'
                  : 'border-gray-300'
              }`}
            />
            {channel === 'email' && !clientEmail && (
              <p className="text-[11px] text-amber-600 mt-0.5">Required for email dispatch</p>
            )}
          </div>
        </div>

        {/* Claim & Progress Badges Bar */}
        {currentContext && (
          <div className="flex flex-wrap items-center gap-2 p-2 bg-gray-50 rounded-md border border-gray-200 text-xs">
            <span className="font-semibold text-gray-600">Claim Context:</span>
            <span className="bg-white px-2 py-0.5 rounded border text-gray-700">
              Vehicle: <strong>{currentContext.vehicle_reg}</strong>
            </span>
            <span className="bg-white px-2 py-0.5 rounded border text-gray-700">
              Date: <strong>{currentContext.incident_date}</strong>
            </span>
            <span className="bg-blue-50 px-2 py-0.5 rounded border border-blue-200 text-blue-800 font-medium">
              Stage: <strong>{currentContext.progress_stage}</strong>
            </span>
            <span className="bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-emerald-800 font-medium">
              Status: <strong>{currentContext.claim_status}</strong>
            </span>
          </div>
        )}

        {/* Subject (relevant for Email, or header for WhatsApp) */}
        {channel === 'email' && (
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Email Subject Line <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Claim Progress Update - #12345"
              className="w-full text-sm border border-gray-300 rounded-md px-3 py-2 focus:ring-primary focus:border-primary shadow-sm"
            />
          </div>
        )}

        {/* Message Body */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-semibold text-gray-700">
              {channel === 'whatsapp' ? 'WhatsApp Message Content' : 'Email Message Body'}
            </label>
            <span className="text-[11px] text-gray-400">
              {message.length} characters
            </span>
          </div>

          <textarea
            rows={channel === 'whatsapp' ? 9 : 11}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full text-xs sm:text-sm font-mono border border-gray-300 rounded-md p-3 focus:ring-primary focus:border-primary shadow-sm leading-relaxed"
            placeholder="Type your message or select a template above..."
          />

          {/* Quick Insert Variable Pills */}
          <div className="mt-2 pt-2 border-t border-gray-100">
            <span className="text-[11px] font-medium text-gray-500 mr-2 inline-flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-amber-500" />
              Quick Insert:
            </span>
            <div className="inline-flex flex-wrap gap-1 mt-1">
              {[
                '{client_name}',
                '{claim_id}',
                '{vehicle_reg}',
                '{incident_date}',
                '{claim_status}',
                '{progress_stage}',
                '{latest_update_notes}',
                '{next_steps}',
              ].map((token) => (
                <button
                  key={token}
                  type="button"
                  onClick={() => handleInsertPlaceholder(token)}
                  className="text-[11px] bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-0.5 rounded transition-colors"
                  title={`Insert ${token}`}
                >
                  {token}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-gray-200">
          <div className="text-xs text-gray-500 flex items-center gap-1.5">
            {channel === 'whatsapp' ? (
              <>
                <ExternalLink className="h-3.5 w-3.5 text-emerald-600" />
                <span>Opens direct WhatsApp chat with message pre-filled</span>
              </>
            ) : (
              <>
                <Mail className="h-3.5 w-3.5 text-indigo-600" />
                <span>Sends directly to client's email inbox</span>
              </>
            )}
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              disabled={sending}
            >
              Cancel
            </button>

            {channel === 'whatsapp' ? (
              <button
                type="button"
                onClick={handleSend}
                disabled={sending}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-md hover:bg-emerald-700 transition-colors shadow-sm disabled:opacity-50"
              >
                <MessageCircle className="h-4 w-4 mr-1.5" />
                {sending ? 'Launching WhatsApp...' : 'Send via WhatsApp'}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSend}
                disabled={sending}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-50"
              >
                <Send className="h-4 w-4 mr-1.5" />
                {sending ? 'Sending Email...' : 'Send Email to Client'}
              </button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default ClaimCommunicationModal;
