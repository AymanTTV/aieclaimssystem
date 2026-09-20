// src/pages/AutomationSettings.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { db } from '../lib/firebase';
import { collection, getDocs, doc, setDoc, writeBatch, deleteDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { Save, Tag, FileText, MessageSquare, Plus, Undo2, Redo2, ShieldAlert, Trash2, Mail, Play, Loader2, CheckCircle2, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { emailTemplates, EmailType } from '../constants/emailTemplates';
import { usePermissions } from '../hooks/usePermissions';
import { runMondayAutoEmailJob } from '../jobs/mondayAutoEmailJob';

// Valid tags based on BulkEmail and Whatsapp context builders
const AVAILABLE_TAGS: Record<string, string[]> = {
  global: ['[Recipient Name]', '[Customer Name]', '[Driver Name]', '[DD/MM/YYYY]'],
  vehicle: [
    '[Vehicle Reg]', '[Make & Model]', '[Year]', '[Mileage]', 
    '[Purchased Date]', '[Insurance Expiry]', '[MOT Expiry]', 
    '[Tax Expiry]', '[Last Maintenance]', '[Next Maintenance]'
  ],
  rental: [
    '[Start Date]', '[End Date]', '[Net Amount]', '[VAT Total]', '[Grand Total]', 
    '[Total Amount]', '[Amount Paid]', '[Paid]', '[Owing]', '[Outstanding Balance]', '[Subtotal]', 
    '[Return Charges]', '[Extra Charges]', '[Discount Amount]', '[Payment Details]',
    '[Latest Payment Amount]', '[Latest Payment Date]', '[Latest Payment Time]',
    '[Main Vehicle Reg]', '[Substitute Vehicle Regs]', '[Sub Reg]', '[Sub Start Date]', '[Sub Start Time]'
  ],
  finance: ['[Total Amount]', '[Amount Paid]', '[Outstanding Balance]', '[New Balance]', '[Amount Owed]', '[Due Date]', '[Reason]', '[Payment Details]'],
  maintenance: ['[Maintenance Type]', '[Date & Time]', '[Location]', '[Garage Name]', '[Additional Notes]', '[Part(s) Required]'],
  invoice: [
    '[Invoice Number]', '[Invoice Date]', '[Due Date]', '[Amount]', '[Paid Balance]',
    '[Net Amount]', '[VAT Total]', '[Grand Total]', '[Paid]', '[Owing]', '[Payment Details]',
    '[Latest Payment Amount]', '[Latest Payment Date]', '[Latest Payment Time]'
  ],
  claim: ['[Claim Reference]', '[Claim Type]', '[Client Name]', '[Client Registration]', '[TP Registration]', '[Description]'],
  'Bulk Email': ['[Rental Reference]', '[Client Name]', '[Vehicle Reg]', '[Rental Type]', '[Total Amount]', '[Amount Paid]', '[Outstanding Balance]', '[Due Date]'],
};

const CATEGORIES: EmailType[] = ['custom', 'rental', 'maintenance', 'invoice', 'claim', 'finance', 'Bulk Email'];

export default function AutomationSettings() {
  const { can } = usePermissions();
  const canUpdate = can('automation', 'update');
  const canDelete = can('automation', 'delete');
  const canCreate = can('automation', 'create');

  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<any[]>([]);
  const [activeCategory, setActiveCategory] = useState<EmailType>('custom');
  
  // Editor State
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  // Global Automated Weekly Email Scheduler State
  const [globalAutoEmailEnabled, setGlobalAutoEmailEnabled] = useState<boolean>(true);
  const [isUpdatingGlobalToggle, setIsUpdatingGlobalToggle] = useState<boolean>(false);
  const [isRunningMondayJob, setIsRunningMondayJob] = useState<boolean>(false);

  // Load global_auto_email_enabled setting
  useEffect(() => {
    const loadGlobalSetting = async () => {
      try {
        const snap = await getDoc(doc(db, 'system_settings', 'global_config'));
        if (snap.exists()) {
          const data = snap.data();
          if (data?.global_auto_email_enabled !== undefined) {
            setGlobalAutoEmailEnabled(data.global_auto_email_enabled !== false);
            return;
          }
        }
        const setSnap = await getDoc(doc(db, 'settings', 'automation'));
        if (setSnap.exists()) {
          const data = setSnap.data();
          if (data?.global_auto_email_enabled !== undefined) {
            setGlobalAutoEmailEnabled(data.global_auto_email_enabled !== false);
            return;
          }
        }
        const local = localStorage.getItem('global_auto_email_enabled');
        if (local !== null) {
          setGlobalAutoEmailEnabled(local !== 'false');
        }
      } catch (err) {
        const local = localStorage.getItem('global_auto_email_enabled');
        if (local !== null) {
          setGlobalAutoEmailEnabled(local !== 'false');
        }
      }
    };
    loadGlobalSetting();
  }, []);

  const handleToggleGlobalAutoEmail = async () => {
    if (isUpdatingGlobalToggle) return;
    const nextVal = !globalAutoEmailEnabled;
    setIsUpdatingGlobalToggle(true);

    try {
      setGlobalAutoEmailEnabled(nextVal);
      localStorage.setItem('global_auto_email_enabled', String(nextVal));

      try {
        await setDoc(doc(db, 'system_settings', 'global_config'), {
          global_auto_email_enabled: nextVal,
          updatedAt: serverTimestamp(),
        }, { merge: true });

        await setDoc(doc(db, 'settings', 'automation'), {
          global_auto_email_enabled: nextVal,
          updatedAt: serverTimestamp(),
        }, { merge: true });
      } catch (dbErr) {
        console.warn('Firestore write notice:', dbErr);
      }

      toast.success(
        nextVal
          ? 'Global Monday automated email scheduler enabled'
          : 'Global Monday automated email scheduler paused'
      );
    } catch (err) {
      console.error('Failed to update global auto-email setting:', err);
      toast.error('Failed to update global setting');
      setGlobalAutoEmailEnabled(!nextVal);
    } finally {
      setIsUpdatingGlobalToggle(false);
    }
  };

  const handleManualRunJob = async () => {
    setIsRunningMondayJob(true);
    const toastId = toast.loading('Running Monday Auto-Email test batch...');
    try {
      const res = await runMondayAutoEmailJob({ isTestRun: true });
      toast.success(res.message, { id: toastId, duration: 6000 });
    } catch (err: any) {
      console.error('Error running test batch:', err);
      toast.error(`Test batch error: ${err?.message || 'Failed to execute'}`, { id: toastId });
    } finally {
      setIsRunningMondayJob(false);
    }
  };

  // Field Tracking for Cursor Insertion
  const [activeField, setActiveField] = useState<'subjectTemplate' | 'bodyTemplate'>('bodyTemplate');
  const subjectRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  // Undo / Redo History Stack
  const [history, setHistory] = useState<any[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  // Evaluate the permission into a simple boolean first
  const canViewAutomation = can('automation', 'view');

  // Load templates from Firestore
  useEffect(() => {
    if (canViewAutomation) {
      fetchTemplates();
    } else {
      setLoading(false);
    }
  }, [canViewAutomation]);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'messageTemplates'));
      if (snap.empty) {
        await seedDatabase();
      } else {
        const fetched = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setTemplates(fetched);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast.error('Failed to load templates.');
    } finally {
      setLoading(false);
    }
  };

  const seedDatabase = async () => {
    if (!canCreate) {
      toast.error('Database empty, and you lack permissions to initialize default templates.');
      return;
    }

    toast.loading('Initializing database with default templates...');
    const batch = writeBatch(db);
    const seededTemplates: any[] = [];

    Object.entries(emailTemplates).forEach(([category, tpls]) => {
      tpls.forEach(tpl => {
        const docRef = doc(collection(db, 'messageTemplates'), tpl.id);
        const tplData = { ...tpl, category };
        batch.set(docRef, tplData);
        seededTemplates.push({ id: tpl.id, ...tplData });
      });
    });

    await batch.commit();
    setTemplates(seededTemplates);
    toast.dismiss();
    toast.success('Default templates loaded.');
  };

  const pushToHistory = useCallback((tpl: any) => {
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(tpl);
      if (newHistory.length > 50) newHistory.shift(); 
      setHistoryIndex(newHistory.length - 1);
      return newHistory;
    });
  }, [historyIndex]);

  const handleSelectTemplate = (tpl: any) => {
    setSelectedTemplateId(tpl.id);
    setEditingTemplate({ ...tpl });
    setHistory([{ ...tpl }]);
    setHistoryIndex(0);
  };

  const undo = useCallback(() => {
    if (historyIndex > 0 && canUpdate) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setEditingTemplate(history[newIndex]);
    }
  }, [history, historyIndex, canUpdate]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1 && canUpdate) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setEditingTemplate(history[newIndex]);
    }
  }, [history, historyIndex, canUpdate]);

  const handleEditorChange = (field: 'subjectTemplate' | 'bodyTemplate' | 'name', value: string) => {
    if (!canUpdate) return;
    const newTpl = { ...editingTemplate, [field]: value };
    setEditingTemplate(newTpl);

    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      pushToHistory(newTpl);
    }, 500);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!canUpdate) return;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      if (e.shiftKey) redo();
      else undo();
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
      e.preventDefault();
      redo();
    }
  };

  const handleCreateNew = () => {
    if (!canCreate) return;
    const newId = `${activeCategory}_custom_${Date.now()}`;
    const newTpl = {
      id: newId,
      category: activeCategory,
      name: 'New Custom Template',
      subjectTemplate: '',
      bodyTemplate: '',
      requiredFields: []
    };
    setTemplates(prev => [...prev, newTpl]);
    handleSelectTemplate(newTpl);
    setTimeout(() => subjectRef.current?.focus(), 100);
  };

  const handleSave = async () => {
    if (!editingTemplate || !canUpdate) return;
    setSaving(true);
    try {
      await setDoc(doc(db, 'messageTemplates', editingTemplate.id), editingTemplate, { merge: true });
      setTemplates(prev => prev.map(t => (t.id === editingTemplate.id ? editingTemplate : t)));
      toast.success('Template saved successfully!');
    } catch (error) {
      console.error(error);
      toast.error('Failed to save template.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editingTemplate || !canDelete) return;
    if (!window.confirm(`Are you sure you want to delete "${editingTemplate.name}"? This action cannot be undone.`)) return;

    setSaving(true);
    try {
      await deleteDoc(doc(db, 'messageTemplates', editingTemplate.id));
      setTemplates(prev => prev.filter(t => t.id !== editingTemplate.id));
      setSelectedTemplateId(null);
      setEditingTemplate(null);
      toast.success('Template deleted successfully!');
    } catch (error) {
      console.error(error);
      toast.error('Failed to delete template.');
    } finally {
      setSaving(false);
    }
  };

  const insertTagAtCursor = (tag: string) => {
    if (!editingTemplate || !canUpdate) return;
    const ref = activeField === 'subjectTemplate' ? subjectRef.current : bodyRef.current;
    if (ref) {
      const start = ref.selectionStart || 0;
      const end = ref.selectionEnd || 0;
      const text = editingTemplate[activeField];
      const newText = text.substring(0, start) + tag + text.substring(end);
      const newTpl = { ...editingTemplate, [activeField]: newText };
      setEditingTemplate(newTpl);
      pushToHistory(newTpl); 
      setTimeout(() => {
        ref.focus();
        ref.setSelectionRange(start + tag.length, start + tag.length);
      }, 0);
    }
  };

  const activeTemplates = templates.filter(t => t.category === activeCategory);

  if (loading) return <div className="p-8 text-center text-gray-500">Loading Template Manager...</div>;

  if (!canViewAutomation) {
    return (
      <div className="max-w-7xl mx-auto flex flex-col items-center justify-center p-12 bg-white rounded-xl shadow-sm border border-gray-100 mt-10">
        <ShieldAlert className="w-16 h-16 text-red-400 mb-4" />
        <h2 className="text-2xl font-bold text-gray-900">Access Denied</h2>
        <p className="text-gray-500 mt-2 text-center max-w-md">
          You do not have the required permissions to view or edit the Automation Templates. Please contact your system administrator if you believe this is an error.
        </p>
      </div>
    );
  }

  const getTagClass = (colorClass: string) => {
    if (!canUpdate) return "text-xs px-2 py-1 bg-gray-50 text-gray-400 rounded border border-gray-200 cursor-not-allowed opacity-75";
    return `text-xs px-2 py-1 rounded border transition cursor-grab active:cursor-grabbing ${colorClass}`;
  };

  return (
    <div className="max-w-7xl mx-auto pb-20 space-y-6" onKeyDown={handleKeyDown}>
      <div className="flex items-center gap-3 mb-6">
        <div className="bg-blue-100 p-3 rounded-lg">
          <MessageSquare className="w-8 h-8 text-blue-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Message Template Manager</h1>
          <p className="text-sm text-gray-500">Edit templates, drag-and-drop tags, and manage communications.</p>
        </div>
      </div>

      {/* --- AUTOMATION CONTROL: GLOBAL SCHEDULED EMAIL SYSTEM --- */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className={`p-3.5 rounded-2xl ${globalAutoEmailEnabled ? 'bg-indigo-50 text-indigo-600' : 'bg-gray-100 text-gray-400'}`}>
              <Mail className="w-7 h-7" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h2 className="text-lg font-black text-gray-900">
                  Automated Weekly Bulk Email Scheduler
                </h2>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                  globalAutoEmailEnabled 
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                    : 'bg-gray-100 text-gray-600 border-gray-200'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${globalAutoEmailEnabled ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`} />
                  {globalAutoEmailEnabled ? 'Schedule Active' : 'Schedule Paused'}
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                  <Clock className="w-3 h-3" /> 0 9 * * 1 (Every Monday at 09:00 AM)
                </span>
              </div>
              <p className="text-xs text-gray-600 max-w-3xl leading-relaxed">
                Automatically scans active rental contracts, targets accounts with an outstanding balance (<span className="font-semibold text-gray-800">owing &gt; £0</span>), dynamically replaces placeholders from the active Rental Bulk Email template, and delivers weekly statement reminders without attachments. Excludes Claims.
              </p>
            </div>
          </div>

          {/* Toggle Switch & Actions */}
          <div className="flex items-center gap-4 shrink-0 self-start md:self-center">
            <button
              onClick={handleManualRunJob}
              disabled={isRunningMondayJob}
              className="flex items-center px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl border border-indigo-200 transition disabled:opacity-50"
              title="Trigger manual run of the full filtering logic and send emails to eligible active non-claim rentals immediately"
            >
              {isRunningMondayJob ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin text-indigo-600" />
              ) : (
                <Play className="w-4 h-4 mr-2 text-indigo-600 fill-indigo-600" />
              )}
              Run Test Email Batch
            </button>

            <div className="flex items-center gap-3 pl-4 border-l border-gray-200">
              <span className="text-xs font-bold text-gray-700">
                {globalAutoEmailEnabled ? 'Enabled' : 'Disabled'}
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={globalAutoEmailEnabled}
                disabled={isUpdatingGlobalToggle}
                onClick={handleToggleGlobalAutoEmail}
                className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                  globalAutoEmailEnabled ? 'bg-indigo-600' : 'bg-gray-300'
                } ${isUpdatingGlobalToggle ? 'opacity-60 cursor-not-allowed' : ''}`}
              >
                <span className="sr-only">Toggle Global Monday Auto-Email</span>
                <span
                  aria-hidden="true"
                  className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out flex items-center justify-center ${
                    globalAutoEmailEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                >
                  {isUpdatingGlobalToggle ? (
                    <Loader2 className="w-3 h-3 text-gray-400 animate-spin" />
                  ) : null}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Column: Categories & Template List */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
             <div className="p-3 bg-gray-50 border-b border-gray-200 font-semibold text-gray-700">Categories</div>
             <div className="flex flex-col">
               {CATEGORIES.map(cat => (
                 <button
                   key={cat}
                   onClick={() => {
                     setActiveCategory(cat);
                     setSelectedTemplateId(null);
                     setEditingTemplate(null);
                   }}
                   className={`text-left px-4 py-3 text-sm font-medium transition-colors ${
                     activeCategory === cat ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-600' : 'text-gray-600 hover:bg-gray-50 border-l-4 border-transparent'
                   }`}
                 >
                   {cat.charAt(0).toUpperCase() + cat.slice(1)}
                 </button>
               ))}
             </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col max-h-[500px]">
             <div className="p-3 bg-gray-50 border-b border-gray-200 font-semibold text-gray-700 flex justify-between items-center">
               <span>Templates</span>
             </div>
             <div className="overflow-y-auto flex-1 p-2 space-y-1">
                {activeTemplates.length === 0 && <p className="text-xs text-gray-500 p-2">No templates found.</p>}
                {activeTemplates.map(tpl => (
                  <button
                    key={tpl.id}
                    onClick={() => handleSelectTemplate(tpl)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                      selectedTemplateId === tpl.id ? 'bg-blue-600 text-white' : 'hover:bg-gray-100 text-gray-700'
                    }`}
                  >
                    {tpl.name}
                  </button>
                ))}
             </div>
             
             {canCreate && (
               <div className="p-3 border-t border-gray-200 bg-gray-50">
                 <button onClick={handleCreateNew} className="w-full flex items-center justify-center gap-2 bg-white border border-gray-300 text-gray-700 py-2 rounded-lg text-sm hover:bg-gray-100 transition">
                   <Plus className="w-4 h-4" /> New Template
                 </button>
               </div>
             )}
          </div>
        </div>

        {/* Middle Column: Editor */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col h-[750px]">
          {editingTemplate ? (
            <>
              <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                <h2 className="font-bold text-gray-800 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-gray-500" />
                  Editing: {editingTemplate.name}
                </h2>
                
                <div className="flex items-center gap-2">
                  <div className="flex items-center bg-white border border-gray-300 rounded-lg overflow-hidden mr-2">
                    <button onClick={undo} disabled={historyIndex <= 0 || !canUpdate} className="p-2 text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent transition">
                      <Undo2 className="w-4 h-4" />
                    </button>
                    <div className="w-px h-5 bg-gray-300"></div>
                    <button onClick={redo} disabled={historyIndex >= history.length - 1 || !canUpdate} className="p-2 text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent transition">
                      <Redo2 className="w-4 h-4" />
                    </button>
                  </div>

                  {canDelete && (
                    <button onClick={handleDelete} disabled={saving} className="p-2 text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 rounded-lg transition">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}

                  <button onClick={handleSave} disabled={saving || !canUpdate} className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition ${canUpdate ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}>
                    <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Template'}
                  </button>
                </div>
              </div>
              <div className="p-6 flex-1 overflow-y-auto space-y-6">
                 {!canUpdate && (
                   <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-md text-sm mb-4">
                     You are viewing this template in <strong>Read-Only</strong> mode. You do not have permission to make changes.
                   </div>
                 )}

                 <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Template Name (Internal)</label>
                    <input type="text" className="w-full border-gray-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500" value={editingTemplate.name} onChange={e => handleEditorChange('name', e.target.value)} disabled={!canUpdate}/>
                 </div>
                 <div>
                    <label className="flex justify-between text-sm font-semibold text-gray-700 mb-1">Subject Line</label>
                    <input ref={subjectRef} type="text" onFocus={() => setActiveField('subjectTemplate')} className="w-full border-gray-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500" value={editingTemplate.subjectTemplate} onChange={e => handleEditorChange('subjectTemplate', e.target.value)} disabled={!canUpdate}/>
                 </div>
                 <div className="flex-1 flex flex-col h-full">
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Message Body</label>
                    <textarea ref={bodyRef} onFocus={() => setActiveField('bodyTemplate')} className="w-full flex-1 border-gray-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500 font-mono text-sm leading-relaxed min-h-[350px] disabled:bg-gray-50 disabled:text-gray-500" value={editingTemplate.bodyTemplate} onChange={e => handleEditorChange('bodyTemplate', e.target.value)} disabled={!canUpdate}/>
                 </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
               <MessageSquare className="w-16 h-16 mb-4 text-gray-200" />
               <p>Select a template from the list to edit or create a new one.</p>
            </div>
          )}
        </div>

        {/* Right Column: Tags Reference */}
        <div className="lg:col-span-1 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden h-[750px] flex flex-col">
           <div className="p-4 bg-gray-50 border-b border-gray-200 font-semibold text-gray-700 flex items-center gap-2">
             <Tag className="w-4 h-4" /> Available Tags
           </div>
           <div className="p-4 overflow-y-auto space-y-6">
             {canUpdate ? (
               <p className="text-xs text-gray-500 leading-relaxed">
                 <strong>Click</strong> a tag to insert it at your cursor, or <strong>drag and drop</strong> it directly into the text boxes.
               </p>
             ) : (
               <p className="text-xs text-gray-400 italic">Tag insertion is disabled in Read-Only mode.</p>
             )}
             
             {/* Global Tags */}
             <div>
               <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Global</h3>
               <div className="flex flex-wrap gap-2">
                 {AVAILABLE_TAGS.global.map(tag => (
                   <button key={tag} draggable={canUpdate} onDragStart={(e) => canUpdate && e.dataTransfer.setData('text/plain', tag)} onClick={() => insertTagAtCursor(tag)} className={getTagClass("bg-blue-50 text-blue-700 border-blue-100 hover:bg-blue-100")} disabled={!canUpdate}>{tag}</button>
                 ))}
               </div>
             </div>

             {/* Vehicle Tags */}
             <div>
               <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Vehicle</h3>
               <div className="flex flex-wrap gap-2">
                 {AVAILABLE_TAGS.vehicle.map(tag => (
                   <button key={tag} draggable={canUpdate} onDragStart={(e) => canUpdate && e.dataTransfer.setData('text/plain', tag)} onClick={() => insertTagAtCursor(tag)} className={getTagClass("bg-green-50 text-green-700 border-green-100 hover:bg-green-100")} disabled={!canUpdate}>{tag}</button>
                 ))}
               </div>
             </div>

             {/* Contextual Tags */}
             {(activeCategory === 'rental' || activeCategory === 'finance') && (
                <div>
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Financial / Rental</h3>
                  <div className="flex flex-wrap gap-2">
                    {AVAILABLE_TAGS[activeCategory].map(tag => (
                      <button key={tag} draggable={canUpdate} onDragStart={(e) => canUpdate && e.dataTransfer.setData('text/plain', tag)} onClick={() => insertTagAtCursor(tag)} className={getTagClass("bg-purple-50 text-purple-700 border-purple-100 hover:bg-purple-100")} disabled={!canUpdate}>{tag}</button>
                    ))}
                  </div>
                </div>
             )}

             {activeCategory === 'maintenance' && (
                <div>
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Maintenance</h3>
                  <div className="flex flex-wrap gap-2">
                    {AVAILABLE_TAGS.maintenance.map(tag => (
                      <button key={tag} draggable={canUpdate} onDragStart={(e) => canUpdate && e.dataTransfer.setData('text/plain', tag)} onClick={() => insertTagAtCursor(tag)} className={getTagClass("bg-orange-50 text-orange-700 border-orange-100 hover:bg-orange-100")} disabled={!canUpdate}>{tag}</button>
                    ))}
                  </div>
                </div>
             )}

             {activeCategory === 'invoice' && (
                <div>
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Invoice</h3>
                  <div className="flex flex-wrap gap-2">
                    {AVAILABLE_TAGS.invoice.map(tag => (
                      <button key={tag} draggable={canUpdate} onDragStart={(e) => canUpdate && e.dataTransfer.setData('text/plain', tag)} onClick={() => insertTagAtCursor(tag)} className={getTagClass("bg-indigo-50 text-indigo-700 border-indigo-100 hover:bg-indigo-100")} disabled={!canUpdate}>{tag}</button>
                    ))}
                  </div>
                </div>
             )}

             {activeCategory === 'claim' && (
                <div>
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Claims</h3>
                  <div className="flex flex-wrap gap-2">
                    {AVAILABLE_TAGS.claim.map(tag => (
                      <button key={tag} draggable={canUpdate} onDragStart={(e) => canUpdate && e.dataTransfer.setData('text/plain', tag)} onClick={() => insertTagAtCursor(tag)} className={getTagClass("bg-red-50 text-red-700 border-red-100 hover:bg-red-100")} disabled={!canUpdate}>{tag}</button>
                    ))}
                  </div>
                </div>
             )}

           </div>
        </div>
      </div>
    </div>
  );
}