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
          const snap = await getDoc(doc(db, 'system_settings', 'global_config'));
          if (snap.exists()) {
            const data = snap.data();
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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 w-full max-w-5xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md">
              <Mail className="w-6 h-6 text-indigo-200" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-xl font-black">Monday Auto-Email Manager</h3>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-indigo-500/30 text-indigo-200 border border-indigo-400/20">
                  Cron: 0 9 * * 1 (Mondays 09:00 AM)
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-200 border border-emerald-400/20">
                  No Attachments
                </span>
              </div>
              <p className="text-xs sm:text-sm text-indigo-200/80 mt-0.5">
                Automated payment reminders targeting active Daily and Weekly rentals with outstanding balances (owing &gt; £0). Strictly excludes claims.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-indigo-200 hover:text-white hover:bg-white/10 rounded-xl transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Navigation Tabs inside modal */}
        <div className="flex items-center justify-between border-b border-gray-200 bg-slate-50 px-5 pt-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('list')}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition ${
                activeTab === 'list'
                  ? 'border-indigo-600 text-indigo-600 bg-white rounded-t-xl'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <Car className="w-4 h-4" />
              Active Daily &amp; Weekly Rentals ({activeRentals.length})
            </button>
            <button
              onClick={() => setActiveTab('templates')}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition ${
                activeTab === 'templates'
                  ? 'border-indigo-600 text-indigo-600 bg-white rounded-t-xl'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <Settings2 className="w-4 h-4" />
              Monday Automated Bulk Email Scheduler &amp; Templates
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 bg-indigo-100 text-indigo-800 rounded">
                09:00 AM
              </span>
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-[11px] text-gray-500 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
            <span>Strict Category: Bulk Email</span>
          </div>
        </div>

        {/* Tab 1: Template Selection & Editing View */}
        {activeTab === 'templates' && (
          <div className="p-5 overflow-y-auto flex-1 bg-slate-50/50">
            <RentalReminderTemplateSelector onSaved={() => onRefresh?.()} />
          </div>
        )}

        {/* Tab 2: Rentals List & Control Bar */}
        {activeTab === 'list' && (
          <>
            {/* Dynamic Dropdown Selection Interface & Scheduler Banner on List Tab */}
            <div className="p-4 bg-gradient-to-r from-indigo-50/80 via-white to-blue-50/80 border-b border-indigo-100 flex flex-col gap-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 bg-indigo-600 text-white rounded-lg shadow-2xs">
                    <Mail className="w-4 h-4" />
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-gray-900">
                        Monday Automated Bulk Email Scheduler
                      </span>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800 border border-indigo-200">
                        Cron: 0 9 * * 1 (Mondays 09:00 AM)
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-600">
                      Select or edit templates strictly sourced from the Bulk Email module prior to the scheduled 09:00 AM auto-dispatch.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveTab('templates')}
                  className="self-start sm:self-center px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition text-xs flex items-center gap-1.5 shadow-2xs shrink-0"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  Full Template Editor &amp; Preview
                </button>
              </div>

              {/* Dynamic Dropdown Selectors Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                {/* Weekly Searchable Dropdown */}
                <div className="bg-white p-3 rounded-2xl border border-indigo-100 shadow-2xs">
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
                <div className="bg-white p-3 rounded-2xl border border-indigo-100 shadow-2xs">
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
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-50 border-b border-gray-200">
              <div className="bg-white p-3 rounded-2xl border border-gray-200 shadow-xs">
                <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Active Daily &amp; Weekly</p>
                <p className="text-xl font-black text-gray-900 mt-0.5">{stats.total}</p>
                <p className="text-[10px] text-gray-400 font-medium mt-0.5">
                  {stats.weeklyCount} Weekly • {stats.dailyCount} Daily
                </p>
              </div>
              <div className="bg-white p-3 rounded-2xl border border-gray-200 shadow-xs">
                <p className="text-[11px] font-bold text-red-600 uppercase tracking-wider">Owing &gt; £0 (Targeted)</p>
                <p className="text-xl font-black text-red-600 mt-0.5">
                  {stats.totalOwingCount}
                  <span className="text-xs text-gray-500 font-normal ml-1.5">({formatCurrency(stats.totalOwingAmount)})</span>
                </p>
                <p className="text-[10px] text-red-500 font-medium mt-0.5">Eligible for reminder</p>
              </div>
              <div className="bg-white p-3 rounded-2xl border border-gray-200 shadow-xs">
                <p className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Auto-Email Enabled</p>
                <p className="text-xl font-black text-emerald-600 mt-0.5">{stats.enabledCount}</p>
                <p className="text-[10px] text-emerald-600 font-medium mt-0.5">Active for Monday 12 AM</p>
              </div>
              <div className="bg-white p-3 rounded-2xl border border-gray-200 shadow-xs">
                <p className="text-[11px] font-bold text-amber-600 uppercase tracking-wider">Auto-Email Disabled</p>
                <p className="text-xl font-black text-amber-600 mt-0.5">{stats.disabledCount}</p>
                <p className="text-[10px] text-amber-600 font-medium mt-0.5">Excluded by manual toggle</p>
              </div>
            </div>

            {/* Action Controls & Batch Bar */}
            <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => handleBulkSetAll(true)}
                  disabled={isProcessingBulk}
                  className="flex items-center px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition disabled:opacity-50"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                  Enable All
                </button>
                <button
                  onClick={() => handleBulkSetAll(false)}
                  disabled={isProcessingBulk}
                  className="flex items-center px-3.5 py-1.5 bg-slate-700 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs transition disabled:opacity-50"
                >
                  <XCircle className="w-3.5 h-3.5 mr-1" />
                  Disable All
                </button>
                <button
                  onClick={handleRunJob}
                  disabled={isRunningJob}
                  className="flex items-center px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition disabled:opacity-50"
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
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    placeholder="Search driver, reg..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <select
                  value={filterType}
                  onChange={e => setFilterType(e.target.value as any)}
                  className="py-1.5 px-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
              <div className="mx-4 my-2 p-3 bg-indigo-50 border border-indigo-200 rounded-xl flex items-center justify-between text-xs text-indigo-900">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span>{jobResult.message}</span>
                </div>
                <button
                  onClick={() => setJobResult(null)}
                  className="text-indigo-400 hover:text-indigo-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Rental List */}
            <div className="flex-1 overflow-y-auto p-4">
              {filteredRentals.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <Mail className="w-10 h-10 mx-auto mb-2 opacity-40 text-indigo-400" />
                  <p className="text-xs font-semibold">No active Daily or Weekly rentals matching your criteria.</p>
                </div>
              ) : (
                <div className="space-y-2">
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
                        className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${
                          isEnabled
                            ? 'bg-white border-gray-200 hover:border-indigo-300 shadow-2xs'
                            : 'bg-gray-50/70 border-gray-200 opacity-75'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-xl ${isEnabled ? 'bg-indigo-50 text-indigo-600' : 'bg-gray-200 text-gray-500'}`}>
                            <Mail className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-bold text-xs text-gray-900">{clientName}</span>
                              <span className="font-mono text-[11px] px-1.5 py-0.5 bg-gray-100 text-gray-700 rounded-md border border-gray-200">
                                {vehicleReg}
                              </span>
                              {/* Rental Type & Template Tag */}
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                  isWeekly
                                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                    : 'bg-blue-50 text-blue-700 border-blue-200'
                                }`}
                              >
                                {isWeekly ? 'Weekly Template' : 'Daily Template'}
                              </span>
                              {r.rentalAgreementNumber && (
                                <span className="text-[10px] text-gray-400 font-mono">
                                  #{r.rentalAgreementNumber}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-gray-500 mt-0.5">{clientEmail}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 sm:gap-4">
                          <div className="text-right">
                            <p className="text-[10px] uppercase font-bold text-gray-400">Balance Status</p>
                            <p className={`text-xs font-mono font-bold ${owing > 0.01 ? 'text-red-600' : 'text-emerald-600'}`}>
                              {owing > 0.01 ? `Owing: ${formatCurrency(owing)}` : 'Cleared'}
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
                            className="p-1.5 text-violet-700 bg-violet-50 hover:bg-violet-100 rounded-xl border border-violet-200 transition cursor-pointer"
                            title="Send single test email to this driver immediately using their active template"
                          >
                            <Send className="w-3.5 h-3.5" />
                          </button>

                          {/* Toggle */}
                          <button
                            type="button"
                            onClick={() => handleToggleRental(r.id, isEnabled)}
                            className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                              isEnabled ? 'bg-indigo-600' : 'bg-gray-300'
                            }`}
                          >
                            <span
                              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                isEnabled ? 'translate-x-5' : 'translate-x-0'
                              }`}
                            />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}

        {/* Footer */}
        <div className="p-4 bg-gray-50 border-t border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-gray-500">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Targeting active Daily &amp; Weekly rentals (owing &gt; £0). Strictly excludes claims. No attachments.</span>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold rounded-xl transition self-end sm:self-auto cursor-pointer"
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
    </div>
  );
};

export default MondayAutoEmailBulkModal;
