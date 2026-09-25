// src/components/customers/GroupMessagingModal.tsx

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Modal from '../ui/Modal';
import { Customer } from '../../types/customer';
import { Claim } from '../../types/claim';
import {
  GlobalMessageTemplate,
  MessagingRecipient,
  RecipientCategory,
  MessagingChannel,
  MessagingAttachment,
  BatchSendProgress,
} from '../../types/groupMessaging';
import {
  extractRecipients,
  filterRecipientsByCategory,
  subscribeGlobalTemplates,
  uploadMessagingAttachment,
  dispatchBulkEmail,
  openWhatsAppChat,
  DEFAULT_TEMPLATES,
} from '../../utils/groupMessaging';
import {
  substituteDynamicTags,
  subscribeToDynamicTags,
} from '../../utils/dynamicTagsService';
import { DynamicTag } from '../../types/dynamicTags';
import { formatWhatsAppNumber } from '../../utils/whatsapp';
import { usePermissions } from '../../hooks/usePermissions';
import {
  Mail,
  MessageCircle,
  Radio,
  Users,
  Building2,
  ShieldAlert,
  Search,
  CheckSquare,
  Square,
  Paperclip,
  X,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Eye,
  Send,
  ChevronRight,
  ExternalLink,
  ShieldCheck,
  Folder,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface GroupMessagingModalProps {
  isOpen: boolean;
  onClose: () => void;
  customers: Customer[];
  claims?: Claim[];
  preselectedCustomerIds?: string[];
}

export const GroupMessagingModal: React.FC<GroupMessagingModalProps> = ({
  isOpen,
  onClose,
  customers,
  claims = [],
  preselectedCustomerIds = [],
}) => {
  const { can, isAdmin } = usePermissions();

  const canSendWhatsApp = isAdmin || can('customers', 'whatsapp') || can('customers', 'send');
  const canSendEmail = isAdmin || can('customers', 'email') || can('customers', 'send');

  // Workflow step tabs in modal
  const [activeTab, setActiveTab] = useState<'template' | 'recipients' | 'dispatch'>('template');

  // Channel & Target settings
  const [channel, setChannel] = useState<MessagingChannel>(() => {
    if (canSendEmail) return 'email';
    if (canSendWhatsApp) return 'whatsapp';
    return 'email';
  });
  const [category, setCategory] = useState<RecipientCategory>('members');

  // Recipient selection state
  const [selectedRecipientIds, setSelectedRecipientIds] = useState<Set<string>>(new Set());
  const [recipientSearch, setRecipientSearch] = useState('');

  // Live Templates state from Automation Control
  const [templates, setTemplates] = useState<GlobalMessageTemplate[]>(DEFAULT_TEMPLATES);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(DEFAULT_TEMPLATES[0].id);

  // Live Dynamic Tags from Automation Control
  const [dynamicTags, setDynamicTags] = useState<DynamicTag[]>([]);

  // Attachments
  const [attachment, setAttachment] = useState<MessagingAttachment | null>(null);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [manualMediaUrl, setManualMediaUrl] = useState('');
  const [showMediaUrlInput, setShowMediaUrlInput] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Dispatch progress for Bulk Email
  const [emailProgress, setEmailProgress] = useState<BatchSendProgress>({
    total: 0,
    completed: 0,
    successful: 0,
    failed: 0,
    isSending: false,
    errors: [],
  });

  // Track launched WhatsApp chats
  const [openedWhatsAppIds, setOpenedWhatsAppIds] = useState<Record<string, boolean>>({});

  // 1. Extract all available recipients
  const allRecipients = useMemo(() => {
    return extractRecipients(customers, claims);
  }, [customers, claims]);

  // 2. Category filtered recipients
  const categoryRecipients = useMemo(() => {
    return filterRecipientsByCategory(allRecipients, category);
  }, [allRecipients, category]);

  // Counts for category badges
  const categoryCounts = useMemo(() => {
    return {
      all: allRecipients.length,
      members: allRecipients.filter((r) => r.category === 'members').length,
      companies: allRecipients.filter((r) => r.category === 'companies').length,
      claims: allRecipients.filter((r) => r.category === 'claims').length,
    };
  }, [allRecipients]);

  // 3. Search filtered within category
  const filteredRecipients = useMemo(() => {
    if (!recipientSearch.trim()) return categoryRecipients;
    const q = recipientSearch.toLowerCase();
    return categoryRecipients.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q) ||
        r.phone.includes(q) ||
        (r.companyName && r.companyName.toLowerCase().includes(q))
    );
  }, [categoryRecipients, recipientSearch]);

  // Initialize selection when modal opens or category changes
  useEffect(() => {
    if (!isOpen) return;

    if (preselectedCustomerIds.length > 0) {
      const initSet = new Set(preselectedCustomerIds);
      setSelectedRecipientIds(initSet);
    } else {
      // Default select all valid recipients for the selected category
      const defaultSet = new Set(
        categoryRecipients
          .filter((r) => (channel === 'email' ? !!r.email : !!formatWhatsAppNumber(r.phone)))
          .map((r) => r.id)
      );
      setSelectedRecipientIds(defaultSet);
    }
  }, [isOpen, category, channel]);

  // ─────────────────────────────────────────────────────────────
  // REAL-TIME SYNC WITH AUTOMATION CONTROL
  // State changes in Automation Control immediately sync to this dropdown!
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;

    // 1. Real-time subscription to Templates from Automation Control
    const unsubTemplates = subscribeGlobalTemplates(channel, (list) => {
      setTemplates(list);
      // If current selection is invalid, fallback to first available
      if (list.length > 0 && !list.some((t) => t.id === selectedTemplateId)) {
        setSelectedTemplateId(list[0].id);
      }
    });

    // 2. Real-time subscription to Dynamic Tags from Automation Control
    const unsubTags = subscribeToDynamicTags((tags) => {
      setDynamicTags(tags);
    });

    return () => {
      unsubTemplates();
      unsubTags();
    };
  }, [isOpen, channel]);

  // Currently selected template (strictly from Automation Control library)
  const selectedTemplate = useMemo(() => {
    return templates.find((t) => t.id === selectedTemplateId) || templates[0] || DEFAULT_TEMPLATES[0];
  }, [templates, selectedTemplateId]);

  const subjectTemplate = selectedTemplate?.subjectTemplate || '';
  const bodyTemplate = selectedTemplate?.bodyTemplate || '';
  const templateName = selectedTemplate?.name || 'Standard Broadcast Notice';

  // Target recipients currently selected
  const activeSelectedRecipients = useMemo(() => {
    return allRecipients.filter((r) => selectedRecipientIds.has(r.id));
  }, [allRecipients, selectedRecipientIds]);

  // Valid recipients for current channel
  const eligibleRecipients = useMemo(() => {
    if (channel === 'email') {
      return activeSelectedRecipients.filter((r) => !!r.email && r.email.includes('@'));
    } else {
      return activeSelectedRecipients.filter((r) => !!formatWhatsAppNumber(r.phone));
    }
  }, [activeSelectedRecipients, channel]);

  // Sample recipient for live preview
  const sampleRecipient = eligibleRecipients[0] ||
    categoryRecipients[0] || {
      id: 'sample',
      name: 'John Doe',
      firstName: 'John',
      email: 'john.doe@example.com',
      phone: '07552 553441',
      category: 'members',
      companyName: 'AIE Member Services',
      source: 'customer',
    };

  // ─────────────────────────────────────────────────────────────
  // LIVE RENDERED SAMPLE PREVIEW (DYNAMIC TAG SUBSTITUTION)
  // ─────────────────────────────────────────────────────────────
  const previewSubject = useMemo(() => {
    return substituteDynamicTags(subjectTemplate, sampleRecipient, dynamicTags);
  }, [subjectTemplate, sampleRecipient, dynamicTags]);

  const previewBody = useMemo(() => {
    let resolved = substituteDynamicTags(bodyTemplate, sampleRecipient, dynamicTags);
    if (attachment?.url && !resolved.includes(attachment.url)) {
      resolved += `\n\n📎 Attached Document / Media:\n${attachment.name} (${attachment.url})`;
    }
    return resolved;
  }, [bodyTemplate, sampleRecipient, dynamicTags, attachment]);

  // Toggle single recipient
  const toggleRecipient = (id: string) => {
    setSelectedRecipientIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Toggle all filtered recipients
  const toggleSelectAllFiltered = () => {
    const allFilteredSelected = filteredRecipients.every((r) => selectedRecipientIds.has(r.id));
    setSelectedRecipientIds((prev) => {
      const next = new Set(prev);
      if (allFilteredSelected) {
        filteredRecipients.forEach((r) => next.delete(r.id));
      } else {
        filteredRecipients.forEach((r) => next.add(r.id));
      }
      return next;
    });
  };

  // File upload handler for attachments
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Unsupported format. Please upload JPG, PNG, or PDF.');
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      toast.error('File size exceeds 15MB limit.');
      return;
    }

    setIsUploadingAttachment(true);
    const toastId = toast.loading(`Uploading ${file.name}...`);
    try {
      const att = await uploadMessagingAttachment(file);
      setAttachment(att);
      toast.success('Media attachment linked to broadcast!', { id: toastId });
    } catch (err: any) {
      console.error('Upload failed:', err);
      toast.error('Failed to upload file to storage', { id: toastId });
    } finally {
      setIsUploadingAttachment(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Add media URL manually
  const handleAddMediaUrl = () => {
    if (!manualMediaUrl.trim()) return;
    try {
      new URL(manualMediaUrl);
    } catch {
      toast.error('Please enter a valid URL');
      return;
    }

    const isPdf = manualMediaUrl.toLowerCase().endsWith('.pdf');
    setAttachment({
      id: `url_${Date.now()}`,
      name: manualMediaUrl.split('/').pop()?.split('?')[0] || 'Media Attachment',
      size: 0,
      type: isPdf ? 'application/pdf' : 'image/jpeg',
      url: manualMediaUrl.trim(),
      uploadedAt: new Date(),
    });
    setManualMediaUrl('');
    setShowMediaUrlInput(false);
    toast.success('Media URL attached to broadcast!');
  };

  // ─────────────────────────────────────────────────────────────
  // BULK EMAIL BROADCAST DISPATCHER
  // ─────────────────────────────────────────────────────────────
  const handleStartBulkEmail = async () => {
    if (!canSendEmail) {
      toast.error('You do not have permission to dispatch bulk emails.');
      return;
    }
    if (eligibleRecipients.length === 0) {
      toast.error('No eligible recipients with valid email addresses selected.');
      return;
    }
    if (!subjectTemplate.trim() || !bodyTemplate.trim()) {
      toast.error('Template subject and message body cannot be empty.');
      return;
    }

    setEmailProgress({
      total: eligibleRecipients.length,
      completed: 0,
      successful: 0,
      failed: 0,
      isSending: true,
      errors: [],
    });

    try {
      const result = await dispatchBulkEmail({
        recipients: eligibleRecipients,
        subjectTemplate,
        bodyTemplate,
        attachment,
        templateId: selectedTemplateId,
        onProgress: (completed, successful, failed) => {
          setEmailProgress((prev) => ({
            ...prev,
            completed,
            successful,
            failed,
          }));
        },
      });

      setEmailProgress((prev) => ({
        ...prev,
        isSending: false,
        successful: result.successful,
        failed: result.failed,
        errors: result.errors,
      }));

      if (result.successful > 0) {
        toast.success(`Successfully dispatched ${result.successful} broadcast emails!`);
      }
      if (result.failed > 0) {
        toast.error(`Failed to deliver to ${result.failed} recipient(s).`);
      }
    } catch (err: any) {
      console.error('Batch email error:', err);
      toast.error('Batch broadcast dispatch encountered an error.');
      setEmailProgress((prev) => ({ ...prev, isSending: false }));
    }
  };

  // ─────────────────────────────────────────────────────────────
  // WHATSAPP BROADCAST DISPATCHER
  // ─────────────────────────────────────────────────────────────
  const handleOpenWhatsAppRecipient = (recipient: MessagingRecipient) => {
    if (!canSendWhatsApp) {
      toast.error('You do not have permission to dispatch WhatsApp messages.');
      return;
    }
    const ok = openWhatsAppChat({
      recipient,
      subjectTemplate,
      bodyTemplate,
      attachment,
      templateId: selectedTemplateId,
    });

    if (ok) {
      setOpenedWhatsAppIds((prev) => ({ ...prev, [recipient.id]: true }));
      toast.success(`Launched WhatsApp dispatch for ${recipient.name}`);
    } else {
      toast.error(`Invalid WhatsApp phone number for ${recipient.name}`);
    }
  };

  const handleOpenNextPendingWhatsApp = () => {
    const nextRecipient = eligibleRecipients.find((r) => !openedWhatsAppIds[r.id]);
    if (!nextRecipient) {
      toast.success('All WhatsApp broadcast chats have been launched!');
      return;
    }
    handleOpenWhatsAppRecipient(nextRecipient);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Members Broadcast & Group Messaging"
      size="2xl"
    >
      <div className="space-y-5">
        {/* Architectural Hierarchy Notice */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between text-xs text-slate-600 gap-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-purple-600 shrink-0" />
            <span>
              <strong>Send &amp; Dispatch Console:</strong> Templates and dynamic parameter tags are centrally governed in{' '}
              <span className="font-semibold text-purple-700">Automation Control</span>. Template editing and tag modification are strictly restricted to the Central Hub.
            </span>
          </div>
          {isAdmin && (
            <a
              href="/automation"
              target="_blank"
              rel="noopener noreferrer"
              className="text-purple-600 hover:text-purple-800 font-bold shrink-0 flex items-center gap-1 hover:underline"
              title="Open Central Automation Hub"
            >
              <span>Automation Control</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>

        {/* Top Header Controls: Channel & Step Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-200">
          {/* Dual-Channel Dispatch Selector */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setChannel('email')}
              className={`flex items-center px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                channel === 'email'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Mail className="w-4 h-4 mr-2" />
              Bulk Email
            </button>
            <button
              type="button"
              onClick={() => setChannel('whatsapp')}
              className={`flex items-center px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                channel === 'whatsapp'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              Bulk WhatsApp
            </button>
          </div>

          {/* Workflow Step Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab('template')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                activeTab === 'template'
                  ? 'bg-purple-100 text-purple-700 ring-1 ring-purple-300 font-bold'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              1. Select Template &amp; Preview
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('recipients')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                activeTab === 'recipients'
                  ? 'bg-purple-100 text-purple-700 ring-1 ring-purple-300 font-bold'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              2. Target Recipients ({selectedRecipientIds.size})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('dispatch')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                activeTab === 'dispatch'
                  ? 'bg-purple-600 text-white shadow-xs font-bold'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              3. Dispatch Broadcast ({eligibleRecipients.length})
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: TEMPLATE SELECTION & LIVE PREVIEW (SEND & DISPATCH ONLY)           */}
        {/* STATED RULE: No editing or template creation allowed on this page.        */}
        {/* STATED RULE: No "Active Dynamic Tags" or "Add Tag" controls are visible.  */}
        {/* ========================================================================= */}
        {activeTab === 'template' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Left Column: Template Selection & Content Readout */}
            <div className="lg:col-span-7 space-y-4">
              {/* Template Library Dropdown (Synched in real-time from Automation Control) */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-700">
                    Template Library (Automation Control)
                  </label>
                  <span className="text-[11px] font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full">
                    {templates.length} Templates Active
                  </span>
                </div>

                <select
                  value={selectedTemplateId}
                  onChange={(e) => setSelectedTemplateId(e.target.value)}
                  className="w-full text-sm font-semibold rounded-lg border-slate-300 bg-white text-slate-900 focus:ring-purple-500 focus:border-purple-500 py-2.5 shadow-xs"
                >
                  <optgroup label="✨ Preset Announcements">
                    {templates
                      .filter((t) => !t.isCustom)
                      .map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                  </optgroup>
                  {templates.some((t) => t.isCustom) && (
                    <optgroup label="💾 Automation Control Custom Templates">
                      {templates
                        .filter((t) => t.isCustom)
                        .map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name} ({t.category})
                          </option>
                        ))}
                    </optgroup>
                  )}
                </select>

                <p className="text-[11px] text-slate-500 italic">
                  Selecting a template automatically binds its message structure and substituted parameters.
                </p>
              </div>

              {/* Template Readout Card (Read-Only) */}
              <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-2">
                    <Folder className="w-4 h-4 text-purple-600" />
                    <span className="text-xs font-bold text-slate-800">
                      {selectedTemplate?.name || 'Selected Template'}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                    Category: {selectedTemplate?.category || 'General'}
                  </span>
                </div>

                {channel === 'email' && (
                  <div>
                    <span className="text-[11px] font-bold text-slate-500 block mb-1">
                      Subject Line:
                    </span>
                    <div className="px-3 py-2 bg-slate-50 rounded-lg border border-slate-200 text-xs font-semibold text-slate-800 font-mono">
                      {subjectTemplate}
                    </div>
                  </div>
                )}

                <div>
                  <span className="text-[11px] font-bold text-slate-500 block mb-1">
                    Template Body Content:
                  </span>
                  <div className="px-3 py-2.5 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-700 whitespace-pre-wrap font-mono leading-relaxed max-h-[160px] overflow-y-auto">
                    {bodyTemplate}
                  </div>
                </div>
              </div>

              {/* Attachment & Media Section */}
              <div className="p-3.5 rounded-xl border border-dashed border-slate-300 bg-slate-50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center">
                    <Paperclip className="w-4 h-4 mr-1.5 text-purple-600" />
                    Attach Document or Media (Optional)
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowMediaUrlInput(!showMediaUrlInput)}
                    className="text-xs text-purple-600 hover:underline font-semibold"
                  >
                    {showMediaUrlInput ? 'Upload File Instead' : 'Use Existing Media URL'}
                  </button>
                </div>

                {showMediaUrlInput ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="url"
                      value={manualMediaUrl}
                      onChange={(e) => setManualMediaUrl(e.target.value)}
                      placeholder="https://example.com/document.pdf or image link"
                      className="flex-1 text-xs rounded-lg border-slate-300 bg-white text-slate-900 py-1.5"
                    />
                    <button
                      type="button"
                      onClick={handleAddMediaUrl}
                      className="px-3 py-1.5 bg-purple-600 text-white text-xs font-semibold rounded-lg hover:bg-purple-700"
                    >
                      Attach
                    </button>
                  </div>
                ) : (
                  <div>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      accept="image/jpeg,image/png,image/webp,application/pdf"
                      className="hidden"
                      id="group-msg-file-input"
                    />
                    <label
                      htmlFor="group-msg-file-input"
                      className="flex items-center justify-center p-2.5 bg-white border border-slate-300 rounded-lg cursor-pointer hover:bg-slate-50 text-xs font-medium text-slate-700 gap-2 transition"
                    >
                      {isUploadingAttachment ? (
                        <>
                          <Loader2 className="w-4 h-4 text-purple-600 animate-spin" />
                          <span>Uploading attachment...</span>
                        </>
                      ) : (
                        <>
                          <Paperclip className="w-4 h-4 text-purple-600" />
                          <span>Choose PDF or Image from Computer (Max 15MB)</span>
                        </>
                      )}
                    </label>
                  </div>
                )}

                {attachment && (
                  <div className="flex items-center justify-between p-2 bg-purple-50 border border-purple-200 rounded-lg text-xs">
                    <div className="flex items-center gap-2 truncate">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="font-semibold text-purple-900 truncate">{attachment.name}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAttachment(null)}
                      className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                      title="Remove Attachment"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Audience Target Selector & Live Sample Preview */}
            <div className="lg:col-span-5 space-y-4">
              {/* Audience Target Recipient Group */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-700">
                    Target Recipient Group
                  </h4>
                  <span className="text-[11px] font-bold text-purple-700">
                    {eligibleRecipients.length} Selected
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCategory('members')}
                    className={`p-2.5 rounded-lg text-left border transition-all ${
                      category === 'members'
                        ? 'border-purple-600 bg-purple-50/80 ring-1 ring-purple-600'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900">Members - {categoryCounts.members}</span>
                      <Users className="w-3.5 h-3.5 text-purple-600" />
                    </div>
                    <span className="text-[11px] text-slate-500">Drivers &amp; individuals</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCategory('companies')}
                    className={`p-2.5 rounded-lg text-left border transition-all ${
                      category === 'companies'
                        ? 'border-purple-600 bg-purple-50/80 ring-1 ring-purple-600'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900">Companies - {categoryCounts.companies}</span>
                      <Building2 className="w-3.5 h-3.5 text-purple-600" />
                    </div>
                    <span className="text-[11px] text-slate-500">Corporate accounts</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCategory('claims')}
                    className={`p-2.5 rounded-lg text-left border transition-all ${
                      category === 'claims'
                        ? 'border-purple-600 bg-purple-50/80 ring-1 ring-purple-600'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900">Claims - {categoryCounts.claims}</span>
                      <ShieldAlert className="w-3.5 h-3.5 text-purple-600" />
                    </div>
                    <span className="text-[11px] text-slate-500">Incident contacts</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCategory('all')}
                    className={`p-2.5 rounded-lg text-left border transition-all ${
                      category === 'all'
                        ? 'border-purple-600 bg-purple-50/80 ring-1 ring-purple-600'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900">All - {categoryCounts.all}</span>
                      <Radio className="w-3.5 h-3.5 text-purple-600" />
                    </div>
                    <span className="text-[11px] text-slate-500">Total database</span>
                  </button>
                </div>

                <div className="pt-2 border-t border-slate-200 flex justify-between text-xs text-slate-600">
                  <span>Selected for Dispatch:</span>
                  <span className="font-bold text-purple-600">
                    {eligibleRecipients.length} / {categoryRecipients.length}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveTab('recipients')}
                  className="w-full py-1.5 text-xs text-center font-semibold text-purple-600 hover:text-purple-700 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors flex items-center justify-center gap-1"
                >
                  Manage Individual Recipients ({selectedRecipientIds.size})
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* LIVE RENDERED SAMPLE PREVIEW CARD (DYNAMIC TAG SUBSTITUTION) */}
              <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-2.5 shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                    <Eye className="w-4 h-4 text-purple-600" />
                    Live Rendered Preview
                  </span>
                  <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                    Simulated: {sampleRecipient.name}
                  </span>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2 overflow-y-auto max-h-[220px]">
                  {channel === 'email' && (
                    <div className="border-b border-slate-200 pb-1.5 mb-1.5">
                      <span className="font-bold text-slate-500">Subject: </span>
                      <span className="font-extrabold text-slate-900">
                        {previewSubject || '(Empty subject)'}
                      </span>
                    </div>
                  )}

                  <div className="whitespace-pre-wrap font-sans text-slate-800 leading-relaxed text-[12px]">
                    {previewBody || '(Empty body)'}
                  </div>
                </div>

                {/* Dispatch Trigger Button */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('dispatch')}
                    className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-black flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer"
                  >
                    <span>Proceed to Dispatch Broadcast ({eligibleRecipients.length})</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: TARGET RECIPIENTS SELECTION                                        */}
        {/* ========================================================================= */}
        {activeTab === 'recipients' && (
          <div className="space-y-4">
            {/* Filter Pills & Search */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                {[
                  { id: 'members' as const, label: `Members - ${categoryCounts.members}`, count: categoryCounts.members, icon: Users },
                  { id: 'companies' as const, label: `Companies - ${categoryCounts.companies}`, count: categoryCounts.companies, icon: Building2 },
                  { id: 'claims' as const, label: `Claims - ${categoryCounts.claims}`, count: categoryCounts.claims, icon: ShieldAlert },
                  { id: 'all' as const, label: `All - ${categoryCounts.all}`, count: categoryCounts.all, icon: Radio },
                ].map((item) => {
                  const Icon = item.icon;
                  const active = category === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setCategory(item.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                        active
                          ? 'bg-purple-600 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {item.label}
                    </button>
                  );
                })}
              </div>

              {/* Search Bar */}
              <div className="relative min-w-[240px]">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={recipientSearch}
                  onChange={(e) => setRecipientSearch(e.target.value)}
                  placeholder="Search recipients by name, phone, email..."
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border-slate-300 bg-white text-slate-900"
                />
              </div>
            </div>

            {/* Selection Toolbar */}
            <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-xs">
              <div className="flex items-center space-x-3">
                <button
                  type="button"
                  onClick={toggleSelectAllFiltered}
                  className="font-semibold text-purple-600 hover:text-purple-700 flex items-center gap-1"
                >
                  {filteredRecipients.every((r) => selectedRecipientIds.has(r.id)) ? (
                    <>
                      <CheckSquare className="w-4 h-4" /> Deselect All Filtered
                    </>
                  ) : (
                    <>
                      <Square className="w-4 h-4" /> Select All Filtered ({filteredRecipients.length})
                    </>
                  )}
                </button>
                <span className="text-slate-300">|</span>
                <span className="text-slate-700">
                  Selected: <strong className="text-purple-600">{selectedRecipientIds.size}</strong> total (
                  {eligibleRecipients.length} valid for {channel === 'email' ? 'Email' : 'WhatsApp'})
                </span>
              </div>

              <span className="text-[11px] text-slate-500">
                Channel: <strong>{channel === 'email' ? 'Bulk Email' : 'Bulk WhatsApp'}</strong>
              </span>
            </div>

            {/* Recipient List Table */}
            <div className="border border-[#E2E8F0] rounded-xl overflow-hidden min-h-[350px] max-h-[600px] sm:max-h-[70vh] overflow-y-auto bg-white shadow-xs">
              <table className="min-w-full border-collapse text-xs">
                <thead className="bg-[#F8FAFC] text-[#334155] border-b-2 border-[#E2E8F0] sticky top-0 z-10 shadow-xs">
                  <tr className="border-b-2 border-[#E2E8F0]">
                    <th className="px-3.5 py-2.5 text-left text-xs font-semibold text-[#334155] uppercase tracking-wider select-none w-10">Select</th>
                    <th className="px-3.5 py-2.5 text-left text-xs font-semibold text-[#334155] uppercase tracking-wider select-none">Name / Entity</th>
                    <th className="px-3.5 py-2.5 text-left text-xs font-semibold text-[#334155] uppercase tracking-wider select-none">Group</th>
                    <th className="px-3.5 py-2.5 text-left text-xs font-semibold text-[#334155] uppercase tracking-wider select-none">Email Address</th>
                    <th className="px-3.5 py-2.5 text-left text-xs font-semibold text-[#334155] uppercase tracking-wider select-none">Mobile / WhatsApp</th>
                    <th className="px-3.5 py-2.5 text-center text-xs font-semibold text-[#334155] uppercase tracking-wider select-none">Channel Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecipients.map((r, idx) => {
                    const isSelected = selectedRecipientIds.has(r.id);
                    const hasEmail = !!r.email && r.email.includes('@');
                    const hasWhatsApp = !!formatWhatsAppNumber(r.phone);
                    const isEligible = channel === 'email' ? hasEmail : hasWhatsApp;
                    const isEven = idx % 2 === 1;
                    const rowBg = isSelected
                      ? 'bg-blue-100/70 font-medium'
                      : isEven
                      ? 'bg-[#EEF5FD]'
                      : 'bg-white';

                    return (
                      <tr
                        key={r.id}
                        onClick={() => toggleRecipient(r.id)}
                        className={`group border-b border-[#E2E8F0] ${rowBg} hover:bg-[#DCEBFA] cursor-pointer transition-all duration-150 ease-in-out`}
                      >
                        <td className="px-3.5 py-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleRecipient(r.id)}
                            className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4 cursor-pointer"
                          />
                        </td>
                        <td className="px-3.5 py-2.5 font-bold text-slate-900">
                          <div>{r.name}</div>
                          {r.companyName && r.companyName !== r.name && (
                            <div className="text-[11px] text-slate-500 font-normal">{r.companyName}</div>
                          )}
                        </td>
                        <td className="px-3.5 py-2.5">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize ${
                              r.category === 'companies'
                                ? 'bg-blue-100 text-blue-800'
                                : r.category === 'claims'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {r.category}
                          </span>
                        </td>
                        <td className="px-3.5 py-2.5 text-slate-700 font-mono">
                          {r.email || <span className="text-slate-400 italic">No email</span>}
                        </td>
                        <td className="px-3.5 py-2.5 text-slate-700 font-mono">
                          {r.phone || <span className="text-slate-400 italic">No phone</span>}
                        </td>
                        <td className="px-3.5 py-2.5 text-center">
                          {isEligible ? (
                            <span className="inline-flex items-center text-emerald-700 font-bold text-[11px]">
                              <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                              Ready
                            </span>
                          ) : (
                            <span className="inline-flex items-center text-slate-500 text-[11px] font-medium">
                              <AlertTriangle className="w-3.5 h-3.5 mr-1 text-amber-600" />
                              Missing {channel === 'email' ? 'Email' : 'Number'}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {filteredRecipients.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-slate-500 text-xs font-medium">
                        No recipients match your search filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between items-center pt-2">
              <button
                type="button"
                onClick={() => setActiveTab('template')}
                className="px-4 py-2 border border-slate-300 text-xs font-semibold rounded-lg text-slate-700 hover:bg-slate-50"
              >
                Back to Template
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('dispatch')}
                className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-lg shadow-xs flex items-center gap-1.5"
              >
                Proceed to Review &amp; Dispatch ({eligibleRecipients.length})
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: REVIEW & DISPATCH BROADCAST                                        */}
        {/* ========================================================================= */}
        {activeTab === 'dispatch' && (
          <div className="space-y-4">
            {/* Dispatch Summary Banner */}
            <div className="p-4 bg-purple-50 rounded-xl border border-purple-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-bold text-purple-950 flex items-center gap-1.5">
                  <Send className="w-4 h-4 text-purple-600" />
                  Ready to Dispatch: {channel === 'email' ? 'Bulk Email Broadcast' : 'Bulk WhatsApp Broadcast'}
                </h4>
                <p className="text-xs text-purple-800 mt-0.5">
                  Template: <strong>{templateName}</strong> • Targeted Audience:{' '}
                  <strong className="capitalize">{category}</strong> • Eligible Recipients:{' '}
                  <strong>{eligibleRecipients.length}</strong>
                  {attachment && ` • Attachment: ${attachment.name}`}
                </p>
              </div>

              {channel === 'email' ? (
                <button
                  type="button"
                  onClick={handleStartBulkEmail}
                  disabled={emailProgress.isSending || eligibleRecipients.length === 0}
                  className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                >
                  {emailProgress.isSending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Dispatching ({emailProgress.completed}/{emailProgress.total})...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Dispatch Broadcast Email Now</span>
                    </>
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleOpenNextPendingWhatsApp}
                  disabled={eligibleRecipients.length === 0}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Launch WhatsApp Queue ({eligibleRecipients.filter((r) => !openedWhatsAppIds[r.id]).length} pending)</span>
                </button>
              )}
            </div>

            {/* Email Dispatch Progress Tracking */}
            {channel === 'email' && emailProgress.total > 0 && (
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700">Dispatch Progress:</span>
                  <span className="font-mono font-bold text-slate-900">
                    {emailProgress.completed} of {emailProgress.total} completed ({emailProgress.successful} sent, {emailProgress.failed} failed)
                  </span>
                </div>

                <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-purple-600 h-2 transition-all duration-300 rounded-full"
                    style={{
                      width: `${Math.round((emailProgress.completed / (emailProgress.total || 1)) * 100)}%`,
                    }}
                  />
                </div>

                {emailProgress.errors.length > 0 && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs space-y-1">
                    <span className="font-bold text-red-800">Errors encountered:</span>
                    <ul className="list-disc pl-4 text-red-700 space-y-0.5 max-h-24 overflow-y-auto">
                      {emailProgress.errors.map((err, i) => (
                        <li key={i}>
                          <strong>{err.recipientName}:</strong> {err.error}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* WhatsApp Queue Table */}
            {channel === 'whatsapp' && (
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-white max-h-[350px] overflow-y-auto">
                <table className="min-w-full text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold sticky top-0">
                    <tr>
                      <th className="px-3.5 py-2 text-left">Recipient</th>
                      <th className="px-3.5 py-2 text-left">Mobile</th>
                      <th className="px-3.5 py-2 text-center">Status</th>
                      <th className="px-3.5 py-2 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {eligibleRecipients.map((r) => {
                      const isLaunched = openedWhatsAppIds[r.id];
                      return (
                        <tr key={r.id} className="hover:bg-slate-50">
                          <td className="px-3.5 py-2 font-medium text-slate-900">{r.name}</td>
                          <td className="px-3.5 py-2 text-slate-600 font-mono">{r.phone}</td>
                          <td className="px-3.5 py-2 text-center">
                            {isLaunched ? (
                              <span className="inline-flex items-center text-emerald-600 font-semibold text-[11px]">
                                <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                                Launched
                              </span>
                            ) : (
                              <span className="text-slate-400 text-[11px]">Pending</span>
                            )}
                          </td>
                          <td className="px-3.5 py-2 text-right">
                            <button
                              type="button"
                              onClick={() => handleOpenWhatsAppRecipient(r)}
                              className={`px-2.5 py-1 rounded text-[11px] font-semibold transition ${
                                isLaunched
                                  ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                  : 'bg-emerald-600 text-white hover:bg-emerald-700'
                              }`}
                            >
                              {isLaunched ? 'Reopen' : 'Open Chat'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Back Button */}
            <div className="flex justify-between items-center pt-2">
              <button
                type="button"
                onClick={() => setActiveTab('template')}
                className="px-4 py-2 border border-slate-300 text-xs font-semibold rounded-lg text-slate-700 hover:bg-slate-50"
              >
                Back to Template &amp; Preview
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default GroupMessagingModal;
