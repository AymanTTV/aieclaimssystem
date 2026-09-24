// src/components/common/TemplateQuickAccessModal.tsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  MessageSquare, 
  Mail, 
  Settings2, 
  Clock, 
  ExternalLink, 
  Search, 
  Copy, 
  Check, 
  Calendar, 
  ShieldCheck, 
  FileText, 
  Send,
  MessageCircle,
  AlertCircle
} from 'lucide-react';
import Modal from '../ui/Modal';
import { ROUTES } from '../../routes';
import toast from 'react-hot-toast';
import { loadTemplatesForCategory, AppMessageTemplate } from '../../utils/templateManager';
import { getBulkEmailTemplates, BulkEmailTemplate } from '../../jobs/mondayAutoEmailJob';

export type QuickAccessModalType = 'messageTemplates' | 'reminderTemplates' | 'mondayAutoEmail';

export interface TemplateQuickAccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: QuickAccessModalType;
  moduleName?: 'rentals' | 'maintenance' | 'claims' | 'driverPay' | 'invoices' | 'finance' | 'members';
  moduleTitle?: string;
  onDispatchWhatsApp?: () => void;
  onDispatchEmail?: () => void;
}

export const TemplateQuickAccessModal: React.FC<TemplateQuickAccessModalProps> = ({
  isOpen,
  onClose,
  type,
  moduleName = 'rentals',
  moduleTitle = 'Rental',
  onDispatchWhatsApp,
  onDispatchEmail,
}) => {
  const navigate = useNavigate();

  // Message templates state
  const [channel, setChannel] = useState<'whatsapp' | 'email'>('whatsapp');
  const [templates, setTemplates] = useState<AppMessageTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Reminder templates state
  const [reminderTemplates, setReminderTemplates] = useState<BulkEmailTemplate[]>([]);
  const [loadingReminders, setLoadingReminders] = useState(false);

  // Map module name to template manager category
  const categoryKey = useMemo(() => {
    switch (moduleName) {
      case 'rentals': return 'rental';
      case 'maintenance': return 'maintenance';
      case 'claims': return 'claim';
      case 'driverPay': return 'driverPay';
      case 'invoices': return 'invoice';
      case 'finance': return 'finance';
      case 'members': return 'members';
      default: return 'custom';
    }
  }, [moduleName]);

  // Load message templates
  const loadTemplates = useCallback(async () => {
    if (type !== 'messageTemplates') return;
    setLoading(true);
    try {
      const list = await loadTemplatesForCategory(categoryKey, channel);
      setTemplates(list);
    } catch (e) {
      console.error('Failed loading templates', e);
      toast.error('Failed loading templates');
    } finally {
      setLoading(false);
    }
  }, [categoryKey, channel, type]);

  // Load reminder templates
  const loadReminderTemplates = useCallback(async () => {
    if (type !== 'reminderTemplates') return;
    setLoadingReminders(true);
    try {
      const list = await getBulkEmailTemplates();
      setReminderTemplates(list);
    } catch (e) {
      console.error('Failed loading reminder templates', e);
    } finally {
      setLoadingReminders(false);
    }
  }, [type]);

  useEffect(() => {
    if (!isOpen) return;
    if (type === 'messageTemplates') {
      loadTemplates();
    } else if (type === 'reminderTemplates') {
      loadReminderTemplates();
    }
  }, [isOpen, type, channel, loadTemplates, loadReminderTemplates]);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success('Template copied to clipboard');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleNavigateToAutomationControl = () => {
    onClose();
    toast('Redirecting to Automation Control to manage templates...', { icon: '⚡' });
    navigate(ROUTES.AUTOMATION);
  };

  const handleNavigateToWhatsApp = () => {
    handleNavigateToAutomationControl();
  };

  const handleNavigateToBulkEmail = () => {
    handleNavigateToAutomationControl();
  };

  // Filtered message templates
  const filteredTemplates = useMemo(() => {
    if (!searchQuery.trim()) return templates;
    const q = searchQuery.toLowerCase();
    return templates.filter(
      t => t.name.toLowerCase().includes(q) ||
           (t.subjectTemplate && t.subjectTemplate.toLowerCase().includes(q)) ||
           t.bodyTemplate.toLowerCase().includes(q)
    );
  }, [templates, searchQuery]);

  // Modal Title
  const modalTitle = useMemo(() => {
    switch (type) {
      case 'messageTemplates':
        return `${moduleTitle} Message Templates`;
      case 'reminderTemplates':
        return `${moduleTitle} Reminder Templates`;
      case 'mondayAutoEmail':
        return `Monday Auto-Email Automation & Schedule`;
      default:
        return 'Templates & Automation';
    }
  }, [type, moduleTitle]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={modalTitle} size="lg">
      <div className="space-y-4">
        {/* ────────── 1. MESSAGE TEMPLATES VIEW ────────── */}
        {type === 'messageTemplates' && (
          <div>
            {/* Top Centralization Navigation Bar */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
              <div className="flex items-start gap-2.5">
                <div className="p-2 bg-blue-600 text-white rounded-lg shrink-0 mt-0.5">
                  <ExternalLink className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">
                    Centralized Template Management
                  </div>
                  <div className="text-[11px] text-slate-600">
                    Templates are read-only here. To create, edit, or delete templates, use the dedicated management page.
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={handleNavigateToAutomationControl}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-2xs transition-colors cursor-pointer"
                  title="Open Automation Control to create or edit templates"
                >
                  <Settings2 className="w-3.5 h-3.5" />
                  <span>Manage in Automation Control</span>
                </button>
              </div>
            </div>

            {/* Channel Tabs & Search Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
              <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200 shrink-0">
                <button
                  type="button"
                  onClick={() => setChannel('whatsapp')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    channel === 'whatsapp'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>WhatsApp ({templates.filter(t => t.channel === 'whatsapp' || t.channel === 'all' || !t.channel).length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setChannel('email')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    channel === 'email'
                      ? 'bg-sky-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Email ({templates.filter(t => t.channel === 'email' || t.channel === 'all' || !t.channel).length})</span>
                </button>
              </div>

              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search template name or text..."
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 focus:bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Templates List */}
            <div className="max-h-[50vh] overflow-y-auto space-y-2.5 pr-1">
              {loading ? (
                <div className="py-12 text-center text-xs text-slate-500">
                  Loading templates...
                </div>
              ) : filteredTemplates.length === 0 ? (
                <div className="py-10 text-center border-2 border-dashed border-slate-200 rounded-xl">
                  <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-slate-700">No {channel} templates found</p>
                  <p className="text-[11px] text-slate-500 mt-1 max-w-xs mx-auto">
                    {searchQuery ? 'Try a different search keyword.' : `You can create a new ${channel} template in the centralized management page.`}
                  </p>
                  <button
                    type="button"
                    onClick={channel === 'whatsapp' ? handleNavigateToWhatsApp : handleNavigateToBulkEmail}
                    className="mt-3 inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-lg shadow-2xs cursor-pointer"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>Create in {channel === 'whatsapp' ? 'WhatsApp' : 'Bulk Email'}</span>
                  </button>
                </div>
              ) : (
                filteredTemplates.map((t) => (
                  <div
                    key={t.id}
                    className="p-3.5 bg-slate-50/70 hover:bg-slate-50 border border-slate-200 rounded-xl transition-colors space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-xs font-bold text-slate-900 flex items-center gap-2">
                          <span>{t.name}</span>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-200 text-slate-700">
                            {t.category || 'General'}
                          </span>
                        </div>
                        {t.subjectTemplate && (
                          <div className="text-[11px] text-slate-600 mt-0.5">
                            <span className="font-semibold text-slate-700">Subject: </span>
                            {t.subjectTemplate}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleCopy(t.id, t.bodyTemplate)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                          title="Copy template text"
                        >
                          {copiedId === t.id ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-600" />
                              <span className="text-emerald-700">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3 text-slate-500" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>

                        {channel === 'whatsapp' && onDispatchWhatsApp && (
                          <button
                            type="button"
                            onClick={() => {
                              onClose();
                              onDispatchWhatsApp();
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                            title="Dispatch WhatsApp with this template"
                          >
                            <Send className="w-3 h-3" />
                            <span>Dispatch</span>
                          </button>
                        )}

                        {channel === 'email' && onDispatchEmail && (
                          <button
                            type="button"
                            onClick={() => {
                              onClose();
                              onDispatchEmail();
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-300 rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                            title="Dispatch Email with this template"
                          >
                            <Send className="w-3 h-3" />
                            <span>Dispatch</span>
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-xs font-mono text-slate-800 whitespace-pre-wrap max-h-32 overflow-y-auto leading-relaxed">
                      {t.bodyTemplate}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ────────── 2. REMINDER TEMPLATES VIEW ────────── */}
        {type === 'reminderTemplates' && (
          <div>
            {/* Top Centralization Navigation Bar */}
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
              <div className="flex items-start gap-2.5">
                <div className="p-2 bg-amber-600 text-white rounded-lg shrink-0 mt-0.5">
                  <Settings2 className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">
                    Centralized Reminder Sequence Management
                  </div>
                  <div className="text-[11px] text-slate-600">
                    Weekly and Daily reminder templates and sequences are configured exclusively in Bulk Email.
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleNavigateToBulkEmail}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg shadow-2xs transition-colors cursor-pointer self-end sm:self-auto shrink-0"
                title="Open Bulk Email to manage Reminder Templates"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Manage in Bulk Email</span>
              </button>
            </div>

            {/* Configured Reminder Templates List */}
            <div className="max-h-[50vh] overflow-y-auto space-y-3 pr-1">
              {loadingReminders ? (
                <div className="py-12 text-center text-xs text-slate-500">
                  Loading reminder templates...
                </div>
              ) : reminderTemplates.length === 0 ? (
                <div className="py-10 text-center border-2 border-dashed border-slate-200 rounded-xl">
                  <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-slate-700">No reminder templates loaded</p>
                  <p className="text-[11px] text-slate-500 mt-1 max-w-xs mx-auto">
                    Default weekly and daily reminder templates can be configured in Bulk Email.
                  </p>
                  <button
                    type="button"
                    onClick={handleNavigateToBulkEmail}
                    className="mt-3 inline-flex items-center gap-1 px-3 py-1.5 bg-amber-600 text-white text-xs font-bold rounded-lg shadow-2xs cursor-pointer"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>Open Bulk Email</span>
                  </button>
                </div>
              ) : (
                reminderTemplates.map((t) => (
                  <div
                    key={t.id}
                    className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">{t.name}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          t.targetType === 'weekly' 
                            ? 'bg-blue-100 text-blue-700 border border-blue-200' 
                            : 'bg-purple-100 text-purple-700 border border-purple-200'
                        }`}>
                          {t.targetType === 'weekly' ? 'Weekly Hire' : 'Daily Hire'}
                        </span>
                        {t.isDefault && (
                          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Default
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleCopy(t.id, t.bodyTemplate)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                      >
                        {copiedId === t.id ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-600" />
                            <span className="text-emerald-700">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3 text-slate-500" />
                            <span>Copy Text</span>
                          </>
                        )}
                      </button>
                    </div>

                    <div className="text-[11px] text-slate-600">
                      <span className="font-semibold text-slate-700">Subject: </span>
                      {t.subjectTemplate}
                    </div>

                    <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-xs font-mono text-slate-800 whitespace-pre-wrap max-h-32 overflow-y-auto leading-relaxed">
                      {t.bodyTemplate}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ────────── 3. MONDAY AUTO-EMAIL VIEW ────────── */}
        {type === 'mondayAutoEmail' && (
          <div className="space-y-4">
            {/* Top Centralization Navigation Bar */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <div className="p-2 bg-[#2563EB] text-white rounded-lg shrink-0 mt-0.5">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">
                    Centralized Automation & Scheduler Controls
                  </div>
                  <div className="text-[11px] text-slate-600">
                    Full automation triggers, per-rental toggles, and execution schedules are managed on the Bulk Email page.
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleNavigateToBulkEmail}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold rounded-lg shadow-2xs transition-colors cursor-pointer self-end sm:self-auto shrink-0"
                title="Open Bulk Email to manage schedule and execute automation"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open in Bulk Email</span>
              </button>
            </div>

            {/* Schedule & Rules Card */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <div className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Automation Schedule & Safety Rules
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-white border border-slate-200 rounded-lg flex items-start gap-2.5">
                  <Calendar className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                  <div>
                    <div className="font-bold text-slate-900">Weekly Schedule</div>
                    <div className="text-slate-600 mt-0.5">Every Monday at 09:00 AM</div>
                    <div className="text-[10px] font-mono text-slate-400 mt-0.5">Cron: 0 9 * * 1</div>
                  </div>
                </div>

                <div className="p-3 bg-white border border-slate-200 rounded-lg flex items-start gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                  <div>
                    <div className="font-bold text-slate-900">Claim Exclusions</div>
                    <div className="text-slate-600 mt-0.5">100% Guaranteed Exclusion</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">All Claim & Claims rentals are strictly ignored</div>
                  </div>
                </div>

                <div className="p-3 bg-white border border-slate-200 rounded-lg flex items-start gap-2.5">
                  <FileText className="w-4 h-4 text-indigo-600 mt-0.5 shrink-0" />
                  <div>
                    <div className="font-bold text-slate-900">Target Criteria</div>
                    <div className="text-slate-600 mt-0.5">Active rentals with balance owing</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">Dispatches statement breakdown without attachments</div>
                  </div>
                </div>

                <div className="p-3 bg-white border border-slate-200 rounded-lg flex items-start gap-2.5">
                  <Settings2 className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                  <div>
                    <div className="font-bold text-slate-900">Per-Rental Toggles</div>
                    <div className="text-slate-600 mt-0.5">Configurable in Bulk Email</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">Enable or disable auto-reminders individually</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg border border-slate-300 transition cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleNavigateToBulkEmail}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold rounded-lg shadow-xs transition cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Go to Central Automation (Bulk Email)</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default TemplateQuickAccessModal;
