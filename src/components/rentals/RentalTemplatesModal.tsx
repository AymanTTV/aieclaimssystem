import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  MessageCircle, 
  Mail, 
  Plus, 
  Search, 
  Lock, 
  Eye, 
  Copy, 
  Check, 
  Edit3, 
  Trash2, 
  Sparkles, 
  RotateCcw, 
  FileText,
  AlertCircle,
  ExternalLink
} from 'lucide-react';
import Modal from '../ui/Modal';
import { db } from '../../lib/firebase';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { emailTemplates } from '../../constants/emailTemplates';
import { usePermissions } from '../../hooks/usePermissions';
import RentalTemplateEditorModal, { RentalTemplateData, RENTAL_DATA_TOOLS } from './RentalTemplateEditorModal';
import { Rental, Vehicle, Customer } from '../../types';
import toast from 'react-hot-toast';

export interface RentalTemplatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'whatsapp' | 'email';
  rental?: Rental | null;
  customer?: Customer | null;
  vehicle?: Vehicle | null;
  onSelectTemplate?: (template: RentalTemplateData) => void;
}

export const RentalTemplatesModal: React.FC<RentalTemplatesModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'whatsapp',
  rental,
  customer,
  vehicle,
  onSelectTemplate,
}) => {
  const { can, isAdmin } = usePermissions();
  
  // Permission check: admin or explicit templateEdit permission
  const canEdit = isAdmin || can('rentals', 'templateEdit');
  const isReadOnly = !canEdit;

  // Active Navigation Tab: 'whatsapp' or 'email'
  const [activeTab, setActiveTab] = useState<'whatsapp' | 'email'>(initialTab);
  
  // Sync initial tab when opened
  useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  // State
  const [templates, setTemplates] = useState<RentalTemplateData[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [previewingId, setPreviewingId] = useState<string | null>(null);

  // Editor modal state
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState<'create' | 'edit'>('create');
  const [selectedTemplateForEdit, setSelectedTemplateForEdit] = useState<RentalTemplateData | null>(null);

  // Load templates from Firestore and fallbacks
  const loadTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'messageTemplates'));
      const list: RentalTemplateData[] = [];
      const seenIds = new Set<string>();

      if (!snap.empty) {
        snap.docs.forEach((d) => {
          const data = d.data() as any;
          list.push({
            id: d.id,
            name: data.name || 'Untitled Template',
            category: String(data.category || 'Rental').trim(),
            channel: (data.channel as 'all' | 'whatsapp' | 'email') || 'all',
            subjectTemplate: data.subjectTemplate || data.subject || '',
            bodyTemplate: data.bodyTemplate || data.body || '',
          });
          seenIds.add(d.id);
        });
      }

      // Add default system rental templates if not already in Firestore
      (emailTemplates.rental || []).forEach((et) => {
        if (!seenIds.has(et.id)) {
          list.push({
            id: et.id,
            name: et.name,
            category: 'Rental',
            channel: 'all',
            subjectTemplate: et.subjectTemplate,
            bodyTemplate: et.bodyTemplate,
          });
          seenIds.add(et.id);
        }
      });

      setTemplates(list);
    } catch (err) {
      console.error('Failed to load message templates:', err);
      toast.error('Failed to load templates from database');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadTemplates();
    }
  }, [isOpen, loadTemplates]);

  // Safe population of placeholders
  const populateString = useCallback((raw: string): string => {
    if (!raw) return '';
    let res = raw;
    RENTAL_DATA_TOOLS.forEach((tool) => {
      if (res.includes(tool.tag)) {
        let val = tool.sampleValue;
        if (rental) {
          if (tool.tag === '{client_name}') val = customer?.name || rental.customerName || val;
          if (tool.tag === '{agreement_number}') val = rental.rentalAgreementNumber || rental.id || val;
          if (tool.tag === '{vehicle_reg}') val = vehicle?.registrationNumber || rental.vehicleReg || val;
        }
        res = res.split(tool.tag).join(val);
      }
    });
    return res;
  }, [rental, customer, vehicle]);

  // Tab counts
  const whatsappCount = useMemo(() => {
    return templates.filter((t) => t.channel === 'whatsapp' || t.channel === 'all' || !t.channel).length;
  }, [templates]);

  const emailCount = useMemo(() => {
    return templates.filter((t) => t.channel === 'email' || t.channel === 'all' || !t.channel).length;
  }, [templates]);

  // Filtered list for active tab
  const filteredTemplates = useMemo(() => {
    return templates.filter((t) => {
      // Channel filtering
      if (activeTab === 'whatsapp') {
        if (t.channel !== 'whatsapp' && t.channel !== 'all' && t.channel) return false;
      } else if (activeTab === 'email') {
        if (t.channel !== 'email' && t.channel !== 'all' && t.channel) return false;
      }

      // Search filtering
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = t.name.toLowerCase().includes(q);
        const matchesSubject = (t.subjectTemplate || '').toLowerCase().includes(q);
        const matchesBody = t.bodyTemplate.toLowerCase().includes(q);
        const matchesCat = (t.category || '').toLowerCase().includes(q);
        if (!matchesName && !matchesSubject && !matchesBody && !matchesCat) return false;
      }

      // Category filtering
      if (categoryFilter !== 'all') {
        if ((t.category || 'Rental').toLowerCase() !== categoryFilter.toLowerCase()) return false;
      }

      return true;
    });
  }, [templates, activeTab, searchQuery, categoryFilter]);

  // Categories list
  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    templates.forEach((t) => {
      if (t.category) set.add(t.category);
    });
    return Array.from(set);
  }, [templates]);

  // Actions
  const handleCopy = (t: RentalTemplateData) => {
    const text = t.bodyTemplate;
    navigator.clipboard.writeText(text);
    setCopiedId(t.id || 'copied');
    toast.success(`Copied template "${t.name}" to clipboard`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleOpenCreate = () => {
    if (isReadOnly) {
      toast.error('You have read-only access. You do not have permission to create templates.');
      return;
    }
    setSelectedTemplateForEdit(null);
    setEditorMode('create');
    setEditorOpen(true);
  };

  const handleOpenEdit = (t: RentalTemplateData) => {
    setSelectedTemplateForEdit(t);
    setEditorMode('edit');
    setEditorOpen(true);
  };

  const handleDeleteTemplate = async (t: RentalTemplateData) => {
    if (isReadOnly) {
      toast.error('You do not have permission to delete templates (Read-Only access)');
      return;
    }
    if (!t.id) return;
    if (!window.confirm(`Are you sure you want to delete "${t.name}"?`)) return;

    try {
      await deleteDoc(doc(db, 'messageTemplates', t.id));
      toast.success(`Template "${t.name}" deleted`);
      loadTemplates();
    } catch (err) {
      console.error('Delete template error:', err);
      toast.error('Failed to delete template');
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Rental Communication Templates"
        size="3xl"
        contentClassName="p-4 sm:p-5 flex flex-col overflow-hidden max-h-[88vh]"
      >
        <div className="flex flex-col h-full space-y-3 text-slate-200 min-h-0">
          {/* Top Controls Container - Pinned at top */}
          <div className="shrink-0 space-y-3">
            {/* Permission Status Banner if Read Only */}
            {isReadOnly ? (
              <div className="flex items-start gap-3 p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-200 text-xs">
                <Lock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-amber-300 mr-1.5">Read-Only Mode:</span>
                  You have permission to view, search, and copy templates. Editing and creating templates requires the <span className="underline font-semibold">Edit Message Templates</span> permission in User Roles.
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-200 text-xs">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>You have full permission to <strong>create, customize, and edit</strong> all WhatsApp and Email templates.</span>
                </div>
                <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 font-semibold rounded-md text-[11px] border border-emerald-500/30">
                  Editor Access
                </span>
              </div>
            )}

            {/* MODAL NAVIGATION TABS (WhatsApp vs Email) */}
            <div className="flex items-center justify-between border-b border-[#2B314E] pb-0">
              <div className="flex space-x-2">
                {/* WhatsApp Tab */}
                <button
                  type="button"
                  onClick={() => setActiveTab('whatsapp')}
                  className={`flex items-center gap-2 px-4 py-2 text-sm font-bold transition-all border-b-2 cursor-pointer ${
                    activeTab === 'whatsapp'
                      ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10 rounded-t-lg shadow-sm'
                      : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-[#16192B] rounded-t-lg'
                  }`}
                >
                  <div className={`p-1 rounded-md ${activeTab === 'whatsapp' ? 'bg-emerald-500 text-slate-950' : 'bg-[#1E2338] text-emerald-400'}`}>
                    <MessageCircle className="w-4 h-4" />
                  </div>
                  <span>WhatsApp Templates</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                    activeTab === 'whatsapp' ? 'bg-emerald-500/25 text-emerald-300' : 'bg-[#1E2338] text-slate-400'
                  }`}>
                    {whatsappCount}
                  </span>
                </button>

                {/* Email Tab */}
                <button
                  type="button"
                  onClick={() => setActiveTab('email')}
                  className={`flex items-center gap-2 px-4 py-2 text-sm font-bold transition-all border-b-2 cursor-pointer ${
                    activeTab === 'email'
                      ? 'border-sky-500 text-sky-400 bg-sky-500/10 rounded-t-lg shadow-sm'
                      : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-[#16192B] rounded-t-lg'
                  }`}
                >
                  <div className={`p-1 rounded-md ${activeTab === 'email' ? 'bg-sky-500 text-slate-950' : 'bg-[#1E2338] text-sky-400'}`}>
                    <Mail className="w-4 h-4" />
                  </div>
                  <span>Email Templates</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                    activeTab === 'email' ? 'bg-sky-500/25 text-sky-300' : 'bg-[#1E2338] text-slate-400'
                  }`}>
                    {emailCount}
                  </span>
                </button>
              </div>

              {/* Top Action: Create Template */}
              <div className="pb-2">
                <button
                  type="button"
                  onClick={handleOpenCreate}
                  disabled={isReadOnly}
                  title={isReadOnly ? 'You do not have permission to create templates' : 'Create new template'}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all shadow-sm ${
                    isReadOnly
                      ? 'bg-[#1E2338] text-slate-500 border border-[#2B314E] cursor-not-allowed opacity-60'
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer active:scale-95'
                  }`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Create Template</span>
                </button>
              </div>
            </div>

            {/* Search, Filter, and Refresh Controls */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 bg-[#121524] border border-[#2B314E] p-2.5 rounded-xl">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={`Search ${activeTab === 'whatsapp' ? 'WhatsApp' : 'Email'} templates by name or content...`}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#0F111A] text-white border border-[#2B314E] rounded-lg focus:outline-none focus:border-indigo-500 placeholder-slate-500"
                />
              </div>

              {/* Category Filter Pills */}
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">Category:</span>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="px-2.5 py-1 text-xs bg-[#0F111A] text-slate-200 border border-[#2B314E] rounded-lg focus:outline-none focus:border-indigo-500"
                >
                  <option value="all">All Categories</option>
                  {availableCategories.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={loadTemplates}
                  disabled={loading}
                  title="Refresh templates from database"
                  className="p-1.5 text-slate-300 bg-[#16192A] hover:bg-[#1E2338] border border-[#2B314E] rounded-lg cursor-pointer disabled:opacity-50 transition-colors"
                >
                  <RotateCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
                </button>
              </div>
            </div>
          </div>

          {/* Templates Grid / List - Unified single smooth scroll container */}
          <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-3 custom-scrollbar">
            {loading ? (
              <div className="text-center py-12 text-slate-400">
                <RotateCcw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-400" />
                <p className="text-xs">Loading {activeTab} templates...</p>
              </div>
            ) : filteredTemplates.length === 0 ? (
              <div className="text-center py-10 bg-[#121524] border border-[#2B314E] rounded-xl p-6">
                <FileText className="w-8 h-8 text-slate-500 mx-auto mb-2" />
                <h5 className="text-sm font-bold text-white mb-1">No templates found</h5>
                <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4">
                  {searchQuery 
                    ? `No ${activeTab} templates match your search "${searchQuery}".` 
                    : `No templates configured for ${activeTab}. Click "+ Create Template" above to add one.`}
                </p>
                {!isReadOnly && (
                  <button
                    type="button"
                    onClick={handleOpenCreate}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Create First Template
                  </button>
                )}
              </div>
            ) : (
              filteredTemplates.map((t) => {
                const isPreviewing = previewingId === t.id;
                const evaluatedBody = populateString(t.bodyTemplate);
                const evaluatedSubject = populateString(t.subjectTemplate || '');

                return (
                  <div
                    key={t.id || t.name}
                    className="bg-[#121524] border border-[#2B314E] hover:border-slate-600 rounded-xl p-3.5 transition-all space-y-2.5 shadow-sm"
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-bold text-white tracking-wide">
                            {t.name}
                          </h4>

                          {/* Category Badge */}
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-[#1E2338] text-indigo-300 border border-[#2B314E]">
                            {t.category || 'Rental'}
                          </span>

                          {/* Channel Badge */}
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 border ${
                            t.channel === 'whatsapp'
                              ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                              : t.channel === 'email'
                                ? 'bg-sky-500/15 text-sky-300 border-sky-500/30'
                                : 'bg-purple-500/15 text-purple-300 border-purple-500/30'
                          }`}>
                            {t.channel === 'whatsapp' && <MessageCircle className="w-3 h-3" />}
                            {t.channel === 'email' && <Mail className="w-3 h-3" />}
                            {t.channel === 'all' && <Sparkles className="w-3 h-3" />}
                            <span>{t.channel === 'all' || !t.channel ? 'WhatsApp & Email' : t.channel}</span>
                          </span>
                        </div>

                        {/* Subject Line for Email */}
                        {t.subjectTemplate && (
                          <div className="text-xs text-slate-300 flex items-center gap-1.5">
                            <span className="text-slate-500 font-semibold">Subject:</span>
                            <span className="text-slate-200 font-medium">
                              {isPreviewing ? evaluatedSubject : t.subjectTemplate}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Top Action Buttons */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {/* Use Template in Parent modal if onSelectTemplate provided */}
                        {onSelectTemplate && (
                          <button
                            type="button"
                            onClick={() => {
                              onSelectTemplate(t);
                              onClose();
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-emerald-300 bg-emerald-950/50 hover:bg-emerald-900/60 border border-emerald-500/40 rounded-lg cursor-pointer transition-colors"
                            title="Select and use this template in communication"
                          >
                            <Check className="w-3 h-3" />
                            <span>Use</span>
                          </button>
                        )}

                        {/* Quick Preview Toggle */}
                        <button
                          type="button"
                          onClick={() => setPreviewingId(isPreviewing ? null : (t.id || 'preview'))}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                            isPreviewing
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                              : 'bg-[#181C2E] text-slate-300 hover:text-white border-[#2B314E] hover:bg-[#20253D]'
                          }`}
                          title="Toggle live evaluation with active rental data"
                        >
                          <Eye className="w-3 h-3" />
                          <span>{isPreviewing ? 'Live View' : 'Preview'}</span>
                        </button>

                        {/* Copy Body */}
                        <button
                          type="button"
                          onClick={() => handleCopy(t)}
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-slate-300 hover:text-white bg-[#181C2E] hover:bg-[#20253D] border border-[#2B314E] rounded-lg cursor-pointer transition-colors"
                          title="Copy raw template body"
                        >
                          {copiedId === t.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        </button>

                        {/* Edit or View Template */}
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(t)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                            isReadOnly
                              ? 'bg-[#181C2E] text-slate-300 hover:text-white border-[#2B314E]'
                              : 'bg-indigo-950/60 hover:bg-indigo-900/70 text-indigo-300 border-indigo-500/40'
                          }`}
                          title={isReadOnly ? 'View template details (read-only)' : 'Edit template'}
                        >
                          {isReadOnly ? <Lock className="w-3 h-3 text-amber-400" /> : <Edit3 className="w-3 h-3" />}
                          <span>{isReadOnly ? 'View' : 'Edit'}</span>
                        </button>

                        {/* Delete (only if edit permission) */}
                        {!isReadOnly && t.id && (
                          <button
                            type="button"
                            onClick={() => handleDeleteTemplate(t)}
                            className="p-1 text-slate-400 hover:text-red-400 bg-[#181C2E] hover:bg-red-950/50 border border-[#2B314E] hover:border-red-500/40 rounded-lg cursor-pointer transition-colors"
                            title="Delete template"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Body Snippet Box - Clean display without nested scrollbars */}
                    <div className={`p-3 rounded-lg border text-xs font-sans leading-relaxed whitespace-pre-wrap ${
                      isPreviewing 
                        ? 'bg-[#0B0D14] text-amber-200 border-amber-500/30' 
                        : 'bg-[#0F111A] text-slate-300 border-[#2B314E]'
                    }`}>
                      {isPreviewing && (
                        <div className="text-[10px] font-bold uppercase tracking-wider text-amber-400 mb-1 flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          <span>Evaluated with Real Data</span>
                        </div>
                      )}
                      {isPreviewing ? evaluatedBody : t.bodyTemplate}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Modal Footer - Pinned at bottom */}
          <div className="shrink-0 flex items-center justify-between pt-2.5 border-t border-[#2B314E]">
            <div className="text-xs text-slate-400">
              Showing <strong className="text-white">{filteredTemplates.length}</strong> {activeTab} templates
            </div>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 text-sm font-semibold text-slate-200 bg-[#181C2E] hover:bg-[#22273F] border border-[#2B314E] rounded-lg cursor-pointer transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </Modal>

      {/* Embedded Template Editor (Respects Read-Only) */}
      <RentalTemplateEditorModal
        isOpen={editorOpen}
        onClose={() => setEditorOpen(false)}
        templateToEdit={selectedTemplateForEdit}
        mode={editorMode}
        rental={rental}
        customer={customer}
        vehicle={vehicle}
        readOnly={isReadOnly}
        onSaved={(id) => {
          loadTemplates();
          setEditorOpen(false);
        }}
        onDeleted={(id) => {
          loadTemplates();
          setEditorOpen(false);
        }}
      />
    </>
  );
};

export default RentalTemplatesModal;
