// src/components/rentals/MondayAutoEmailBulkModal.tsx
import React, { useState, useMemo } from 'react';
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
  RefreshCw
} from 'lucide-react';
import { Rental, Vehicle, Customer } from '../../types';
import { db } from '../../lib/firebase';
import { doc, writeBatch, updateDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { runMondayAutoEmailJob } from '../../jobs/mondayAutoEmailJob';
import { useFormattedDisplay } from '../../hooks/useFormattedDisplay';

interface MondayAutoEmailBulkModalProps {
  isOpen: boolean;
  onClose: () => void;
  rentals: Rental[];
  vehicles: Vehicle[];
  customers: Customer[];
  onRefresh?: () => void;
}

export const MondayAutoEmailBulkModal: React.FC<MondayAutoEmailBulkModalProps> = ({
  isOpen,
  onClose,
  rentals,
  vehicles,
  customers,
  onRefresh,
}) => {
  const { formatCurrency } = useFormattedDisplay();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'owing' | 'enabled' | 'disabled'>('all');
  const [isProcessingBulk, setIsProcessingBulk] = useState(false);
  const [isRunningJob, setIsRunningJob] = useState(false);
  const [jobResult, setJobResult] = useState<{ evaluated: number; sent: number; message: string } | null>(null);

  // Active non-claim rentals
  const activeRentals = useMemo(() => {
    return rentals.filter(r => {
      if (r.status !== 'active') return false;
      const rawType = String(r.type || '').trim().toLowerCase();
      if (rawType === 'claim' || rawType === 'claims') return false;
      const cat = (r.category || r.reason || '').toString().toLowerCase();
      const st = (r.status || '').toString().toLowerCase();
      if (['claim', 'claims'].includes(cat) || ['claim', 'claims'].includes(st)) return false;
      return true;
    });
  }, [rentals]);

  // Calculations for stats
  const stats = useMemo(() => {
    let totalOwingCount = 0;
    let totalOwingAmount = 0;
    let enabledCount = 0;
    let disabledCount = 0;

    activeRentals.forEach(r => {
      const isEnabled = r.enable_monday_auto_email !== false;
      if (isEnabled) enabledCount++;
      else disabledCount++;

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
      const vehReg = (v?.registrationNumber || '').toLowerCase();
      const agreementNo = (r.rentalAgreementNumber || '').toLowerCase();
      const q = searchTerm.toLowerCase().trim();

      if (q && !custName.includes(q) && !vehReg.includes(q) && !agreementNo.includes(q)) {
        return false;
      }

      const total = Number(r.total_amount ?? r.cost ?? 0);
      const paid = Number(r.paid_amount ?? r.paidAmount ?? 0);
      const owing = Number(r.owing_amount ?? r.remainingAmount ?? (total - paid));
      const isEnabled = r.enable_monday_auto_email !== false;

      if (filterType === 'owing') return owing > 0.01;
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
    const toastId = toast.loading('Executing Monday Auto-Email background job...');

    try {
      const res = await runMondayAutoEmailJob();
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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 w-full max-w-5xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md">
              <Mail className="w-6 h-6 text-indigo-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-black">Monday Auto-Email Manager</h3>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-500/30 text-indigo-200 border border-indigo-400/20">
                  cron: 0 0 * * 1
                </span>
              </div>
              <p className="text-sm text-indigo-200/80">
                Manage automated weekly statements for active rentals with outstanding balances.
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

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-5 bg-slate-50 border-b border-gray-200">
          <div className="bg-white p-3.5 rounded-2xl border border-gray-200 shadow-xs">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Active Rentals</p>
            <p className="text-2xl font-black text-gray-900 mt-1">{stats.total}</p>
          </div>
          <div className="bg-white p-3.5 rounded-2xl border border-gray-200 shadow-xs">
            <p className="text-xs font-bold text-red-600 uppercase tracking-wider">Owing &gt; £0</p>
            <p className="text-2xl font-black text-red-600 mt-1">
              {stats.totalOwingCount}
              <span className="text-xs text-gray-500 font-normal ml-2">({formatCurrency(stats.totalOwingAmount)})</span>
            </p>
          </div>
          <div className="bg-white p-3.5 rounded-2xl border border-gray-200 shadow-xs">
            <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Auto-Email Enabled</p>
            <p className="text-2xl font-black text-emerald-600 mt-1">{stats.enabledCount}</p>
          </div>
          <div className="bg-white p-3.5 rounded-2xl border border-gray-200 shadow-xs">
            <p className="text-xs font-bold text-amber-600 uppercase tracking-wider">Auto-Email Disabled</p>
            <p className="text-2xl font-black text-amber-600 mt-1">{stats.disabledCount}</p>
          </div>
        </div>

        {/* Action Controls & Batch Bar */}
        <div className="p-5 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleBulkSetAll(true)}
              disabled={isProcessingBulk}
              className="flex items-center px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4 mr-1.5" />
              Enable for All Active
            </button>
            <button
              onClick={() => handleBulkSetAll(false)}
              disabled={isProcessingBulk}
              className="flex items-center px-4 py-2 bg-slate-700 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-sm transition disabled:opacity-50"
            >
              <XCircle className="w-4 h-4 mr-1.5" />
              Disable for All Active
            </button>
            <button
              onClick={handleRunJob}
              disabled={isRunningJob}
              className="flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm transition disabled:opacity-50"
            >
              {isRunningJob ? (
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
              ) : (
                <Play className="w-4 h-4 mr-1.5 fill-current" />
              )}
              Run Job Now (Manual Trigger)
            </button>
          </div>

          {/* Search and Filters */}
          <div className="flex items-center gap-2">
            <div className="relative w-48 sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Search driver, reg..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <select
              value={filterType}
              onChange={e => setFilterType(e.target.value as any)}
              className="py-1.5 px-3 text-xs bg-gray-50 border border-gray-200 rounded-xl font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Active ({activeRentals.length})</option>
              <option value="owing">Owing &gt; £0 ({stats.totalOwingCount})</option>
              <option value="enabled">Enabled ({stats.enabledCount})</option>
              <option value="disabled">Disabled ({stats.disabledCount})</option>
            </select>
          </div>
        </div>

        {/* Job Result Banner if just run */}
        {jobResult && (
          <div className="mx-5 my-3 p-4 bg-indigo-50 border border-indigo-200 rounded-2xl flex items-center justify-between text-xs text-indigo-900">
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
        <div className="flex-1 overflow-y-auto p-5">
          {filteredRentals.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Mail className="w-12 h-12 mx-auto mb-3 opacity-40 text-indigo-400" />
              <p className="text-sm font-semibold">No active rentals matching your criteria.</p>
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
                const vehicleReg = v?.registrationNumber || 'No Reg';

                return (
                  <div
                    key={r.id}
                    className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all ${
                      isEnabled
                        ? 'bg-white border-gray-200 hover:border-indigo-300 shadow-xs'
                        : 'bg-gray-50/70 border-gray-200 opacity-75'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2.5 rounded-xl ${isEnabled ? 'bg-indigo-50 text-indigo-600' : 'bg-gray-200 text-gray-500'}`}>
                        <Mail className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-gray-900">{clientName}</span>
                          <span className="font-mono text-xs px-2 py-0.5 bg-gray-100 text-gray-700 rounded-md border border-gray-200">
                            {vehicleReg}
                          </span>
                          {r.rentalAgreementNumber && (
                            <span className="text-[10px] text-gray-400 font-mono">
                              #{r.rentalAgreementNumber}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500">{clientEmail}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-[10px] uppercase font-bold text-gray-400">Balance Status</p>
                        <p className={`text-sm font-mono font-bold ${owing > 0.01 ? 'text-red-600' : 'text-emerald-600'}`}>
                          {owing > 0.01 ? `Owing: ${formatCurrency(owing)}` : 'Cleared'}
                        </p>
                      </div>

                      {/* Toggle */}
                      <button
                        type="button"
                        onClick={() => handleToggleRental(r.id, isEnabled)}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          isEnabled ? 'bg-indigo-600' : 'bg-gray-300'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
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

        {/* Footer */}
        <div className="p-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between text-xs text-gray-500">
          <span>Targeting active rentals where owing &gt; £0. Excludes claims.</span>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold rounded-xl transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default MondayAutoEmailBulkModal;
