// src/components/common/TemplateEditModal.tsx
import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Save, 
  Trash2, 
  Sparkles, 
  Eye, 
  EyeOff, 
  Tag, 
  Check, 
  AlertCircle,
  HelpCircle,
  MessageCircle,
  Mail,
  Layers,
  Copy
} from 'lucide-react';
import Modal from '../ui/Modal';
import { 
  AppMessageTemplate, 
  saveAppTemplate, 
  markTemplateAsDeleted, 
  TEMPLATE_AVAILABLE_TAGS, 
  TemplatePlaceholderTag 
} from '../../utils/templateManager';
import { TemplateGuideModal } from './TemplateGuideModal';
import toast from 'react-hot-toast';

interface TemplateEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  template?: AppMessageTemplate | null;
  defaultCategory?: string;
  defaultChannel?: 'whatsapp' | 'email' | 'all';
  onSaved: (savedTemplate: AppMessageTemplate) => void;
  onDeleted?: (deletedTemplateId: string) => void;
}

const CATEGORIES = [
  { id: 'custom', label: 'Custom' },
  { id: 'rental', label: 'Rental' },
  { id: 'maintenance', label: 'Maintenance' },
  { id: 'invoice', label: 'Invoice' },
  { id: 'claim', label: 'Claim' },
  { id: 'finance', label: 'Finance' },
  { id: 'Bulk Email', label: 'Bulk Email' },
];

export const TemplateEditModal: React.FC<TemplateEditModalProps> = ({
  isOpen,
  onClose,
  template,
  defaultCategory = 'custom',
  defaultChannel = 'all',
  onSaved,
  onDeleted,
}) => {
  const isEditing = Boolean(template && template.id);

  const [name, setName] = useState('');
  const [category, setCategory] = useState(defaultCategory);
  const [channel, setChannel] = useState<'all' | 'whatsapp' | 'email'>(defaultChannel);
  const [subjectTemplate, setSubjectTemplate] = useState('');
  const [bodyTemplate, setBodyTemplate] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [selectedTagCategory, setSelectedTagCategory] = useState<string>('all');

  const subjectRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const [lastFocusedField, setLastFocusedField] = useState<'subject' | 'body'>('body');

  // Reset or populate fields whenever modal opens or template changes
  useEffect(() => {
    if (isOpen) {
      if (template) {
        setName(template.name || '');
        setCategory(template.category || defaultCategory);
        setChannel((template.channel as any) || defaultChannel);
        setSubjectTemplate(template.subjectTemplate || '');
        setBodyTemplate(template.bodyTemplate || '');
      } else {
        setName('');
        setCategory(defaultCategory);
        setChannel(defaultChannel);
        setSubjectTemplate('');
        setBodyTemplate('');
      }
      setShowPreview(false);
    }
  }, [isOpen, template, defaultCategory, defaultChannel]);

  // Insert tag at cursor position
  const handleInsertTag = (tag: string) => {
    if (lastFocusedField === 'subject' && subjectRef.current) {
      const el = subjectRef.current;
      const start = el.selectionStart || 0;
      const end = el.selectionEnd || 0;
      const next = subjectTemplate.slice(0, start) + tag + subjectTemplate.slice(end);
      setSubjectTemplate(next);
      setTimeout(() => {
        el.focus();
        el.setSelectionRange(start + tag.length, start + tag.length);
      }, 50);
    } else {
      const el = bodyRef.current;
      if (el) {
        const start = el.selectionStart || 0;
        const end = el.selectionEnd || 0;
        const next = bodyTemplate.slice(0, start) + tag + bodyTemplate.slice(end);
        setBodyTemplate(next);
        setTimeout(() => {
          el.focus();
          el.setSelectionRange(start + tag.length, start + tag.length);
        }, 50);
      } else {
        setBodyTemplate((prev) => prev + tag);
      }
    }
    toast.success(`Inserted ${tag}`, { duration: 1500 });
  };

  // Preview replacement using sample data
  const renderPreviewText = (text: string) => {
    let out = text;
    TEMPLATE_AVAILABLE_TAGS.forEach((item) => {
      out = out.split(item.tag).join(item.sample);
      // Also replace curly brace variant e.g. {vehicle_reg}
      const curly = item.tag.replace('[', '{').replace(']', '}').toLowerCase().replace(/\s+/g, '_');
      out = out.split(curly).join(item.sample);
    });
    return out;
  };

  // Save handler
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Please enter a template name');
      return;
    }
    if (!bodyTemplate.trim()) {
      toast.error('Please enter the message body');
      return;
    }

    setIsSaving(true);
    const toastId = toast.loading('Saving template...');

    try {
      const saved = await saveAppTemplate({
        id: template?.id,
        name,
        category,
        channel,
        subjectTemplate,
        bodyTemplate,
        requiredFields: template?.requiredFields || [],
      });

      toast.success(
        isEditing 
          ? `Template "${saved.name}" updated successfully!` 
          : `Template "${saved.name}" created successfully!`,
        { id: toastId }
      );

      onSaved(saved);
      onClose();
    } catch (err: any) {
      console.error('Error saving template:', err);
      toast.error(`Failed to save template: ${err?.message || 'Unknown error'}`, { id: toastId });
    } finally {
      setIsSaving(false);
    }
  };

  // Delete handler
  const handleDelete = async () => {
    if (!template?.id) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete the template "${template.name}"?\n\nThis will permanently remove it from your WhatsApp and Email template choices.`
    );
    if (!confirmed) return;

    setIsDeleting(true);
    const toastId = toast.loading('Deleting template...');

    try {
      await markTemplateAsDeleted(template.id, template.category);
      toast.success(`Template "${template.name}" deleted permanently`, { id: toastId });
      if (onDeleted) {
        onDeleted(template.id);
      }
      onClose();
    } catch (err: any) {
      console.error('Error deleting template:', err);
      toast.error(`Failed to delete template: ${err?.message || 'Unknown error'}`, { id: toastId });
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredTags = TEMPLATE_AVAILABLE_TAGS.filter((t) => 
    selectedTagCategory === 'all' || t.category === selectedTagCategory
  );

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={isEditing ? `Edit Template: ${name || template?.name || 'Untitled'}` : 'Create New Message Template'}
        size="3xl"
        contentClassName="p-4 sm:p-5 flex flex-col overflow-hidden max-h-[90vh]"
      >
        <form onSubmit={handleSave} className="flex flex-col h-full space-y-4 text-slate-800 min-h-0">
          
          {/* Top Bar Controls */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 pb-3 border-b border-slate-200 shrink-0">
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                channel === 'whatsapp' 
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                  : channel === 'email' 
                  ? 'bg-blue-100 text-blue-800 border border-blue-300' 
                  : 'bg-indigo-100 text-indigo-800 border border-indigo-300'
              }`}>
                {channel === 'whatsapp' ? <MessageCircle className="w-3.5 h-3.5" /> : <Mail className="w-3.5 h-3.5" />}
                {channel.toUpperCase()}
              </span>

              <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold capitalize border border-slate-200">
                Category: {category}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowPreview(!showPreview)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition border cursor-pointer ${
                  showPreview 
                    ? 'bg-slate-900 text-white border-slate-900' 
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
              >
                {showPreview ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                {showPreview ? 'Hide Preview' : 'Live Preview'}
              </button>

              <button
                type="button"
                onClick={() => setShowGuide(true)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 transition cursor-pointer"
              >
                <HelpCircle className="w-3.5 h-3.5 text-emerald-600" />
                <span>How It Works</span>
              </button>
            </div>
          </div>

          {/* Form Content / Scrollable Area */}
          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            {/* Template Basic Info */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2 space-y-1">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Template Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Payment Reminder Notice, MOT Booking Confirmation"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>{c.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Subject Field */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Subject Line <span className="text-slate-400 font-normal lowercase">(used for emails or bold WhatsApp header)</span>
                </label>
                <span className="text-[11px] text-slate-500">Click a tag below while cursor is here to insert</span>
              </div>
              <input
                ref={subjectRef}
                type="text"
                placeholder="e.g. Important Notice: Payment Due for [Vehicle Reg]"
                value={subjectTemplate}
                onFocus={() => setLastFocusedField('subject')}
                onChange={(e) => setSubjectTemplate(e.target.value)}
                className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            {/* Message Body Field */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Message Body <span className="text-rose-500">*</span>
                </label>
                <span className="text-[11px] text-slate-500">Supports emojis, line breaks, &amp; tags</span>
              </div>
              <textarea
                ref={bodyRef}
                required
                rows={7}
                placeholder="Dear [Recipient Name],&#10;&#10;We are writing regarding your vehicle [Vehicle Reg].&#10;Your outstanding balance is [Amount].&#10;&#10;Kind regards,&#10;Admin Team"
                value={bodyTemplate}
                onFocus={() => setLastFocusedField('body')}
                onChange={(e) => setBodyTemplate(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 font-mono leading-relaxed focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            {/* Live Preview Box */}
            {showPreview && (
              <div className="p-4 bg-slate-900 text-slate-100 rounded-2xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4" /> Live Render Preview (Sample Customer: John Doe)
                  </span>
                  <span className="text-[11px] text-slate-400">Sample tags replaced automatically</span>
                </div>
                {subjectTemplate && (
                  <div className="text-xs font-bold text-slate-200">
                    <span className="text-slate-500 font-normal">Subject: </span>
                    {renderPreviewText(subjectTemplate)}
                  </div>
                )}
                <div className="text-xs font-mono text-slate-300 whitespace-pre-wrap leading-relaxed bg-slate-950/70 p-3 rounded-xl border border-slate-800">
                  {renderPreviewText(bodyTemplate) || '<Message body is empty>'}
                </div>
              </div>
            )}

            {/* Quick Tag Inserter Tray */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                  <Tag className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Insert Dynamic Placeholder Tag</span>
                  <span className="text-[11px] text-slate-500 font-normal">(Inserts into {lastFocusedField})</span>
                </div>

                <div className="flex items-center gap-1 overflow-x-auto text-[11px]">
                  {['all', 'recipient', 'vehicle', 'finance', 'rental', 'maintenance', 'invoice', 'claim'].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setSelectedTagCategory(c)}
                      className={`px-2 py-0.5 rounded-md font-semibold capitalize transition cursor-pointer ${
                        selectedTagCategory === c 
                          ? 'bg-emerald-600 text-white shadow-xs' 
                          : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-1">
                {filteredTags.map((t) => (
                  <button
                    key={t.tag}
                    type="button"
                    title={`${t.label}: ${t.description} (e.g. ${t.sample})`}
                    onClick={() => handleInsertTag(t.tag)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 border border-slate-200 hover:border-emerald-300 rounded-lg text-xs font-medium font-mono transition shadow-2xs cursor-pointer group"
                  >
                    <span>{t.tag}</span>
                    <span className="text-[10px] text-slate-400 font-sans group-hover:text-emerald-600 font-normal">
                      ({t.label})
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Modal Footer Actions */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-between shrink-0">
            <div>
              {isEditing && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isDeleting || isSaving}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4 text-rose-600" />
                  <span>{isDeleting ? 'Deleting...' : 'Delete Template'}</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isSaving || isDeleting}
                className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSaving || isDeleting}
                className="inline-flex items-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Template'}</span>
              </button>
            </div>
          </div>
        </form>
      </Modal>

      {/* Embedded Guide Modal */}
      <TemplateGuideModal
        isOpen={showGuide}
        onClose={() => setShowGuide(false)}
        channel={channel}
      />
    </>
  );
};
