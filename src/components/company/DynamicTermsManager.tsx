// src/components/company/DynamicTermsManager.tsx
import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { usePermissions } from '../../hooks/usePermissions';
import {
  DynamicTermTemplate,
  TermTemplateVersion,
  DocumentScope,
  AgreementHireType,
  TargetPagePosition,
  RecordStatusTrigger,
  DEFAULT_DYNAMIC_TERMS_TEMPLATES,
  SCOPE_PAGE_OPTIONS,
  SCOPE_SUB_DOCUMENTS,
} from '../../utils/documentTemplateTerms';
import TermsVersionHistoryModal from './TermsVersionHistoryModal';
import { removeUndefined } from '../../utils/firestoreSanitize';
import toast from 'react-hot-toast';
import {
  Plus,
  Edit2,
  Trash2,
  Copy,
  FileText,
  Search,
  CheckCircle2,
  Sliders,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Sparkles,
  Layers,
  Tag,
  Zap,
  MapPin,
  X,
  Save,
  History,
  Clock,
  GitCompare,
  Shield,
  AlertTriangle,
} from 'lucide-react';

interface DynamicTermsManagerProps {
  templates?: DynamicTermTemplate[];
  onChange: (updatedTemplates: DynamicTermTemplate[]) => void;
  onDirectSave?: (updatedTemplates: DynamicTermTemplate[]) => Promise<void>;
  disabled?: boolean;
}

const SCOPE_OPTIONS = SCOPE_PAGE_OPTIONS;

const HIRE_TYPE_OPTIONS: { id: AgreementHireType; label: string; badge: string; color: string }[] = [
  { id: 'all', label: 'All Record Types', badge: 'All Types', color: 'bg-slate-100 text-slate-700 border-slate-300' },
  { id: 'weekly', label: 'Weekly Hire', badge: 'Weekly', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { id: 'daily', label: 'Daily Hire', badge: 'Daily', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  { id: 'claim', label: 'Credit Hire / Claim', badge: 'Claim', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { id: 'commercial_invoice', label: 'Commercial Invoice', badge: 'Commercial', color: 'bg-purple-50 text-purple-700 border-purple-200' },
];

const POSITION_OPTIONS: { id: TargetPagePosition; label: string; badge: string; hint: string }[] = [
  { id: 'page_3_terms', label: 'Page 3 Terms (Dedicated T&C Clauses)', badge: 'Page 3', hint: 'Prints on dedicated Terms & Conditions pages' },
  { id: 'page_2_inspection', label: 'Page 2 Inspection (Vehicle Condition)', badge: 'Page 2', hint: 'Appended alongside vehicle condition & inspection records' },
  { id: 'trailing_before_signatures', label: 'Trailing Page (Before Signatures)', badge: 'Trailing', hint: 'Rendered directly above signature execution blocks on the final page' },
  { id: 'custom_page', label: 'Custom Page Number', badge: 'Custom', hint: 'Explicit designated page position' },
];

const TRIGGER_OPTIONS: { id: RecordStatusTrigger; label: string; badge: string; color: string }[] = [
  { id: 'any', label: 'Any Status (Always Apply)', badge: 'Always', color: 'bg-slate-100 text-slate-600 border-slate-200' },
  { id: 'customer_claim', label: 'Customer Type = "Claim"', badge: 'Claim Customer', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { id: 'customer_standard', label: 'Customer Type = "Standard / Non-Claim"', badge: 'Standard Customer', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { id: 'payment_unpaid', label: 'Payment Status = "Unpaid / Pending"', badge: 'Unpaid Trigger', color: 'bg-rose-50 text-rose-700 border-rose-200' },
  { id: 'payment_paid', label: 'Payment Status = "Paid"', badge: 'Paid Trigger', color: 'bg-teal-50 text-teal-700 border-teal-200' },
  { id: 'rental_active', label: 'Rental Status = "Active / Ongoing"', badge: 'Active Rental', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  { id: 'rental_completed', label: 'Rental Status = "Completed / Returned"', badge: 'Completed Rental', color: 'bg-purple-50 text-purple-700 border-purple-200' },
];

export const DynamicTermsManager: React.FC<DynamicTermsManagerProps> = ({
  templates = DEFAULT_DYNAMIC_TERMS_TEMPLATES,
  onChange,
  onDirectSave,
  disabled = false,
}) => {
  const { user } = useAuth();
  const { can } = usePermissions();

  // Dynamic T&C Management Permission Check
  const canManageDynamicTerms = can('settings', 'manageDynamicTerms');
  const isReadOnly = disabled || !canManageDynamicTerms;

  const currentTemplates = useMemo(() => {
    return Array.isArray(templates) && templates.length > 0
      ? templates
      : DEFAULT_DYNAMIC_TERMS_TEMPLATES;
  }, [templates]);

  // Filtering & Search states
  const [selectedScopeFilter, setSelectedScopeFilter] = useState<DocumentScope | 'all_tabs'>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const scopeParam = params.get('scope');
      if (scopeParam && ['rental', 'vehicle', 'maintenance', 'claims', 'invoices', 'finance'].includes(scopeParam)) {
        return scopeParam as DocumentScope;
      }
    }
    return 'all_tabs';
  });
  const [selectedHireTypeFilter, setSelectedHireTypeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const scopeParam = params.get('scope');
      if (scopeParam && ['rental', 'vehicle', 'maintenance', 'claims', 'invoices', 'finance'].includes(scopeParam)) {
        setSelectedScopeFilter(scopeParam as DocumentScope);
      }
    }
  }, []);

  // Editor Modal State
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Partial<DynamicTermTemplate> | null>(null);
  const [revisionNote, setRevisionNote] = useState<string>('');
  const [isSavingDirect, setIsSavingDirect] = useState(false);

  // Version History Modal State
  const [historyModalTemplate, setHistoryModalTemplate] = useState<DynamicTermTemplate | null>(null);

  // Delete Confirmation Modal State
  const [deletingTemplate, setDeletingTemplate] = useState<DynamicTermTemplate | null>(null);

  // Filtered Templates
  const filteredTemplates = useMemo(() => {
    return currentTemplates.filter((tmpl) => {
      // Tab scope filter
      if (selectedScopeFilter !== 'all_tabs') {
        if (tmpl.documentScope !== 'all' && tmpl.documentScope !== selectedScopeFilter) {
          return false;
        }
      }

      // Hire type dropdown filter
      if (selectedHireTypeFilter !== 'all' && tmpl.hireType !== selectedHireTypeFilter) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = tmpl.name.toLowerCase().includes(q);
        const matchesTitle = tmpl.title.toLowerCase().includes(q);
        const matchesContent = tmpl.content.toLowerCase().includes(q);
        if (!matchesName && !matchesTitle && !matchesContent) {
          return false;
        }
      }

      return true;
    });
  }, [currentTemplates, selectedScopeFilter, selectedHireTypeFilter, searchQuery]);

  // Handlers
  const handleAddNew = () => {
    if (isReadOnly) {
      toast.error("Requires 'Manage Dynamic T&Cs' permission under System Settings.");
      return;
    }
    setEditingTemplate({
      id: `dtmpl_custom_${Date.now()}`,
      name: '',
      title: 'STATUTORY TERMS AND CONDITIONS',
      documentScope: selectedScopeFilter !== 'all_tabs' ? selectedScopeFilter : 'rental',
      specificDocType: 'all_page_docs',
      hireType: 'all',
      targetPagePosition: 'page_3_terms',
      statusTrigger: 'any',
      content: '1. OBLIGATIONS: Standard terms and statutory conditions apply to this agreement.\n2. ROADWORTHINESS: The vehicle must be operated in accordance with Road Traffic Acts.\n3. RETURN: The vehicle must be returned upon the scheduled end date.',
      isActive: true,
      priority: 10,
      category: 'Custom Terms',
      version: 1,
      versionHistory: [],
    });
    setRevisionNote('Initial template creation');
    setIsEditorOpen(true);
  };

  const handleEdit = (tmpl: DynamicTermTemplate) => {
    if (isReadOnly) {
      toast.error("Requires 'Manage Dynamic T&Cs' permission under System Settings.");
      return;
    }
    setEditingTemplate({ ...tmpl });
    setRevisionNote('');
    setIsEditorOpen(true);
  };

  const handleDuplicate = (tmpl: DynamicTermTemplate) => {
    if (isReadOnly) {
      toast.error("Requires 'Manage Dynamic T&Cs' permission under System Settings.");
      return;
    }
    const duplicated: DynamicTermTemplate = {
      ...tmpl,
      id: `dtmpl_copy_${Date.now()}`,
      name: `${tmpl.name} (Copy)`,
      version: 1,
      versionHistory: [
        {
          versionId: `ver_copy_${Date.now()}`,
          versionNumber: 1,
          timestamp: new Date().toISOString(),
          authorName: user?.displayName || user?.name || user?.email || 'Manager',
          authorEmail: user?.email || '',
          changeNote: `Duplicated from "${tmpl.name}" (v${tmpl.version || 1})`,
          name: `${tmpl.name} (Copy)`,
          title: tmpl.title,
          content: tmpl.content,
          documentScope: tmpl.documentScope,
          specificDocType: tmpl.specificDocType || 'all_page_docs',
          hireType: tmpl.hireType,
          targetPagePosition: tmpl.targetPagePosition,
          ...(tmpl.customPageNumber !== undefined && tmpl.customPageNumber !== null
            ? { customPageNumber: Number(tmpl.customPageNumber) }
            : {}),
          statusTrigger: tmpl.statusTrigger,
          isActive: tmpl.isActive,
        },
      ],
      updatedAt: new Date().toISOString(),
      updatedBy: user?.displayName || user?.name || user?.email || 'Manager',
    };
    const updated = removeUndefined([duplicated, ...currentTemplates]);
    onChange(updated);
    if (onDirectSave) onDirectSave(updated);
    toast.success(`Duplicated "${tmpl.name}"`);
  };

  const handleDeleteClick = (tmpl: DynamicTermTemplate) => {
    if (isReadOnly) {
      toast.error("Requires 'Manage Dynamic T&Cs' permission under System Settings.");
      return;
    }
    setDeletingTemplate(tmpl);
  };

  const handleConfirmDelete = () => {
    if (!deletingTemplate || isReadOnly) return;
    const targetId = deletingTemplate.id;
    const targetName = deletingTemplate.name;
    const updated = removeUndefined(currentTemplates.filter((t) => t.id !== targetId));
    onChange(updated);
    if (onDirectSave) onDirectSave(updated);
    setDeletingTemplate(null);
    toast.success(`Purged T&C template "${targetName}"`);
  };

  const handleToggleActive = (id: string) => {
    if (isReadOnly) {
      toast.error("Requires 'Manage Dynamic T&Cs' permission under System Settings.");
      return;
    }
    const updated = removeUndefined(
      currentTemplates.map((t) =>
        t.id === id ? { ...t, isActive: !t.isActive, updatedAt: new Date().toISOString() } : t
      )
    );
    onChange(updated);
    if (onDirectSave) onDirectSave(updated);
    toast.success('Template status updated');
  };

  const handleSaveModal = async () => {
    if (!editingTemplate) return;
    if (!editingTemplate.name?.trim()) {
      toast.error('Template Name is required.');
      return;
    }
    if (!editingTemplate.title?.trim()) {
      toast.error('Legal Document Title is required.');
      return;
    }
    if (!editingTemplate.content?.trim()) {
      toast.error('Terms & Conditions content clauses are required.');
      return;
    }

    const existingIndex = currentTemplates.findIndex((t) => t.id === editingTemplate.id);
    const existing = existingIndex >= 0 ? currentTemplates[existingIndex] : null;

    let targetVersion = existing?.version || 1;
    let targetHistory: TermTemplateVersion[] = Array.isArray(existing?.versionHistory)
      ? [...existing.versionHistory]
      : [];

    const authorName = user?.displayName || user?.name || user?.email || 'Manager';
    const authorEmail = user?.email || '';

    if (existing) {
      // Check if content or routing parameters were modified
      const isContentChanged = existing.content.trim() !== editingTemplate.content.trim();
      const isTitleChanged = existing.title.trim() !== editingTemplate.title.trim();
      const isScopeChanged = existing.documentScope !== editingTemplate.documentScope;
      const isHireTypeChanged = existing.hireType !== editingTemplate.hireType;
      const isPosChanged = existing.targetPagePosition !== editingTemplate.targetPagePosition;
      const isTriggerChanged = existing.statusTrigger !== editingTemplate.statusTrigger;

      if (isContentChanged || isTitleChanged || isScopeChanged || isHireTypeChanged || isPosChanged || isTriggerChanged) {
        // Snapshot the current state into version history before updating
        const priorSnapshot: TermTemplateVersion = {
          versionId: `ver_${existing.id}_v${existing.version || 1}_${Date.now()}`,
          versionNumber: existing.version || 1,
          timestamp: existing.updatedAt || new Date().toISOString(),
          authorName: existing.updatedBy || authorName,
          authorEmail: authorEmail || '',
          changeNote: revisionNote.trim() || 'Updated legal clauses and allocation parameters',
          name: existing.name,
          title: existing.title,
          content: existing.content,
          documentScope: existing.documentScope,
          specificDocType: existing.specificDocType || 'all_page_docs',
          hireType: existing.hireType,
          targetPagePosition: existing.targetPagePosition,
          ...(existing.customPageNumber !== undefined && existing.customPageNumber !== null && !isNaN(Number(existing.customPageNumber))
            ? { customPageNumber: Number(existing.customPageNumber) }
            : {}),
          statusTrigger: existing.statusTrigger,
          isActive: existing.isActive,
        };

        if (!targetHistory.some((h) => h.versionNumber === priorSnapshot.versionNumber && h.content === priorSnapshot.content)) {
          targetHistory = [priorSnapshot, ...targetHistory];
        }

        targetVersion = (existing.version || 1) + 1;
      }
    } else {
      // New template initial version
      targetVersion = 1;
      targetHistory = [
        {
          versionId: `ver_${editingTemplate.id}_v1`,
          versionNumber: 1,
          timestamp: new Date().toISOString(),
          authorName,
          authorEmail: authorEmail || '',
          changeNote: revisionNote.trim() || 'Initial creation of legal template',
          name: editingTemplate.name.trim(),
          title: editingTemplate.title.trim(),
          content: editingTemplate.content.trim(),
          documentScope: editingTemplate.documentScope || 'rental',
          specificDocType: editingTemplate.specificDocType || 'all_page_docs',
          hireType: editingTemplate.hireType || 'all',
          targetPagePosition: editingTemplate.targetPagePosition || 'page_3_terms',
          ...(editingTemplate.customPageNumber !== undefined && editingTemplate.customPageNumber !== null && !isNaN(Number(editingTemplate.customPageNumber))
            ? { customPageNumber: Number(editingTemplate.customPageNumber) }
            : {}),
          statusTrigger: editingTemplate.statusTrigger || 'any',
          isActive: editingTemplate.isActive ?? true,
        },
      ];
    }

    const templateToSave: DynamicTermTemplate = {
      id: editingTemplate.id || `dtmpl_${Date.now()}`,
      name: editingTemplate.name.trim(),
      title: editingTemplate.title.trim(),
      documentScope: editingTemplate.documentScope || 'rental',
      specificDocType: editingTemplate.specificDocType || 'all_page_docs',
      hireType: editingTemplate.hireType || 'all',
      targetPagePosition: editingTemplate.targetPagePosition || 'page_3_terms',
      ...(editingTemplate.customPageNumber !== undefined && editingTemplate.customPageNumber !== null && !isNaN(Number(editingTemplate.customPageNumber))
        ? { customPageNumber: Number(editingTemplate.customPageNumber) }
        : {}),
      statusTrigger: editingTemplate.statusTrigger || 'any',
      content: editingTemplate.content.trim(),
      isActive: editingTemplate.isActive ?? true,
      priority: Number(editingTemplate.priority) || 10,
      category: editingTemplate.category || 'General',
      version: targetVersion,
      versionHistory: targetHistory,
      updatedAt: new Date().toISOString(),
      updatedBy: authorName,
    };

    let updated: DynamicTermTemplate[];
    if (existingIndex >= 0) {
      updated = [...currentTemplates];
      updated[existingIndex] = templateToSave;
    } else {
      updated = [templateToSave, ...currentTemplates];
    }

    const cleaned = removeUndefined(updated);
    setIsSavingDirect(true);
    try {
      onChange(cleaned);
      if (onDirectSave) {
        await onDirectSave(cleaned);
      }
      setIsEditorOpen(false);
      setEditingTemplate(null);
      setRevisionNote('');
      toast.success(`Saved "${templateToSave.name}" (v${templateToSave.version})`);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to persist template.');
    } finally {
      setIsSavingDirect(false);
    }
  };

  // Revert version handler
  const handleRevertVersion = async (versionToRevert: TermTemplateVersion, changeNote?: string) => {
    if (disabled || !historyModalTemplate) return;

    const current = currentTemplates.find((t) => t.id === historyModalTemplate.id);
    if (!current) return;

    const authorName = user?.displayName || user?.name || user?.email || 'Manager';
    const authorEmail = user?.email || '';

    // Snapshot the current state before applying revert
    const currentSnapshot: TermTemplateVersion = {
      versionId: `ver_${current.id}_v${current.version || 1}_${Date.now()}`,
      versionNumber: current.version || 1,
      timestamp: current.updatedAt || new Date().toISOString(),
      authorName: current.updatedBy || authorName,
      authorEmail: authorEmail,
      changeNote: `Archived iteration prior to reverting to v${versionToRevert.versionNumber}`,
      name: current.name,
      title: current.title,
      content: current.content,
      documentScope: current.documentScope,
      specificDocType: current.specificDocType || 'all_page_docs',
      hireType: current.hireType,
      targetPagePosition: current.targetPagePosition,
      ...(current.customPageNumber !== undefined && current.customPageNumber !== null && !isNaN(Number(current.customPageNumber))
        ? { customPageNumber: Number(current.customPageNumber) }
        : {}),
      statusTrigger: current.statusTrigger,
      isActive: current.isActive,
    };

    const nextHistory = [
      currentSnapshot,
      ...(current.versionHistory || []).filter(
        (h) => h.versionNumber !== currentSnapshot.versionNumber || h.content !== currentSnapshot.content
      ),
    ];

    const nextVersionNum = (current.version || 1) + 1;

    const revertedTemplate: DynamicTermTemplate = {
      ...current,
      name: versionToRevert.name || current.name,
      title: versionToRevert.title,
      content: versionToRevert.content,
      documentScope: versionToRevert.documentScope,
      specificDocType: versionToRevert.specificDocType || current.specificDocType || 'all_page_docs',
      hireType: versionToRevert.hireType,
      targetPagePosition: versionToRevert.targetPagePosition,
      ...(versionToRevert.customPageNumber !== undefined && versionToRevert.customPageNumber !== null && !isNaN(Number(versionToRevert.customPageNumber))
        ? { customPageNumber: Number(versionToRevert.customPageNumber) }
        : {}),
      statusTrigger: versionToRevert.statusTrigger,
      isActive: versionToRevert.isActive,
      version: nextVersionNum,
      versionHistory: nextHistory,
      updatedAt: new Date().toISOString(),
      updatedBy: `${authorName} (Reverted to v${versionToRevert.versionNumber})`,
    };

    const updated = removeUndefined(currentTemplates.map((t) => (t.id === current.id ? revertedTemplate : t)));

    setIsSavingDirect(true);
    try {
      onChange(updated);
      if (onDirectSave) {
        await onDirectSave(updated);
      }
      setHistoryModalTemplate(null);
      toast.success(
        `Successfully reverted "${revertedTemplate.name}" to v${versionToRevert.versionNumber} (now active as v${nextVersionNum})!`
      );
    } catch (err: any) {
      toast.error(err?.message || 'Failed to revert version.');
    } finally {
      setIsSavingDirect(false);
    }
  };

  const handleRestorePresets = () => {
    if (disabled) return;
    if (
      window.confirm(
        'Restore standard recommended T&C templates? Custom templates will be preserved and standard rules restored.'
      )
    ) {
      const merged = removeUndefined([
        ...DEFAULT_DYNAMIC_TERMS_TEMPLATES,
        ...currentTemplates.filter(
          (c) => !DEFAULT_DYNAMIC_TERMS_TEMPLATES.some((d) => d.id === c.id)
        ),
      ]);
      onChange(merged);
      if (onDirectSave) onDirectSave(merged);
      toast.success('Recommended presets restored');
    }
  };

  const activeCount = currentTemplates.filter((t) => t.isActive).length;

  return (
    <div className="space-y-6">
      {/* ── HEADER & ACTIONS ── */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/20 rounded-2xl p-6 shadow-sm text-white relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-96 bg-gradient-to-l from-indigo-500/10 to-transparent pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-semibold uppercase tracking-wider mb-2">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              Dynamic T&C Mapping Engine
            </div>
            <h3 className="text-xl md:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              Document Terms &amp; Conditions Manager
            </h3>
            <p className="text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
              Create and dynamically allocate legal T&amp;Cs across Rental, Invoice, Maintenance, and Claims modules. The engine automatically inspects the record type (Weekly, Daily, Claim) and status trigger to compile matching clauses.
            </p>

            <div className="flex items-center gap-4 mt-3 text-xs text-slate-300 font-medium">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <strong className="text-white">{activeCount}</strong> of {currentTemplates.length} Active Templates
              </span>
              <span className="text-slate-500">•</span>
              <span className="flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-indigo-400" />
                Multi-Module Dynamic Routing
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleRestorePresets}
              disabled={isReadOnly}
              title={isReadOnly ? "Requires 'Manage Dynamic T&Cs' permission under System Settings" : "Reload standard preset templates"}
              className="px-3.5 py-2 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700/80 text-xs font-semibold text-slate-200 transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
              Reset Presets
            </button>

            <button
              type="button"
              onClick={handleAddNew}
              disabled={isReadOnly}
              title={isReadOnly ? "Requires 'Manage Dynamic T&Cs' permission under System Settings" : "Create new T&C template"}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-all shadow-md hover:shadow-indigo-500/25 flex items-center gap-2 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4" />
              Add New T&amp;C Template
            </button>
          </div>
        </div>
      </div>

      {/* Permission alert if lacking manageDynamicTerms */}
      {isReadOnly && (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 px-4 py-3 rounded-xl text-xs flex items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-amber-100 text-amber-800 shrink-0">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold">Read-Only Mode: </span>
              <span>
                You currently lack the <strong>"Manage Dynamic T&Cs"</strong> permission under System Settings. Template editing, duplicating, and deleting are disabled.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ── FILTER BAR & SCOPE TABS ── */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3">
        {/* Module Scope Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs border-b border-slate-100">
          <button
            type="button"
            onClick={() => setSelectedScopeFilter('all_tabs')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
              selectedScopeFilter === 'all_tabs'
                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 font-semibold shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <span>🌐</span>
            <span>All Modules</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-500 font-mono">
              {currentTemplates.length}
            </span>
          </button>
          {SCOPE_OPTIONS.filter((s) => s.id !== 'all').map((scope) => {
            const count = currentTemplates.filter(
              (t) => t.documentScope === 'all' || t.documentScope === scope.id
            ).length;
            return (
              <button
                key={scope.id}
                type="button"
                onClick={() => setSelectedScopeFilter(scope.id)}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
                  selectedScopeFilter === scope.id
                    ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 font-semibold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <span>{scope.icon}</span>
                <span>{(scope as any).tabName || scope.label}</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-500 font-mono">
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Secondary Filter Controls: Search & Hire Type Dropdown */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search template name, legal title, or clauses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-indigo-500 text-slate-800 placeholder-slate-400 transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <Sliders className="w-3.5 h-3.5" />
              <span>Hire Type:</span>
            </div>
            <select
              value={selectedHireTypeFilter}
              onChange={(e) => setSelectedHireTypeFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-slate-50 text-slate-700 font-medium focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="all">All Hire Types</option>
              <option value="weekly">Weekly Hire</option>
              <option value="daily">Daily Hire</option>
              <option value="claim">Credit Hire / Claim</option>
              <option value="commercial_invoice">Commercial Invoice</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── TEMPLATES GRID / CARDS ── */}
      {filteredTemplates.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center space-y-3">
          <FileText className="w-10 h-10 text-slate-300 mx-auto" />
          <h4 className="text-base font-semibold text-slate-800">No matching T&amp;C templates found</h4>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {searchQuery || selectedHireTypeFilter !== 'all'
              ? 'Try adjusting your search query or hire type filter.'
              : 'Click "Add New T&C Template" to create a custom template for this module.'}
          </p>
          <button
            type="button"
            onClick={handleAddNew}
            disabled={disabled}
            className="mt-2 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-500 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Add New T&amp;C Template
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredTemplates.map((tmpl) => {
            const scopeMeta = SCOPE_OPTIONS.find((s) => s.id === tmpl.documentScope) || SCOPE_OPTIONS[0];
            const hireMeta = HIRE_TYPE_OPTIONS.find((h) => h.id === tmpl.hireType) || HIRE_TYPE_OPTIONS[0];
            const posMeta = POSITION_OPTIONS.find((p) => p.id === tmpl.targetPagePosition) || POSITION_OPTIONS[0];
            const triggerMeta = TRIGGER_OPTIONS.find((t) => t.id === tmpl.statusTrigger) || TRIGGER_OPTIONS[0];
            const isExpanded = expandedCardId === tmpl.id;

            return (
              <div
                key={tmpl.id}
                className={`bg-white border rounded-xl transition-all ${
                  tmpl.isActive
                    ? 'border-slate-200 hover:border-indigo-300 shadow-2xs'
                    : 'border-slate-200/60 bg-slate-50/50 opacity-75'
                }`}
              >
                <div className="p-4 sm:p-5">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    {/* Left: Template Name, Title & Allocation Badges */}
                    <div className="space-y-2 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleToggleActive(tmpl.id)}
                          disabled={isReadOnly}
                          title={isReadOnly ? "Requires 'Manage Dynamic T&Cs' permission under System Settings" : tmpl.isActive ? 'Active in PDF Engine (Click to disable)' : 'Disabled (Click to enable)'}
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border transition-colors ${
                            isReadOnly ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
                          } ${
                            tmpl.isActive
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                              : 'bg-slate-100 text-slate-500 border-slate-300'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${tmpl.isActive ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                          {tmpl.isActive ? 'Active in PDFs' : 'Inactive'}
                        </button>

                        <span className="text-sm font-bold text-slate-900 tracking-tight">
                          {tmpl.name}
                        </span>

                        <button
                          type="button"
                          onClick={() => setHistoryModalTemplate(tmpl)}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition-colors cursor-pointer"
                          title="View Version History Tracker"
                        >
                          <History className="w-3 h-3 text-indigo-600" />
                          <span>v{tmpl.version || 1}</span>
                          <span className="text-[9px] text-indigo-500 font-normal">
                            ({(tmpl.versionHistory?.length || 1)} {(tmpl.versionHistory?.length || 1) === 1 ? 'ver' : 'vers'})
                          </span>
                        </button>

                        {tmpl.priority && tmpl.priority > 10 && (
                          <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 font-semibold">
                            Priority High
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-indigo-950 font-semibold flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                        <span className="font-mono text-[11px] bg-slate-100 px-2 py-0.5 rounded text-slate-800">
                          {tmpl.title}
                        </span>
                      </div>

                      {/* ── 4 ALLOCATION DROPDOWN BADGES ── */}
                      <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px]">
                        {/* 1. Document Scope */}
                        <div
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 font-medium"
                          title={`Document Scope: ${scopeMeta.label}`}
                        >
                          <span>{scopeMeta.icon}</span>
                          <span className="font-semibold text-slate-900">{scopeMeta.label.split(' ')[0]}</span>
                          <span className="text-slate-400 text-[10px]">Scope</span>
                        </div>

                        {/* 1b. Specific Sub-Document Badge */}
                        {tmpl.specificDocType && tmpl.specificDocType !== 'all_page_docs' && (
                          <div
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-teal-50 border border-teal-200 text-teal-800 font-medium"
                            title={`Specific Document: ${tmpl.specificDocType}`}
                          >
                            <FileText className="w-3 h-3 text-teal-600" />
                            <span className="font-semibold text-teal-900">
                              {(SCOPE_SUB_DOCUMENTS[tmpl.documentScope] || []).find((d) => d.id === tmpl.specificDocType)?.label.split('(')[0] || tmpl.specificDocType}
                            </span>
                            <span className="text-teal-500 text-[10px]">Doc</span>
                          </div>
                        )}

                        {/* 2. Hire Type */}
                        <div
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border font-medium ${hireMeta.color}`}
                          title={`Agreement / Hire Type: ${hireMeta.label}`}
                        >
                          <Tag className="w-3 h-3" />
                          <span className="font-semibold">{hireMeta.badge}</span>
                          <span className="opacity-60 text-[10px]">Type</span>
                        </div>

                        {/* 3. Target Page Position */}
                        <div
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-800 font-medium"
                          title={`Target Page Position: ${posMeta.label}`}
                        >
                          <MapPin className="w-3 h-3 text-indigo-600" />
                          <span className="font-semibold">{posMeta.badge}</span>
                          {tmpl.targetPagePosition === 'custom_page' && tmpl.customPageNumber && (
                            <span className="font-mono text-indigo-600 font-bold">#{tmpl.customPageNumber}</span>
                          )}
                          <span className="text-indigo-400 text-[10px]">Position</span>
                        </div>

                        {/* 4. Record Status Trigger */}
                        <div
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border font-medium ${triggerMeta.color}`}
                          title={`Trigger Condition: ${triggerMeta.label}`}
                        >
                          <Zap className="w-3 h-3" />
                          <span className="font-semibold">{triggerMeta.badge}</span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-2 sm:self-center shrink-0">
                      <button
                        type="button"
                        onClick={() => setHistoryModalTemplate(tmpl)}
                        className="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
                        title={`View version history tracker for "${tmpl.name}" (v${tmpl.version || 1})`}
                      >
                        <History className="w-3.5 h-3.5 text-indigo-600" />
                        <span>History</span>
                        <span className="px-1.5 py-0.2 rounded text-[10px] bg-slate-100 font-mono text-slate-600">
                          v{tmpl.version || 1}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleEdit(tmpl)}
                        disabled={isReadOnly}
                        title={isReadOnly ? "Requires 'Manage Dynamic T&Cs' permission under System Settings" : `Edit template "${tmpl.name}"`}
                        className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                          isReadOnly
                            ? 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed opacity-50'
                            : 'border-slate-200 hover:border-indigo-400 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 cursor-pointer shadow-2xs'
                        }`}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDuplicate(tmpl)}
                        disabled={isReadOnly}
                        title={isReadOnly ? "Requires 'Manage Dynamic T&Cs' permission under System Settings" : `Duplicate template "${tmpl.name}"`}
                        className={`p-1.5 rounded-lg border transition-colors ${
                          isReadOnly
                            ? 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed opacity-50'
                            : 'border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-slate-800 cursor-pointer shadow-2xs'
                        }`}
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteClick(tmpl)}
                        disabled={isReadOnly}
                        title={isReadOnly ? "Requires 'Manage Dynamic T&Cs' permission under System Settings" : `Delete template "${tmpl.name}"`}
                        className={`p-1.5 rounded-lg border transition-colors ${
                          isReadOnly
                            ? 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed opacity-50'
                            : 'border-slate-200 hover:bg-rose-50 text-slate-400 hover:text-rose-600 hover:border-rose-300 cursor-pointer shadow-2xs'
                        }`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => setExpandedCardId(isExpanded ? null : tmpl.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer ml-1"
                        title={isExpanded ? 'Collapse clause preview' : 'Expand clause preview'}
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Collapsible / Preview Content */}
                  <div className={`mt-3 pt-3 border-t border-slate-100 ${isExpanded ? 'block' : 'line-clamp-2'}`}>
                    <p className="text-xs text-slate-600 font-mono whitespace-pre-line leading-relaxed">
                      {isExpanded ? tmpl.content : tmpl.content.slice(0, 220) + (tmpl.content.length > 220 ? '...' : '')}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── MODAL: ADD / EDIT T&C TEMPLATE ── */}
      {isEditorOpen && editingTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-auto">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-300">
                  Dynamic T&amp;C Mapping Editor
                </span>
                <h4 className="text-lg font-bold text-white flex items-center gap-2">
                  <span>{editingTemplate.id?.startsWith('dtmpl_custom') ? 'Create New T&C Template' : 'Edit T&C Template'}</span>
                  {editingTemplate.version && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 font-mono font-normal">
                      v{editingTemplate.version}
                    </span>
                  )}
                </h4>
              </div>

              <div className="flex items-center gap-2">
                {editingTemplate.id && !editingTemplate.id.startsWith('dtmpl_custom_') && (
                  <button
                    type="button"
                    onClick={() => {
                      const matched = currentTemplates.find((t) => t.id === editingTemplate.id);
                      if (matched) {
                        setHistoryModalTemplate(matched);
                      }
                    }}
                    className="px-2.5 py-1 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 text-xs font-semibold border border-indigo-400/30 transition-colors flex items-center gap-1.5 cursor-pointer"
                    title="View past iterations, diff comparisons, or revert"
                  >
                    <History className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Version History</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setIsEditorOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 text-slate-800 flex-1">
              {/* Template Name & Legal Title */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Template Display Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={editingTemplate.name || ''}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                    placeholder="e.g. Weekly Fleet Hire Covenants"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Internal administrative label for this rule.</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Legal Document Title (Printed on PDF) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={editingTemplate.title || ''}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, title: e.target.value })}
                    placeholder="e.g. STATUTORY TERMS AND CONDITIONS OF VEHICLE HIRE"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-semibold"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Official section heading displayed at top of PDF page.</p>
                </div>
              </div>

              {/* ── 4 ALLOCATION DROPDOWNS SECTION ── */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
                <h5 className="text-xs font-bold text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-indigo-600" />
                  Automated PDF Allocation &amp; Routing Controls
                </h5>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* a) Document Scope Dropdown */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                      <span>📂</span> 1. Document / Page Scope
                    </label>
                    <select
                      value={editingTemplate.documentScope || 'rental'}
                      onChange={(e) => {
                        const newScope = e.target.value as DocumentScope;
                        setEditingTemplate({
                          ...editingTemplate,
                          documentScope: newScope,
                          specificDocType: 'all_page_docs',
                        });
                      }}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white font-medium text-slate-800 focus:outline-none focus:border-indigo-500 cursor-pointer"
                    >
                      {SCOPE_OPTIONS.map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          {opt.icon} {opt.label}
                        </option>
                      ))}
                    </select>
                    <p className="text-[10px] text-slate-500 mt-1">
                      Which module or document pack should execute this template.
                    </p>
                  </div>

                  {/* 1b) Secondary Sub-Document Filter Dropdown */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-indigo-600" /> Specific Document Type (Optional)
                    </label>
                    <select
                      value={editingTemplate.specificDocType || 'all_page_docs'}
                      onChange={(e) =>
                        setEditingTemplate({
                          ...editingTemplate,
                          specificDocType: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white font-medium text-slate-800 focus:outline-none focus:border-indigo-500 cursor-pointer"
                    >
                      {(SCOPE_SUB_DOCUMENTS[editingTemplate.documentScope || 'all'] || SCOPE_SUB_DOCUMENTS.all).map((subDoc) => (
                        <option key={subDoc.id} value={subDoc.id}>
                          {subDoc.label}
                        </option>
                      ))}
                    </select>
                    <p className="text-[10px] text-slate-500 mt-1">
                      {editingTemplate.specificDocType && editingTemplate.specificDocType !== 'all_page_docs'
                        ? 'Applies specifically to this document type on the selected page.'
                        : 'Applies to every document generated from this specific page.'}
                    </p>
                  </div>

                  {/* b) Agreement / Hire Type Dropdown */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5 text-blue-600" /> 2. Agreement / Hire Type
                    </label>
                    <select
                      value={editingTemplate.hireType || 'all'}
                      onChange={(e) =>
                        setEditingTemplate({
                          ...editingTemplate,
                          hireType: e.target.value as AgreementHireType,
                        })
                      }
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white font-medium text-slate-800 focus:outline-none focus:border-indigo-500 cursor-pointer"
                    >
                      {HIRE_TYPE_OPTIONS.map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    <p className="text-[10px] text-slate-500 mt-1">
                      Ensures Weekly rentals load Weekly T&amp;Cs, and Claims load Claim T&amp;Cs.
                    </p>
                  </div>

                  {/* c) Target Page Position Dropdown */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-indigo-600" /> 3. Target Page Position
                    </label>
                    <select
                      value={editingTemplate.targetPagePosition || 'page_3_terms'}
                      onChange={(e) =>
                        setEditingTemplate({
                          ...editingTemplate,
                          targetPagePosition: e.target.value as TargetPagePosition,
                        })
                      }
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white font-medium text-slate-800 focus:outline-none focus:border-indigo-500 cursor-pointer"
                    >
                      {POSITION_OPTIONS.map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    <p className="text-[10px] text-slate-500 mt-1">
                      Where in the PDF assembly pipeline these clauses are printed.
                    </p>

                    {editingTemplate.targetPagePosition === 'custom_page' && (
                      <div className="mt-2 flex items-center gap-2">
                        <label className="text-[11px] text-slate-600 font-semibold">Custom Page #:</label>
                        <input
                          type="number"
                          min={1}
                          max={20}
                          value={editingTemplate.customPageNumber || 4}
                          onChange={(e) =>
                            setEditingTemplate({
                              ...editingTemplate,
                              customPageNumber: parseInt(e.target.value) || 4,
                            })
                          }
                          className="w-20 px-2 py-1 text-xs rounded border border-slate-300 bg-white"
                        />
                      </div>
                    )}
                  </div>

                  {/* d) Record Status / Trigger Condition */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-amber-500" /> 4. Record Status Trigger Condition
                    </label>
                    <select
                      value={editingTemplate.statusTrigger || 'any'}
                      onChange={(e) =>
                        setEditingTemplate({
                          ...editingTemplate,
                          statusTrigger: e.target.value as RecordStatusTrigger,
                        })
                      }
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white font-medium text-slate-800 focus:outline-none focus:border-indigo-500 cursor-pointer"
                    >
                      {TRIGGER_OPTIONS.map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    <p className="text-[10px] text-slate-500 mt-1">
                      Optionally activate only when record matches customer or payment status.
                    </p>
                  </div>
                </div>

                {/* Active Toggle & Priority */}
                <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-slate-200 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingTemplate.isActive ?? true}
                      onChange={(e) => setEditingTemplate({ ...editingTemplate, isActive: e.target.checked })}
                      className="w-4 h-4 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500"
                    />
                    <span className="font-semibold text-slate-800">
                      Enable &amp; Activate Template in Automated PDF Pipeline
                    </span>
                  </label>

                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 text-[11px]">Sort Priority:</span>
                    <input
                      type="number"
                      value={editingTemplate.priority || 10}
                      onChange={(e) => setEditingTemplate({ ...editingTemplate, priority: parseInt(e.target.value) || 0 })}
                      className="w-16 px-2 py-1 text-xs rounded border border-slate-300 bg-white"
                      title="Higher number takes priority when multiple rules match"
                    />
                  </div>
                </div>
              </div>

              {/* Clauses & Text Content */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Terms &amp; Conditions Clauses Content <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[10px] text-slate-400">
                    Numbered paragraphs (1., 2., 3.) are automatically formatted in the PDF
                  </span>
                </div>
                <textarea
                  rows={10}
                  value={editingTemplate.content || ''}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, content: e.target.value })}
                  placeholder="1. DEFINITIONS: In this agreement...\n2. PAYMENT: Rent is payable strictly...\n3. VEHICLE USE: The vehicle shall not be operated..."
                  className="w-full p-3 text-xs rounded-xl border border-slate-300 bg-white text-slate-900 font-mono leading-relaxed focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Revision Summary / Audit Note */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <History className="w-3.5 h-3.5 text-indigo-600" />
                    Revision Summary / Audit Note
                  </label>
                  <span className="text-[10px] text-slate-400">Recorded in Version History Tracker</span>
                </div>
                <input
                  type="text"
                  value={revisionNote}
                  onChange={(e) => setRevisionNote(e.target.value)}
                  placeholder="e.g. Updated Clause 2 late fee surcharge to £35 and amended return protocol"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsEditorOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-300 hover:bg-slate-100 text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSaveModal}
                disabled={isSavingDirect}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md hover:shadow-indigo-500/25 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                {isSavingDirect ? 'Saving...' : 'Save & Allocate Template'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── VERSION HISTORY TRACKER MODAL ── */}
      {historyModalTemplate && (
        <TermsVersionHistoryModal
          isOpen={!!historyModalTemplate}
          onClose={() => setHistoryModalTemplate(null)}
          template={historyModalTemplate}
          onRevert={handleRevertVersion}
          disabled={isReadOnly}
        />
      )}

      {/* ── DELETE TEMPLATE CONFIRMATION MODAL DIALOG ── */}
      {deletingTemplate && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="min-w-0 space-y-1">
                <h3 className="text-base font-bold text-slate-900 tracking-tight">
                  Delete T&amp;C Template
                </h3>
                <p className="text-sm font-semibold text-slate-800">
                  Are you sure you want to delete this T&amp;C template?
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-slate-900 truncate">{deletingTemplate.name}</span>
                <span className="font-mono text-[10px] text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200 shrink-0">
                  v{deletingTemplate.version || 1}
                </span>
              </div>
              <div className="text-[11px] font-mono text-slate-600 truncate bg-white p-2 rounded border border-slate-100">
                {deletingTemplate.title}
              </div>
              <p className="text-[11px] text-rose-600 font-medium">
                Warning: Purging this template will immediately remove it from all active document mappings and PDF compilations.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeletingTemplate(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-xs hover:shadow-rose-600/25 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete Template
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DynamicTermsManager;
