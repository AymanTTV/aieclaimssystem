// src/components/utilisation/FleetHoursWorkedIdleChart.tsx
import React, { useState, useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine
} from 'recharts';
import { format, subDays, startOfDay, endOfDay, isValid } from 'date-fns';
import {
  BarChart3,
  Clock,
  Zap,
  TrendingUp,
  Moon,
  Info,
  Calendar,
  Layers,
  Columns3
} from 'lucide-react';
import { Vehicle } from '../../types/vehicle';
import { Rental } from '../../types/rental';
import { MaintenanceLog } from '../../types';

interface FleetHoursWorkedIdleChartProps {
  vehicles: Vehicle[];
  rentals: Rental[];
  logs?: MaintenanceLog[];
  showSold?: boolean;
}

// Robust Firestore date parser
const parseDate = (val: any): Date => {
  if (!val) return new Date(NaN);
  if (val instanceof Date) return val;
  if (typeof val.toDate === 'function') return val.toDate();
  if (typeof val === 'number') return new Date(val);
  if (typeof val === 'object' && 'seconds' in val) return new Date(val.seconds * 1000);

  if (typeof val === 'string') {
    const ukRegex = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/;
    const match = val.match(ukRegex);
    if (match) {
      const day = parseInt(match[1], 10);
      const month = parseInt(match[2], 10) - 1;
      const year = parseInt(match[3], 10);
      const timeRegex = /\s+(\d{1,2}):(\d{2})/;
      const timeMatch = val.match(timeRegex);
      const hours = timeMatch ? parseInt(timeMatch[1], 10) : 0;
      const mins = timeMatch ? parseInt(timeMatch[2], 10) : 0;
      return new Date(year, month, day, hours, mins);
    }
    return new Date(val);
  }
  return new Date(val);
};

export interface DayFleetHoursPoint {
  rawDate: Date;
  dateLabel: string;
  shortDate: string;
  fullDate: string;
  workedHours: number;
  idleHours: number;
  totalCapacityHours: number;
  vehiclesWorking: number;
  vehiclesIdle: number;
  vehiclesMaintenance: number;
  totalFleet: number;
  utilisationRate: number;
  isToday: boolean;
}

export interface FleetHoursAggregateStats {
  totalWorked: number;
  totalIdle: number;
  totalCapacity: number;
  avgUtil: number;
  avgDailyWorkingVehicles: string;
  peakDayName: string;
  peakDayHours: number;
}

export const calculate7DayFleetHours = (
  vehicles: Vehicle[],
  rentals: Rental[],
  logs: MaintenanceLog[] = [],
  showSold: boolean = false,
  basisMode: 'commercial' | 'fullDay' = 'commercial'
): { daysData: DayFleetHoursPoint[]; stats: FleetHoursAggregateStats; fleetVehicles: Vehicle[] } => {
  const fleetVehicles = vehicles.filter(v => {
    if (!v) return false;
    if (!showSold && (v.status === 'sold' || v.status === 'disposed')) return false;
    return true;
  });

  const preprocessedRentals: { vehicleId: string; registration?: string; start: number; end: number }[] = [];
  rentals.forEach(rental => {
    if (rental.status === 'cancelled') return;

    if (rental.vehicleId) {
      const start = parseDate(rental.startDate);
      let end = parseDate(rental.endDate);
      const isCompleted = ['completed', 'complete', 'returned'].includes((rental.status || '').toLowerCase());
      if (isCompleted && rental.returnCondition && rental.returnCondition.date) {
        const actualReturn = parseDate(rental.returnCondition.date);
        if (!isNaN(actualReturn.getTime())) {
          end = actualReturn;
        }
      } else if (rental.status === 'active' && end.getTime() < Date.now()) {
        end = new Date();
      }

      if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
        preprocessedRentals.push({
          vehicleId: rental.vehicleId,
          start: Math.min(start.getTime(), end.getTime()),
          end: Math.max(start.getTime(), end.getTime())
        });
      }
    }

    if (rental.hireSubstitutionDetails && Array.isArray(rental.hireSubstitutionDetails)) {
      rental.hireSubstitutionDetails.forEach(sub => {
        const sStart = parseDate(sub.givenAt);
        let sEnd = sub.returnCondition ? parseDate(sub.returnCondition.date) : parseDate(sub.expectedReturnAt);
        if (!sub.returnCondition && sEnd.getTime() < Date.now()) {
          sEnd = new Date();
        }
        if (!isNaN(sStart.getTime()) && !isNaN(sEnd.getTime())) {
          preprocessedRentals.push({
            vehicleId: '',
            registration: (sub.registration || '').toLowerCase().replace(/\s+/g, ''),
            start: Math.min(sStart.getTime(), sEnd.getTime()),
            end: Math.max(sStart.getTime(), sEnd.getTime())
          });
        }
      });
    }
  });

  const preprocessedLogs = logs
    .filter(l => l.status !== 'cancelled' && l.vehicleId)
    .map(log => {
      const start = parseDate(log.date);
      let end = start;
      if (log.completedDate) {
        end = parseDate(log.completedDate);
      } else if (log.status === 'in-progress') {
        end = new Date();
      }
      return {
        vehicleId: log.vehicleId,
        start: !isNaN(start.getTime()) ? start.getTime() : 0,
        end: !isNaN(end.getTime()) ? end.getTime() : 0
      };
    })
    .filter(l => l.start > 0);

  const totalFleetCount = fleetVehicles.length;
  const daysData: DayFleetHoursPoint[] = [];

  for (let i = 6; i >= 0; i--) {
    const targetDate = subDays(new Date(), i);
    const dayStart = startOfDay(targetDate).getTime();
    const dayEnd = endOfDay(targetDate).getTime();

    let vehiclesWorkingCount = 0;
    let vehiclesMaintenanceCount = 0;

    fleetVehicles.forEach(vehicle => {
      const cleanReg = (vehicle.registrationNumber || '').toLowerCase().replace(/\s+/g, '');
      const isWorking = preprocessedRentals.some(r => {
        const matchesVehicle = (r.vehicleId && r.vehicleId === vehicle.id) ||
                               (r.registration && r.registration === cleanReg);
        if (!matchesVehicle) return false;
        return r.start <= dayEnd && r.end >= dayStart;
      });

      if (isWorking) {
        vehiclesWorkingCount++;
      } else {
        const vStatus = (vehicle.status || '').toLowerCase().trim();
        const isStatusMaint = vStatus === 'maintenance' || vStatus === 'repair' || vStatus === 'scheduled-maintenance' || vStatus === 'in-maintenance';
        const inMaint = isStatusMaint || preprocessedLogs.some(m => {
          return m.vehicleId === vehicle.id && m.start <= dayEnd && m.end >= dayStart;
        });
        if (inMaint) {
          vehiclesMaintenanceCount++;
        }
      }
    });

    // Vehicles that are in maintenance are NOT available, so idle count excludes maintenance
    const vehiclesIdleCount = Math.max(0, totalFleetCount - vehiclesWorkingCount - vehiclesMaintenanceCount);
    let workedHours = 0;
    let idleHours = 0;
    let totalCapacityHours = 0;

    if (basisMode === 'commercial') {
      totalCapacityHours = totalFleetCount * 10;
      workedHours = vehiclesWorkingCount * 10;
      idleHours = vehiclesIdleCount * 10;
    } else {
      totalCapacityHours = totalFleetCount * 24;
      workedHours = vehiclesWorkingCount * 10;
      idleHours = vehiclesIdleCount * 24;
    }

    const utilisationRate = totalCapacityHours > 0
      ? Math.round((workedHours / totalCapacityHours) * 100)
      : 0;

    daysData.push({
      rawDate: targetDate,
      dateLabel: format(targetDate, 'EEE dd MMM'),
      shortDate: format(targetDate, 'EEE d'),
      fullDate: format(targetDate, 'EEEE, d MMMM yyyy'),
      workedHours,
      idleHours,
      totalCapacityHours,
      vehiclesWorking: vehiclesWorkingCount,
      vehiclesIdle: vehiclesIdleCount,
      vehiclesMaintenance: vehiclesMaintenanceCount,
      totalFleet: totalFleetCount,
      utilisationRate,
      isToday: i === 0
    });
  }

  const totalWorked = daysData.reduce((acc, curr) => acc + curr.workedHours, 0);
  const totalIdle = daysData.reduce((acc, curr) => acc + curr.idleHours, 0);
  const totalCapacity = daysData.reduce((acc, curr) => acc + curr.totalCapacityHours, 0);
  const avgUtil = totalCapacity > 0 ? (totalWorked / totalCapacity) * 100 : 0;
  const avgDailyWorkingVehicles = daysData.length > 0
    ? (daysData.reduce((acc, curr) => acc + curr.vehiclesWorking, 0) / daysData.length).toFixed(1)
    : '0';

  let peakDay = daysData[0];
  daysData.forEach(d => {
    if (d.workedHours > (peakDay?.workedHours || 0)) {
      peakDay = d;
    }
  });

  return {
    daysData,
    stats: {
      totalWorked,
      totalIdle,
      totalCapacity,
      avgUtil,
      avgDailyWorkingVehicles,
      peakDayName: peakDay ? peakDay.shortDate : 'N/A',
      peakDayHours: peakDay ? peakDay.workedHours : 0
    },
    fleetVehicles
  };
};

export const FleetHoursWorkedIdleChart: React.FC<FleetHoursWorkedIdleChartProps> = ({
  vehicles,
  rentals,
  logs = [],
  showSold = false
}) => {
  // Chart Display Options
  const [layoutMode, setLayoutMode] = useState<'stacked' | 'grouped'>('stacked');
  const [basisMode, setBasisMode] = useState<'commercial' | 'fullDay'>('commercial');

  const { daysData: chartData, stats, fleetVehicles } = useMemo(() => {
    return calculate7DayFleetHours(vehicles, rentals, logs, showSold, basisMode);
  }, [vehicles, rentals, logs, showSold, basisMode]);

  // Custom Chart Tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-[#0F172A] text-white p-4 rounded-xl shadow-xl border border-slate-700 text-xs min-w-[220px]">
          <div className="flex items-center justify-between border-b border-slate-700/80 pb-2 mb-2.5">
            <span className="font-bold text-slate-100 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-blue-400" />
              {data.fullDate}
            </span>
            {data.isToday && (
              <span className="bg-blue-500/20 text-blue-300 border border-blue-400/30 text-[10px] px-1.5 py-0.5 rounded font-bold">
                Today
              </span>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-emerald-400">
              <span className="flex items-center gap-1.5 font-medium">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500"></span>
                Worked Hours:
              </span>
              <strong className="font-mono text-sm">{data.workedHours.toLocaleString()} hrs</strong>
            </div>

            <div className="flex items-center justify-between text-amber-400">
              <span className="flex items-center gap-1.5 font-medium">
                <span className="w-2.5 h-2.5 rounded-sm bg-amber-500"></span>
                Idle Hours:
              </span>
              <strong className="font-mono text-sm">{data.idleHours.toLocaleString()} hrs</strong>
            </div>

            <div className="pt-2 border-t border-slate-800 text-[11px] space-y-1 text-slate-300">
              <div className="flex justify-between">
                <span>Working Vehicles:</span>
                <strong className="text-white">{data.vehiclesWorking} of {data.totalFleet}</strong>
              </div>
              <div className="flex justify-between">
                <span>Idle / Unrented:</span>
                <strong className="text-white">{data.vehiclesIdle} vehicles</strong>
              </div>
              {data.vehiclesMaintenance > 0 && (
                <div className="flex justify-between text-orange-300">
                  <span>In Maintenance:</span>
                  <strong>{data.vehiclesMaintenance} vehicles</strong>
                </div>
              )}
              <div className="flex justify-between pt-1 border-t border-slate-800 font-bold text-slate-200">
                <span>Day Utilisation:</span>
                <span className="text-blue-400 font-mono">{data.utilisationRate}%</span>
              </div>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
      {/* Header with Title and Mode Controls */}
      <div className="p-4 sm:p-5 bg-gradient-to-r from-[#F8FAFC] to-[#F1F5F9] border-b border-[#E2E8F0]">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-50 border border-blue-200 text-blue-700 rounded-xl shadow-xs">
                <BarChart3 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                  Fleet Worked vs. Idle Hours (Last 7 Days)
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Visualising daily productive operating hours versus idle vehicle capacity across all {fleetVehicles.length} vehicles.
                </p>
              </div>
            </div>
          </div>

          {/* Interactive Controls */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Basis Mode Toggle */}
            <div className="flex items-center bg-white p-1 rounded-xl border border-slate-300 shadow-xs text-xs">
              <span className="text-[10px] uppercase font-bold text-slate-400 px-2 select-none">Basis:</span>
              <button
                type="button"
                onClick={() => setBasisMode('commercial')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  basisMode === 'commercial'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="8 to 12 hours average driving per day (5 to 6 days per week standard - not 24h continuous)"
              >
                8-12h Shift (10h avg)
              </button>
              <button
                type="button"
                onClick={() => setBasisMode('fullDay')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  basisMode === 'fullDay'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="24 hours full clock day fleet capacity"
              >
                24h Clock
              </button>
            </div>

            {/* Layout Mode (Stacked vs Grouped) */}
            <div className="flex items-center bg-white p-1 rounded-xl border border-slate-300 shadow-xs text-xs">
              <button
                type="button"
                onClick={() => setLayoutMode('stacked')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  layoutMode === 'stacked'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Stacked capacity view"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Stacked</span>
              </button>
              <button
                type="button"
                onClick={() => setLayoutMode('grouped')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  layoutMode === 'grouped'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Side-by-side comparative bars"
              >
                <Columns3 className="w-3.5 h-3.5" />
                <span>Grouped</span>
              </button>
            </div>
          </div>
        </div>

        {/* 7-Day Fast Stats Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-slate-200">
          <div className="bg-white p-2.5 sm:p-3 rounded-xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider">Total Worked</span>
              <Zap className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <p className="text-lg sm:text-xl font-black font-mono text-emerald-700 leading-tight">
              {stats.totalWorked.toLocaleString()} <span className="text-xs font-normal text-slate-500">hrs</span>
            </p>
          </div>

          <div className="bg-white p-2.5 sm:p-3 rounded-xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider">Total Idle</span>
              <Moon className="w-3.5 h-3.5 text-amber-500" />
            </div>
            <p className="text-lg sm:text-xl font-black font-mono text-amber-700 leading-tight">
              {stats.totalIdle.toLocaleString()} <span className="text-xs font-normal text-slate-500">hrs</span>
            </p>
          </div>

          <div className="bg-white p-2.5 sm:p-3 rounded-xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider">7-Day Utilisation</span>
              <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
            </div>
            <p className="text-lg sm:text-xl font-black font-mono text-blue-700 leading-tight">
              {stats.avgUtil.toFixed(1)}%
            </p>
          </div>

          <div className="bg-white p-2.5 sm:p-3 rounded-xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider">Daily Avg Active</span>
              <Clock className="w-3.5 h-3.5 text-purple-600" />
            </div>
            <p className="text-lg sm:text-xl font-black font-mono text-purple-700 leading-tight">
              {stats.avgDailyWorkingVehicles} <span className="text-xs font-normal text-slate-500">/ {fleetVehicles.length}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Main Recharts Bar Chart Container */}
      <div className="p-4 sm:p-6">
        <div className="h-72 sm:h-80 w-full min-h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 15, right: 15, left: -10, bottom: 5 }}
              barGap={layoutMode === 'grouped' ? 6 : 0}
            >
              <defs>
                {/* Worked Hours Gradient (Emerald to Teal) */}
                <linearGradient id="workedGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10B981" stopOpacity={0.95} />
                  <stop offset="100%" stopColor="#059669" stopOpacity={0.85} />
                </linearGradient>

                {/* Idle Hours Gradient (Amber/Orange to Warm Slate) */}
                <linearGradient id="idleGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#F59E0B" stopOpacity={0.85} />
                  <stop offset="100%" stopColor="#D97706" stopOpacity={0.75} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />

              <XAxis
                dataKey="dateLabel"
                axisLine={{ stroke: '#CBD5E1' }}
                tickLine={false}
                tick={{ fill: '#475569', fontSize: 11, fontWeight: 600 }}
                dy={8}
              />

              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#64748B', fontSize: 11 }}
                unit="h"
                width={45}
              />

              <Tooltip content={<CustomTooltip />} cursor={{ fill: '#F8FAFC', opacity: 0.8 }} />

              <Legend
                verticalAlign="top"
                align="right"
                wrapperStyle={{ paddingBottom: 16 }}
                formatter={(value: string) => {
                  return (
                    <span className="text-xs font-bold text-slate-700 capitalize">
                      {value === 'workedHours' ? 'Vehicle Hours Worked' : 'Vehicle Hours Idle'}
                    </span>
                  );
                }}
              />

              {/* Worked Hours Bar */}
              <Bar
                dataKey="workedHours"
                name="workedHours"
                stackId={layoutMode === 'stacked' ? 'fleetHours' : undefined}
                fill="url(#workedGradient)"
                radius={layoutMode === 'stacked' ? [0, 0, 4, 4] : [6, 6, 0, 0]}
                maxBarSize={52}
              />

              {/* Idle Hours Bar */}
              <Bar
                dataKey="idleHours"
                name="idleHours"
                stackId={layoutMode === 'stacked' ? 'fleetHours' : undefined}
                fill="url(#idleGradient)"
                radius={layoutMode === 'stacked' ? [6, 6, 0, 0] : [6, 6, 0, 0]}
                maxBarSize={52}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Footer Explanatory Note */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 gap-2">
          <div className="flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-blue-500 shrink-0" />
            <span>
              {basisMode === 'commercial'
                ? 'Based on commercial driving model: 8 to 12 hours/day, 5 to 6 days/week (~10 hrs/day shift average - not 24h continuous). Fleet capacity: 10 hrs × active vehicles.'
                : 'Based on 24h clock capacity per vehicle. Fleet capacity: 24 hrs × active vehicles.'}
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs font-semibold">
            <span className="flex items-center gap-1.5 text-emerald-700">
              <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500"></span> Worked
            </span>
            <span className="flex items-center gap-1.5 text-amber-700">
              <span className="w-2.5 h-2.5 rounded-xs bg-amber-500"></span> Idle
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FleetHoursWorkedIdleChart;
