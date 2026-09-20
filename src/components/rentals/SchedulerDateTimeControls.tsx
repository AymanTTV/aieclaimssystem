// src/components/rentals/SchedulerDateTimeControls.tsx
import React from 'react';
import { Clock, Calendar, Save, Loader2 } from 'lucide-react';
import {
  DAYS_OF_WEEK,
  SCHEDULE_TIME_OPTIONS,
  formatTime12h,
  generateCronExpression,
  getDayInfo,
} from '../../utils/schedulerConfig';

export interface SchedulerDateTimeControlsProps {
  scheduleDay: number;
  scheduleTime: string;
  onChangeDay: (day: number) => void;
  onChangeTime: (time: string) => void;
  onSaveSchedule?: () => Promise<void> | void;
  isSaving?: boolean;
  showSaveButton?: boolean;
  showLiveCronBadge?: boolean;
  layout?: 'horizontal' | 'stacked' | 'compact';
  className?: string;
  theme?: 'dark-navy' | 'standard';
}

export const SchedulerDateTimeControls: React.FC<SchedulerDateTimeControlsProps> = ({
  scheduleDay,
  scheduleTime,
  onChangeDay,
  onChangeTime,
  onSaveSchedule,
  isSaving = false,
  showSaveButton = false,
  showLiveCronBadge = true,
  layout = 'horizontal',
  className = '',
}) => {
  const dayInfo = getDayInfo(scheduleDay);
  const formattedTime = formatTime12h(scheduleTime);
  const cronExpr = generateCronExpression(scheduleDay, scheduleTime);

  // If time isn't in default list, add it dynamically
  const hasTimeInOptions = SCHEDULE_TIME_OPTIONS.some(o => o.value === scheduleTime);

  return (
    <div
      className={`flex flex-wrap items-center gap-3 p-3 sm:p-3.5 bg-[#16192B] border border-indigo-500/25 rounded-2xl shadow-md ${className}`}
      data-testid="scheduler-datetime-controls"
    >
      {/* 1. Day Selector Dropdown */}
      <div className="flex items-center gap-2">
        <label className="flex items-center gap-1.5 text-xs font-bold text-indigo-300 shrink-0">
          <Calendar className="w-3.5 h-3.5 text-indigo-400" />
          <span>Day:</span>
        </label>
        <select
          value={scheduleDay}
          onChange={e => onChangeDay(Number(e.target.value))}
          aria-label="Select automated dispatch day of the week"
          className="px-3 py-1.5 bg-[#0F111A] text-white text-xs sm:text-sm font-semibold rounded-xl border border-white/20 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors shadow-inner cursor-pointer"
        >
          {DAYS_OF_WEEK.map(d => (
            <option
              key={d.value}
              value={d.value}
              className="bg-[#0F111A] text-white py-1.5 font-medium"
            >
              {d.label}
            </option>
          ))}
        </select>
      </div>

      {/* 2. Time Picker / Dropdown */}
      <div className="flex items-center gap-2">
        <label className="flex items-center gap-1.5 text-xs font-bold text-indigo-300 shrink-0">
          <Clock className="w-3.5 h-3.5 text-indigo-400" />
          <span>Time:</span>
        </label>
        <select
          value={scheduleTime}
          onChange={e => onChangeTime(e.target.value)}
          aria-label="Select automated dispatch time"
          className="px-3 py-1.5 bg-[#0F111A] text-white text-xs sm:text-sm font-semibold rounded-xl border border-white/20 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors shadow-inner cursor-pointer"
        >
          {!hasTimeInOptions && (
            <option value={scheduleTime} className="bg-[#0F111A] text-white font-medium">
              {formattedTime} (Custom)
            </option>
          )}
          {SCHEDULE_TIME_OPTIONS.map(t => (
            <option
              key={t.value}
              value={t.value}
              className="bg-[#0F111A] text-white py-1.5 font-medium"
            >
              {t.label}
            </option>
          ))}
        </select>
      </div>

      {/* 3. Live Cron / Schedule Badge */}
      {showLiveCronBadge && (
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#0F111A] border border-indigo-500/30 text-indigo-300 text-[11px] font-mono font-bold shadow-xs">
          <Clock className="w-3 h-3 text-indigo-400 animate-pulse" />
          <span>
            Cron: <span className="text-white">{cronExpr}</span> ({dayInfo.plural} {formattedTime})
          </span>
        </div>
      )}

      {/* 4. Optional Direct Save Button */}
      {showSaveButton && onSaveSchedule && (
        <button
          type="button"
          onClick={onSaveSchedule}
          disabled={isSaving}
          className="inline-flex items-center px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-md transition disabled:opacity-50 cursor-pointer ml-auto"
        >
          {isSaving ? (
            <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
          ) : (
            <Save className="w-3.5 h-3.5 mr-1.5" />
          )}
          Save Schedule
        </button>
      )}
    </div>
  );
};

export default SchedulerDateTimeControls;
