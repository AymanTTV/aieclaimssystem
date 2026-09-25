// src/components/workshop/WorkshopTVBoard.tsx
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Wrench,
  Clock,
  Car,
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  Sliders,
  AlertTriangle,
  CheckCircle2,
  Layers,
  MapPin,
  User,
  X,
  Key,
  ShieldCheck,
  Check,
  Radio,
  Calendar,
  RefreshCw,
  Tv,
} from 'lucide-react';
import {
  format,
  differenceInCalendarDays,
  startOfDay,
  isValid,
  formatDistanceToNow,
  isToday,
  isTomorrow,
} from 'date-fns';
import {
  TVBoardItem,
  TVFilterCategory,
  TVRotationSpeed,
  TV_ROTATION_SPEED_OPTIONS,
  filterTVItemsByCategory,
  subscribeTVMirrorData,
} from '../../utils/tvMirrorService';

// ─────────────────────────────────────────────────────────────
// EXACT COLOR HELPERS MATCHING LIVE PUBLIC MIRROR
// ─────────────────────────────────────────────────────────────

interface LiveTypingBadgeProps {
  messages: string[];
  variant?: 'urgent' | 'in-progress' | 'scheduled';
  showDot?: boolean;
  className?: string;
}

const LiveTypingBadge: React.FC<LiveTypingBadgeProps> = ({
  messages,
  variant = 'scheduled',
  showDot = true,
  className = '',
}) => {
  const [msgIdx, setMsgIdx] = useState(0);
  const [text, setText] = useState(messages[0] || '');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isTyping, setIsTyping] = useState(false);

  // 3-minute hard reset sync matching Live Public Mirror
  useEffect(() => {
    const syncInterval = setInterval(() => {
      setMsgIdx(0);
      setText('');
      setIsDeleting(false);
      setIsTyping(true);
    }, 180000);

    return () => clearInterval(syncInterval);
  }, []);

  // Smooth typewriter sliding transition between messages
  useEffect(() => {
    if (!messages || messages.length === 0) return;
    const currentFullText = messages[msgIdx % messages.length];

    if (!isDeleting) {
      if (text.length < currentFullText.length) {
        setIsTyping(true);
        const timeout = setTimeout(() => {
          setText(currentFullText.slice(0, text.length + 1));
        }, 50);
        return () => clearTimeout(timeout);
      } else {
        setIsTyping(false);
        const timeout = setTimeout(() => {
          if (messages.length > 1) {
            setIsDeleting(true);
          }
        }, 5000);
        return () => clearTimeout(timeout);
      }
    } else {
      if (text.length > 0) {
        setIsTyping(true);
        const timeout = setTimeout(() => {
          setText(text.slice(0, -1));
        }, 25);
        return () => clearTimeout(timeout);
      } else {
        setIsDeleting(false);
        setMsgIdx((prev) => (prev + 1) % messages.length);
      }
    }
  }, [text, isDeleting, msgIdx, messages]);

  const variantClasses =
    variant === 'urgent'
      ? 'text-white border shadow-md animate-more-color-blink-red'
      : variant === 'in-progress'
      ? 'text-white border shadow-md animate-more-color-blink-amber'
      : 'bg-slate-800 text-slate-200 border border-slate-700';

  return (
    <span
      className={`public-mirror-badge select-none inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black uppercase tracking-wider truncate cursor-default ${variantClasses} ${className}`}
      style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
    >
      {showDot && (
        <span
          className={`h-2 w-2 rounded-full shrink-0 ${
            variant === 'urgent'
              ? 'bg-white animate-slow-fade-blink-dot'
              : variant === 'in-progress'
              ? 'bg-amber-200 animate-pulse'
              : 'bg-slate-400'
          }`}
        />
      )}
      <span className="truncate select-none drop-shadow-xs">
        {text}
        {isTyping && <span className="animate-caret font-normal opacity-90 ml-0.5">|</span>}
      </span>
    </span>
  );
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

const getRelativeBadge = (d: Date, status: string, isOverdue?: boolean) => {
  if (status === 'in-progress') {
    return (
      <LiveTypingBadge
        messages={['IN PROGRESS', 'ACTIVE SERVICE', 'IN WORKSHOP']}
        variant="in-progress"
      />
    );
  }

  const days = isValid(d) ? differenceInCalendarDays(d, new Date()) : null;

  if (days !== null && days < 8) {
    const scheduleMessages =
      days < 0
        ? [`${Math.abs(days)}D OVERDUE`, `${format(d, 'dd/MM HH:mm')}`, `${Math.abs(days)}D OVERDUE`]
        : days === 0
        ? ['DUE TODAY', `${format(d, 'HH:mm')} TODAY`, 'DUE TODAY']
        : [`DUE IN ${days}D`, `${format(d, 'dd/MM HH:mm')}`, `DUE IN ${days}D`];

    return (
      <LiveTypingBadge
        messages={scheduleMessages}
        variant="urgent"
      />
    );
  }

  if (isOverdue) {
    return (
      <LiveTypingBadge
        messages={['PENDING / DUE', 'OVERDUE NOTICE']}
        variant="urgent"
      />
    );
  }
  if (isToday(d)) {
    return (
      <LiveTypingBadge
        messages={['SCHEDULED TODAY', format(d, 'HH:mm')]}
        variant="scheduled"
        className="bg-blue-600/90 text-white border-blue-400/80 shadow-xs"
      />
    );
  }
  if (isTomorrow(d)) {
    return (
      <LiveTypingBadge
        messages={['TOMORROW', format(d, 'HH:mm')]}
        variant="scheduled"
        className="bg-indigo-600/90 text-white border-indigo-400/80 shadow-xs"
      />
    );
  }
  return (
    <LiveTypingBadge
      messages={[
        days !== null ? `In ${days}d (${format(d, 'dd MMM')})` : format(d, 'dd MMM (EEE)'),
        format(d, 'dd/MM/yyyy HH:mm'),
      ]}
      variant="scheduled"
      showDot={false}
    />
  );
};

const getLiveStatusBadge = (item: any, isUrgent: boolean, isInProgress: boolean) => {
  if (isInProgress) {
    return (
      <LiveTypingBadge
        messages={['IN PROGRESS', 'ACTIVE JOB', 'WORKSHOP IN-PROGRESS']}
        variant="in-progress"
      />
    );
  }
  if (item?.status === 'completed') {
    return (
      <LiveTypingBadge
        messages={['COMPLETED', 'READY FOR DISPATCH']}
        variant="scheduled"
        className="bg-emerald-900/90 text-white border-emerald-500/60 shadow-xs"
      />
    );
  }
  if (item?.category === 'available' || item?.status === 'available') {
    return (
      <LiveTypingBadge
        messages={['DEPOT READY', 'AVAILABLE', 'INSPECTED']}
        variant="scheduled"
        className="bg-teal-900/80 text-teal-200 border-teal-500/50 shadow-xs"
      />
    );
  }
  if (isUrgent) {
    return (
      <LiveTypingBadge
        messages={['SCHEDULED', 'ON SCHEDULE', 'LIVE DISPATCH', 'CONFIRMED']}
        variant="urgent"
      />
    );
  }
  return (
    <LiveTypingBadge
      messages={['SCHEDULED', 'ON SCHEDULE', 'CONFIRMED']}
      variant="scheduled"
    />
  );
};

export interface WorkshopTVBoardProps {
  jobs?: any[];
  onClose?: () => void;
  defaultLinesPerPage?: number;
  defaultInterval?: TVRotationSpeed;
  lastSyncTime?: Date;
}

export const WorkshopTVBoard: React.FC<WorkshopTVBoardProps> = ({
  jobs: initialJobs,
  onClose,
  defaultLinesPerPage = 6,
  defaultInterval = 15000, // 15 Seconds Default
  lastSyncTime: initialSyncTime = new Date(),
}) => {
  // Live items state (either from initialJobs or real-time subscription)
  const [liveItems, setLiveItems] = useState<TVBoardItem[]>([]);
  const [lastSync, setLastSync] = useState<Date>(initialSyncTime);

  // 1. Subscribe to live Firestore mirror data
  useEffect(() => {
    const unsub = subscribeTVMirrorData(({ items }) => {
      setLiveItems(items);
      setLastSync(new Date());
    });
    return () => unsub();
  }, []);

  // Combine initialJobs if passed and liveItems
  const allBoardItems = useMemo<TVBoardItem[]>(() => {
    if (liveItems.length > 0) return liveItems;
    if (initialJobs && initialJobs.length > 0) {
      const todayStart = startOfDay(new Date());
      return initialJobs.map((j) => {
        const jDate = j.scheduledDate ? new Date(j.scheduledDate) : new Date();
        const daysRemaining = differenceInCalendarDays(jDate, todayStart);
        const isInProgress = j.status === 'in-progress';
        return {
          id: j.id,
          category: j.source === 'rental' ? 'rental' : 'maintenance',
          source: j.source || 'maintenance',
          title: j.title || 'WORKSHOP JOB',
          type: j.type || 'Service',
          description: j.description,
          status: isInProgress ? 'in-progress' : 'scheduled',
          scheduledDate: jDate,
          daysRemaining,
          isUrgent: !isInProgress && daysRemaining < 7,
          isWorkshop: isInProgress,
          vehicleMake: j.vehicleMake,
          vehicleModel: j.vehicleModel,
          vehicleReg: j.vehicleReg,
          location: j.location,
          serviceProvider: j.serviceProvider,
          customerName: j.customerName,
          orderNumber: j.orderNumber,
        };
      });
    }
    return [];
  }, [liveItems, initialJobs]);

  // ─────────────────────────────────────────────────────────────
  // 2. FILTER CATEGORIES & SELECTORS (4 VIEWS)
  // - ALL (Shows all records)
  // - MAINTENANCE (MOT, Mileage Service, Control Arms, Repairs, Road Tax)
  // - RENT SCHEDULE (Active driver rentals, taxi contracts, fleet hires)
  // - AVAILABLE VEHICLES (Unassigned, depot-ready vehicles)
  // ─────────────────────────────────────────────────────────────
  const [activeFilter, setActiveFilter] = useState<TVFilterCategory>('all');

  const filteredItems = useMemo(() => {
    return filterTVItemsByCategory(allBoardItems, activeFilter);
  }, [allBoardItems, activeFilter]);

  const categoryCounts = useMemo(() => {
    return {
      all: allBoardItems.length,
      maintenance: allBoardItems.filter((i) => i.category === 'maintenance').length,
      rentSchedule: allBoardItems.filter((i) => i.category === 'rental').length,
      availableVehicles: allBoardItems.filter((i) => i.category === 'available').length,
    };
  }, [allBoardItems]);

  const totalInProgressCount = useMemo(() => {
    return allBoardItems.filter((i) => i.status === 'in-progress' || i.isWorkshop).length;
  }, [allBoardItems]);

  const totalActiveScheduledCount = useMemo(() => {
    return allBoardItems.filter((i) => i.status === 'scheduled').length;
  }, [allBoardItems]);

  // ─────────────────────────────────────────────────────────────
  // 3. PAGE PAGINATION & LINES CONTROL
  // - Configurable lines per page (Default: 6 lines; editable 1 to 20)
  // ─────────────────────────────────────────────────────────────
  const [linesPerPage, setLinesPerPage] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('workshop_tv_lines_per_page');
      if (saved) {
        const val = parseInt(saved, 10);
        if (val >= 1 && val <= 20) return val;
      }
    } catch {}
    return defaultLinesPerPage;
  });

  const handleLinesPerPageChange = (val: number) => {
    const safeVal = Math.max(1, Math.min(20, val));
    setLinesPerPage(safeVal);
    try {
      localStorage.setItem('workshop_tv_lines_per_page', String(safeVal));
    } catch {}
    setCurrentPageIndex(0);
    slideStartTimeRef.current = Date.now();
  };

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / linesPerPage));
  const [currentPageIndex, setCurrentPageIndex] = useState<number>(0);

  useEffect(() => {
    if (currentPageIndex >= totalPages) {
      setCurrentPageIndex(0);
      slideStartTimeRef.current = Date.now();
    }
  }, [totalPages, currentPageIndex]);

  const currentPageItems = useMemo(() => {
    const start = currentPageIndex * linesPerPage;
    return filteredItems.slice(start, start + linesPerPage);
  }, [filteredItems, currentPageIndex, linesPerPage]);

  // ─────────────────────────────────────────────────────────────
  // 4. DYNAMIC AUTO-ROTATION & TIMER
  // - Options: 15 Seconds (Default), 30 Seconds, 1 Minute, 2 Minutes
  // ─────────────────────────────────────────────────────────────
  const [rotationSpeed, setRotationSpeed] = useState<TVRotationSpeed>(() => {
    try {
      const saved = localStorage.getItem('workshop_tv_rotation_speed');
      if (saved) {
        const val = parseInt(saved, 10) as TVRotationSpeed;
        if ([15000, 30000, 60000, 120000].includes(val)) return val;
      }
    } catch {}
    return defaultInterval;
  });

  const handleRotationSpeedChange = (speed: TVRotationSpeed) => {
    setRotationSpeed(speed);
    try {
      localStorage.setItem('workshop_tv_rotation_speed', String(speed));
    } catch {}
    slideStartTimeRef.current = Date.now();
    setSecondsRemaining(Math.ceil(speed / 1000));
  };

  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);

  // Digital TV clock
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Animated progress bar countdown timer
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(Math.ceil(rotationSpeed / 1000));
  const slideStartTimeRef = useRef<number>(Date.now());

  // Slide navigation
  const nextPage = useCallback(() => {
    setCurrentPageIndex((prev) => (prev + 1) % totalPages);
    slideStartTimeRef.current = Date.now();
    setProgressPercent(0);
    setSecondsRemaining(Math.ceil(rotationSpeed / 1000));
  }, [totalPages, rotationSpeed]);

  const prevPage = useCallback(() => {
    setCurrentPageIndex((prev) => (prev - 1 + totalPages) % totalPages);
    slideStartTimeRef.current = Date.now();
    setProgressPercent(0);
    setSecondsRemaining(Math.ceil(rotationSpeed / 1000));
  }, [totalPages, rotationSpeed]);

  // Auto-rotation loop
  useEffect(() => {
    if (isPaused || totalPages <= 1) {
      setProgressPercent(0);
      return;
    }

    const intervalTimer = setInterval(() => {
      const elapsed = Date.now() - slideStartTimeRef.current;
      const progress = Math.min(100, (elapsed / rotationSpeed) * 100);
      const remaining = Math.max(0, Math.ceil((rotationSpeed - elapsed) / 1000));

      setProgressPercent(progress);
      setSecondsRemaining(remaining);

      if (elapsed >= rotationSpeed) {
        nextPage();
      }
    }, 100);

    return () => clearInterval(intervalTimer);
  }, [isPaused, rotationSpeed, nextPage, totalPages]);

  // Keyboard navigation & Fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        nextPage();
      } else if (e.key === 'ArrowLeft') {
        prevPage();
      } else if (e.key === 'p' || e.key === 'P') {
        setIsPaused((p) => !p);
      } else if (e.key === 'f' || e.key === 'F') {
        toggleFullscreen();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nextPage, prevPage]);

  return (
    <div className="relative min-h-screen bg-[#0A0C14] text-white flex flex-col font-sans select-none overflow-x-hidden p-3 sm:p-5 md:p-6 w-full max-w-full box-border public-mirror-root">
      {/* ─────────────────────────────────────────────────────────────
          1. TOP ANIMATED COUNTDOWN PROGRESS BAR
         ───────────────────────────────────────────────────────────── */}
      <div className="w-full bg-[#121524] h-2.5 rounded-full overflow-hidden mb-4 border border-[#2B314E] shadow-lg relative shrink-0">
        <div
          className="h-full bg-gradient-to-r from-blue-600 via-indigo-500 to-blue-400 transition-all duration-100 ease-linear shadow-[0_0_12px_rgba(59,130,246,0.8)]"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. LIVE HEADER BAR - EXACT MATCH TO LIVE PUBLIC MIRROR
         ───────────────────────────────────────────────────────────── */}
      <header className="bg-[#121524] border border-[#2B314E] rounded-2xl p-4 md:p-6 shadow-2xl mb-5 w-full max-w-full min-w-0 shrink-0">
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
                <span className="inline-flex items-center gap-1.5 text-[10px] sm:text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-900/40 text-emerald-300 border border-emerald-500/40 shadow-xs shrink-0">
                  <Tv className="w-3 h-3 text-emerald-400" />
                  <span>TV AUTO-ROTATION</span>
                </span>
              </div>
              <p className="text-xs md:text-sm text-slate-400 mt-1 flex items-center gap-2 flex-wrap">
                <span>Workshop Maintenance &amp; Fleet Dispatch Scheduler</span>
                <span className="hidden sm:inline">•</span>
                <span className="text-slate-300 font-mono">
                  {format(currentTime, 'EEEE, dd MMMM yyyy • HH:mm:ss')}
                </span>
              </p>
            </div>
          </div>

          {/* Quick Stats & TV Controls */}
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

            {/* Play/Pause Auto-Rotation Button */}
            <button
              type="button"
              onClick={() => setIsPaused((prev) => !prev)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                isPaused
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30 shadow-md'
                  : 'bg-emerald-950/50 text-emerald-300 border-emerald-500/40 hover:bg-emerald-900/60 shadow-md'
              }`}
              title={isPaused ? 'Resume Auto-Rotation (P)' : 'Pause Auto-Rotation (P)'}
            >
              {isPaused ? <Play className="w-3.5 h-3.5 fill-current" /> : <Pause className="w-3.5 h-3.5 fill-current" />}
              <span className="hidden sm:inline">{isPaused ? 'Paused' : 'Auto-Rotating'}</span>
            </button>

            {/* Prev / Next Page Navigation */}
            <div className="flex items-center gap-1 bg-[#1A1E35] border border-[#2B314E] p-0.5 rounded-xl">
              <button
                type="button"
                onClick={prevPage}
                className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700/60 transition cursor-pointer"
                title="Previous Page (Arrow Left)"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-[11px] font-mono font-bold text-slate-300 px-1.5">
                {currentPageIndex + 1}/{totalPages}
              </span>
              <button
                type="button"
                onClick={nextPage}
                className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700/60 transition cursor-pointer"
                title="Next Page (Arrow Right)"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Settings Trigger Modal */}
            <button
              type="button"
              onClick={() => setShowSettingsModal(true)}
              className="p-2.5 sm:px-3 sm:py-2 bg-[#1A1E35] hover:bg-[#252B4D] border border-[#2B314E] text-slate-300 hover:text-white rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5"
              title="Configure Lines Per Page & Rotation Speed"
            >
              <Sliders className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Settings</span>
            </button>

            {/* Fullscreen Toggle */}
            <button
              type="button"
              onClick={toggleFullscreen}
              className="p-2.5 bg-[#1A1E35] hover:bg-[#252B4D] border border-[#2B314E] text-slate-300 hover:text-white rounded-xl transition-colors cursor-pointer"
              title={isFullscreen ? 'Exit Fullscreen (F)' : 'Fullscreen (F)'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            {/* Exit TV Mode / Return to Mirror */}
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 bg-[#1A1E35] hover:bg-rose-950/40 text-slate-300 hover:text-rose-300 border border-[#2B314E] hover:border-rose-500/40 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
                title="Return to Standard Mirror"
              >
                <X className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Exit TV Mode</span>
              </button>
            )}
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
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-slate-300 font-mono text-[11px]">
              <Clock className="w-3 h-3 text-emerald-400" />
              <span className="text-emerald-400 font-bold">{isPaused ? 'ROTATION PAUSED' : `NEXT PAGE IN ${secondsRemaining}s`}</span>
            </div>
            <div className="flex items-center gap-1 font-mono text-[11px] text-slate-400">
              <RefreshCw className="w-3 h-3 text-slate-500 animate-spin-slow" />
              <span>Updated {formatDistanceToNow(lastSync, { addSuffix: true })}</span>
            </div>
          </div>
        </div>
      </header>

      {/* ─────────────────────────────────────────────────────────────
          3. VISUAL TOGGLE FILTERS (4 VIEWS)
          - ALL (Shows all records)
          - MAINTENANCE (MOT, Mileage Service, Control Arms, Repairs, Road Tax)
          - RENT SCHEDULE (Active driver rentals, taxi contracts, fleet hires)
          - AVAILABLE VEHICLES (Unassigned, depot-ready vehicles)
         ───────────────────────────────────────────────────────────── */}
      <nav className="bg-[#121524] border border-[#2B314E] rounded-2xl px-4 sm:px-6 py-3 mb-4 flex flex-wrap items-center justify-between gap-3 shadow-xl z-20 shrink-0">
        <div className="flex items-center gap-2 overflow-x-auto">
          {[
            { id: 'all' as const, label: 'ALL RECORDS', count: categoryCounts.all },
            { id: 'maintenance' as const, label: 'MAINTENANCE', count: categoryCounts.maintenance },
            { id: 'rent-schedule' as const, label: 'RENT SCHEDULE', count: categoryCounts.rentSchedule },
            { id: 'available-vehicles' as const, label: 'AVAILABLE VEHICLES', count: categoryCounts.availableVehicles },
          ].map((cat) => {
            const active = activeFilter === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  setActiveFilter(cat.id);
                  setCurrentPageIndex(0);
                  slideStartTimeRef.current = Date.now();
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-black tracking-wider transition-all flex items-center gap-2 cursor-pointer border ${
                  active
                    ? 'bg-blue-600 text-white border-blue-500 shadow-md'
                    : 'bg-[#16192B] text-slate-400 border-[#2B314E] hover:text-slate-200 hover:bg-[#1f233a]'
                }`}
              >
                <span>{cat.label}</span>
                <span
                  className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                    active ? 'bg-black/30 text-white' : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {cat.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Page status & Countdown indicator */}
        <div className="flex items-center gap-2.5 text-xs font-semibold">
          <div className="px-3 py-1 rounded-md bg-[#16192B] border border-[#2B314E] text-slate-300 flex items-center gap-1.5 font-mono">
            <Layers className="w-3.5 h-3.5 text-slate-400" />
            <span>
              Page <strong className="text-white">{currentPageIndex + 1}</strong> of{' '}
              <strong className="text-white">{totalPages}</strong>
            </span>
          </div>

          <div
            className={`px-3 py-1 rounded-md border flex items-center gap-1.5 font-mono ${
              isPaused
                ? 'bg-amber-950/40 text-amber-400 border-amber-800/40'
                : 'bg-[#16192B] text-emerald-400 border-[#2B314E]'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>{isPaused ? 'ROTATION PAUSED' : `NEXT PAGE IN ${secondsRemaining}s`}</span>
          </div>
        </div>
      </nav>

      {/* ─────────────────────────────────────────────────────────────
          4. MAIN TV DISPLAY TABLE - EXACT MATCH TO LIVE PUBLIC MIRROR
          HEADER MATCHES:
          ORDER # | VEHICLE | CATEGORY | JOB DETAILS & CUSTOMER | SCHEDULED DATE & TIME | LIVE STATUS
         ───────────────────────────────────────────────────────────── */}
      <main className="flex-1 p-3 sm:p-5 flex flex-col justify-start overflow-hidden">
        {currentPageItems.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-20 text-center space-y-4">
            <div className="w-20 h-20 rounded-2xl bg-slate-900 border border-[#2B314E] flex items-center justify-center text-slate-500 shadow-inner">
              <CheckCircle2 className="w-10 h-10 text-emerald-400/60" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white mb-1">No Active Records Found</h3>
              <p className="text-sm text-slate-400 max-w-md">
                No jobs or fleet records match the selected category filter at this time.
              </p>
            </div>
          </div>
        ) : (
          <div className="w-full flex-1 flex flex-col min-w-0">
            {/* Desktop Full Table matching Live Public Mirror */}
            <div className="w-full rounded-2xl border border-[#2B314E] shadow-xl bg-slate-900/60 p-3 overflow-hidden flex-1 flex flex-col">
              <table className="w-full border-separate border-spacing-y-2 table-fixed text-left text-xs public-mirror-table">
                {/* ─────────────────────────────────────────────────────────────
                    EXACT HEADER MATCHING LIVE PUBLIC MIRROR
                   ───────────────────────────────────────────────────────────── */}
                <thead className="bg-[#16192B] text-white">
                  <tr className="border-b border-[#2B314E]">
                    <th className="py-3.5 px-3 text-left font-bold text-white uppercase tracking-wider select-none rounded-l-xl border-l border-y border-[#2B314E] w-[10%]">
                      ORDER #
                    </th>
                    <th className="py-3.5 px-3 text-left font-bold text-white uppercase tracking-wider select-none border-y border-[#2B314E] w-[21%]">
                      VEHICLE
                    </th>
                    <th className="py-3.5 px-3 text-left font-bold text-white uppercase tracking-wider select-none border-y border-[#2B314E] w-[13%]">
                      CATEGORY
                    </th>
                    <th className="py-3.5 px-3 text-left font-bold text-white uppercase tracking-wider select-none border-y border-[#2B314E] w-[24%]">
                      JOB DETAILS &amp; CUSTOMER
                    </th>
                    <th className="py-3.5 px-3 text-left font-bold text-white uppercase tracking-wider select-none border-y border-[#2B314E] w-[16%]">
                      SCHEDULED DATE &amp; TIME
                    </th>
                    <th className="py-3.5 px-3 text-left font-bold text-white uppercase tracking-wider select-none rounded-r-xl border-r border-y border-[#2B314E] w-[16%]">
                      LIVE STATUS
                    </th>
                  </tr>
                </thead>

                {/* ─────────────────────────────────────────────────────────────
                    TABLE BODY - EXACT COLOR & BLINK MATCH TO LIVE PUBLIC MIRROR
                   ───────────────────────────────────────────────────────────── */}
                <tbody>
                  {currentPageItems.map((item) => {
                    const isWorkshop = item.isWorkshop || item.status === 'in-progress';
                    const daysRemaining = item.daysRemaining;
                    const jobDate = item.scheduledDate;
                    const isUrgent = !isWorkshop && (daysRemaining < 8 || item.status === 'overdue');

                    return (
                      <tr
                        key={item.id}
                        className={`group transition-all duration-150 rounded-xl cursor-default ${
                          isUrgent
                            ? 'row-urgent animate-slow-fade-blink-table'
                            : isWorkshop
                            ? 'row-in-progress bg-amber-500/[0.08]'
                            : 'row-normal bg-[#121524]'
                        }`}
                      >
                        {/* 1. ORDER # (First cell: rounded-l-xl with left border) */}
                        <td
                          className={`py-3.5 px-3 align-middle rounded-l-xl border-l border-y transition-colors duration-150 ${
                            isUrgent
                              ? 'border-l-4 !border-l-red-500 border-y-red-700/80 bg-[#26070b] group-hover:bg-[#380a10] group-hover:border-y-red-500'
                              : isWorkshop
                              ? 'border-l-4 !border-l-amber-500 border-y-amber-500/30 bg-amber-500/[0.08] group-hover:bg-amber-500/[0.16] group-hover:border-y-amber-400/50'
                              : 'border-[#2B314E]/70 bg-[#121524] group-hover:bg-[#1A1F36] group-hover:border-[#3E4770]'
                          }`}
                        >
                          <div className="truncate">
                            {item.orderNumber ? (
                              <span className="font-mono text-xs font-bold text-indigo-300 bg-indigo-950/60 border border-indigo-500/40 px-2 py-0.5 rounded inline-block truncate">
                                #{item.orderNumber}
                              </span>
                            ) : (
                              <span className="font-mono text-xs font-bold text-slate-400 bg-slate-900 border border-slate-700 px-2 py-0.5 rounded inline-block truncate">
                                #{item.id?.slice(-6).toUpperCase()}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* 2. VEHICLE (Plate + Make & Model) */}
                        <td
                          className={`py-3.5 px-3 align-middle border-y transition-colors duration-150 ${
                            isUrgent
                              ? 'border-y-red-700/80 bg-[#26070b] group-hover:bg-[#380a10] group-hover:border-y-red-500'
                              : isWorkshop
                              ? 'border-y-amber-500/30 bg-amber-500/[0.08] group-hover:bg-amber-500/[0.16] group-hover:border-y-amber-400/50'
                              : 'border-[#2B314E]/70 bg-[#121524] group-hover:bg-[#1A1F36] group-hover:border-[#3E4770]'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            {/* UK Yellow Number Plate */}
                            <span className="bg-[#FACC15] text-[#0A0C14] px-2.5 py-0.5 rounded font-mono font-black text-xs sm:text-sm tracking-wider uppercase border border-amber-400 shadow-xs shrink-0">
                              {item.vehicleReg || 'UNKNOWN'}
                            </span>
                            <div className="min-w-0 flex-1 truncate">
                              <div className="font-bold text-white text-xs sm:text-sm truncate">
                                {item.vehicleMake} {item.vehicleModel || 'Vehicle'}
                              </div>
                              <div className="text-[10px] text-slate-400 uppercase font-medium truncate mt-0.5">
                                {item.category === 'maintenance'
                                  ? 'Workshop Log'
                                  : item.category === 'rental'
                                  ? 'Fleet Rental'
                                  : 'Depot Vehicle'}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* 3. CATEGORY */}
                        <td
                          className={`py-3.5 px-3 align-middle border-y transition-colors duration-150 ${
                            isUrgent
                              ? 'border-y-red-700/80 bg-[#26070b] group-hover:bg-[#380a10] group-hover:border-y-red-500'
                              : isWorkshop
                              ? 'border-y-amber-500/30 bg-amber-500/[0.08] group-hover:bg-amber-500/[0.16] group-hover:border-y-amber-400/50'
                              : 'border-[#2B314E]/70 bg-[#121524] group-hover:bg-[#1A1F36] group-hover:border-[#3E4770]'
                          }`}
                        >
                          <div className="truncate">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-bold uppercase tracking-wide border truncate ${getTypeBadgeColor(
                                item.type
                              )}`}
                            >
                              {item.category === 'rental' ? (
                                <Car className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                              ) : item.category === 'available' ? (
                                <ShieldCheck className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                              ) : (
                                <Wrench className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                              )}
                              <span className="truncate">{item.type}</span>
                            </span>
                          </div>
                        </td>

                        {/* 4. JOB DETAILS & CUSTOMER */}
                        <td
                          className={`py-3.5 px-3 align-middle border-y transition-colors duration-150 ${
                            isUrgent
                              ? 'border-y-red-700/80 bg-[#26070b] group-hover:bg-[#380a10] group-hover:border-y-red-500'
                              : isWorkshop
                              ? 'border-y-amber-500/30 bg-amber-500/[0.08] group-hover:bg-amber-500/[0.16] group-hover:border-y-amber-400/50'
                              : 'border-[#2B314E]/70 bg-[#121524] group-hover:bg-[#1A1F36] group-hover:border-[#3E4770]'
                          }`}
                        >
                          <div className="min-w-0">
                            <p className="text-xs sm:text-sm text-slate-200 font-semibold truncate">
                              {item.description || item.title || 'General Service / Fleet Booking'}
                            </p>
                            <div className="flex items-center gap-3 mt-1 truncate text-[11px]">
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

                        {/* 5. SCHEDULED DATE & TIME */}
                        <td
                          className={`py-3.5 px-3 align-middle border-y transition-colors duration-150 ${
                            isUrgent
                              ? 'border-y-red-700/80 bg-[#26070b] group-hover:bg-[#380a10] group-hover:border-y-red-500'
                              : isWorkshop
                              ? 'border-y-amber-500/30 bg-amber-500/[0.08] group-hover:bg-amber-500/[0.16] group-hover:border-y-amber-400/50'
                              : 'border-[#2B314E]/70 bg-[#121524] group-hover:bg-[#1A1F36] group-hover:border-[#3E4770]'
                          }`}
                        >
                          <div className="min-w-0">
                            <span
                              className={`text-xs sm:text-sm block truncate select-none ${
                                isUrgent
                                  ? 'text-red-200 font-black tracking-wide'
                                  : isWorkshop
                                  ? 'text-amber-200 font-bold'
                                  : 'text-slate-100 font-bold'
                              }`}
                            >
                              {isValid(jobDate) ? format(jobDate, 'dd/MM/yyyy HH:mm') : 'TBD'}
                            </span>
                            <div className="mt-1 truncate select-none">
                              {getRelativeBadge(jobDate, item.status, daysRemaining < 0)}
                            </div>
                          </div>
                        </td>

                        {/* 6. LIVE STATUS (Last cell: rounded-r-xl with right border) */}
                        <td
                          className={`py-3.5 px-3 align-middle rounded-r-xl border-r border-y transition-colors duration-150 ${
                            isUrgent
                              ? 'border-r border-y-red-700/80 border-r-red-700/80 bg-[#26070b] group-hover:bg-[#380a10] group-hover:border-y-red-500 group-hover:border-r-red-500'
                              : isWorkshop
                              ? 'border-r border-y-amber-500/30 border-r-amber-500/30 bg-amber-500/[0.08] group-hover:bg-amber-500/[0.16] group-hover:border-y-amber-400/50 group-hover:border-r-amber-400/50'
                              : 'border-[#2B314E]/70 bg-[#121524] group-hover:bg-[#1A1F36] group-hover:border-[#3E4770]'
                          }`}
                        >
                          <div className="truncate select-none">
                            {getLiveStatusBadge(item, isUrgent, isWorkshop)}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* ─────────────────────────────────────────────────────────────
          5. FOOTER STATUS BAR
         ───────────────────────────────────────────────────────────── */}
      <footer className="bg-[#121524]/90 border-t border-[#2B314E] px-4 sm:px-6 py-2.5 flex items-center justify-between text-xs text-slate-400 z-20">
        <div className="flex items-center gap-3">
          <span>
            Lines/Page: <strong className="text-white">{linesPerPage}</strong> (Default: 6)
          </span>
          <span className="text-slate-600">•</span>
          <span>
            Auto-Rotation Speed: <strong className="text-white">{rotationSpeed / 1000}s</strong>
          </span>
          <span className="text-slate-600">•</span>
          <span className="hidden sm:inline">
            Press <strong className="text-slate-300 font-mono">P</strong> to Pause,{' '}
            <strong className="text-slate-300 font-mono">F</strong> for Fullscreen
          </span>
        </div>

        {/* Page dot indicators */}
        <div className="flex items-center gap-1.5">
          {Array.from({ length: totalPages }).map((_, pIdx) => (
            <button
              key={pIdx}
              type="button"
              onClick={() => {
                setCurrentPageIndex(pIdx);
                slideStartTimeRef.current = Date.now();
              }}
              className={`h-2 rounded-full transition-all cursor-pointer ${
                pIdx === currentPageIndex
                  ? 'w-6 bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]'
                  : 'w-2 bg-slate-700 hover:bg-slate-500'
              }`}
              title={`Page ${pIdx + 1}`}
            />
          ))}
        </div>
      </footer>

      {/* ─────────────────────────────────────────────────────────────
          6. SETTINGS MODAL (LINES 1-20 & ROTATION SPEED)
         ───────────────────────────────────────────────────────────── */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-[#2B314E] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-[#2B314E] pb-3">
              <div className="flex items-center gap-2">
                <Sliders className="w-5 h-5 text-blue-400" />
                <h3 className="text-lg font-bold text-white">TV Mirror Settings</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Lines Per Page: Editable dynamically from 1 to 20, default 6 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-slate-200">Lines Per Page</label>
                <span className="text-sm font-mono font-bold text-blue-400 px-2.5 py-0.5 rounded bg-blue-950/60 border border-blue-800/40">
                  {linesPerPage} Lines
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Number of lines displayed per page (editable dynamically from 1 to 20; default: 6).
              </p>
              <div className="flex items-center gap-3 pt-1">
                <input
                  type="range"
                  min={1}
                  max={20}
                  value={linesPerPage}
                  onChange={(e) => handleLinesPerPageChange(parseInt(e.target.value, 10))}
                  className="flex-1 accent-blue-500 cursor-pointer"
                />
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={linesPerPage}
                  onChange={(e) => handleLinesPerPageChange(parseInt(e.target.value, 10) || 6)}
                  className="w-16 px-2 py-1 bg-slate-950 border border-slate-800 rounded-lg text-center font-mono font-bold text-white text-sm"
                />
              </div>

              {/* Quick Presets */}
              <div className="flex gap-2 pt-1">
                {[4, 6, 8, 10, 12, 16, 20].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => handleLinesPerPageChange(preset)}
                    className={`px-2.5 py-1 text-xs font-mono font-bold rounded border transition cursor-pointer ${
                      linesPerPage === preset
                        ? 'bg-blue-600/30 text-blue-300 border-blue-500/60'
                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                    }`}
                  >
                    {preset} {preset === 6 ? '(Default)' : ''}
                  </button>
                ))}
              </div>
            </div>

            {/* Dynamic Auto-Rotation Speed */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-200 block">
                Auto-Rotation Speed
              </label>
              <p className="text-xs text-slate-400">
                Timer duration before automatically transitioning to the next page.
              </p>
              <div className="grid grid-cols-2 gap-2 pt-1">
                {TV_ROTATION_SPEED_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleRotationSpeedChange(opt.value)}
                    className={`px-3 py-2.5 rounded-xl border text-xs font-bold transition text-left flex items-center justify-between cursor-pointer ${
                      rotationSpeed === opt.value
                        ? 'bg-blue-600/30 text-blue-300 border-blue-500/60 shadow-sm'
                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                    }`}
                  >
                    <span>{opt.label}</span>
                    {rotationSpeed === opt.value && (
                      <CheckCircle2 className="w-4 h-4 text-blue-400" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm transition shadow-lg shadow-blue-950 cursor-pointer"
              >
                Apply &amp; Return to TV Board
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkshopTVBoard;
