// src/components/rentals/MondayAutoEmailBulkModal.tsx
import React, { useState, useMemo, useEffect } from 'react';
import { 
  Mail, 
  X, 
  CheckCircle2, 
  XCircle, 
  Play, 
  Loader2, 
  Search, 
  Filter, 
  AlertTriangle, 
  DollarSign, 
  Car, 
  User,
  RefreshCw,
  Settings2,
  Calendar,
  Clock,
  ShieldCheck,
  Tag,
  Edit3,
  Sparkles,
  Send
} from 'lucide-react';
import { Rental, Vehicle, Customer } from '../../types';
import { db } from '../../lib/firebase';
import { doc, writeBatch, updateDoc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { 
  runMondayAutoEmailJob, 
  isClaimRental,
  getBulkEmailTemplates,
  sendSingleRentalTestEmail,
  BulkEmailTemplate,
  DEFAULT_BULK_WEEKLY_TEMPLATE,
  DEFAULT_BULK_DAILY_TEMPLATE
} from '../../jobs/mondayAutoEmailJob';
import { useFormattedDisplay } from '../../hooks/useFormattedDisplay';
import { RentalReminderTemplateSelector } from './RentalReminderTemplateSelector';
import { BulkEmailTemplateSearchableSelect } from './BulkEmailTemplateSearchableSelect';
import { BulkEmailTemplateEditorModal } from './BulkEmailTemplateEditorModal';
import { Modal } from '../ui/Modal';
import {
  fetchSchedulerPreferences,
  getDayInfo,
  formatTime12h,
  generateCronExpression,
} from '../../utils/schedulerConfig';

interface MondayAutoEmailBulkModalProps {
  isOpen: boolean;
  onClose: () => void;
  rentals: Rental[];
  vehicles: Vehicle[];
  customers: Customer[];
  onRefresh?: () => void;
  initialTab?: 'list' | 'templates';
}

export const MondayAutoEmailBulkModal: React.FC<MondayAutoEmailBulkModalProps> = ({
  isOpen,
  onClose,
  rentals,
  vehicles,
  customers,
  onRefresh,
  initialTab = 'list',
}) => {
  const { formatCurrency } = useFormattedDisplay();

  const [activeTab, setActiveTab] = useState<'list' | 'templates'>(initialTab);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'owing' | 'weekly' | 'daily' | 'enabled' | 'disabled'>('all');
  const [isProcessingBulk, setIsProcessingBulk] = useState(false);
  const [isRunningJob, setIsRunningJob] = useState(false);
  const [jobResult, setJobResult] = useState<{ evaluated: number; sent: number; message: string } | null>(null);

  // Quick template selection state for the dynamic dropdown bar
  const [bulkTemplates, setBulkTemplates] = useState<BulkEmailTemplate[]>([]);
  const [weeklyTemplateId, setWeeklyTemplateId] = useState<string>(DEFAULT_BULK_WEEKLY_TEMPLATE.id);
  const [dailyTemplateId, setDailyTemplateId] = useState<string>(DEFAULT_BULK_DAILY_TEMPLATE.id);
  const [scheduleDay, setScheduleDay] = useState<number>(1);
  const [scheduleTime, setScheduleTime] = useState<string>('09:00');

  // Template editor modal state
  const [editorModalOpen, setEditorModalOpen] = useState(false);
  const [editorModalMode, setEditorModalMode] = useState<'edit' | 'create'>('edit');
  const [editorModalTemplate, setEditorModalTemplate] = useState<BulkEmailTemplate | null>(null);
  const [editorModalTargetType, setEditorModalTargetType] = useState<'weekly' | 'daily'>('weekly');

  const reloadBulkTemplates = async () => {
    try {
      const tpls = await getBulkEmailTemplates();
      setBulkTemplates(tpls);
    } catch (e) {
      console.error('Failed reloading bulk templates:', e);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      const fetchTemplatesAndConfig = async () => {
        try {
          const tpls = await getBulkEmailTemplates();
          setBulkTemplates(tpls);

          const sched = await fetchSchedulerPreferences();
          setScheduleDay(sched.scheduleDay);
          setScheduleTime(sched.scheduleTime);

          const snap = await getDoc(doc(db, 'system_settings', 'global_config'));
          if (snap.exists()) {
            const data = snap.data();
            if (data?.schedule_day !== undefined) {
              setScheduleDay(Number(data.schedule_day));
            }
            if (data?.schedule_time) {
              setScheduleTime(data.schedule_time);
            }
            if (data?.weekly_rental_template_id) {
              setWeeklyTemplateId(data.weekly_rental_template_id);
            } else if (tpls.length > 0) {
              const f = tpls.find(t => t.name.toLowerCase().includes('weekly')) || tpls[0];
              setWeeklyTemplateId(f.id);
            }
            if (data?.daily_rental_template_id) {
              setDailyTemplateId(data.daily_rental_template_id);
            } else if (tpls.length > 0) {
              const f = tpls.find(t => t.name.toLowerCase().includes('daily')) || tpls[1] || tpls[0];
              setDailyTemplateId(f.id);
            }
          }
        } catch (e) {
          console.error('Failed loading template preferences in modal:', e);
        }
      };
      fetchTemplatesAndConfig();
    }
  }, [isOpen, initialTab]);

  const handleQuickChangeTemplate = async (type: 'weekly' | 'daily', newId: string) => {
    if (type === 'weekly') {
      setWeeklyTemplateId(newId);
      try {
        await setDoc(doc(db, 'system_settings', 'global_config'), { weekly_rental_template_id: newId, updatedAt: serverTimestamp() }, { merge: true });
        toast.success('Weekly rental template updated!');
      } catch (err) {
        toast.error('Failed to update weekly template');
      }
    } else {
      setDailyTemplateId(newId);
      try {
        await setDoc(doc(db, 'system_settings', 'global_config'), { daily_rental_template_id: newId, updatedAt: serverTimestamp() }, { merge: true });
        toast.success('Daily rental template updated!');
      } catch (err) {
        toast.error('Failed to update daily template');
      }
    }
  };

  // Active Daily & Weekly non-claim rentals (RULE 2 & 3)
  const activeRentals = useMemo(() => {
    return rentals.filter(r => {
      if (r.status !== 'active') return false;
      // Rule 3: STRICT CLAIMS EXCLUSION
      if (isClaimRental(r)) return false;
      // Rule 2: TARGETING ACTIVE DAILY & WEEKLY ONLY
      const rawType = String(r.type || '').trim().toLowerCase();
      if (rawType !== 'daily' && rawType !== 'weekly') return false;
      return true;
    });
  }, [rentals]);

  // Calculations for stats
  const stats = useMemo(() => {
    let totalOwingCount = 0;
    let totalOwingAmount = 0;
    let weeklyCount = 0;
    let dailyCount = 0;
    let enabledCount = 0;
    let disabledCount = 0;

    activeRentals.forEach(r => {
      const isEnabled = r.enable_monday_auto_email !== false;
      if (isEnabled) enabledCount++;
      else disabledCount++;

      const rawType = String(r.type || '').trim().toLowerCase();
      if (rawType === 'weekly') weeklyCount++;
      if (rawType === 'daily') dailyCount++;

      const total = Number(r.total_amount ?? r.cost ?? 0);
      const paid = Number(r.paid_amount ?? r.paidAmount ?? 0);
      const owing = Number(r.owing_amount ?? r.remainingAmount ?? (total - paid));

      if (owing > 0.01) {
        totalOwingCount++;
        totalOwingAmount += owing;
      }
    });

    return {
      total: activeRentals.length,
      totalOwingCount,
      totalOwingAmount,
      weeklyCount,
      dailyCount,
      enabledCount,
      disabledCount,
    };
  }, [activeRentals]);

  const dayInfo = useMemo(() => getDayInfo(scheduleDay), [scheduleDay]);
  const formattedTime = useMemo(() => formatTime12h(scheduleTime), [scheduleTime]);
  const cronExpr = useMemo(() => generateCronExpression(scheduleDay, scheduleTime), [scheduleDay, scheduleTime]);

  // Filtered rentals for table
  const filteredRentals = useMemo(() => {
    return activeRentals.filter(r => {
      const v = vehicles.find(veh => veh.id === r.vehicleId);
      const c = customers.find(cust => cust.id === r.customerId);

      const custName = (r.customerName || c?.name || '').toLowerCase();
      const vehReg = (
        r.vehicle_reg ||
        r.registration ||
        r.vrm ||
        r.plate_number ||
        r.vehicleReg ||
        r.registrationNumber ||
        (r.vehicle && typeof r.vehicle === 'object' && (r.vehicle.vehicle_reg || r.vehicle.registration || r.vehicle.vrm || r.vehicle.plate_number || r.vehicle.registrationNumber)) ||
        v?.vehicle_reg ||
        v?.registration ||
        v?.vrm ||
        v?.plate_number ||
        v?.registrationNumber ||
        ''
      ).toLowerCase();
      const agreementNo = (r.rentalAgreementNumber || r.rental_ref || r.reference_number || r.id || '').toLowerCase();
      const q = searchTerm.toLowerCase().trim();

      if (q && !custName.includes(q) && !vehReg.includes(q) && !agreementNo.includes(q)) {
        return false;
      }

      const total = Number(r.total_amount ?? r.cost ?? 0);
      const paid = Number(r.paid_amount ?? r.paidAmount ?? 0);
      const owing = Number(r.owing_amount ?? r.remainingAmount ?? (total - paid));
      const isEnabled = r.enable_monday_auto_email !== false;
      const rawType = String(r.type || '').trim().toLowerCase();

      if (filterType === 'owing') return owing > 0.01;
      if (filterType === 'weekly') return rawType === 'weekly';
      if (filterType === 'daily') return rawType === 'daily';
      if (filterType === 'enabled') return isEnabled;
      if (filterType === 'disabled') return !isEnabled;

      return true;
    });
  }, [activeRentals, vehicles, customers, searchTerm, filterType]);

  if (!isOpen) return null;

  // Toggle single rental
  const handleToggleRental = async (rentalId: string, currentState: boolean) => {
    const nextState = !currentState;
    try {
      await updateDoc(doc(db, 'rentals', rentalId), {
        enable_monday_auto_email: nextState,
        updatedAt: new Date(),
      });
      // Update in memory if possible
      const r = rentals.find(x => x.id === rentalId);
      if (r) r.enable_monday_auto_email = nextState;
      toast.success(nextState ? 'Monday auto-email enabled' : 'Monday auto-email disabled');
      onRefresh?.();
    } catch (err) {
      console.error('Failed to toggle rental auto-email:', err);
      toast.error('Failed to update rental setting');
    }
  };

  // Bulk enable or disable all active rentals
  const handleBulkSetAll = async (enable: boolean) => {
    if (activeRentals.length === 0) return;
    setIsProcessingBulk(true);
    const toastId = toast.loading(`${enable ? 'Enabling' : 'Disabling'} Monday auto-email for ${activeRentals.length} rentals...`);

    try {
      const batch = writeBatch(db);
      activeRentals.forEach(r => {
        const ref = doc(db, 'rentals', r.id);
        batch.update(ref, {
          enable_monday_auto_email: enable,
          updatedAt: new Date(),
        });
        r.enable_monday_auto_email = enable;
      });

      await batch.commit();
      toast.success(`Successfully ${enable ? 'enabled' : 'disabled'} Monday auto-email for all ${activeRentals.length} active rentals.`, { id: toastId });
      onRefresh?.();
    } catch (err) {
      console.error('Bulk update error:', err);
      toast.error('Failed to execute bulk update', { id: toastId });
    } finally {
      setIsProcessingBulk(false);
    }
  };

  // Manual trigger of the background job
  const handleRunJob = async () => {
    setIsRunningJob(true);
    setJobResult(null);
    const toastId = toast.loading('Executing Monday Auto-Email test batch (Weekly & Daily templates)...');

    try {
      const res = await runMondayAutoEmailJob({ isTestRun: true, bypassGlobalToggle: true });
      setJobResult({
        evaluated: res.totalEvaluated,
        sent: res.totalSent,
        message: res.message,
      });
      toast.success(res.message, { id: toastId, duration: 5000 });
      onRefresh?.();
    } catch (err: any) {
      console.error('Job error:', err);
      toast.error(`Job failed: ${err?.message || 'Unknown error'}`, { id: toastId });
    } finally {
      setIsRunningJob(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={activeTab === 'templates' ? 'Rental Reminder Templates' : 'Monday Auto-Email Manager'}
      size="3xl"
      contentClassName="p-0 overflow-hidden flex flex-col max-h-[92vh] text-white"
    >
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Info Subheader */}
        <div className="px-5 py-2.5 bg-gradient-to-r from-indigo-950/60 to-slate-900/60 border-b border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
              Cron: {cronExpr} ({dayInfo.plural} {formattedTime})
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
              No Attachments
            </span>
            <span className="text-slate-300 text-xs hidden md:inline">
              Automated reminders for active Daily &amp; Weekly rentals with balance owing &gt; £0. Strictly excludes claims.
            </span>
          </div>
        </div>

        {/* Navigation Tabs inside modal */}
        <div className="flex items-center justify-between border-b border-white/10 bg-[#121327] px-5 pt-2 shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('list')}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition cursor-pointer ${
                activeTab === 'list'
                  ? 'border-indigo-400 text-indigo-300 bg-white/5 rounded-t-xl'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              <Car className="w-4 h-4" />
              Active Daily &amp; Weekly Rentals ({activeRentals.length})
            </button>
            <button
              onClick={() => setActiveTab('templates')}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition cursor-pointer ${
                activeTab === 'templates'
                  ? 'border-indigo-400 text-indigo-300 bg-white/5 rounded-t-xl'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              <Settings2 className="w-4 h-4" />
              Reminder Templates &amp; Scheduler
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded">
                {formattedTime}
              </span>
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-[11px] text-slate-400 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Strict Category: Bulk Email</span>
          </div>
        </div>

        {/* Tab 1: Template Selection & Editing View */}
        {activeTab === 'templates' && (
          <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-white min-h-[550px] sm:min-h-[650px] max-h-[75vh]">
            <RentalReminderTemplateSelector onSaved={() => onRefresh?.()} />
          </div>
        )}

        {/* Tab 2: Rentals List & Control Bar */}
        {activeTab === 'list' && (
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* Dynamic Dropdown Selection Interface & Scheduler Banner on List Tab */}
            <div className="p-4 bg-[#181938] border-b border-white/10 flex flex-col gap-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 bg-indigo-600/30 border border-indigo-400/30 text-indigo-300 rounded-lg">
                    <Mail className="w-4 h-4" />
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-white">
                        Automated Bulk Email Scheduler
                      </span>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                        Cron: {cronExpr} ({dayInfo.plural} {formattedTime})
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Select or edit templates strictly sourced from the Bulk Email module prior to the scheduled {formattedTime} auto-dispatch.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveTab('templates')}
                  className="self-start sm:self-center px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition text-xs flex items-center gap-1.5 shadow-xs shrink-0 cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  Full Template Editor &amp; Preview
                </button>
              </div>

              {/* Dynamic Dropdown Selectors Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                {/* Weekly Searchable Dropdown */}
                <div className="bg-[#0f1022] p-3 rounded-2xl border border-white/10 shadow-xs">
                  <BulkEmailTemplateSearchableSelect
                    templates={bulkTemplates}
                    selectedTemplateId={weeklyTemplateId}
                    onSelectTemplate={t => handleQuickChangeTemplate('weekly', t.id)}
                    onEditTemplate={t => {
                      setEditorModalTemplate(t);
                      setEditorModalMode('edit');
                      setEditorModalTargetType('weekly');
                      setEditorModalOpen(true);
                    }}
                    onCreateNewTemplate={() => {
                      setEditorModalTemplate(null);
                      setEditorModalMode('create');
                      setEditorModalTargetType('weekly');
                      setEditorModalOpen(true);
                    }}
                    label="Weekly Rentals Template"
                    sublabel="Active template for weekly hires"
                    typeBadge="Weekly"
                  />
                </div>

                {/* Daily Searchable Dropdown */}
                <div className="bg-[#0f1022] p-3 rounded-2xl border border-white/10 shadow-xs">
                  <BulkEmailTemplateSearchableSelect
                    templates={bulkTemplates}
                    selectedTemplateId={dailyTemplateId}
                    onSelectTemplate={t => handleQuickChangeTemplate('daily', t.id)}
                    onEditTemplate={t => {
                      setEditorModalTemplate(t);
                      setEditorModalMode('edit');
                      setEditorModalTargetType('daily');
                      setEditorModalOpen(true);
                    }}
                    onCreateNewTemplate={() => {
                      setEditorModalTemplate(null);
                      setEditorModalMode('create');
                      setEditorModalTargetType('daily');
                      setEditorModalOpen(true);
                    }}
                    label="Daily Rentals Template"
                    sublabel="Active template for daily hires"
                    typeBadge="Daily"
                  />
                </div>
              </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-[#121327] border-b border-white/10">
              <div className="bg-[#181938] p-3 rounded-xl border border-white/10 shadow-xs">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Active Daily &amp; Weekly</p>
                <p className="text-xl font-black text-white mt-0.5">{stats.total}</p>
                <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                  {stats.weeklyCount} Weekly • {stats.dailyCount} Daily
                </p>
              </div>
              <div className="bg-[#181938] p-3 rounded-xl border border-white/10 shadow-xs">
                <p className="text-[11px] font-bold text-rose-400 uppercase tracking-wider">Owing &gt; £0 (Targeted)</p>
                <p className="text-xl font-black text-rose-400 mt-0.5">
                  {stats.totalOwingCount}
                  <span className="text-xs text-slate-400 font-normal ml-1.5">({formatCurrency(stats.totalOwingAmount)})</span>
                </p>
                <p className="text-[10px] text-rose-400 font-medium mt-0.5">Eligible for reminder</p>
              </div>
              <div className="bg-[#181938] p-3 rounded-xl border border-white/10 shadow-xs">
                <p className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">Auto-Email Enabled</p>
                <p className="text-xl font-black text-emerald-400 mt-0.5">{stats.enabledCount}</p>
                <p className="text-[10px] text-emerald-400 font-medium mt-0.5">Active for Monday 09:00 AM</p>
              </div>
              <div className="bg-[#181938] p-3 rounded-xl border border-white/10 shadow-xs">
                <p className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">Auto-Email Disabled</p>
                <p className="text-xl font-black text-amber-400 mt-0.5">{stats.disabledCount}</p>
                <p className="text-[10px] text-amber-400 font-medium mt-0.5">Excluded by manual toggle</p>
              </div>
            </div>

            {/* Action Controls & Batch Bar */}
            <div className="p-4 border-b border-gray-200 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => handleBulkSetAll(true)}
                  disabled={isProcessingBulk}
                  className="flex items-center px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-xs transition disabled:opacity-50 cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                  Enable All
                </button>
                <button
                  onClick={() => handleBulkSetAll(false)}
                  disabled={isProcessingBulk}
                  className="flex items-center px-3.5 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold rounded-xl shadow-xs transition disabled:opacity-50 cursor-pointer"
                >
                  <XCircle className="w-3.5 h-3.5 mr-1" />
                  Disable All
                </button>
                <button
                  onClick={handleRunJob}
                  disabled={isRunningJob}
                  className="flex items-center px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-xs transition disabled:opacity-50 cursor-pointer"
                >
                  {isRunningJob ? (
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  ) : (
                    <Play className="w-3.5 h-3.5 mr-1.5 fill-current" />
                  )}
                  Run Test Batch Now
                </button>
              </div>

              {/* Search and Filters */}
              <div className="flex items-center gap-2">
                <div className="relative w-44 sm:w-56">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    placeholder="Search driver, reg..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#0f1022] border border-white/20 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-slate-400"
                  />
                </div>
                <select
                  value={filterType}
                  onChange={e => setFilterType(e.target.value as any)}
                  className="py-1.5 px-2.5 text-xs bg-[#0f1022] border border-white/20 rounded-xl font-medium text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="all">All ({activeRentals.length})</option>
                  <option value="owing">Owing &gt; £0 ({stats.totalOwingCount})</option>
                  <option value="weekly">Weekly ({stats.weeklyCount})</option>
                  <option value="daily">Daily ({stats.dailyCount})</option>
                  <option value="enabled">Enabled ({stats.enabledCount})</option>
                  <option value="disabled">Disabled ({stats.disabledCount})</option>
                </select>
              </div>
            </div>

            {/* Job Result Banner if just run */}
            {jobResult && (
              <div className="mx-4 my-2 p-3 bg-indigo-950/60 border border-indigo-400/30 rounded-xl flex items-center justify-between text-xs text-indigo-200">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{jobResult.message}</span>
                </div>
                <button
                  onClick={() => setJobResult(null)}
                  className="text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Rental List */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 min-h-[500px] sm:min-h-[600px] max-h-[75vh]">
              {filteredRentals.length === 0 ? (
                <div className="text-center py-16 text-slate-400">
                  <Mail className="w-12 h-12 mx-auto mb-3 opacity-40 text-indigo-400" />
                  <p className="text-sm font-semibold text-slate-300">No active Daily or Weekly rentals matching your criteria.</p>
                  <p className="text-xs text-slate-400 mt-1">Try adjusting your search terms or filter selection.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredRentals.map(r => {
                    const v = vehicles.find(veh => veh.id === r.vehicleId);
                    const c = customers.find(cust => cust.id === r.customerId);

                    const total = Number(r.total_amount ?? r.cost ?? 0);
                    const paid = Number(r.paid_amount ?? r.paidAmount ?? 0);
                    const owing = Number(r.owing_amount ?? r.remainingAmount ?? (total - paid));
                    const isEnabled = r.enable_monday_auto_email !== false;

                    const clientName = r.customerName || c?.name || 'Customer';
                    const clientEmail = r.customerEmail || c?.email || 'No email';
                    const vehicleReg =
                      r.vehicle_reg ||
                      r.registration ||
                      r.vrm ||
                      r.plate_number ||
                      r.vehicleReg ||
                      r.registrationNumber ||
                      (r.vehicle && typeof r.vehicle === 'object' && (r.vehicle.vehicle_reg || r.vehicle.registration || r.vehicle.vrm || r.vehicle.plate_number || r.vehicle.registrationNumber)) ||
                      v?.vehicle_reg ||
                      v?.registration ||
                      v?.vrm ||
                      v?.plate_number ||
                      v?.registrationNumber ||
                      'No Reg';
                    const rawType = String(r.type || '').trim().toLowerCase();
                    const isWeekly = rawType === 'weekly';

                    return (
                      <div
                        key={r.id}
                        className={`flex flex-col md:flex-row md:items-center justify-between p-3.5 sm:p-4 rounded-2xl border transition-all gap-3.5 sm:gap-4 ${
                          isEnabled
                            ? 'bg-[#181938] border-white/10 hover:border-indigo-400/40 shadow-xs'
                            : 'bg-[#121327] border-white/5 opacity-70'
                        }`}
                      >
                        <div className="flex items-center gap-3.5 min-w-0 flex-1">
                          <div className={`p-2.5 rounded-xl shrink-0 ${isEnabled ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-400/30' : 'bg-white/5 text-slate-400'}`}>
                            <Mail className="w-4 h-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-bold text-sm text-white truncate">{clientName}</span>
                              {/* Registration Tag */}
                              <span className="font-mono text-xs font-bold px-2 py-0.5 bg-[#0f1022] text-white rounded-md border border-white/20 shrink-0">
                                {vehicleReg}
                              </span>
                              {/* Rental Type & Template Tag */}
                              <span
                                className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border shrink-0 ${
                                  isWeekly
                                    ? 'bg-indigo-500/20 text-indigo-300 border-indigo-400/30'
                                    : 'bg-blue-500/20 text-blue-300 border-blue-400/30'
                                }`}
                              >
                                {isWeekly ? 'Weekly Template' : 'Daily Template'}
                              </span>
                              {r.rentalAgreementNumber && (
                                <span className="text-[11px] text-slate-400 font-mono bg-white/5 px-1.5 py-0.5 rounded border border-white/10 shrink-0">
                                  #{r.rentalAgreementNumber}
                                </span>
                              )}
                            </div>
                            {/* Email Address */}
                            <div className="flex items-center gap-1.5 text-xs text-slate-300 font-medium mt-1 truncate">
                              <span className="text-slate-400">Email:</span>
                              <span className="font-mono text-white select-all">{clientEmail}</span>
                            </div>
                          </div>
                        </div>

                        {/* Balance Status and Action Controls */}
                        <div className="flex items-center justify-between md:justify-end gap-4 sm:gap-6 shrink-0 pt-2.5 md:pt-0 border-t md:border-t-0 border-white/10">
                          <div className="text-left md:text-right min-w-[110px]">
                            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Balance Status</p>
                            <p className={`text-sm font-mono font-bold mt-0.5 ${owing > 0.01 ? 'text-rose-400' : 'text-emerald-400'}`}>
                              {owing > 0.01 ? `Owing: ${formatCurrency(owing)}` : 'Cleared (£0.00)'}
                            </p>
                          </div>

                          {/* Individual Test Send Button */}
                          <button
                            type="button"
                            onClick={async () => {
                              const toastId = toast.loading(`Sending test email to ${clientName}...`);
                              try {
                                const res = await sendSingleRentalTestEmail(r, v, c);
                                toast.success(res.message, { id: toastId, duration: 6000 });
                              } catch (err: any) {
                                toast.error(err?.message || 'Failed to send test email', { id: toastId, duration: 6000 });
                              }
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-indigo-300 hover:text-white bg-indigo-500/20 hover:bg-indigo-500/30 rounded-xl border border-indigo-400/30 transition cursor-pointer shadow-xs shrink-0"
                            title="Send single test email to this driver immediately using their active template"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Test Send</span>
                          </button>

                          {/* Toggle Switch */}
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleToggleRental(r.id, isEnabled)}
                              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                isEnabled ? 'bg-indigo-600' : 'bg-slate-700'
                              }`}
                              title={isEnabled ? 'Monday Auto-Email: Enabled (Click to disable)' : 'Monday Auto-Email: Disabled (Click to enable)'}
                            >
                              <span
                                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                  isEnabled ? 'translate-x-5' : 'translate-x-0'
                                }`}
                              />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="p-4 bg-[#121327] border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-400 shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Targeting active Daily &amp; Weekly rentals (owing &gt; £0). Strictly excludes claims. No attachments.</span>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-white/10 hover:bg-white/15 text-white font-bold rounded-xl border border-white/10 transition self-end sm:self-auto cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>

      {/* Embedded Searchable Template Editor Modal */}
      <BulkEmailTemplateEditorModal
        isOpen={editorModalOpen}
        onClose={() => setEditorModalOpen(false)}
        template={editorModalTemplate}
        mode={editorModalMode}
        targetType={editorModalTargetType}
        onSaved={async savedId => {
          await reloadBulkTemplates();
          if (editorModalTargetType === 'weekly') {
            await handleQuickChangeTemplate('weekly', savedId);
          } else {
            await handleQuickChangeTemplate('daily', savedId);
          }
        }}
      />
    </Modal>
  );
};

export default MondayAutoEmailBulkModal;
