// src/components/rentals/BulkEmailTemplateEditorModal.tsx
import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Save, 
  Plus, 
  FileText, 
  Sparkles, 
  Mail, 
  Calendar, 
  Clock, 
  Eye, 
  EyeOff, 
  Loader2,
  CheckCircle2
} from 'lucide-react';
import { BulkEmailTemplate, replacePlaceholders } from '../../jobs/mondayAutoEmailJob';
import { doc, setDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import toast from 'react-hot-toast';

interface BulkEmailTemplateEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  template?: BulkEmailTemplate | null;
  mode: 'edit' | 'create';
  targetType?: 'weekly' | 'daily';
  onSaved: (savedTemplateId: string) => void;
}

const AVAILABLE_PLACEHOLDERS = [
  { tag: '{driver_name}', desc: 'Driver / customer full name' },
  { tag: '{vehicle_reg}', desc: 'Vehicle plate number (VRM)' },
  { tag: '{vehicle_name}', desc: 'Vehicle make & model' },
  { tag: '{rental_id}', desc: 'Rental agreement reference' },
  { tag: '{reference}', desc: 'Bank payment reference' },
  { tag: '{owing_amount}', desc: 'Outstanding balance owing' },
  { tag: '{total_amount}', desc: 'Total agreement cost' },
  { tag: '{paid_amount}', desc: 'Total amount paid' },
  { tag: '{due_date}', desc: 'Payment due date' },
  { tag: '{rental_type}', desc: 'Weekly Hire / Daily Hire' },
  { tag: '{date}', desc: 'Current date' },
];

const SAMPLE_PAYLOAD: Record<string, string> = {
  driver_name: 'David Miller',
  client_name: 'David Miller',
  customer_name: 'David Miller',
  recipient_name: 'David Miller',
  name: 'David Miller',

  rental_id: 'AGR-7821',
  rental_ref: 'AGR-7821',
  rental_reference: 'AGR-7821',
  reference_number: 'AGR-7821',
  reference: 'BD18XYZ',
  bank_reference: 'BD18XYZ',
  payment_reference: 'BD18XYZ',

  vehicle_reg: 'BD18 XYZ',
  registration: 'BD18 XYZ',
  registration_number: 'BD18 XYZ',
  reg: 'BD18 XYZ',
  vrm: 'BD18 XYZ',
  plate_number: 'BD18 XYZ',
  vehicle_name: '2023 Toyota Prius Hybrid',

  total_amount: '£450.00',
  paid_amount: '£200.00',
  owing_amount: '£250.00',
  outstanding_amount: '£250.00',
  balance_owing: '£250.00',

  due_date: 'Monday, 28 Sep 2026',
  rental_type: 'Weekly Hire',
  hire_type: 'Weekly Hire',
  date: '28 Sep 2026',
  current_date: '28 Sep 2026',
};

export const BulkEmailTemplateEditorModal: React.FC<BulkEmailTemplateEditorModalProps> = ({
  isOpen,
  onClose,
  template,
  mode,
  targetType = 'weekly',
  onSaved,
}) => {
  const [name, setName] = useState('');
  const [subjectTemplate, setSubjectTemplate] = useState('');
  const [bodyTemplate, setBodyTemplate] = useState('');
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(true);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && template) {
        setName(template.name);
        setSubjectTemplate(template.subjectTemplate);
        setBodyTemplate(template.bodyTemplate);
      } else {
        setName(targetType === 'weekly' ? 'Weekly Payment Reminder (Alternate)' : 'Daily Payment Reminder (Alternate)');
        setSubjectTemplate('Payment Reminder - Rental #{rental_id} ({vehicle_reg})');
        setBodyTemplate(
          'Dear {driver_name},\n\n' +
          'This is an automated reminder regarding your active {rental_type} agreement #{rental_id} for vehicle {vehicle_reg}.\n\n' +
          '• Outstanding Balance: {owing_amount}\n' +
          '• Due Date: {due_date}\n' +
          '• Payment Reference: {reference}\n\n' +
          'Please ensure payment is made using your reference number.\n\n' +
          'Best regards,\nAccounts Team'
        );
      }
    }
  }, [isOpen, template, mode, targetType]);

  if (!isOpen) return null;

  const insertTag = (tag: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const newText = text.substring(0, start) + tag + text.substring(end);
    setBodyTemplate(newText);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + tag.length, start + tag.length);
    }, 50);
  };

  const handleSave = async (saveAsNewCopy: boolean = false) => {
    if (!name.trim()) {
      toast.error('Template Name is required.');
      return;
    }
    if (!subjectTemplate.trim()) {
      toast.error('Subject Line is required.');
      return;
    }
    if (!bodyTemplate.trim()) {
      toast.error('Message Body is required.');
      return;
    }

    setSaving(true);
    const toastId = toast.loading(saveAsNewCopy || mode === 'create' ? 'Creating Bulk Email template...' : 'Saving template changes...');

    try {
      let docId = template?.id;

      if (saveAsNewCopy || mode === 'create' || !docId) {
        // Create new document strictly under category 'Bulk Email'
        const docRef = await addDoc(collection(db, 'messageTemplates'), {
          name: name.trim(),
          subjectTemplate: subjectTemplate.trim(),
          bodyTemplate: bodyTemplate.trim(),
          category: 'Bulk Email', // STRICT ENFORCEMENT
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        docId = docRef.id;
        toast.success(`Template "${name}" created in Bulk Email module!`, { id: toastId });
      } else {
        // Update existing document strictly keeping category 'Bulk Email'
        await setDoc(
          doc(db, 'messageTemplates', docId),
          {
            name: name.trim(),
            subjectTemplate: subjectTemplate.trim(),
            bodyTemplate: bodyTemplate.trim(),
            category: 'Bulk Email', // STRICT ENFORCEMENT
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
        toast.success(`Template "${name}" updated successfully!`, { id: toastId });
      }

      onSaved(docId);
      onClose();
    } catch (err: any) {
      console.error('Error saving template:', err);
      toast.error(err?.message || 'Failed to save template', { id: toastId });
    } finally {
      setSaving(false);
    }
  };

  const previewSubject = replacePlaceholders(subjectTemplate, SAMPLE_PAYLOAD);
  const previewBody = replacePlaceholders(bodyTemplate, SAMPLE_PAYLOAD);

  return (
    <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-[#15172b] rounded-2xl shadow-2xl border border-white/15 w-full max-w-4xl overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-indigo-950 via-[#1a1c3d] to-slate-900 text-white flex items-center justify-between border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-600/30 border border-indigo-400/30 rounded-xl text-indigo-300">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-white">
                  {mode === 'create' ? 'Create Bulk Email Template' : 'Edit Bulk Email Template'}
                </h3>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                  Bulk Email Module
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Configure template copy and dynamic placeholders for Monday Automated reminders.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 text-white">
          {/* Template Name & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-200 mb-1">
                Template Name <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Weekly Rental Outstanding Balance Reminder"
                className="w-full text-xs font-semibold px-3 py-2 bg-[#0f1022] border border-white/20 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-slate-400"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-200 mb-1">
                Module Category
              </label>
              <div className="flex items-center gap-2 px-3 py-2 bg-[#0f1022] border border-white/20 rounded-xl text-xs font-bold text-slate-200">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                Bulk Email (Strict)
              </div>
            </div>
          </div>

          {/* Subject Line */}
          <div>
            <label className="block text-xs font-bold text-slate-200 mb-1">
              Subject Line Template <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              value={subjectTemplate}
              onChange={e => setSubjectTemplate(e.target.value)}
              placeholder="e.g. Payment Reminder - Rental #{rental_id} ({vehicle_reg})"
              className="w-full text-xs font-semibold px-3 py-2 bg-[#0f1022] border border-white/20 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-slate-400"
            />
          </div>

          {/* Placeholder Tags Inserter */}
          <div className="p-3.5 bg-indigo-950/40 border border-indigo-500/30 rounded-2xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-indigo-200 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                Click to Insert Dynamic Placeholder Tags:
              </span>
              <span className="text-[10px] text-slate-400">
                Inserts at cursor position in message body
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {AVAILABLE_PLACEHOLDERS.map(p => (
                <button
                  key={p.tag}
                  type="button"
                  onClick={() => insertTag(p.tag)}
                  title={p.desc}
                  className="px-2 py-1 bg-white/10 hover:bg-indigo-600 text-indigo-200 hover:text-white border border-indigo-400/30 rounded-lg text-[11px] font-mono font-bold transition cursor-pointer"
                >
                  {p.tag}
                </button>
              ))}
            </div>
          </div>

          {/* Body Template Editor */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-slate-200">
                Message Body Template <span className="text-rose-400">*</span>
              </label>
              <button
                type="button"
                onClick={() => setShowPreview(!showPreview)}
                className="text-xs font-bold text-indigo-300 hover:text-white flex items-center gap-1 cursor-pointer"
              >
                {showPreview ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                {showPreview ? 'Hide Live Preview' : 'Show Live Preview'}
              </button>
            </div>
            <textarea
              ref={textareaRef}
              rows={8}
              value={bodyTemplate}
              onChange={e => setBodyTemplate(e.target.value)}
              placeholder="Enter email body text with placeholders like {driver_name}, {vehicle_reg}, {owing_amount}..."
              className="w-full text-xs font-medium font-mono p-3 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-[#0f1022] text-white placeholder-slate-400 leading-relaxed"
            />
          </div>

          {/* Live Preview Section with Sample Data */}
          {showPreview && (
            <div className="p-4 bg-[#121327] border border-white/15 rounded-2xl">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-indigo-300" />
                  <span className="text-xs font-black text-indigo-200 uppercase tracking-wide">
                    Live Sample Preview (Placeholders Evaluated)
                  </span>
                </div>
                <span className="text-[10px] font-semibold text-indigo-300 bg-indigo-500/20 px-2 py-0.5 rounded-md border border-indigo-500/30">
                  Driver: David Miller • Reg: BD18 XYZ • Owing: £250.00
                </span>
              </div>

              <div 
                className="p-4 rounded-xl border border-white/15 text-xs shadow-inner space-y-2"
                style={{ backgroundColor: '#090a16', color: '#f1f5f9' }}
              >
                <p className="font-bold text-white pb-1.5 border-b border-white/10">
                  <span className="text-indigo-300 font-normal mr-1.5">Subject:</span> {previewSubject || '(Empty Subject)'}
                </p>
                <div 
                  className="whitespace-pre-wrap font-sans text-xs leading-relaxed text-slate-100"
                  style={{ color: '#f1f5f9' }}
                >
                  {previewBody || '(Empty Body)'}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 bg-[#101124] border-t border-white/10 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition cursor-pointer"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            {mode === 'edit' && (
              <button
                type="button"
                onClick={() => handleSave(true)}
                disabled={saving}
                className="px-3.5 py-2 text-xs font-bold text-indigo-300 hover:text-white bg-indigo-500/20 hover:bg-indigo-500/30 rounded-xl border border-indigo-500/30 transition disabled:opacity-50 cursor-pointer"
              >
                Save as New Alternate Copy
              </button>
            )}

            <button
              type="button"
              onClick={() => handleSave(false)}
              disabled={saving}
              className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-md transition disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {mode === 'create' ? 'Save & Assign Template' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
