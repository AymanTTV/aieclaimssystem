// src/components/pdf/UtilisationBulkDocument.tsx
import React from 'react';
import { Text, View, StyleSheet } from '@react-pdf/renderer';
import BaseDocument from './BaseDocument';
import { format, isValid } from 'date-fns';
import { calculate7DayFleetHours, DayFleetHoursPoint, FleetHoursAggregateStats } from '../utilisation/FleetHoursWorkedIdleChart';

const pdfStyles = StyleSheet.create({
  container: {
    paddingVertical: 4,
  },
  summaryCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 10,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryItem: {
    flex: 1,
    paddingHorizontal: 8,
  },
  summaryDivider: {
    borderRightWidth: 1,
    borderRightColor: '#CBD5E1',
  },
  summaryLabel: {
    fontSize: 7,
    color: '#64748B',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginBottom: 2,
    letterSpacing: 0.5,
  },
  summaryValue: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  badgePill: {
    alignSelf: 'flex-start',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 4,
    marginTop: 2,
  },
  badgeText: {
    fontSize: 6.5,
    color: '#4F46E5',
    fontWeight: 'bold',
  },
  table: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 6,
    overflow: 'hidden',
  },
  tableHeader: {
    backgroundColor: '#1E293B',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 6,
  },
  headerCell: {
    color: '#F8FAFC',
    fontSize: 7,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    paddingHorizontal: 2,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4.5,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
    minHeight: 25,
  },
  tableRowAlternate: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4.5,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#F8FAFC',
    minHeight: 25,
  },
  tableFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5.5,
    paddingHorizontal: 6,
    backgroundColor: '#1E293B',
    borderTopWidth: 1,
    borderTopColor: '#0F172A',
    minHeight: 24,
  },
  cell: {
    fontSize: 7.5,
    color: '#334155',
    paddingHorizontal: 2,
  },
  cellBold: {
    fontSize: 7.5,
    fontWeight: 'bold',
    color: '#0F172A',
    paddingHorizontal: 2,
  },
  subText: {
    fontSize: 6.5,
    color: '#64748B',
    marginTop: 0.5,
  },
  badgeUtil: {
    paddingHorizontal: 4,
    paddingVertical: 1.5,
    borderRadius: 3,
    alignSelf: 'center',
  },
  badgeGreen: {
    backgroundColor: '#DCFCE7',
    color: '#15803D',
  },
  badgeAmber: {
    backgroundColor: '#FEF3C7',
    color: '#B45309',
  },
  badgeRed: {
    backgroundColor: '#FEE2E2',
    color: '#B91C1C',
  },

  // Chart Page Styles
  chartSection: {
    paddingTop: 6,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingBottom: 6,
  },
  chartTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  chartSubtitle: {
    fontSize: 7.5,
    color: '#64748B',
    marginTop: 1,
  },
  chartKpiRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  chartKpiCard: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 5,
    padding: 7,
  },
  chartKpiLabel: {
    fontSize: 6.5,
    fontWeight: 'bold',
    color: '#64748B',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  chartKpiValue: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  chartVisualContainer: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 6,
    padding: 10,
    marginBottom: 12,
  },
  chartBarsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 110,
    paddingTop: 10,
    paddingBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#CBD5E1',
  },
  chartBarColumn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: '100%',
    paddingHorizontal: 4,
  },
  barTrack: {
    width: 24,
    height: 80,
    backgroundColor: '#F1F5F9',
    borderRadius: 3,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  barWorked: {
    width: '100%',
    backgroundColor: '#10B981',
  },
  barIdle: {
    width: '100%',
    backgroundColor: '#F59E0B',
  },
  chartDayLabel: {
    fontSize: 7,
    fontWeight: 'bold',
    color: '#334155',
    marginTop: 4,
    textAlign: 'center',
  },
  chartVehLabel: {
    fontSize: 6,
    color: '#64748B',
    marginTop: 1,
    textAlign: 'center',
  },
  chartLegendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 8,
    paddingTop: 4,
  },
  chartLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendColorBox: {
    width: 8,
    height: 8,
    borderRadius: 2,
  },
  chartTable: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 8,
  },
  chartTableHeader: {
    backgroundColor: '#1E293B',
    flexDirection: 'row',
    paddingVertical: 5,
    paddingHorizontal: 6,
  },
  chartTableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  footnoteBox: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 4,
    padding: 6,
    marginTop: 4,
  },
  footnoteText: {
    fontSize: 6.5,
    color: '#92400E',
    lineHeight: 1.3,
  },
});

interface UtilisationBulkDocumentProps {
  records: any[];
  startDate: string;
  endDate: string;
  companyDetails: any;
  chartData?: DayFleetHoursPoint[];
  chartStats?: FleetHoursAggregateStats;
  vehicles?: any[];
  rentals?: any[];
  logs?: any[];
  showSold?: boolean;
}

const safeFormatDate = (dateStr: any, fmt: string = 'dd/MM/yyyy'): string => {
  if (!dateStr) return 'N/A';
  const d = dateStr instanceof Date ? dateStr : new Date(dateStr);
  return isValid(d) ? format(d, fmt) : 'N/A';
};

const UtilisationBulkDocument: React.FC<UtilisationBulkDocumentProps> = ({
  records,
  startDate,
  endDate,
  companyDetails,
  chartData: propChartData,
  chartStats: propChartStats,
  vehicles = [],
  rentals = [],
  logs = [],
  showSold = false,
}) => {
  const avgUtil = records.length > 0 
    ? records.reduce((acc, r) => acc + (r.utilisationPct || 0), 0) / records.length 
    : 0;

  const totalRented = records.reduce((acc, r) => acc + (r.rentedDays || 0), 0);
  const totalMaint = records.reduce((acc, r) => acc + (r.maintenanceDays || 0), 0);
  const totalAvailable = records.reduce((acc, r) => acc + (r.availableDays || 0), 0);
  const totalEstHrs = records.reduce((acc, r) => acc + (r.estHoursTotal || 0), 0);
  const totalMileage = records.reduce((acc, r) => acc + (r.estMileageTotal || 0), 0);

  // Compute 7-day chart data if not directly provided
  let chartData: DayFleetHoursPoint[] = propChartData || [];
  let chartStats: FleetHoursAggregateStats = propChartStats || {
    totalWorked: 0,
    totalIdle: 0,
    totalCapacity: 0,
    avgUtil: 0,
    avgDailyWorkingVehicles: '0',
    peakDayName: 'N/A',
    peakDayHours: 0,
  };

  if ((!chartData || chartData.length === 0) && vehicles && vehicles.length > 0) {
    const computed = calculate7DayFleetHours(vehicles, rentals, logs, showSold, 'commercial');
    chartData = computed.daysData;
    chartStats = computed.stats;
  }

  // Find max capacity among 7 days to scale bar heights
  const maxDayCapacity = chartData.reduce((max, d) => Math.max(max, d.totalCapacityHours), 1);

  return (
    <BaseDocument 
      title="Fleet Utilisation & Driver Assignment Report" 
      companyDetails={companyDetails}
      orientation="landscape"
    >
      <View style={pdfStyles.container}>
        {/* Top Summary Banner */}
        <View style={pdfStyles.summaryCard}>
          <View style={[pdfStyles.summaryItem, pdfStyles.summaryDivider]}>
            <Text style={pdfStyles.summaryLabel}>Analysis Date Range</Text>
            <Text style={pdfStyles.summaryValue}>
              {safeFormatDate(startDate, 'dd MMM yyyy')} - {safeFormatDate(endDate, 'dd MMM yyyy')}
            </Text>
            <View style={pdfStyles.badgePill}>
              <Text style={pdfStyles.badgeText}>Generated on {format(new Date(), 'dd/MM/yyyy HH:mm')}</Text>
            </View>
          </View>

          <View style={[pdfStyles.summaryItem, pdfStyles.summaryDivider]}>
            <Text style={pdfStyles.summaryLabel}>Fleet Vehicles Tracked</Text>
            <Text style={pdfStyles.summaryValue}>{records.length} Vehicles</Text>
            <Text style={pdfStyles.subText}>{totalRented} active rental days</Text>
          </View>

          <View style={[pdfStyles.summaryItem, pdfStyles.summaryDivider]}>
            <Text style={pdfStyles.summaryLabel}>Average Fleet Utilisation</Text>
            <Text style={[pdfStyles.summaryValue, { color: avgUtil >= 60 ? '#15803D' : avgUtil >= 30 ? '#B45309' : '#B91C1C' }]}>
              {avgUtil.toFixed(1)}%
            </Text>
            <Text style={pdfStyles.subText}>Average rented vs available time</Text>
          </View>

          <View style={pdfStyles.summaryItem}>
            <Text style={pdfStyles.summaryLabel}>Avg Driving Hours Standard</Text>
            <Text style={pdfStyles.summaryValue}>8-12 hrs/day (5-6 days/wk)</Text>
            <Text style={pdfStyles.subText}>Total: {totalEstHrs.toLocaleString()} hrs (not 24h continuous)</Text>
          </View>
        </View>

        {/* Landscape Table - Repeats header on every page */}
        <View style={pdfStyles.table}>
          <View style={pdfStyles.tableHeader} fixed>
            <Text style={[pdfStyles.headerCell, { width: '13%' }]}>Vehicle</Text>
            <Text style={[pdfStyles.headerCell, { width: '17%' }]}>Driver & History</Text>
            <Text style={[pdfStyles.headerCell, { width: '14%' }]}>Assignment Dates</Text>
            <Text style={[pdfStyles.headerCell, { width: '7%', textAlign: 'center' }]}>Active</Text>
            <Text style={[pdfStyles.headerCell, { width: '7%', textAlign: 'center' }]}>Off-Road</Text>
            <Text style={[pdfStyles.headerCell, { width: '7%', textAlign: 'center' }]}>Available</Text>
            <Text style={[pdfStyles.headerCell, { width: '13%', textAlign: 'right' }]}>Avg Driving Hours</Text>
            <Text style={[pdfStyles.headerCell, { width: '11%', textAlign: 'right' }]}>Mileage</Text>
            <Text style={[pdfStyles.headerCell, { width: '11%', textAlign: 'center' }]}>Utilisation</Text>
          </View>

          {records.map((r, i) => {
            const isAlt = i % 2 === 1;
            const pct = r.utilisationPct || 0;
            const badgeClass = pct >= 60 ? pdfStyles.badgeGreen : pct >= 30 ? pdfStyles.badgeAmber : pdfStyles.badgeRed;

            const assignmentDateText = r.assignmentStartDate && r.assignmentEndDate
              ? `${safeFormatDate(r.assignmentStartDate)} - ${safeFormatDate(r.assignmentEndDate)}`
              : (r.previousDriverDates ? r.previousDriverDates : 'Period Scope');

            const hasPrev = r.previousDriver && r.previousDriver !== 'None';

            return (
              <View key={i} style={isAlt ? pdfStyles.tableRowAlternate : pdfStyles.tableRow} wrap={false}>
                {/* Vehicle Reg & Model */}
                <View style={{ width: '13%' }}>
                  <Text style={pdfStyles.cellBold}>{r.registration}</Text>
                  <Text style={pdfStyles.subText}>{r.makeModel || r.model || ''}</Text>
                </View>

                {/* Driver & Previous Driver */}
                <View style={{ width: '17%' }}>
                  <Text style={pdfStyles.cellBold}>{r.driverName || r.recentDriver || 'No Driver'}</Text>
                  {hasPrev ? (
                    <Text style={{ fontSize: 6.5, color: '#64748B', marginTop: 1 }}>
                      Prev: {r.previousDriver}
                    </Text>
                  ) : (
                    <Text style={pdfStyles.subText}>Current Driver</Text>
                  )}
                </View>

                {/* Assignment Dates */}
                <View style={{ width: '14%' }}>
                  <Text style={pdfStyles.cell}>{assignmentDateText}</Text>
                  {r.assignmentDays ? (
                    <Text style={pdfStyles.subText}>{r.assignmentDays}d on vehicle</Text>
                  ) : null}
                </View>

                {/* Active / Rented Days */}
                <View style={{ width: '7%', alignItems: 'center' }}>
                  <Text style={[pdfStyles.cellBold, { color: '#047857' }]}>{r.rentedDays ?? 0}d</Text>
                </View>

                {/* Off-Road */}
                <View style={{ width: '7%', alignItems: 'center' }}>
                  <Text style={[pdfStyles.cell, { color: (r.maintenanceDays ?? 0) > 0 ? '#B91C1C' : '#64748B' }]}>
                    {r.maintenanceDays ?? 0}d
                  </Text>
                </View>

                {/* Available */}
                <View style={{ width: '7%', alignItems: 'center' }}>
                  <Text style={pdfStyles.cell}>{r.availableDays ?? 0}d</Text>
                </View>

                {/* Avg Driving Hours (Clean Total Hours) */}
                <View style={{ width: '13%', alignItems: 'flex-end', paddingRight: 4 }}>
                  <Text style={pdfStyles.cellBold}>{(r.estHoursTotal ?? 0).toLocaleString()} hrs</Text>
                </View>

                {/* Mileage (Clean Total Mileage) */}
                <View style={{ width: '11%', alignItems: 'flex-end', paddingRight: 4 }}>
                  <Text style={pdfStyles.cellBold}>{(r.estMileageTotal ?? 0).toLocaleString()} mi</Text>
                </View>

                {/* Utilisation % */}
                <View style={{ width: '11%', alignItems: 'center' }}>
                  <View style={[pdfStyles.badgeUtil, badgeClass]}>
                    <Text style={{ fontSize: 7.5, fontWeight: 'bold' }}>
                      {pct.toFixed(1)}%
                    </Text>
                  </View>
                </View>
              </View>
            );
          })}

          {/* Table Totals Footer */}
          <View style={pdfStyles.tableFooterRow} wrap={false}>
            <View style={{ width: '44%' }}>
              <Text style={{ color: '#F8FAFC', fontSize: 7.5, fontWeight: 'bold', paddingHorizontal: 2 }}>
                FLEET TOTALS & AVERAGES ({records.length} Vehicles)
              </Text>
              <Text style={{ color: '#94A3B8', fontSize: 6, paddingHorizontal: 2 }}>
                Standard: 8-12h/day, 5-6d/wk commercial driving model (~55h/wk avg)
              </Text>
            </View>

            <View style={{ width: '7%', alignItems: 'center' }}>
              <Text style={{ color: '#34D399', fontSize: 7.5, fontWeight: 'bold' }}>{totalRented}d</Text>
            </View>

            <View style={{ width: '7%', alignItems: 'center' }}>
              <Text style={{ color: '#FCA5A5', fontSize: 7.5, fontWeight: 'bold' }}>{totalMaint}d</Text>
            </View>

            <View style={{ width: '7%', alignItems: 'center' }}>
              <Text style={{ color: '#E2E8F0', fontSize: 7.5, fontWeight: 'bold' }}>{totalAvailable}d</Text>
            </View>

            <View style={{ width: '13%', alignItems: 'flex-end', paddingRight: 4 }}>
              <Text style={{ color: '#F8FAFC', fontSize: 7.5, fontWeight: 'bold' }}>{totalEstHrs.toLocaleString()} hrs</Text>
            </View>

            <View style={{ width: '11%', alignItems: 'flex-end', paddingRight: 4 }}>
              <Text style={{ color: '#93C5FD', fontSize: 7.5, fontWeight: 'bold' }}>{totalMileage.toLocaleString()} mi</Text>
            </View>

            <View style={{ width: '11%', alignItems: 'center' }}>
              <Text style={{ color: '#F8FAFC', fontSize: 8, fontWeight: 'bold' }}>{avgUtil.toFixed(1)}%</Text>
            </View>
          </View>
        </View>

        {/* LAST PAGE: 7-DAY FLEET WORKED VS IDLE HOURS CHART & ANALYSIS */}
        {chartData && chartData.length > 0 && (
          <View break style={pdfStyles.chartSection}>
            <View style={pdfStyles.chartHeader}>
              <View>
                <Text style={pdfStyles.chartTitle}>Fleet Worked vs. Idle Hours Analysis (Last 7 Days)</Text>
                <Text style={pdfStyles.chartSubtitle}>
                  Daily productive driving hours vs. idle vehicle capacity across active fleet vehicles
                </Text>
              </View>
              <View style={pdfStyles.badgePill}>
                <Text style={pdfStyles.badgeText}>7-Day Commercial Shift Standard (10h/day)</Text>
              </View>
            </View>

            {/* KPI Cards Banner */}
            <View style={pdfStyles.chartKpiRow}>
              <View style={[pdfStyles.chartKpiCard, { borderLeftWidth: 3, borderLeftColor: '#10B981' }]}>
                <Text style={pdfStyles.chartKpiLabel}>Productive Worked Hours</Text>
                <Text style={[pdfStyles.chartKpiValue, { color: '#047857' }]}>
                  {chartStats.totalWorked.toLocaleString()} hrs
                </Text>
              </View>

              <View style={[pdfStyles.chartKpiCard, { borderLeftWidth: 3, borderLeftColor: '#F59E0B' }]}>
                <Text style={pdfStyles.chartKpiLabel}>Idle Vehicle Capacity</Text>
                <Text style={[pdfStyles.chartKpiValue, { color: '#B45309' }]}>
                  {chartStats.totalIdle.toLocaleString()} hrs
                </Text>
              </View>

              <View style={[pdfStyles.chartKpiCard, { borderLeftWidth: 3, borderLeftColor: '#3B82F6' }]}>
                <Text style={pdfStyles.chartKpiLabel}>7-Day Fleet Utilisation</Text>
                <Text style={[pdfStyles.chartKpiValue, { color: '#1D4ED8' }]}>
                  {chartStats.avgUtil.toFixed(1)}%
                </Text>
              </View>

              <View style={[pdfStyles.chartKpiCard, { borderLeftWidth: 3, borderLeftColor: '#8B5CF6' }]}>
                <Text style={pdfStyles.chartKpiLabel}>Peak Productive Day</Text>
                <Text style={[pdfStyles.chartKpiValue, { color: '#6D28D9' }]}>
                  {chartStats.peakDayName} ({chartStats.peakDayHours.toLocaleString()} hrs)
                </Text>
              </View>
            </View>

            {/* Visual 7-Day Bar Chart */}
            <View style={pdfStyles.chartVisualContainer}>
              <View style={pdfStyles.chartBarsRow}>
                {chartData.map((d, idx) => {
                  const barTotalHeight = 80;
                  const workedRatio = maxDayCapacity > 0 ? d.workedHours / maxDayCapacity : 0;
                  const idleRatio = maxDayCapacity > 0 ? d.idleHours / maxDayCapacity : 0;
                  const workedHeight = Math.max(workedRatio > 0 ? 3 : 0, Math.round(workedRatio * barTotalHeight));
                  const idleHeight = Math.max(idleRatio > 0 ? 3 : 0, Math.round(idleRatio * barTotalHeight));

                  return (
                    <View key={idx} style={pdfStyles.chartBarColumn}>
                      {/* Worked hours label over bar */}
                      <Text style={{ fontSize: 6.5, fontWeight: 'bold', color: '#065F46', marginBottom: 2 }}>
                        {d.workedHours > 0 ? `${d.workedHours}h` : '0h'}
                      </Text>

                      {/* Stacked Bar */}
                      <View style={pdfStyles.barTrack}>
                        <View style={[pdfStyles.barIdle, { height: idleHeight }]} />
                        <View style={[pdfStyles.barWorked, { height: workedHeight }]} />
                      </View>

                      {/* Date & working info below bar */}
                      <Text style={pdfStyles.chartDayLabel}>{d.dateLabel}</Text>
                      <Text style={pdfStyles.chartVehLabel}>{d.vehiclesWorking} of {d.totalFleet} active</Text>
                      <View style={[pdfStyles.badgeUtil, d.utilisationRate >= 60 ? pdfStyles.badgeGreen : d.utilisationRate >= 30 ? pdfStyles.badgeAmber : pdfStyles.badgeRed, { marginTop: 2 }]}>
                        <Text style={{ fontSize: 6, fontWeight: 'bold' }}>{d.utilisationRate}%</Text>
                      </View>
                    </View>
                  );
                })}
              </View>

              {/* Chart Legend */}
              <View style={pdfStyles.chartLegendRow}>
                <View style={pdfStyles.chartLegendItem}>
                  <View style={[pdfStyles.legendColorBox, { backgroundColor: '#10B981' }]} />
                  <Text style={{ fontSize: 7, color: '#334155', fontWeight: 'bold' }}>Worked Hours (Productive driving)</Text>
                </View>
                <View style={pdfStyles.chartLegendItem}>
                  <View style={[pdfStyles.legendColorBox, { backgroundColor: '#F59E0B' }]} />
                  <Text style={{ fontSize: 7, color: '#334155', fontWeight: 'bold' }}>Idle Capacity (Available fleet)</Text>
                </View>
              </View>
            </View>

            {/* Complete 7-Day Day-by-Day Table */}
            <View style={pdfStyles.chartTable}>
              <View style={pdfStyles.chartTableHeader}>
                <Text style={[pdfStyles.headerCell, { width: '22%' }]}>Date</Text>
                <Text style={[pdfStyles.headerCell, { width: '13%', textAlign: 'center' }]}>Active Vehicles</Text>
                <Text style={[pdfStyles.headerCell, { width: '13%', textAlign: 'center' }]}>Idle Vehicles</Text>
                <Text style={[pdfStyles.headerCell, { width: '13%', textAlign: 'center' }]}>Maintenance</Text>
                <Text style={[pdfStyles.headerCell, { width: '13%', textAlign: 'right' }]}>Worked Hours</Text>
                <Text style={[pdfStyles.headerCell, { width: '13%', textAlign: 'right' }]}>Idle Hours</Text>
                <Text style={[pdfStyles.headerCell, { width: '13%', textAlign: 'center' }]}>Daily Utilisation</Text>
              </View>

              {chartData.map((d, i) => (
                <View key={i} style={[pdfStyles.chartTableRow, i % 2 === 1 ? { backgroundColor: '#F8FAFC' } : { backgroundColor: '#FFFFFF' }]} wrap={false}>
                  <Text style={[pdfStyles.cellBold, { width: '22%' }]}>{d.fullDate}</Text>
                  <Text style={[pdfStyles.cellBold, { width: '13%', textAlign: 'center', color: '#047857' }]}>{d.vehiclesWorking} veh</Text>
                  <Text style={[pdfStyles.cell, { width: '13%', textAlign: 'center' }]}>{d.vehiclesIdle} veh</Text>
                  <Text style={[pdfStyles.cell, { width: '13%', textAlign: 'center', color: d.vehiclesMaintenance > 0 ? '#B91C1C' : '#64748B' }]}>
                    {d.vehiclesMaintenance} veh
                  </Text>
                  <Text style={[pdfStyles.cellBold, { width: '13%', textAlign: 'right', color: '#047857', paddingRight: 4 }]}>
                    {d.workedHours.toLocaleString()} hrs
                  </Text>
                  <Text style={[pdfStyles.cell, { width: '13%', textAlign: 'right', paddingRight: 4 }]}>
                    {d.idleHours.toLocaleString()} hrs
                  </Text>
                  <View style={{ width: '13%', alignItems: 'center' }}>
                    <View style={[pdfStyles.badgeUtil, d.utilisationRate >= 60 ? pdfStyles.badgeGreen : d.utilisationRate >= 30 ? pdfStyles.badgeAmber : pdfStyles.badgeRed]}>
                      <Text style={{ fontSize: 7, fontWeight: 'bold' }}>{d.utilisationRate}%</Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>

            {/* Operating Footnote */}
            <View style={pdfStyles.footnoteBox}>
              <Text style={pdfStyles.footnoteText}>
                <strong>Commercial Driving Standard & Fleet Commitment:</strong> Productive hours are evaluated using standard commercial shift pacing (8–12 hrs/day, 5–6 days/week commercial model — midpoint 10 hrs/day shift). When assigned to a driver, a vehicle is committed and rented, remaining unavailable for hire until formally returned with no active driver assignment.
              </Text>
            </View>
          </View>
        )}
      </View>
    </BaseDocument>
  );
};

export default UtilisationBulkDocument;
