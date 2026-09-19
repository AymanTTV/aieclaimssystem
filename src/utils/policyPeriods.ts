import { PolicyPeriod } from '../types/driverRisk';

/**
 * Standard Fleet Insurance Policy Terms:
 * Starts 18 December of year Y and concludes 17 December of year Y+1.
 */
export const POLICY_PERIODS: PolicyPeriod[] = [
  {
    id: 'current_2025_2026',
    name: 'Current Policy Period (2025–2026)',
    startDate: '2025-12-18',
    endDate: '2026-12-17',
    isCurrent: true,
    label: '18 Dec 2025 – 17 Dec 2026',
  },
  {
    id: 'upcoming_2026_2027',
    name: 'Upcoming Renewal Period (2026–2027)',
    startDate: '2026-12-18',
    endDate: '2027-12-17',
    isUpcoming: true,
    label: '18 Dec 2026 – 17 Dec 2027',
  },
  {
    id: 'previous_2024_2025',
    name: 'Previous Period (2024–2025)',
    startDate: '2024-12-18',
    endDate: '2025-12-17',
    isPrevious: true,
    label: '18 Dec 2024 – 17 Dec 2025',
  },
  {
    id: 'previous_2023_2024',
    name: 'Previous Period (2023–2024)',
    startDate: '2023-12-18',
    endDate: '2024-12-17',
    isPrevious: true,
    label: '18 Dec 2023 – 17 Dec 2024',
  },
  {
    id: 'previous_2022_2023',
    name: 'Previous Period (2022–2023)',
    startDate: '2022-12-18',
    endDate: '2023-12-17',
    isPrevious: true,
    label: '18 Dec 2022 – 17 Dec 2023',
  },
  {
    id: 'all_time',
    name: 'All Historical Records',
    startDate: '1970-01-01',
    endDate: '2099-12-31',
    label: 'All Time Records',
  },
];

export const CURRENT_POLICY_PERIOD = POLICY_PERIODS[0];

/**
 * Checks if an accident's date falls within the selected policy period
 */
export const isAccidentInPolicyPeriod = (
  accidentDateStr: string | null | undefined,
  period: PolicyPeriod
): boolean => {
  if (!accidentDateStr) return false;

  // Normalize date string (YYYY-MM-DD)
  let cleanDateStr = accidentDateStr.trim();
  if (cleanDateStr.includes('T')) {
    cleanDateStr = cleanDateStr.split('T')[0];
  }

  // If format is DD/MM/YYYY
  if (cleanDateStr.includes('/')) {
    const parts = cleanDateStr.split('/');
    if (parts.length === 3) {
      if (parts[2].length === 4) {
        // DD/MM/YYYY -> YYYY-MM-DD
        cleanDateStr = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
    }
  }

  const accidentTime = new Date(`${cleanDateStr}T12:00:00Z`).getTime();
  if (isNaN(accidentTime)) {
    // Fallback standard parse
    const fallback = new Date(accidentDateStr).getTime();
    if (isNaN(fallback)) return false;
    const start = new Date(`${period.startDate}T00:00:00Z`).getTime();
    const end = new Date(`${period.endDate}T23:59:59Z`).getTime();
    return fallback >= start && fallback <= end;
  }

  const periodStart = new Date(`${period.startDate}T00:00:00Z`).getTime();
  const periodEnd = new Date(`${period.endDate}T23:59:59Z`).getTime();

  return accidentTime >= periodStart && accidentTime <= periodEnd;
};

/**
 * Returns days remaining until the upcoming renewal date (18 December 2026)
 */
export const getRenewalCountdown = (): { days: number; isPast: boolean; label: string } => {
  const targetDate = new Date('2026-12-18T00:00:00');
  const now = new Date();
  const diffMs = targetDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) {
    return {
      days: 0,
      isPast: true,
      label: 'Renewal Due / In Progress',
    };
  }

  return {
    days: diffDays,
    isPast: false,
    label: `${diffDays} days until 18 Dec 2026 renewal`,
  };
};

/**
 * Returns current policy period (18 Dec 2025 to 17 Dec 2026)
 */
export const getCurrentPolicyPeriod = (): PolicyPeriod => {
  return POLICY_PERIODS.find((p) => p.isCurrent) || POLICY_PERIODS[0];
};

/**
 * Finds which annual policy period a given accident date falls into
 */
export const getPolicyPeriodForDate = (dateStr: string): PolicyPeriod => {
  for (const period of POLICY_PERIODS) {
    if (period.id !== 'all_time' && isAccidentInPolicyPeriod(dateStr, period)) {
      return period;
    }
  }
  return getCurrentPolicyPeriod();
};

