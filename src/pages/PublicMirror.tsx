// src/pages/PublicMirror.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { db, auth } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import {
  Wrench,
  Calendar,
  Clock,
  Car,
  Search,
  Maximize2,
  Minimize2,
  RefreshCw,
  Radio,
  ExternalLink,
  ShieldCheck,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Layers,
  X,
  Lock,
  Mail,
  UserCheck,
  LogOut,
  AlertTriangle,
  LayoutGrid,
  Table as TableIcon,
  Columns,
  Sparkles,
  ChevronRight,
  User,
  Hash,
  Activity
} from 'lucide-react';
import {
  startOfDay,
  endOfDay,
  addDays,
  format,
  formatDistanceToNow,
  isToday,
  isTomorrow,
  isBefore,
  isValid,
  differenceInCalendarDays
} from 'date-fns';
import { ensureValidDate } from '../utils/dateHelpers';

interface PublicJobItem {
  id: string;
  source: 'maintenance' | 'rental';
  title: string;
  type: string;
  description?: string;
  status: 'in-progress' | 'scheduled';
  scheduledDate: Date;
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleReg?: string;
  location?: string;
  serviceProvider?: string;
  customerName?: string;
  orderNumber?: string;
  rentalAgreementNumber?: string;
  estimatedReturnDate?: Date;
  daysRemaining?: number;
  isOverdue?: boolean;
}

const PublicMirror: React.FC = () => {
  const { user: authContextUser } = useAuth();

  // Raw state from listeners
  const [maintenanceDocs, setMaintenanceDocs] = useState<any[]>([]);
  const [rentalDocs, setRentalDocs] = useState<any[]>([]);
  const [vehiclesMap, setVehiclesMap] = useState<Record<string, { make: string; model: string; reg: string }>>({});
  const [loading, setLoading] = useState(true);
  const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date());
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [maintenanceAuthError, setMaintenanceAuthError] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<any>(auth.currentUser || authContextUser);

  // UI state
  const [activeTab, setActiveTab] = useState<'all' | 'maintenance' | 'rentals'>('all');
  const [scheduleFilter, setScheduleFilter] = useState<'all' | 'in-progress' | 'scheduled' | 'today' | '7days'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isKioskMode, setIsKioskMode] = useState(false);
  const [viewMode, setViewMode] = useState<'dual' | 'table' | 'grid'>('dual');

  // Staff Login Modal state
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [staffEmail, setStaffEmail] = useState('');
  const [staffPassword, setStaffPassword] = useState('');
  const [staffSubmitting, setStaffSubmitting] = useState(false);
  const [staffError, setStaffError] = useState('');

  // Keep a 1-second live clock for workshop display
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // 1. Real-time Firestore Listener for Vehicles
  useEffect(() => {
    const q = query(collection(db, 'vehicles'));
    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const map: Record<string, { make: string; model: string; reg: string }> = {};
        snapshot.forEach((doc) => {
          const d = doc.data();
          map[doc.id] = {
            make: d.make || '',
            model: d.model || '',
            reg: d.registrationNumber || d.regNumber || '',
          };
        });
        setVehiclesMap(map);
      },
      (err) => {
        console.warn('Vehicle snapshot notice in Public Mirror:', err.message);
      }
    );
    return () => unsub();
  }, []);

  // 2. Real-time Firestore Listener for Maintenance Logs with Auto-Retry on Auth State Change
  useEffect(() => {
    let unsubMaintenance: (() => void) | null = null;

    const setupMaintenanceSubscription = () => {
      if (unsubMaintenance) {
        unsubMaintenance();
        unsubMaintenance = null;
      }

      // Query without restrictive orderBy to avoid dropping documents with missing/different date formats
      const q = collection(db, 'maintenanceLogs');
      unsubMaintenance = onSnapshot(
        q,
        (snapshot) => {
          const items: any[] = [];
          snapshot.forEach((doc) => {
            const d = doc.data();
            items.push({
              id: doc.id,
              ...d,
              date: d.date?.toDate ? d.date.toDate() : ensureValidDate(d.date),
              nextServiceDate: d.nextServiceDate?.toDate ? d.nextServiceDate.toDate() : ensureValidDate(d.nextServiceDate),
              createdAt: d.createdAt?.toDate ? d.createdAt.toDate() : ensureValidDate(d.createdAt),
            });
          });
          setMaintenanceDocs(items);
          setMaintenanceAuthError(false);
          setLastSyncTime(new Date());
          setLoading(false);
        },
        (err) => {
          console.warn('Maintenance snapshot notice in Public Mirror:', err.message);
          if (err.code === 'permission-denied') {
            setMaintenanceAuthError(true);
          }
          setLoading(false);
        }
      );
    };

    // Listen to Firebase Auth state changes
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (user) {
        setMaintenanceAuthError(false);
      }
      setupMaintenanceSubscription();
    });

    return () => {
      unsubAuth();
      if (unsubMaintenance) unsubMaintenance();
    };
  }, []);

  // 3. Real-time Firestore Listener for Rentals
  useEffect(() => {
    const q = collection(db, 'rentals');
    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const items: any[] = [];
        snapshot.forEach((doc) => {
          const d = doc.data();
          items.push({
            id: doc.id,
            ...d,
            startDate: d.startDate?.toDate ? d.startDate.toDate() : ensureValidDate(d.startDate),
            endDate: d.endDate?.toDate ? d.endDate.toDate() : ensureValidDate(d.endDate),
            expectedReturnDate: d.expectedReturnDate?.toDate ? d.expectedReturnDate.toDate() : ensureValidDate(d.expectedReturnDate),
          });
        });
        setRentalDocs(items);
        setLastSyncTime(new Date());
      },
      (err) => {
        console.error('Rental snapshot error in Public Mirror:', err);
      }
    );
    return () => unsub();
  }, []);

  // Handle Staff Sign In
  const handleStaffLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffEmail.trim() || !staffPassword.trim()) {
      setStaffError('Please enter both email and password.');
      return;
    }

    setStaffSubmitting(true);
    setStaffError('');
    try {
      await signInWithEmailAndPassword(auth, staffEmail.trim(), staffPassword);
      setIsStaffModalOpen(false);
      setStaffEmail('');
      setStaffPassword('');
      toast.success('Signed in successfully! Real-time maintenance queue connected.');
    } catch (err: any) {
      console.error('Staff login error:', err);
      setStaffError(err.message || 'Failed to sign in. Please verify your staff credentials.');
    } finally {
      setStaffSubmitting(false);
    }
  };

  const handleStaffLogout = async () => {
    try {
      await signOut(auth);
      toast.success('Signed out of staff account.');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  // 4. Unified Jobs Filtering Logic:
  // Shows active schedule and in-progress jobs for both Maintenance and Fleet Rentals
  const unifiedJobs = useMemo(() => {
    const now = new Date();
    const todayStart = startOfDay(now);
    const next7DaysEnd = endOfDay(addDays(todayStart, 7));

    const result: PublicJobItem[] = [];

    // --- Process Maintenance Logs ---
    maintenanceDocs.forEach((m) => {
      const rawStatus = (m.status || '').toLowerCase().trim();

      // Exclude completed, cancelled, or draft
      if (rawStatus === 'completed' || rawStatus === 'cancelled' || rawStatus === 'draft') {
        return;
      }

      // Resolve valid scheduled/service date from all possible fields
      const rawDate = m.date || m.nextServiceDate || m.createdAt;
      let jobDate: Date;
      if (rawDate && isValid(new Date(rawDate))) {
        jobDate = rawDate.toDate ? rawDate.toDate() : ensureValidDate(rawDate);
      } else {
        jobDate = new Date();
      }

      // Check In-Progress vs Scheduled
      const isInProgress =
        rawStatus === 'in-progress' ||
        rawStatus === 'in progress' ||
        rawStatus === 'active' ||
        rawStatus === 'ongoing' ||
        rawStatus === 'started';

      const isScheduled = !isInProgress;
      const isOverdue = isScheduled && isBefore(endOfDay(jobDate), todayStart);
      const isDueToday = isScheduled && isToday(jobDate);
      const isWithinNext7Days = jobDate >= todayStart && jobDate <= next7DaysEnd;

      // Filter based on user's scheduleFilter selection
      if (scheduleFilter === 'in-progress' && !isInProgress) return;
      if (scheduleFilter === 'scheduled' && !isScheduled) return;
      if (scheduleFilter === 'today' && !isDueToday && !isOverdue && !isInProgress) return;
      if (scheduleFilter === '7days' && !isInProgress && !isWithinNext7Days && !isOverdue) return;

      const vehicleInfo = vehiclesMap[m.vehicleId] || m.vehicleDetails || {};
      const reg =
        vehicleInfo.reg ||
        vehicleInfo.registrationNumber ||
        m.vehicleDetails?.registrationNumber ||
        m.registrationNumber ||
        'N/A';
      const make = vehicleInfo.make || m.vehicleDetails?.make || m.make || '';
      const model = vehicleInfo.model || m.vehicleDetails?.model || m.model || '';

      result.push({
        id: `maint-${m.id}`,
        source: 'maintenance',
        title: (m.type || 'Maintenance').replace(/-/g, ' ').toUpperCase(),
        type: m.type || 'Maintenance',
        description: m.description || m.notes || 'Scheduled Maintenance Service',
        status: isInProgress ? 'in-progress' : 'scheduled',
        scheduledDate: jobDate,
        vehicleMake: make,
        vehicleModel: model,
        vehicleReg: reg,
        location: m.location || 'Main Workshop',
        serviceProvider: m.serviceProvider || 'Workshop Technician',
        orderNumber: m.orderNumber,
        isOverdue: isOverdue,
      });
    });

    // --- Process Rentals ---
    rentalDocs.forEach((r) => {
      const rawStatus = (r.status || '').toLowerCase().trim();

      // Exclude completed, cancelled, draft, or returned
      if (rawStatus === 'completed' || rawStatus === 'cancelled' || rawStatus === 'draft' || rawStatus === 'returned') {
        return;
      }

      const startDate: Date = r.startDate && isValid(r.startDate) ? r.startDate : new Date();
      const isInProgress =
        rawStatus === 'active' ||
        rawStatus === 'in-progress' ||
        rawStatus === 'in progress' ||
        rawStatus === 'on-hire';

      const isScheduled = !isInProgress;
      const isOverdue = isScheduled && isBefore(endOfDay(startDate), todayStart);
      const isDueToday = isScheduled && isToday(startDate);
      const isWithinNext7Days = startDate >= todayStart && startDate <= next7DaysEnd;

      // Filter based on user's scheduleFilter selection
      if (scheduleFilter === 'in-progress' && !isInProgress) return;
      if (scheduleFilter === 'scheduled' && !isScheduled) return;
      if (scheduleFilter === 'today' && !isDueToday && !isOverdue && !isInProgress) return;
      if (scheduleFilter === '7days' && !isInProgress && !isWithinNext7Days && !isOverdue) return;

      const vehicleInfo = vehiclesMap[r.vehicleId] || {};
      const reg = vehicleInfo.reg || r.vehicleRegistration || r.registrationNumber || 'N/A';
      const make = vehicleInfo.make || r.vehicleMake || r.make || '';
      const model = vehicleInfo.model || r.vehicleModel || r.model || '';

      result.push({
        id: `rental-${r.id}`,
        source: 'rental',
        title: `RENTAL DISPATCH (${(r.type || 'Standard').toUpperCase()})`,
        type: r.type ? `${r.type.toUpperCase()} RENTAL` : 'RENTAL',
        description: r.reason
          ? `Reason: ${r.reason}`
          : r.customerName
          ? `Customer: ${r.customerName}`
          : 'Scheduled Fleet Rental Dispatch',
        status: isInProgress ? 'in-progress' : 'scheduled',
        scheduledDate: startDate,
        vehicleMake: make,
        vehicleModel: model,
        vehicleReg: reg,
        customerName: r.customerName || r.customer?.name,
        rentalAgreementNumber: r.rentalAgreementNumber || r.id?.substring(0, 8),
        estimatedReturnDate: r.expectedReturnDate || r.endDate,
        isOverdue: isOverdue,
      });
    });

    // Sort: 'in-progress' items first, followed by chronologically upcoming
    return result.sort((a, b) => {
      if (a.status === 'in-progress' && b.status !== 'in-progress') return -1;
      if (a.status !== 'in-progress' && b.status === 'in-progress') return 1;
      return a.scheduledDate.getTime() - b.scheduledDate.getTime();
    });
  }, [maintenanceDocs, rentalDocs, vehiclesMap, scheduleFilter]);

  // Secondary Filter by Tab and Search Query
  const filteredItems = useMemo(() => {
    let list = unifiedJobs;

    // Filter by Tab (Source)
    if (activeTab === 'maintenance') {
      list = list.filter((i) => i.source === 'maintenance');
    } else if (activeTab === 'rentals') {
      list = list.filter((i) => i.source === 'rental');
    }

    // Filter by Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (i) =>
          (i.vehicleReg || '').toLowerCase().includes(q) ||
          (i.vehicleMake || '').toLowerCase().includes(q) ||
          (i.vehicleModel || '').toLowerCase().includes(q) ||
          (i.title || '').toLowerCase().includes(q) ||
          (i.type || '').toLowerCase().includes(q) ||
          (i.location || '').toLowerCase().includes(q) ||
          (i.serviceProvider || '').toLowerCase().includes(q) ||
          (i.customerName || '').toLowerCase().includes(q) ||
          (i.orderNumber || '').toLowerCase().includes(q) ||
          (i.rentalAgreementNumber || '').toLowerCase().includes(q)
      );
    }

    return list;
  }, [unifiedJobs, activeTab, searchQuery]);

  // Split into In-Progress and Scheduled for the Dual-View Job Scheduler
  const inProgressItems = useMemo(
    () => filteredItems.filter((item) => item.status === 'in-progress'),
    [filteredItems]
  );

  const scheduledItems = useMemo(
    () => filteredItems.filter((item) => item.status !== 'in-progress'),
    [filteredItems]
  );

  // Counts for Metric Badges across the full dataset
  const totalInProgressCount = useMemo(
    () =>
      maintenanceDocs.filter((m) => {
        const s = (m.status || '').toLowerCase();
        return s === 'in-progress' || s === 'in progress' || s === 'active';
      }).length +
      rentalDocs.filter((r) => {
        const s = (r.status || '').toLowerCase();
        return s === 'active' || s === 'in-progress' || s === 'in progress';
      }).length,
    [maintenanceDocs, rentalDocs]
  );

  const totalActiveScheduledCount = useMemo(
    () =>
      maintenanceDocs.filter((m) => {
        const s = (m.status || '').toLowerCase();
        return s !== 'completed' && s !== 'cancelled' && s !== 'draft' && s !== 'in-progress' && s !== 'in progress' && s !== 'active';
      }).length +
      rentalDocs.filter((r) => {
        const s = (r.status || '').toLowerCase();
        return s !== 'completed' && s !== 'cancelled' && s !== 'draft' && s !== 'returned' && s !== 'active' && s !== 'in-progress' && s !== 'in progress';
      }).length,
    [maintenanceDocs, rentalDocs]
  );

  const maintCount = useMemo(() => unifiedJobs.filter((i) => i.source === 'maintenance').length, [unifiedJobs]);
  const rentalCount = useMemo(() => unifiedJobs.filter((i) => i.source === 'rental').length, [unifiedJobs]);

  // Specific counts for Top Summary Metric Cards matching Admin Dashboard style
  const scheduledCount = useMemo(
    () => unifiedJobs.filter((i) => i.status !== 'in-progress').length,
    [unifiedJobs]
  );
  const dueWithin7DaysCount = useMemo(
    () =>
      unifiedJobs.filter((i) => {
        if (i.status === 'in-progress') return false;
        if (!i.scheduledDate || !isValid(i.scheduledDate)) return false;
        const days = differenceInCalendarDays(i.scheduledDate, new Date());
        return days < 8;
      }).length,
    [unifiedJobs]
  );

  const isLessThan8Days = (item: PublicJobItem) => {
    if (item.status === 'in-progress') return false;
    if (!item.scheduledDate || !isValid(item.scheduledDate)) return false;
    const days = differenceInCalendarDays(item.scheduledDate, new Date());
    return days < 8;
  };

  const getTypeBadgeColor = (type: string) => {
    const t = String(type || '').toLowerCase();
    if (t.includes('service') || t.includes('routine') || t.includes('oil')) {
      return 'bg-emerald-950/70 text-emerald-300 border-emerald-500/50';
    }
    if (t.includes('mot') || t.includes('tfl') || t.includes('test') || t.includes('taxi')) {
      return 'bg-sky-950/70 text-sky-300 border-sky-500/50';
    }
    if (t.includes('repair') || t.includes('urgent') || t.includes('breakdown') || t.includes('clutch')) {
      return 'bg-rose-950/70 text-rose-300 border-rose-500/50';
    }
    if (t.includes('tyre') || t.includes('tire') || t.includes('brake') || t.includes('pad')) {
      return 'bg-amber-950/70 text-amber-300 border-amber-500/50';
    }
    if (t.includes('inspection') || t.includes('check') || t.includes('safety')) {
      return 'bg-purple-950/70 text-purple-300 border-purple-500/50';
    }
    return 'bg-slate-800 text-slate-300 border-slate-700';
  };

  const formatScheduledTime = (d: Date) => {
    if (!isValid(d)) return 'TBD';
    if (isToday(d)) {
      return `Today, ${format(d, 'HH:mm')}`;
    }
    if (isTomorrow(d)) {
      return `Tomorrow, ${format(d, 'HH:mm')}`;
    }
    return format(d, 'EEE, dd MMM • HH:mm');
  };

  const getRelativeBadge = (d: Date, status: string, isOverdue?: boolean) => {
    if (status === 'in-progress') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
          <span className="h-2 w-2 rounded-full bg-amber-400"></span>
          Active In Progress
        </span>
      );
    }

    const days = isValid(d) ? differenceInCalendarDays(d, new Date()) : null;

    // "if the schedule is lessthan 8 days make red highlight very very slow fade blinking"
    if (days !== null && days < 8) {
      const label =
        days < 0
          ? `${Math.abs(days)}d Overdue`
          : days === 0
          ? 'Due Today!'
          : days === 1
          ? 'Due Tomorrow'
          : `Due in ${days}d (<8d)`;

      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-red-600/90 text-white border border-red-400 shadow-sm animate-slow-fade-blink-dot">
          <span className="h-2 w-2 rounded-full bg-white animate-slow-fade-blink-dot"></span>
          {label}
        </span>
      );
    }

    if (isOverdue) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/40">
          <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
          Pending / Due
        </span>
      );
    }
    if (isToday(d)) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-500/40">
          <Clock className="w-3.5 h-3.5" />
          Scheduled Today
        </span>
      );
    }
    if (isTomorrow(d)) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
          <Calendar className="w-3.5 h-3.5" />
          Tomorrow
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-slate-800 text-slate-300 border border-slate-700">
        <Calendar className="w-3.5 h-3.5 text-slate-400" />
        {days !== null ? `In ${days}d (${format(d, 'dd MMM')})` : format(d, 'dd MMM (EEE)')}
      </span>
    );
  };

  return (
    <div
      className={`min-h-screen bg-[#0A0C14] text-white flex flex-col font-sans transition-all duration-300 w-full max-w-full overflow-x-hidden box-border public-mirror-root ${
        isKioskMode ? 'p-2 sm:p-4 md:p-6' : 'p-3 sm:p-5 md:p-8'
      }`}
    >
      {/* ─── LIVE HEADER BAR ─── */}
      <header className="bg-[#121524] border border-[#2B314E] rounded-2xl p-4 md:p-6 shadow-2xl mb-6 w-full max-w-full min-w-0">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 min-w-0">
          {/* Title & Live Badge */}
          <div className="flex items-center gap-3 md:gap-4 flex-wrap min-w-0 flex-1">
            <div className="p-3 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl shadow-lg border border-blue-400/30 flex items-center justify-center shrink-0">
              <Radio className="w-6 h-6 text-white animate-pulse" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                <h1 className="text-lg sm:text-xl md:text-2xl font-black tracking-tight text-white flex items-center gap-2">
                  Real-Time Public Mirror
                </h1>
                <span className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full text-[11px] sm:text-xs font-black bg-emerald-950/80 text-emerald-400 border border-emerald-500/50 shadow-sm shrink-0">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  LIVE SYNC ACTIVE
                </span>
                <span className="text-[10px] sm:text-[11px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 shrink-0">
                  READ-ONLY
                </span>
                {currentUser ? (
                  <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-bold px-2 sm:px-2.5 py-0.5 rounded-full bg-blue-900/40 text-blue-300 border border-blue-600/40 shrink-0">
                    <UserCheck className="w-3 h-3 text-blue-400" />
                    <span>Staff Connected</span>
                  </span>
                ) : null}
              </div>
              <p className="text-xs md:text-sm text-slate-400 mt-1 flex items-center gap-2 flex-wrap">
                <span>Workshop Maintenance & Fleet Dispatch Scheduler</span>
                <span className="hidden sm:inline">•</span>
                <span className="text-slate-300 font-mono">
                  {format(currentTime, 'EEEE, dd MMMM yyyy • HH:mm:ss')}
                </span>
              </p>
            </div>
          </div>

          {/* Quick Stats & Controls */}
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap shrink-0">
            {/* In Progress Stat */}
            <div className="bg-[#1A1E35] border border-amber-500/30 rounded-xl px-3 sm:px-4 py-2 flex items-center gap-2.5 sm:gap-3 shadow-inner">
              <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping shrink-0"></div>
              <div>
                <p className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">In Progress</p>
                <p className="text-base sm:text-lg font-black text-white leading-none">{totalInProgressCount}</p>
              </div>
            </div>

            {/* Active Schedule Stat */}
            <div className="bg-[#1A1E35] border border-blue-500/30 rounded-xl px-3 sm:px-4 py-2 flex items-center gap-2.5 sm:gap-3 shadow-inner">
              <Calendar className="w-4 h-4 text-blue-400 shrink-0" />
              <div>
                <p className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">Active Schedule</p>
                <p className="text-base sm:text-lg font-black text-white leading-none">{totalActiveScheduledCount}</p>
              </div>
            </div>

            {/* Staff Auth Button / User Chip */}
            {currentUser ? (
              <button
                onClick={handleStaffLogout}
                className="px-3 py-2 bg-[#1A1E35] hover:bg-rose-950/40 text-slate-300 hover:text-rose-300 border border-[#2B314E] hover:border-rose-500/40 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
                title="Disconnect Staff Session"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            ) : (
              <button
                onClick={() => setIsStaffModalOpen(true)}
                className="px-3.5 py-2 bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-600 hover:to-indigo-600 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Staff Login</span>
              </button>
            )}

            {/* Display Mode / Fullscreen Toggle */}
            <button
              onClick={() => setIsKioskMode(!isKioskMode)}
              className="p-2.5 bg-[#1A1E35] hover:bg-[#252B4D] border border-[#2B314E] text-slate-300 hover:text-white rounded-xl transition-colors cursor-pointer"
              title={isKioskMode ? 'Exit Kiosk View' : 'Kiosk / Fullscreen Mode'}
            >
              {isKioskMode ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            {/* View Admin Portal */}
            <a
              href="/maintenance"
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Admin Portal</span>
            </a>
          </div>
        </div>

        {/* Sync Status Banner */}
        <div className="mt-4 pt-3 border-t border-[#2B314E]/60 flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs text-slate-400 gap-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>
              Real-time Firestore synchronization active. Showing active workshop jobs and fleet dispatch schedules.
            </span>
          </div>
          <div className="flex items-center gap-1 font-mono text-[11px] text-slate-400">
            <RefreshCw className="w-3 h-3 text-slate-500 animate-spin-slow" />
            <span>Updated {formatDistanceToNow(lastSyncTime, { addSuffix: true })}</span>
          </div>
        </div>
      </header>

      {/* ─── STAFF AUTH NOTIFICATION BANNER (When unauthenticated) ─── */}
      {maintenanceAuthError && !currentUser && (
        <div className="bg-gradient-to-r from-amber-950/40 via-blue-950/30 to-amber-950/40 border border-amber-500/40 rounded-2xl p-4 mb-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 shrink-0">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">Workshop Maintenance Logs Require Staff Login</p>
              <p className="text-xs text-slate-300">
                Scheduled rentals are displaying in real-time. Connect your staff credentials to mirror active maintenance logs on this terminal.
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsStaffModalOpen(true)}
            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer whitespace-nowrap"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Sign In as Staff</span>
          </button>
        </div>
      )}

      {/* ─── TOP SUMMARY METRIC CARDS (Admin Dashboard Style) ─── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {/* In Progress Card */}
        <div
          onClick={() => setScheduleFilter(scheduleFilter === 'in-progress' ? 'all' : 'in-progress')}
          className={`bg-[#121524] border rounded-2xl p-4 shadow-xl cursor-pointer transition-all duration-200 hover:-translate-y-0.5 ${
            scheduleFilter === 'in-progress'
              ? 'border-amber-500 ring-2 ring-amber-500/30'
              : 'border-[#2B314E] hover:border-amber-500/40'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">In Progress</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-white">{totalInProgressCount}</span>
            <span className="text-xs font-semibold text-amber-400 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping inline-block"></span>
              Live active
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Jobs currently on workshop floor</p>
        </div>

        {/* Scheduled / Upcoming Card */}
        <div
          onClick={() => setScheduleFilter(scheduleFilter === 'scheduled' ? 'all' : 'scheduled')}
          className={`bg-[#121524] border rounded-2xl p-4 shadow-xl cursor-pointer transition-all duration-200 hover:-translate-y-0.5 ${
            scheduleFilter === 'scheduled'
              ? 'border-blue-500 ring-2 ring-blue-500/30'
              : 'border-[#2B314E] hover:border-blue-500/40'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Scheduled</span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-white">{scheduledCount}</span>
            <span className="text-xs font-semibold text-blue-400">Queued</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Upcoming bookings & dispatches</p>
        </div>

        {/* Due in < 8 Days Card (Red Highlighted) */}
        <div
          onClick={() => setScheduleFilter(scheduleFilter === '7days' ? 'all' : '7days')}
          className={`rounded-2xl p-4 shadow-xl cursor-pointer transition-all duration-200 hover:-translate-y-0.5 border ${
            scheduleFilter === '7days'
              ? 'border-red-500 ring-2 ring-red-500/50 bg-[#1E141D]'
              : dueWithin7DaysCount > 0
              ? 'border-red-500/80 border-l-4 !border-l-red-500 bg-gradient-to-b from-[#1C121A] to-[#121524] hover:border-red-400'
              : 'bg-[#121524] border-[#2B314E] hover:border-emerald-500/40'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Due &lt; 8 Days</span>
            <div className={`p-2 rounded-xl ${
              dueWithin7DaysCount > 0
                ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
            }`}>
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-white">{dueWithin7DaysCount}</span>
            {dueWithin7DaysCount > 0 ? (
              <span className="text-xs font-bold text-red-400 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-red-400 animate-slow-fade-blink-dot inline-block"></span>
                Urgent schedule
              </span>
            ) : (
              <span className="text-xs font-semibold text-emerald-400">All clear</span>
            )}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Scheduled within 7-8 days window</p>
        </div>

        {/* Workshop vs Rental Balance Card */}
        <div
          onClick={() => setActiveTab(activeTab === 'maintenance' ? 'all' : 'maintenance')}
          className={`bg-[#121524] border rounded-2xl p-4 shadow-xl cursor-pointer transition-all duration-200 hover:-translate-y-0.5 ${
            activeTab === 'maintenance'
              ? 'border-indigo-500 ring-2 ring-indigo-500/30'
              : 'border-[#2B314E] hover:border-indigo-500/40'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Workshop vs Rental</span>
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Wrench className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-white">{maintCount}</span>
            <span className="text-xs font-semibold text-indigo-300">Maint / {rentalCount} Rental</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Real-time mirror sync</p>
        </div>
      </div>

      {/* ─── FILTER CONTROLS & TAB BAR ─── */}
      <div className="bg-[#121524] border border-[#2B314E] rounded-2xl p-3 sm:p-4 shadow-xl mb-6 flex flex-col xl:flex-row gap-3 sm:gap-4 items-stretch xl:items-center justify-between w-full min-w-0">
        {/* Source Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 bg-[#0F111A] p-1.5 rounded-xl border border-[#2B314E] min-w-0">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 sm:gap-2 ${
              activeTab === 'all'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Layers className="w-3.5 h-3.5 shrink-0" />
            <span>All Live & Upcoming</span>
            <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-black/40 font-mono">
              {unifiedJobs.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('maintenance')}
            className={`px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 sm:gap-2 ${
              activeTab === 'maintenance'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Wrench className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>Maintenance Jobs</span>
            <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-black/40 font-mono">
              {maintCount}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('rentals')}
            className={`px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 sm:gap-2 ${
              activeTab === 'rentals'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Car className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Scheduled Rentals</span>
            <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-black/40 font-mono">
              {rentalCount}
            </span>
          </button>
        </div>

        {/* Schedule Filter Chips + Search Input + View Modes */}
        <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap min-w-0 flex-1 justify-between xl:justify-end">
          {/* Status & Schedule Chips */}
          <div className="flex flex-wrap items-center gap-1 bg-[#0F111A] p-1 rounded-xl border border-[#2B314E] min-w-0">
            <button
              onClick={() => setScheduleFilter('all')}
              className={`px-2 sm:px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                scheduleFilter === 'all' ? 'bg-[#1E2238] text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              All Active
            </button>
            <button
              onClick={() => setScheduleFilter('in-progress')}
              className={`px-2 sm:px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 sm:gap-1.5 ${
                scheduleFilter === 'in-progress'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shrink-0"></span>
              In Progress
            </button>
            <button
              onClick={() => setScheduleFilter('scheduled')}
              className={`px-2 sm:px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 sm:gap-1.5 ${
                scheduleFilter === 'scheduled'
                  ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Calendar className="w-3 h-3 text-blue-400 shrink-0" />
              Scheduled
            </button>
            <button
              onClick={() => setScheduleFilter('today')}
              className={`px-2 sm:px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 sm:gap-1.5 ${
                scheduleFilter === 'today'
                  ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Clock className="w-3 h-3 text-indigo-400 shrink-0" />
              Today / Due
            </button>
            <button
              onClick={() => setScheduleFilter('7days')}
              className={`px-2 sm:px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 sm:gap-1.5 ${
                scheduleFilter === '7days'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Calendar className="w-3 h-3 text-emerald-400 shrink-0" />
              Next 7 Days
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative flex-1 min-w-[150px] sm:min-w-[200px] max-w-full">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              autoComplete="off"
              data-lpignore="true"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search plate, model, job, customer..."
              className="w-full pl-9 pr-3 py-2 bg-[#0F111A] border border-[#2B314E] text-white placeholder:text-slate-500 text-xs font-medium rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* View Mode Toggle: Dual-View Scheduler, Table, or Grid */}
          <div className="flex items-center gap-1 bg-[#0F111A] p-1 rounded-xl border border-[#2B314E] shrink-0">
            <button
              onClick={() => setViewMode('dual')}
              title="Dual-View Scheduler (In-Progress & Scheduled side-by-side)"
              className={`px-2 sm:px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'dual'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Columns className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">Dual-View</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              title="Table View (Dense Workshop Queue)"
              className={`px-2 sm:px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">Table</span>
            </button>
            <button
              onClick={() => setViewMode('grid')}
              title="Grid Card View"
              className={`px-2 sm:px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">Grid</span>
            </button>
          </div>
        </div>
      </div>

      {/* ─── MAIN CONTENT DISPLAY ─── */}
      <main className="flex-1 w-full max-w-full min-w-0">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-400 space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            <p className="text-sm font-semibold tracking-wide">Syncing real-time schedule from Firestore...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="bg-[#121524] border border-[#2B314E] rounded-2xl p-12 text-center shadow-lg my-6">
            <ShieldCheck className="w-12 h-12 text-slate-500 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-white mb-1">No Active Jobs Matching Current Filter</h3>
            <p className="text-sm text-slate-400 max-w-md mx-auto mb-4">
              {activeTab === 'maintenance' && maintenanceAuthError && !currentUser
                ? 'Workshop maintenance logs are restricted to authenticated staff. Please sign in to view the live maintenance queue.'
                : 'There are currently no active maintenance jobs or rentals matching your selected tab or search query.'}
            </p>
            {activeTab === 'maintenance' && maintenanceAuthError && !currentUser && (
              <button
                onClick={() => setIsStaffModalOpen(true)}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-md inline-flex items-center gap-2 cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Staff Sign In</span>
              </button>
            )}
          </div>
        ) : viewMode === 'dual' ? (
          /* ─── DUAL-VIEW JOB SCHEDULER (In-Progress & Real-Time Scheduled Mirror) ─── */
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 items-start w-full min-w-0">
            {/* COLUMN 1: LIVE IN PROGRESS */}
            <div className="space-y-3.5 sm:space-y-4 min-w-0 w-full">
              {/* Column Header */}
              <div className="bg-[#121524] border border-amber-500/40 rounded-2xl p-3.5 sm:p-4 shadow-xl flex items-center justify-between gap-3 min-w-0">
                <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                  <div className="p-2 sm:p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30 shrink-0">
                    <Activity className="w-4 sm:w-5 h-4 sm:h-5 animate-pulse" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm sm:text-base font-black text-white tracking-wide truncate">Live In Progress</h2>
                      <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping shrink-0"></span>
                    </div>
                    <p className="text-[11px] sm:text-xs text-slate-400 truncate">Active jobs currently being serviced or dispatched</p>
                  </div>
                </div>
                <div className="px-2.5 sm:px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[11px] sm:text-xs font-mono font-black shrink-0">
                  {inProgressItems.length} ACTIVE
                </div>
              </div>

              {/* Items List */}
              {inProgressItems.length === 0 ? (
                <div className="bg-[#121524]/60 border border-dashed border-[#2B314E] rounded-2xl p-6 sm:p-8 text-center">
                  <CheckCircle2 className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-400">No Jobs Currently In Progress</p>
                  <p className="text-xs text-slate-500 mt-1">Upcoming jobs will appear here as soon as technicians start work</p>
                </div>
              ) : (
                <div className="space-y-3 min-w-0">
                  {inProgressItems.map((item) => {
                    const isMaintenance = item.source === 'maintenance';
                    return (
                      <div
                        key={item.id}
                        className="bg-gradient-to-b from-[#181C30] to-[#121524] border border-amber-500/40 rounded-2xl p-3.5 sm:p-4 shadow-xl hover:border-amber-400/60 transition-all ring-1 ring-amber-500/20 min-w-0"
                      >
                        {/* Header Row */}
                        <div className="flex items-center justify-between gap-2 mb-2.5 min-w-0 flex-wrap">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            {/* License Plate Badge */}
                            <div className="bg-[#FACC15] text-[#0A0C14] px-2 py-0.5 sm:px-2.5 sm:py-1 rounded font-mono font-black text-xs tracking-wider uppercase border border-amber-400 shadow-sm shrink-0">
                              {item.vehicleReg}
                            </div>
                            <span className="text-xs sm:text-sm font-bold text-white truncate">
                              {item.vehicleMake} {item.vehicleModel || 'Vehicle'}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {item.orderNumber && (
                              <span className="text-[10px] font-mono font-bold bg-[#0F111A] text-slate-300 px-1.5 py-0.5 rounded border border-[#2B314E]">
                                #{item.orderNumber}
                              </span>
                            )}
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
                              <span className="h-1.5 w-1.5 rounded-full bg-amber-400 shrink-0"></span>
                              In Progress
                            </span>
                          </div>
                        </div>

                        {/* Middle Details Grid */}
                        <div className="bg-[#0F111A] p-2.5 sm:p-3 rounded-xl border border-[#2B314E]/70 space-y-1.5 mb-2.5 min-w-0">
                          <div className="flex items-center justify-between text-xs gap-2">
                            <span className="text-slate-400 font-medium shrink-0">Job Category:</span>
                            <span className="font-bold text-blue-400 uppercase tracking-wide truncate">
                              {item.type}
                            </span>
                          </div>

                          {item.description && (
                            <p className="text-xs text-slate-300 line-clamp-2 italic">
                              "{item.description}"
                            </p>
                          )}

                          {item.customerName && (
                            <div className="text-xs text-emerald-400 pt-1 border-t border-[#2B314E]/40 font-medium truncate">
                              Customer: <span className="font-bold text-white">{item.customerName}</span>
                            </div>
                          )}

                          {item.location && (
                            <div className="flex items-center gap-1.5 text-xs text-slate-400 pt-1 border-t border-[#2B314E]/40 min-w-0">
                              <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                              <span className="truncate">
                                {item.location} {item.serviceProvider ? `• ${item.serviceProvider}` : ''}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Footer Schedule Timestamp */}
                        <div className="flex items-center justify-between text-xs text-slate-400 pt-1 border-t border-[#2B314E]/40 gap-2 flex-wrap min-w-0">
                          <div className="flex items-center gap-1.5 min-w-0 truncate">
                            <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            <span className="font-semibold text-slate-200 truncate">
                              Started / Scheduled: {formatScheduledTime(item.scheduledDate)}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider shrink-0">
                            {isMaintenance ? 'Workshop Log' : 'Rental Fleet'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* COLUMN 2: ACTIVE SCHEDULE (Real-Time Next 7 Days / Queue) */}
            <div className="space-y-3.5 sm:space-y-4 min-w-0 w-full">
              {/* Column Header */}
              <div className="bg-[#121524] border border-blue-500/40 rounded-2xl p-3.5 sm:p-4 shadow-xl flex items-center justify-between gap-3 min-w-0">
                <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                  <div className="p-2 sm:p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/30 shrink-0">
                    <Calendar className="w-4 sm:w-5 h-4 sm:h-5" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-sm sm:text-base font-black text-white tracking-wide truncate">Maintenance Active Schedule</h2>
                    <p className="text-[11px] sm:text-xs text-slate-400 truncate">Confirmed upcoming bookings queued within the 7-day window</p>
                  </div>
                </div>
                <div className="px-2.5 sm:px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[11px] sm:text-xs font-mono font-black shrink-0">
                  {scheduledItems.length} QUEUED
                </div>
              </div>

              {/* Items List */}
              {scheduledItems.length === 0 ? (
                <div className="bg-[#121524]/60 border border-dashed border-[#2B314E] rounded-2xl p-6 sm:p-8 text-center">
                  <Clock className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-400">No Scheduled Jobs Found</p>
                  <p className="text-xs text-slate-500 mt-1">Bookings confirmed in Admin will mirror here automatically</p>
                </div>
              ) : (
                <div className="space-y-3 min-w-0">
                  {scheduledItems.map((item) => {
                    const isMaintenance = item.source === 'maintenance';
                    const isUrgent = isLessThan8Days(item);

                    return (
                      <div
                        key={item.id}
                        className={`rounded-2xl p-3.5 sm:p-4 shadow-xl transition-all min-w-0 ${
                          isUrgent
                            ? 'border border-red-500/90 border-l-4 !border-l-red-500 bg-gradient-to-b from-[#220D15] to-[#121524] animate-slow-fade-blink-red shadow-red-950/40 ring-1 ring-red-500/40'
                            : 'bg-[#121524] border border-[#2B314E] hover:border-blue-500/40'
                        }`}
                      >
                        {/* Header Row */}
                        <div className="flex items-center justify-between gap-2 mb-2.5 min-w-0 flex-wrap">
                          <div className="flex items-center gap-2 min-w-0 flex-1 flex-wrap">
                            {/* License Plate Badge */}
                            <div className="bg-[#FACC15] text-[#0A0C14] px-2 py-0.5 sm:px-2.5 sm:py-1 rounded font-mono font-black text-xs tracking-wider uppercase border border-amber-400 shadow-sm shrink-0">
                              {item.vehicleReg}
                            </div>
                            <span className="text-xs sm:text-sm font-bold text-white truncate">
                              {item.vehicleMake} {item.vehicleModel || 'Vehicle'}
                            </span>
                            {isUrgent && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider bg-red-600 text-white px-1.5 py-0.5 rounded border border-red-400 shrink-0">
                                <span className="w-1.5 h-1.5 rounded-full bg-white animate-slow-fade-blink-dot shrink-0"></span>
                                Urgent &lt; 8d
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {item.orderNumber && (
                              <span className="text-[10px] font-mono font-bold bg-[#0F111A] text-slate-300 px-1.5 py-0.5 rounded border border-[#2B314E]">
                                #{item.orderNumber}
                              </span>
                            )}
                            {getRelativeBadge(item.scheduledDate, item.status, item.isOverdue)}
                          </div>
                        </div>

                        {/* Middle Details Grid */}
                        <div className="bg-[#0F111A] p-2.5 sm:p-3 rounded-xl border border-[#2B314E]/70 space-y-1.5 mb-2.5 min-w-0">
                          <div className="flex items-center justify-between text-xs gap-2">
                            <span className="text-slate-400 font-medium shrink-0">Job Category:</span>
                            <span className={`font-bold px-2 py-0.5 rounded text-[11px] uppercase tracking-wide border truncate ${getTypeBadgeColor(item.type)}`}>
                              {item.type}
                            </span>
                          </div>

                          {item.description && (
                            <p className="text-xs text-slate-300 line-clamp-2 italic">
                              "{item.description}"
                            </p>
                          )}

                          {item.customerName && (
                            <div className="text-xs text-emerald-400 pt-1 border-t border-[#2B314E]/40 font-medium truncate">
                              Customer: <span className="font-bold text-white">{item.customerName}</span>
                            </div>
                          )}

                          {item.location && (
                            <div className="flex items-center gap-1.5 text-xs text-slate-400 pt-1 border-t border-[#2B314E]/40 min-w-0">
                              <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                              <span className="truncate">
                                {item.location} {item.serviceProvider ? `• ${item.serviceProvider}` : ''}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Footer Schedule Timestamp */}
                        <div className="flex items-center justify-between text-xs text-slate-400 pt-1 border-t border-[#2B314E]/40 gap-2 flex-wrap min-w-0">
                          <div className="flex items-center gap-1.5 min-w-0 truncate">
                            <Clock className={`w-3.5 h-3.5 shrink-0 ${isUrgent ? 'text-red-400 animate-pulse' : 'text-blue-400'}`} />
                            <span className={`font-semibold truncate ${isUrgent ? 'text-red-300 font-bold' : 'text-white'}`}>
                              {formatScheduledTime(item.scheduledDate)}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider shrink-0">
                            {isMaintenance ? 'Workshop Log' : 'Rental Fleet'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ) : viewMode === 'table' ? (
          /* ─── TABLE VIEW: EXACT MATCH TO MAIN MAINTENANCE TABLE ─── */
          <div className="w-full min-w-0 max-w-full">
            {/* 1. Mobile & Tablet Card Layout (Zero Horizontal Scroll on narrow viewports) */}
            <div className="block lg:hidden space-y-3 w-full min-w-0">
              {filteredItems.map((item) => {
                const isInProgress = item.status === 'in-progress';
                const isMaintenance = item.source === 'maintenance';
                const isUrgent = isLessThan8Days(item);

                return (
                  <div
                    key={item.id}
                    className={`rounded-xl p-3.5 sm:p-4 shadow-md transition-all duration-200 border w-full min-w-0 ${
                      isUrgent
                        ? 'border-red-500/90 border-l-4 !border-l-red-600 bg-gradient-to-b from-[#220D15] to-[#121524] animate-slow-fade-blink-red ring-1 ring-red-500/40 shadow-red-950/40'
                        : isInProgress
                        ? 'border-amber-500/60 border-l-4 !border-l-amber-500 bg-gradient-to-b from-[#181C30] to-[#121524] ring-1 ring-amber-500/30'
                        : 'bg-[#121524] border-[#2B314E] hover:border-slate-600'
                    }`}
                  >
                    {/* Top Row: Plate + Vehicle + Order # + Live Status */}
                    <div className="flex items-center justify-between gap-2 flex-wrap min-w-0 mb-2">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className="bg-[#FACC15] text-[#0A0C14] px-2.5 py-0.5 rounded font-mono font-black text-xs uppercase border border-amber-400 shadow-xs shrink-0">
                          {item.vehicleReg}
                        </span>
                        <div className="min-w-0 truncate">
                          <span className="font-bold text-white text-xs sm:text-sm truncate">
                            {item.vehicleMake} {item.vehicleModel || 'Vehicle'}
                          </span>
                          <span className="text-[10px] text-slate-400 uppercase font-medium ml-1.5 shrink-0">
                            {isMaintenance ? '• Workshop' : '• Rental'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {item.orderNumber ? (
                          <span className="font-mono text-[10px] font-bold text-indigo-300 bg-indigo-950/60 border border-indigo-500/40 px-1.5 py-0.5 rounded">
                            #{item.orderNumber}
                          </span>
                        ) : item.rentalAgreementNumber ? (
                          <span className="font-mono text-[10px] font-bold text-emerald-300 bg-emerald-950/60 border border-emerald-500/40 px-1.5 py-0.5 rounded">
                            Agr: #{item.rentalAgreementNumber}
                          </span>
                        ) : null}

                        {isInProgress ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-400"></span>
                            In Progress
                          </span>
                        ) : isUrgent ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-red-600 text-white border border-red-400 shadow-xs animate-slow-fade-blink-dot">
                            <span className="h-1.5 w-1.5 rounded-full bg-white animate-slow-fade-blink-dot"></span>
                            Urgent
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-slate-800 text-slate-300 border border-slate-700">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            Scheduled
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Middle: Category & Description & Customer */}
                    <div className="bg-[#0F111A] p-2.5 rounded-lg border border-[#2B314E]/60 space-y-1.5 text-xs min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wide border ${getTypeBadgeColor(item.type)}`}>
                          {isMaintenance ? (
                            <Wrench className="w-3 h-3 text-amber-400 shrink-0" />
                          ) : (
                            <Car className="w-3 h-3 text-emerald-400 shrink-0" />
                          )}
                          <span>{item.type}</span>
                        </span>

                        {item.customerName && (
                          <span className="text-[11px] text-emerald-400 font-semibold truncate">
                            Customer: <span className="text-white">{item.customerName}</span>
                          </span>
                        )}
                      </div>

                      {item.description && (
                        <p className="text-xs text-slate-300 line-clamp-2 italic">
                          "{item.description}"
                        </p>
                      )}

                      {(item.location || item.serviceProvider) && (
                        <div className="flex items-center gap-1 text-[11px] text-slate-400 pt-1 border-t border-[#2B314E]/40 truncate">
                          <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                          <span className="truncate">{item.serviceProvider || item.location}</span>
                        </div>
                      )}
                    </div>

                    {/* Footer: Date & Time + Relative Badge */}
                    <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-[#2B314E]/40 gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5 min-w-0 truncate">
                        <Clock className={`w-3.5 h-3.5 shrink-0 ${isUrgent ? 'text-red-400 animate-pulse' : 'text-blue-400'}`} />
                        <span className={`font-semibold truncate ${isUrgent ? 'text-red-300 font-black' : 'text-slate-200'}`}>
                          {format(item.scheduledDate, 'dd/MM/yyyy HH:mm')}
                        </span>
                      </div>
                      <div className="shrink-0">
                        {getRelativeBadge(item.scheduledDate, item.status, item.isOverdue)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 2. Desktop Full Table (Separated Rows Card Layout - EXACT match to main Maintenance Table) */}
            <div className="hidden lg:block w-full min-w-0">
              <div className="w-full rounded-2xl border border-[#2B314E] shadow-xl bg-slate-900/60 p-3">
                <table className="w-full border-separate border-spacing-y-2 table-fixed text-left text-xs public-mirror-table">
                  <thead className="bg-[#16192B] text-white">
                    <tr className="border-b border-[#2B314E]">
                      <th className="py-3.5 px-3 text-left font-bold text-white uppercase tracking-wider select-none rounded-l-xl border-l border-y border-[#2B314E] w-[10%]">
                        Order #
                      </th>
                      <th className="py-3.5 px-3 text-left font-bold text-white uppercase tracking-wider select-none border-y border-[#2B314E] w-[21%]">
                        Vehicle
                      </th>
                      <th className="py-3.5 px-3 text-left font-bold text-white uppercase tracking-wider select-none border-y border-[#2B314E] w-[13%]">
                        Category
                      </th>
                      <th className="py-3.5 px-3 text-left font-bold text-white uppercase tracking-wider select-none border-y border-[#2B314E] w-[24%]">
                        Job Details & Customer
                      </th>
                      <th className="py-3.5 px-3 text-left font-bold text-white uppercase tracking-wider select-none border-y border-[#2B314E] w-[16%]">
                        Scheduled Date & Time
                      </th>
                      <th className="py-3.5 px-3 text-left font-bold text-white uppercase tracking-wider select-none rounded-r-xl border-r border-y border-[#2B314E] w-[16%]">
                        Live Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.map((item) => {
                      const isInProgress = item.status === 'in-progress';
                      const isMaintenance = item.source === 'maintenance';
                      const isUrgent = isLessThan8Days(item);

                      return (
                        <tr
                          key={item.id}
                          className={`group transition-all duration-150 rounded-xl cursor-default ${
                            isUrgent
                              ? 'row-urgent bg-red-950/25 animate-slow-fade-blink-table'
                              : isInProgress
                              ? 'row-in-progress bg-amber-500/[0.08]'
                              : 'row-normal bg-[#121524]'
                          }`}
                        >
                          {/* Order # (First cell: rounded-l-xl) */}
                          <td
                            className={`py-3.5 px-3 align-middle rounded-l-xl border-l border-y transition-colors duration-150 ${
                              isUrgent
                                ? 'border-l-4 !border-l-red-600 border-y-red-500/40 bg-red-950/25 group-hover:bg-red-950/50 group-hover:border-y-red-400/60'
                                : isInProgress
                                ? 'border-l-4 !border-l-amber-500 border-y-amber-500/30 bg-amber-500/[0.08] group-hover:bg-amber-500/[0.16] group-hover:border-y-amber-400/50'
                                : 'border-[#2B314E]/70 bg-[#121524] group-hover:bg-[#1A1F36] group-hover:border-[#3E4770]'
                            }`}
                          >
                            <div className="truncate">
                              {item.orderNumber ? (
                                <span className="font-mono text-xs font-bold text-indigo-300 bg-indigo-950/60 border border-indigo-500/40 px-2 py-0.5 rounded inline-block truncate">
                                  #{item.orderNumber}
                                </span>
                              ) : item.rentalAgreementNumber ? (
                                <span className="font-mono text-xs font-bold text-emerald-300 bg-emerald-950/60 border border-emerald-500/40 px-2 py-0.5 rounded inline-block truncate">
                                  Agr: #{item.rentalAgreementNumber}
                                </span>
                              ) : (
                                <span className="text-slate-500 font-mono text-xs">-</span>
                              )}
                            </div>
                          </td>

                          {/* Vehicle (Plate + Model) */}
                          <td
                            className={`py-3.5 px-3 align-middle border-y transition-colors duration-150 ${
                              isUrgent
                                ? 'border-y-red-500/40 bg-red-950/25 group-hover:bg-red-950/50 group-hover:border-y-red-400/60'
                                : isInProgress
                                ? 'border-y-amber-500/30 bg-amber-500/[0.08] group-hover:bg-amber-500/[0.16] group-hover:border-y-amber-400/50'
                                : 'border-[#2B314E]/70 bg-[#121524] group-hover:bg-[#1A1F36] group-hover:border-[#3E4770]'
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="bg-[#FACC15] text-[#0A0C14] px-2 py-0.5 rounded font-mono font-black text-xs tracking-wider uppercase border border-amber-400 shadow-xs shrink-0">
                                {item.vehicleReg}
                              </span>
                              <div className="min-w-0 flex-1 truncate">
                                <div className="font-bold text-white text-xs truncate">
                                  {item.vehicleMake} {item.vehicleModel || 'Vehicle'}
                                </div>
                                <div className="text-[10px] text-slate-400 uppercase font-medium truncate mt-0.5">
                                  {isMaintenance ? 'Workshop Log' : 'Fleet Rental'}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Category / Type */}
                          <td
                            className={`py-3.5 px-3 align-middle border-y transition-colors duration-150 ${
                              isUrgent
                                ? 'border-y-red-500/40 bg-red-950/25 group-hover:bg-red-950/50 group-hover:border-y-red-400/60'
                                : isInProgress
                                ? 'border-y-amber-500/30 bg-amber-500/[0.08] group-hover:bg-amber-500/[0.16] group-hover:border-y-amber-400/50'
                                : 'border-[#2B314E]/70 bg-[#121524] group-hover:bg-[#1A1F36] group-hover:border-[#3E4770]'
                            }`}
                          >
                            <div className="truncate">
                              <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wide border truncate ${getTypeBadgeColor(item.type)}`}>
                                {isMaintenance ? (
                                  <Wrench className="w-3 h-3 text-amber-400 shrink-0" />
                                ) : (
                                  <Car className="w-3 h-3 text-emerald-400 shrink-0" />
                                )}
                                <span className="truncate">{item.type}</span>
                              </span>
                            </div>
                          </td>

                          {/* Job Details & Customer */}
                          <td
                            className={`py-3.5 px-3 align-middle border-y transition-colors duration-150 ${
                              isUrgent
                                ? 'border-y-red-500/40 bg-red-950/25 group-hover:bg-red-950/50 group-hover:border-y-red-400/60'
                                : isInProgress
                                ? 'border-y-amber-500/30 bg-amber-500/[0.08] group-hover:bg-amber-500/[0.16] group-hover:border-y-amber-400/50'
                                : 'border-[#2B314E]/70 bg-[#121524] group-hover:bg-[#1A1F36] group-hover:border-[#3E4770]'
                            }`}
                          >
                            <div className="min-w-0">
                              <p className="text-xs text-slate-200 font-medium truncate">
                                {item.description || 'General Service / Fleet Booking'}
                              </p>
                              <div className="flex items-center gap-2 mt-0.5 truncate text-[11px]">
                                {item.customerName && (
                                  <span className="text-emerald-400 font-semibold truncate shrink-0">
                                    Customer: <span className="text-white">{item.customerName}</span>
                                  </span>
                                )}
                                {(item.location || item.serviceProvider) && (
                                  <span className="text-slate-400 truncate flex items-center gap-1">
                                    <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                                    <span className="truncate">{item.serviceProvider || item.location}</span>
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Scheduled Date & Time */}
                          <td
                            className={`py-3.5 px-3 align-middle border-y transition-colors duration-150 ${
                              isUrgent
                                ? 'border-y-red-500/40 bg-red-950/25 group-hover:bg-red-950/50 group-hover:border-y-red-400/60'
                                : isInProgress
                                ? 'border-y-amber-500/30 bg-amber-500/[0.08] group-hover:bg-amber-500/[0.16] group-hover:border-y-amber-400/50'
                                : 'border-[#2B314E]/70 bg-[#121524] group-hover:bg-[#1A1F36] group-hover:border-[#3E4770]'
                            }`}
                          >
                            <div className="min-w-0">
                              <span className={`text-xs font-bold block truncate ${
                                isUrgent
                                  ? 'text-red-300 font-black'
                                  : isInProgress
                                  ? 'text-amber-300 font-bold'
                                  : 'text-slate-200'
                              }`}>
                                {format(item.scheduledDate, 'dd/MM/yyyy HH:mm')}
                              </span>
                              <div className="mt-1 truncate">
                                {getRelativeBadge(item.scheduledDate, item.status, item.isOverdue)}
                              </div>
                            </div>
                          </td>

                          {/* Live Status Badge (Last cell: rounded-r-xl) */}
                          <td
                            className={`py-3.5 px-3 align-middle rounded-r-xl border-r border-y transition-colors duration-150 ${
                              isUrgent
                                ? 'border-r border-y-red-500/40 border-r-red-500/40 bg-red-950/25 group-hover:bg-red-950/50 group-hover:border-y-red-400/60 group-hover:border-r-red-400/60'
                                : isInProgress
                                ? 'border-r border-y-amber-500/30 border-r-amber-500/30 bg-amber-500/[0.08] group-hover:bg-amber-500/[0.16] group-hover:border-y-amber-400/50 group-hover:border-r-amber-400/50'
                                : 'border-[#2B314E]/70 bg-[#121524] group-hover:bg-[#1A1F36] group-hover:border-[#3E4770]'
                            }`}
                          >
                            <div className="truncate">
                              {isInProgress ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse truncate">
                                  <span className="h-2 w-2 rounded-full bg-amber-400 shrink-0"></span>
                                  In Progress
                                </span>
                              ) : isUrgent ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-red-600 text-white border border-red-400 shadow-sm animate-slow-fade-blink-dot truncate">
                                  <span className="h-2 w-2 rounded-full bg-white animate-slow-fade-blink-dot shrink-0"></span>
                                  Urgent Schedule
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-slate-800 text-slate-300 border border-slate-700 truncate">
                                  <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                  Scheduled
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          /* ─── GRID CARD VIEW ─── */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 w-full min-w-0">
            {filteredItems.map((item) => {
              const isInProgress = item.status === 'in-progress';
              const isMaintenance = item.source === 'maintenance';
              const isUrgent = isLessThan8Days(item);

              return (
                <div
                  key={item.id}
                  className={`relative rounded-2xl border transition-all duration-200 overflow-hidden flex flex-col shadow-xl w-full min-w-0 ${
                    isUrgent
                      ? 'bg-gradient-to-b from-[#220D15] to-[#121524] border-red-500/90 border-l-4 !border-l-red-600 animate-slow-fade-blink-red shadow-red-950/30 ring-1 ring-red-500/30'
                      : isInProgress
                      ? 'bg-gradient-to-b from-[#191D33] to-[#121524] border-amber-500/50 border-l-4 !border-l-amber-500 shadow-amber-500/5 ring-1 ring-amber-500/30'
                      : 'bg-[#121524] border-[#2B314E] hover:border-[#3E4670]'
                  }`}
                >
                  {/* Top Status Header */}
                  <div className="p-4 border-b border-[#2B314E]/60 flex items-center justify-between gap-2 bg-[#0F111A]/60">
                    <div className="flex items-center gap-2">
                      {isMaintenance ? (
                        <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          <Wrench className="w-4 h-4" />
                        </span>
                      ) : (
                        <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <Car className="w-4 h-4" />
                        </span>
                      )}
                      <span className="text-xs font-black uppercase tracking-wider text-slate-300">
                        {isMaintenance ? 'Workshop Job' : 'Rental Dispatch'}
                      </span>
                    </div>

                    {getRelativeBadge(item.scheduledDate, item.status, item.isOverdue)}
                  </div>

                  {/* Body Info */}
                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    {/* Vehicle Plate & Model */}
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        {/* UK Style License Plate Pill */}
                        <div className="inline-block bg-[#FACC15] text-[#0A0C14] px-3 py-1 rounded-md font-mono font-black text-sm tracking-wider uppercase shadow-md border border-amber-400 mb-2">
                          {item.vehicleReg}
                        </div>
                        <h3 className="text-base font-bold text-white leading-snug">
                          {item.vehicleMake} {item.vehicleModel || 'Vehicle'}
                        </h3>
                      </div>

                      {item.orderNumber && (
                        <span className="text-[11px] font-mono font-bold bg-[#1A1E35] text-slate-300 px-2 py-1 rounded border border-[#2B314E]">
                          #{item.orderNumber}
                        </span>
                      )}
                      {item.rentalAgreementNumber && (
                        <span className="text-[11px] font-mono font-bold bg-[#1A1E35] text-slate-300 px-2 py-1 rounded border border-[#2B314E]">
                          Agr: #{item.rentalAgreementNumber}
                        </span>
                      )}
                    </div>

                    {/* Job Details Card */}
                    <div className="bg-[#0F111A] p-3.5 rounded-xl border border-[#2B314E]/80 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400 font-medium">Job Category:</span>
                        <span className={`font-bold px-2 py-0.5 rounded text-[11px] uppercase tracking-wide border ${getTypeBadgeColor(item.type)}`}>
                          {item.type}
                        </span>
                      </div>

                      {item.description && (
                        <p className="text-xs text-slate-300 line-clamp-2 italic">
                          "{item.description}"
                        </p>
                      )}

                      {/* Customer / Provider Info */}
                      {item.customerName && (
                        <div className="text-xs text-emerald-400 pt-1 border-t border-[#2B314E]/40 font-medium">
                          Customer: <span className="font-bold text-white">{item.customerName}</span>
                        </div>
                      )}

                      {/* Location / Service Provider */}
                      {item.location && (
                        <div className="flex items-center gap-1.5 text-xs text-slate-400 pt-1 border-t border-[#2B314E]/40">
                          <MapPin className="w-3.5 h-3.5 text-slate-500" />
                          <span className="truncate">
                            {item.location} {item.serviceProvider ? `• ${item.serviceProvider}` : ''}
                          </span>
                        </div>
                      )}

                      {/* Estimated return for rentals */}
                      {item.estimatedReturnDate && (
                        <div className="flex items-center gap-1.5 text-xs text-emerald-400 pt-1 border-t border-[#2B314E]/40">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Expected Return: {format(item.estimatedReturnDate, 'dd/MM/yyyy')}</span>
                        </div>
                      )}
                    </div>

                    {/* Scheduled Time Banner */}
                    <div className="pt-2 flex items-center justify-between text-xs text-slate-400 border-t border-[#2B314E]/50">
                      <div className="flex items-center gap-1.5">
                        <Clock className={`w-3.5 h-3.5 ${isUrgent ? 'text-red-400 animate-pulse' : 'text-blue-400'}`} />
                        <span className={`font-semibold ${isUrgent ? 'text-red-300 font-bold' : 'text-white'}`}>
                          {formatScheduledTime(item.scheduledDate)}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-500 font-medium">
                        ReadOnly Mirror
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* ─── STAFF AUTH MODAL ─── */}
      {isStaffModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#121524] border border-[#2B314E] rounded-2xl p-6 max-w-md w-full shadow-2xl relative">
            <button
              onClick={() => setIsStaffModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-blue-600/20 text-blue-400 rounded-xl border border-blue-500/30">
                <Lock className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Staff Terminal Login</h3>
                <p className="text-xs text-slate-400">Authenticate to mirror live workshop maintenance jobs</p>
              </div>
            </div>

            {staffError && (
              <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs p-3 rounded-xl mb-4 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{staffError}</span>
              </div>
            )}

            <form onSubmit={handleStaffLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Staff Email</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    value={staffEmail}
                    onChange={(e) => setStaffEmail(e.target.value)}
                    placeholder="staff@fleetmanagement.com"
                    className="w-full pl-9 pr-3 py-2.5 bg-[#0F111A] border border-[#2B314E] text-white text-xs rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="password"
                    required
                    value={staffPassword}
                    onChange={(e) => setStaffPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2.5 bg-[#0F111A] border border-[#2B314E] text-white text-xs rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsStaffModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={staffSubmitting}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer flex items-center gap-2"
                >
                  {staffSubmitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{staffSubmitting ? 'Authenticating...' : 'Connect Terminal'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── FOOTER KIOSK BAR ─── */}
      <footer className="mt-8 pt-4 border-t border-[#2B314E]/60 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-2">
        <p>
          Real-Time Public Mirror &copy; {new Date().getFullYear()} Fleet Management System. Strictly Read-Only View.
        </p>
        <p className="font-mono text-[11px] text-slate-400">
          Sync Status: Connected • Snapshot Listener Active
        </p>
      </footer>
    </div>
  );
};

export default PublicMirror;

