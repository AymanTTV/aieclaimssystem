// src/components/company/ContextualTermsDrawer.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  DynamicTermTemplate,
  DocumentScope,
  AgreementHireType,
  TargetPagePosition,
  RecordStatusTrigger,
  DEFAULT_DYNAMIC_TERMS_TEMPLATES,
  SCOPE_PAGE_OPTIONS,
  SCOPE_SUB_DOCUMENTS,
} from '../../utils/documentTemplateTerms';
import {
  fetchLatestDynamicTermTemplates,
  saveOrUpdateTermTemplate,
} from '../../utils/dynamicTermsService';
import toast from 'react-hot-toast';
import {
  X,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  FileText,
  Plus,
  Save,
  Clock,
  History,
  Sparkles,
  Link as LinkIcon,
  Copy,
  ChevronRight,
  RotateCcw,
  Sliders,
  Search,
  AlertCircle,
  FileCheck,
  Eye,
  Loader2,
} from 'lucide-react';

export interface ContextualTermsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  documentType?: string;
  documentTitle?: string;
  moduleScope?: DocumentScope;
  specificDocType?: string;
  hireType?: AgreementHireType;
  targetPagePosition?: TargetPagePosition;
  statusTrigger?: RecordStatusTrigger;
  existingTemplates?: DynamicTermTemplate[];
  onTemplateSaved?: (
    savedTemplate: DynamicTermTemplate,
    allTemplates: DynamicTermTemplate[]
  ) => void;
  onSelectExistingTemplate?: (template: DynamicTermTemplate) => void;
}

const SCOPE_LABELS: Record<DocumentScope, { label: string; icon: string }> = {
  all: { label: 'All Modules (Global Default)', icon: '🌐' },
  rental: { label: 'Rental Page (Rental Docs & Agreements)', icon: '🚗' },
  claims: { label: 'Claims Page (Claims Docs, Mitigation & Credit Storage)', icon: '⚖️' },
  vehicle: { label: 'Vehicle Page (Fleet & Vehicle Docs)', icon: '📋' },
  maintenance: { label: 'Maintenance Page (Maintenance Dockets & Workshop Docs)', icon: '🔧' },
  invoice: { label: 'Invoice Page (Invoice Docs & Billing)', icon: '🧾' },
  vd_invoice: { label: 'VD Invoice Page (Vehicle Owner Invoice Docs)', icon: '💼' },
  finance: { label: 'Finance Page (Finance Agreements & Statements)', icon: '📊' },
  vd_finance: { label: 'VD Finance Page (Vehicle Owner Finance Docs)', icon: '📈' },
  members: { label: 'Members Page (Member Agreements & Profile Docs)', icon: '👥' },
};

const HIRE_TYPE_LABELS: Record<AgreementHireType, string> = {
  weekly: 'Weekly Hire',
  daily: 'Daily Hire',
  claim: 'Credit Hire / Claim',
  commercial_invoice: 'Commercial Invoice',
  all: 'All Record Types',
};

const POSITION_LABELS: Record<TargetPagePosition, string> = {
  page_3_terms: 'Page 3 Terms (Dedicated T&C Clauses)',
  page_2_inspection: 'Page 2 Inspection (Vehicle Condition)',
  trailing_before_signatures: 'Trailing Page (Before Signatures)',
  custom_page: 'Custom Page Number',
};

const QUICK_CLAUSES: { title: string; text: string }[] = [
  {
    title: 'Net-30 Settlement',
    text: 'SETTLEMENT TERMS: Strictly 30 days from date of invoice. Late payments accrue interest at 8% per annum above the Bank of England Base Rate under the Late Payment of Commercial Debts (Interest) Act 1998.',
  },
  {
    title: 'Road Traffic Compliance',
    text: 'ROAD TRAFFIC & STATUTORY COMPLIANCE: The hirer covenants to operate the vehicle strictly in accordance with the Road Traffic Act 1988 and all statutory regulations in force across the United Kingdom.',
  },
  {
    title: 'Vehicle Return & Condition',
    text: 'VEHICLE INSPECTION & RETURN: The hirer agrees to return the vehicle with identical fuel levels and in roadworthy condition. Any unrecorded damages will be invoiced at authorized repairer tariff rates.',
  },
  {
    title: 'GTA Credit Hire Protocol',
    text: 'CREDIT HIRE GTA COVENANTS: Hire rates are strictly determined under the General Terms of Agreement (GTA). Hirer confirms reasonable need for replacement mobility following the non-fault accident incident.',
  },
  {
    title: 'Governing Law',
    text: 'GOVERNING JURISDICTION: This agreement and any dispute or claim arising out of it shall be governed by and construed in accordance with the laws of England and Wales.',
  },
];

export const ContextualTermsDrawer: React.FC<ContextualTermsDrawerProps> = ({
  isOpen,
  onClose,
  documentType = 'document',
  documentTitle = 'Current Document',
  moduleScope = 'rental',
  specificDocType = 'all_page_docs',
  hireType = 'all',
  targetPagePosition = 'page_3_terms',
  statusTrigger = 'any',
  existingTemplates,
  onTemplateSaved,
  onSelectExistingTemplate,
}) => {
  const { user } = useAuth();

  // Manager-only authorization check
  const isManager = useMemo(() => {
    const role = (user?.role || '').toLowerCase();
    const hasOverride =
      user?.allowDocumentOverrides === true ||
      user?.allow_document_overrides === true ||
      user?.permissions?.allowDocumentOverrides === true;
    return role === 'manager' || role === 'superadmin' || hasOverride;
  }, [user]);

  // Safe scalar string normalizer for select elements
  const toScalarString = (v: any, fallback: string = ''): string => {
    if (v === null || v === undefined) return fallback;
    if (Array.isArray(v)) {
      return v.length > 0 && typeof v[0] === 'string' ? v[0] : fallback;
    }
    if (typeof v === 'string') return v;
    if (typeof v === 'number' || typeof v === 'boolean') return String(v);
    return fallback;
  };

  const initialScope = toScalarString(moduleScope, 'rental') as DocumentScope;
  const initialSpecificDoc = toScalarString(specificDocType, 'all_page_docs');
  const initialHire = toScalarString(hireType, 'all') as AgreementHireType;
  const initialPos = toScalarString(targetPagePosition, 'page_3_terms') as TargetPagePosition;
  const initialTrig = toScalarString(statusTrigger, 'any') as RecordStatusTrigger;

  // Active Tab
  const [activeTab, setActiveTab] = useState<'create' | 'link' | 'history'>('create');

  // Templates list
  const [templates, setTemplates] = useState<DynamicTermTemplate[]>(() => {
    return Array.isArray(existingTemplates) && existingTemplates.length > 0
      ? existingTemplates
      : DEFAULT_DYNAMIC_TERMS_TEMPLATES;
  });

  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form State (New or Edited Template)
  const [templateName, setTemplateName] = useState('');
  const [templateTitle, setTemplateTitle] = useState('');
  const [formScope, setFormScope] = useState<DocumentScope>(initialScope);
  const [formSpecificDocType, setFormSpecificDocType] = useState<string>(initialSpecificDoc);
  const [formHireType, setFormHireType] = useState<AgreementHireType>(initialHire);
  const [formPosition, setFormPosition] = useState<TargetPagePosition>(initialPos);
  const [formTrigger, setFormTrigger] = useState<RecordStatusTrigger>(initialTrig);
  const [contentClauses, setContentClauses] = useState('');
  const [revisionNote, setRevisionNote] = useState('');
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);

  // Search & Link State
  const [searchFilter, setSearchFilter] = useState('');
  const [onlyMatchingScope, setOnlyMatchingScope] = useState(true);
  const [selectedTemplateForLink, setSelectedTemplateForLink] = useState<DynamicTermTemplate | null>(null);

  // Fetch or refresh templates when drawer opens
  useEffect(() => {
    if (isOpen) {
      const cleanScope = toScalarString(moduleScope, 'rental');
      const cleanHire = toScalarString(hireType, 'all');

      setIsLoadingTemplates(true);
      fetchLatestDynamicTermTemplates()
        .then((fetched) => {
          setTemplates(fetched);
          // Set initial template for link if matching
          const matched = fetched.find(
            (t) =>
              t.isActive &&
              (t.documentScope === cleanScope || t.documentScope === 'all') &&
              (t.hireType === cleanHire || t.hireType === 'all')
          );
          if (matched) setSelectedTemplateForLink(matched);
        })
        .finally(() => setIsLoadingTemplates(false));
    }
  }, [isOpen, moduleScope, hireType]);

  // Reset form when drawer opens or context changes
  useEffect(() => {
    if (isOpen) {
      const cleanScope = toScalarString(moduleScope, 'rental') as DocumentScope;
      const cleanSpecificDoc = toScalarString(specificDocType, 'all_page_docs');
      const cleanHire = toScalarString(hireType, 'all') as AgreementHireType;
      const cleanPosition = toScalarString(targetPagePosition, 'page_3_terms') as TargetPagePosition;
      const cleanTrigger = toScalarString(statusTrigger, 'any') as RecordStatusTrigger;

      setFormScope(cleanScope);
      setFormSpecificDocType(cleanSpecificDoc);
      setFormHireType(cleanHire);
      setFormPosition(cleanPosition);
      setFormTrigger(cleanTrigger);
      setEditingTemplateId(null);

      const cleanDocTitle = (documentTitle || 'Document').replace(/live preview/i, '').trim();
      const defaultName = `${cleanDocTitle} Terms (${HIRE_TYPE_LABELS[cleanHire] || 'Standard'})`;
      const defaultTitle = `${cleanDocTitle.toUpperCase()} TERMS AND CONDITIONS`;

      setTemplateName(defaultName);
      setTemplateTitle(defaultTitle);
      setContentClauses(
        `1. STATUTORY COVENANTS: Standard terms and statutory conditions apply to this ${cleanDocTitle}.\n2. COMPLIANCE: All operations must comply with regulatory authorities and applicable statutory acts.\n3. SETTLEMENT: Payment terms and contractual covenants must be satisfied according to agreed schedules.`
      );
      setRevisionNote(`Created from ${cleanDocTitle} contextual editor`);
    }
  }, [isOpen, moduleScope, specificDocType, hireType, targetPagePosition, statusTrigger, documentTitle]);

  // Filter templates for linking
  const filteredTemplates = useMemo(() => {
    return templates.filter((t) => {
      if (onlyMatchingScope) {
        if (t.documentScope !== 'all' && t.documentScope !== moduleScope) {
          return false;
        }
      }
      if (searchFilter.trim()) {
        const q = searchFilter.toLowerCase();
        const matchesName = t.name.toLowerCase().includes(q);
        const matchesTitle = t.title.toLowerCase().includes(q);
        const matchesContent = t.content.toLowerCase().includes(q);
        if (!matchesName && !matchesTitle && !matchesContent) return false;
      }
      return true;
    });
  }, [templates, onlyMatchingScope, moduleScope, searchFilter]);

  // Append a quick clause
  const handleInsertClause = (clauseText: string) => {
    if (!isManager) {
      toast.error('T&C configurations managed by Company Managers');
      return;
    }
    setContentClauses((prev) => {
      const trimmed = prev.trim();
      return trimmed ? `${trimmed}\n\n${clauseText}` : clauseText;
    });
    toast.success('Clause inserted');
  };

  // Populate form with an existing template for editing or customizing
  const handleLoadForEdit = (tmpl: DynamicTermTemplate, asClone: boolean = false) => {
    if (!isManager) {
      toast.error('T&C configurations managed by Company Managers');
      return;
    }
    if (asClone) {
      setEditingTemplateId(null);
      setTemplateName(`${tmpl.name} (Customized for ${documentTitle})`);
      setTemplateTitle(tmpl.title);
      setFormScope(moduleScope);
      setFormSpecificDocType(specificDocType || tmpl.specificDocType || 'all_page_docs');
      setFormHireType(hireType);
      setFormPosition(targetPagePosition);
      setFormTrigger(statusTrigger);
      setContentClauses(tmpl.content);
      setRevisionNote(`Customized from "${tmpl.name}"`);
    } else {
      setEditingTemplateId(tmpl.id);
      setTemplateName(tmpl.name);
      setTemplateTitle(tmpl.title);
      setFormScope(tmpl.documentScope);
      setFormSpecificDocType(tmpl.specificDocType || 'all_page_docs');
      setFormHireType(tmpl.hireType);
      setFormPosition(tmpl.targetPagePosition);
      setFormTrigger(tmpl.statusTrigger);
      setContentClauses(tmpl.content);
      setRevisionNote('');
    }
    setActiveTab('create');
  };

  // Save new or modified template
  const handleSaveAndApply = async () => {
    if (!isManager) {
      toast.error('T&C configurations managed by Company Managers');
      return;
    }
    if (!templateName.trim()) {
      toast.error('Template Name is required');
      return;
    }
    if (!templateTitle.trim()) {
      toast.error('Legal Document Title is required');
      return;
    }
    if (!contentClauses.trim()) {
      toast.error('T&C content clauses are required');
      return;
    }

    setIsSaving(true);
    try {
      const templateToSave: Partial<DynamicTermTemplate> & {
        name: string;
        title: string;
        content: string;
      } = {
        id: editingTemplateId || `dtmpl_custom_${Date.now()}`,
        name: templateName,
        title: templateTitle,
        documentScope: formScope,
        specificDocType: formSpecificDocType || 'all_page_docs',
        hireType: formHireType,
        targetPagePosition: formPosition,
        statusTrigger: formTrigger,
        content: contentClauses,
        isActive: true,
        priority: 15,
        category: 'Contextual Terms',
      };

      const { updatedTemplates, savedTemplate } = await saveOrUpdateTermTemplate(
        templateToSave,
        revisionNote,
        user
      );

      setTemplates(updatedTemplates);
      setSelectedTemplateForLink(savedTemplate);

      // Invoke callback for instant live refresh on the active page / modal
      if (onTemplateSaved) {
        onTemplateSaved(savedTemplate, updatedTemplates);
      }
      if (onSelectExistingTemplate) {
        onSelectExistingTemplate(savedTemplate);
      }

      toast.success(`T&C Template "${savedTemplate.name}" saved & applied to ${documentTitle}!`);
      onClose();
    } catch (err: any) {
      console.error('[ContextualTermsDrawer] Save failed:', err);
      toast.error(`Save failed: ${err?.message || 'Database error'}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Link selected existing template to current document
  const handleLinkExisting = async (tmpl: DynamicTermTemplate) => {
    if (!isManager) {
      toast.error('T&C configurations managed by Company Managers');
      return;
    }

    setIsSaving(true);
    try {
      // If the template needs scope/page binding, update it
      let targetToSave = tmpl;
      if (tmpl.documentScope !== moduleScope && tmpl.documentScope !== 'all') {
        targetToSave = {
          ...tmpl,
          documentScope: moduleScope,
          hireType: tmpl.hireType === 'all' ? hireType : tmpl.hireType,
          targetPagePosition: targetPagePosition,
        };
      }

      const { updatedTemplates, savedTemplate } = await saveOrUpdateTermTemplate(
        targetToSave,
        `Linked directly to ${documentTitle} (${moduleScope})`,
        user
      );

      setTemplates(updatedTemplates);
      if (onTemplateSaved) {
        onTemplateSaved(savedTemplate, updatedTemplates);
      }
      if (onSelectExistingTemplate) {
        onSelectExistingTemplate(savedTemplate);
      }

      toast.success(`Linked "${tmpl.name}" to ${documentTitle}!`);
      onClose();
    } catch (err: any) {
      toast.error(`Linking failed: ${err?.message || 'Error'}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Slide-over Drawer Panel */}
      <aside
        aria-label="Document Terms and Conditions Manager"
        className="relative w-full max-w-2xl bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-300 h-full overflow-hidden"
      >
        {/* ── HEADER ── */}
        <div className="px-6 py-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between gap-4 flex-shrink-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                <FileCheck className="w-5 h-5" />
              </span>
              <div>
                <h2 className="text-base font-bold text-white truncate flex items-center gap-2">
                  <span>Manage T&amp;Cs for This Document</span>
                  {isManager ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded-full">
                      <ShieldCheck className="w-3 h-3" />
                      Manager Authorized
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-400 bg-amber-950/60 border border-amber-800/60 px-2 py-0.5 rounded-full">
                      <ShieldAlert className="w-3 h-3" />
                      Read-Only
                    </span>
                  )}
                </h2>
                <p className="text-xs text-slate-400 truncate">
                  Active Document:{' '}
                  <span className="text-slate-200 font-medium">{documentTitle}</span>
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            title="Close Drawer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── CONTEXT BADGES BAR ── */}
        <div className="px-6 py-2.5 bg-slate-950 border-b border-slate-800 flex items-center flex-wrap gap-2 text-xs flex-shrink-0">
          <span className="text-slate-400 font-medium">Pre-Filled Context:</span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-indigo-900/40 text-indigo-300 border border-indigo-700/50 font-medium">
            <span>{SCOPE_LABELS[moduleScope]?.icon || '📄'}</span>
            <span>{SCOPE_LABELS[moduleScope]?.label || moduleScope}</span>
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-800 text-slate-300 border border-slate-700 font-mono text-[11px]">
            Hire: {HIRE_TYPE_LABELS[hireType] || hireType}
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-800 text-slate-300 border border-slate-700 font-mono text-[11px]">
            Target: {POSITION_LABELS[targetPagePosition]?.split('(')[0] || targetPagePosition}
          </span>
        </div>

        {/* ── MANAGER PERMISSION WARNING BANNER (IF NON-MANAGER) ── */}
        {!isManager && (
          <div className="px-6 py-3 bg-amber-950/40 border-b border-amber-800/50 flex items-center gap-3 text-amber-300 text-xs">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-amber-400" />
            <div className="flex-1">
              <span className="font-semibold">Notice:</span> T&amp;C configurations managed by
              Company Managers. You can inspect active clauses and templates in read-only mode.
            </div>
          </div>
        )}

        {/* ── TABS NAVIGATION ── */}
        <div className="px-6 bg-slate-900 border-b border-slate-800 flex items-center gap-2 pt-2 flex-shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('create')}
            className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-colors border-b-2 flex items-center gap-2 cursor-pointer ${
              activeTab === 'create'
                ? 'bg-slate-800 text-indigo-300 border-indigo-500 font-bold'
                : 'text-slate-400 hover:text-slate-200 border-transparent hover:bg-slate-800/50'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{editingTemplateId ? 'Edit T&C Template' : 'Write New T&C Clauses'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('link')}
            className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-colors border-b-2 flex items-center gap-2 cursor-pointer ${
              activeTab === 'link'
                ? 'bg-slate-800 text-indigo-300 border-indigo-500 font-bold'
                : 'text-slate-400 hover:text-slate-200 border-transparent hover:bg-slate-800/50'
            }`}
          >
            <LinkIcon className="w-3.5 h-3.5" />
            <span>Link Existing Template ({templates.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-colors border-b-2 flex items-center gap-2 cursor-pointer ${
              activeTab === 'history'
                ? 'bg-slate-800 text-indigo-300 border-indigo-500 font-bold'
                : 'text-slate-400 hover:text-slate-200 border-transparent hover:bg-slate-800/50'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Version Audit Log</span>
          </button>
        </div>

        {/* ── TAB CONTENT BODY ── */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: WRITE NEW CLAUSES / EDIT ACTIVE */}
          {activeTab === 'create' && (
            <div className="space-y-5">
              {editingTemplateId && (
                <div className="p-3 bg-indigo-950/40 border border-indigo-700/50 rounded-lg flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-indigo-300">
                    <Sparkles className="w-4 h-4 text-indigo-400" />
                    <span>
                      Editing existing template:{' '}
                      <strong className="text-white">{templateName}</strong>
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingTemplateId(null);
                      setTemplateName(`${documentTitle} Clauses`);
                      setRevisionNote('');
                    }}
                    className="text-indigo-400 hover:text-white underline cursor-pointer"
                  >
                    Switch to Create New
                  </button>
                </div>
              )}

              {/* Template Name & Document Title */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Template Display Name *
                  </label>
                  <input
                    type="text"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    disabled={!isManager}
                    placeholder="e.g. Weekly Hire Statutory Covenants"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Legal Document Title *
                  </label>
                  <input
                    type="text"
                    value={templateTitle}
                    onChange={(e) => setTemplateTitle(e.target.value)}
                    disabled={!isManager}
                    placeholder="e.g. STATUTORY TERMS & CONDITIONS"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Allocation Dropdowns */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 bg-slate-950/70 border border-slate-800 rounded-xl">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    1. Document / Page Scope
                  </label>
                  <select
                    value={toScalarString(formScope, 'rental')}
                    onChange={(e) => {
                      const newScope = e.target.value as DocumentScope;
                      setFormScope(newScope);
                      setFormSpecificDocType('all_page_docs');
                    }}
                    disabled={!isManager}
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500 disabled:opacity-60 cursor-pointer"
                  >
                    {SCOPE_PAGE_OPTIONS.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.icon} {opt.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Designated system page executing this template rule.
                  </p>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Specific Document Type (Optional)
                  </label>
                  <select
                    value={toScalarString(formSpecificDocType, 'all_page_docs')}
                    onChange={(e) => setFormSpecificDocType(e.target.value)}
                    disabled={!isManager}
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500 disabled:opacity-60 cursor-pointer"
                  >
                    {(SCOPE_SUB_DOCUMENTS[formScope] || SCOPE_SUB_DOCUMENTS.all).map((subDoc) => (
                      <option key={subDoc.id} value={subDoc.id}>
                        {subDoc.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-slate-500 mt-1">
                    {formSpecificDocType && formSpecificDocType !== 'all_page_docs'
                      ? 'Applies specifically to this document type.'
                      : 'Applies to every document generated from this page.'}
                  </p>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    2. Agreement / Hire Type
                  </label>
                  <select
                    value={toScalarString(formHireType, 'all')}
                    onChange={(e) => setFormHireType(e.target.value as AgreementHireType)}
                    disabled={!isManager}
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500 disabled:opacity-60 cursor-pointer"
                  >
                    <option value="all">All Record Types</option>
                    <option value="weekly">Weekly Hire</option>
                    <option value="daily">Daily Hire</option>
                    <option value="claim">Credit Hire / Claim</option>
                    <option value="commercial_invoice">Commercial Invoice</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    3. Target Page Position
                  </label>
                  <select
                    value={toScalarString(formPosition, 'page_3_terms')}
                    onChange={(e) => setFormPosition(e.target.value as TargetPagePosition)}
                    disabled={!isManager}
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500 disabled:opacity-60 cursor-pointer"
                  >
                    <option value="page_3_terms">Page 3 Terms</option>
                    <option value="page_2_inspection">Page 2 Inspection</option>
                    <option value="trailing_before_signatures">Trailing Page (Pre-Signatures)</option>
                    <option value="custom_page">Custom Page</option>
                  </select>
                </div>
              </div>

              {/* Quick Clause Insertion Chips */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Quick Clause Injection</span>
                  </label>
                  <span className="text-[11px] text-slate-500">Click to append statutory clause</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_CLAUSES.map((c, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleInsertClause(c.text)}
                      disabled={!isManager}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 rounded-md text-[11px] font-medium transition cursor-pointer disabled:opacity-50"
                      title={c.text}
                    >
                      + {c.title}
                    </button>
                  ))}
                </div>
              </div>

              {/* Terms Content Clauses Textarea */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  T&amp;C Clauses &amp; Legal Text *
                </label>
                <textarea
                  rows={9}
                  value={contentClauses}
                  onChange={(e) => setContentClauses(e.target.value)}
                  disabled={!isManager}
                  placeholder="Enter numbered legal clauses (e.g. 1. ROADWORTHINESS... 2. LIABILITIES...)"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-200 font-mono leading-relaxed placeholder-slate-600 focus:outline-none focus:border-indigo-500 disabled:opacity-60"
                />
                <p className="mt-1 text-[11px] text-slate-500">
                  Formatted numbered paragraphs print directly into the compiled @react-pdf/renderer
                  canvas. Dynamic corporate entity variables are automatically replaced upon compilation.
                </p>

                {/* Dynamic Corporate Entity Variables */}
                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  <span className="text-[11px] text-slate-400 font-semibold">Dynamic Variables:</span>
                  {[
                    { label: '{{company_name}}', desc: 'Active Corporate Profile Name (e.g. Sayarah Ijarah Ltd / AIE Skyline Limited)' },
                    { label: '{{company_number}}', desc: 'Company Registration Number' },
                    { label: '{{vat_number}}', desc: 'VAT Registration Number' },
                    { label: '{{company_address}}', desc: 'Official Registered Address' },
                  ].map((v) => (
                    <button
                      key={v.label}
                      type="button"
                      onClick={() => handleInsertClause(v.label)}
                      disabled={!isManager}
                      className="px-2 py-0.5 bg-indigo-950/60 hover:bg-indigo-900 text-indigo-300 border border-indigo-700/60 rounded text-[11px] font-mono transition cursor-pointer"
                      title={v.desc}
                    >
                      + {v.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Revision / Version Note */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Revision / Change Note
                </label>
                <input
                  type="text"
                  value={revisionNote}
                  onChange={(e) => setRevisionNote(e.target.value)}
                  disabled={!isManager}
                  placeholder="e.g. Updated indemnities for 2026 fleet policy"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 disabled:opacity-60"
                />
              </div>
            </div>
          )}

          {/* TAB 2: LINK EXISTING TEMPLATE */}
          {activeTab === 'link' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    placeholder="Search templates by title or clause..."
                    className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={onlyMatchingScope}
                    onChange={(e) => setOnlyMatchingScope(e.target.checked)}
                    className="rounded bg-slate-800 border-slate-700 text-indigo-600 focus:ring-0 cursor-pointer"
                  />
                  <span>Match this document ({moduleScope})</span>
                </label>
              </div>

              {isLoadingTemplates ? (
                <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
                  <span className="text-xs">Loading available T&amp;C templates...</span>
                </div>
              ) : filteredTemplates.length === 0 ? (
                <div className="py-12 text-center text-slate-400 bg-slate-950/60 rounded-xl border border-slate-800">
                  <FileText className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                  <div className="text-xs font-semibold text-slate-300">
                    No matching templates found
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Uncheck "Match this document" to view all system templates, or write a new one.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredTemplates.map((tmpl) => {
                    const isSelected = selectedTemplateForLink?.id === tmpl.id;
                    const matchesScope =
                      tmpl.documentScope === moduleScope || tmpl.documentScope === 'all';
                    const matchesHire = tmpl.hireType === hireType || tmpl.hireType === 'all';

                    return (
                      <div
                        key={tmpl.id}
                        className={`p-4 rounded-xl border transition-all ${
                          isSelected
                            ? 'bg-indigo-950/40 border-indigo-500 shadow-md'
                            : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="text-xs font-bold text-white truncate">{tmpl.name}</h4>
                              {matchesScope && matchesHire && (
                                <span className="px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px] font-bold">
                                  ✓ Best Match
                                </span>
                              )}
                              <span className="text-[10px] font-mono text-slate-400">
                                v{tmpl.version || 1}
                              </span>
                            </div>

                            <p className="text-[11px] font-semibold text-slate-400 mt-1 truncate">
                              {tmpl.title}
                            </p>

                            <div className="flex items-center gap-2 mt-2 flex-wrap text-[10px]">
                              <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                                {SCOPE_LABELS[tmpl.documentScope]?.label || tmpl.documentScope}
                              </span>
                              <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                                {HIRE_TYPE_LABELS[tmpl.hireType] || tmpl.hireType}
                              </span>
                              <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                                {POSITION_LABELS[tmpl.targetPagePosition]?.split('(')[0] ||
                                  tmpl.targetPagePosition}
                              </span>
                            </div>

                            <p className="text-[11px] text-slate-400 font-mono mt-2 line-clamp-2 bg-slate-900/80 p-2 rounded border border-slate-800/80">
                              {tmpl.content}
                            </p>
                          </div>

                          <div className="flex flex-col gap-1.5 flex-shrink-0">
                            <button
                              type="button"
                              onClick={() => handleLinkExisting(tmpl)}
                              disabled={!isManager || isSaving}
                              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
                              title={
                                isManager
                                  ? 'Link this template directly to this document'
                                  : 'T&C configurations managed by Company Managers'
                              }
                            >
                              <LinkIcon className="w-3 h-3" />
                              <span>Link &amp; Apply</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleLoadForEdit(tmpl, true)}
                              disabled={!isManager}
                              className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[11px] font-medium transition flex items-center gap-1 cursor-pointer disabled:opacity-40"
                            >
                              <Copy className="w-3 h-3" />
                              <span>Clone &amp; Edit</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleLoadForEdit(tmpl, false)}
                              disabled={!isManager}
                              className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 rounded-lg text-[11px] transition flex items-center gap-1 cursor-pointer disabled:opacity-40"
                            >
                              <span>Edit Clauses</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: VERSION AUDIT LOG */}
          {activeTab === 'history' && (
            <div className="space-y-4">
              <div className="text-xs text-slate-400">
                Audit history of previous T&amp;C iterations before auto-routing to active documents:
              </div>

              {templates.length === 0 ? (
                <div className="text-xs text-slate-500 py-6 text-center">No template history</div>
              ) : (
                <div className="space-y-4">
                  {templates.slice(0, 5).map((tmpl) => (
                    <div
                      key={tmpl.id}
                      className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-indigo-400" />
                          <span className="text-xs font-bold text-white">{tmpl.name}</span>
                          <span className="text-[10px] font-mono px-2 py-0.5 bg-slate-800 rounded text-slate-300">
                            v{tmpl.version || 1}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {tmpl.updatedAt
                            ? new Date(tmpl.updatedAt).toLocaleString('en-GB')
                            : 'Default Preset'}
                        </span>
                      </div>

                      {Array.isArray(tmpl.versionHistory) && tmpl.versionHistory.length > 0 ? (
                        <div className="space-y-2 border-l-2 border-slate-800 pl-3 ml-1 text-xs">
                          {tmpl.versionHistory.map((ver) => (
                            <div
                              key={ver.versionId}
                              className="p-2.5 bg-slate-900/60 rounded border border-slate-800/80 space-y-1"
                            >
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="font-semibold text-slate-300">
                                  v{ver.versionNumber} • {ver.authorName || 'Manager'}
                                </span>
                                <span className="text-slate-500 text-[10px]">
                                  {new Date(ver.timestamp).toLocaleString('en-GB')}
                                </span>
                              </div>
                              <p className="text-[11px] text-indigo-300 italic">
                                "{ver.changeNote || 'Document revision'}"
                              </p>
                              <div className="flex justify-end pt-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (!isManager) {
                                      toast.error('T&C configurations managed by Company Managers');
                                      return;
                                    }
                                    handleInsertClause(ver.content);
                                    setActiveTab('create');
                                    toast.success(`Loaded v${ver.versionNumber} text into editor`);
                                  }}
                                  className="text-[10px] text-indigo-400 hover:text-white flex items-center gap-1 cursor-pointer"
                                >
                                  <RotateCcw className="w-3 h-3" />
                                  <span>Restore Clause Text</span>
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-[11px] text-slate-500 italic pl-1">
                          No prior revision iterations recorded for this template yet.
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── FOOTER ACTIONS ── */}
        <div className="px-6 py-4 bg-slate-900 border-t border-slate-800 flex items-center justify-between gap-3 flex-shrink-0">
          <div className="text-[11px] text-slate-400 truncate">
            {isManager ? (
              <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Live PDF preview updates immediately upon save
              </span>
            ) : (
              <span className="text-amber-400">
                T&amp;C configurations managed by Company Managers
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold rounded-lg transition cursor-pointer"
            >
              Cancel
            </button>

            {activeTab === 'create' && (
              <button
                type="button"
                onClick={handleSaveAndApply}
                disabled={!isManager || isSaving}
                className="inline-flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white text-xs font-bold rounded-lg shadow-md transition disabled:opacity-50 cursor-pointer"
                title={
                  isManager
                    ? 'Save T&C template and refresh PDF canvas live'
                    : 'T&C configurations managed by Company Managers'
                }
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving &amp; Updating Live...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>Save &amp; Apply Live to Document</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
};

export default ContextualTermsDrawer;
