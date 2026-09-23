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
  fetchGlobalTemplates,
  saveGlobalTemplate,
  uploadMessagingAttachment,
  dispatchBulkEmail,
  openWhatsAppChat,
  replaceGroupPlaceholders,
  AVAILABLE_PLACEHOLDERS,
  DEFAULT_TEMPLATES,
} from '../../utils/groupMessaging';
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
  FileText,
  Image as ImageIcon,
  Save,
  Plus,
  Play,
  CheckCircle2,
  AlertTriangle,
  Copy,
  ExternalLink,
  Loader2,
  Eye,
  EyeOff,
  Sparkles,
  Send,
  ChevronRight,
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
  const canUseTemplates = isAdmin || can('customers', 'template');
  const canEditTemplates = isAdmin || can('customers', 'templateEdit');
  const canCreateTemplates = isAdmin || can('customers', 'templateCreate') || can('customers', 'templateEdit');

  // Navigation tabs in modal
  const [activeTab, setActiveTab] = useState<'compose' | 'recipients' | 'dispatch'>('compose');

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

  // Templates
  const [templates, setTemplates] = useState<GlobalMessageTemplate[]>(DEFAULT_TEMPLATES);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(DEFAULT_TEMPLATES[0].id);
  const [templateName, setTemplateName] = useState<string>(DEFAULT_TEMPLATES[0].name);
  const [subjectTemplate, setSubjectTemplate] = useState<string>(DEFAULT_TEMPLATES[0].subjectTemplate);
  const [bodyTemplate, setBodyTemplate] = useState<string>(DEFAULT_TEMPLATES[0].bodyTemplate);
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Attachments
  const [attachment, setAttachment] = useState<MessagingAttachment | null>(null);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [manualMediaUrl, setManualMediaUrl] = useState('');
  const [showMediaUrlInput, setShowMediaUrlInput] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const bodyTextareaRef = useRef<HTMLTextAreaElement | null>(null);

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

  // Load templates from database
  useEffect(() => {
    if (!isOpen) return;
    fetchGlobalTemplates().then((list) => {
      setTemplates(list);
    });
  }, [isOpen]);

  // Handle template selection change
  const handleSelectTemplate = (tempId: string) => {
    setSelectedTemplateId(tempId);
    if (tempId === 'new_custom') {
      setTemplateName('New Custom News Flash');
      setSubjectTemplate('📢 Notice from AIE Skyline');
      setBodyTemplate(`Dear {customer_name},\n\n[Write your announcement here...]\n\nKind regards,\nAIE Skyline Team`);
      return;
    }
    const found = templates.find((t) => t.id === tempId);
    if (found) {
      setTemplateName(found.name);
      setSubjectTemplate(found.subjectTemplate);
      setBodyTemplate(found.bodyTemplate);
    }
  };

  // Insert tag into body textarea at cursor position
  const insertPlaceholder = (tag: string) => {
    const el = bodyTextareaRef.current;
    if (!el) {
      setBodyTemplate((prev) => prev + ' ' + tag);
      return;
    }
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const newText = bodyTemplate.substring(0, start) + tag + bodyTemplate.substring(end);
    setBodyTemplate(newText);
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + tag.length, start + tag.length);
    }, 50);
  };

  // Save template to database
  const handleSaveTemplate = async (saveAsNew: boolean = false) => {
    if (saveAsNew && !canCreateTemplates) {
      toast.error('You do not have permission to create templates.');
      return;
    }
    if (!saveAsNew && !canEditTemplates && !canCreateTemplates) {
      toast.error('You do not have permission to edit or save templates.');
      return;
    }

    if (!templateName.trim()) {
      toast.error('Please enter a Template Name');
      return;
    }
    if (!subjectTemplate.trim()) {
      toast.error('Please enter a Subject Line');
      return;
    }
    if (!bodyTemplate.trim()) {
      toast.error('Please enter Message Body');
      return;
    }

    setIsSavingTemplate(true);
    const toastId = toast.loading(saveAsNew ? 'Creating new template...' : 'Saving template...');
    try {
      const savedId = await saveGlobalTemplate({
        id: selectedTemplateId,
        name: templateName,
        subjectTemplate,
        bodyTemplate,
        category: 'Group Messaging',
        saveAsNew,
      });

      const updatedList = await fetchGlobalTemplates();
      setTemplates(updatedList);
      setSelectedTemplateId(savedId);

      toast.success(`Template "${templateName}" saved to communication database!`, { id: toastId });
    } catch (err: any) {
      console.error('Failed to save template:', err);
      toast.error('Failed to save template', { id: toastId });
    } finally {
      setIsSavingTemplate(false);
    }
  };

  // File upload handler
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
      toast.success('Media attachment uploaded and linked!', { id: toastId });
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
    toast.success('Media attachment link attached!');
  };

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

  // Bulk Email Dispatcher
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
      toast.error('Subject and message body cannot be empty.');
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
        toast.success(`Successfully dispatched ${result.successful} emails!`);
      }
      if (result.failed > 0) {
        toast.error(`Failed to send to ${result.failed} recipient(s).`);
      }
    } catch (err: any) {
      console.error('Batch email error:', err);
      toast.error('Batch email dispatch encountered an error.');
      setEmailProgress((prev) => ({ ...prev, isSending: false }));
    }
  };

  // Open single WhatsApp from queue
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
      toast.success(`Opened WhatsApp chat for ${recipient.name}`);
    } else {
      toast.error(`Invalid WhatsApp phone number for ${recipient.name}`);
    }
  };

  // Find next pending WhatsApp recipient and open
  const handleOpenNextPendingWhatsApp = () => {
    const nextRecipient = eligibleRecipients.find((r) => !openedWhatsAppIds[r.id]);
    if (!nextRecipient) {
      toast.success('All WhatsApp recipient chats have been launched!');
      return;
    }
    handleOpenWhatsAppRecipient(nextRecipient);
  };

  // Sample recipient for live preview
  const sampleRecipient = eligibleRecipients[0] ||
    categoryRecipients[0] || {
      id: 'sample',
      name: 'Michael Scott',
      firstName: 'Michael',
      email: 'michael@example.com',
      phone: '07999123456',
      category: 'members',
      companyName: 'Dunder Mifflin',
      source: 'customer',
    };

  const previewSubject = replaceGroupPlaceholders(subjectTemplate, sampleRecipient, attachment);
  const previewBody = replaceGroupPlaceholders(bodyTemplate, sampleRecipient, attachment);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Group Messaging & Global News Flash"
      size="2xl"
    >
      <div className="space-y-5">
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

          {/* Workflow View Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab('compose')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                activeTab === 'compose'
                  ? 'bg-purple-100 text-purple-700 ring-1 ring-purple-300'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              1. Compose & Template
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('recipients')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                activeTab === 'recipients'
                  ? 'bg-purple-100 text-purple-700 ring-1 ring-purple-300'
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
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              3. Review & Dispatch ({eligibleRecipients.length})
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: COMPOSE & TEMPLATE BUILDER */}
        {/* ========================================================================= */}
        {activeTab === 'compose' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Left: Editor form */}
            <div className="lg:col-span-8 space-y-4">
              {/* Template selector & Save banner */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Select From Template Library
                  </label>
                  <select
                    value={selectedTemplateId}
                    onChange={(e) => handleSelectTemplate(e.target.value)}
                    className="w-full text-sm rounded-lg border-slate-300 bg-white text-slate-900 focus:ring-purple-500 focus:border-purple-500 py-1.5"
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
                      <optgroup label="💾 Saved Custom Templates">
                        {templates
                          .filter((t) => t.isCustom)
                          .map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.name} ({t.category})
                            </option>
                          ))}
                      </optgroup>
                    )}
                    <option value="new_custom">+ Create New Custom Template...</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <button
                    type="button"
                    onClick={() => handleSaveTemplate(false)}
                    disabled={isSavingTemplate || (!canEditTemplates && !canCreateTemplates)}
                    className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 transition-colors shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
                    title={!canEditTemplates ? "Permission required to edit templates" : "Save current template back to database"}
                  >
                    <Save className="w-3.5 h-3.5 mr-1.5" />
                    Save Template
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSaveTemplate(true)}
                    disabled={isSavingTemplate || !canCreateTemplates}
                    className="inline-flex items-center px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title={!canCreateTemplates ? "Permission required to create templates" : "Save as new copy in database"}
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    As New Copy
                  </button>
                </div>
              </div>

              {/* Template Name & Subject */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Template Name
                  </label>
                  <input
                    type="text"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    placeholder="e.g. Easter Holiday Operations Update"
                    className="w-full text-sm rounded-lg border-slate-300 bg-white text-slate-900 focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Subject Line / Headline
                  </label>
                  <input
                    type="text"
                    value={subjectTemplate}
                    onChange={(e) => setSubjectTemplate(e.target.value)}
                    placeholder="e.g. Important Service Notice - {customer_name}"
                    className="w-full text-sm rounded-lg border-slate-300 bg-white text-slate-900 focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>
              </div>

              {/* Placeholder insertion chips */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-700 flex items-center">
                    <Sparkles className="w-3.5 h-3.5 mr-1 text-purple-600" />
                    Insert Placeholder Tags (Click to add):
                  </label>
                  <span className="text-[11px] text-slate-500">Replaced automatically per recipient</span>
                </div>
                <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50 rounded-lg border border-slate-200">
                  {AVAILABLE_PLACEHOLDERS.map((ph) => (
                    <button
                      key={ph.tag}
                      type="button"
                      onClick={() => insertPlaceholder(ph.tag)}
                      className="px-2 py-0.5 rounded-md text-[11px] font-mono font-medium bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 transition-colors"
                      title={ph.desc}
                    >
                      {ph.tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Message Body Textarea */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-slate-700">
                    Message Body Text
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPreview(!showPreview)}
                    className="text-xs text-purple-600 hover:text-purple-700 flex items-center gap-1"
                  >
                    {showPreview ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    {showPreview ? 'Hide Live Preview' : 'Show Live Preview'}
                  </button>
                </div>
                <textarea
                  ref={bodyTextareaRef}
                  value={bodyTemplate}
                  onChange={(e) => setBodyTemplate(e.target.value)}
                  rows={8}
                  className="w-full text-sm font-sans rounded-lg border-slate-300 bg-white text-slate-900 focus:ring-purple-500 focus:border-purple-500"
                  placeholder="Enter message text here..."
                />
              </div>

              {/* Attachment & Media Section */}
              <div className="p-3.5 rounded-xl border border-dashed border-slate-300 bg-slate-50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-800 flex items-center">
                    <Paperclip className="w-4 h-4 mr-1.5 text-purple-600" />
                    Attach Document or Media (PDF / Image)
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowMediaUrlInput(!showMediaUrlInput)}
                      className="text-xs text-purple-600 hover:underline font-medium"
                    >
                      {showMediaUrlInput ? 'Upload File Instead' : 'Use Existing Media URL'}
                    </button>
                  </div>
                </div>

                {/* Upload or URL input */}
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
                      className="flex items-center justify-center p-3 border border-slate-200 rounded-lg bg-white hover:bg-slate-50 cursor-pointer transition-colors"
                    >
                      {isUploadingAttachment ? (
                        <div className="flex items-center text-xs text-purple-600">
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Uploading media to cloud storage...
                        </div>
                      ) : (
                        <div className="flex items-center text-xs text-slate-600">
                          <ImageIcon className="w-4 h-4 mr-2 text-purple-600" />
                          Click to select a JPG, PNG, or PDF file to attach
                        </div>
                      )}
                    </label>
                  </div>
                )}

                {/* Attached file badge */}
                {attachment && (
                  <div className="mt-2.5 flex items-center justify-between p-2.5 bg-purple-50 border border-purple-200 rounded-lg">
                    <div className="flex items-center space-x-2.5 overflow-hidden">
                      {attachment.type.startsWith('image/') ? (
                        <img
                          src={attachment.url}
                          alt="preview"
                          className="w-9 h-9 object-cover rounded-md border border-purple-200"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-9 h-9 bg-purple-100 text-purple-600 rounded-md flex items-center justify-center">
                          <FileText className="w-5 h-5" />
                        </div>
                      )}
                      <div className="truncate">
                        <p className="text-xs font-bold text-slate-900 truncate">
                          {attachment.name}
                        </p>
                        <p className="text-[11px] text-purple-700">
                          {attachment.type.includes('pdf') ? 'PDF Document' : 'Image File'} •{' '}
                          {attachment.size > 0 ? `${(attachment.size / 1024).toFixed(1)} KB` : 'Attached URL'}
                        </p>
                      </div>
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

            {/* Right: Quick Target Summary & Live Preview */}
            <div className="lg:col-span-4 space-y-4">
              {/* Audience Target Summary Card */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Target Recipient Group
                </h4>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCategory('members')}
                    className={`p-2.5 rounded-lg text-left border transition-all ${
                      category === 'members'
                        ? 'border-purple-600 bg-purple-50/80 ring-1 ring-purple-600'
                        : 'border-slate-200 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900">Members</span>
                      <Users className="w-3.5 h-3.5 text-purple-600" />
                    </div>
                    <span className="text-[11px] text-slate-500">{categoryCounts.members} drivers</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCategory('companies')}
                    className={`p-2.5 rounded-lg text-left border transition-all ${
                      category === 'companies'
                        ? 'border-purple-600 bg-purple-50/80 ring-1 ring-purple-600'
                        : 'border-slate-200 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900">Companies</span>
                      <Building2 className="w-3.5 h-3.5 text-purple-600" />
                    </div>
                    <span className="text-[11px] text-slate-500">{categoryCounts.companies} accounts</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCategory('claims')}
                    className={`p-2.5 rounded-lg text-left border transition-all ${
                      category === 'claims'
                        ? 'border-purple-600 bg-purple-50/80 ring-1 ring-purple-600'
                        : 'border-slate-200 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900">Claims</span>
                      <ShieldAlert className="w-3.5 h-3.5 text-purple-600" />
                    </div>
                    <span className="text-[11px] text-slate-500">{categoryCounts.claims} contacts</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCategory('all')}
                    className={`p-2.5 rounded-lg text-left border transition-all ${
                      category === 'all'
                        ? 'border-purple-600 bg-purple-50/80 ring-1 ring-purple-600'
                        : 'border-slate-200 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900">All</span>
                      <Radio className="w-3.5 h-3.5 text-purple-600" />
                    </div>
                    <span className="text-[11px] text-slate-500">{categoryCounts.all} total</span>
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
                  Manage Individual Recipients
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Live Preview Card */}
              <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-2.5 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center">
                    <Eye className="w-3.5 h-3.5 mr-1 text-purple-600" />
                    Live Rendered Preview
                  </span>
                  <span className="text-[11px] text-slate-500 font-mono">
                    Sample: {sampleRecipient.name}
                  </span>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-2 overflow-y-auto max-h-[300px]">
                  {channel === 'email' && (
                    <div className="border-b border-slate-200 pb-1.5 mb-1.5">
                      <span className="font-semibold text-slate-500">Subject: </span>
                      <span className="font-bold text-slate-900">
                        {previewSubject || '(Empty subject)'}
                      </span>
                    </div>
                  )}

                  <div className="whitespace-pre-wrap font-sans text-slate-800 leading-relaxed text-[12px]">
                    {previewBody || '(Empty body)'}
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('dispatch')}
                    className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors"
                  >
                    Proceed to Dispatch ({eligibleRecipients.length})
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: TARGET RECIPIENTS SELECTION */}
        {/* ========================================================================= */}
        {activeTab === 'recipients' && (
          <div className="space-y-4">
            {/* Filter Pills & Search */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                {[
                  { id: 'members' as const, label: 'Members', count: categoryCounts.members, icon: Users },
                  { id: 'companies' as const, label: 'Companies', count: categoryCounts.companies, icon: Building2 },
                  { id: 'claims' as const, label: 'Claims Members', count: categoryCounts.claims, icon: ShieldAlert },
                  { id: 'all' as const, label: 'All Contacts', count: categoryCounts.all, icon: Radio },
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
                      {item.label} ({item.count})
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
                onClick={() => setActiveTab('compose')}
                className="px-4 py-2 border border-slate-300 text-xs font-semibold rounded-lg text-slate-700 hover:bg-slate-50"
              >
                Back to Compose
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('dispatch')}
                className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-lg shadow-xs flex items-center gap-1.5"
              >
                Proceed to Review & Dispatch ({eligibleRecipients.length})
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: REVIEW & DISPATCH */}
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
                  disabled={emailProgress.isSending || eligibleRecipients.length === 0 || !canSendEmail}
                  className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  title={!canSendEmail ? "Permission required to dispatch emails" : undefined}
                >
                  {emailProgress.isSending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Dispatching Batch...
                    </>
                  ) : (
                    <>
                      <Mail className="w-4 h-4" />
                      Send Bulk Email Now ({eligibleRecipients.length})
                    </>
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleOpenNextPendingWhatsApp}
                  disabled={eligibleRecipients.length === 0 || !canSendWhatsApp}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  title={!canSendWhatsApp ? "Permission required to dispatch WhatsApp messages" : undefined}
                >
                  <MessageCircle className="w-4 h-4" />
                  Launch Next WhatsApp Chat
                </button>
              )}
            </div>

            {/* EMAIL PROGRESS BAR */}
            {channel === 'email' && emailProgress.total > 0 && (
              <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-2">
                <div className="flex justify-between text-xs font-semibold text-slate-700">
                  <span>
                    Progress: {emailProgress.completed} / {emailProgress.total} completed
                  </span>
                  <span>
                    Success: <strong className="text-emerald-600">{emailProgress.successful}</strong> | Failed:{' '}
                    <strong className="text-red-600">{emailProgress.failed}</strong>
                  </span>
                </div>
                <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-purple-600 h-full transition-all duration-300"
                    style={{
                      width: `${(emailProgress.completed / emailProgress.total) * 100}%`,
                    }}
                  />
                </div>
                {emailProgress.errors.length > 0 && (
                  <div className="mt-2 text-xs text-red-600 space-y-0.5">
                    {emailProgress.errors.map((err, i) => (
                      <div key={i}>
                        ⚠️ {err.recipientName}: {err.error}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* WHATSAPP RECIPIENT QUEUE */}
            {channel === 'whatsapp' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>
                    Click each recipient below to launch their customized WhatsApp message with attachment payload:
                  </span>
                  <span className="font-semibold text-emerald-600">
                    {Object.keys(openedWhatsAppIds).length} / {eligibleRecipients.length} chats launched
                  </span>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden max-h-[380px] overflow-y-auto divide-y divide-slate-100">
                  {eligibleRecipients.map((rec) => {
                    const isOpened = !!openedWhatsAppIds[rec.id];
                    return (
                      <div
                        key={rec.id}
                        className={`p-3 flex items-center justify-between gap-3 transition-colors ${
                          isOpened
                            ? 'bg-emerald-50/40'
                            : 'bg-white hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center space-x-3 overflow-hidden">
                          <div
                            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                              isOpened
                                ? 'bg-emerald-600 text-white'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {isOpened ? <CheckCircle2 className="w-4 h-4" /> : rec.name[0]}
                          </div>
                          <div className="truncate">
                            <p className="text-xs font-bold text-slate-900 truncate">
                              {rec.name}
                            </p>
                            <p className="text-[11px] text-slate-500 font-mono">
                              {rec.phone} • <span className="capitalize">{rec.category}</span>
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              const previewMsg = replaceGroupPlaceholders(bodyTemplate, rec, attachment);
                              navigator.clipboard.writeText(previewMsg);
                              toast.success('Personalized message copied!');
                            }}
                            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-md border border-slate-200"
                            title="Copy message text"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenWhatsAppRecipient(rec)}
                            disabled={!canSendWhatsApp}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs disabled:opacity-50 disabled:cursor-not-allowed ${
                              isOpened
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                            }`}
                            title={!canSendWhatsApp ? "Permission required to dispatch WhatsApp" : undefined}
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            {isOpened ? 'Re-open Chat' : 'Open WhatsApp'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Final Navigation Actions */}
            <div className="flex justify-between items-center pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setActiveTab('compose')}
                className="px-4 py-2 border border-slate-300 text-xs font-semibold rounded-lg text-slate-700 hover:bg-slate-50"
              >
                Back to Compose
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-lg"
              >
                Done / Close
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
