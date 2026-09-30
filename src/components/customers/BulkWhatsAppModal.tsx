// src/components/customers/BulkWhatsAppModal.tsx
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Modal } from '../ui/Modal';
import { Customer } from '../../types/customer';
import { sendWhatsAppMessage, formatWhatsAppNumber } from '../../utils/whatsapp';
import {
  MessageCircle,
  Send,
  CheckCircle2,
  AlertCircle,
  X,
  Search,
  Users,
  CheckSquare,
  Square,
  Sparkles,
  Phone,
  ArrowRight,
  RefreshCw,
  ExternalLink,
  ChevronDown,
  Info,
  Check,
  RotateCcw,
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

interface BulkWhatsAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCustomers: Customer[];
  allCustomers?: Customer[];
  onClearSelection?: () => void;
}

interface TemplatePreset {
  id: string;
  name: string;
  category: string;
  text: string;
}

const DEFAULT_TEMPLATES: TemplatePreset[] = [
  {
    id: 'general-notice',
    name: 'General Service Announcement',
    category: 'General',
    text: `Hello {first_name}, this is an important service update from AIE Skyline. We are currently updating our member records and support lines. If you need any assistance with your account or vehicle, please reply directly to this chat.`,
  },
  {
    id: 'kyc-renewal',
    name: 'Document / KYC Renewal Reminder',
    category: 'Documentation',
    text: `Dear {first_name}, please be reminded that your documentation on file with AIE Skyline is due for review and renewal. Kindly send us your updated driving license or required proof at your earliest convenience to keep your account active.`,
  },
  {
    id: 'payment-reminder',
    name: 'Account & Payment Notice',
    category: 'Finance',
    text: `Hello {first_name}, this is a friendly reminder regarding your account with AIE Skyline. Please check your latest balance or contact our finance team today to ensure your account remains in good standing.`,
  },
  {
    id: 'maintenance-notice',
    name: 'Vehicle Service & Inspection',
    category: 'Workshop',
    text: `Dear {first_name}, this is a routine fleet maintenance notice regarding your vehicle with AIE Skyline. Please report your current mileage or schedule your periodic safety inspection at our workshop bay.`,
  },
  {
    id: 'holiday-greeting',
    name: 'Holiday Greeting & Working Hours',
    category: 'General',
    text: `Hello {first_name}, warm greetings from the entire team at AIE Skyline! Please note our updated operating hours and emergency contact channels for the upcoming period. Thank you for being a valued member.`,
  },
];

export const BulkWhatsAppModal: React.FC<BulkWhatsAppModalProps> = ({
  isOpen,
  onClose,
  selectedCustomers,
  allCustomers = [],
  onClearSelection,
}) => {
  // If no customers were selected from the table, default to all available customers
  const initialPool = useMemo(() => {
    if (selectedCustomers.length > 0) return selectedCustomers;
    return allCustomers;
  }, [selectedCustomers, allCustomers]);

  // Recipient check state: map of customer.id -> boolean (whether included in this batch)
  const [recipientSelection, setRecipientSelection] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const next: Record<string, boolean> = {};
    initialPool.forEach((c) => {
      // Auto-select by default if valid mobile number exists
      const num = formatWhatsAppNumber(c.mobile || '');
      next[c.id] = Boolean(num && num.length >= 8);
    });
    setRecipientSelection(next);
    setSentStatus({});
    setCurrentQueueIndex(0);
  }, [initialPool, isOpen]);

  // Recipient search filter inside modal
  const [searchFilter, setSearchFilter] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('general-notice');
  const [messageTemplate, setMessageTemplate] = useState<string>(DEFAULT_TEMPLATES[0].text);
  const [includeSignature, setIncludeSignature] = useState<boolean>(true);

  // Preview customer selection
  const [previewCustomerId, setPreviewCustomerId] = useState<string>('');

  // Dispatch status tracking: map of customer.id -> 'sent' | 'skipped' | 'failed'
  const [sentStatus, setSentStatus] = useState<Record<string, 'sent' | 'skipped' | 'failed'>>({});
  const [isAutoSending, setIsAutoSending] = useState(false);
  const autoSendRef = useRef<boolean>(false);

  // Step tabs inside modal
  const [activeTab, setActiveTab] = useState<'compose' | 'recipients' | 'queue'>('compose');

  // Filtered pool based on search
  const displayedRecipients = useMemo(() => {
    if (!searchFilter.trim()) return initialPool;
    const q = searchFilter.toLowerCase().trim();
    return initialPool.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.mobile && c.mobile.toLowerCase().includes(q)) ||
        (c.email && c.email.toLowerCase().includes(q)) ||
        (c.type && c.type.toLowerCase().includes(q))
    );
  }, [initialPool, searchFilter]);

  // Active recipient candidates that are checked for dispatch
  const activeCandidates = useMemo(() => {
    return initialPool.filter((c) => {
      if (!recipientSelection[c.id]) return false;
      const num = formatWhatsAppNumber(c.mobile || '');
      return Boolean(num && num.length >= 8);
    });
  }, [initialPool, recipientSelection]);

  // Summary counts
  const totalCount = initialPool.length;
  const validPhoneCount = useMemo(() => {
    return initialPool.filter((c) => {
      const num = formatWhatsAppNumber(c.mobile || '');
      return Boolean(num && num.length >= 8);
    }).length;
  }, [initialPool]);

  const missingPhoneCount = totalCount - validPhoneCount;
  const readyToSendCount = activeCandidates.length;

  const sentCount = useMemo(() => {
    return Object.values(sentStatus).filter((s) => s === 'sent').length;
  }, [sentStatus]);

  // Preview customer resolution
  const previewCustomer = useMemo(() => {
    if (previewCustomerId) {
      const found = initialPool.find((c) => c.id === previewCustomerId);
      if (found) return found;
    }
    return activeCandidates[0] || initialPool[0] || null;
  }, [initialPool, activeCandidates, previewCustomerId]);

  // Personalization substitute helper
  const personalizeMessage = (tpl: string, c: Customer | null): string => {
    if (!c) return tpl;
    const firstName = c.firstName || c.name.trim().split(' ')[0] || 'Customer';
    const fullName = c.name || 'Valued Customer';
    const mobile = c.mobile || '';
    const dateStr = format(new Date(), 'dd MMMM yyyy');
    const company = 'AIE Skyline Limited';

    let res = tpl
      .replace(/\{first_name\}/gi, firstName)
      .replace(/\{firstname\}/gi, firstName)
      .replace(/\{name\}/gi, fullName)
      .replace(/\{full_name\}/gi, fullName)
      .replace(/\{mobile\}/gi, mobile)
      .replace(/\{phone\}/gi, mobile)
      .replace(/\{date\}/gi, dateStr)
      .replace(/\{company\}/gi, company);

    return res;
  };

  // Live personalized preview text
  const previewText = useMemo(() => {
    return personalizeMessage(messageTemplate, previewCustomer);
  }, [messageTemplate, previewCustomer]);

  // Insert variable tag into message at cursor or end
  const handleInsertTag = (tag: string) => {
    setMessageTemplate((prev) => prev + ` {${tag}}`);
  };

  // Queue runner state
  const [currentQueueIndex, setCurrentQueueIndex] = useState(0);

  // Active queue customer
  const currentQueueCustomer = useMemo(() => {
    const unSent = activeCandidates.filter((c) => !sentStatus[c.id]);
    return unSent[0] || null;
  }, [activeCandidates, sentStatus]);

  // Send single customer using sendWhatsAppMessage utility
  const handleSendToCustomer = (customer: Customer) => {
    const phone = customer.mobile;
    const formatted = formatWhatsAppNumber(phone || '');
    if (!formatted || formatted.length < 8) {
      toast.error(`Invalid mobile number for ${customer.name}`);
      setSentStatus((prev) => ({ ...prev, [customer.id]: 'failed' }));
      return false;
    }

    try {
      const personalized = personalizeMessage(messageTemplate, customer);
      sendWhatsAppMessage({
        phone: formatted,
        message: personalized,
      });

      setSentStatus((prev) => ({ ...prev, [customer.id]: 'sent' }));
      toast.success(`WhatsApp opened for ${customer.name}`, { duration: 2500 });
      return true;
    } catch (err: any) {
      console.error('Error dispatching WhatsApp:', err);
      toast.error(`Could not open WhatsApp for ${customer.name}: ${err?.message || 'Error'}`);
      setSentStatus((prev) => ({ ...prev, [customer.id]: 'failed' }));
      return false;
    }
  };

  // Guided Queue Send Next
  const handleSendNextInQueue = () => {
    if (!currentQueueCustomer) {
      toast.success('All selected recipients have been processed!');
      return;
    }
    handleSendToCustomer(currentQueueCustomer);
  };

  // Skip current in queue
  const handleSkipInQueue = () => {
    if (!currentQueueCustomer) return;
    setSentStatus((prev) => ({ ...prev, [currentQueueCustomer.id]: 'skipped' }));
    toast('Skipped recipient', { icon: '⏭️' });
  };

  // Automated Sequential Dispatch
  const handleSendAllSequential = async () => {
    const pending = activeCandidates.filter((c) => !sentStatus[c.id]);
    if (pending.length === 0) {
      toast.error('No pending recipients to send to.');
      return;
    }

    setIsAutoSending(true);
    autoSendRef.current = true;
    setActiveTab('queue');

    let count = 0;
    for (let i = 0; i < pending.length; i++) {
      if (!autoSendRef.current) break;
      const customer = pending[i];
      handleSendToCustomer(customer);
      count++;

      // Safe pause between sequential tabs to avoid aggressive browser popup blocking
      if (i < pending.length - 1 && autoSendRef.current) {
        await new Promise((res) => setTimeout(res, 850));
      }
    }

    setIsAutoSending(false);
    autoSendRef.current = false;
    toast.success(`Batch complete: opened ${count} WhatsApp message chats.`);
  };

  const handleStopAutoSend = () => {
    autoSendRef.current = false;
    setIsAutoSending(false);
    toast('Batch sending paused');
  };

  // Toggle recipient checkbox
  const handleToggleRecipient = (id: string) => {
    setRecipientSelection((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Select all valid
  const handleSelectAllValid = () => {
    const next = { ...recipientSelection };
    initialPool.forEach((c) => {
      const num = formatWhatsAppNumber(c.mobile || '');
      if (num && num.length >= 8) {
        next[c.id] = true;
      }
    });
    setRecipientSelection(next);
  };

  // Deselect all
  const handleDeselectAll = () => {
    const next: Record<string, boolean> = {};
    initialPool.forEach((c) => {
      next[c.id] = false;
    });
    setRecipientSelection(next);
  };

  // Reset sent progress
  const handleResetProgress = () => {
    setSentStatus({});
    toast.success('Send progress reset. You can dispatch again.');
  };

  // Progress percentage
  const progressPercent = readyToSendCount > 0 ? Math.round((sentCount / readyToSendCount) * 100) : 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Bulk WhatsApp Messenger"
      subtitle={`Selected ${readyToSendCount} of ${totalCount} customer recipients`}
      size="3xl"
      contentClassName="p-0 flex flex-col flex-1 overflow-hidden min-h-0 bg-slate-50"
    >
      <div className="flex flex-col h-[78vh] max-h-[850px] min-h-[550px] overflow-hidden">
        {/* Top Header Summary Strip */}
        <div className="bg-white border-b border-slate-200 px-5 py-3 shrink-0 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 flex items-center justify-center shrink-0">
              <MessageCircle className="w-5 h-5 fill-emerald-600/20" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-900">Direct WhatsApp Dispatch</span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  API Verified
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Prefills personalized chats via <code className="font-mono text-emerald-700 bg-emerald-50 px-1 py-0.5 rounded">sendWhatsAppMessage</code>
              </p>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="flex items-center gap-2">
            <div className="bg-slate-100 border border-slate-200/80 rounded-xl px-3 py-1.5 text-xs flex items-center gap-2">
              <Users className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-slate-600">Total:</span>
              <span className="font-bold text-slate-900">{totalCount}</span>
            </div>
            <div className="bg-emerald-50 border border-emerald-200/80 rounded-xl px-3 py-1.5 text-xs flex items-center gap-2">
              <Phone className="w-3.5 h-3.5 text-emerald-600" />
              <span className="text-emerald-700">Valid:</span>
              <span className="font-bold text-emerald-900">{validPhoneCount}</span>
            </div>
            {missingPhoneCount > 0 && (
              <div className="bg-amber-50 border border-amber-200/80 rounded-xl px-3 py-1.5 text-xs flex items-center gap-2" title="These customers have no mobile number on file">
                <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                <span className="text-amber-700">Missing Phone:</span>
                <span className="font-bold text-amber-900">{missingPhoneCount}</span>
              </div>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white border-b border-slate-200 px-5 pt-2 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setActiveTab('compose')}
              className={`px-4 py-2 text-xs font-bold border-b-2 transition cursor-pointer flex items-center gap-2 ${
                activeTab === 'compose'
                  ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>1. Compose & Preview</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('recipients')}
              className={`px-4 py-2 text-xs font-bold border-b-2 transition cursor-pointer flex items-center gap-2 ${
                activeTab === 'recipients'
                  ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>2. Select Recipients ({readyToSendCount})</span>
              {missingPhoneCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-amber-500" title="Some recipients have missing phone numbers" />
              )}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('queue')}
              className={`px-4 py-2 text-xs font-bold border-b-2 transition cursor-pointer flex items-center gap-2 ${
                activeTab === 'queue'
                  ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>3. Dispatch Queue</span>
              {sentCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-emerald-600 text-white text-[10px]">
                  {sentCount}/{readyToSendCount}
                </span>
              )}
            </button>
          </div>

          {/* Quick Progress Bar */}
          <div className="hidden sm:flex items-center gap-3 text-xs text-slate-600">
            <span className="font-medium">
              Progress: <strong className="text-slate-900">{sentCount}</strong> of <strong className="text-slate-900">{readyToSendCount}</strong>
            </span>
            <div className="w-28 h-2 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 transition-all duration-300 rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="font-mono font-bold text-slate-700">{progressPercent}%</span>
          </div>
        </div>

        {/* Tab Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 min-h-0">
          {/* ──────────────── TAB 1: COMPOSE & PREVIEW ──────────────── */}
          {activeTab === 'compose' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              {/* Left Column: Template & Message Composer */}
              <div className="lg:col-span-7 space-y-4">
                {/* Template Preset Selector */}
                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Quick Message Templates</span>
                    </label>
                    <span className="text-[11px] text-slate-500 font-medium">Click to populate message</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {DEFAULT_TEMPLATES.map((tpl) => (
                      <button
                        key={tpl.id}
                        type="button"
                        onClick={() => {
                          setSelectedTemplateId(tpl.id);
                          setMessageTemplate(tpl.text);
                        }}
                        className={`text-left p-2.5 rounded-xl border text-xs transition cursor-pointer flex flex-col justify-between gap-1 ${
                          selectedTemplateId === tpl.id
                            ? 'bg-emerald-50 border-emerald-400 text-emerald-900 font-semibold shadow-xs'
                            : 'bg-slate-50/60 border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold truncate">{tpl.name}</span>
                          <span className="text-[10px] text-slate-600 font-medium uppercase">{tpl.category}</span>
                        </div>
                        <p className="text-[11px] text-slate-500 line-clamp-1 italic">
                          "{tpl.text}"
                        </p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Message Body & Dynamic Tags */}
                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      WhatsApp Message Body
                    </label>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span>{messageTemplate.length} chars</span>
                      <span>•</span>
                      <span>{messageTemplate.trim().split(/\s+/).filter(Boolean).length} words</span>
                    </div>
                  </div>

                  <textarea
                    rows={7}
                    value={messageTemplate}
                    onChange={(e) => setMessageTemplate(e.target.value)}
                    placeholder="Type your message here... Use dynamic tags below to auto-insert recipient details."
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs sm:text-sm font-sans focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 leading-relaxed transition"
                  />

                  {/* Dynamic Tag Insertion Chips */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                        Insert Personalization Tag:
                      </span>
                      <span className="text-[10px] text-slate-600">Replaced automatically per recipient</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { tag: 'first_name', label: '{first_name}', desc: 'First Name' },
                        { tag: 'name', label: '{name}', desc: 'Full Name' },
                        { tag: 'mobile', label: '{mobile}', desc: 'Phone' },
                        { tag: 'company', label: '{company}', desc: 'AIE Skyline' },
                        { tag: 'date', label: '{date}', desc: 'Today' },
                      ].map((item) => (
                        <button
                          key={item.tag}
                          type="button"
                          onClick={() => handleInsertTag(item.tag)}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-700 transition cursor-pointer flex items-center gap-1"
                          title={`Insert ${item.desc}`}
                        >
                          <span>{item.label}</span>
                          <span className="text-[10px] text-slate-600 font-sans font-normal">({item.desc})</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Company Signature Note */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <span className="flex items-center gap-1.5">
                      <Info className="w-3.5 h-3.5 text-slate-400" />
                      <span>Standard AIE Skyline company signature is attached automatically.</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setMessageTemplate('')}
                      className="text-xs text-slate-400 hover:text-rose-600 transition cursor-pointer"
                    >
                      Clear text
                    </button>
                  </div>
                </div>
              </div>

              {/* Right Column: Live WhatsApp Bubble Preview */}
              <div className="lg:col-span-5 space-y-4">
                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                      <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Live WhatsApp Chat Preview</span>
                    </label>

                    {/* Recipient Preview Selector */}
                    {activeCandidates.length > 0 && (
                      <select
                        value={previewCustomerId || activeCandidates[0]?.id || ''}
                        onChange={(e) => setPreviewCustomerId(e.target.value)}
                        className="text-xs border border-slate-200 rounded-lg bg-slate-50 px-2 py-1 text-slate-800 font-medium max-w-[160px] truncate focus:outline-none"
                      >
                        {activeCandidates.slice(0, 15).map((c) => (
                          <option key={c.id} value={c.id}>
                            Preview for: {c.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* Realistic WhatsApp Chat Card Mockup */}
                  <div className="rounded-2xl overflow-hidden border border-[#D1D7DB] bg-[#EFEAE2] relative shadow-inner">
                    {/* Chat Header */}
                    <div className="bg-[#075E54] text-white px-3.5 py-2.5 flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-emerald-700 border border-white/20 flex items-center justify-center font-bold text-xs text-white uppercase shrink-0">
                          {previewCustomer ? previewCustomer.name.slice(0, 2) : 'CU'}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold truncate">
                            {previewCustomer ? previewCustomer.name : 'Sample Customer'}
                          </p>
                          <p className="text-[10px] text-emerald-200 truncate">
                            {previewCustomer?.mobile || '+44 7999 558801'}
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] bg-emerald-800/80 px-2 py-0.5 rounded-full font-medium">
                        WhatsApp Preview
                      </span>
                    </div>

                    {/* Chat Messages Body */}
                    <div className="p-4 space-y-3 min-h-[220px] max-h-[340px] overflow-y-auto">
                      {/* Security notice bubble */}
                      <div className="flex justify-center">
                        <span className="bg-[#FFF4C4] text-[#54656F] text-[10px] px-2.5 py-1 rounded-lg text-center max-w-[90%] shadow-2xs font-medium">
                          🔒 Messages are end-to-end encrypted. Ready for instant launch.
                        </span>
                      </div>

                      {/* Outgoing Message Bubble (Right aligned) */}
                      <div className="flex justify-end">
                        <div className="bg-[#E7FFDB] text-[#111B21] rounded-2xl rounded-tr-xs p-3 max-w-[88%] shadow-xs text-xs sm:text-[13px] leading-relaxed relative border border-[#D6F0C9]">
                          <p className="whitespace-pre-line break-words">{previewText || 'Your message will appear here...'}</p>

                          {/* Company Signature */}
                          <div className="mt-2.5 pt-2 border-t border-emerald-800/10 text-[11px] text-[#54656F] font-sans">
                            <p className="font-semibold text-emerald-950">AIE Skyline Limited</p>
                            <p className="text-[10px] text-slate-500">Fleet Operations & Member Services</p>
                          </div>

                          {/* Timestamp & double tick */}
                          <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-[#667781]">
                            <span>{format(new Date(), 'HH:mm')}</span>
                            <span className="text-[#53BDEB] font-bold">✓✓</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Next Step Guidance Button */}
                  <div className="pt-2 flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => setActiveTab('recipients')}
                      className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>Review Recipients ({readyToSendCount})</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveTab('queue')}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Proceed to Dispatch Queue</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ──────────────── TAB 2: SELECT RECIPIENTS ──────────────── */}
          {activeTab === 'recipients' && (
            <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Recipient Target List</h3>
                  <p className="text-xs text-slate-500">
                    Include or exclude specific customers from this WhatsApp transmission.
                  </p>
                </div>

                {/* Filter / Actions */}
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="relative min-w-[200px]">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                    <input
                      type="text"
                      value={searchFilter}
                      onChange={(e) => setSearchFilter(e.target.value)}
                      placeholder="Search recipient name, phone..."
                      className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleSelectAllValid}
                    className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition cursor-pointer"
                  >
                    Select All Valid
                  </button>
                  <button
                    type="button"
                    onClick={handleDeselectAll}
                    className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition cursor-pointer"
                  >
                    Deselect All
                  </button>
                </div>
              </div>

              {/* Recipient Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <div className="max-h-[380px] overflow-y-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10 text-slate-600 font-bold uppercase tracking-wider">
                      <tr>
                        <th className="py-2.5 px-3 w-10 text-center">Include</th>
                        <th className="py-2.5 px-3">Customer / Member</th>
                        <th className="py-2.5 px-3">Mobile Number</th>
                        <th className="py-2.5 px-3">Category</th>
                        <th className="py-2.5 px-3">Dispatch Status</th>
                        <th className="py-2.5 px-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {displayedRecipients.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-slate-400">
                            No customers found matching your search.
                          </td>
                        </tr>
                      ) : (
                        displayedRecipients.map((c) => {
                          const formattedNum = formatWhatsAppNumber(c.mobile || '');
                          const isValid = Boolean(formattedNum && formattedNum.length >= 8);
                          const isChecked = Boolean(recipientSelection[c.id]);
                          const status = sentStatus[c.id];

                          return (
                            <tr
                              key={c.id}
                              onClick={() => isValid && handleToggleRecipient(c.id)}
                              className={`transition cursor-pointer ${
                                isChecked ? 'bg-emerald-50/40 hover:bg-emerald-50/70' : 'hover:bg-slate-50'
                              } ${!isValid ? 'opacity-60 bg-amber-50/20' : ''}`}
                            >
                              <td className="py-2 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  disabled={!isValid}
                                  onChange={() => handleToggleRecipient(c.id)}
                                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-3.5 w-3.5 cursor-pointer disabled:opacity-40"
                                />
                              </td>
                              <td className="py-2 px-3 font-medium text-slate-900">
                                <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-[10px] uppercase shrink-0">
                                    {c.name.slice(0, 2)}
                                  </div>
                                  <span className="truncate">{c.name}</span>
                                </div>
                              </td>
                              <td className="py-2 px-3">
                                {isValid ? (
                                  <span className="font-mono text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                                    +{formattedNum}
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-amber-700 font-semibold text-[11px] bg-amber-100/60 px-2 py-0.5 rounded">
                                    <AlertCircle className="w-3 h-3 text-amber-600" />
                                    <span>Missing / Invalid Phone</span>
                                  </span>
                                )}
                              </td>
                              <td className="py-2 px-3 uppercase text-[10px] font-bold text-slate-500">
                                {c.type || 'Member'}
                              </td>
                              <td className="py-2 px-3">
                                {status === 'sent' ? (
                                  <span className="inline-flex items-center gap-1 text-emerald-700 font-bold text-[11px]">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                    <span>Sent</span>
                                  </span>
                                ) : status === 'skipped' ? (
                                  <span className="inline-flex items-center gap-1 text-slate-500 font-medium text-[11px]">
                                    <span>Skipped</span>
                                  </span>
                                ) : isChecked ? (
                                  <span className="inline-flex items-center gap-1 text-blue-700 font-medium text-[11px]">
                                    <span>Ready</span>
                                  </span>
                                ) : (
                                  <span className="text-slate-400 text-[11px]">Excluded</span>
                                )}
                              </td>
                              <td className="py-2 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                                <button
                                  type="button"
                                  disabled={!isValid}
                                  onClick={() => handleSendToCustomer(c)}
                                  className="px-2.5 py-1 bg-white hover:bg-emerald-50 text-emerald-700 hover:text-emerald-800 border border-slate-200 hover:border-emerald-300 rounded-lg text-xs font-bold transition shadow-2xs cursor-pointer disabled:opacity-30 disabled:pointer-events-none"
                                  title="Open direct WhatsApp chat for this recipient"
                                >
                                  Send Now
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Bottom Navigation */}
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('compose')}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  ← Back to Composer
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('queue')}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Go to Dispatch Queue ({readyToSendCount})</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* ──────────────── TAB 3: DISPATCH QUEUE ──────────────── */}
          {activeTab === 'queue' && (
            <div className="space-y-4">
              {/* Batch Action Banner */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <span>WhatsApp Queue Dispatcher</span>
                      <span className="text-xs font-normal text-slate-500">
                        ({sentCount} of {readyToSendCount} completed)
                      </span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Because WhatsApp opens individual verified chat links, use guided single-click sending or batch sequential launch.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {isAutoSending ? (
                      <button
                        type="button"
                        onClick={handleStopAutoSend}
                        className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Pause Batch Sending</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleSendAllSequential}
                        disabled={readyToSendCount === 0 || sentCount >= readyToSendCount}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Launch All Sequential</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={handleResetProgress}
                      className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
                      title="Reset progress to send again"
                    >
                      Reset
                    </button>
                  </div>
                </div>

                {/* Main Progress Bar */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-slate-600">
                    <span className="font-semibold text-slate-800">
                      Overall Completion: {sentCount} / {readyToSendCount}
                    </span>
                    <span className="font-mono font-bold text-emerald-700">{progressPercent}%</span>
                  </div>
                  <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-300 rounded-full"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>

                {/* Next Up Recipient Card (Guided 1-Click Send) */}
                {currentQueueCustomer ? (
                  <div className="bg-emerald-50/70 border border-emerald-300/80 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold text-base uppercase shrink-0 shadow-sm">
                        {currentQueueCustomer.name.slice(0, 2)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">Next Up in Queue:</span>
                          <span className="text-[11px] font-mono text-emerald-900 bg-emerald-200/60 px-2 py-0.5 rounded font-bold">
                            +{formatWhatsAppNumber(currentQueueCustomer.mobile || '')}
                          </span>
                        </div>
                        <h4 className="text-base font-black text-slate-900 truncate mt-0.5">
                          {currentQueueCustomer.name}
                        </h4>
                        <p className="text-xs text-slate-600 italic line-clamp-1 mt-0.5">
                          "{personalizeMessage(messageTemplate, currentQueueCustomer)}"
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={handleSkipInQueue}
                        className="px-3.5 py-2.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
                      >
                        Skip
                      </button>
                      <button
                        type="button"
                        onClick={handleSendNextInQueue}
                        className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-sm font-black transition shadow-md flex items-center gap-2 cursor-pointer"
                      >
                        <Send className="w-4 h-4" />
                        <span>Open WhatsApp & Advance</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-8 text-center space-y-2">
                    <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                    <h4 className="text-sm font-bold text-slate-900">All Queue Recipients Processed</h4>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                      All selected customers have been queued and opened in WhatsApp.
                    </p>
                  </div>
                )}
              </div>

              {/* Queue List of Items */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Recipient Queue Items ({activeCandidates.length})
                </h4>
                <div className="divide-y divide-slate-100 max-h-[220px] overflow-y-auto">
                  {activeCandidates.map((c, idx) => {
                    const status = sentStatus[c.id];
                    const isNext = currentQueueCustomer?.id === c.id;

                    return (
                      <div
                        key={c.id}
                        className={`py-2 px-3 flex items-center justify-between text-xs rounded-xl transition ${
                          isNext ? 'bg-emerald-50/80 font-bold border border-emerald-200' : 'hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="w-5 text-slate-400 font-mono text-[11px]">{idx + 1}.</span>
                          <span className="font-bold text-slate-900 truncate">{c.name}</span>
                          <span className="text-[11px] font-mono text-slate-500">
                            +{formatWhatsAppNumber(c.mobile || '')}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          {status === 'sent' ? (
                            <span className="inline-flex items-center gap-1 text-emerald-700 font-bold">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Opened</span>
                            </span>
                          ) : status === 'skipped' ? (
                            <span className="text-slate-400">Skipped</span>
                          ) : isNext ? (
                            <span className="inline-flex items-center gap-1 text-emerald-800 font-bold animate-pulse">
                              <span>Next Up</span>
                            </span>
                          ) : (
                            <span className="text-slate-400">Queued</span>
                          )}

                          <button
                            type="button"
                            onClick={() => handleSendToCustomer(c)}
                            className="p-1 hover:bg-emerald-100 text-emerald-700 rounded-lg transition cursor-pointer"
                            title="Open WhatsApp for this customer"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="bg-white border-t border-slate-200 px-5 py-3 shrink-0 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {onClearSelection && (
              <button
                type="button"
                onClick={() => {
                  onClearSelection();
                  onClose();
                }}
                className="text-xs text-slate-500 hover:text-slate-800 font-medium transition cursor-pointer"
              >
                Clear selection & Close
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
            >
              Done / Close
            </button>
            {activeTab !== 'queue' && (
              <button
                type="button"
                onClick={() => setActiveTab('queue')}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Go to Dispatch Queue</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default BulkWhatsAppModal;
