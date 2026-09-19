// src/utils/accidentCalculations.ts
import { format } from 'date-fns';

export interface ReportingTimingResult {
  diffHours: number;
  diffDays: number;
  timeToReportDisplay: string;
  isLate: boolean;
  lateReporting: 'Yes' | 'No';
  penaltyPayment: number;
  accidentDateTimeStr: string;
  reportedDateTimeStr: string;
}

/**
 * Parses a date value safely from string, Date, or Firestore Timestamp object.
 */
export function parseDateSafe(val: any): Date | null {
  if (!val) return null;
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
  if (typeof val === 'object' && val.seconds !== undefined) {
    return new Date(val.seconds * 1000);
  }
  if (typeof val === 'string') {
    // If only YYYY-MM-DD
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

/**
 * Combines date and time into a single Date object.
 * Date format: YYYY-MM-DD
 * Time format: HH:mm (or HH:mm:ss)
 */
export function combineDateTime(dateStr: string | undefined | null, timeStr: string | undefined | null, fallbackDate?: any): Date | null {
  if (!dateStr && fallbackDate) {
    const fb = parseDateSafe(fallbackDate);
    if (fb) return fb;
  }
  if (!dateStr) return null;

  // Clean dateStr in case it's an ISO timestamp
  let datePart = dateStr;
  if (dateStr.includes('T')) {
    datePart = dateStr.split('T')[0];
  }

  const timePart = (timeStr && timeStr.trim().length > 0) ? timeStr.trim() : '00:00';
  
  // Try standard ISO parsing
  const combinedStr = `${datePart}T${timePart.length === 5 ? timePart + ':00' : timePart}`;
  const dt = new Date(combinedStr);
  if (!isNaN(dt.getTime())) return dt;

  // Fallback to basic date parse
  const fallback = parseDateSafe(dateStr);
  return fallback;
}

/**
 * Calculates reporting timeline and 24-hour late reporting rule:
 * - Within 24 hours (<= 24 hrs): Late Reporting = 'No' (Green badge), Penalty = £0.00
 * - After 24 hours (> 24 hrs): Late Reporting = 'Yes' (Red badge), Penalty can be edited
 */
export function calculateReportingTiming(params: {
  accidentDate?: string | null;
  accidentTime?: string | null;
  reportedDate?: string | null;
  reportedTime?: string | null;
  submittedAt?: any;
  existingPenalty?: number | null;
}): ReportingTimingResult {
  const {
    accidentDate,
    accidentTime,
    reportedDate,
    reportedTime,
    submittedAt,
    existingPenalty
  } = params;

  const accidentDt = combineDateTime(accidentDate, accidentTime);
  const reportedDt = combineDateTime(reportedDate, reportedTime, submittedAt);

  // Default fallback if either date is missing
  if (!accidentDt || !reportedDt) {
    const accStr = accidentDt 
      ? `${format(accidentDt, 'dd/MM/yyyy')}${accidentTime ? ` ${accidentTime}` : ''}`
      : (accidentDate || 'N/A');
    const repStr = reportedDt 
      ? `${format(reportedDt, 'dd/MM/yyyy')}${reportedTime ? ` ${reportedTime}` : ''}`
      : (reportedDate || (submittedAt ? format(parseDateSafe(submittedAt) || new Date(), 'dd/MM/yyyy') : 'N/A'));

    return {
      diffHours: 0,
      diffDays: 0,
      timeToReportDisplay: 'N/A',
      isLate: false,
      lateReporting: 'No',
      penaltyPayment: 0,
      accidentDateTimeStr: accStr,
      reportedDateTimeStr: repStr,
    };
  }

  // Exact difference in milliseconds
  const diffMs = reportedDt.getTime() - accidentDt.getTime();
  const validDiffMs = Math.max(0, diffMs);
  const diffHours = validDiffMs / (1000 * 60 * 60);
  const diffDays = diffHours / 24;

  // Human-readable format
  let timeToReportDisplay = '';
  if (diffHours < 1) {
    const mins = Math.max(1, Math.round(validDiffMs / (1000 * 60)));
    timeToReportDisplay = `${mins} min${mins === 1 ? '' : 's'}`;
  } else if (diffHours <= 24) {
    const wholeHours = Math.floor(diffHours);
    const mins = Math.round((diffHours - wholeHours) * 60);
    timeToReportDisplay = mins > 0 ? `${wholeHours} hrs ${mins} mins` : `${wholeHours} hrs`;
  } else {
    const wholeDays = Math.floor(diffDays);
    const remHours = Math.round(diffHours % 24);
    timeToReportDisplay = remHours > 0 ? `${wholeDays} days ${remHours} hrs` : `${wholeDays} days`;
  }

  // 24-Hour Rule:
  // <= 24 hrs: Automatically No (Green badge) & Penalty Payment = £0.00
  // > 24 hrs: Automatically Yes (Red badge) & Penalty Payment is editable
  const isLate = diffHours > 24;
  const lateReporting: 'Yes' | 'No' = isLate ? 'Yes' : 'No';
  const penaltyPayment = isLate ? (Number(existingPenalty) || 0) : 0;

  const accidentDateTimeStr = `${format(accidentDt, 'dd/MM/yyyy')}${accidentTime ? ` ${accidentTime}` : ''}`;
  const reportedDateTimeStr = `${format(reportedDt, 'dd/MM/yyyy')}${reportedTime ? ` ${reportedTime}` : (reportedDt.getHours() !== 0 || reportedDt.getMinutes() !== 0 ? ` ${format(reportedDt, 'HH:mm')}` : '')}`;

  return {
    diffHours: Number(diffHours.toFixed(2)),
    diffDays: Number(diffDays.toFixed(2)),
    timeToReportDisplay,
    isLate,
    lateReporting,
    penaltyPayment,
    accidentDateTimeStr,
    reportedDateTimeStr,
  };
}
