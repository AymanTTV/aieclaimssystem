// src/components/claims/ClaimCommunicationModal.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { Claim } from '../../types';
import Modal from '../ui/Modal';
import {
  ClaimCommunicationChannel,
  ClaimTemplateCategory,
  ClaimRecipientType,
  ClaimTemplateOption,
  ClaimAttachment,
  SelectableClaimFile,
  extractClaimAvailableFiles,
  resolveClaimContext,
  resolveLegalHandlerDetails,
  replaceClaimTemplatePlaceholders,
  fetchClaimTemplates,
  generateClaimCardPdf,
  executeClaimWhatsApp,
  executeClaimEmail,
} from '../../utils/claimCommunication';
import { fetchLegalHandlers } from '../../utils/legalHandlers';
import { LegalHandler } from '../../types/legalHandler';
import { useAuth } from '../../context/AuthContext';
import ClaimTemplateSearchableSelect from './ClaimTemplateSearchableSelect';
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
  Scale,
  Building,
  AlertCircle,
  RefreshCw,
  Paperclip,
  Image as ImageIcon,
  Video as VideoIcon,
  Eye,
  Check,
  Layers,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface ClaimCommunicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  claim: Claim | null;
  initialChannel?: ClaimCommunicationChannel;
  initialCategory?: ClaimTemplateCategory;
  initialRecipient?: ClaimRecipientType;
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
  initialRecipient = 'client',
  overrideNotes,
  overrideStage,
  onSuccess,
}) => {
  const { user } = useAuth();

  // Primary selections
  const [channel, setChannel] = useState<ClaimCommunicationChannel>(initialChannel);
  const [recipientType, setRecipientType] = useState<ClaimRecipientType>(initialRecipient);
  const [category, setCategory] = useState<ClaimTemplateCategory>(
    initialRecipient === 'legalHandler' ? 'legal_handler' : initialCategory
  );

  const [templates, setTemplates] = useState<ClaimTemplateOption[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  // Client Recipient info
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');

  // Legal Handler Recipient info
  const [legalHandlerName, setLegalHandlerName] = useState('');
  const [legalHandlerFirm, setLegalHandlerFirm] = useState('');
  const [legalHandlerPhone, setLegalHandlerPhone] = useState('');
  const [legalHandlerEmail, setLegalHandlerEmail] = useState('');
  const [legalHandlersList, setLegalHandlersList] = useState<LegalHandler[]>([]);
  const [selectedLegalHandlerId, setSelectedLegalHandlerId] = useState<string>('');

  // Claim Card Attachment & Available Files
  const [claimCardAttachment, setClaimCardAttachment] = useState<ClaimAttachment | null>(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>(
    initialRecipient === 'legalHandler' ? ['claim_card_pdf'] : []
  );

  // Extract all available files from the claim (Claim Card PDF, evidence files, photos)
  const availableFiles = useMemo(() => {
    if (!claim) return [];
    return extractClaimAvailableFiles(claim, claimCardAttachment);
  }, [claim, claimCardAttachment]);

  // Grouped available files for UI presentation
  const claimCardFile = useMemo(() => availableFiles.find((f) => f.id === 'claim_card_pdf'), [availableFiles]);
  const evidenceDocFiles = useMemo(() => availableFiles.filter((f) => f.category === 'document'), [availableFiles]);
  const imageFiles = useMemo(() => availableFiles.filter((f) => f.category === 'image'), [availableFiles]);
  const videoFiles = useMemo(() => availableFiles.filter((f) => f.category === 'video'), [availableFiles]);

  // Message fields
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  // Load Legal Handlers Directory
  useEffect(() => {
    if (!isOpen) return;
    fetchLegalHandlers()
      .then((handlers) => {
        setLegalHandlersList(handlers);
      })
      .catch((err) => {
        console.warn('Could not load legal handlers directory:', err);
      });
  }, [isOpen]);

  // When modal opens or claim changes, re-sync state
  useEffect(() => {
    if (!isOpen || !claim) return;

    setChannel(initialChannel);
    const startRecipient = initialRecipient || 'client';
    setRecipientType(startRecipient);
    const startCategory = startRecipient === 'legalHandler' ? 'legal_handler' : initialCategory;
    setCategory(startCategory);

    // Initialize selected files: Claim Card PDF checked by default for Legal Handler, empty for Client
    setSelectedFileIds(startRecipient === 'legalHandler' ? ['claim_card_pdf'] : []);

    // Resolve client
    const baseContext = resolveClaimContext(claim, overrideNotes, overrideStage);
    setClientName(baseContext.client_name);
    setClientPhone(baseContext.client_phone);
    setClientEmail(baseContext.client_email);

    // Resolve legal handler from claim
    const lhDetails = resolveLegalHandlerDetails(claim);
    setLegalHandlerName(lhDetails.legal_handler_name);
    setLegalHandlerFirm(lhDetails.legal_handler_firm);
    setLegalHandlerPhone(lhDetails.legal_handler_phone);
    setLegalHandlerEmail(lhDetails.legal_handler_email);

    // If claim has an assigned legal handler object with id
    const assignedLhId = (claim.fileHandlers?.legalHandler as any)?.id || '';
    if (assignedLhId) {
      setSelectedLegalHandlerId(assignedLhId);
    }

    // Reset attachment state
    setClaimCardAttachment(null);

    // Load templates
    setLoadingTemplates(true);
    fetchClaimTemplates()
      .then((loaded) => {
        setTemplates(loaded);

        // Pick a default template matching category and channel
        const matching = loaded.filter(
          (t) =>
            t.category === startCategory &&
            (t.channel === 'all' || !t.channel || t.channel === initialChannel)
        );
        const defaultChoice = matching[0] || loaded.find((t) => t.category === startCategory) || loaded[0];
        if (defaultChoice) {
          setSelectedTemplateId(defaultChoice.id);
          applyTemplate(defaultChoice, baseContext);
        }
      })
      .catch((err) => {
        console.error('Failed to load templates:', err);
        toast.error('Could not load claim message templates');
      })
      .finally(() => {
        setLoadingTemplates(false);
      });
  }, [isOpen, claim, initialChannel, initialCategory, initialRecipient, overrideNotes, overrideStage]);

  // Automatic Claim Card PDF generation when Claim Card is selected
  useEffect(() => {
    if (!isOpen || !claim) return;

    if (selectedFileIds.includes('claim_card_pdf')) {
      if (!claimCardAttachment && !generatingPdf) {
        setGeneratingPdf(true);
        generateClaimCardPdf(claim)
          .then((att) => {
            setClaimCardAttachment(att);
          })
          .catch((err) => {
            console.error('Failed to generate Claim Card PDF:', err);
            toast.error('Could not auto-generate Claim Card PDF');
          })
          .finally(() => {
            setGeneratingPdf(false);
          });
      }
    }
  }, [isOpen, claim, selectedFileIds, claimCardAttachment, generatingPdf]);

  // Handler to manually re-generate Claim Card PDF
  const handleRegeneratePdf = async () => {
    if (!claim) return;
    setGeneratingPdf(true);
    try {
      // Clear cached url to force fresh render
      const freshClaim: Claim = { ...claim, claimCardUrl: undefined as any };
      const att = await generateClaimCardPdf(freshClaim);
      setClaimCardAttachment(att);
      toast.success('Claim Card PDF refreshed and attached!');
    } catch (err) {
      console.error('Failed to re-generate Claim Card PDF:', err);
      toast.error('Failed to generate Claim Card PDF');
    } finally {
      setGeneratingPdf(false);
    }
  };

  // Attachment toggle & batch selection handlers
  const handleToggleFile = (fileId: string) => {
    setSelectedFileIds((prev) => {
      const isChecked = prev.includes(fileId);
      const next = isChecked ? prev.filter((id) => id !== fileId) : [...prev, fileId];

      if (!isChecked && fileId === 'claim_card_pdf' && !claimCardAttachment && !generatingPdf && claim) {
        setGeneratingPdf(true);
        generateClaimCardPdf(claim)
          .then((att) => setClaimCardAttachment(att))
          .catch((err) => console.warn('Could not generate claim card PDF on check:', err))
          .finally(() => setGeneratingPdf(false));
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    const allIds = availableFiles.map((f) => f.id);
    setSelectedFileIds(allIds);
    if (allIds.includes('claim_card_pdf') && !claimCardAttachment && !generatingPdf && claim) {
      setGeneratingPdf(true);
      generateClaimCardPdf(claim)
        .then((att) => setClaimCardAttachment(att))
        .catch((err) => console.warn('Could not generate claim card PDF on select all:', err))
        .finally(() => setGeneratingPdf(false));
    }
  };

  const handleSelectAllImages = () => {
    const imgIds = availableFiles.filter((f) => f.category === 'image').map((f) => f.id);
    setSelectedFileIds((prev) => Array.from(new Set([...prev, ...imgIds])));
  };

  const handleSelectAllDocuments = () => {
    const docIds = availableFiles.filter((f) => f.category === 'document' || f.category === 'claim_card').map((f) => f.id);
    setSelectedFileIds((prev) => Array.from(new Set([...prev, ...docIds])));
    if (docIds.includes('claim_card_pdf') && !claimCardAttachment && !generatingPdf && claim) {
      setGeneratingPdf(true);
      generateClaimCardPdf(claim)
        .then((att) => setClaimCardAttachment(att))
        .catch((err) => console.warn('Could not generate claim card PDF on doc select:', err))
        .finally(() => setGeneratingPdf(false));
    }
  };

  const handleClearAll = () => {
    setSelectedFileIds([]);
  };

  // Directory picker selection for Legal Handler
  const handleSelectLegalHandlerFromDirectory = (handlerId: string) => {
    setSelectedLegalHandlerId(handlerId);
    if (!handlerId) return;

    const found = legalHandlersList.find((h) => h.id === handlerId);
    if (found) {
      const name = found.name || '';
      const firm = (found as any).firm || (found as any).company || (found as any).firmName || found.name || '';
      const phone = found.phone || '';
      const email = found.email || '';

      setLegalHandlerName(name);
      setLegalHandlerFirm(firm);
      setLegalHandlerPhone(phone);
      setLegalHandlerEmail(email);

      // Refresh template with new context if current is legal template
      if (currentContext) {
        const updatedCtx = {
          ...currentContext,
          legal_handler_name: name,
          legal_handler_firm: firm,
          legal_handler_email: email,
          legal_handler_phone: phone,
        };
        const currentTpl = templates.find((t) => t.id === selectedTemplateId);
        if (currentTpl) {
          applyTemplate(currentTpl, updatedCtx);
        }
      }

      toast.success(`Selected ${found.name}`);
    }
  };

  // Dynamic context resolution for placeholder hydration
  const currentContext = useMemo(() => {
    if (!claim) return null;
    const base = resolveClaimContext(claim, overrideNotes, overrideStage, {
      legal_handler_name: legalHandlerName,
      legal_handler_firm: legalHandlerFirm,
      legal_handler_email: legalHandlerEmail,
      legal_handler_phone: legalHandlerPhone,
    });
    return {
      ...base,
      client_name: clientName || base.client_name,
      client_phone: clientPhone || base.client_phone,
      client_email: clientEmail || base.client_email,
      legal_handler_name: legalHandlerName || base.legal_handler_name,
      legal_handler_firm: legalHandlerFirm || base.legal_handler_firm,
      legal_handler_email: legalHandlerEmail || base.legal_handler_email,
      legal_handler_phone: legalHandlerPhone || base.legal_handler_phone,
    };
  }, [
    claim,
    overrideNotes,
    overrideStage,
    clientName,
    clientPhone,
    clientEmail,
    legalHandlerName,
    legalHandlerFirm,
    legalHandlerEmail,
    legalHandlerPhone,
  ]);

  // Apply a template to subject and body
  const applyTemplate = (tpl: ClaimTemplateOption, ctx = currentContext) => {
    if (!ctx) return;
    const resolvedSubject = replaceClaimTemplatePlaceholders(tpl.subjectTemplate, ctx);
    const resolvedBody = replaceClaimTemplatePlaceholders(tpl.bodyTemplate, ctx);
    setSubject(resolvedSubject);
    setMessage(resolvedBody);
  };

  // Filter templates based on current category
  const filteredTemplates = useMemo(() => {
    if (category === 'all') return templates;
    return templates.filter((t) => t.category === category);
  }, [templates, category]);

  // Switch Recipient Type: Client vs Legal Handler
  const handleRecipientTypeChange = (newRecipient: ClaimRecipientType) => {
    setRecipientType(newRecipient);

    // Adjust attachment defaults: Legal Handler defaults to having Claim Card PDF checked; Client defaults to not having it unless user picked it
    if (newRecipient === 'legalHandler') {
      setSelectedFileIds((prev) => (prev.includes('claim_card_pdf') ? prev : ['claim_card_pdf', ...prev]));
    } else {
      setSelectedFileIds((prev) => prev.filter((id) => id !== 'claim_card_pdf'));
    }

    // Intelligently adjust category and default template
    let targetCat: ClaimTemplateCategory = category;
    if (newRecipient === 'legalHandler') {
      targetCat = 'legal_handler';
    } else if (category === 'legal_handler') {
      targetCat = 'general';
    }

    setCategory(targetCat);

    const matching = targetCat === 'all' ? templates : templates.filter((t) => t.category === targetCat);
    const choice = matching[0] || templates[0];
    if (choice && currentContext) {
      setSelectedTemplateId(choice.id);
      applyTemplate(choice, currentContext);
    }
  };

  // When category tab changes
  const handleCategoryChange = (newCat: ClaimTemplateCategory) => {
    setCategory(newCat);
    const matching = newCat === 'all' ? templates : templates.filter((t) => t.category === newCat);
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
    const key = token.replace(/[{}]/g, '') as keyof typeof currentContext;
    const val = (currentContext as any)[key] || token;
    setMessage((prev) => `${prev} ${val}`);
  };

  // Send action (WhatsApp or Email)
  const handleSend = async () => {
    if (!claim || !currentContext) return;

    // Gather and resolve all selected attachments
    const selectedAttachments: ClaimAttachment[] = [];
    for (const fileId of selectedFileIds) {
      if (fileId === 'claim_card_pdf') {
        if (claimCardAttachment) {
          selectedAttachments.push(claimCardAttachment);
        } else {
          try {
            const generated = await generateClaimCardPdf(claim);
            setClaimCardAttachment(generated);
            selectedAttachments.push(generated);
          } catch (pdfErr) {
            console.warn('Could not generate claim card PDF attachment:', pdfErr);
          }
        }
      } else {
        const found = availableFiles.find((f) => f.id === fileId);
        if (found && found.url) {
          selectedAttachments.push({
            filename: found.filename,
            url: found.url,
          });
        }
      }
    }

    if (channel === 'whatsapp') {
      const targetPhone = recipientType === 'legalHandler' ? legalHandlerPhone : clientPhone;
      const targetName =
        recipientType === 'legalHandler'
          ? legalHandlerName || legalHandlerFirm || 'Legal Handler'
          : clientName;

      if (!targetPhone.trim()) {
        toast.error(
          `${recipientType === 'legalHandler' ? 'Legal Handler' : 'Client'} phone number is required to send via WhatsApp.`
        );
        return;
      }
      if (!message.trim()) {
        toast.error('Please enter a message to send.');
        return;
      }

      setSending(true);
      try {
        await executeClaimWhatsApp({
          phone: targetPhone,
          message,
          recipientName: targetName,
          claim,
          userName: user?.name,
          templateId: selectedTemplateId,
          subject,
          recipientType,
          attachments: selectedAttachments.length > 0 ? selectedAttachments : undefined,
        });

        toast.success(
          selectedAttachments.length > 0
            ? `WhatsApp opened with ${selectedAttachments.length} attachment link(s) included!`
            : 'WhatsApp link opened successfully!'
        );
        if (onSuccess) onSuccess();
        onClose();
      } catch (err: any) {
        console.error(err);
        toast.error(err.message || 'Failed to generate WhatsApp link');
      } finally {
        setSending(false);
      }
    } else {
      // Email channel
      const targetEmail = recipientType === 'legalHandler' ? legalHandlerEmail : clientEmail;
      const targetName =
        recipientType === 'legalHandler'
          ? legalHandlerName || legalHandlerFirm || 'Legal Handler'
          : clientName;

      if (!targetEmail.trim() || !targetEmail.includes('@')) {
        toast.error(
          `A valid ${recipientType === 'legalHandler' ? 'Legal Handler' : 'client'} email address is required.`
        );
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
      const toastId = toast.loading(
        `Sending email to ${recipientType === 'legalHandler' ? 'Legal Handler' : 'Client'}...`
      );

      try {
        const res = await executeClaimEmail({
          email: targetEmail,
          recipientName: targetName,
          subject,
          body: message,
          claim,
          userName: user?.name,
          templateId: selectedTemplateId,
          recipientType,
          attachments: selectedAttachments.length > 0 ? selectedAttachments : undefined,
        });

        if (res.mode === 'provider') {
          toast.success(
            `Email dispatched to ${recipientType === 'legalHandler' ? 'Legal Handler' : 'Client'} successfully!${
              selectedAttachments.length > 0 ? ` (${selectedAttachments.length} file(s) attached)` : ''
            }`,
            { id: toastId }
          );
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
  const cleanClaimRef = (claim.claimId || claim.id || 'claim').replace(/[^a-zA-Z0-9_-]/g, '_');

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
                {channel === 'whatsapp' ? 'WhatsApp Claim Communication' : 'Email Claim Communication'}
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
        {/* ROW 1: Channel Selector & Recipient Selector */}
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

          {/* Recipient Selector (Client vs Legal Handler) */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Recipient Selection
            </label>
            <div className="grid grid-cols-2 gap-2 bg-gray-100 p-1 rounded-lg">
              <button
                type="button"
                onClick={() => handleRecipientTypeChange('client')}
                className={`flex items-center justify-center space-x-2 py-2 px-3 rounded-md text-sm font-medium transition-all ${
                  recipientType === 'client'
                    ? 'bg-white text-blue-700 shadow-sm border border-blue-200 font-semibold'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <User className="h-4 w-4 text-blue-600" />
                <span>Send to Client</span>
              </button>
              <button
                type="button"
                onClick={() => handleRecipientTypeChange('legalHandler')}
                className={`flex items-center justify-center space-x-2 py-2 px-3 rounded-md text-sm font-medium transition-all ${
                  recipientType === 'legalHandler'
                    ? 'bg-white text-purple-700 shadow-sm border border-purple-200 font-semibold'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Scale className="h-4 w-4 text-purple-600" />
                <span>Send to Legal Handler</span>
              </button>
            </div>
          </div>
        </div>

        {/* ROW 2: Template Category Tabs */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
            Template Category
          </label>
          <div className="flex flex-wrap gap-2">
            {recipientType === 'legalHandler' && (
              <button
                type="button"
                onClick={() => handleCategoryChange('legal_handler')}
                className={`flex items-center space-x-1.5 py-1.5 px-3 rounded-md text-xs sm:text-sm font-medium transition-all ${
                  category === 'legal_handler'
                    ? 'bg-purple-600 text-white shadow-sm font-semibold'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Scale className="h-3.5 w-3.5" />
                <span>Legal Handler</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => handleCategoryChange('general')}
              className={`flex items-center space-x-1.5 py-1.5 px-3 rounded-md text-xs sm:text-sm font-medium transition-all ${
                category === 'general'
                  ? 'bg-blue-600 text-white shadow-sm font-semibold'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <FileText className="h-3.5 w-3.5" />
              <span>General Claim</span>
            </button>
            <button
              type="button"
              onClick={() => handleCategoryChange('progress')}
              className={`flex items-center space-x-1.5 py-1.5 px-3 rounded-md text-xs sm:text-sm font-medium transition-all ${
                category === 'progress'
                  ? 'bg-teal-600 text-white shadow-sm font-semibold'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Clock className="h-3.5 w-3.5" />
              <span>Progress Update</span>
            </button>
            <button
              type="button"
              onClick={() => handleCategoryChange('custom')}
              className={`flex items-center space-x-1.5 py-1.5 px-3 rounded-md text-xs sm:text-sm font-medium transition-all ${
                category === 'custom'
                  ? 'bg-amber-600 text-white shadow-sm font-semibold'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Custom Templates</span>
            </button>
            <button
              type="button"
              onClick={() => handleCategoryChange('all')}
              className={`flex items-center space-x-1.5 py-1.5 px-3 rounded-md text-xs sm:text-sm font-medium transition-all ${
                category === 'all'
                  ? 'bg-indigo-600 text-white shadow-sm font-semibold'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              <span>All Templates</span>
            </button>
          </div>
        </div>

        {/* Template Picker */}
        <div className="bg-gray-50 dark:bg-[#1E1E2D] p-3.5 rounded-xl border border-gray-200 dark:border-[#2B2B40]">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
              Select Template ({filteredTemplates.length} available)
            </label>
            <button
              type="button"
              onClick={handleRefreshPlaceholders}
              className="text-xs text-primary hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 flex items-center gap-1 font-medium transition-colors"
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
            <ClaimTemplateSearchableSelect
              templates={filteredTemplates}
              selectedTemplateId={selectedTemplateId}
              onSelectTemplate={handleTemplateSelect}
              channel={channel}
              activeCategory={category}
            />
          )}
        </div>

        {/* Recipient Details Section */}
        {recipientType === 'client' ? (
          /* Client Recipient Details */
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-blue-50/40 p-3.5 rounded-lg border border-blue-100 shadow-sm">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1 flex items-center gap-1">
                <User className="h-3 w-3 text-blue-600" />
                Client Name
              </label>
              <input
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="e.g. John Smith"
                className="w-full text-xs sm:text-sm border border-gray-300 rounded px-2.5 py-1.5 focus:ring-primary focus:border-primary bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1 flex items-center gap-1">
                <Phone className="h-3 w-3 text-emerald-600" />
                Client Phone {channel === 'whatsapp' && <span className="text-red-500">*</span>}
              </label>
              <input
                type="tel"
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
                placeholder="e.g. 07123456789 or +44..."
                className={`w-full text-xs sm:text-sm border rounded px-2.5 py-1.5 focus:ring-primary focus:border-primary bg-white ${
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
              <label className="block text-xs font-medium text-gray-700 mb-1 flex items-center gap-1">
                <Mail className="h-3 w-3 text-indigo-600" />
                Client Email {channel === 'email' && <span className="text-red-500">*</span>}
              </label>
              <input
                type="email"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                placeholder="e.g. client@example.com"
                className={`w-full text-xs sm:text-sm border rounded px-2.5 py-1.5 focus:ring-primary focus:border-primary bg-white ${
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
        ) : (
          /* Legal Handler Recipient Details */
          <div className="space-y-3 bg-purple-50/40 p-3.5 rounded-lg border border-purple-200 shadow-sm">
            {/* Directory Selector and Banner */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-purple-100">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-purple-900">
                <Scale className="h-4 w-4 text-purple-700" />
                <span>Legal Handler Contact & Representation</span>
              </div>

              {legalHandlersList.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-purple-700 whitespace-nowrap">Directory Lookup:</span>
                  <select
                    value={selectedLegalHandlerId}
                    onChange={(e) => handleSelectLegalHandlerFromDirectory(e.target.value)}
                    className="text-xs border border-purple-200 rounded px-2 py-1 bg-white text-purple-900 focus:ring-purple-500 focus:border-purple-500"
                  >
                    <option value="">Select from registered Legal Handlers...</option>
                    {legalHandlersList.map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.name} {(h as any).firm ? `(${(h as any).firm})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {!legalHandlerName && !legalHandlerFirm && (
              <div className="flex items-center gap-2 p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800">
                <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0" />
                <span>
                  No Legal Handler is currently assigned to this claim record. Select one from the directory above or enter their contact particulars below:
                </span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1 flex items-center gap-1">
                  <User className="h-3 w-3 text-purple-600" />
                  Legal Handler Name
                </label>
                <input
                  type="text"
                  value={legalHandlerName}
                  onChange={(e) => setLegalHandlerName(e.target.value)}
                  placeholder="e.g. Sarah Jenkins"
                  className="w-full text-xs sm:text-sm border border-gray-300 rounded px-2.5 py-1.5 focus:ring-purple-500 focus:border-purple-500 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1 flex items-center gap-1">
                  <Building className="h-3 w-3 text-purple-600" />
                  Solicitor / Firm Name
                </label>
                <input
                  type="text"
                  value={legalHandlerFirm}
                  onChange={(e) => setLegalHandlerFirm(e.target.value)}
                  placeholder="e.g. Apex Law Solicitors"
                  className="w-full text-xs sm:text-sm border border-gray-300 rounded px-2.5 py-1.5 focus:ring-purple-500 focus:border-purple-500 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1 flex items-center gap-1">
                  <Phone className="h-3 w-3 text-emerald-600" />
                  Handler Phone {channel === 'whatsapp' && <span className="text-red-500">*</span>}
                </label>
                <input
                  type="tel"
                  value={legalHandlerPhone}
                  onChange={(e) => setLegalHandlerPhone(e.target.value)}
                  placeholder="e.g. 020 7946 0999 or 07..."
                  className={`w-full text-xs sm:text-sm border rounded px-2.5 py-1.5 focus:ring-purple-500 focus:border-purple-500 bg-white ${
                    channel === 'whatsapp' && !legalHandlerPhone.trim()
                      ? 'border-amber-400 bg-amber-50/50'
                      : 'border-gray-300'
                  }`}
                />
                {channel === 'whatsapp' && !legalHandlerPhone && (
                  <p className="text-[11px] text-amber-600 mt-0.5">Required for WhatsApp link</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1 flex items-center gap-1">
                  <Mail className="h-3 w-3 text-indigo-600" />
                  Handler Email {channel === 'email' && <span className="text-red-500">*</span>}
                </label>
                <input
                  type="email"
                  value={legalHandlerEmail}
                  onChange={(e) => setLegalHandlerEmail(e.target.value)}
                  placeholder="e.g. handler@firm.com"
                  className={`w-full text-xs sm:text-sm border rounded px-2.5 py-1.5 focus:ring-purple-500 focus:border-purple-500 bg-white ${
                    channel === 'email' && !legalHandlerEmail.trim()
                      ? 'border-amber-400 bg-amber-50/50'
                      : 'border-gray-300'
                  }`}
                />
                {channel === 'email' && !legalHandlerEmail && (
                  <p className="text-[11px] text-amber-600 mt-0.5">Required for email dispatch</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* SELECTABLE ATTACHMENTS (OPTIONAL) SECTION */}
        <div className="bg-[#1E1E2D] rounded-xl p-4 border border-[#2B2B40] space-y-3.5 shadow-sm attachment-container" data-attachment-box="true">
          {/* Section Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-[#2B2B40]">
            <div className="flex items-center space-x-2">
              <div className="p-1.5 bg-primary/20 text-primary-300 rounded-lg">
                <Paperclip className="h-4 w-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <label className="text-xs font-bold text-gray-200 uppercase tracking-wider attachment-title">
                    Select Attachments (Optional)
                  </label>
                  {selectedFileIds.length > 0 ? (
                    <span className="px-2 py-0.5 text-[11px] font-semibold bg-primary/20 text-primary-300 rounded-full border border-primary/30">
                      {selectedFileIds.length} selected
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 text-[11px] text-gray-400 bg-[#13131A] border border-[#2B2B40] rounded-full">
                      No files selected (text only)
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  {channel === 'whatsapp'
                    ? 'Selected files will have secure download links appended to the bottom of the WhatsApp message body.'
                    : 'Selected documents, evidence files, and photos will be attached directly to the outbound email dispatch.'}
                </p>
              </div>
            </div>

            {/* Quick Batch Actions */}
            <div className="flex items-center space-x-2 text-xs self-end sm:self-center">
              <button
                type="button"
                onClick={handleSelectAll}
                className="text-primary-400 hover:text-primary-300 font-medium px-1.5 py-0.5 rounded hover:bg-primary/10 transition-colors"
              >
                Select All ({availableFiles.length})
              </button>
              {imageFiles.length > 0 && (
                <>
                  <span className="text-[#3E3E5B]">|</span>
                  <button
                    type="button"
                    onClick={handleSelectAllImages}
                    className="text-gray-300 hover:text-white font-medium px-1.5 py-0.5 rounded hover:bg-[#252538] transition-colors"
                  >
                    Photos ({imageFiles.length})
                  </button>
                </>
              )}
              {evidenceDocFiles.length > 0 && (
                <>
                  <span className="text-[#3E3E5B]">|</span>
                  <button
                    type="button"
                    onClick={handleSelectAllDocuments}
                    className="text-gray-300 hover:text-white font-medium px-1.5 py-0.5 rounded hover:bg-[#252538] transition-colors"
                  >
                    Documents
                  </button>
                </>
              )}
              <span className="text-[#3E3E5B]">|</span>
              <button
                type="button"
                onClick={handleClearAll}
                className="text-gray-400 hover:text-gray-200 font-medium px-1.5 py-0.5 rounded hover:bg-[#252538] transition-colors"
              >
                Clear
              </button>
            </div>
          </div>

          {/* 1. Official Generated Claim Card PDF */}
          {claimCardFile && (
            <div className="space-y-1.5">
              <div className="text-[11px] font-bold text-gray-200 uppercase tracking-wider flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Generated Claim Card PDF</span>
                  {recipientType === 'legalHandler' && (
                    <span className="text-[10px] text-purple-300 bg-purple-950/60 border border-purple-700/50 px-1.5 py-0.2 rounded font-normal normal-case">
                      Default for Legal Handler
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-gray-400 font-mono">
                  {claimCardAttachment?.filename || claimCardFile.filename}
                </span>
              </div>

              <div
                className={`flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg border text-xs transition-all attachment-item ${
                  selectedFileIds.includes('claim_card_pdf')
                    ? 'is-selected bg-emerald-950/40 border-emerald-500/80 shadow-xs ring-1 ring-emerald-500/30'
                    : 'bg-[#13131A] border-[#2B2B40] text-gray-200 hover:border-[#3E3E5B]'
                }`}
              >
                <label className="flex items-start sm:items-center space-x-2.5 cursor-pointer select-none flex-1 pr-2">
                  <input
                    type="checkbox"
                    checked={selectedFileIds.includes('claim_card_pdf')}
                    onChange={() => handleToggleFile('claim_card_pdf')}
                    className="h-4 w-4 mt-0.5 sm:mt-0 rounded border-[#3E3E5B] bg-[#1E1E2D] text-emerald-500 focus:ring-emerald-500 shrink-0"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`font-semibold ${
                          selectedFileIds.includes('claim_card_pdf') ? 'text-white' : 'text-gray-200'
                        }`}
                      >
                        {claimCardFile.name}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.2 bg-emerald-900/60 border border-emerald-700/50 text-emerald-200 rounded font-semibold">
                        Official PDF
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      Comprehensive incident particulars, insured & third-party details, vehicle specifications, and client statement.
                    </p>
                  </div>
                </label>

                <div className="flex items-center gap-2 mt-2 sm:mt-0 ml-6 sm:ml-0 shrink-0">
                  {claimCardAttachment?.url ? (
                    <a
                      href={claimCardAttachment.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-300 hover:text-white bg-[#1E1E2D] border border-emerald-500/40 px-2.5 py-1 rounded shadow-2xs hover:bg-emerald-950/40 transition-colors"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Preview PDF
                    </a>
                  ) : (
                    <button
                      type="button"
                      onClick={handleRegeneratePdf}
                      disabled={generatingPdf}
                      className="inline-flex items-center gap-1 text-[11px] text-emerald-400 hover:underline"
                    >
                      {generatingPdf ? 'Generating...' : 'Generate Preview'}
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleRegeneratePdf}
                    disabled={generatingPdf}
                    className="inline-flex items-center gap-1 text-[11px] text-gray-300 hover:text-white px-2 py-1 rounded border border-[#2B2B40] bg-[#1E1E2D] hover:bg-[#252538] transition-colors disabled:opacity-50"
                    title="Re-generate Claim Card PDF"
                  >
                    <RefreshCw className={`h-3 w-3 ${generatingPdf ? 'animate-spin text-emerald-400' : ''}`} />
                    <span className="hidden sm:inline">Refresh</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 2. Evidence Files & Documents uploaded to the claim record */}
          <div className="space-y-1.5 pt-1">
            <div className="text-[11px] font-bold text-gray-200 uppercase tracking-wider flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-blue-400" />
                <span>Evidence Files & Documents</span>
              </div>
              <span className="text-[10px] text-gray-400 font-normal">
                {evidenceDocFiles.length} file{evidenceDocFiles.length !== 1 ? 's' : ''} available
              </span>
            </div>

            {evidenceDocFiles.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                {evidenceDocFiles.map((docFile) => {
                  const isSelected = selectedFileIds.includes(docFile.id);
                  return (
                    <div
                      key={docFile.id}
                      className={`flex items-center justify-between p-2.5 rounded-lg border text-xs transition-all attachment-item ${
                        isSelected
                          ? 'is-selected bg-blue-950/40 border-blue-500/80 shadow-xs ring-1 ring-blue-500/30'
                          : 'bg-[#13131A] border-[#2B2B40] text-gray-200 hover:border-[#3E3E5B]'
                      }`}
                    >
                      <label className="flex items-center space-x-2 cursor-pointer select-none flex-1 min-w-0 pr-2">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleFile(docFile.id)}
                          className="h-4 w-4 rounded border-[#3E3E5B] bg-[#1E1E2D] text-blue-500 focus:ring-blue-500 shrink-0"
                        />
                        <FileText className={`h-4 w-4 shrink-0 ${isSelected ? 'text-blue-400' : 'text-gray-400'}`} />
                        <div className="truncate">
                          <div className={`truncate font-medium ${isSelected ? 'text-white font-semibold' : 'text-gray-200'}`}>
                            {docFile.name}
                          </div>
                          <div className="text-[10px] text-gray-400 truncate font-mono">{docFile.filename}</div>
                        </div>
                      </label>

                      {docFile.url && (
                        <a
                          href={docFile.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gray-400 hover:text-blue-400 p-1 shrink-0"
                          title="View document in new tab"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-xs text-gray-400 italic bg-[#13131A] p-2.5 rounded-lg border border-dashed border-[#2B2B40] text-center">
                No additional evidence documents (engineer reports, bank statements, hire forms) uploaded on this claim record.
              </div>
            )}
          </div>

          {/* 3. Claim Images & Photos uploaded under the claim record */}
          <div className="space-y-1.5 pt-1">
            <div className="text-[11px] font-bold text-gray-200 uppercase tracking-wider flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <ImageIcon className="h-3.5 w-3.5 text-amber-400" />
                <span>Claim Images & Accident Photos</span>
              </div>
              <span className="text-[10px] text-gray-400 font-normal">
                {imageFiles.length} photo{imageFiles.length !== 1 ? 's' : ''} available
              </span>
            </div>

            {imageFiles.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 max-h-56 overflow-y-auto pr-1">
                {imageFiles.map((imgFile) => {
                  const isSelected = selectedFileIds.includes(imgFile.id);
                  return (
                    <div
                      key={imgFile.id}
                      onClick={() => handleToggleFile(imgFile.id)}
                      className={`group relative flex flex-col p-1.5 rounded-lg border cursor-pointer select-none transition-all attachment-item ${
                        isSelected
                          ? 'is-selected bg-amber-950/40 border-amber-500/80 shadow-xs ring-2 ring-amber-500/40'
                          : 'bg-[#13131A] border-[#2B2B40] text-gray-200 hover:border-[#3E3E5B]'
                      }`}
                    >
                      <div className="relative w-full h-20 bg-[#0d0e1a] rounded overflow-hidden mb-1.5">
                        <img
                          src={imgFile.url}
                          alt={imgFile.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          loading="lazy"
                        />
                        <div className="absolute top-1 left-1">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              e.stopPropagation();
                              handleToggleFile(imgFile.id);
                            }}
                            className="h-4 w-4 rounded border-[#3E3E5B] bg-[#1E1E2D] text-amber-500 focus:ring-amber-500 shadow-xs"
                          />
                        </div>
                        <a
                          href={imgFile.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="absolute bottom-1 right-1 p-1 bg-black/70 hover:bg-black/90 text-white rounded text-[10px] transition-colors"
                          title="View full image"
                        >
                          <Eye className="h-3 w-3" />
                        </a>
                      </div>
                      <div className="px-0.5 truncate">
                        <div className={`text-[11px] truncate font-medium ${isSelected ? 'text-white font-semibold' : 'text-gray-200'}`}>
                          {imgFile.name}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-xs text-gray-400 italic bg-[#13131A] p-2.5 rounded-lg border border-dashed border-[#2B2B40] text-center">
                No accident scene or vehicle damage photos uploaded under this claim record.
              </div>
            )}
          </div>

          {/* 4. Evidence Videos (if any) */}
          {videoFiles.length > 0 && (
            <div className="space-y-1.5 pt-1">
              <div className="text-[11px] font-bold text-gray-200 uppercase tracking-wider flex items-center gap-1.5">
                <VideoIcon className="h-3.5 w-3.5 text-purple-400" />
                <span>Incident Videos ({videoFiles.length})</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {videoFiles.map((vFile) => {
                  const isSelected = selectedFileIds.includes(vFile.id);
                  return (
                    <div
                      key={vFile.id}
                      className={`flex items-center justify-between p-2 rounded-lg border text-xs attachment-item ${
                        isSelected ? 'is-selected bg-purple-950/40 border-purple-500/80 ring-1 ring-purple-500/30' : 'bg-[#13131A] border-[#2B2B40]'
                      }`}
                    >
                      <label className="flex items-center space-x-2 cursor-pointer select-none flex-1 truncate pr-2">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleFile(vFile.id)}
                          className="h-4 w-4 rounded border-[#3E3E5B] bg-[#1E1E2D] text-purple-500 focus:ring-purple-500 shrink-0"
                        />
                        <VideoIcon className="h-3.5 w-3.5 text-purple-400 shrink-0" />
                        <span className={`truncate font-medium ${isSelected ? 'text-white font-semibold' : 'text-gray-200'}`}>{vFile.name}</span>
                      </label>
                      {vFile.url && (
                        <a
                          href={vFile.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gray-400 hover:text-purple-400 p-1"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Selection Live Status Footer */}
          <div className="pt-2 border-t border-[#2B2B40] flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-xs">
            {selectedFileIds.length > 0 ? (
              <span className="text-primary-300 font-medium flex items-center gap-1.5">
                <Paperclip className="h-3.5 w-3.5 text-primary-400" />
                <strong className="text-white">{selectedFileIds.length} attachment{selectedFileIds.length > 1 ? 's' : ''}</strong> will be included ({channel === 'whatsapp' ? 'appended as secure download links' : 'directly attached to email'}).
              </span>
            ) : (
              <span className="text-gray-400 italic">
                💬 <strong className="text-gray-300 font-semibold">No attachments selected.</strong> Only message text will be dispatched.
              </span>
            )}

            {selectedFileIds.length > 0 && (
              <button
                type="button"
                onClick={handleClearAll}
                className="text-[11px] text-gray-400 hover:text-white underline self-end sm:self-auto"
              >
                Clear all attachments
              </button>
            )}
          </div>
        </div>

        {/* Claim & Vehicle Context Badges Bar */}
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
            {currentContext.legal_handler_firm && (
              <span className="bg-purple-50 px-2 py-0.5 rounded border border-purple-200 text-purple-800 font-medium">
                Legal Firm: <strong>{currentContext.legal_handler_firm}</strong>
              </span>
            )}
          </div>
        )}

        {/* Subject (for Email) */}
        {channel === 'email' && (
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Email Subject Line <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Claim Instruction & Claim Card - #12345"
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
            <div className="flex items-center gap-1 mb-1.5">
              <Sparkles className="h-3 w-3 text-amber-500" />
              <span className="text-[11px] font-semibold text-gray-600">Quick Insert Placeholders:</span>
            </div>

            {/* Legal Handler Placeholders */}
            <div className="mb-1 flex flex-wrap items-center gap-1">
              <span className="text-[10px] uppercase font-bold text-purple-700 mr-1">Legal Handler:</span>
              {[
                '{legal_handler_name}',
                '{legal_handler_firm}',
                '{legal_handler_email}',
                '{legal_handler_phone}',
              ].map((token) => (
                <button
                  key={token}
                  type="button"
                  onClick={() => handleInsertPlaceholder(token)}
                  className="text-[11px] bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-800 px-2 py-0.5 rounded transition-colors font-mono"
                  title={`Insert ${token}`}
                >
                  {token}
                </button>
              ))}
            </div>

            {/* Claim & Vehicle Placeholders */}
            <div className="flex flex-wrap items-center gap-1">
              <span className="text-[10px] uppercase font-bold text-blue-700 mr-1">Claim & Vehicle:</span>
              {[
                '{claim_id}',
                '{vehicle_reg}',
                '{incident_date}',
                '{claim_status}',
                '{progress_stage}',
                '{client_name}',
                '{client_phone}',
                '{latest_update_notes}',
                '{next_steps}',
              ].map((token) => (
                <button
                  key={token}
                  type="button"
                  onClick={() => handleInsertPlaceholder(token)}
                  className="text-[11px] bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-800 px-2 py-0.5 rounded transition-colors font-mono"
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
                <span>
                  Opens direct WhatsApp link for{' '}
                  <strong>{recipientType === 'legalHandler' ? 'Legal Handler' : 'Client'}</strong>
                  {selectedFileIds.length > 0 ? (
                    <span className="text-emerald-700 font-medium">
                      {' '}
                      ({selectedFileIds.length} file link{selectedFileIds.length > 1 ? 's' : ''} appended)
                    </span>
                  ) : (
                    <span className="text-gray-400"> (text only)</span>
                  )}
                </span>
              </>
            ) : (
              <>
                <Mail className="h-3.5 w-3.5 text-indigo-600" />
                <span>
                  Sends to{' '}
                  <strong>{recipientType === 'legalHandler' ? 'Legal Handler' : 'Client'}</strong>
                  {selectedFileIds.length > 0 ? (
                    <span className="text-indigo-700 font-medium">
                      {' '}
                      ({selectedFileIds.length} file{selectedFileIds.length > 1 ? 's' : ''} attached)
                    </span>
                  ) : (
                    <span className="text-gray-400"> (text only)</span>
                  )}
                </span>
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
                {sending
                  ? 'Launching WhatsApp...'
                  : `Send WhatsApp to ${recipientType === 'legalHandler' ? 'Legal Handler' : 'Client'}`}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSend}
                disabled={sending}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-50"
              >
                <Send className="h-4 w-4 mr-1.5" />
                {sending
                  ? 'Sending Email...'
                  : `Send Email to ${recipientType === 'legalHandler' ? 'Legal Handler' : 'Client'}`}
              </button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default ClaimCommunicationModal;
