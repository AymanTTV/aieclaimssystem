// src/components/rentals/RentalReminderTemplateSelector.tsx
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Mail, 
  Calendar, 
  Clock, 
  Save, 
  ShieldCheck, 
  Eye, 
  EyeOff, 
  FileText, 
  AlertCircle,
  Loader2,
  CheckCircle2,
  Edit3,
  Plus,
  Play,
  RotateCcw,
  Sparkles,
  Check,
  X
} from 'lucide-react';
import { 
  getBulkEmailTemplates, 
  runMondayAutoEmailJob,
  replacePlaceholders,
  BulkEmailTemplate, 
  DEFAULT_BULK_WEEKLY_TEMPLATE, 
  DEFAULT_BULK_DAILY_TEMPLATE 
} from '../../jobs/mondayAutoEmailJob';
import { doc, getDoc, setDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import toast from 'react-hot-toast';
import { BulkEmailTemplateSearchableSelect } from './BulkEmailTemplateSearchableSelect';

interface RentalReminderTemplateSelectorProps {
  onSaved?: () => void;
  className?: string;
  isCompact?: boolean;
}

const AVAILABLE_PLACEHOLDERS = [
  { tag: '{client_name}', desc: 'Customer full name' },
  { tag: '{rental_id}', desc: 'Rental agreement reference' },
  { tag: '{rental_ref}', desc: 'Rental agreement number' },
  { tag: '{reference_number}', desc: 'Agreement or bank reference number' },
  { tag: '{reference}', desc: 'Bank payment reference (e.g. reg or agreement)' },
  { tag: '{vehicle_reg}', desc: 'Vehicle registration number (plate / VRM)' },
  { tag: '{total_amount}', desc: 'Total agreement cost' },
  { tag: '{paid_amount}', desc: 'Total amount paid' },
  { tag: '{owing_amount}', desc: 'Current outstanding balance' },
  { tag: '{due_date}', desc: 'Payment due date' },
  { tag: '{rental_type}', desc: 'Hire type (Weekly or Daily)' },
];

export const RentalReminderTemplateSelector: React.FC<RentalReminderTemplateSelectorProps> = ({
  onSaved,
  className = '',
  isCompact = false,
}) => {
  const [loading, setLoading] = useState(true);
  const [savingPreferences, setSavingPreferences] = useState(false);
  const [runningTestBatch, setRunningTestBatch] = useState(false);
  const [bulkTemplates, setBulkTemplates] = useState<BulkEmailTemplate[]>([]);

  // Selected template IDs
  const [weeklyTemplateId, setWeeklyTemplateId] = useState<string>(DEFAULT_BULK_WEEKLY_TEMPLATE.id);
  const [dailyTemplateId, setDailyTemplateId] = useState<string>(DEFAULT_BULK_DAILY_TEMPLATE.id);

  // Preview tab: 'weekly' | 'daily' | null
  const [previewTab, setPreviewTab] = useState<'weekly' | 'daily' | null>(null);

  // Inline Template Editor state
  const [editingTarget, setEditingTarget] = useState<'weekly' | 'daily' | 'new' | null>(null);
  const [editorForm, setEditorForm] = useState<{
    id?: string;
    name: string;
    subjectTemplate: string;
    bodyTemplate: string;
    targetType: 'weekly' | 'daily';
  }>({
    name: '',
    subjectTemplate: '',
    bodyTemplate: '',
    targetType: 'weekly',
  });
  const [savingTemplate, setSavingTemplate] = useState(false);

  // Tracking cursor in editor
  const [activeEditorField, setActiveEditorField] = useState<'subject' | 'body'>('body');
  const subjectInputRef = useRef<HTMLInputElement>(null);
  const bodyTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Load bulk email templates and current settings
  const loadTemplatesAndConfig = async () => {
    setLoading(true);
    try {
      // STRICT TEMPLATE SOURCE: Retrieve strictly category = 'Bulk Email'
      const templates = await getBulkEmailTemplates();
      setBulkTemplates(templates);

      // Load saved preferences from global config
      const configSnap = await getDoc(doc(db, 'system_settings', 'global_config'));
      if (configSnap.exists()) {
        const data = configSnap.data();
        if (data?.weekly_rental_template_id) {
          setWeeklyTemplateId(data.weekly_rental_template_id);
        } else if (templates.length > 0) {
          const found = templates.find(t => t.name.toLowerCase().includes('weekly')) || templates[0];
          setWeeklyTemplateId(found.id);
        }

        if (data?.daily_rental_template_id) {
          setDailyTemplateId(data.daily_rental_template_id);
        } else if (templates.length > 0) {
          const found = templates.find(t => t.name.toLowerCase().includes('daily')) || templates[1] || templates[0];
          setDailyTemplateId(found.id);
        }
      }
    } catch (err) {
      console.error('Failed to load Bulk Email reminder templates:', err);
      toast.error('Could not load Bulk Email templates.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTemplatesAndConfig();
  }, []);

  const selectedWeekly = useMemo(() => {
    return bulkTemplates.find(t => t.id === weeklyTemplateId) || DEFAULT_BULK_WEEKLY_TEMPLATE;
  }, [bulkTemplates, weeklyTemplateId]);

  const selectedDaily = useMemo(() => {
    return bulkTemplates.find(t => t.id === dailyTemplateId) || DEFAULT_BULK_DAILY_TEMPLATE;
  }, [bulkTemplates, dailyTemplateId]);

  // Open editor for Weekly template
  const handleOpenEditWeekly = () => {
    setEditorForm({
      id: selectedWeekly.id,
      name: selectedWeekly.name,
      subjectTemplate: selectedWeekly.subjectTemplate,
      bodyTemplate: selectedWeekly.bodyTemplate,
      targetType: 'weekly',
    });
    setEditingTarget('weekly');
  };

  // Open editor for Daily template
  const handleOpenEditDaily = () => {
    setEditorForm({
      id: selectedDaily.id,
      name: selectedDaily.name,
      subjectTemplate: selectedDaily.subjectTemplate,
      bodyTemplate: selectedDaily.bodyTemplate,
      targetType: 'daily',
    });
    setEditingTarget('daily');
  };

  // Open editor to create new Alternate Template
  const handleOpenCreateAlternate = (targetType: 'weekly' | 'daily') => {
    const baseTpl = targetType === 'weekly' ? selectedWeekly : selectedDaily;
    setEditorForm({
      name: `${baseTpl.name} (Alternate)`,
      subjectTemplate: baseTpl.subjectTemplate,
      bodyTemplate: baseTpl.bodyTemplate,
      targetType,
    });
    setEditingTarget('new');
  };

  // Insert placeholder tag at cursor position
  const handleInsertTag = (tag: string) => {
    if (activeEditorField === 'subject') {
      const input = subjectInputRef.current;
      if (!input) {
        setEditorForm(prev => ({ ...prev, subjectTemplate: prev.subjectTemplate + tag }));
        return;
      }
      const start = input.selectionStart ?? input.value.length;
      const end = input.selectionEnd ?? input.value.length;
      const text = input.value;
      const newText = text.substring(0, start) + tag + text.substring(end);
      setEditorForm(prev => ({ ...prev, subjectTemplate: newText }));
      setTimeout(() => {
        input.focus();
        input.setSelectionRange(start + tag.length, start + tag.length);
      }, 50);
    } else {
      const textarea = bodyTextareaRef.current;
      if (!textarea) {
        setEditorForm(prev => ({ ...prev, bodyTemplate: prev.bodyTemplate + tag }));
        return;
      }
      const start = textarea.selectionStart ?? textarea.value.length;
      const end = textarea.selectionEnd ?? textarea.value.length;
      const text = textarea.value;
      const newText = text.substring(0, start) + tag + text.substring(end);
      setEditorForm(prev => ({ ...prev, bodyTemplate: newText }));
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + tag.length, start + tag.length);
      }, 50);
    }
  };

  // Save changes to current template or create alternate
  const handleSaveTemplateChanges = async (asNewAlternate: boolean = false) => {
    if (!editorForm.name.trim() || !editorForm.subjectTemplate.trim() || !editorForm.bodyTemplate.trim()) {
      toast.error('Template Name, Subject, and Body are required.');
      return;
    }

    setSavingTemplate(true);
    const toastId = toast.loading(asNewAlternate ? 'Creating alternate Bulk Email template...' : 'Saving template changes...');

    try {
      let savedId = editorForm.id;

      if (asNewAlternate || editingTarget === 'new' || !savedId) {
        // Create new template document strictly under category 'Bulk Email'
        const docRef = await addDoc(collection(db, 'messageTemplates'), {
          name: editorForm.name.trim(),
          subjectTemplate: editorForm.subjectTemplate.trim(),
          bodyTemplate: editorForm.bodyTemplate.trim(),
          category: 'Bulk Email', // STRICT ENFORCEMENT
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        savedId = docRef.id;

        // Auto-assign new alternate template to the active dropdown
        if (editorForm.targetType === 'weekly') {
          setWeeklyTemplateId(savedId);
          await setDoc(
            doc(db, 'system_settings', 'global_config'),
            { weekly_rental_template_id: savedId, updatedAt: serverTimestamp() },
            { merge: true }
          );
        } else {
          setDailyTemplateId(savedId);
          await setDoc(
            doc(db, 'system_settings', 'global_config'),
            { daily_rental_template_id: savedId, updatedAt: serverTimestamp() },
            { merge: true }
          );
        }

        toast.success(`Alternate template "${editorForm.name}" created and assigned!`, { id: toastId });
      } else {
        // Update existing template strictly under category 'Bulk Email'
        await setDoc(
          doc(db, 'messageTemplates', savedId),
          {
            name: editorForm.name.trim(),
            subjectTemplate: editorForm.subjectTemplate.trim(),
            bodyTemplate: editorForm.bodyTemplate.trim(),
            category: 'Bulk Email', // STRICT ENFORCEMENT
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
        toast.success(`Template "${editorForm.name}" updated successfully!`, { id: toastId });
      }

      // Refresh templates
      await loadTemplatesAndConfig();
      setEditingTarget(null);
      onSaved?.();
    } catch (err: any) {
      console.error('Failed to save template:', err);
      toast.error(`Error saving template: ${err?.message || 'Unknown error'}`, { id: toastId });
    } finally {
      setSavingTemplate(false);
    }
  };

  // Save dropdown selections
  const handleSavePreferences = async () => {
    setSavingPreferences(true);
    const toastId = toast.loading('Saving reminder template selections...');
    try {
      await setDoc(
        doc(db, 'system_settings', 'global_config'),
        {
          weekly_rental_template_id: weeklyTemplateId,
          daily_rental_template_id: dailyTemplateId,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      toast.success('Rental reminder templates successfully saved!', { id: toastId });
      onSaved?.();
    } catch (err) {
      console.error('Failed to save reminder template preferences:', err);
      toast.error('Failed to save settings. Please try again.', { id: toastId });
    } finally {
      setSavingPreferences(false);
    }
  };

  // Run Test Batch
  const handleRunTestBatch = async () => {
    setRunningTestBatch(true);
    const toastId = toast.loading('Executing Monday Auto-Email test dispatch...');
    try {
      const res = await runMondayAutoEmailJob({ isTestRun: true, bypassGlobalToggle: true });
      toast.success(res.message, { id: toastId, duration: 6000 });
    } catch (err: any) {
      console.error('Failed running test batch:', err);
      toast.error(`Test batch error: ${err?.message || 'Failed to execute'}`, { id: toastId });
    } finally {
      setRunningTestBatch(false);
    }
  };

  // Sample data substitution for live preview
  const renderSamplePreview = (template: BulkEmailTemplate, type: 'Weekly' | 'Daily') => {
    const samplePlaceholders = {
      client_name: 'John Smith',
      rental_id: 'RA-2026-089',
      rental_ref: 'RA-2026-089',
      reference_number: 'AB21 XYZ',
      reference: 'AB21 XYZ',
      bank_reference: 'AB21 XYZ',
      vehicle_reg: 'AB21 XYZ',
      registration: 'AB21 XYZ',
      vrm: 'AB21 XYZ',
      plate_number: 'AB21 XYZ',
      total_amount: '£450.00',
      paid_amount: '£150.00',
      owing_amount: '£300.00',
      due_date: 'Monday, 21 Sep 2026',
      rental_type: type === 'Weekly' ? 'Weekly Hire' : 'Daily Hire',
    };

    const subject = replacePlaceholders(template.subjectTemplate, samplePlaceholders);
    const body = replacePlaceholders(template.bodyTemplate, samplePlaceholders);

    return { subject, body };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 text-gray-500 gap-2">
        <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
        <span className="text-sm font-medium">Loading Bulk Email templates...</span>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-2xl border border-indigo-100 shadow-xs overflow-hidden ${className}`}>
      {/* --- SCHEDULE DISPATCH HEADER BANNER --- */}
      <div className="p-4 sm:p-5 bg-gradient-to-r from-indigo-50/90 via-white to-blue-50/90 border-b border-indigo-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-xs mt-0.5 shrink-0">
            <Mail className="w-5 h-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm sm:text-base font-black text-gray-900">
                Monday Automated Bulk Email Scheduler
              </h3>
              <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200">
                <Clock className="w-3 h-3 text-indigo-600" />
                0 9 * * 1 (Mondays 09:00 AM)
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                Category: Bulk Email
              </span>
            </div>
            <p className="text-xs text-gray-600 mt-1 max-w-3xl leading-relaxed">
              Auto-dispatches payment reminders to active rentals with an outstanding balance (<span className="font-semibold text-gray-800">owing &gt; £0</span>) every Monday at 09:00 AM. Edit or select alternate templates directly from the <span className="font-bold text-gray-800">Bulk Email module</span> anytime prior to the scheduled 09:00 AM dispatch.
            </p>
          </div>
        </div>

        {/* Top Actions */}
        <div className="flex items-center gap-2 self-start lg:self-center shrink-0">
          <button
            type="button"
            onClick={handleRunTestBatch}
            disabled={runningTestBatch}
            className="inline-flex items-center px-3.5 py-2 bg-white hover:bg-slate-50 text-indigo-700 text-xs font-bold rounded-xl border border-indigo-200 shadow-2xs transition disabled:opacity-50"
            title="Execute test run of the reminder dispatch right now"
          >
            {runningTestBatch ? (
              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin text-indigo-600" />
            ) : (
              <Play className="w-3.5 h-3.5 mr-1.5 text-indigo-600 fill-indigo-600" />
            )}
            Run Test Batch Now
          </button>
          <button
            type="button"
            onClick={handleSavePreferences}
            disabled={savingPreferences}
            className="inline-flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition disabled:opacity-50"
          >
            {savingPreferences ? (
              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5 mr-1.5" />
            )}
            Save Selections
          </button>
        </div>
      </div>

      {/* --- DYNAMIC DROPDOWN SELECTION INTERFACE --- */}
      <div className="p-4 sm:p-5 grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* 1. WEEKLY RENTALS TEMPLATE SELECTOR */}
        <div className="bg-slate-50/90 rounded-2xl border border-indigo-100/80 p-4 sm:p-5 flex flex-col justify-between shadow-2xs">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-indigo-100 text-indigo-700 rounded-lg">
                  <Calendar className="w-4 h-4" />
                </span>
                <div>
                  <h4 className="text-xs font-black text-gray-900 uppercase tracking-wide">
                    Weekly Rentals Templates
                  </h4>
                  <span className="text-[10px] text-gray-500 font-medium">
                    Strictly sourced from Bulk Email module
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setPreviewTab(previewTab === 'weekly' ? null : 'weekly')}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-white px-2.5 py-1 rounded-lg border border-indigo-200 shadow-2xs flex items-center gap-1 transition"
                  title="Toggle rendered email preview"
                >
                  {previewTab === 'weekly' ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  {previewTab === 'weekly' ? 'Hide' : 'Preview'}
                </button>
              </div>
            </div>

            <label className="block text-xs text-gray-700 font-bold mb-1.5">
              Assigned Weekly Template:
            </label>
            
            {/* Dynamic Dropdown */}
            <div className="space-y-2">
              <BulkEmailTemplateSearchableSelect
                templates={bulkTemplates}
                selectedTemplateId={weeklyTemplateId}
                onSelectTemplate={t => setWeeklyTemplateId(t.id)}
                onEditTemplate={handleOpenEditWeekly}
                onCreateNewTemplate={() => handleOpenCreateAlternate('weekly')}
                label="Selected Weekly Template"
                typeBadge="Weekly"
              />

              <div className="bg-white p-2.5 rounded-xl border border-gray-200/80 text-[11px] text-gray-600 space-y-1">
                <div className="font-semibold text-gray-800 truncate">
                  <span className="text-gray-400 font-normal mr-1">Subject:</span>
                  {selectedWeekly.subjectTemplate}
                </div>
                <div className="text-gray-500 line-clamp-2 leading-relaxed">
                  <span className="text-gray-400 mr-1">Body:</span>
                  {selectedWeekly.bodyTemplate}
                </div>
              </div>
            </div>
          </div>

          {/* Action Row for Weekly: Edit & Select Alternate */}
          <div className="mt-4 pt-3 border-t border-gray-200/80 flex flex-wrap items-center justify-between gap-2">
            <span className="text-[11px] text-indigo-700 font-semibold flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-indigo-500" />
              Prior to 09:00 AM dispatch
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleOpenCreateAlternate('weekly')}
                className="inline-flex items-center px-2.5 py-1.5 text-xs font-bold text-gray-700 bg-white hover:bg-slate-100 border border-gray-200 rounded-lg shadow-2xs transition"
                title="Create a new alternate template under Bulk Email module"
              >
                <Plus className="w-3.5 h-3.5 mr-1 text-gray-500" />
                + Alternate
              </button>
              <button
                type="button"
                onClick={handleOpenEditWeekly}
                className="inline-flex items-center px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-2xs transition"
                title="Edit this Weekly template content and placeholders"
              >
                <Edit3 className="w-3.5 h-3.5 mr-1" />
                Edit Template
              </button>
            </div>
          </div>
        </div>

        {/* 2. DAILY RENTALS TEMPLATE SELECTOR */}
        <div className="bg-slate-50/90 rounded-2xl border border-indigo-100/80 p-4 sm:p-5 flex flex-col justify-between shadow-2xs">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-blue-100 text-blue-700 rounded-lg">
                  <Clock className="w-4 h-4" />
                </span>
                <div>
                  <h4 className="text-xs font-black text-gray-900 uppercase tracking-wide">
                    Daily Rentals Templates
                  </h4>
                  <span className="text-[10px] text-gray-500 font-medium">
                    Strictly sourced from Bulk Email module
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setPreviewTab(previewTab === 'daily' ? null : 'daily')}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-white px-2.5 py-1 rounded-lg border border-indigo-200 shadow-2xs flex items-center gap-1 transition"
                  title="Toggle rendered email preview"
                >
                  {previewTab === 'daily' ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  {previewTab === 'daily' ? 'Hide' : 'Preview'}
                </button>
              </div>
            </div>

            <label className="block text-xs text-gray-700 font-bold mb-1.5">
              Assigned Daily Template:
            </label>
            
            {/* Dynamic Dropdown */}
            <div className="space-y-2">
              <BulkEmailTemplateSearchableSelect
                templates={bulkTemplates}
                selectedTemplateId={dailyTemplateId}
                onSelectTemplate={t => setDailyTemplateId(t.id)}
                onEditTemplate={handleOpenEditDaily}
                onCreateNewTemplate={() => handleOpenCreateAlternate('daily')}
                label="Selected Daily Template"
                typeBadge="Daily"
              />

              <div className="bg-white p-2.5 rounded-xl border border-gray-200/80 text-[11px] text-gray-600 space-y-1">
                <div className="font-semibold text-gray-800 truncate">
                  <span className="text-gray-400 font-normal mr-1">Subject:</span>
                  {selectedDaily.subjectTemplate}
                </div>
                <div className="text-gray-500 line-clamp-2 leading-relaxed">
                  <span className="text-gray-400 mr-1">Body:</span>
                  {selectedDaily.bodyTemplate}
                </div>
              </div>
            </div>
          </div>

          {/* Action Row for Daily: Edit & Select Alternate */}
          <div className="mt-4 pt-3 border-t border-gray-200/80 flex flex-wrap items-center justify-between gap-2">
            <span className="text-[11px] text-blue-700 font-semibold flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-blue-500" />
              Prior to 09:00 AM dispatch
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleOpenCreateAlternate('daily')}
                className="inline-flex items-center px-2.5 py-1.5 text-xs font-bold text-gray-700 bg-white hover:bg-slate-100 border border-gray-200 rounded-lg shadow-2xs transition"
                title="Create a new alternate template under Bulk Email module"
              >
                <Plus className="w-3.5 h-3.5 mr-1 text-gray-500" />
                + Alternate
              </button>
              <button
                type="button"
                onClick={handleOpenEditDaily}
                className="inline-flex items-center px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-2xs transition"
                title="Edit this Daily template content and placeholders"
              >
                <Edit3 className="w-3.5 h-3.5 mr-1" />
                Edit Template
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* --- INLINE TEMPLATE EDITOR MODAL / EXPANDABLE PANEL --- */}
      {editingTarget && (
        <div className="p-4 sm:p-5 bg-gradient-to-b from-indigo-50/50 to-white border-t border-indigo-100 animate-in fade-in duration-200">
          <div className="max-w-4xl mx-auto bg-white rounded-2xl border-2 border-indigo-200 shadow-md p-4 sm:p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-200">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-600 text-white rounded-xl">
                  <Edit3 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-gray-900">
                    {editingTarget === 'new' 
                      ? 'Create Alternate Bulk Email Template' 
                      : `Edit ${editingTarget === 'weekly' ? 'Weekly' : 'Daily'} Rentals Template`}
                  </h4>
                  <p className="text-[11px] text-gray-500">
                    Strictly stored in the Bulk Email module (category = 'Bulk Email') for Monday 09:00 AM auto-dispatch.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setEditingTarget(null)}
                className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Template Name */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Template Name:
              </label>
              <input
                type="text"
                value={editorForm.name}
                onChange={e => setEditorForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g. Weekly Rental Payment Reminder (Alternate)"
                className="w-full text-xs font-bold text-gray-800 bg-white border border-gray-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            {/* Subject Line Template */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-gray-700">
                  Subject Line Template:
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setActiveEditorField('subject');
                    subjectInputRef.current?.focus();
                  }}
                  className={`text-[10px] font-bold px-2 py-0.5 rounded transition ${
                    activeEditorField === 'subject' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-400 hover:text-gray-700'
                  }`}
                >
                  Active for placeholder insertion
                </button>
              </div>
              <input
                ref={subjectInputRef}
                type="text"
                value={editorForm.subjectTemplate}
                onFocus={() => setActiveEditorField('subject')}
                onChange={e => setEditorForm(prev => ({ ...prev, subjectTemplate: e.target.value }))}
                placeholder="e.g. Weekly Rental Statement Breakdown - {rental_id}"
                className="w-full text-xs font-mono font-bold text-gray-800 bg-white border border-gray-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            {/* Dynamic Placeholders Toolbar */}
            <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-100">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-bold text-indigo-900 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-indigo-600" />
                  Click to Insert Dynamic Placeholder into{' '}
                  <span className="underline uppercase tracking-wide">
                    {activeEditorField === 'subject' ? 'Subject' : 'Message Body'}
                  </span>
                  :
                </span>
                <span className="text-[10px] text-indigo-600 font-medium">
                  Auto-populated on Monday 09:00 AM dispatch
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {AVAILABLE_PLACEHOLDERS.map(item => (
                  <button
                    key={item.tag}
                    type="button"
                    onClick={() => handleInsertTag(item.tag)}
                    className="px-2 py-1 bg-white hover:bg-indigo-600 hover:text-white text-indigo-700 font-mono text-[10px] font-bold rounded-lg border border-indigo-200 shadow-2xs transition active:scale-95"
                    title={item.desc}
                  >
                    {item.tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Body Template */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-gray-700">
                  Message Body Template (Strict Text Only - No Attachments):
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setActiveEditorField('body');
                    bodyTextareaRef.current?.focus();
                  }}
                  className={`text-[10px] font-bold px-2 py-0.5 rounded transition ${
                    activeEditorField === 'body' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-400 hover:text-gray-700'
                  }`}
                >
                  Active for placeholder insertion
                </button>
              </div>
              <textarea
                ref={bodyTextareaRef}
                rows={9}
                value={editorForm.bodyTemplate}
                onFocus={() => setActiveEditorField('body')}
                onChange={e => setEditorForm(prev => ({ ...prev, bodyTemplate: e.target.value }))}
                placeholder="Enter email message body..."
                className="w-full text-xs font-mono text-gray-800 bg-white border border-gray-300 rounded-xl p-3 leading-relaxed focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            {/* Editor Footer Action Buttons */}
            <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-gray-200">
              <div className="text-[11px] text-gray-500 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Strict Rule 6: No PDF attachments will be attached to automated dispatches.</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditingTarget(null)}
                  className="px-4 py-2 text-xs font-bold text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-xl transition"
                >
                  Cancel
                </button>

                {editingTarget !== 'new' && (
                  <button
                    type="button"
                    onClick={() => handleSaveTemplateChanges(true)}
                    disabled={savingTemplate}
                    className="px-3.5 py-2 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition disabled:opacity-50"
                    title="Save this edited version as a new alternate template in Bulk Email"
                  >
                    Save as New Alternate
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleSaveTemplateChanges(false)}
                  disabled={savingTemplate}
                  className="inline-flex items-center px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition disabled:opacity-50"
                >
                  {savingTemplate ? (
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  ) : (
                    <Save className="w-3.5 h-3.5 mr-1.5" />
                  )}
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- LIVE RENDERED SAMPLE PREVIEW DRAWER --- */}
      {previewTab && (
        <div className="px-5 pb-5 pt-2 border-t border-gray-100 bg-slate-50/50 animate-in fade-in duration-150">
          <div className="p-4 bg-white rounded-2xl border border-gray-200 shadow-2xs">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-700">
                  Live Sample Rendered Output ({previewTab === 'weekly' ? 'Weekly Hire' : 'Daily Hire'}):
                </span>
                <span className="text-xs font-black text-indigo-700">
                  {previewTab === 'weekly' ? selectedWeekly.name : selectedDaily.name}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                  category = 'Bulk Email'
                </span>
              </div>
              <button
                type="button"
                onClick={() => setPreviewTab(null)}
                className="text-xs text-gray-400 hover:text-gray-700 font-bold"
              >
                Close Preview
              </button>
            </div>

            {(() => {
              const currentTpl = previewTab === 'weekly' ? selectedWeekly : selectedDaily;
              const rendered = renderSamplePreview(currentTpl, previewTab === 'weekly' ? 'Weekly' : 'Daily');
              return (
                <div className="space-y-2 text-xs">
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-gray-200 font-mono text-gray-900">
                    <span className="font-bold text-gray-500 font-sans mr-2">Subject:</span>
                    {rendered.subject}
                  </div>
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-gray-200 font-mono whitespace-pre-wrap text-gray-800 max-h-64 overflow-y-auto leading-relaxed text-[11px]">
                    {rendered.body}
                  </div>
                </div>
              );
            })()}

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[10px] text-gray-500 pt-2 border-t border-gray-100">
              <span className="text-gray-600">
                Sample preview shown with dummy customer data (John Smith, Reg: AB21 XYZ, Owing: £300.00).
              </span>
              <span className="text-indigo-600 font-bold">
                Mondays 09:00 AM Auto-Dispatch Ready
              </span>
            </div>
          </div>
        </div>
      )}

      {/* --- SYSTEM ENFORCEMENT FOOTER --- */}
      {!isCompact && (
        <div className="px-5 py-3 bg-gray-50/80 border-t border-gray-100 flex flex-wrap items-center justify-between gap-2 text-[11px] text-gray-600">
          <div className="flex flex-wrap items-center gap-3">
            <span className="flex items-center gap-1 text-emerald-700 font-bold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Targeting: Active Daily &amp; Weekly (owing &gt; £0)
            </span>
            <span className="flex items-center gap-1 text-amber-700 font-bold">
              <AlertCircle className="w-3.5 h-3.5" />
              Strict Claim/Claims Exclusion
            </span>
            <span className="flex items-center gap-1 text-slate-700 font-bold">
              <FileText className="w-3.5 h-3.5" />
              Strictly No Attachments
            </span>
          </div>

          <div className="text-gray-500 font-medium">
            Next Scheduled Run: <span className="font-bold text-gray-800">Monday at 09:00 AM</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default RentalReminderTemplateSelector;
