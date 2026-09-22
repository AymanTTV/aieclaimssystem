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
import {
  DAYS_OF_WEEK,
  SCHEDULE_TIME_OPTIONS,
  formatTime12h,
  generateCronExpression,
  getDayInfo,
  saveSchedulerPreferences,
  fetchSchedulerPreferences,
} from '../../utils/schedulerConfig';

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

  // Automated Schedule Settings
  const [scheduleDay, setScheduleDay] = useState<number>(1); // Default 1 = Monday
  const [scheduleTime, setScheduleTime] = useState<string>('09:00'); // Default 09:00

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

      // Load saved preferences from global config and scheduler preferences
      const sched = await fetchSchedulerPreferences();
      setScheduleDay(sched.scheduleDay);
      setScheduleTime(sched.scheduleTime);

      const configSnap = await getDoc(doc(db, 'system_settings', 'global_config'));
      if (configSnap.exists()) {
        const data = configSnap.data();
        if (data?.schedule_day !== undefined) {
          setScheduleDay(Number(data.schedule_day));
        }
        if (data?.schedule_time) {
          setScheduleTime(data.schedule_time);
        }
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

  const dayInfo = useMemo(() => getDayInfo(scheduleDay), [scheduleDay]);
  const formattedTime = useMemo(() => formatTime12h(scheduleTime), [scheduleTime]);
  const cronExpr = useMemo(() => generateCronExpression(scheduleDay, scheduleTime), [scheduleDay, scheduleTime]);

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

  // Save dropdown selections & automated schedule preferences
  const handleSavePreferences = async () => {
    setSavingPreferences(true);
    const toastId = toast.loading('Saving reminder templates and schedule preferences...');
    try {
      await saveSchedulerPreferences(scheduleDay, scheduleTime);
      await setDoc(
        doc(db, 'system_settings', 'global_config'),
        {
          weekly_rental_template_id: weeklyTemplateId,
          daily_rental_template_id: dailyTemplateId,
          schedule_day: scheduleDay,
          schedule_time: scheduleTime,
          schedule_cron: generateCronExpression(scheduleDay, scheduleTime),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      toast.success('Rental reminder templates and automated schedule saved successfully!', { id: toastId });
      onSaved?.();
    } catch (err) {
      console.error('Failed to save reminder template & schedule preferences:', err);
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
    <div className={`bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden text-gray-900 ${className}`}>
      {/* --- SCHEDULE DISPATCH HEADER BANNER --- */}
      <div className="p-4 sm:p-5 bg-gradient-to-r from-indigo-950 via-[#1a1c3d] to-slate-900 border-b border-white/10 flex flex-col gap-4">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-indigo-600/30 border border-indigo-400/30 text-indigo-300 rounded-xl shadow-xs mt-0.5 shrink-0">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm sm:text-base font-black text-white">
                  Automated Bulk Email Scheduler
                </h3>
                <span className="inline-flex items-center gap-1.5 text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                  <Clock className="w-3 h-3 text-indigo-400 animate-pulse" />
                  Cron: {cronExpr} ({dayInfo.plural} {formattedTime})
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  Category: Bulk Email
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 max-w-3xl leading-relaxed">
                Auto-dispatches payment reminders to active rentals with an outstanding balance (<span className="font-semibold text-white">owing &gt; £0</span>) every {dayInfo.shortName} at {formattedTime}. Edit or select alternate templates directly from the <span className="font-bold text-indigo-300">Bulk Email module</span> anytime prior to the scheduled {formattedTime} dispatch.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 self-start xl:self-center shrink-0">
            <button
              type="button"
              onClick={handleRunTestBatch}
              disabled={runningTestBatch}
              className="inline-flex items-center px-3.5 py-2 bg-white/10 hover:bg-white/15 text-indigo-300 hover:text-white text-xs font-bold rounded-xl border border-indigo-400/30 shadow-xs transition disabled:opacity-50 cursor-pointer"
              title="Execute test run of the reminder dispatch right now"
            >
              {runningTestBatch ? (
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin text-indigo-400" />
              ) : (
                <Play className="w-3.5 h-3.5 mr-1.5 text-indigo-400 fill-indigo-400" />
              )}
              Run Test Batch Now
            </button>
            <button
              type="button"
              onClick={handleSavePreferences}
              disabled={savingPreferences}
              className="inline-flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-md transition disabled:opacity-50 cursor-pointer"
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

        {/* --- INTERACTIVE SCHEDULE CONTROLS BAR (Displayed directly alongside Save Selections) --- */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 sm:p-3.5 bg-slate-50 border border-slate-200 rounded-2xl shadow-xs">
          <div className="flex flex-wrap items-center gap-3 sm:gap-4">
            {/* Day Selector Dropdown */}
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 shrink-0">
                <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                <span>Dispatch Day:</span>
              </label>
              <select
                value={scheduleDay}
                onChange={e => setScheduleDay(Number(e.target.value))}
                aria-label="Select automated dispatch day"
                className="px-3 py-1.5 bg-white border-[1.5px] border-[#CBD5E1] rounded-xl text-[#0F172A] text-xs sm:text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer shadow-xs"
              >
                {DAYS_OF_WEEK.map(d => (
                  <option key={d.value} value={d.value} className="bg-white text-[#0F172A] py-1">
                    {d.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Time Picker / Dropdown */}
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 shrink-0">
                <Clock className="w-3.5 h-3.5 text-indigo-600" />
                <span>Dispatch Time:</span>
              </label>
              <select
                value={scheduleTime}
                onChange={e => setScheduleTime(e.target.value)}
                aria-label="Select automated dispatch time"
                className="px-3 py-1.5 bg-white border-[1.5px] border-[#CBD5E1] rounded-xl text-[#0F172A] text-xs sm:text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer shadow-xs"
              >
                {!SCHEDULE_TIME_OPTIONS.some(o => o.value === scheduleTime) && (
                  <option value={scheduleTime} className="bg-white text-[#0F172A] font-bold">
                    {formattedTime} (Custom)
                  </option>
                )}
                {SCHEDULE_TIME_OPTIONS.map(t => (
                  <option key={t.value} value={t.value} className="bg-white text-[#0F172A] py-1">
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Live Computed Cron Badge */}
            <div className="flex items-center gap-1.5 text-xs text-slate-600 font-mono bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-indigo-600 font-bold">Active Cron:</span>
              <span className="text-indigo-600 font-bold">{cronExpr}</span>
              <span className="text-slate-500">({dayInfo.plural} at {formattedTime})</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-500 font-medium">
              Click <strong className="text-indigo-600">Save Selections</strong> above to apply changes.
            </span>
          </div>
        </div>
      </div>

      {/* --- DYNAMIC DROPDOWN SELECTION INTERFACE --- */}
      <div className="p-4 sm:p-5 grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* 1. WEEKLY RENTALS TEMPLATE SELECTOR */}
        <div className="bg-[#181938] rounded-2xl border border-white/10 p-4 sm:p-5 flex flex-col justify-between shadow-md">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 rounded-lg">
                  <Calendar className="w-4 h-4" />
                </span>
                <div>
                  <h4 className="text-xs font-black text-white uppercase tracking-wide">
                    Weekly Rentals Templates
                  </h4>
                  <span className="text-[10px] text-slate-400 font-medium">
                    Strictly sourced from Bulk Email module
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setPreviewTab(previewTab === 'weekly' ? null : 'weekly')}
                  className="text-xs font-bold text-indigo-300 hover:text-white bg-indigo-500/20 hover:bg-indigo-500/30 px-3 py-1.5 rounded-lg border border-indigo-400/30 shadow-xs flex items-center gap-1 transition cursor-pointer"
                  title="Toggle rendered email preview"
                >
                  {previewTab === 'weekly' ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  {previewTab === 'weekly' ? 'Hide' : 'Preview'}
                </button>
              </div>
            </div>

            <label className="block text-xs text-slate-200 font-bold mb-1.5">
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

              <div className="bg-[#0c0d1c] p-3 rounded-xl border border-white/10 text-xs text-slate-300 space-y-1.5">
                <div className="font-semibold text-white truncate">
                  <span className="text-indigo-300 font-normal mr-1.5">Subject:</span>
                  {selectedWeekly.subjectTemplate}
                </div>
                <div className="text-slate-400 line-clamp-2 leading-relaxed">
                  <span className="text-slate-400 font-normal mr-1.5">Body:</span>
                  {selectedWeekly.bodyTemplate}
                </div>
              </div>
            </div>
          </div>

          {/* Action Row for Weekly: Edit & Select Alternate */}
          <div className="mt-4 pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-2">
            <span className="text-[11px] text-indigo-300 font-semibold flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-indigo-400" />
              Prior to {formattedTime} dispatch ({dayInfo.shortName}s)
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleOpenCreateAlternate('weekly')}
                className="inline-flex items-center px-2.5 py-1.5 text-xs font-bold text-slate-200 hover:text-white bg-white/10 hover:bg-white/15 border border-white/15 rounded-lg shadow-xs transition cursor-pointer"
                title="Create a new alternate template under Bulk Email module"
              >
                <Plus className="w-3.5 h-3.5 mr-1 text-slate-400" />
                + Alternate
              </button>
              <button
                type="button"
                onClick={handleOpenEditWeekly}
                className="inline-flex items-center px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-xs transition cursor-pointer"
                title="Edit this Weekly template content and placeholders"
              >
                <Edit3 className="w-3.5 h-3.5 mr-1" />
                Edit Template
              </button>
            </div>
          </div>
        </div>

        {/* 2. DAILY RENTALS TEMPLATE SELECTOR */}
        <div className="bg-[#181938] rounded-2xl border border-white/10 p-4 sm:p-5 flex flex-col justify-between shadow-md">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-blue-500/20 text-blue-300 border border-blue-400/30 rounded-lg">
                  <Clock className="w-4 h-4" />
                </span>
                <div>
                  <h4 className="text-xs font-black text-white uppercase tracking-wide">
                    Daily Rentals Templates
                  </h4>
                  <span className="text-[10px] text-slate-400 font-medium">
                    Strictly sourced from Bulk Email module
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setPreviewTab(previewTab === 'daily' ? null : 'daily')}
                  className="text-xs font-bold text-blue-300 hover:text-white bg-blue-500/20 hover:bg-blue-500/30 px-3 py-1.5 rounded-lg border border-blue-400/30 shadow-xs flex items-center gap-1 transition cursor-pointer"
                  title="Toggle rendered email preview"
                >
                  {previewTab === 'daily' ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  {previewTab === 'daily' ? 'Hide' : 'Preview'}
                </button>
              </div>
            </div>

            <label className="block text-xs text-slate-200 font-bold mb-1.5">
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

              <div className="bg-[#0c0d1c] p-3 rounded-xl border border-white/10 text-xs text-slate-300 space-y-1.5">
                <div className="font-semibold text-white truncate">
                  <span className="text-blue-300 font-normal mr-1.5">Subject:</span>
                  {selectedDaily.subjectTemplate}
                </div>
                <div className="text-slate-400 line-clamp-2 leading-relaxed">
                  <span className="text-slate-400 font-normal mr-1.5">Body:</span>
                  {selectedDaily.bodyTemplate}
                </div>
              </div>
            </div>
          </div>

          {/* Action Row for Daily: Edit & Select Alternate */}
          <div className="mt-4 pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-2">
            <span className="text-[11px] text-blue-300 font-semibold flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-blue-400" />
              Prior to {formattedTime} dispatch ({dayInfo.shortName}s)
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleOpenCreateAlternate('daily')}
                className="inline-flex items-center px-2.5 py-1.5 text-xs font-bold text-slate-200 hover:text-white bg-white/10 hover:bg-white/15 border border-white/15 rounded-lg shadow-xs transition cursor-pointer"
                title="Create a new alternate template under Bulk Email module"
              >
                <Plus className="w-3.5 h-3.5 mr-1 text-slate-400" />
                + Alternate
              </button>
              <button
                type="button"
                onClick={handleOpenEditDaily}
                className="inline-flex items-center px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-lg shadow-xs transition cursor-pointer"
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
        <div className="p-4 sm:p-5 bg-[#14152c] border-t border-white/10 animate-in fade-in duration-200">
          <div className="max-w-4xl mx-auto bg-[#181938] rounded-2xl border border-indigo-500/30 shadow-2xl p-4 sm:p-6 space-y-4 text-white">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-600/30 border border-indigo-400/30 text-indigo-300 rounded-xl">
                  <Edit3 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-white">
                    {editingTarget === 'new' 
                      ? 'Create Alternate Bulk Email Template' 
                      : `Edit ${editingTarget === 'weekly' ? 'Weekly' : 'Daily'} Rentals Template`}
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Strictly stored in the Bulk Email module (category = &apos;Bulk Email&apos;) for {dayInfo.shortName} {formattedTime} auto-dispatch.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setEditingTarget(null)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Template Name */}
            <div>
              <label className="block text-xs font-bold text-slate-200 mb-1">
                Template Name:
              </label>
              <input
                type="text"
                value={editorForm.name}
                onChange={e => setEditorForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g. Weekly Rental Payment Reminder (Alternate)"
                className="w-full text-xs font-bold text-white bg-[#0c0d1c] border border-white/20 rounded-xl px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none placeholder-slate-400"
              />
            </div>

            {/* Subject Line Template */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-200">
                  Subject Line Template:
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setActiveEditorField('subject');
                    subjectInputRef.current?.focus();
                  }}
                  className={`text-[10px] font-bold px-2 py-0.5 rounded transition cursor-pointer ${
                    activeEditorField === 'subject' ? 'bg-indigo-500/30 text-indigo-300 border border-indigo-400/30' : 'text-slate-400 hover:text-slate-200'
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
                className="w-full text-xs font-mono font-bold text-white bg-[#0c0d1c] border border-white/20 rounded-xl px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none placeholder-slate-400"
              />
            </div>

            {/* Dynamic Placeholders Toolbar */}
            <div className="p-3 bg-indigo-950/40 rounded-xl border border-indigo-500/30">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-bold text-indigo-200 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-indigo-400" />
                  Click to Insert Dynamic Placeholder into{' '}
                  <span className="underline uppercase tracking-wide text-white">
                    {activeEditorField === 'subject' ? 'Subject' : 'Message Body'}
                  </span>
                  :
                </span>
                <span className="text-[10px] text-slate-400 font-medium">
                  Auto-populated on {dayInfo.shortName} {formattedTime} dispatch
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {AVAILABLE_PLACEHOLDERS.map(item => (
                  <button
                    key={item.tag}
                    type="button"
                    onClick={() => handleInsertTag(item.tag)}
                    className="px-2 py-1 bg-white/10 hover:bg-indigo-600 hover:text-white text-indigo-200 font-mono text-[10px] font-bold rounded-lg border border-indigo-400/30 transition cursor-pointer"
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
                <label className="text-xs font-bold text-slate-200">
                  Message Body Template (Strict Text Only - No Attachments):
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setActiveEditorField('body');
                    bodyTextareaRef.current?.focus();
                  }}
                  className={`text-[10px] font-bold px-2 py-0.5 rounded transition cursor-pointer ${
                    activeEditorField === 'body' ? 'bg-indigo-500/30 text-indigo-300 border border-indigo-400/30' : 'text-slate-400 hover:text-slate-200'
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
                className="w-full text-xs font-mono text-white bg-[#0c0d1c] border border-white/20 rounded-xl p-3 leading-relaxed focus:ring-2 focus:ring-indigo-500 focus:outline-none placeholder-slate-400"
              />
            </div>

            {/* Editor Footer Action Buttons */}
            <div className="pt-3 flex flex-wrap items-center justify-between gap-3 border-t border-white/10">
              <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Strict Rule: No PDF attachments will be attached to automated dispatches.</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditingTarget(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition cursor-pointer"
                >
                  Cancel
                </button>

                {editingTarget !== 'new' && (
                  <button
                    type="button"
                    onClick={() => handleSaveTemplateChanges(true)}
                    disabled={savingTemplate}
                    className="px-3.5 py-2 text-xs font-bold text-indigo-300 hover:text-white bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/30 rounded-xl transition disabled:opacity-50 cursor-pointer"
                    title="Save this edited version as a new alternate template in Bulk Email"
                  >
                    Save as New Alternate
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleSaveTemplateChanges(false)}
                  disabled={savingTemplate}
                  className="inline-flex items-center px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-md transition disabled:opacity-50 cursor-pointer"
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
        <div className="px-5 pb-5 pt-3 border-t border-slate-200 bg-slate-50 animate-in fade-in duration-150">
          <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-700">
                  Live Sample Rendered Output ({previewTab === 'weekly' ? 'Weekly Hire' : 'Daily Hire'}):
                </span>
                <span className="text-xs font-black text-indigo-700">
                  {previewTab === 'weekly' ? selectedWeekly.name : selectedDaily.name}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                  category = &apos;Bulk Email&apos;
                </span>
              </div>
              <button
                type="button"
                onClick={() => setPreviewTab(null)}
                className="text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 font-bold transition cursor-pointer"
              >
                Close Preview
              </button>
            </div>

            {(() => {
              const currentTpl = previewTab === 'weekly' ? selectedWeekly : selectedDaily;
              const rendered = renderSamplePreview(currentTpl, previewTab === 'weekly' ? 'Weekly' : 'Daily');
              return (
                <div className="space-y-3 text-xs">
                  {/* Subject Field Preview */}
                  <div 
                    className="p-3 rounded-xl border border-white/15 font-mono text-white text-xs shadow-inner flex items-center gap-2"
                    style={{ backgroundColor: '#090a18', color: '#ffffff' }}
                  >
                    <span className="font-bold text-indigo-300 font-sans shrink-0 uppercase tracking-wider text-[11px]">
                      Subject:
                    </span>
                    <span className="text-white font-semibold select-all" style={{ color: '#ffffff' }}>
                      {rendered.subject}
                    </span>
                  </div>

                  {/* Body Field Preview */}
                  <div 
                    className="p-4 rounded-xl border border-white/15 font-mono whitespace-pre-wrap text-slate-100 min-h-[220px] max-h-[500px] overflow-y-auto leading-relaxed text-xs shadow-inner select-all"
                    style={{ backgroundColor: '#090a18', color: '#f1f5f9' }}
                  >
                    {rendered.body}
                  </div>
                </div>
              );
            })()}

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-500 pt-2 border-t border-slate-200">
              <span className="text-slate-600">
                Sample preview shown with dummy customer data (John Smith, Reg: AB21 XYZ, Owing: £300.00).
              </span>
              <span className="text-emerald-700 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                {dayInfo.plural} {formattedTime} Auto-Dispatch Ready
              </span>
            </div>
          </div>
        </div>
      )}

      {/* --- SYSTEM ENFORCEMENT FOOTER --- */}
      {!isCompact && (
        <div className="px-5 py-3 bg-[#111224] border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
          <div className="flex flex-wrap items-center gap-3">
            <span className="flex items-center gap-1 text-emerald-400 font-bold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Targeting: Active Daily &amp; Weekly (owing &gt; £0)
            </span>
            <span className="flex items-center gap-1 text-amber-400 font-bold">
              <AlertCircle className="w-3.5 h-3.5" />
              Strict Claim/Claims Exclusion
            </span>
            <span className="flex items-center gap-1 text-slate-300 font-bold">
              <FileText className="w-3.5 h-3.5" />
              Strictly No Attachments
            </span>
          </div>

          <div className="text-slate-400 font-medium">
            Next Scheduled Run: <span className="font-bold text-white">{dayInfo.shortName} at {formattedTime}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default RentalReminderTemplateSelector;
