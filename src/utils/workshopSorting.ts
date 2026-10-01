// src/utils/workshopSorting.ts

/**
 * 1. Define the Priority Map (Lower number = Higher up on the table)
 * Strict Priority Order:
 * 1. In Progress
 * 2. In Workshop
 * 3. Scheduled (These will naturally sort by closest remaining days via the date fallback)
 * 4. Back Order / Awaiting Parts
 * 5. Off Road (VOR) / Accident
 */
export const STATUS_PRIORITY: Record<string, number> = {
  // 1. In Progress
  'IN PROGRESS': 1,
  'IN-PROGRESS': 1,
  'IN_PROGRESS': 1,

  // 2. In Workshop
  'IN WORKSHOP': 2,
  'IN-WORKSHOP': 2,
  'IN_WORKSHOP': 2,
  'WORKSHOP': 2,
  'BODYWORK': 2,

  // 3. Scheduled
  'SCHEDULED': 3,

  // 4. Back Order / Awaiting Parts
  'AWAITING PARTS': 4,
  'AWAITING-PARTS': 4,
  'AWAITING_PARTS': 4,
  'PARTS-BACKORDER': 4,
  'PARTS BACKORDER': 4,
  'BACK ORDER': 4,
  'BACK-ORDER': 4,
  'BACK_ORDER': 4,

  // 5. Off Road (VOR) / Accident
  'OFF ROAD (VOR)': 5,
  'OFF ROAD': 5,
  'OFF-ROAD': 5,
  'OFF_ROAD': 5,
  'VOR': 5,
  'ACCIDENT': 5,
  'OFF-ROAD-ACCIDENT': 5,
  'OFF ROAD ACCIDENT': 5,

  // Terminal / non-active statuses
  'COMPLETED': 90,
  'CANCELLED': 91,
};

/**
 * Assign priority score (default to 99 if unknown so it drops to the bottom)
 */
export const getStatusPriority = (item: any): number => {
  if (!item) return 99;

  // Check explicit off-road / accident boolean flags
  const isAccidentFlag = Boolean(item.isAccident);
  const isOffRoadFlag = Boolean(item.isOffRoad);

  // Standardize status strings for matching
  const rawStatus = String(item.status || item.statusLabel || '').toUpperCase().trim();
  const normalizedStatus = rawStatus.replace(/[-_]/g, ' ');

  // Direct lookup in Priority Map
  if (STATUS_PRIORITY[rawStatus] !== undefined) {
    return STATUS_PRIORITY[rawStatus];
  }
  if (STATUS_PRIORITY[normalizedStatus] !== undefined) {
    return STATUS_PRIORITY[normalizedStatus];
  }

  // Pattern matching
  if (normalizedStatus.includes('IN PROGRESS')) return 1;
  if (normalizedStatus.includes('WORKSHOP') || normalizedStatus.includes('BODYWORK')) return 2;
  if (normalizedStatus.includes('SCHEDULED')) return 3;
  if (
    normalizedStatus.includes('AWAITING PARTS') ||
    normalizedStatus.includes('BACK ORDER') ||
    normalizedStatus.includes('BACKORDER')
  ) {
    return 4;
  }
  if (
    normalizedStatus.includes('OFF ROAD') ||
    normalizedStatus.includes('VOR') ||
    normalizedStatus.includes('ACCIDENT') ||
    isAccidentFlag ||
    isOffRoadFlag
  ) {
    return 5;
  }

  if (normalizedStatus.includes('COMPLETED')) return 90;
  if (normalizedStatus.includes('CANCELLED')) return 91;

  return 99;
};

/**
 * Safely extracts timestamp for date sorting
 */
export const getJobTimestamp = (item: any): number => {
  if (!item) return 0;
  const raw = item.scheduledDate || item.date || item.dueDate || (item as any).createdAt || 0;
  if (!raw) return 0;
  if (raw instanceof Date) return raw.getTime();
  if (typeof (raw as any).toDate === 'function') return (raw as any).toDate().getTime();
  const parsed = new Date(raw).getTime();
  return isNaN(parsed) ? 0 : parsed;
};

/**
 * 2. The Sorting Function
 * Multi-Tier Status and Date Sorting
 * Groups items by strict Status Priority (1-5), and then internally sorts those groups by Date (earliest/most urgent first).
 */
export const sortWorkshopJobs = <T = any>(jobs: T[]): T[] => {
  if (!Array.isArray(jobs)) return [];

  return [...jobs].sort((a: any, b: any) => {
    // Assign priority score (default to 99 if unknown so it drops to the bottom)
    const priorityA = getStatusPriority(a);
    const priorityB = getStatusPriority(b);

    // Tier 1 Sort: By Status Priority
    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }

    // Tier 2 Sort: By Scheduled Date (if statuses are the same)
    // Ascending order (closest/earliest dates at the top)
    const dateA = getJobTimestamp(a);
    const dateB = getJobTimestamp(b);

    if (dateA && dateB) {
      return dateA - dateB;
    }
    if (dateA && !dateB) return -1;
    if (!dateA && dateB) return 1;

    return 0;
  });
};

export default sortWorkshopJobs;
