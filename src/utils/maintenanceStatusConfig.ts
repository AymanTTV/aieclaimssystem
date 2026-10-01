// src/utils/maintenanceStatusConfig.ts
import { differenceInCalendarDays, isValid } from 'date-fns';

export type CanonicalMaintenanceStatus =
  | 'scheduled'
  | 'in-progress'
  | 'workshop'
  | 'parts-backorder'
  | 'bodywork'
  | 'off-road'
  | 'accident'
  | 'pending'
  | 'inspection'
  | 'completed'
  | 'cancelled';

/**
 * Normalizes any raw status string into a standard canonical status key.
 * Preserves custom/unknown statuses without coercing them to 'in-progress'.
 */
export function normalizeMaintenanceStatus(
  rawStatus?: string,
  options?: { isAccident?: boolean; isOffRoad?: boolean }
): string {
  if (options?.isAccident && (!rawStatus || rawStatus === 'accident' || rawStatus === 'off-road-accident')) {
    return 'accident';
  }

  const s = String(rawStatus || '').toLowerCase().trim();

  if (!s) {
    if (options?.isAccident) return 'accident';
    if (options?.isOffRoad) return 'off-road';
    return 'scheduled';
  }

  // Accident
  if (s === 'accident' || s === 'off-road-accident' || s === 'off-road (accident)' || s === 'off road (accident)') {
    return 'accident';
  }

  // OFF ROAD (VOR)
  if (s === 'off-road' || s === 'off-road (vor)' || s === 'off road (vor)' || s === 'off road' || s === 'vor') {
    return 'off-road';
  }

  // Awaiting Parts
  if (
    s === 'parts-backorder' ||
    s === 'awaiting-parts' ||
    s === 'awaiting parts' ||
    s === 'parts backorder' ||
    s === 'backorder' ||
    s === 'parts_backorder'
  ) {
    return 'parts-backorder';
  }

  // In Progress
  if (s === 'in-progress' || s === 'in progress' || s === 'in_progress') {
    return 'in-progress';
  }

  // In Workshop
  if (s === 'workshop' || s === 'in workshop' || s === 'in-workshop') {
    return 'workshop';
  }

  // Bodywork
  if (s === 'bodywork' || s === 'body work' || s === 'in-bodywork') {
    return 'bodywork';
  }

  // Pending Approval
  if (
    s === 'pending' ||
    s === 'awaiting-approval' ||
    s === 'awaiting approval' ||
    s === 'pending approval' ||
    s === 'pending-approval'
  ) {
    return 'pending';
  }

  // Inspection / MOT
  if (s === 'inspection' || s === 'diagnostic' || s === 'mot' || s === 'inspection / mot') {
    return 'inspection';
  }

  // Completed
  if (s === 'completed' || s === 'complete' || s === 'repaired' || s === 'closed') {
    return 'completed';
  }

  // Cancelled
  if (s === 'cancelled' || s === 'canceled') {
    return 'cancelled';
  }

  // Scheduled
  if (s === 'scheduled' || s === 'booked') {
    return 'scheduled';
  }

  // Available (for depot vehicles)
  if (s === 'available' || s === 'ready' || s === 'depot-ready') {
    return 'available';
  }

  // Active (for rentals)
  if (s === 'active' || s === 'on-hire' || s === 'hired' || s === 'active on hire') {
    return 'active';
  }

  // Custom or unknown status — preserve the raw string, DO NOT coerce to in-progress
  return rawStatus ? String(rawStatus).trim() : 'scheduled';
}

/**
 * Returns the exact standardized display string matching the Maintenance Page dropdown.
 * If the Maintenance Page dropdown is set to:
 * - "Awaiting Parts", returns "Awaiting Parts"
 * - "Scheduled", returns "Scheduled"
 * - "OFF ROAD (VOR)", returns "OFF ROAD (VOR)"
 * - "Accident", returns "Accident"
 * - "In Progress", returns "In Progress"
 * - "In Workshop", returns "In Workshop"
 * - "Bodywork", returns "Bodywork"
 * - "Pending Approval", returns "Pending Approval"
 * - "Inspection / MOT", returns "Inspection / MOT"
 * - "Completed", returns "Completed"
 * - "Cancelled", returns "Cancelled"
 */
export function getMaintenanceStatusLabel(
  rawStatus?: string,
  options?: { isAccident?: boolean; isOffRoad?: boolean }
): string {
  const norm = normalizeMaintenanceStatus(rawStatus, options);

  switch (norm) {
    case 'parts-backorder':
      return 'Awaiting Parts';
    case 'scheduled':
      return 'Scheduled';
    case 'off-road':
      return 'OFF ROAD (VOR)';
    case 'accident':
      return 'Accident';
    case 'in-progress':
      return 'In Progress';
    case 'workshop':
      return 'In Workshop';
    case 'bodywork':
      return 'Bodywork';
    case 'pending':
      return 'Pending Approval';
    case 'inspection':
      return 'Inspection / MOT';
    case 'completed':
      return 'Completed';
    case 'cancelled':
      return 'Cancelled';
    case 'available':
      return 'Depot Ready';
    case 'active':
      return 'Active On Hire';
    default: {
      // Custom or unknown status: clean up formatting and return exact string
      if (rawStatus && typeof rawStatus === 'string') {
        const clean = rawStatus.trim();
        if (clean.length > 0) {
          // If all lowercase, capitalize words cleanly
          if (clean === clean.toLowerCase()) {
            return clean
              .replace(/[-_]/g, ' ')
              .replace(/\b\w/g, (char) => char.toUpperCase());
          }
          return clean;
        }
      }
      return 'Scheduled';
    }
  }
}

/**
 * Checks whether a given status represents a vehicle off-road / accident emergency state
 */
export function isStatusOffRoad(
  rawStatus?: string,
  options?: { isAccident?: boolean; isOffRoad?: boolean }
): boolean {
  if (options?.isOffRoad || options?.isAccident) return true;
  const norm = normalizeMaintenanceStatus(rawStatus, options);
  return norm === 'off-road' || norm === 'accident';
}

/**
 * Checks whether a scheduled item is urgent (due in <= 7 days or overdue)
 */
export function isStatusUrgentScheduled(
  rawStatus?: string,
  date?: Date | string | null,
  options?: { isAccident?: boolean; isOffRoad?: boolean }
): boolean {
  if (isStatusOffRoad(rawStatus, options)) return true;
  const norm = normalizeMaintenanceStatus(rawStatus, options);
  if (norm !== 'scheduled') return false;
  if (!date) return false;
  const d = date instanceof Date ? date : new Date(date);
  if (!isValid(d)) return false;
  const days = differenceInCalendarDays(d, new Date());
  return days <= 7;
}

/**
 * Unified Badge Styles Configuration
 * Provides strict visual parity across both Light Theme (Maintenance Page) and Dark Theme (TV Board)
 */
export function getStatusBadgeStyles(
  rawStatus?: string,
  options?: {
    isScheduledUrgent?: boolean;
    isDarkTheme?: boolean;
    isAccident?: boolean;
    isOffRoad?: boolean;
  }
): string {
  const norm = normalizeMaintenanceStatus(rawStatus, options);
  const isUrgent = options?.isScheduledUrgent;
  const isDark = options?.isDarkTheme;

  // 1. Off-Road (VOR) / Accident
  if (norm === 'off-road' || norm === 'accident') {
    return isDark
      ? 'bg-rose-950 text-rose-300 border border-rose-500/80 shadow-md font-black animate-more-color-blink-red'
      : 'text-rose-950 bg-rose-100 border border-rose-400 ring-1 ring-rose-400 font-bold';
  }

  // 2. Scheduled (Urgent <= 7 days)
  if (norm === 'scheduled' && isUrgent) {
    return isDark
      ? 'bg-red-950 text-red-200 border border-red-500/80 shadow-md font-bold animate-pulse'
      : 'text-red-900 bg-red-100 border border-red-400 ring-1 ring-red-400 font-bold';
  }

  // 3. In Progress
  if (norm === 'in-progress') {
    return isDark
      ? 'bg-orange-950/90 text-orange-200 border border-orange-500/60 shadow-xs font-bold'
      : 'text-orange-950 bg-orange-100 border border-orange-400 ring-1 ring-orange-400 font-bold';
  }

  // 4. In Workshop
  if (norm === 'workshop') {
    return isDark
      ? 'bg-purple-950/90 text-purple-200 border border-purple-500/60 shadow-xs font-bold'
      : 'text-purple-950 bg-purple-100 border border-purple-400 ring-1 ring-purple-400 font-bold';
  }

  // 5. Awaiting Parts (parts-backorder)
  if (norm === 'parts-backorder') {
    return isDark
      ? 'bg-amber-950/90 text-amber-200 border border-amber-500/70 shadow-xs font-bold'
      : 'text-amber-950 bg-amber-100 border border-amber-400 ring-1 ring-amber-400 font-bold';
  }

  // 6. Bodywork
  if (norm === 'bodywork') {
    return isDark
      ? 'bg-indigo-950/90 text-indigo-200 border border-indigo-500/60 shadow-xs font-bold'
      : 'text-indigo-950 bg-indigo-100 border border-indigo-400 ring-1 ring-indigo-400 font-bold';
  }

  // 7. Pending Approval
  if (norm === 'pending') {
    return isDark
      ? 'bg-yellow-950/90 text-yellow-200 border border-yellow-500/60 shadow-xs font-bold'
      : 'text-yellow-950 bg-yellow-100 border border-yellow-400 ring-1 ring-yellow-400 font-bold';
  }

  // 8. Inspection / MOT
  if (norm === 'inspection') {
    return isDark
      ? 'bg-sky-950/90 text-sky-200 border border-sky-500/60 shadow-xs font-bold'
      : 'text-sky-950 bg-sky-100 border border-sky-400 ring-1 ring-sky-400 font-bold';
  }

  // 9. Completed
  if (norm === 'completed') {
    return isDark
      ? 'bg-emerald-950/90 text-emerald-200 border border-emerald-500/60 shadow-xs font-bold'
      : 'text-emerald-900 bg-emerald-100 border border-emerald-400 ring-1 ring-emerald-400 font-bold';
  }

  // 10. Cancelled
  if (norm === 'cancelled') {
    return isDark
      ? 'bg-slate-900 text-slate-400 border border-slate-700 font-medium'
      : 'text-slate-700 bg-slate-100 border border-slate-300 ring-1 ring-slate-300';
  }

  // 11. Available
  if (norm === 'available') {
    return isDark
      ? 'bg-teal-950/90 text-teal-200 border border-teal-500/60 shadow-xs font-bold'
      : 'text-teal-900 bg-teal-100 border border-teal-400 ring-1 ring-teal-400 font-bold';
  }

  // 12. Active (Rentals)
  if (norm === 'active') {
    return isDark
      ? 'bg-blue-950/90 text-blue-200 border border-blue-500/60 shadow-xs font-bold'
      : 'text-blue-900 bg-blue-100 border border-blue-400 ring-1 ring-blue-400 font-bold';
  }

  // 13. Default / Scheduled normal
  return isDark
    ? 'bg-blue-950/80 text-blue-200 border border-blue-500/50 shadow-xs font-bold'
    : 'text-blue-900 bg-blue-100 border border-blue-300 ring-1 ring-blue-300 font-bold';
}

export interface MaintenanceRowTheme {
  rowClass: string;
  firstCellClass: string;
  middleCellClass: string;
  lastCellClass: string;
}

/**
 * Unified Row Theme Configuration
 * Guarantees that row background colors and highlights map identically
 * between Maintenance Page (Light Theme) and TV Display Board (Dark Theme).
 */
export function getMaintenanceRowTheme(
  rawStatus?: string,
  options?: {
    date?: Date | string | null;
    isScheduledUrgent?: boolean;
    isDarkTheme?: boolean;
    isAccident?: boolean;
    isOffRoad?: boolean;
    isPaid?: boolean;
  }
): MaintenanceRowTheme {
  const norm = normalizeMaintenanceStatus(rawStatus, options);
  const isDark = options?.isDarkTheme ?? false;

  const isUrgent =
    options?.isScheduledUrgent ??
    (norm === 'scheduled' && options?.date ? isStatusUrgentScheduled(rawStatus, options.date, options) : false);

  // ─────────────────────────────────────────────────────────────
  // LIGHT THEME (Maintenance Page DataTable)
  // ─────────────────────────────────────────────────────────────
  if (!isDark) {
    const isPaid = options?.isPaid ?? true;
    const paymentBorderClass = isPaid
      ? '[&>td:first-child]:!border-l-4 [&>td:first-child]:!border-l-[#059669] payment-paid table-row-paid'
      : '[&>td:first-child]:!border-l-4 [&>td:first-child]:!border-l-[#dc2626] payment-owing table-row-owing';

    // 0. Off-Road / VOR / Accident (Highlight Rose)
    if ((norm === 'off-road' || norm === 'accident') && norm !== 'completed' && norm !== 'cancelled') {
      return {
        rowClass: `!bg-[#FFE4E6] hover:!bg-[#FECDD3] text-slate-900 [&>td]:!bg-[#FFE4E6] hover:[&>td]:!bg-[#FECDD3] [&>td]:!border-rose-300 ${paymentBorderClass} transition-colors duration-150`,
        firstCellClass: '',
        middleCellClass: '',
        lastCellClass: '',
      };
    }

    // 1. Due in <= 7d Scheduled (Highlight Red)
    if (norm === 'scheduled' && isUrgent) {
      return {
        rowClass: `!bg-[#FEE2E2] hover:!bg-[#FECACA] text-slate-900 [&>td]:!bg-[#FEE2E2] hover:[&>td]:!bg-[#FECACA] [&>td]:!border-red-300 ${paymentBorderClass} transition-colors duration-150`,
        firstCellClass: '',
        middleCellClass: '',
        lastCellClass: '',
      };
    }

    // 2. In Progress (Highlight Orange)
    if (norm === 'in-progress') {
      return {
        rowClass: `!bg-[#FFEDD5] hover:!bg-[#FED7AA] text-slate-900 [&>td]:!bg-[#FFEDD5] hover:[&>td]:!bg-[#FED7AA] [&>td]:!border-orange-300 ${paymentBorderClass} transition-colors duration-150`,
        firstCellClass: '',
        middleCellClass: '',
        lastCellClass: '',
      };
    }

    // 3. Workshop (Highlight Purple)
    if (norm === 'workshop') {
      return {
        rowClass: `!bg-[#FAF5FF] hover:!bg-[#F3E8FF] text-slate-900 [&>td]:!bg-[#FAF5FF] hover:[&>td]:!bg-[#F3E8FF] [&>td]:!border-purple-300 ${paymentBorderClass} transition-colors duration-150`,
        firstCellClass: '',
        middleCellClass: '',
        lastCellClass: '',
      };
    }

    // 4. Awaiting Parts / Backorder (Highlight Amber)
    if (norm === 'parts-backorder') {
      return {
        rowClass: `!bg-[#FFFBEB] hover:!bg-[#FEF3C7] text-slate-900 [&>td]:!bg-[#FFFBEB] hover:[&>td]:!bg-[#FEF3C7] [&>td]:!border-amber-300 ${paymentBorderClass} transition-colors duration-150`,
        firstCellClass: '',
        middleCellClass: '',
        lastCellClass: '',
      };
    }

    // 5. Bodywork (Highlight Indigo)
    if (norm === 'bodywork') {
      return {
        rowClass: `!bg-[#EEF2FF] hover:!bg-[#E0E7FF] text-slate-900 [&>td]:!bg-[#EEF2FF] hover:[&>td]:!bg-[#E0E7FF] [&>td]:!border-indigo-300 ${paymentBorderClass} transition-colors duration-150`,
        firstCellClass: '',
        middleCellClass: '',
        lastCellClass: '',
      };
    }

    // 6. Pending (Highlight Yellow)
    if (norm === 'pending') {
      return {
        rowClass: `!bg-[#FEFCE8] hover:!bg-[#FEF9C3] text-slate-900 [&>td]:!bg-[#FEFCE8] hover:[&>td]:!bg-[#FEF9C3] [&>td]:!border-yellow-300 ${paymentBorderClass} transition-colors duration-150`,
        firstCellClass: '',
        middleCellClass: '',
        lastCellClass: '',
      };
    }

    // 7. Inspection (Highlight Sky)
    if (norm === 'inspection') {
      return {
        rowClass: `!bg-[#F0F9FF] hover:!bg-[#E0F2FE] text-slate-900 [&>td]:!bg-[#F0F9FF] hover:[&>td]:!bg-[#E0F2FE] [&>td]:!border-sky-300 ${paymentBorderClass} transition-colors duration-150`,
        firstCellClass: '',
        middleCellClass: '',
        lastCellClass: '',
      };
    }

    // Standard / Completed / Cancelled
    return {
      rowClass: `${paymentBorderClass} transition-colors duration-150`,
      firstCellClass: '',
      middleCellClass: '',
      lastCellClass: '',
    };
  }

  // ─────────────────────────────────────────────────────────────
  // DARK THEME (Workshop TV Board & Public Mirror)
  // ─────────────────────────────────────────────────────────────

  // 0. Off-Road / VOR / Accident
  if (norm === 'off-road' || norm === 'accident') {
    return {
      rowClass: 'row-urgent animate-slow-fade-blink-table border-l-4 !border-l-rose-500 bg-[#2d0810]',
      firstCellClass:
        'border-l-4 !border-l-rose-500 border-y-rose-700/80 bg-[#2d0810] group-hover:bg-[#3d0b17] group-hover:border-y-rose-500',
      middleCellClass:
        'border-y-rose-700/80 bg-[#2d0810] group-hover:bg-[#3d0b17] group-hover:border-y-rose-500',
      lastCellClass:
        'border-r border-y-rose-700/80 border-r-rose-700/80 bg-[#2d0810] group-hover:bg-[#3d0b17] group-hover:border-y-rose-500 group-hover:border-r-rose-500',
    };
  }

  // 1. Due in <= 7d Scheduled (Urgent)
  if (norm === 'scheduled' && isUrgent) {
    return {
      rowClass: 'row-urgent animate-slow-fade-blink-table border-l-4 !border-l-red-500 bg-[#26070b]',
      firstCellClass:
        'border-l-4 !border-l-red-500 border-y-red-700/80 bg-[#26070b] group-hover:bg-[#380a10] group-hover:border-y-red-500',
      middleCellClass:
        'border-y-red-700/80 bg-[#26070b] group-hover:bg-[#380a10] group-hover:border-y-red-500',
      lastCellClass:
        'border-r border-y-red-700/80 border-r-red-700/80 bg-[#26070b] group-hover:bg-[#380a10] group-hover:border-y-red-500 group-hover:border-r-red-500',
    };
  }

  // 2. In Progress (Orange)
  if (norm === 'in-progress') {
    return {
      rowClass: 'row-in-progress border-l-4 !border-l-orange-500 bg-orange-950/25',
      firstCellClass:
        'border-l-4 !border-l-orange-500 border-y-orange-500/40 bg-orange-950/20 group-hover:bg-orange-950/40 group-hover:border-y-orange-400/60',
      middleCellClass:
        'border-y-orange-500/40 bg-orange-950/20 group-hover:bg-orange-950/40 group-hover:border-y-orange-400/60',
      lastCellClass:
        'border-r border-y-orange-500/40 border-r-orange-500/40 bg-orange-950/20 group-hover:bg-orange-950/40 group-hover:border-y-orange-400/60 group-hover:border-r-orange-400/60',
    };
  }

  // 3. Workshop (Purple)
  if (norm === 'workshop') {
    return {
      rowClass: 'border-l-4 !border-l-purple-500 bg-purple-950/25',
      firstCellClass:
        'border-l-4 !border-l-purple-500 border-y-purple-500/40 bg-purple-950/20 group-hover:bg-purple-950/40 group-hover:border-y-purple-400/60',
      middleCellClass:
        'border-y-purple-500/40 bg-purple-950/20 group-hover:bg-purple-950/40 group-hover:border-y-purple-400/60',
      lastCellClass:
        'border-r border-y-purple-500/40 border-r-purple-500/40 bg-purple-950/20 group-hover:bg-purple-950/40 group-hover:border-y-purple-400/60 group-hover:border-r-purple-400/60',
    };
  }

  // 4. Awaiting Parts / Backorder (Amber)
  if (norm === 'parts-backorder') {
    return {
      rowClass: 'border-l-4 !border-l-amber-500 bg-amber-950/25',
      firstCellClass:
        'border-l-4 !border-l-amber-500 border-y-amber-500/40 bg-amber-950/20 group-hover:bg-amber-950/40 group-hover:border-y-amber-400/60',
      middleCellClass:
        'border-y-amber-500/40 bg-amber-950/20 group-hover:bg-amber-950/40 group-hover:border-y-amber-400/60',
      lastCellClass:
        'border-r border-y-amber-500/40 border-r-amber-500/40 bg-amber-950/20 group-hover:bg-amber-950/40 group-hover:border-y-amber-400/60 group-hover:border-r-amber-400/60',
    };
  }

  // 5. Bodywork (Indigo)
  if (norm === 'bodywork') {
    return {
      rowClass: 'border-l-4 !border-l-indigo-500 bg-indigo-950/25',
      firstCellClass:
        'border-l-4 !border-l-indigo-500 border-y-indigo-500/40 bg-indigo-950/20 group-hover:bg-indigo-950/40 group-hover:border-y-indigo-400/60',
      middleCellClass:
        'border-y-indigo-500/40 bg-indigo-950/20 group-hover:bg-indigo-950/40 group-hover:border-y-indigo-400/60',
      lastCellClass:
        'border-r border-y-indigo-500/40 border-r-indigo-500/40 bg-indigo-950/20 group-hover:bg-indigo-950/40 group-hover:border-y-indigo-400/60 group-hover:border-r-indigo-400/60',
    };
  }

  // 6. Pending Approval (Yellow)
  if (norm === 'pending') {
    return {
      rowClass: 'border-l-4 !border-l-yellow-500 bg-yellow-950/25',
      firstCellClass:
        'border-l-4 !border-l-yellow-500 border-y-yellow-500/40 bg-yellow-950/20 group-hover:bg-yellow-950/40 group-hover:border-y-yellow-400/60',
      middleCellClass:
        'border-y-yellow-500/40 bg-yellow-950/20 group-hover:bg-yellow-950/40 group-hover:border-y-yellow-400/60',
      lastCellClass:
        'border-r border-y-yellow-500/40 border-r-yellow-500/40 bg-yellow-950/20 group-hover:bg-yellow-950/40 group-hover:border-y-yellow-400/60 group-hover:border-r-yellow-400/60',
    };
  }

  // 7. Inspection / MOT (Sky)
  if (norm === 'inspection') {
    return {
      rowClass: 'border-l-4 !border-l-sky-500 bg-sky-950/25',
      firstCellClass:
        'border-l-4 !border-l-sky-500 border-y-sky-500/40 bg-sky-950/20 group-hover:bg-sky-950/40 group-hover:border-y-sky-400/60',
      middleCellClass:
        'border-y-sky-500/40 bg-sky-950/20 group-hover:bg-sky-950/40 group-hover:border-y-sky-400/60',
      lastCellClass:
        'border-r border-y-sky-500/40 border-r-sky-500/40 bg-sky-950/20 group-hover:bg-sky-950/40 group-hover:border-y-sky-400/60 group-hover:border-r-sky-400/60',
    };
  }

  // Standard / Scheduled / Available / Completed
  return {
    rowClass: 'row-normal bg-[#121524]',
    firstCellClass: 'border-[#2B314E]/70 bg-[#121524] group-hover:bg-[#1A1F36] group-hover:border-[#3E4770]',
    middleCellClass: 'border-[#2B314E]/70 bg-[#121524] group-hover:bg-[#1A1F36] group-hover:border-[#3E4770]',
    lastCellClass: 'border-[#2B314E]/70 bg-[#121524] group-hover:bg-[#1A1F36] group-hover:border-[#3E4770]',
  };
}

/**
 * Shared utility function getJobRowTheme(status, options)
 * Alias to getMaintenanceRowTheme for strict parity across views.
 */
export function getJobRowTheme(
  rawStatus?: string,
  options?: {
    date?: Date | string | null;
    isScheduledUrgent?: boolean;
    isDarkTheme?: boolean;
    isAccident?: boolean;
    isOffRoad?: boolean;
    isPaid?: boolean;
  }
): MaintenanceRowTheme {
  return getMaintenanceRowTheme(rawStatus, options);
}

