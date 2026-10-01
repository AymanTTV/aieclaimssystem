// src/utils/timeTrackingBadge.tsx
import React from 'react';
import { Clock } from 'lucide-react';

export interface TimeStatusResult {
  text: string;
  diffDays: number;
  absDays: number;
  color: string;
  lightColor: string;
}

/**
 * 1. CONTEXT-AWARE TIME CALCULATION LOGIC
 * Calculates days remaining, overdue, or elapsed time based on status & date
 */
export const getTimeStatus = (
  scheduledDate: any,
  status?: string,
  options?: { isOffRoad?: boolean; isAccident?: boolean }
): TimeStatusResult | null => {
  if (!scheduledDate) return null;

  const targetDate =
    scheduledDate instanceof Date
      ? new Date(scheduledDate.getTime())
      : typeof (scheduledDate as any).toDate === 'function'
      ? (scheduledDate as any).toDate()
      : new Date(scheduledDate);

  if (isNaN(targetDate.getTime())) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0); // Normalize to midnight
  targetDate.setHours(0, 0, 0, 0);

  // Calculate difference in days
  const diffTime = targetDate.getTime() - today.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
  const absDays = Math.abs(diffDays);

  const upperStatus = String(status || '').toUpperCase().trim();
  const isOffRoad =
    Boolean(options?.isOffRoad) ||
    upperStatus.includes('OFF ROAD') ||
    upperStatus.includes('OFF-ROAD') ||
    upperStatus.includes('VOR');
  const isAccident = Boolean(options?.isAccident) || upperStatus.includes('ACCIDENT');

  // Terminal statuses
  if (upperStatus === 'COMPLETED' || upperStatus === 'CANCELLED') {
    return null;
  }

  // 1. "SCHEDULED" Jobs
  if (upperStatus === 'SCHEDULED' || (!upperStatus && diffDays >= 0)) {
    if (diffDays > 0) {
      return {
        text: `Due in ${diffDays} Day${diffDays > 1 ? 's' : ''}`,
        diffDays,
        absDays,
        color: 'text-blue-400 bg-blue-900/30 border border-blue-700/40',
        lightColor: 'text-blue-700 bg-blue-50 border border-blue-200 font-semibold',
      };
    }
    if (diffDays === 0) {
      return {
        text: 'Due Today',
        diffDays,
        absDays,
        color: 'text-amber-400 bg-amber-900/30 border border-amber-700/40',
        lightColor: 'text-amber-800 bg-amber-50 border border-amber-200 font-bold',
      };
    }
    return {
      text: `${absDays} Day${absDays > 1 ? 's' : ''} Overdue`,
      diffDays,
      absDays,
      color: 'text-red-400 bg-red-900/30 border border-red-700/40',
      lightColor: 'text-red-700 bg-red-50 border border-red-200 font-bold',
    };
  }

  // 2. "AWAITING PARTS" / "BACK ORDER"
  if (
    upperStatus.includes('AWAITING') ||
    upperStatus.includes('BACK ORDER') ||
    upperStatus.includes('PARTS') ||
    upperStatus.includes('BACKORDER')
  ) {
    if (diffDays < 0) {
      return {
        text: `Waiting ${absDays} Day${absDays > 1 ? 's' : ''}`,
        diffDays,
        absDays,
        color: 'text-amber-400 bg-amber-900/30 border border-amber-700/40',
        lightColor: 'text-amber-800 bg-amber-50 border border-amber-200 font-bold',
      };
    }
    if (diffDays === 0) {
      return {
        text: 'Waiting Today',
        diffDays,
        absDays,
        color: 'text-amber-400 bg-amber-900/30 border border-amber-700/40',
        lightColor: 'text-amber-800 bg-amber-50 border border-amber-200 font-bold',
      };
    }
    return {
      text: `Parts in ${diffDays} Day${diffDays > 1 ? 's' : ''}`,
      diffDays,
      absDays,
      color: 'text-amber-400 bg-amber-900/30 border border-amber-700/40',
      lightColor: 'text-amber-800 bg-amber-50 border border-amber-200 font-semibold',
    };
  }

  // 3. "OFF ROAD (VOR)" / "ACCIDENT"
  if (isOffRoad || isAccident) {
    if (diffDays < 0) {
      return {
        text: `Off Road for ${absDays} Day${absDays > 1 ? 's' : ''}`,
        diffDays,
        absDays,
        color: 'text-red-400 bg-red-900/30 border border-red-700/40',
        lightColor: 'text-red-700 bg-red-50 border border-red-200 font-bold',
      };
    }
    if (diffDays === 0) {
      return {
        text: 'Off Road Today',
        diffDays,
        absDays,
        color: 'text-red-400 bg-red-900/30 border border-red-700/40',
        lightColor: 'text-red-700 bg-red-50 border border-red-200 font-bold',
      };
    }
    return {
      text: `Off Road (${diffDays}d)`,
      diffDays,
      absDays,
      color: 'text-red-400 bg-red-900/30 border border-red-700/40',
      lightColor: 'text-red-700 bg-red-50 border border-red-200 font-semibold',
    };
  }

  // 4. "IN WORKSHOP" / "IN PROGRESS"
  if (
    upperStatus.includes('WORKSHOP') ||
    upperStatus.includes('IN PROGRESS') ||
    upperStatus.includes('IN-PROGRESS') ||
    upperStatus.includes('BODYWORK')
  ) {
    if (diffDays < 0) {
      return {
        text: `In Workshop for ${absDays} Day${absDays > 1 ? 's' : ''}`,
        diffDays,
        absDays,
        color: 'text-purple-400 bg-purple-900/30 border border-purple-700/40',
        lightColor: 'text-purple-700 bg-purple-50 border border-purple-200 font-bold',
      };
    }
    if (diffDays === 0) {
      return {
        text: 'In Workshop Today',
        diffDays,
        absDays,
        color: 'text-purple-400 bg-purple-900/30 border border-purple-700/40',
        lightColor: 'text-purple-700 bg-purple-50 border border-purple-200 font-bold',
      };
    }
    return {
      text: `In Workshop (${diffDays}d)`,
      diffDays,
      absDays,
      color: 'text-purple-400 bg-purple-900/30 border border-purple-700/40',
      lightColor: 'text-purple-700 bg-purple-50 border border-purple-200 font-semibold',
    };
  }

  // 5. Default fallback
  if (diffDays < 0) {
    return {
      text: `${absDays} Day${absDays > 1 ? 's' : ''} Ago`,
      diffDays,
      absDays,
      color: 'text-slate-400 bg-slate-800/40 border border-slate-700/40',
      lightColor: 'text-slate-600 bg-slate-100 border border-slate-200 font-medium',
    };
  }
  if (diffDays === 0) {
    return {
      text: 'Today',
      diffDays,
      absDays,
      color: 'text-slate-300 bg-slate-800/40 border border-slate-700/40',
      lightColor: 'text-slate-700 bg-slate-100 border border-slate-200 font-medium',
    };
  }
  return {
    text: `Due in ${diffDays} Day${diffDays > 1 ? 's' : ''}`,
    diffDays,
    absDays,
    color: 'text-blue-400 bg-blue-900/30 border border-blue-700/40',
    lightColor: 'text-blue-700 bg-blue-50 border border-blue-200 font-medium',
  };
};

export interface TimeTrackingBadgeProps {
  scheduledDate: any;
  status?: string;
  isDarkTheme?: boolean;
  isOffRoad?: boolean;
  isAccident?: boolean;
  className?: string;
}

/**
 * Reusable UI Badge component to display the dynamic time tracking badge
 */
export const TimeTrackingBadge: React.FC<TimeTrackingBadgeProps> = ({
  scheduledDate,
  status,
  isDarkTheme = false,
  isOffRoad = false,
  isAccident = false,
  className = '',
}) => {
  const result = getTimeStatus(scheduledDate, status, { isOffRoad, isAccident });
  if (!result) return null;

  const styleClass = isDarkTheme ? result.color : result.lightColor;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] font-semibold tracking-wide whitespace-nowrap shadow-2xs select-none ${styleClass} ${className}`}
    >
      <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3 shrink-0 opacity-80" />
      <span>{result.text}</span>
    </span>
  );
};

export default TimeTrackingBadge;
