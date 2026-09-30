// src/components/ui/DateRangePicker.tsx
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Calendar, ChevronDown, ChevronLeft, ChevronRight, X } from 'lucide-react';
import {
  format,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  subMonths,
  addMonths,
  startOfYear,
  endOfYear,
  subYears,
  addYears,
  setMonth,
  setYear,
  getYear,
  getMonth,
  isSameMonth,
  isSameDay,
  isWithinInterval,
} from 'date-fns';

export interface DateRange {
  start: Date | null;
  end: Date | null;
}

export interface DateRangePickerProps {
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
  className?: string;
  buttonClassName?: string;
  align?: 'left' | 'right';
  showPresets?: boolean;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const SHORT_MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

export const DateRangePicker: React.FC<DateRangePickerProps> = ({
  dateRange,
  onDateRangeChange,
  className = '',
  buttonClassName = '',
  align = 'left',
  showPresets = true,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Active view: 'quick' presets, 'month' drilldown, 'year' drilldown, or 'custom'
  const [activeTab, setActiveTab] = useState<'presets' | 'month' | 'year' | 'custom'>('presets');

  // Currently browsed year and month for drilldowns
  const currentRealYear = getYear(new Date());
  const [selectedYear, setSelectedYear] = useState<number>(() => {
    if (dateRange.start) return getYear(dateRange.start);
    return currentRealYear;
  });

  const [selectedMonthIndex, setSelectedMonthIndex] = useState<number>(() => {
    if (dateRange.start) return getMonth(dateRange.start);
    return getMonth(new Date());
  });

  // Year range block for year-picker (e.g. 2020 - 2031)
  const [yearGridStart, setYearGridStart] = useState<number>(() => {
    const yr = dateRange.start ? getYear(dateRange.start) : currentRealYear;
    return Math.floor(yr / 12) * 12;
  });

  // Synchronize when dateRange changes externally
  useEffect(() => {
    if (dateRange.start) {
      setSelectedYear(getYear(dateRange.start));
      setSelectedMonthIndex(getMonth(dateRange.start));
    }
  }, [dateRange.start]);

  // Click outside to close
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen]);

  // Quick Presets
  const applyPreset = (preset: 'all' | 'today' | 'this_week' | 'this_month' | 'last_month' | 'this_quarter' | 'this_year' | 'last_year') => {
    const now = new Date();
    switch (preset) {
      case 'all':
        onDateRangeChange({ start: null, end: null });
        break;
      case 'today':
        onDateRangeChange({ start: startOfDay(now), end: endOfDay(now) });
        break;
      case 'this_week':
        onDateRangeChange({ start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) });
        break;
      case 'this_month':
        onDateRangeChange({ start: startOfMonth(now), end: endOfMonth(now) });
        break;
      case 'last_month': {
        const lastMonth = subMonths(now, 1);
        onDateRangeChange({ start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) });
        break;
      }
      case 'this_quarter': {
        const qMonth = Math.floor(now.getMonth() / 3) * 3;
        const qStart = new Date(now.getFullYear(), qMonth, 1);
        const qEnd = endOfMonth(new Date(now.getFullYear(), qMonth + 2, 1));
        onDateRangeChange({ start: startOfDay(qStart), end: endOfDay(qEnd) });
        break;
      }
      case 'this_year':
        onDateRangeChange({ start: startOfYear(now), end: endOfYear(now) });
        break;
      case 'last_year': {
        const lastYr = subYears(now, 1);
        onDateRangeChange({ start: startOfYear(lastYr), end: endOfYear(lastYr) });
        break;
      }
    }
    setIsOpen(false);
  };

  // Specific Month Drilldown Application
  const applySpecificMonth = (year: number, monthIndex: number) => {
    const monthDate = new Date(year, monthIndex, 1);
    onDateRangeChange({
      start: startOfMonth(monthDate),
      end: endOfMonth(monthDate),
    });
    setIsOpen(false);
  };

  // Specific Year Drilldown Application
  const applySpecificYear = (year: number) => {
    const yearDate = new Date(year, 0, 1);
    onDateRangeChange({
      start: startOfYear(yearDate),
      end: endOfYear(yearDate),
    });
    setIsOpen(false);
  };

  // Dynamic Button Display Label
  const displayLabel = useMemo(() => {
    if (!dateRange.start && !dateRange.end) return 'All Dates';
    const now = new Date();

    // Check specific full year
    if (
      dateRange.start &&
      dateRange.end &&
      format(dateRange.start, 'yyyy-MM-dd') === format(startOfYear(dateRange.start), 'yyyy-MM-dd') &&
      format(dateRange.end, 'yyyy-MM-dd') === format(endOfYear(dateRange.start), 'yyyy-MM-dd')
    ) {
      if (getYear(dateRange.start) === getYear(now)) return 'This Year';
      if (getYear(dateRange.start) === getYear(subYears(now, 1))) return 'Last Year';
      return `Year ${getYear(dateRange.start)}`;
    }

    // Check specific full month
    if (
      dateRange.start &&
      dateRange.end &&
      format(dateRange.start, 'yyyy-MM-dd') === format(startOfMonth(dateRange.start), 'yyyy-MM-dd') &&
      format(dateRange.end, 'yyyy-MM-dd') === format(endOfMonth(dateRange.start), 'yyyy-MM-dd')
    ) {
      if (
        getYear(dateRange.start) === getYear(now) &&
        getMonth(dateRange.start) === getMonth(now)
      ) {
        return 'This Month';
      }
      const lastMonth = subMonths(now, 1);
      if (
        getYear(dateRange.start) === getYear(lastMonth) &&
        getMonth(dateRange.start) === getMonth(lastMonth)
      ) {
        return 'Last Month';
      }
      return format(dateRange.start, 'MMM yyyy');
    }

    // Today
    if (
      dateRange.start &&
      dateRange.end &&
      format(dateRange.start, 'yyyy-MM-dd') === format(startOfDay(now), 'yyyy-MM-dd') &&
      format(dateRange.end, 'yyyy-MM-dd') === format(endOfDay(now), 'yyyy-MM-dd')
    ) {
      return 'Today';
    }

    // Single day
    if (
      dateRange.start &&
      dateRange.end &&
      format(dateRange.start, 'yyyy-MM-dd') === format(dateRange.end, 'yyyy-MM-dd')
    ) {
      return format(dateRange.start, 'dd MMM yyyy');
    }

    if (dateRange.start && dateRange.end) {
      return `${format(dateRange.start, 'dd/MM/yy')} – ${format(dateRange.end, 'dd/MM/yy')}`;
    }
    if (dateRange.start) return `From ${format(dateRange.start, 'dd/MM/yy')}`;
    if (dateRange.end) return `To ${format(dateRange.end, 'dd/MM/yy')}`;
    return 'All Dates';
  }, [dateRange]);

  const hasActiveDate = Boolean(dateRange.start || dateRange.end);

  // Generate 12 years for the year grid
  const yearOptions = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => yearGridStart + i);
  }, [yearGridStart]);

  // Is current month active?
  const isMonthSelected = (year: number, monthIndex: number) => {
    if (!dateRange.start || !dateRange.end) return false;
    const testDate = new Date(year, monthIndex, 1);
    return (
      format(dateRange.start, 'yyyy-MM-dd') === format(startOfMonth(testDate), 'yyyy-MM-dd') &&
      format(dateRange.end, 'yyyy-MM-dd') === format(endOfMonth(testDate), 'yyyy-MM-dd')
    );
  };

  // Is current year active?
  const isYearSelected = (year: number) => {
    if (!dateRange.start || !dateRange.end) return false;
    const testDate = new Date(year, 0, 1);
    return (
      format(dateRange.start, 'yyyy-MM-dd') === format(startOfYear(testDate), 'yyyy-MM-dd') &&
      format(dateRange.end, 'yyyy-MM-dd') === format(endOfYear(testDate), 'yyyy-MM-dd')
    );
  };

  return (
    <div className={`relative inline-block ${className}`} ref={containerRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`h-9 inline-flex items-center gap-2 px-3 py-1.5 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
          hasActiveDate
            ? 'bg-blue-50 text-blue-800 border-blue-300 ring-2 ring-blue-100/80 shadow-xs'
            : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50 shadow-2xs'
        } ${buttonClassName}`}
        title="Filter by date range, specific month, or specific year"
      >
        <Calendar className={`w-3.5 h-3.5 ${hasActiveDate ? 'text-blue-600' : 'text-slate-500'}`} />
        <span className="truncate max-w-[170px]">{displayLabel}</span>
        {hasActiveDate && (
          <span
            onClick={(e) => {
              e.stopPropagation();
              onDateRangeChange({ start: null, end: null });
            }}
            className="p-0.5 rounded-full hover:bg-blue-200/80 text-blue-700 transition-colors ml-0.5"
            title="Clear date filter"
          >
            <X className="w-3 h-3" />
          </span>
        )}
        <ChevronDown
          className={`w-3 h-3 text-slate-400 transition-transform duration-150 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Popover Card */}
      {isOpen && (
        <div
          className={`absolute ${
            align === 'right' ? 'right-0' : 'left-0'
          } top-full mt-1.5 z-50 w-80 sm:w-88 bg-white rounded-2xl shadow-2xl border border-slate-200 p-3.5 text-slate-800 animate-in fade-in zoom-in-95 duration-100`}
        >
          {/* Top Mode Navigation Tabs */}
          <div className="flex items-center justify-between p-1 bg-slate-100 rounded-xl mb-3">
            <button
              type="button"
              onClick={() => setActiveTab('presets')}
              className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg transition-all cursor-pointer text-center ${
                activeTab === 'presets'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Presets
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('month')}
              className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg transition-all cursor-pointer text-center ${
                activeTab === 'month'
                  ? 'bg-white text-blue-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              By Month
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('year')}
              className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg transition-all cursor-pointer text-center ${
                activeTab === 'year'
                  ? 'bg-white text-indigo-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              By Year
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('custom')}
              className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg transition-all cursor-pointer text-center ${
                activeTab === 'custom'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Custom
            </button>
          </div>

          {/* TAB 1: QUICK PRESETS */}
          {activeTab === 'presets' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => applyPreset('all')}
                  className={`px-3 py-2 text-xs font-semibold rounded-xl text-left transition-colors cursor-pointer ${
                    !dateRange.start && !dateRange.end
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-100'
                  }`}
                >
                  All Time
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('today')}
                  className="px-3 py-2 text-xs font-semibold rounded-xl text-left bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-100 transition-colors cursor-pointer"
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('this_week')}
                  className="px-3 py-2 text-xs font-semibold rounded-xl text-left bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-100 transition-colors cursor-pointer"
                >
                  This Week
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('this_month')}
                  className={`px-3 py-2 text-xs font-semibold rounded-xl text-left transition-colors cursor-pointer ${
                    displayLabel === 'This Month'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-100'
                  }`}
                >
                  This Month
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('last_month')}
                  className={`px-3 py-2 text-xs font-semibold rounded-xl text-left transition-colors cursor-pointer ${
                    displayLabel === 'Last Month'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-100'
                  }`}
                >
                  Last Month
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('this_quarter')}
                  className="px-3 py-2 text-xs font-semibold rounded-xl text-left bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-100 transition-colors cursor-pointer"
                >
                  This Quarter
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('this_year')}
                  className={`px-3 py-2 text-xs font-semibold rounded-xl text-left transition-colors cursor-pointer ${
                    displayLabel === 'This Year'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-100'
                  }`}
                >
                  This Year ({currentRealYear})
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('last_year')}
                  className={`px-3 py-2 text-xs font-semibold rounded-xl text-left transition-colors cursor-pointer ${
                    displayLabel === 'Last Year'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-100'
                  }`}
                >
                  Last Year ({currentRealYear - 1})
                </button>
              </div>

              {/* Quick switch to drill down specific month or year */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <span>Want a specific month or year?</span>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => setActiveTab('month')}
                    className="font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                  >
                    Select Month →
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SPECIFIC MONTH DRILLDOWN */}
          {activeTab === 'month' && (
            <div className="space-y-3">
              {/* Year Selector Header */}
              <div className="flex items-center justify-between px-1">
                <button
                  type="button"
                  onClick={() => setSelectedYear((y) => y - 1)}
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
                  title="Previous Year"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-black text-slate-900">{selectedYear}</span>
                  <span className="text-[10px] uppercase font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                    Drilldown
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedYear((y) => y + 1)}
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
                  title="Next Year"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* 12 Months Grid */}
              <div className="grid grid-cols-3 gap-2">
                {MONTH_NAMES.map((monthName, idx) => {
                  const isSelected = isMonthSelected(selectedYear, idx);
                  const isCurrentMonthNow =
                    idx === getMonth(new Date()) && selectedYear === getYear(new Date());

                  return (
                    <button
                      key={monthName}
                      type="button"
                      onClick={() => applySpecificMonth(selectedYear, idx)}
                      className={`py-2 px-2 rounded-xl text-xs font-bold transition-all flex flex-col items-center justify-center cursor-pointer border ${
                        isSelected
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                          : isCurrentMonthNow
                          ? 'bg-blue-50/80 text-blue-700 border-blue-200 hover:bg-blue-100'
                          : 'bg-slate-50 text-slate-700 border-slate-100 hover:bg-slate-100 hover:border-slate-200'
                      }`}
                    >
                      <span>{SHORT_MONTH_NAMES[idx]}</span>
                      <span
                        className={`text-[9px] font-normal mt-0.5 ${
                          isSelected ? 'text-blue-100' : 'text-slate-400'
                        }`}
                      >
                        {selectedYear}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Quick Year Link */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                <button
                  type="button"
                  onClick={() => applySpecificYear(selectedYear)}
                  className="font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                >
                  Select entire year {selectedYear}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const now = new Date();
                    setSelectedYear(getYear(now));
                    applySpecificMonth(getYear(now), getMonth(now));
                  }}
                  className="font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  Jump to Current Month
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: SPECIFIC YEAR DRILLDOWN */}
          {activeTab === 'year' && (
            <div className="space-y-3">
              {/* Year Navigation Bar (12-Year Span) */}
              <div className="flex items-center justify-between px-1">
                <button
                  type="button"
                  onClick={() => setYearGridStart((s) => s - 12)}
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
                  title="Previous 12 Years"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="text-xs font-bold text-slate-700">
                  {yearGridStart} – {yearGridStart + 11}
                </div>
                <button
                  type="button"
                  onClick={() => setYearGridStart((s) => s + 12)}
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
                  title="Next 12 Years"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* 12 Years Grid */}
              <div className="grid grid-cols-3 gap-2">
                {yearOptions.map((yr) => {
                  const isSelected = isYearSelected(yr);
                  const isCurrentYear = yr === currentRealYear;

                  return (
                    <button
                      key={yr}
                      type="button"
                      onClick={() => applySpecificYear(yr)}
                      className={`py-3 px-2 rounded-xl text-xs font-bold transition-all flex flex-col items-center justify-center cursor-pointer border ${
                        isSelected
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                          : isCurrentYear
                          ? 'bg-indigo-50/80 text-indigo-700 border-indigo-200 hover:bg-indigo-100'
                          : 'bg-slate-50 text-slate-700 border-slate-100 hover:bg-slate-100 hover:border-slate-200'
                      }`}
                    >
                      <span className="font-mono text-sm">{yr}</span>
                      <span
                        className={`text-[9.5px] mt-0.5 ${
                          isSelected ? 'text-indigo-100' : 'text-slate-400'
                        }`}
                      >
                        {isCurrentYear ? 'Current' : 'Full Year'}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                <button
                  type="button"
                  onClick={() => {
                    setYearGridStart(Math.floor(currentRealYear / 12) * 12);
                    applySpecificYear(currentRealYear);
                  }}
                  className="font-bold text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer"
                >
                  Current Year ({currentRealYear})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('month')}
                  className="font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  Drill down to months →
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: CUSTOM DATE RANGE INPUTS */}
          {activeTab === 'custom' && (
            <div className="space-y-3">
              <div className="space-y-2 text-xs">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Start Date (From)
                  </label>
                  <input
                    type="date"
                    value={dateRange.start ? format(dateRange.start, 'yyyy-MM-dd') : ''}
                    onChange={(e) =>
                      onDateRangeChange({
                        ...dateRange,
                        start: e.target.value ? new Date(e.target.value) : null,
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium shadow-2xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    End Date (To)
                  </label>
                  <input
                    type="date"
                    value={dateRange.end ? format(dateRange.end, 'yyyy-MM-dd') : ''}
                    onChange={(e) =>
                      onDateRangeChange({
                        ...dateRange,
                        end: e.target.value ? new Date(e.target.value) : null,
                      })
                    }
                    min={dateRange.start ? format(dateRange.start, 'yyyy-MM-dd') : undefined}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium shadow-2xs"
                  />
                </div>
              </div>

              {/* Month Quick Select Helpers */}
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/80 text-[11px] text-slate-600 space-y-1.5">
                <span className="font-bold text-slate-700 block">Quick Drill Helpers:</span>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      const now = new Date();
                      onDateRangeChange({ start: startOfMonth(now), end: endOfMonth(now) });
                    }}
                    className="px-2 py-0.5 rounded-md bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-medium cursor-pointer"
                  >
                    Current Month
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const now = new Date();
                      const lastM = subMonths(now, 1);
                      onDateRangeChange({ start: startOfMonth(lastM), end: endOfMonth(lastM) });
                    }}
                    className="px-2 py-0.5 rounded-md bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-medium cursor-pointer"
                  >
                    Last Month
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const now = new Date();
                      onDateRangeChange({ start: startOfYear(now), end: endOfYear(now) });
                    }}
                    className="px-2 py-0.5 rounded-md bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-medium cursor-pointer"
                  >
                    Current Year
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Footer Bar: Reset & Apply Done */}
          <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                onDateRangeChange({ start: null, end: null });
                setIsOpen(false);
              }}
              className="text-xs text-slate-500 hover:text-rose-600 font-semibold cursor-pointer transition-colors"
            >
              Reset Dates
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-3.5 py-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                Apply Range
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DateRangePicker;
