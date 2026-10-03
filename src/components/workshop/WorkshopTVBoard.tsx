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
  Volume2,
  VolumeX,
  Search,
  ZoomIn,
  Megaphone,
  Sparkles,
  Lock,
  Unlock,
  KeyRound,
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
import {
  TVAdSettings,
  TVAdSlide,
  DEFAULT_TV_AD_SETTINGS,
  loadTVAdSettings,
  subscribeTVAdSettings,
} from '../../utils/tvAdMediaService';
import {
  SupervisorPinConfig,
  loadSupervisorPinConfig,
  saveSupervisorPinConfig,
  subscribeSupervisorPinConfig,
  DEFAULT_SUPERVISOR_PIN,
} from '../../utils/supervisorPinService';
import TvAdMediaManager from './TvAdMediaManager';
import TvPromoSlideView from './TvPromoSlideView';
import SupervisorPinModal from './SupervisorPinModal';
import { db } from '../../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { resolveCompanyLogo } from '../../utils/companyLogoResolver';
import {
  normalizeMaintenanceStatus,
  getMaintenanceStatusLabel,
  isStatusOffRoad,
  isStatusUrgentScheduled,
  getStatusBadgeStyles,
  getMaintenanceRowTheme,
  getJobRowTheme,
} from '../../utils/maintenanceStatusConfig';
import { sortWorkshopJobs } from '../../utils/workshopSorting';
import { TimeTrackingBadge } from '../../utils/timeTrackingBadge';
import MaintenanceStatusBadge from '../maintenance/MaintenanceStatusBadge';

export type TVDisplayScale = 'standard' | 'large' | 'compact';

// Audio chime using Web Audio API for auto-rotation and urgent notices (zero dependencies)
const playRotationChime = (isAlert = false) => {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = isAlert ? 'triangle' : 'sine';
    const startFreq = isAlert ? 880 : 587.33;
    const endFreq = isAlert ? 440 : 880;
    osc.frequency.setValueAtTime(startFreq, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(endFreq, ctx.currentTime + (isAlert ? 0.3 : 0.15));
    gain.gain.setValueAtTime(0.06, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + (isAlert ? 0.6 : 0.4));
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + (isAlert ? 0.6 : 0.4));
  } catch {}
};

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

const getRelativeBadge = (d: Date, item: any, isOverdue?: boolean) => {
  const isAccident = item?.isAccident || normalizeMaintenanceStatus(item?.status) === 'accident';
  const isOffRoad = isStatusOffRoad(item?.status, { isAccident, isOffRoad: item?.isOffRoad });
  const isUrgent = item?.isUrgent || isOverdue || isStatusUrgentScheduled(item?.status, d, { isAccident, isOffRoad });

  return (
    <MaintenanceStatusBadge
      status={item?.status}
      date={d}
      isAccident={isAccident}
      isOffRoad={isOffRoad}
      isScheduledUrgent={isUrgent}
      isDarkTheme={true}
      size="xs"
      className="public-mirror-badge cursor-default"
    />
  );
};

const getLiveStatusBadge = (item: any, isUrgent: boolean, _isWorkshop?: boolean) => {
  const isAccident = item?.isAccident || normalizeMaintenanceStatus(item?.status) === 'accident';
  const isOffRoad = isStatusOffRoad(item?.status, { isAccident, isOffRoad: item?.isOffRoad });

  return (
    <MaintenanceStatusBadge
      status={item?.status}
      date={item?.scheduledDate}
      isAccident={isAccident}
      isOffRoad={isOffRoad}
      isScheduledUrgent={isUrgent}
      isDarkTheme={true}
      size="sm"
      className="public-mirror-badge cursor-default"
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
      const mapped = initialJobs.map((j) => {
        const jDate = j.scheduledDate ? new Date(j.scheduledDate) : new Date();
        const daysRemaining = differenceInCalendarDays(jDate, todayStart);
        const isAccident = (j as any).isAccident || j.status === 'accident' || j.status === 'off-road-accident';
        const isOffRoad = isStatusOffRoad(j.status, { isAccident, isOffRoad: j.isOffRoad });
        const normalizedStatus = normalizeMaintenanceStatus(j.status, { isAccident, isOffRoad });
        const statusLabel =
          (j as any).statusLabel ||
          getMaintenanceStatusLabel(j.status, { isAccident, isOffRoad });
        const isUrgent = isStatusUrgentScheduled(j.status, jDate, { isAccident, isOffRoad });
        const isWorkshop = normalizedStatus === 'workshop' || normalizedStatus === 'in-progress';

        return {
          id: j.id,
          category: j.source === 'rental' ? 'rental' : j.source === 'vehicle' ? 'available' : 'maintenance',
          source: j.source || 'maintenance',
          title: isOffRoad ? '🚨 OFF ROAD (VOR) WORKSHOP' : (j.title || 'WORKSHOP JOB'),
          type: isOffRoad ? 'OFF ROAD (VOR)' : (j.type || 'Service'),
          description: j.description,
          status: j.status || normalizedStatus,
          statusLabel,
          scheduledDate: jDate,
          daysRemaining,
          isUrgent,
          isWorkshop,
          isOffRoad,
          isAccident,
          vehicleMake: j.vehicleMake,
          vehicleModel: j.vehicleModel,
          vehicleReg: j.vehicleReg,
          location: j.location,
          serviceProvider: j.serviceProvider,
          customerName: j.customerName,
          orderNumber: j.orderNumber,
        };
      });
      return sortWorkshopJobs(mapped);
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
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showSearch, setShowSearch] = useState<boolean>(false);

  const filteredItems = useMemo(() => {
    let list = filterTVItemsByCategory(allBoardItems, activeFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((i) =>
        (i.vehicleReg && i.vehicleReg.toLowerCase().includes(q)) ||
        (i.vehicleMake && i.vehicleMake.toLowerCase().includes(q)) ||
        (i.vehicleModel && i.vehicleModel.toLowerCase().includes(q)) ||
        (i.customerName && i.customerName.toLowerCase().includes(q)) ||
        (i.orderNumber && i.orderNumber.toLowerCase().includes(q)) ||
        (i.description && i.description.toLowerCase().includes(q)) ||
        (i.type && i.type.toLowerCase().includes(q))
      );
    }
    return sortWorkshopJobs(list);
  }, [allBoardItems, activeFilter, searchQuery]);

  const categoryCounts = useMemo(() => {
    return {
      all: allBoardItems.length,
      maintenance: allBoardItems.filter((i) => i.category === 'maintenance').length,
      rentSchedule: allBoardItems.filter((i) => i.category === 'rental').length,
      availableVehicles: allBoardItems.filter((i) => i.category === 'available').length,
      offRoad: allBoardItems.filter((i) => i.isOffRoad).length,
    };
  }, [allBoardItems]);

  const totalInProgressCount = useMemo(() => {
    return allBoardItems.filter(
      (i) =>
        normalizeMaintenanceStatus(i.status) === 'in-progress' ||
        normalizeMaintenanceStatus(i.status) === 'workshop'
    ).length;
  }, [allBoardItems]);

  const totalActiveScheduledCount = useMemo(() => {
    return allBoardItems.filter(
      (i) => normalizeMaintenanceStatus(i.status) === 'scheduled'
    ).length;
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
  // 4. DYNAMIC AUTO-ROTATION, SOUND & DISPLAY SCALE
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

  // Sound chime toggle
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    try {
      return localStorage.getItem('workshop_tv_sound') === 'true';
    } catch {
      return false;
    }
  });

  const toggleSound = () => {
    setSoundEnabled((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('workshop_tv_sound', String(next));
      } catch {}
      if (next) {
        playRotationChime(false);
      }
      return next;
    });
  };

  // Display Scale: 'standard' | 'large' | 'compact'
  const [displayScale, setDisplayScale] = useState<TVDisplayScale>(() => {
    try {
      const saved = localStorage.getItem('workshop_tv_scale') as TVDisplayScale;
      if (['standard', 'large', 'compact'].includes(saved)) return saved;
    } catch {}
    return 'standard';
  });

  const handleScaleChange = (scale: TVDisplayScale) => {
    setDisplayScale(scale);
    try {
      localStorage.setItem('workshop_tv_scale', scale);
    } catch {}
  };

  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [settingsTab, setSettingsTab] = useState<'display' | 'ads' | 'security'>('display');
  const [isUserInteracting, setIsUserInteracting] = useState<boolean>(false);

  // Supervisor PIN & Kiosk Protection Guard State
  const [pinConfig, setPinConfig] = useState<SupervisorPinConfig>(loadSupervisorPinConfig);
  const [isSupervisorUnlocked, setIsSupervisorUnlocked] = useState<boolean>(false);
  const isSupervisorUnlockedRef = useRef<boolean>(false);
  const unlockTimerRef = useRef<any>(null);

  useEffect(() => {
    const unsub = subscribeSupervisorPinConfig((cfg) => {
      setPinConfig(cfg);
    });
    return () => unsub();
  }, []);

  interface PinGuardPendingAction {
    type: 'exit_tv' | 'exit_fullscreen' | 'open_settings' | 'toggle_pause' | 'change_schedule';
    title: string;
    description: string;
    callback: () => void;
  }
  const [pendingAction, setPendingAction] = useState<PinGuardPendingAction | null>(null);
  const [showPinModal, setShowPinModal] = useState<boolean>(false);

  const executeWithPinGuard = useCallback((action: PinGuardPendingAction) => {
    // If kiosk lock is disabled or already unlocked by supervisor, execute immediately
    if (!pinConfig.kioskLockEnabled || isSupervisorUnlockedRef.current) {
      action.callback();
      return;
    }
    setPendingAction(action);
    setShowPinModal(true);
  }, [pinConfig.kioskLockEnabled]);

  const handlePinSuccess = useCallback(() => {
    setShowPinModal(false);
    isSupervisorUnlockedRef.current = true;
    setIsSupervisorUnlocked(true);

    if (unlockTimerRef.current) clearTimeout(unlockTimerRef.current);
    unlockTimerRef.current = setTimeout(() => {
      isSupervisorUnlockedRef.current = false;
      setIsSupervisorUnlocked(false);
    }, (pinConfig.autoRelockMinutes || 5) * 60 * 1000);

    if (pendingAction) {
      const cb = pendingAction.callback;
      setPendingAction(null);
      cb();
    }
  }, [pendingAction, pinConfig.autoRelockMinutes]);

  const handlePinCancel = useCallback(() => {
    setShowPinModal(false);
    setPendingAction(null);
    // If user attempted to exit fullscreen, re-request fullscreen to keep display locked
    if (isFullscreen) {
      const docEl = document.documentElement as any;
      if (docEl.requestFullscreen) docEl.requestFullscreen().catch(() => {});
    }
  }, [isFullscreen]);

  const lockSupervisorSession = useCallback(() => {
    isSupervisorUnlockedRef.current = false;
    setIsSupervisorUnlocked(false);
    if (unlockTimerRef.current) clearTimeout(unlockTimerRef.current);
  }, []);

  // Settings Tab PIN Change Form State
  const [newSupervisorPin, setNewSupervisorPin] = useState<string>('');
  const [confirmSupervisorPin, setConfirmSupervisorPin] = useState<string>('');
  const [pinChangeMsg, setPinChangeMsg] = useState<{ text: string; isError: boolean } | null>(null);
  const [isSavingPin, setIsSavingPin] = useState<boolean>(false);

  // Company Branding for clean TV Overlay
  const [companyDetails, setCompanyDetails] = useState<any>(null);
  useEffect(() => {
    getDoc(doc(db, 'companySettings', 'details'))
      .then((snap) => {
        if (snap.exists()) setCompanyDetails(snap.data());
      })
      .catch((err) => {
        console.warn('Could not fetch companySettings in TV Board:', err);
      });
  }, []);

  const companyLogoUrl = useMemo(() => {
    return resolveCompanyLogo(companyDetails, companyDetails?.fullName || 'AIE Skyline Limited');
  }, [companyDetails]);

  const companyName = companyDetails?.fullName || companyDetails?.tradingName || 'AIE SKYLINE LIMITED';

  // Ad & Promo Slides Settings & State
  const [adSettings, setAdSettings] = useState<TVAdSettings>(DEFAULT_TV_AD_SETTINGS);
  const [currentViewType, setCurrentViewType] = useState<'schedule' | 'promo'>('schedule');
  const [currentPromoIndex, setCurrentPromoIndex] = useState<number>(0);

  // 1. Live Firestore Sync for TV Advertisements (onSnapshot)
  // Cross-screen auto-update on any device change + instant background preloading
  useEffect(() => {
    const unsub = subscribeTVAdSettings((liveSettings) => {
      setAdSettings(liveSettings);
    });
    return () => unsub();
  }, []);

  const activePromoSlides = useMemo(() => {
    return (adSettings.slides || []).filter((s) => s.active !== false);
  }, [adSettings.slides]);

  // URL of the next promo slide in sequence for instant background preloading
  const nextPromoSlideUrl = useMemo(() => {
    if (activePromoSlides.length <= 1) return undefined;
    const nextIdx = (currentPromoIndex + 1) % activePromoSlides.length;
    return activePromoSlides[nextIdx]?.imageUrl;
  }, [activePromoSlides, currentPromoIndex]);

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

  // Slide navigation with Promo Ad awareness
  const nextPage = useCallback(() => {
    const promoActive = adSettings.enabled && activePromoSlides.length > 0;

    if (!promoActive) {
      setCurrentViewType('schedule');
      setCurrentPageIndex((prev) => (prev + 1) % totalPages);
    } else if (adSettings.rotationSequence === 'after_each_page') {
      // Sequence: 1 Schedule Page -> 1 Promo Slide
      if (currentViewType === 'schedule') {
        setCurrentViewType('promo');
      } else {
        setCurrentPromoIndex((prev) => (prev + 1) % activePromoSlides.length);
        setCurrentPageIndex((prev) => (prev + 1) % totalPages);
        setCurrentViewType('schedule');
      }
    } else {
      // Sequence: All Schedule Pages -> Promo Loop
      if (currentViewType === 'schedule') {
        if (currentPageIndex + 1 < totalPages) {
          setCurrentPageIndex((prev) => prev + 1);
        } else {
          setCurrentViewType('promo');
          setCurrentPromoIndex(0);
        }
      } else {
        if (currentPromoIndex + 1 < activePromoSlides.length) {
          setCurrentPromoIndex((prev) => prev + 1);
        } else {
          setCurrentViewType('schedule');
          setCurrentPageIndex(0);
        }
      }
    }

    slideStartTimeRef.current = Date.now();
    setProgressPercent(0);
    const nextDur = currentViewType === 'schedule' && promoActive
      ? (adSettings.duration || 15)
      : Math.ceil(rotationSpeed / 1000);
    setSecondsRemaining(nextDur);
    if (soundEnabled) {
      playRotationChime(false);
    }
  }, [
    adSettings.enabled,
    adSettings.rotationSequence,
    adSettings.duration,
    activePromoSlides.length,
    currentViewType,
    currentPageIndex,
    currentPromoIndex,
    totalPages,
    rotationSpeed,
    soundEnabled,
  ]);

  const prevPage = useCallback(() => {
    const promoActive = adSettings.enabled && activePromoSlides.length > 0;

    if (!promoActive) {
      setCurrentViewType('schedule');
      setCurrentPageIndex((prev) => (prev - 1 + totalPages) % totalPages);
    } else if (adSettings.rotationSequence === 'after_each_page') {
      if (currentViewType === 'promo') {
        setCurrentViewType('schedule');
      } else {
        setCurrentPromoIndex((prev) => (prev - 1 + activePromoSlides.length) % activePromoSlides.length);
        setCurrentPageIndex((prev) => (prev - 1 + totalPages) % totalPages);
        setCurrentViewType('promo');
      }
    } else {
      if (currentViewType === 'promo') {
        if (currentPromoIndex > 0) {
          setCurrentPromoIndex((prev) => prev - 1);
        } else {
          setCurrentViewType('schedule');
          setCurrentPageIndex(totalPages - 1);
        }
      } else {
        if (currentPageIndex > 0) {
          setCurrentPageIndex((prev) => prev - 1);
        } else {
          setCurrentViewType('promo');
          setCurrentPromoIndex(activePromoSlides.length - 1);
        }
      }
    }

    slideStartTimeRef.current = Date.now();
    setProgressPercent(0);
    if (soundEnabled) {
      playRotationChime(false);
    }
  }, [
    adSettings.enabled,
    adSettings.rotationSequence,
    activePromoSlides.length,
    currentViewType,
    currentPageIndex,
    currentPromoIndex,
    totalPages,
    soundEnabled,
  ]);

  // Auto-rotation loop (Pauses when user interacts, opens settings, searches, or pauses)
  useEffect(() => {
    const promoActive = adSettings.enabled && activePromoSlides.length > 0;
    const canRotate = totalPages > 1 || promoActive;
    const shouldPause = isPaused || showSettingsModal || showSearch || isUserInteracting;

    if (shouldPause || !canRotate) {
      setProgressPercent(0);
      return;
    }

    const intervalTimer = setInterval(() => {
      const elapsed = Date.now() - slideStartTimeRef.current;
      const targetDuration = currentViewType === 'promo'
        ? Math.max(5000, (adSettings.duration || 15) * 1000)
        : rotationSpeed;
      const progress = Math.min(100, (elapsed / targetDuration) * 100);
      const remaining = Math.max(0, Math.ceil((targetDuration - elapsed) / 1000));

      setProgressPercent(progress);
      setSecondsRemaining(remaining);

      if (elapsed >= targetDuration) {
        nextPage();
      }
    }, 100);

    return () => clearInterval(intervalTimer);
  }, [
    isPaused,
    showSettingsModal,
    showSearch,
    isUserInteracting,
    rotationSpeed,
    nextPage,
    totalPages,
    currentViewType,
    adSettings.enabled,
    adSettings.duration,
    activePromoSlides.length,
  ]);

  // Native Fullscreen enter/exit helpers
  const enterFullscreenNative = async () => {
    try {
      const docEl = document.documentElement as any;
      if (docEl.requestFullscreen) {
        await docEl.requestFullscreen();
      } else if (docEl.webkitRequestFullscreen) {
        await docEl.webkitRequestFullscreen();
      } else if (docEl.mozRequestFullScreen) {
        await docEl.mozRequestFullScreen();
      } else if (docEl.msRequestFullscreen) {
        await docEl.msRequestFullscreen();
      }
      setIsFullscreen(true);
      setShowKioskControls(false);
    } catch (err) {
      console.warn('Enter fullscreen failed:', err);
      setIsFullscreen(true);
    }
  };

  const exitFullscreenNative = async () => {
    try {
      const doc = document as any;
      // Mark as authorized before exiting so handleFsChange does not re-lock
      isSupervisorUnlockedRef.current = true;
      if (doc.exitFullscreen) {
        await doc.exitFullscreen();
      } else if (doc.webkitExitFullscreen) {
        await doc.webkitExitFullscreen();
      } else if (doc.mozCancelFullScreen) {
        await doc.mozCancelFullScreen();
      } else if (doc.msExitFullscreen) {
        await doc.msExitFullscreen();
      }
      setIsFullscreen(false);
    } catch (err) {
      console.warn('Exit fullscreen failed:', err);
      setIsFullscreen(false);
    }
  };

  // Protected action handlers requiring Supervisor PIN
  const handleExitTvProtected = useCallback(() => {
    executeWithPinGuard({
      type: 'exit_tv',
      title: 'Exit TV Broadcast Mode',
      description: 'Supervisor PIN is required to close TV board and return to standard view.',
      callback: () => {
        onClose?.();
      },
    });
  }, [executeWithPinGuard, onClose]);

  const handleToggleFullscreenProtected = useCallback(() => {
    if (isFullscreen) {
      executeWithPinGuard({
        type: 'exit_fullscreen',
        title: 'Exit Fullscreen Kiosk Mode',
        description: 'Supervisor PIN is required to exit full-screen TV display.',
        callback: () => {
          exitFullscreenNative();
        },
      });
    } else {
      enterFullscreenNative();
    }
  }, [isFullscreen, executeWithPinGuard]);

  const handleOpenSettingsProtected = useCallback(() => {
    executeWithPinGuard({
      type: 'open_settings',
      title: 'Open Workshop TV Settings',
      description: 'Supervisor PIN is required to configure display settings, ads, or rotation speed.',
      callback: () => {
        setShowSettingsModal(true);
      },
    });
  }, [executeWithPinGuard]);

  const handleTogglePauseProtected = useCallback(() => {
    executeWithPinGuard({
      type: 'toggle_pause',
      title: isPaused ? 'Resume Auto-Rotation' : 'Pause Auto-Rotation',
      description: 'Supervisor PIN is required to pause or resume rotation cycles.',
      callback: () => {
        setIsPaused((p) => !p);
      },
    });
  }, [executeWithPinGuard, isPaused]);

  const handleNextPageProtected = useCallback(() => {
    executeWithPinGuard({
      type: 'change_schedule',
      title: 'Advance Rotation Schedule',
      description: 'Supervisor PIN is required to manually change rotation pages.',
      callback: () => {
        nextPage();
      },
    });
  }, [executeWithPinGuard, nextPage]);

  const handlePrevPageProtected = useCallback(() => {
    executeWithPinGuard({
      type: 'change_schedule',
      title: 'Previous Rotation Schedule',
      description: 'Supervisor PIN is required to manually change rotation pages.',
      callback: () => {
        prevPage();
      },
    });
  }, [executeWithPinGuard, prevPage]);

  const handleSelectFilterProtected = useCallback((catId: TVFilterCategory) => {
    executeWithPinGuard({
      type: 'change_schedule',
      title: `Filter Schedule (${catId.toUpperCase()})`,
      description: 'Supervisor PIN is required to filter records on TV display.',
      callback: () => {
        setActiveFilter(catId);
        setCurrentViewType('schedule');
        setCurrentPageIndex(0);
        slideStartTimeRef.current = Date.now();
      },
    });
  }, [executeWithPinGuard]);

  const handleSelectPageProtected = useCallback((pageIdx: number) => {
    executeWithPinGuard({
      type: 'change_schedule',
      title: `Jump to Page ${pageIdx + 1}`,
      description: 'Supervisor PIN is required to manually jump between pages.',
      callback: () => {
        setCurrentViewType('schedule');
        setCurrentPageIndex(pageIdx);
        slideStartTimeRef.current = Date.now();
      },
    });
  }, [executeWithPinGuard]);

  const handleSelectPromoProtected = useCallback((slideIdx: number) => {
    executeWithPinGuard({
      type: 'change_schedule',
      title: `Jump to Promo Slide ${slideIdx + 1}`,
      description: 'Supervisor PIN is required to manually jump between promo slides.',
      callback: () => {
        setCurrentViewType('promo');
        setCurrentPromoIndex(slideIdx);
        slideStartTimeRef.current = Date.now();
      },
    });
  }, [executeWithPinGuard]);

  const handleSkipToScheduleProtected = useCallback(() => {
    executeWithPinGuard({
      type: 'change_schedule',
      title: 'Skip to Schedule View',
      description: 'Supervisor PIN is required to override advertisement slides.',
      callback: () => {
        setCurrentViewType('schedule');
        slideStartTimeRef.current = Date.now();
      },
    });
  }, [executeWithPinGuard]);

  // 2. Esc Key & Window Exit Lock:
  // Capture fullscreenchange and keyboard events (Escape, F11).
  // If someone attempts to press Escape or exit fullscreen, immediately re-request browser fullscreen unless unlocked via the Supervisor PIN modal.
  useEffect(() => {
    const handleFsChange = () => {
      const doc = document as any;
      const isFs = !!(
        doc.fullscreenElement ||
        doc.webkitFullscreenElement ||
        doc.mozFullScreenElement ||
        doc.msFullscreenElement
      );

      if (isFs) {
        setIsFullscreen(true);
        setShowKioskControls(false);
        document.body.style.overflow = 'hidden';
      } else {
        // Exiting fullscreen was triggered!
        if (pinConfig.kioskLockEnabled && !isSupervisorUnlockedRef.current) {
          // Unauthorized attempt to exit fullscreen (e.g. native Escape or window minimize)
          // Immediately re-request browser fullscreen
          const docEl = document.documentElement as any;
          if (docEl.requestFullscreen) {
            docEl.requestFullscreen().catch(() => {});
          } else if (docEl.webkitRequestFullscreen) {
            docEl.webkitRequestFullscreen().catch(() => {});
          }
          // Re-assert fullscreen state
          setIsFullscreen(true);
          // Prompt for Supervisor PIN
          executeWithPinGuard({
            type: 'exit_fullscreen',
            title: 'Fullscreen Kiosk Lock Active',
            description: 'Attempt to exit TV broadcast fullscreen detected. Supervisor PIN required.',
            callback: () => {
              exitFullscreenNative();
            },
          });
        } else {
          setIsFullscreen(false);
          document.body.style.overflow = '';
        }
      }
    };

    document.addEventListener('fullscreenchange', handleFsChange);
    document.addEventListener('webkitfullscreenchange', handleFsChange);
    document.addEventListener('mozfullscreenchange', handleFsChange);
    document.addEventListener('MSFullscreenChange', handleFsChange);

    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('fullscreenchange', handleFsChange);
      document.removeEventListener('webkitfullscreenchange', handleFsChange);
      document.removeEventListener('mozfullscreenchange', handleFsChange);
      document.removeEventListener('MSFullscreenChange', handleFsChange);
    };
  }, [pinConfig.kioskLockEnabled, executeWithPinGuard]);

  // Auto-hide kiosk controls after 3.5 seconds of mouse inactivity in fullscreen mode
  const [showKioskControls, setShowKioskControls] = useState<boolean>(false);
  const kioskTimerRef = useRef<any>(null);

  const handleMouseMove = () => {
    if (!isFullscreen) return;
    setShowKioskControls(true);
    if (kioskTimerRef.current) clearTimeout(kioskTimerRef.current);
    kioskTimerRef.current = setTimeout(() => {
      setShowKioskControls(false);
    }, 3500);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showPinModal) return;

      // Don't intercept if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        if (e.key === 'Escape') {
          setShowSearch(false);
          setSearchQuery('');
        }
        return;
      }

      // Esc & F11 Lock: prevent default and intercept with PIN prompt
      if (e.key === 'Escape' || e.key === 'F11') {
        e.preventDefault();
        e.stopPropagation();
        if (pinConfig.kioskLockEnabled && !isSupervisorUnlockedRef.current) {
          if (isFullscreen) {
            const docEl = document.documentElement as any;
            if (docEl.requestFullscreen) docEl.requestFullscreen().catch(() => {});
          }
          executeWithPinGuard({
            type: isFullscreen ? 'exit_fullscreen' : 'exit_tv',
            title: isFullscreen ? 'Exit Fullscreen Kiosk' : 'Exit TV Broadcast Mode',
            description: 'Supervisor PIN is required to exit TV kiosk display.',
            callback: () => {
              if (isFullscreen) {
                exitFullscreenNative();
              } else if (onClose) {
                onClose();
              }
            },
          });
        } else {
          if (isFullscreen) {
            exitFullscreenNative();
          } else if (onClose) {
            onClose();
          }
        }
        return;
      }

      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        handleNextPageProtected();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrevPageProtected();
      } else if (e.key === 'p' || e.key === 'P') {
        e.preventDefault();
        handleTogglePauseProtected();
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        handleToggleFullscreenProtected();
      } else if (e.key === 'm' || e.key === 'M') {
        toggleSound();
      } else if (e.key === '/') {
        e.preventDefault();
        setShowSearch(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [
    showPinModal,
    isFullscreen,
    pinConfig.kioskLockEnabled,
    executeWithPinGuard,
    handleNextPageProtected,
    handlePrevPageProtected,
    handleTogglePauseProtected,
    handleToggleFullscreenProtected,
    toggleSound,
    onClose,
  ]);

  // Window Exit & Tab Close Lock when Kiosk mode is locked
  useEffect(() => {
    if (!pinConfig.kioskLockEnabled) return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (pinConfig.kioskLockEnabled && !isSupervisorUnlockedRef.current) {
        e.preventDefault();
        e.returnValue = 'Workshop TV Kiosk Mode is locked. Supervisor authorization required to exit.';
        return e.returnValue;
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [pinConfig.kioskLockEnabled]);

  // Dynamic Scale Classes
  const scaleClasses =
    displayScale === 'large'
      ? 'scale-large text-sm'
      : displayScale === 'compact'
      ? 'scale-compact text-xs'
      : 'scale-standard text-xs';

  return (
    <div
      onMouseMove={handleMouseMove}
      className={`relative w-full h-screen max-w-none p-0 m-0 border-none rounded-none bg-[#0A0C14] text-white flex flex-col font-sans select-none overflow-hidden box-border public-mirror-root ${scaleClasses}`}
    >
      {/* ─────────────────────────────────────────────────────────────
          FLOATING KIOSK CONTROLS (IN FULLSCREEN ON MOUSE ACTIVITY)
         ───────────────────────────────────────────────────────────── */}
      {isFullscreen && showKioskControls && (
        <div className="absolute top-3 inset-x-0 z-50 flex items-center justify-between px-6 pointer-events-none animate-fadeIn">
          <div className="flex items-center gap-3 px-4 py-2 rounded-2xl bg-slate-950/85 backdrop-blur-md border border-slate-700/80 shadow-2xl pointer-events-auto">
            <Tv className="w-4 h-4 text-emerald-400 animate-pulse" />
            <span className="text-xs font-black text-white uppercase tracking-wider">
              Ultra-Wide TV Kiosk Mode
            </span>
            <span className="text-slate-600">|</span>
            <span className="text-xs font-mono font-bold text-slate-300">
              {currentViewType === 'promo' ? 'Ad Promo View' : `Schedule Page ${currentPageIndex + 1}/${totalPages}`}
            </span>
            <span className="text-slate-600">|</span>
            <span
              className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                isSupervisorUnlocked
                  ? 'bg-emerald-950/80 text-emerald-400 border-emerald-500/40'
                  : 'bg-amber-950/80 text-amber-400 border-amber-500/40'
              }`}
            >
              {isSupervisorUnlocked ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
              <span>{isSupervisorUnlocked ? 'UNLOCKED' : 'PIN PROTECTED'}</span>
            </span>
          </div>

          <div className="flex items-center gap-2 pointer-events-auto">
            <button
              type="button"
              onClick={handlePrevPageProtected}
              className="p-2 rounded-xl bg-slate-950/85 backdrop-blur-md border border-slate-700/80 text-white hover:bg-slate-800 transition shadow-xl cursor-pointer"
              title="Previous Page (Supervisor PIN Required)"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleTogglePauseProtected}
              className="px-3 py-2 rounded-xl bg-slate-950/85 backdrop-blur-md border border-slate-700/80 text-white hover:bg-slate-800 transition shadow-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              title={isPaused ? 'Resume Auto-Rotation (Supervisor PIN Required)' : 'Pause Auto-Rotation (Supervisor PIN Required)'}
            >
              {isPaused ? <Play className="w-3.5 h-3.5 fill-current text-amber-400" /> : <Pause className="w-3.5 h-3.5 fill-current text-emerald-400" />}
              <span>{isPaused ? 'Resume' : 'Pause'}</span>
            </button>
            <button
              type="button"
              onClick={handleNextPageProtected}
              className="p-2 rounded-xl bg-slate-950/85 backdrop-blur-md border border-slate-700/80 text-white hover:bg-slate-800 transition shadow-xl cursor-pointer"
              title="Next Page (Supervisor PIN Required)"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleToggleFullscreenProtected}
              className="p-2 rounded-xl bg-slate-950/85 backdrop-blur-md border border-slate-700/80 text-white hover:bg-rose-950 hover:border-rose-500/50 transition shadow-xl cursor-pointer"
              title="Exit Fullscreen (F) - Requires Supervisor PIN"
            >
              <Minimize2 className="w-4 h-4 text-rose-300" />
            </button>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          1. TOP FLUSH ANIMATED COUNTDOWN PROGRESS BAR
         ───────────────────────────────────────────────────────────── */}
      <div className="w-full bg-[#121524] h-1.5 overflow-hidden shrink-0 border-b border-[#2B314E]/60 z-30">
        <div
          className="h-full bg-gradient-to-r from-blue-600 via-indigo-500 to-blue-400 transition-all duration-100 ease-linear shadow-[0_0_12px_rgba(59,130,246,0.8)]"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. LIVE HEADER BAR - WORKSHOP TV DISPLAY BOARD
             (Auto-hides in Fullscreen Mode for clean Kiosk Display)
         ───────────────────────────────────────────────────────────── */}
      <header
        className={`w-full p-0 m-0 border-none rounded-none transition-all duration-300 ${
          isFullscreen
            ? 'hidden'
            : 'block shrink-0 bg-[#121524] border-b border-[#2B314E] px-4 py-3 shadow-xl'
        }`}
      >
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 min-w-0">
          {/* Title & Live Badges */}
          <div className="flex items-center gap-3 md:gap-4 flex-wrap min-w-0 flex-1">
            <div className="p-3 bg-gradient-to-br from-emerald-600 to-teal-700 rounded-xl shadow-lg border border-emerald-400/30 flex items-center justify-center shrink-0">
              <Tv className="w-6 h-6 text-white animate-pulse" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                <h1 className="text-lg sm:text-xl md:text-2xl font-black tracking-tight text-white flex items-center gap-2">
                  Workshop TV Display Board
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
                {/* Supervisor Kiosk Lock Status Badge */}
                <button
                  type="button"
                  onClick={() => {
                    if (isSupervisorUnlocked) {
                      lockSupervisorSession();
                    } else {
                      executeWithPinGuard({
                        type: 'open_settings',
                        title: 'Unlock TV Kiosk',
                        description: 'Supervisor PIN is required to unlock administrative controls.',
                        callback: () => {},
                      });
                    }
                  }}
                  className={`inline-flex items-center gap-1.5 text-[10px] sm:text-[11px] font-bold px-2.5 py-0.5 rounded-full border transition cursor-pointer shrink-0 ${
                    isSupervisorUnlocked
                      ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50 hover:bg-emerald-900'
                      : 'bg-amber-950/80 text-amber-300 border-amber-500/50 hover:bg-amber-900'
                  }`}
                  title={isSupervisorUnlocked ? 'Kiosk Controls: Unlocked (Click to Re-lock)' : 'Kiosk Controls: Locked (Click to Unlock with PIN)'}
                >
                  {isSupervisorUnlocked ? (
                    <>
                      <Unlock className="w-3 h-3 text-emerald-400" />
                      <span>UNLOCKED</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-3 h-3 text-amber-400" />
                      <span>PIN LOCKED</span>
                    </>
                  )}
                </button>
                {categoryCounts.offRoad > 0 && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-black uppercase tracking-wider bg-rose-950/90 text-rose-300 border border-rose-500/80 shadow-md animate-more-color-blink-red shrink-0">
                    <AlertTriangle className="w-3 h-3 text-rose-400" />
                    <span>{categoryCounts.offRoad} VOR OFF-ROAD</span>
                  </span>
                )}
              </div>
              <p className="text-xs md:text-sm text-slate-400 mt-1 flex items-center gap-2 flex-wrap">
                <span>Workshop Floor Auto-Rotation Board • Live Fleet Synchronization</span>
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

            {/* Sound Chime Toggle Button */}
            <button
              type="button"
              onClick={toggleSound}
              className={`p-2.5 sm:px-3 sm:py-2 rounded-xl text-xs font-bold transition border cursor-pointer flex items-center gap-1.5 ${
                soundEnabled
                  ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/50 shadow-md'
                  : 'bg-[#1A1E35] text-slate-400 border-[#2B314E] hover:text-white'
              }`}
              title={soundEnabled ? 'Rotation Audio Chime: ON (Click to Mute / M key)' : 'Rotation Audio Chime: OFF (Click to Enable / M key)'}
            >
              {soundEnabled ? (
                <>
                  <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="hidden sm:inline">Chime ON</span>
                </>
              ) : (
                <>
                  <VolumeX className="w-3.5 h-3.5 text-slate-400" />
                  <span className="hidden sm:inline">Chime OFF</span>
                </>
              )}
            </button>

            {/* Search Trigger Button */}
            <button
              type="button"
              onClick={() => setShowSearch((prev) => !prev)}
              className={`p-2.5 sm:px-3 sm:py-2 rounded-xl text-xs font-semibold transition border cursor-pointer flex items-center gap-1.5 ${
                showSearch || searchQuery
                  ? 'bg-blue-600/30 text-blue-300 border-blue-500/60'
                  : 'bg-[#1A1E35] text-slate-300 hover:text-white border-[#2B314E]'
              }`}
              title="Quick Search / Filter Plate or Vehicle (Shortcut: /)"
            >
              <Search className="w-3.5 h-3.5 text-blue-400" />
              <span className="hidden sm:inline">{searchQuery ? 'Filtered' : 'Search'}</span>
            </button>

            {/* Play/Pause Auto-Rotation Button */}
            <button
              type="button"
              onClick={handleTogglePauseProtected}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                isPaused
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30 shadow-md'
                  : 'bg-emerald-950/50 text-emerald-300 border-emerald-500/40 hover:bg-emerald-900/60 shadow-md'
              }`}
              title={isPaused ? 'Resume Auto-Rotation (Supervisor PIN Required)' : 'Pause Auto-Rotation (Supervisor PIN Required)'}
            >
              {isPaused ? <Play className="w-3.5 h-3.5 fill-current" /> : <Pause className="w-3.5 h-3.5 fill-current" />}
              <span className="hidden sm:inline">{isPaused ? 'Paused' : 'Auto-Rotating'}</span>
            </button>

            {/* Prev / Next Page Navigation */}
            <div className="flex items-center gap-1 bg-[#1A1E35] border border-[#2B314E] p-0.5 rounded-xl">
              <button
                type="button"
                onClick={handlePrevPageProtected}
                className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700/60 transition cursor-pointer"
                title="Previous Page (Supervisor PIN Required)"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-[11px] font-mono font-bold text-slate-300 px-1.5">
                {currentPageIndex + 1}/{totalPages}
              </span>
              <button
                type="button"
                onClick={handleNextPageProtected}
                className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700/60 transition cursor-pointer"
                title="Next Page (Supervisor PIN Required)"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Settings Trigger Modal */}
            <button
              type="button"
              onClick={handleOpenSettingsProtected}
              className="p-2.5 sm:px-3 sm:py-2 bg-[#1A1E35] hover:bg-[#252B4D] border border-[#2B314E] text-slate-300 hover:text-white rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5"
              title="Configure Lines Per Page, Scale & Rotation Speed (Supervisor PIN Required)"
            >
              <Sliders className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Settings</span>
            </button>

            {/* Fullscreen Toggle */}
            <button
              type="button"
              onClick={handleToggleFullscreenProtected}
              className="p-2.5 bg-[#1A1E35] hover:bg-[#252B4D] border border-[#2B314E] text-slate-300 hover:text-white rounded-xl transition-colors cursor-pointer"
              title={isFullscreen ? 'Exit Fullscreen (F - Supervisor PIN Required)' : 'Fullscreen (F)'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            {/* Exit TV Mode / Return to Mirror */}
            {onClose && (
              <button
                type="button"
                onClick={handleExitTvProtected}
                className="px-3.5 py-2 bg-[#1A1E35] hover:bg-rose-950/40 text-slate-300 hover:text-rose-300 border border-[#2B314E] hover:border-rose-500/40 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
                title="Return to Standard Mirror (Supervisor PIN Required)"
              >
                <X className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Exit TV Mode</span>
              </button>
            )}
          </div>
        </div>

        {/* Optional Search Bar Input Row */}
        {showSearch && (
          <div className="mt-3 pt-3 border-t border-[#2B314E]/60 flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400 pointer-events-none" />
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPageIndex(0);
                  slideStartTimeRef.current = Date.now();
                }}
                placeholder="Filter TV board by registration plate, make, model, order #, or customer name..."
                className="w-full pl-9 pr-8 py-2 bg-[#0F111A] border border-blue-500/60 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2 text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={() => {
                setShowSearch(false);
                setSearchQuery('');
              }}
              className="px-3 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-xl bg-slate-800"
            >
              Close
            </button>
          </div>
        )}

        {/* Sync Status Banner */}
        <div className="mt-4 pt-3 border-t border-[#2B314E]/60 flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs text-slate-400 gap-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>
              Real-time Firestore synchronization active. Showing active workshop jobs, fleet rentals, and depot vehicles.
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-slate-300 font-mono text-[11px]">
              <Clock className="w-3 h-3 text-emerald-400" />
              <span
                className={`font-bold ${
                  isPaused || showSettingsModal || showSearch || isUserInteracting
                    ? 'text-amber-400'
                    : currentViewType === 'promo'
                    ? 'text-amber-400'
                    : 'text-emerald-400'
                }`}
              >
                {isPaused
                  ? 'ROTATION PAUSED'
                  : isUserInteracting
                  ? 'PAUSED (USER INTERACTING)'
                  : currentViewType === 'promo'
                  ? `NEXT IN ${secondsRemaining}s • AD SLIDE ${(currentPromoIndex % activePromoSlides.length) + 1}/${activePromoSlides.length}`
                  : `NEXT PAGE IN ${secondsRemaining}s • PAGE ${currentPageIndex + 1}/${totalPages}`}
              </span>
            </div>
            <div className="flex items-center gap-1 font-mono text-[11px] text-slate-400">
              <RefreshCw className="w-3 h-3 text-slate-500 animate-spin-slow" />
              <span>Updated {formatDistanceToNow(lastSync, { addSuffix: true })}</span>
            </div>
          </div>
        </div>
      </header>

      {/* ─────────────────────────────────────────────────────────────
          3. VISUAL TOGGLE FILTERS (4 VIEWS + VOR ALERT)
             (Auto-hides in Fullscreen Mode for clean Kiosk Display)
         ───────────────────────────────────────────────────────────── */}
      <nav
        className={`w-full p-0 m-0 border-x-0 border-t-0 border-b border-[#2B314E] rounded-none bg-[#121524] px-4 sm:px-6 py-2.5 flex-wrap items-center justify-between gap-3 shadow-md z-20 shrink-0 transition-all duration-300 ${
          isFullscreen ? 'hidden' : 'flex'
        }`}
      >
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
                onClick={() => handleSelectFilterProtected(cat.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-black tracking-wider transition-all flex items-center gap-2 cursor-pointer border ${
                  active
                    ? 'bg-blue-600 text-white border-blue-500 shadow-md'
                    : 'bg-[#16192B] text-slate-400 border-[#2B314E] hover:text-slate-200 hover:bg-[#1f233a]'
                }`}
                title={`Filter by ${cat.label} (Supervisor PIN Required)`}
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
          {currentViewType === 'promo' && activePromoSlides.length > 0 ? (
            <>
              <div className="px-3 py-1 rounded-md bg-amber-500/20 border border-amber-500/40 text-amber-300 flex items-center gap-1.5 font-mono shadow-sm">
                <Megaphone className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                <span>
                  Ad Slide <strong className="text-white">{(currentPromoIndex % activePromoSlides.length) + 1}</strong> of{' '}
                  <strong className="text-white">{activePromoSlides.length}</strong>
                </span>
              </div>
              <button
                type="button"
                onClick={handleSkipToScheduleProtected}
                className="px-2.5 py-1 text-xs font-bold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-md border border-slate-700 transition cursor-pointer"
                title="Switch back to workshop schedule page (Supervisor PIN Required)"
              >
                Skip to Schedule
              </button>
            </>
          ) : (
            <div className="px-3 py-1 rounded-md bg-[#16192B] border border-[#2B314E] text-slate-300 flex items-center gap-1.5 font-mono">
              <Layers className="w-3.5 h-3.5 text-slate-400" />
              <span>
                Page <strong className="text-white">{currentPageIndex + 1}</strong> of{' '}
                <strong className="text-white">{totalPages}</strong>
              </span>
              {adSettings.enabled && activePromoSlides.length > 0 && (
                <span className="text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.2 rounded font-bold uppercase hidden md:inline">
                  +{activePromoSlides.length} Ads
                </span>
              )}
            </div>
          )}

          <div
            className={`px-3 py-1 rounded-md border flex items-center gap-1.5 font-mono ${
              isPaused || isUserInteracting
                ? 'bg-amber-950/40 text-amber-400 border-amber-800/40'
                : currentViewType === 'promo'
                ? 'bg-[#16192B] text-amber-400 border-[#2B314E]'
                : 'bg-[#16192B] text-emerald-400 border-[#2B314E]'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>
              {isPaused
                ? 'ROTATION PAUSED'
                : isUserInteracting
                ? 'PAUSED (HOVER)'
                : currentViewType === 'promo'
                ? `NEXT IN ${secondsRemaining}s`
                : `NEXT PAGE IN ${secondsRemaining}s`}
            </span>
          </div>
        </div>
      </nav>

      {/* ─────────────────────────────────────────────────────────────
          4. MAIN TV DISPLAY - EITHER FULL-SCREEN PROMO AD SLIDE OR LIVE SCHEDULE TABLE
         ───────────────────────────────────────────────────────────── */}
      <main
        onMouseEnter={() => setIsUserInteracting(true)}
        onMouseLeave={() => setIsUserInteracting(false)}
        className="w-full h-full p-0 m-0 border-none rounded-none flex-1 flex flex-col justify-start overflow-hidden animate-tv-carousel"
      >
        {currentViewType === 'promo' && activePromoSlides.length > 0 ? (
          <TvPromoSlideView
            slide={activePromoSlides[currentPromoIndex % activePromoSlides.length]}
            slideIndex={currentPromoIndex % activePromoSlides.length}
            totalSlides={activePromoSlides.length}
            durationSeconds={adSettings.duration || 15}
            secondsRemaining={secondsRemaining}
            progressPercent={progressPercent}
            companyLogoUrl={companyLogoUrl}
            companyName={companyName}
            nextSlideUrl={nextPromoSlideUrl}
            onSkipToSchedule={() => {
              setCurrentViewType('schedule');
              slideStartTimeRef.current = Date.now();
            }}
          />
        ) : currentPageItems.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-20 text-center space-y-4">
            <div className="w-20 h-20 rounded-2xl bg-slate-900 border border-[#2B314E] flex items-center justify-center text-slate-500 shadow-inner">
              <CheckCircle2 className="w-10 h-10 text-emerald-400/60" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white mb-1">No Active Records Found</h3>
              <p className="text-sm text-slate-400 max-w-md">
                No jobs or fleet records match the selected category filter {searchQuery ? `or query "${searchQuery}"` : ''} at this time.
              </p>
            </div>
          </div>
        ) : (
          <div className="w-full h-full p-0 m-0 border-none rounded-none bg-transparent overflow-hidden flex-1 flex flex-col min-w-0">
            {/* Ultra-Wide Full Screen Fit Maintenance Schedule Table */}
            <table className="w-full h-full table-fixed text-left text-xs public-mirror-table border-collapse">
              {/* ─────────────────────────────────────────────────────────────
                  EXACT HEADER MATCHING LIVE PUBLIC MIRROR (FULL-BLEED)
                 ───────────────────────────────────────────────────────────── */}
              <thead className="bg-[#121524] text-white shrink-0 sticky top-0 z-10 border-b border-[#2B314E]">
                <tr className="border-b border-[#2B314E] h-11">
                  <th className="py-3 px-3 sm:px-4 text-left font-bold text-white uppercase tracking-wider select-none border-b border-[#2B314E] w-[10%]">
                    ORDER #
                  </th>
                  <th className="py-3 px-3 sm:px-4 text-left font-bold text-white uppercase tracking-wider select-none border-b border-[#2B314E] w-[21%]">
                    VEHICLE
                  </th>
                  <th className="py-3 px-3 sm:px-4 text-left font-bold text-white uppercase tracking-wider select-none border-b border-[#2B314E] w-[13%]">
                    CATEGORY
                  </th>
                  <th className="py-3 px-3 sm:px-4 text-left font-bold text-white uppercase tracking-wider select-none border-b border-[#2B314E] w-[24%]">
                    JOB DETAILS &amp; CUSTOMER
                  </th>
                  <th className="py-3 px-3 sm:px-4 text-left font-bold text-white uppercase tracking-wider select-none border-b border-[#2B314E] w-[16%]">
                    SCHEDULED DATE &amp; TIME
                  </th>
                  <th className="py-3 px-3 sm:px-4 text-left font-bold text-white uppercase tracking-wider select-none border-b border-[#2B314E] w-[16%]">
                    LIVE STATUS
                  </th>
                </tr>
              </thead>

              {/* ─────────────────────────────────────────────────────────────
                  TABLE BODY - ROWS FILL 100% SCREEN HEIGHT SEAMLESSLY
                 ───────────────────────────────────────────────────────────── */}
              <tbody className="w-full h-full">
                {currentPageItems.map((item) => {
                  const isAccident = item.isAccident || normalizeMaintenanceStatus(item.status) === 'accident';
                  const isOffRoad = isStatusOffRoad(item.status, { isAccident, isOffRoad: item.isOffRoad });
                  const isWorkshop =
                    item.isWorkshop ||
                    normalizeMaintenanceStatus(item.status) === 'in-progress' ||
                    normalizeMaintenanceStatus(item.status) === 'workshop';
                  const daysRemaining = item.daysRemaining;
                  const jobDate = item.scheduledDate;
                  const isUrgent = isOffRoad || isStatusUrgentScheduled(item.status, jobDate, { isAccident, isOffRoad });

                  const rowTheme = getJobRowTheme(item.status, {
                    date: jobDate,
                    isScheduledUrgent: isUrgent,
                    isDarkTheme: true,
                    isAccident,
                    isOffRoad,
                  });

                  return (
                    <tr
                      key={item.id}
                      className={`group transition-all duration-150 cursor-default border-b border-[#2B314E]/60 ${rowTheme.rowClass}`}
                      style={{ height: `${100 / Math.max(currentPageItems.length, 1)}%` }}
                    >
                      {/* 1. ORDER # */}
                      <td
                        className={`py-2.5 sm:py-3.5 px-3 sm:px-4 align-middle border-b border-[#2B314E]/60 transition-colors duration-150 ${rowTheme.firstCellClass}`}
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
                        className={`py-2.5 sm:py-3.5 px-3 sm:px-4 align-middle border-b border-[#2B314E]/60 transition-colors duration-150 ${rowTheme.middleCellClass}`}
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
                              {isOffRoad
                                ? 'VOR Emergency'
                                : item.category === 'maintenance'
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
                        className={`py-2.5 sm:py-3.5 px-3 sm:px-4 align-middle border-b border-[#2B314E]/60 transition-colors duration-150 ${rowTheme.middleCellClass}`}
                      >
                        <div className="truncate">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-bold uppercase tracking-wide border truncate ${
                              isOffRoad
                                ? 'bg-rose-950/90 text-rose-300 border-rose-500/70 shadow-xs'
                                : getTypeBadgeColor(item.type)
                            }`}
                          >
                            {isOffRoad ? (
                              <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                            ) : item.category === 'rental' ? (
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
                        className={`py-2.5 sm:py-3.5 px-3 sm:px-4 align-middle border-b border-[#2B314E]/60 transition-colors duration-150 ${rowTheme.middleCellClass}`}
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
                        className={`py-2.5 sm:py-3.5 px-3 sm:px-4 align-middle border-b border-[#2B314E]/60 transition-colors duration-150 ${rowTheme.middleCellClass}`}
                      >
                        <div className="min-w-0 flex flex-col gap-1">
                          <span
                            className={`text-xs sm:text-sm block truncate select-none ${
                              isOffRoad
                                ? 'text-rose-200 font-black tracking-wide'
                                : isUrgent
                                ? 'text-red-200 font-black tracking-wide'
                                : isWorkshop
                                ? 'text-orange-200 font-bold'
                                : 'text-slate-100 font-bold'
                            }`}
                          >
                            {isValid(jobDate) ? format(jobDate, 'dd/MM/yyyy HH:mm') : 'TBD'}
                          </span>
                          <div className="flex items-center gap-1.5 flex-wrap truncate select-none">
                            {isValid(jobDate) && (
                              <TimeTrackingBadge
                                scheduledDate={jobDate}
                                status={item.status}
                                isOffRoad={isOffRoad}
                                isAccident={isAccident}
                                isDarkTheme={true}
                              />
                            )}
                            {getRelativeBadge(jobDate, item, daysRemaining < 0)}
                          </div>
                        </div>
                      </td>

                      {/* 6. LIVE STATUS */}
                      <td
                        className={`py-2.5 sm:py-3.5 px-3 sm:px-4 align-middle border-b border-[#2B314E]/60 transition-colors duration-150 ${rowTheme.lastCellClass}`}
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
        )}
      </main>

      {/* ─────────────────────────────────────────────────────────────
          5. FOOTER STATUS BAR
             (Auto-hides in Fullscreen Mode for clean Kiosk Display)
         ───────────────────────────────────────────────────────────── */}
      <footer
        className={`w-full p-0 m-0 border-t border-[#2B314E] rounded-none bg-[#121524]/90 px-4 sm:px-6 py-2.5 items-center justify-between text-xs text-slate-400 z-20 transition-all duration-300 ${
          isFullscreen ? 'hidden' : 'flex'
        }`}
      >
        <div className="flex items-center gap-3 flex-wrap">
          <span>
            Lines/Page: <strong className="text-white">{linesPerPage}</strong> (Default: 6)
          </span>
          <span className="text-slate-600">•</span>
          <span>
            Auto-Rotation Speed: <strong className="text-white">{rotationSpeed / 1000}s</strong>
          </span>
          <span className="text-slate-600">•</span>
          <span>
            Audio: <strong className={soundEnabled ? 'text-emerald-400' : 'text-slate-400'}>{soundEnabled ? 'ON' : 'Muted'}</strong>
          </span>
          <span className="text-slate-600 hidden md:inline">•</span>
          <span className="hidden md:inline">
            Shortcuts: <strong className="text-slate-300 font-mono">P</strong> Pause,{' '}
            <strong className="text-slate-300 font-mono">F</strong> Fullscreen,{' '}
            <strong className="text-slate-300 font-mono">M</strong> Mute,{' '}
            <strong className="text-slate-300 font-mono">/</strong> Search
          </span>
        </div>

        {/* Page dot indicators (Schedule Pages + Promo Slides) */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1">
            <span className="text-[10px] font-mono text-slate-500 mr-1 hidden sm:inline">Pages:</span>
            {Array.from({ length: totalPages }).map((_, pIdx) => (
              <button
                key={pIdx}
                type="button"
                onClick={() => handleSelectPageProtected(pIdx)}
                className={`h-2 rounded-full transition-all cursor-pointer ${
                  currentViewType === 'schedule' && pIdx === currentPageIndex
                    ? 'w-6 bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]'
                    : 'w-2 bg-slate-700 hover:bg-slate-500'
                }`}
                title={`Schedule Page ${pIdx + 1} (Supervisor PIN Required)`}
              />
            ))}
          </div>

          {adSettings.enabled && activePromoSlides.length > 0 && (
            <div className="flex items-center gap-1 border-l border-slate-700 pl-2">
              <span className="text-[10px] font-mono text-amber-500/80 mr-1 hidden sm:inline">Ads:</span>
              {activePromoSlides.map((_, sIdx) => (
                <button
                  key={sIdx}
                  type="button"
                  onClick={() => handleSelectPromoProtected(sIdx)}
                  className={`h-2 rounded-full transition-all cursor-pointer ${
                    currentViewType === 'promo' && sIdx === (currentPromoIndex % activePromoSlides.length)
                      ? 'w-6 bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]'
                      : 'w-2 bg-amber-950/60 border border-amber-800/60 hover:bg-amber-800'
                  }`}
                  title={`Promo Slide ${sIdx + 1} (Supervisor PIN Required)`}
                />
              ))}
            </div>
          )}
        </div>
      </footer>

      {/* ─────────────────────────────────────────────────────────────
          6. SETTINGS MODAL (DISPLAY & ROTATION + AD & PROMO SLIDES MANAGER)
         ───────────────────────────────────────────────────────────── */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-[#2B314E] rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col p-6 shadow-2xl space-y-5 overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#2B314E] pb-3 shrink-0">
              <div className="flex items-center gap-2">
                <Sliders className="w-5 h-5 text-blue-400" />
                <h3 className="text-lg font-bold text-white">Workshop TV Settings</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tab Navigation */}
            <div className="flex items-center gap-2 border-b border-[#2B314E] pb-3 shrink-0">
              <button
                type="button"
                onClick={() => setSettingsTab('display')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                  settingsTab === 'display'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-950'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Sliders className="w-4 h-4" />
                <span>Display &amp; Rotation</span>
              </button>

              <button
                type="button"
                onClick={() => setSettingsTab('ads')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                  settingsTab === 'ads'
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-950 font-black'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Ad &amp; Promo Slides Manager</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-black ${
                  settingsTab === 'ads' ? 'bg-black text-amber-300' : 'bg-slate-800 text-slate-300'
                }`}>
                  {adSettings.slides.length}
                </span>
                {adSettings.enabled && (
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setSettingsTab('security')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                  settingsTab === 'security'
                    ? 'bg-rose-600 text-white shadow-md shadow-rose-950 font-black'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <ShieldCheck className="w-4 h-4 text-rose-300" />
                <span>Kiosk Security &amp; PIN</span>
                {pinConfig.kioskLockEnabled && (
                  <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse" />
                )}
              </button>
            </div>

            {/* Tab Content (Scrollable) */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-6">
              {settingsTab === 'display' ? (
                <div className="space-y-6">
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
                    <div className="flex gap-2 pt-1 flex-wrap">
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

                  {/* Display Scaling Presets */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-200 block">
                      Display Size &amp; Distance
                    </label>
                    <div className="grid grid-cols-3 gap-2 pt-1">
                      {[
                        { id: 'standard' as const, label: 'Standard', desc: '1080p Normal' },
                        { id: 'large' as const, label: 'Large TV', desc: 'Wall Mount 4K' },
                        { id: 'compact' as const, label: 'Compact', desc: 'Dense Display' },
                      ].map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => handleScaleChange(s.id)}
                          className={`p-2.5 rounded-xl border text-xs font-bold transition text-left cursor-pointer ${
                            displayScale === s.id
                              ? 'bg-blue-600/30 text-blue-300 border-blue-500/60 shadow-sm'
                              : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                          }`}
                        >
                          <div>{s.label}</div>
                          <div className="text-[10px] text-slate-400 font-normal">{s.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Dynamic Auto-Rotation Speed */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-200 block">
                      Auto-Rotation Speed
                    </label>
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

                  {/* Audio Chime Notification */}
                  <div className="pt-2 border-t border-[#2B314E] flex items-center justify-between">
                    <div>
                      <span className="text-sm font-semibold text-slate-200 block">Page Transition Chime</span>
                      <span className="text-xs text-slate-400 block">Play sound when TV board rotates to next page</span>
                    </div>
                    <button
                      type="button"
                      onClick={toggleSound}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer flex items-center gap-1.5 ${
                        soundEnabled
                          ? 'bg-emerald-600/30 text-emerald-300 border-emerald-500/60'
                          : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                      }`}
                    >
                      {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-emerald-400" /> : <VolumeX className="w-3.5 h-3.5" />}
                      <span>{soundEnabled ? 'Enabled' : 'Muted'}</span>
                    </button>
                  </div>
                </div>
              ) : settingsTab === 'ads' ? (
                <TvAdMediaManager
                  settings={adSettings}
                  onUpdateSettings={(newSettings) => setAdSettings(newSettings)}
                />
              ) : (
                /* Kiosk Security & Supervisor PIN Management Panel */
                <div className="space-y-6">
                  {/* Security Header Banner */}
                  <div className="bg-[#16192B] border border-[#2B314E] rounded-2xl p-4 flex items-start gap-3">
                    <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                      <Lock className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">Workshop Floor Kiosk Lock</h4>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Guards the public TV display from unauthorized tampering. A Supervisor PIN is required to exit TV mode, exit fullscreen, open settings, or switch rotation pages.
                      </p>
                    </div>
                  </div>

                  {/* Kiosk Mode Lock Toggle */}
                  <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-800/70 border border-[#2B314E]">
                    <div>
                      <span className="text-sm font-semibold text-slate-200 block">Kiosk Lock Protection</span>
                      <span className="text-xs text-slate-400 block">Require PIN for navigation, settings, fullscreen exit, and closing</span>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        const next = !pinConfig.kioskLockEnabled;
                        await saveSupervisorPinConfig({ kioskLockEnabled: next });
                        setPinConfig((prev) => ({ ...prev, kioskLockEnabled: next }));
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer flex items-center gap-1.5 ${
                        pinConfig.kioskLockEnabled
                          ? 'bg-emerald-600/30 text-emerald-300 border-emerald-500/60'
                          : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                      }`}
                    >
                      {pinConfig.kioskLockEnabled ? <Lock className="w-3.5 h-3.5 text-emerald-400" /> : <Unlock className="w-3.5 h-3.5" />}
                      <span>{pinConfig.kioskLockEnabled ? 'Lock Enabled' : 'Disabled'}</span>
                    </button>
                  </div>

                  {/* Auto-Relock Timeout */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-200 block">
                      Auto-Relock Timeout (Inactivity)
                    </label>
                    <div className="grid grid-cols-4 gap-2 pt-1">
                      {[1, 3, 5, 10].map((mins) => (
                        <button
                          key={mins}
                          type="button"
                          onClick={async () => {
                            await saveSupervisorPinConfig({ autoRelockMinutes: mins });
                            setPinConfig((prev) => ({ ...prev, autoRelockMinutes: mins }));
                          }}
                          className={`px-3 py-2 rounded-xl border text-xs font-bold transition text-center cursor-pointer ${
                            (pinConfig.autoRelockMinutes || 5) === mins
                              ? 'bg-blue-600/30 text-blue-300 border-blue-500/60 shadow-sm'
                              : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                          }`}
                        >
                          {mins} {mins === 1 ? 'Minute' : 'Minutes'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Change Supervisor PIN Form */}
                  <div className="space-y-3 pt-2 border-t border-[#2B314E]">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-semibold text-slate-200">Change Supervisor PIN</label>
                      <span className="text-[11px] font-mono text-slate-400">
                        Current PIN:{' '}
                        <strong className="text-amber-300">
                          {(pinConfig.pin || DEFAULT_SUPERVISOR_PIN) === DEFAULT_SUPERVISOR_PIN
                            ? '1234 (Default)'
                            : '•••• (Custom Active)'}
                        </strong>
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-slate-400 block mb-1">New 4-8 Digit PIN</label>
                        <input
                          type="password"
                          maxLength={8}
                          value={newSupervisorPin}
                          onChange={(e) => {
                            setNewSupervisorPin(e.target.value.replace(/\D/g, ''));
                            setPinChangeMsg(null);
                          }}
                          placeholder="e.g. 2468"
                          className="w-full px-3 py-2 bg-[#0F111A] border border-[#2B314E] rounded-xl text-xs text-white placeholder:text-slate-500 font-mono tracking-widest focus:outline-none focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-slate-400 block mb-1">Confirm New PIN</label>
                        <input
                          type="password"
                          maxLength={8}
                          value={confirmSupervisorPin}
                          onChange={(e) => {
                            setConfirmSupervisorPin(e.target.value.replace(/\D/g, ''));
                            setPinChangeMsg(null);
                          }}
                          placeholder="Re-enter PIN"
                          className="w-full px-3 py-2 bg-[#0F111A] border border-[#2B314E] rounded-xl text-xs text-white placeholder:text-slate-500 font-mono tracking-widest focus:outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>

                    {pinChangeMsg && (
                      <div
                        className={`text-xs px-3 py-1.5 rounded-xl border flex items-center gap-2 ${
                          pinChangeMsg.isError
                            ? 'bg-rose-950/60 border-rose-500/40 text-rose-300'
                            : 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                        }`}
                      >
                        {pinChangeMsg.isError ? (
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        ) : (
                          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                        )}
                        <span>{pinChangeMsg.text}</span>
                      </div>
                    )}

                    <button
                      type="button"
                      disabled={isSavingPin || !newSupervisorPin}
                      onClick={async () => {
                        if (newSupervisorPin.length < 4) {
                          setPinChangeMsg({ text: 'PIN must be at least 4 digits.', isError: true });
                          return;
                        }
                        if (newSupervisorPin !== confirmSupervisorPin) {
                          setPinChangeMsg({ text: 'PINs do not match. Please verify.', isError: true });
                          return;
                        }
                        setIsSavingPin(true);
                        try {
                          await saveSupervisorPinConfig({ pin: newSupervisorPin });
                          setPinConfig((prev) => ({ ...prev, pin: newSupervisorPin }));
                          setNewSupervisorPin('');
                          setConfirmSupervisorPin('');
                          setPinChangeMsg({ text: 'Supervisor PIN updated and synchronized across all TV boards.', isError: false });
                        } catch {
                          setPinChangeMsg({ text: 'Failed to save PIN. Please retry.', isError: true });
                        } finally {
                          setIsSavingPin(false);
                        }
                      }}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition disabled:opacity-50 cursor-pointer"
                    >
                      {isSavingPin ? 'Saving...' : 'Update & Sync Supervisor PIN'}
                    </button>
                  </div>

                  {/* Session Lock Controls */}
                  <div className="pt-3 border-t border-[#2B314E] flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-white block">Active Supervisor Session</span>
                      <span className="text-[11px] text-slate-400 block">
                        {isSupervisorUnlocked ? 'Currently Authenticated' : 'Locked'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        lockSupervisorSession();
                        setShowSettingsModal(false);
                      }}
                      className="px-3.5 py-1.5 bg-rose-950 hover:bg-rose-900 border border-rose-500/50 text-rose-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>Lock Kiosk Immediately</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="pt-3 border-t border-[#2B314E] shrink-0">
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

      {/* ─────────────────────────────────────────────────────────────
          7. SUPERVISOR PIN PROTECTION GUARD MODAL
         ───────────────────────────────────────────────────────────── */}
      <SupervisorPinModal
        isOpen={showPinModal}
        onClose={handlePinCancel}
        onSuccess={handlePinSuccess}
        actionTitle={pendingAction?.title}
        actionDescription={pendingAction?.description}
        pinConfig={pinConfig}
      />
    </div>
  );
};

export const TvDisplayBoard = WorkshopTVBoard;
export default WorkshopTVBoard;

