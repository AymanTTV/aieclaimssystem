import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  X, 
  Save, 
  Trash2, 
  FileText, 
  Sparkles, 
  Eye, 
  Copy, 
  Check, 
  AlertCircle,
  Plus,
  Lock,
  ShieldAlert
} from 'lucide-react';
import Modal from '../ui/Modal';
import { db } from '../../lib/firebase';
import { 
  collection, 
  addDoc, 
  setDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp 
} from 'firebase/firestore';
import toast from 'react-hot-toast';
import { Rental, Vehicle, Customer } from '../../types';
import { usePermissions } from '../../hooks/usePermissions';

export interface DataToolItem {
  key: string;
  tag: string;
  label: string;
  category: 'payment' | 'rental' | 'customer' | 'vehicle' | 'document';
  description: string;
  sampleValue: string;
}

export const RENTAL_DATA_TOOLS: DataToolItem[] = [
  // Financial & Payment Tools (explicitly requested by user)
  {
    key: 'paid_amount',
    tag: '{paid_amount}',
    label: 'Paid Amount',
    category: 'payment',
    description: 'Total amount paid towards the rental',
    sampleValue: '£360.00',
  },
  {
    key: 'owing_amount',
    tag: '{owing_amount}',
    label: 'Outstanding / Owing',
    category: 'payment',
    description: 'Remaining outstanding balance due',
    sampleValue: '£150.00',
  },
  {
    key: 'last_payment_amount',
    tag: '{last_payment_amount}',
    label: 'Last Payment Paid',
    category: 'payment',
    description: 'Amount paid in the most recent payment transaction',
    sampleValue: '£100.00',
  },
  {
    key: 'last_payment_date',
    tag: '{last_payment_date}',
    label: 'Date Paid',
    category: 'payment',
    description: 'Date when the last payment was recorded',
    sampleValue: '18/09/2026',
  },
  {
    key: 'total_amount',
    tag: '{total_amount}',
    label: 'Total Amount',
    category: 'payment',
    description: 'Grand total cost of the rental agreement',
    sampleValue: '£510.00',
  },
  {
    key: 'daily_rate',
    tag: '{daily_rate}',
    label: 'Daily Rate',
    category: 'payment',
    description: 'Locked or vehicle standard daily rental rate',
    sampleValue: '£60.00',
  },
  {
    key: 'weekly_rate',
    tag: '{weekly_rate}',
    label: 'Weekly Rate',
    category: 'payment',
    description: 'Locked or vehicle standard weekly rental rate',
    sampleValue: '£360.00',
  },
  {
    key: 'payment_details',
    tag: '{payment_details}',
    label: 'Bank Payment Details',
    category: 'payment',
    description: 'Company bank details and reference for manual transfer',
    sampleValue: 'Bank: Lloyds Bank, Acc: 30513162, Sort: 30-99-50',
  },

  // Rental & Vehicle Tools (explicitly requested: registration number, agreement number)
  {
    key: 'vehicle_reg',
    tag: '{vehicle_reg}',
    label: 'Registration Number',
    category: 'vehicle',
    description: 'Vehicle registration plate number',
    sampleValue: 'BD51 SMR',
  },
  {
    key: 'agreement_number',
    tag: '{agreement_number}',
    label: 'Agreement Number',
    category: 'rental',
    description: 'Rental agreement number or ID',
    sampleValue: 'RA-2026-089',
  },
  {
    key: 'vehicle_name',
    tag: '{vehicle_name}',
    label: 'Vehicle Make & Model',
    category: 'vehicle',
    description: 'Vehicle make and model name',
    sampleValue: 'Toyota Prius',
  },
  {
    key: 'start_date',
    tag: '{start_date}',
    label: 'Start Date',
    category: 'rental',
    description: 'Rental check-out date',
    sampleValue: '10/09/2026',
  },
  {
    key: 'end_date',
    tag: '{end_date}',
    label: 'End Date / Due Date',
    category: 'rental',
    description: 'Rental return / due date',
    sampleValue: '24/09/2026',
  },
  {
    key: 'start_time',
    tag: '{start_time}',
    label: 'Start Time',
    category: 'rental',
    description: 'Rental scheduled start time',
    sampleValue: '10:00',
  },
  {
    key: 'end_time',
    tag: '{end_time}',
    label: 'End Time',
    category: 'rental',
    description: 'Rental scheduled return time',
    sampleValue: '18:00',
  },

  // Customer Tools
  {
    key: 'client_name',
    tag: '{client_name}',
    label: 'Customer Name',
    category: 'customer',
    description: 'Customer or driver full name',
    sampleValue: 'John Smith',
  },
  {
    key: 'client_phone',
    tag: '{client_phone}',
    label: 'Customer Phone',
    category: 'customer',
    description: 'Customer mobile or telephone number',
    sampleValue: '07552 553441',
  },
  {
    key: 'client_email',
    tag: '{client_email}',
    label: 'Customer Email',
    category: 'customer',
    description: 'Customer primary email address',
    sampleValue: 'john.smith@example.com',
  },

  // Document Link
  {
    key: 'pdf_link',
    tag: '{pdf_link}',
    label: 'Document PDF Link',
    category: 'document',
    description: 'Instant secure download URL for generated rental documents',
    sampleValue: 'https://storage.googleapis.com/.../agreement.pdf',
  },
];

export interface RentalTemplateData {
  id?: string;
  name: string;
  category?: string;
  channel?: 'all' | 'whatsapp' | 'email';
  subjectTemplate?: string;
  bodyTemplate: string;
}

interface RentalTemplateEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  templateToEdit?: RentalTemplateData | null;
  initialTemplate?: RentalTemplateData | null;
  mode: 'create' | 'edit';
  rental?: Rental | null;
  customer?: Customer | null;
  vehicle?: Vehicle | null;
  readOnly?: boolean;
  populateFn?: (raw: string) => string;
  onSaved: (savedId: string) => void;
  onDeleted?: (deletedId: string) => void;
}

export const RentalTemplateEditorModal: React.FC<RentalTemplateEditorModalProps> = ({
  isOpen,
  onClose,
  templateToEdit,
  initialTemplate,
  mode,
  rental,
  customer,
  vehicle,
  readOnly = false,
  populateFn,
  onSaved,
  onDeleted,
}) => {
  const { can, isAdmin } = usePermissions();
  const canEdit = isAdmin || can('rentals', 'templateEdit');
  const isReadOnly = Boolean(readOnly !== undefined ? readOnly : !canEdit);

  const activeTemplate = templateToEdit || initialTemplate || null;
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Rental');
  const [channel, setChannel] = useState<'all' | 'whatsapp' | 'email'>('all');
  const [subjectTemplate, setSubjectTemplate] = useState('');
  const [bodyTemplate, setBodyTemplate] = useState('');
  const [activeField, setActiveField] = useState<'subject' | 'body'>('body');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [toolCategoryFilter, setToolCategoryFilter] = useState<'all' | 'payment' | 'rental' | 'vehicle' | 'customer'>('all');
  const [showLivePreview, setShowLivePreview] = useState(true);

  const subjectRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  // Initialize or reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && activeTemplate) {
        setName(activeTemplate.name || '');
        setCategory(activeTemplate.category || 'Rental');
        setChannel(activeTemplate.channel || 'all');
        setSubjectTemplate(activeTemplate.subjectTemplate || '');
        setBodyTemplate(activeTemplate.bodyTemplate || '');
      } else {
        setName('');
        setCategory('Rental');
        setChannel('all');
        setSubjectTemplate('Rental Agreement Update - {agreement_number}');
        setBodyTemplate(
          `Dear {client_name},\n\nHere are your rental details for vehicle {vehicle_reg}:\n- Agreement Number: {agreement_number}\n- Start Date: {start_date}\n- End Date: {end_date}\n- Total Cost: {total_amount}\n- Amount Paid: {paid_amount}\n- Outstanding Balance: {owing_amount}\n- Last Payment: {last_payment_amount} (Date: {last_payment_date})\n\nIf you have any questions, please contact us.\n\nThank you,\nAIE Skyline Limited`
        );
      }
    }
  }, [isOpen, mode, activeTemplate]);

  // Insert a tag at the cursor position of whichever field was active
  const handleInsertTag = (tag: string) => {
    if (activeField === 'subject') {
      const input = subjectRef.current;
      if (input) {
        const start = input.selectionStart || 0;
        const end = input.selectionEnd || 0;
        const updated = subjectTemplate.slice(0, start) + tag + subjectTemplate.slice(end);
        setSubjectTemplate(updated);
        setTimeout(() => {
          input.focus();
          input.setSelectionRange(start + tag.length, start + tag.length);
        }, 0);
        return;
      }
      setSubjectTemplate((prev) => prev + tag);
    } else {
      const textarea = bodyRef.current;
      if (textarea) {
        const start = textarea.selectionStart || 0;
        const end = textarea.selectionEnd || 0;
        const updated = bodyTemplate.slice(0, start) + tag + bodyTemplate.slice(end);
        setBodyTemplate(updated);
        setTimeout(() => {
          textarea.focus();
          textarea.setSelectionRange(start + tag.length, start + tag.length);
        }, 0);
        return;
      }
      setBodyTemplate((prev) => prev + tag);
    }
  };

  // Filter tools by category
  const filteredTools = RENTAL_DATA_TOOLS.filter((t) => {
    if (toolCategoryFilter === 'all') return true;
    if (toolCategoryFilter === 'payment') return t.category === 'payment';
    if (toolCategoryFilter === 'rental') return t.category === 'rental' || t.category === 'document';
    if (toolCategoryFilter === 'vehicle') return t.category === 'vehicle';
    if (toolCategoryFilter === 'customer') return t.category === 'customer';
    return true;
  });

  // Save / Update Handler
  const handleSave = async () => {
    if (isReadOnly) {
      toast.error('You do not have permission to modify templates (Read-Only access)');
      return;
    }
    if (!name.trim()) {
      toast.error('Please enter a template name');
      return;
    }
    if (!bodyTemplate.trim()) {
      toast.error('Template message body cannot be empty');
      return;
    }

    setSaving(true);
    const toastId = toast.loading(mode === 'create' ? 'Creating new template...' : 'Saving template changes...');

    try {
      const templateData = {
        name: name.trim(),
        category: category.trim() || 'Rental',
        channel: channel,
        subjectTemplate: subjectTemplate.trim(),
        bodyTemplate: bodyTemplate.trim(),
        // Mirror standard keys for cross-compatibility
        subject: subjectTemplate.trim(),
        body: bodyTemplate.trim(),
        updatedAt: serverTimestamp(),
      };

      let savedId = activeTemplate?.id;

      if (mode === 'create' || !savedId) {
        const docRef = await addDoc(collection(db, 'messageTemplates'), {
          ...templateData,
          createdAt: serverTimestamp(),
        });
        savedId = docRef.id;
        toast.success(`Template "${name}" created successfully!`, { id: toastId });
      } else {
        await setDoc(doc(db, 'messageTemplates', savedId), templateData, { merge: true });
        toast.success(`Template "${name}" updated successfully!`, { id: toastId });
      }

      onSaved(savedId);
      onClose();
    } catch (err) {
      console.error('Failed to save message template:', err);
      toast.error('Failed to save template. Please try again.', { id: toastId });
    } finally {
      setSaving(false);
    }
  };

  // Delete Handler
  const handleDelete = async () => {
    if (isReadOnly) {
      toast.error('You do not have permission to delete templates');
      return;
    }
    if (!activeTemplate?.id) return;
    if (!window.confirm(`Are you sure you want to delete template "${activeTemplate.name}"?`)) return;

    setDeleting(true);
    const toastId = toast.loading('Deleting template...');

    try {
      await deleteDoc(doc(db, 'messageTemplates', activeTemplate.id));
      toast.success('Template deleted successfully', { id: toastId });
      onDeleted?.(activeTemplate.id);
      onClose();
    } catch (err) {
      console.error('Failed to delete template:', err);
      toast.error('Failed to delete template.', { id: toastId });
    } finally {
      setDeleting(false);
    }
  };

  const safePopulate = useCallback((raw: string): string => {
    if (!raw) return '';
    if (typeof populateFn === 'function') {
      try {
        return populateFn(raw);
      } catch (e) {
        console.warn('Error executing populateFn:', e);
      }
    }
    // Fallback population using dynamic data or sample values
    let populated = raw;
    RENTAL_DATA_TOOLS.forEach((tool) => {
      if (populated.includes(tool.tag)) {
        let value = tool.sampleValue;
        if (rental) {
          if (tool.tag === '{client_name}') {
            value = customer?.name || rental.customerName || value;
          } else if (tool.tag === '{agreement_number}') {
            value = rental.rentalAgreementNumber || rental.id || value;
          } else if (tool.tag === '{vehicle_reg}') {
            value = vehicle?.registrationNumber || rental.vehicleReg || value;
          }
        }
        populated = populated.split(tool.tag).join(value);
      }
    });
    return populated;
  }, [populateFn, rental, customer, vehicle]);

  if (!isOpen) return null;

  const previewSubject = safePopulate(subjectTemplate);
  const previewBody = safePopulate(bodyTemplate);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isReadOnly ? `View Template: ${activeTemplate?.name || 'Template'} (Read-Only)` : mode === 'create' ? 'Create New Rental Template' : `Edit Template: ${activeTemplate?.name || 'Template'}`}
      size="3xl"
      contentClassName="p-4 sm:p-5 flex flex-col overflow-hidden max-h-[90vh]"
    >
      <div className="flex flex-col h-full space-y-3 text-slate-200 min-h-0">
        {/* Top Header Section - Pinned */}
        <div className="shrink-0 space-y-2.5">
          {/* Read Only Notice Banner */}
          {isReadOnly && (
            <div className="flex items-center gap-2.5 p-2 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-200 text-xs">
              <Lock className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                <strong className="text-amber-300 mr-1">Read-Only Permission:</strong>
                You do not have permission to edit or create templates. You can preview data tools and live evaluations.
              </span>
            </div>
          )}

          {/* Template Metadata Row */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end bg-[#121524] border border-[#2B314E] p-2.5 rounded-xl">
            <div className="sm:col-span-5">
              <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                Template Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={name}
                disabled={isReadOnly}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Overdue Rent Warning, Weekly Payment Reminder..."
                className="w-full px-3 py-1.5 text-xs sm:text-sm bg-[#0F111A] text-white border border-[#2B314E] rounded-lg focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:bg-[#181C2E] disabled:text-slate-400 disabled:cursor-not-allowed placeholder-slate-500"
              />
            </div>
            <div className="sm:col-span-3">
              <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                Channel / Target
              </label>
              <select
                value={channel}
                disabled={isReadOnly}
                onChange={(e) => setChannel(e.target.value as any)}
                className="w-full px-2.5 py-1.5 text-xs sm:text-sm bg-[#0F111A] text-white border border-[#2B314E] rounded-lg focus:outline-none focus:border-indigo-500 disabled:bg-[#181C2E] disabled:text-slate-400 disabled:cursor-not-allowed"
              >
                <option value="all">WhatsApp & Email (Both)</option>
                <option value="whatsapp">WhatsApp Only</option>
                <option value="email">Email Only</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                Category
              </label>
              <select
                value={category}
                disabled={isReadOnly}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-2 py-1.5 text-xs sm:text-sm bg-[#0F111A] text-white border border-[#2B314E] rounded-lg focus:outline-none focus:border-indigo-500 disabled:bg-[#181C2E] disabled:text-slate-400 disabled:cursor-not-allowed"
              >
                <option value="Rental">Rental</option>
                <option value="Payment">Payment</option>
                <option value="Overdue">Overdue</option>
                <option value="Agreement">Agreement</option>
                <option value="Extension">Extension</option>
                <option value="Return">Return</option>
                <option value="General">General</option>
              </select>
            </div>
            <div className="sm:col-span-2 flex justify-end">
              {mode === 'edit' && activeTemplate?.id && !isReadOnly && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="w-full inline-flex items-center justify-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-red-300 bg-red-950/50 hover:bg-red-900/60 border border-red-700/50 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
                  title="Delete this template from database"
                >
                  <Trash2 className="w-3.5 h-3.5 text-red-400" />
                  <span>{deleting ? 'Deleting...' : 'Delete'}</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Main 2-Column Responsive Workspace - Fits directly to page without stacked scrollbars */}
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-3.5 overflow-hidden">
          {/* Left Column: Editor (7 cols) */}
          <div className="lg:col-span-7 flex flex-col min-h-0 space-y-2.5">
            {/* Email Subject Line (if email or both) */}
            {channel !== 'whatsapp' && (
              <div className="shrink-0">
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                    Email Subject Line {activeField === 'subject' && <span className="text-indigo-400 normal-case font-medium ml-1">(Targeted by Data Tools)</span>}
                  </label>
                </div>
                <input
                  ref={subjectRef}
                  type="text"
                  value={subjectTemplate}
                  disabled={isReadOnly}
                  onFocus={() => setActiveField('subject')}
                  onChange={(e) => setSubjectTemplate(e.target.value)}
                  placeholder="e.g. Rental Agreement #{agreement_number} - {client_name}"
                  className="w-full px-3 py-1.5 text-xs sm:text-sm bg-[#0F111A] text-white border border-[#2B314E] rounded-lg focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:bg-[#181C2E] disabled:text-slate-400 disabled:cursor-not-allowed placeholder-slate-500"
                />
              </div>
            )}

            {/* Message Body Template Textarea */}
            <div className="flex-1 min-h-0 flex flex-col space-y-1">
              <div className="flex items-center justify-between">
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                  Message Body Template <span className="text-red-400">*</span>
                  {activeField === 'body' && <span className="text-indigo-400 normal-case font-medium ml-1.5">(Targeted by Data Tools)</span>}
                </label>
                <div className="text-[11px] text-slate-400">
                  {bodyTemplate.length} chars
                </div>
              </div>
              <textarea
                ref={bodyRef}
                value={bodyTemplate}
                disabled={isReadOnly}
                onFocus={() => setActiveField('body')}
                onChange={(e) => setBodyTemplate(e.target.value)}
                placeholder="Type message with placeholders like {client_name}, {vehicle_reg}, {paid_amount}, {owing_amount}, {last_payment_date}..."
                className="w-full flex-1 min-h-[180px] p-3 text-xs sm:text-sm font-sans bg-[#0F111A] text-white border border-[#2B314E] rounded-lg focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:bg-[#181C2E] disabled:text-slate-400 disabled:cursor-not-allowed resize-none leading-relaxed placeholder-slate-500 custom-scrollbar"
              />
              <p className="text-[10px] text-slate-400 italic shrink-0">
                Click any tool on the right to insert instant placeholders into the targeted field.
              </p>
            </div>
          </div>

          {/* Right Column: Data Tools & Live Preview (5 cols) */}
          <div className="lg:col-span-5 flex flex-col min-h-0 space-y-2.5">
            {/* DATA TOOLS PALETTE (Click-to-Insert) */}
            <div className="bg-[#121524] border border-[#2B314E] rounded-xl p-2.5 flex flex-col shrink-0 space-y-2">
              <div className="flex items-center justify-between gap-1 border-b border-[#2B314E] pb-1.5 flex-wrap">
                <div className="flex items-center gap-1.5 text-xs font-bold text-white uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Data Tools</span>
                </div>

                {/* Filter Pills */}
                <div className="flex items-center gap-1 text-[10px]">
                  {(['all', 'payment', 'rental', 'vehicle', 'customer'] as const).map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setToolCategoryFilter(cat)}
                      className={`px-2 py-0.5 rounded font-medium capitalize transition-all cursor-pointer ${
                        toolCategoryFilter === cat
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'bg-[#181C2E] text-slate-300 border border-[#2B314E] hover:bg-[#20253D]'
                      }`}
                    >
                      {cat === 'all' ? 'All' : cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Chips Grid - Compact layout without its own separate scrollbar */}
              <div className="flex flex-wrap gap-1.5 p-0.5">
                {filteredTools.map((tool) => {
                  const isPayment = tool.category === 'payment';
                  return (
                    <button
                      key={tool.key}
                      type="button"
                      disabled={isReadOnly}
                      onClick={() => !isReadOnly && handleInsertTag(tool.tag)}
                      title={`${tool.description} (Example: ${tool.sampleValue})`}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] rounded-md border font-medium transition-all text-left ${
                        isReadOnly
                          ? 'opacity-60 bg-[#16192A] text-slate-400 border-[#2B314E] cursor-not-allowed'
                          : isPayment 
                            ? 'bg-emerald-950/50 hover:bg-emerald-900/60 text-emerald-300 border-emerald-500/40 cursor-pointer active:scale-95' 
                            : 'bg-[#181C2E] hover:bg-[#20253D] text-slate-200 border-[#2B314E] cursor-pointer active:scale-95'
                      }`}
                    >
                      <Plus className="w-2.5 h-2.5 text-slate-400" />
                      <span className="font-semibold">{tool.label}</span>
                    </button>
                  );
                })}
              </div>
              <div className="text-[10px] text-slate-400 flex items-center justify-between pt-0.5 border-t border-[#2B314E]/60">
                <span>Target: <strong className="text-indigo-400">{activeField === 'subject' ? 'Subject' : 'Message Body'}</strong></span>
                <span className="text-emerald-400 font-medium">Auto-populates live data</span>
              </div>
            </div>

            {/* Real-time Dynamic Preview Panel */}
            <div className="bg-[#0F111A] border border-[#2B314E] rounded-xl p-2.5 flex-1 min-h-0 flex flex-col space-y-1.5 shadow-inner">
              <div className="flex items-center justify-between shrink-0">
                <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1">
                  <Eye className="w-3.5 h-3.5 text-amber-400" />
                  Live Preview
                </span>
                <span className="text-[10px] text-slate-400">
                  Reg: <strong className="text-white">{vehicle?.registrationNumber || 'ABC 123'}</strong>
                </span>
              </div>

              {channel !== 'whatsapp' && subjectTemplate && (
                <div className="bg-[#16192A] border border-[#2B314E] rounded-lg px-2.5 py-1 text-xs text-slate-200 shrink-0">
                  <strong className="text-slate-400 mr-1">Subject:</strong> {previewSubject}
                </div>
              )}

              <div className="bg-[#16192A] border border-[#2B314E] rounded-lg p-2.5 text-xs text-slate-200 whitespace-pre-wrap font-sans flex-1 min-h-0 overflow-y-auto custom-scrollbar leading-relaxed">
                {previewBody || <span className="text-slate-500 italic">Live preview will appear as you type...</span>}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Action Buttons - Pinned at bottom */}
        <div className="shrink-0 flex items-center justify-between pt-2.5 border-t border-[#2B314E]">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            {isReadOnly ? (
              <span className="inline-flex items-center gap-1 text-amber-300 font-medium">
                <Lock className="w-3.5 h-3.5 text-amber-400" />
                Read-Only (No Edit Permission)
              </span>
            ) : (
              <span>Editing template for <strong className="text-white capitalize">{channel}</strong></span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 text-xs sm:text-sm font-medium text-slate-300 bg-[#181C2E] border border-[#2B314E] rounded-lg hover:bg-[#22273F] focus:outline-none cursor-pointer transition-colors"
            >
              {isReadOnly ? 'Close' : 'Cancel'}
            </button>
            {!isReadOnly && (
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center justify-center px-4 py-1.5 text-xs sm:text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg focus:outline-none shadow-sm transition-all disabled:opacity-50 cursor-pointer active:scale-95"
              >
                <Save className="w-3.5 h-3.5 mr-1.5" />
                {saving ? 'Saving...' : mode === 'create' ? 'Create Template' : 'Save Changes'}
              </button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default RentalTemplateEditorModal;
