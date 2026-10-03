// src/components/company/TermsVersionHistoryModal.tsx
import React, { useState, useMemo } from 'react';
import {
  DynamicTermTemplate,
  TermTemplateVersion,
  DocumentScope,
  AgreementHireType,
  TargetPagePosition,
  RecordStatusTrigger,
} from '../../utils/documentTemplateTerms';
import {
  X,
  History,
  RotateCcw,
  CheckCircle2,
  GitCompare,
  FileText,
  User,
  Clock,
  ArrowRight,
  Plus,
  Minus,
  AlertCircle,
  Sparkles,
  Layers,
  Tag,
  MapPin,
  Zap,
  Check,
  ChevronRight,
  Eye,
  Columns,
  AlignLeft,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface TermsVersionHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  template: DynamicTermTemplate;
  onRevert: (versionToRevert: TermTemplateVersion, changeNote?: string) => Promise<void> | void;
  disabled?: boolean;
}

interface ClauseDiffItem {
  type: 'added' | 'removed' | 'modified' | 'unchanged';
  oldText?: string;
  newText?: string;
  clauseNumber?: string;
}

export const TermsVersionHistoryModal: React.FC<TermsVersionHistoryModalProps> = ({
  isOpen,
  onClose,
  template,
  onRevert,
  disabled = false,
}) => {
  if (!isOpen) return null;

  // Build complete list of versions:
  // If template has versionHistory, use it. Ensure current active version is represented.
  const versions: TermTemplateVersion[] = useMemo(() => {
    const history = template.versionHistory || [];
    const currentVersionNum = template.version || 1;

    // Check if the current active state is already in history
    const hasCurrent = history.some(
      (v) => v.versionNumber === currentVersionNum && v.content === template.content
    );

    if (!hasCurrent) {
      const currentSnapshot: TermTemplateVersion = {
        versionId: `ver_active_${template.id}`,
        versionNumber: currentVersionNum,
        timestamp: template.updatedAt || new Date().toISOString(),
        authorName: template.updatedBy || 'Current Active',
        authorEmail: 'current@aieskyline.co.uk',
        changeNote: 'Current active iteration routed to PDF documents',
        name: template.name,
        title: template.title,
        content: template.content,
        documentScope: template.documentScope,
        hireType: template.hireType,
        targetPagePosition: template.targetPagePosition,
        customPageNumber: template.customPageNumber,
        statusTrigger: template.statusTrigger,
        isActive: template.isActive,
      };
      // Return newest first
      return [currentSnapshot, ...history.filter((v) => v.versionId !== currentSnapshot.versionId)];
    }

    return [...history].sort((a, b) => b.versionNumber - a.versionNumber);
  }, [template]);

  // Selected historical version to view/compare (defaults to previous version if exists, else first)
  const [selectedVersionId, setSelectedVersionId] = useState<string>(() => {
    if (versions.length > 1) {
      return versions[1].versionId; // The previous version before active
    }
    return versions[0]?.versionId || '';
  });

  // Target comparison version (defaults to the current active / latest version)
  const [compareTargetId, setCompareTargetId] = useState<string>(versions[0]?.versionId || '');

  // View Mode: 'compare' | 'preview'
  const [viewMode, setViewMode] = useState<'compare' | 'preview'>('compare');
  // Diff Layout: 'unified' | 'sideBySide'
  const [diffLayout, setDiffLayout] = useState<'unified' | 'sideBySide'>('unified');

  // Confirmation state for revert action
  const [isConfirmingRevert, setIsConfirmingRevert] = useState(false);
  const [revertNote, setRevertNote] = useState('');
  const [isReverting, setIsReverting] = useState(false);

  const selectedVersion = useMemo(
    () => versions.find((v) => v.versionId === selectedVersionId) || versions[0],
    [versions, selectedVersionId]
  );

  const compareTarget = useMemo(
    () => versions.find((v) => v.versionId === compareTargetId) || versions[0],
    [versions, compareTargetId]
  );

  const isCurrentActiveSelected = selectedVersion?.versionId === versions[0]?.versionId;

  // Clause-by-clause diff algorithm
  const clauseDiff = useMemo((): {
    items: ClauseDiffItem[];
    addedCount: number;
    removedCount: number;
    modifiedCount: number;
    unchangedCount: number;
    hasRoutingDiff: boolean;
  } => {
    if (!selectedVersion || !compareTarget) {
      return { items: [], addedCount: 0, removedCount: 0, modifiedCount: 0, unchangedCount: 0, hasRoutingDiff: false };
    }

    // Split text into clauses/paragraphs
    const parseClauses = (text: string) =>
      text
        .split(/\r?\n+/)
        .map((line) => line.trim())
        .filter(Boolean);

    const oldClauses = parseClauses(selectedVersion.content);
    const newClauses = parseClauses(compareTarget.content);

    const items: ClauseDiffItem[] = [];
    let added = 0;
    let removed = 0;
    let modified = 0;
    let unchanged = 0;

    const maxLen = Math.max(oldClauses.length, newClauses.length);

    for (let i = 0; i < maxLen; i++) {
      const oldC = oldClauses[i];
      const newC = newClauses[i];

      if (oldC && newC) {
        if (oldC === newC) {
          items.push({ type: 'unchanged', oldText: oldC, newText: newC });
          unchanged++;
        } else {
          items.push({ type: 'modified', oldText: oldC, newText: newC });
          modified++;
        }
      } else if (newC && !oldC) {
        items.push({ type: 'added', newText: newC });
        added++;
      } else if (oldC && !newC) {
        items.push({ type: 'removed', oldText: oldC });
        removed++;
      }
    }

    const hasRoutingDiff =
      selectedVersion.documentScope !== compareTarget.documentScope ||
      selectedVersion.hireType !== compareTarget.hireType ||
      selectedVersion.targetPagePosition !== compareTarget.targetPagePosition ||
      selectedVersion.statusTrigger !== compareTarget.statusTrigger ||
      selectedVersion.title !== compareTarget.title;

    return {
      items,
      addedCount: added,
      removedCount: removed,
      modifiedCount: modified,
      unchangedCount: unchanged,
      hasRoutingDiff,
    };
  }, [selectedVersion, compareTarget]);

  // Handle Revert
  const handleExecuteRevert = async () => {
    if (!selectedVersion) return;
    setIsReverting(true);
    try {
      const note =
        revertNote.trim() ||
        `Reverted to iteration v${selectedVersion.versionNumber} (from ${new Date(selectedVersion.timestamp).toLocaleDateString()})`;
      await onRevert(selectedVersion, note);
      setIsConfirmingRevert(false);
      onClose();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to revert version.');
    } finally {
      setIsReverting(false);
    }
  };

  const formatDateLabel = (ts: string) => {
    try {
      const date = new Date(ts);
      return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return ts;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/75 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-auto">
        {/* ── HEADER ── */}
        <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/20 border border-indigo-400/30 text-indigo-300">
              <History className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-300">
                  Version History Tracker
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 font-mono font-semibold">
                  v{template.version || 1} Active
                </span>
                <span className="text-slate-400 text-xs">•</span>
                <span className="text-xs text-slate-300 font-medium">
                  {versions.length} {versions.length === 1 ? 'Recorded Version' : 'Recorded Iterations'}
                </span>
              </div>
              <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                <span>{template.name}</span>
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ── SUBHEADER CONTROLS & DIFF STATS ── */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          {/* Mode switch */}
          <div className="flex items-center gap-1.5 bg-slate-200/80 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setViewMode('compare')}
              className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'compare'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <GitCompare className="w-3.5 h-3.5" />
              <span>Compare Diff</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('preview')}
              className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'preview'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Full Text Preview</span>
            </button>
          </div>

          {/* Diff stats bar when comparing */}
          {viewMode === 'compare' && (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-[11px] font-medium">
                {clauseDiff.addedCount > 0 && (
                  <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">
                    +{clauseDiff.addedCount} Added
                  </span>
                )}
                {clauseDiff.modifiedCount > 0 && (
                  <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 font-bold">
                    ~{clauseDiff.modifiedCount} Modified
                  </span>
                )}
                {clauseDiff.removedCount > 0 && (
                  <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 font-bold">
                    -{clauseDiff.removedCount} Removed
                  </span>
                )}
                {clauseDiff.unchangedCount > 0 && (
                  <span className="text-slate-500">
                    {clauseDiff.unchangedCount} unchanged clauses
                  </span>
                )}
                {clauseDiff.hasRoutingDiff && (
                  <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 font-bold">
                    Routing Settings Modified
                  </span>
                )}
              </div>

              {/* Layout mode switcher */}
              <div className="flex items-center gap-1 bg-slate-200/80 p-0.5 rounded-lg">
                <button
                  type="button"
                  onClick={() => setDiffLayout('unified')}
                  title="Unified Diff View"
                  className={`p-1.5 rounded transition-all cursor-pointer ${
                    diffLayout === 'unified'
                      ? 'bg-white text-indigo-700 shadow-xs'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <AlignLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setDiffLayout('sideBySide')}
                  title="Side-by-Side Diff View"
                  className={`p-1.5 rounded transition-all cursor-pointer ${
                    diffLayout === 'sideBySide'
                      ? 'bg-white text-indigo-700 shadow-xs'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <Columns className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── MAIN BODY: TWO COLUMNS ── */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-12">
          {/* ── LEFT COLUMN: VERSION TIMELINE (4 cols) ── */}
          <div className="md:col-span-4 border-r border-slate-200 bg-slate-50/50 p-4 overflow-y-auto space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-indigo-600" />
                Revision History
              </span>
              <span className="text-[10px] text-slate-400 font-normal">Newest First</span>
            </div>

            <div className="space-y-2.5">
              {versions.map((ver, idx) => {
                const isSelected = ver.versionId === selectedVersionId;
                const isCurrent = idx === 0;

                return (
                  <button
                    key={ver.versionId}
                    type="button"
                    onClick={() => setSelectedVersionId(ver.versionId)}
                    className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer relative ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-50/80 shadow-xs ring-1 ring-indigo-500/30'
                        : 'border-slate-200 bg-white hover:border-indigo-300 hover:bg-slate-50/80'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                            isCurrent
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : 'bg-slate-100 text-slate-700 border border-slate-300'
                          }`}
                        >
                          v{ver.versionNumber}
                        </span>
                        {isCurrent && (
                          <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-700">
                            Active
                          </span>
                        )}
                      </div>

                      <span className="text-[10px] text-slate-500 font-medium whitespace-nowrap">
                        {formatDateLabel(ver.timestamp)}
                      </span>
                    </div>

                    <p className="text-xs font-semibold text-slate-900 line-clamp-1">
                      {ver.title}
                    </p>

                    {ver.changeNote && (
                      <p className="text-[11px] text-slate-600 line-clamp-2 mt-1 italic">
                        "{ver.changeNote}"
                      </p>
                    )}

                    <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-100 text-[10px] text-slate-500">
                      <User className="w-3 h-3 text-slate-400" />
                      <span className="truncate">{ver.authorName || 'System'}</span>
                      <span className="text-slate-300">•</span>
                      <span className="capitalize">{ver.hireType}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── RIGHT COLUMN: DIFF & INSPECTOR (8 cols) ── */}
          <div className="md:col-span-8 p-5 overflow-y-auto space-y-4 bg-white flex flex-col justify-between">
            <div className="space-y-4">
              {/* Header Box for Comparison Targets */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Comparing Version
                  </span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="font-mono font-bold text-slate-800 bg-slate-200 px-1.5 py-0.5 rounded text-xs">
                      v{selectedVersion.versionNumber}
                    </span>
                    <span className="font-semibold text-slate-700 truncate max-w-[200px]">
                      {selectedVersion.name}
                    </span>
                    <span className="text-slate-400">({formatDateLabel(selectedVersion.timestamp)})</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <ArrowRight className="w-4 h-4 text-slate-400 hidden sm:block" />
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Compared With
                    </span>
                    <select
                      value={compareTargetId}
                      onChange={(e) => setCompareTargetId(e.target.value)}
                      className="mt-0.5 px-2.5 py-1 text-xs font-semibold rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:border-indigo-500 cursor-pointer"
                    >
                      {versions.map((v, i) => (
                        <option key={v.versionId} value={v.versionId}>
                          v{v.versionNumber} {i === 0 ? '(Current Active)' : ''} — {formatDateLabel(v.timestamp)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* ── ROUTING CONFIGURATION DIFF ── */}
              {clauseDiff.hasRoutingDiff && (
                <div className="p-3.5 bg-amber-50/60 border border-amber-200 rounded-xl space-y-2 text-xs">
                  <span className="font-bold text-amber-900 flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                    Allocation &amp; Routing Parameter Changes
                  </span>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                    <div className="bg-white/80 p-2 rounded-lg border border-amber-200/60">
                      <span className="text-slate-500 block text-[10px]">Document Scope</span>
                      <span className="font-mono font-bold text-slate-700">
                        {selectedVersion.documentScope} → {compareTarget.documentScope}
                      </span>
                    </div>

                    <div className="bg-white/80 p-2 rounded-lg border border-amber-200/60">
                      <span className="text-slate-500 block text-[10px]">Hire Type</span>
                      <span className="font-mono font-bold text-slate-700">
                        {selectedVersion.hireType} → {compareTarget.hireType}
                      </span>
                    </div>

                    <div className="bg-white/80 p-2 rounded-lg border border-amber-200/60">
                      <span className="text-slate-500 block text-[10px]">Page Position</span>
                      <span className="font-mono font-bold text-slate-700">
                        {selectedVersion.targetPagePosition} → {compareTarget.targetPagePosition}
                      </span>
                    </div>

                    <div className="bg-white/80 p-2 rounded-lg border border-amber-200/60">
                      <span className="text-slate-500 block text-[10px]">Trigger Condition</span>
                      <span className="font-mono font-bold text-slate-700">
                        {selectedVersion.statusTrigger} → {compareTarget.statusTrigger}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* ── CLAUSE DIFF CONTENT ── */}
              {viewMode === 'compare' ? (
                diffLayout === 'unified' ? (
                  /* Unified Diff View */
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                      Unified Legal Clauses Diff
                    </span>

                    <div className="border border-slate-200 rounded-xl overflow-hidden font-mono text-xs">
                      {clauseDiff.items.map((item, idx) => {
                        if (item.type === 'added') {
                          return (
                            <div
                              key={idx}
                              className="p-3 bg-emerald-50 text-emerald-900 border-b border-emerald-100 flex items-start gap-2"
                            >
                              <Plus className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                              <div className="flex-1 whitespace-pre-wrap leading-relaxed">
                                {item.newText}
                              </div>
                            </div>
                          );
                        }

                        if (item.type === 'removed') {
                          return (
                            <div
                              key={idx}
                              className="p-3 bg-rose-50 text-rose-900 line-through border-b border-rose-100 flex items-start gap-2"
                            >
                              <Minus className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                              <div className="flex-1 whitespace-pre-wrap leading-relaxed opacity-85">
                                {item.oldText}
                              </div>
                            </div>
                          );
                        }

                        if (item.type === 'modified') {
                          return (
                            <div key={idx} className="border-b border-slate-200">
                              <div className="p-3 bg-rose-50/70 text-rose-900 line-through flex items-start gap-2">
                                <Minus className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                                <div className="flex-1 whitespace-pre-wrap leading-relaxed">
                                  {item.oldText}
                                </div>
                              </div>
                              <div className="p-3 bg-emerald-50 text-emerald-900 flex items-start gap-2">
                                <Plus className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                                <div className="flex-1 whitespace-pre-wrap leading-relaxed">
                                  {item.newText}
                                </div>
                              </div>
                            </div>
                          );
                        }

                        return (
                          <div
                            key={idx}
                            className="p-3 bg-white text-slate-700 border-b border-slate-100 flex items-start gap-2"
                          >
                            <span className="w-4 text-center text-slate-300 select-none">•</span>
                            <div className="flex-1 whitespace-pre-wrap leading-relaxed">
                              {item.oldText}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  /* Side-by-Side Diff View */
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                      Side-by-Side Comparison
                    </span>

                    <div className="grid grid-cols-2 gap-3 font-mono text-xs">
                      {/* Left: Selected historical version */}
                      <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50/40">
                        <div className="bg-slate-100 px-3 py-2 border-b border-slate-200 font-bold text-slate-700 flex items-center justify-between text-[11px]">
                          <span>Iteration v{selectedVersion.versionNumber}</span>
                          <span className="font-normal text-slate-500">
                            {formatDateLabel(selectedVersion.timestamp)}
                          </span>
                        </div>
                        <div className="p-3 space-y-2 whitespace-pre-wrap leading-relaxed text-slate-700 text-xs">
                          {selectedVersion.content}
                        </div>
                      </div>

                      {/* Right: Compare target (Current) */}
                      <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                        <div className="bg-indigo-50 px-3 py-2 border-b border-indigo-200 font-bold text-indigo-900 flex items-center justify-between text-[11px]">
                          <span>Iteration v{compareTarget.versionNumber}</span>
                          <span className="font-normal text-indigo-600">
                            {formatDateLabel(compareTarget.timestamp)}
                          </span>
                        </div>
                        <div className="p-3 space-y-2 whitespace-pre-wrap leading-relaxed text-slate-800 text-xs">
                          {compareTarget.content}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              ) : (
                /* Full Text Preview Mode */
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Legal Document Title (Printed on PDF)
                    </label>
                    <div className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-bold text-slate-900 text-xs font-mono">
                      {selectedVersion.title}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Full Text Clauses of v{selectedVersion.versionNumber}
                    </label>
                    <div className="p-4 rounded-xl border border-slate-200 bg-slate-900 text-slate-100 font-mono text-xs whitespace-pre-wrap leading-relaxed max-h-96 overflow-y-auto">
                      {selectedVersion.content}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ── ACTION FOOTER / REVERT CONTROLS ── */}
            <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-4">
              <div className="text-xs text-slate-500">
                {isCurrentActiveSelected ? (
                  <span className="flex items-center gap-1.5 text-emerald-600 font-semibold">
                    <CheckCircle2 className="w-4 h-4" />
                    Viewing Current Active Version (Currently applied to documents)
                  </span>
                ) : (
                  <span>
                    Viewing past iteration <strong>v{selectedVersion.versionNumber}</strong> from{' '}
                    {formatDateLabel(selectedVersion.timestamp)}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
                >
                  Close
                </button>

                {!isCurrentActiveSelected && (
                  <>
                    {isConfirmingRevert ? (
                      <div className="flex items-center gap-2 bg-rose-50 p-1.5 rounded-xl border border-rose-200">
                        <input
                          type="text"
                          placeholder="Revert reason / audit note..."
                          value={revertNote}
                          onChange={(e) => setRevertNote(e.target.value)}
                          className="px-2.5 py-1 text-xs rounded border border-rose-300 bg-white text-slate-800 w-48 sm:w-60 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={handleExecuteRevert}
                          disabled={isReverting || disabled}
                          className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                        >
                          {isReverting ? (
                            <span>Reverting...</span>
                          ) : (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>Confirm Revert to v{selectedVersion.versionNumber}</span>
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsConfirmingRevert(false)}
                          className="p-1 rounded text-slate-500 hover:text-slate-800 cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setIsConfirmingRevert(true)}
                        disabled={disabled}
                        className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                        title="Revert this template to this exact historical version"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Revert to v{selectedVersion.versionNumber}</span>
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TermsVersionHistoryModal;
