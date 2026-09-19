import React, { useState, useMemo } from 'react';
import { Accident } from '../../types/accident';
import { Customer } from '../../types/customer';
import { PolicyPeriod, DriverRiskProfile, RiskRating } from '../../types/driverRisk';
import { POLICY_PERIODS, CURRENT_POLICY_PERIOD, getRenewalCountdown } from '../../utils/policyPeriods';
import { analyzeDriverRisk, formatGBP, generateRenewalRiskCSV } from '../../utils/driverRiskAnalysis';
import { UnderwriterRenewalReportModal } from './UnderwriterRenewalReportModal';
import { exportFleetClaimExperiencePDF } from '../../utils/exportFleetExperiencePDF';
import {
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Download,
  Printer,
  Search,
  ChevronDown,
  ChevronUp,
  Calendar,
  PoundSterling,
  Car,
  FileSpreadsheet,
  AlertCircle,
  Eye,
  RefreshCw,
  ExternalLink,
  FileText
} from 'lucide-react';
import { saveAs } from 'file-saver';
import { useCompanyDetails } from '../../hooks/useCompanyDetails';

interface DriverRiskDashboardProps {
  accidents: Accident[];
  customers?: Customer[];
  onViewAccident?: (accident: Accident) => void;
}

export const DriverRiskDashboard: React.FC<DriverRiskDashboardProps> = ({
  accidents,
  customers = [],
  onViewAccident,
}) => {
  const { companyDetails } = useCompanyDetails();
  const [selectedPeriod, setSelectedPeriod] = useState<PolicyPeriod>(CURRENT_POLICY_PERIOD);
  const [searchQuery, setSearchQuery] = useState('');
  const [riskFilter, setRiskFilter] = useState<'all' | RiskRating>('all');
  const [faultFilter, setFaultFilter] = useState<'all' | 'has_fault'>('all');
  const [expandedDriver, setExpandedDriver] = useState<string | null>(null);
  const [showUnderwriterModal, setShowUnderwriterModal] = useState(false);
  const [sortBy, setSortBy] = useState<'accidents' | 'incurred' | 'late'>('accidents');

  // Compute full driver risk & fleet statistics
  const summary = useMemo(() => {
    return analyzeDriverRisk(accidents, selectedPeriod, customers);
  }, [accidents, selectedPeriod, customers]);

  const countdown = useMemo(() => getRenewalCountdown(), []);

  // Filter & Sort Driver Profiles
  const filteredProfiles = useMemo(() => {
    let result = [...summary.driverProfiles];

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (d) =>
          d.driverName.toLowerCase().includes(q) ||
          (d.driverNIN && d.driverNIN.toLowerCase().includes(q)) ||
          (d.driverMobile && d.driverMobile.toLowerCase().includes(q)) ||
          d.accidents.some((a) => a.vehicleVRN && a.vehicleVRN.toLowerCase().includes(q))
      );
    }

    // Risk level filter
    if (riskFilter !== 'all') {
      result = result.filter((d) => d.riskRating === riskFilter);
    }

    // Fault filter
    if (faultFilter === 'has_fault') {
      result = result.filter((d) => d.faultCount > 0);
    }

    // Sort
    result.sort((a, b) => {
      if (sortBy === 'accidents') {
        if (b.totalAccidents !== a.totalAccidents) return b.totalAccidents - a.totalAccidents;
        return b.totalIncurred - a.totalIncurred;
      }
      if (sortBy === 'incurred') {
        if (b.totalIncurred !== a.totalIncurred) return b.totalIncurred - a.totalIncurred;
        return b.totalAccidents - a.totalAccidents;
      }
      if (sortBy === 'late') {
        if (b.lateReportingCount !== a.lateReportingCount) return b.lateReportingCount - a.lateReportingCount;
        return b.totalAccidents - a.totalAccidents;
      }
      return 0;
    });

    return result;
  }, [summary.driverProfiles, searchQuery, riskFilter, faultFilter, sortBy]);

  const handleExportCSV = () => {
    const csvContent = generateRenewalRiskCSV(summary, companyDetails?.name || 'Fleet Operations');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const p = summary.policyPeriod;
    saveAs(blob, `Fleet_Driver_Risk_Report_${p.startDate}_to_${p.endDate}.csv`);
  };

  const handleExportPDF = async () => {
    await exportFleetClaimExperiencePDF({
      accidents,
      policyPeriod: selectedPeriod,
      companyDetails,
      customers,
    });
  };

  const toggleDriverExpand = (driverName: string) => {
    setExpandedDriver(expandedDriver === driverName ? null : driverName);
  };

  return (
    <div className="space-y-6">
      {/* ── Top Policy Period Selector & Renewal Header ── */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white rounded-xl shadow-md p-5 sm:p-6 border border-slate-700">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                <ShieldAlert className="w-3.5 h-3.5 mr-1" />
                Underwriting Analysis
              </span>
              <span className="text-xs text-slate-300 font-medium">
                Annual Insurance Renewal Framework
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white mt-1">
              Driver High-Risk &amp; Accident Frequency Dashboard
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-0.5">
              Aggregating accident frequency, fault ratios, and financial losses strictly by annual policy terms to prepare our 18 December insurance renewal.
            </p>
          </div>

          {/* Renewal Deadline Pill & Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <div className="bg-slate-800/90 border border-slate-600/80 rounded-lg px-3.5 py-2 text-left">
              <div className="text-[10px] uppercase font-bold text-slate-400">Renewal Deadline: 18 Dec 2026</div>
              <div className="flex items-center space-x-1.5 text-xs font-extrabold text-amber-300 mt-0.5">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>{countdown.label}</span>
              </div>
            </div>

            <button
              onClick={handleExportCSV}
              className="inline-flex items-center px-3.5 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg text-xs font-semibold text-white shadow-2xs transition"
              title="Export driver breakdown directly to CSV"
            >
              <Download className="w-4 h-4 mr-1.5 text-emerald-400" />
              Export CSV
            </button>

            <button
              onClick={handleExportPDF}
              className="inline-flex items-center px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold shadow-2xs transition"
              title="Export formatted Insurance Fleet Claim Experience PDF Report"
            >
              <FileText className="w-4 h-4 mr-1.5" />
              Export Fleet Claim Experience PDF Report
            </button>

            <button
              onClick={() => setShowUnderwriterModal(true)}
              className="inline-flex items-center px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold shadow-2xs transition"
              title="Open print-ready dossier for insurance underwriters"
            >
              <Printer className="w-4 h-4 mr-1.5" />
              Underwriter Dossier (PDF)
            </button>
          </div>
        </div>

        {/* Policy Period Selector Tab Buttons */}
        <div className="mt-5 pt-4 border-t border-slate-700/80">
          <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
            <span className="text-xs font-semibold text-slate-300 flex items-center">
              <Calendar className="w-3.5 h-3.5 mr-1 text-indigo-400" />
              Select Annual Policy Period:
            </span>
            <span className="text-xs text-slate-400">
              Selected: <strong className="text-white">{selectedPeriod.name}</strong> ({selectedPeriod.startDate} to {selectedPeriod.endDate})
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {POLICY_PERIODS.map((period) => {
              const isSelected = selectedPeriod.id === period.id;
              return (
                <button
                  key={period.id}
                  onClick={() => setSelectedPeriod(period)}
                  className={`px-3 py-2 rounded-lg text-xs font-bold text-left transition relative flex flex-col justify-between ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-md ring-2 ring-blue-400'
                      : 'bg-slate-800/80 text-slate-300 hover:bg-slate-750 hover:text-white border border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="truncate">
                      {period.isCurrent ? 'Current Term' : period.isUpcoming ? 'Next Term' : period.name.split(' ')[0]}
                    </span>
                    {period.isCurrent && (
                      <span className="w-2 h-2 rounded-full bg-emerald-400 ml-1 inline-block animate-pulse" />
                    )}
                  </div>
                  <span className="text-[10px] opacity-80 mt-1 truncate">{period.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Renewal Decision & Fleet KPI Summary Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Fleet Accidents */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500">Fleet Claims in Period</span>
            <span className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <AlertTriangle className="w-5 h-5" />
            </span>
          </div>
          <div className="mt-2">
            <span className="text-2xl sm:text-3xl font-black text-gray-900">{summary.totalFleetAccidents}</span>
            <span className="text-xs text-gray-500 ml-2">total incidents</span>
          </div>
          <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between text-xs">
            <span className="text-rose-700 font-bold">{summary.totalFaultAccidents} Fault</span>
            <span className="text-gray-300">•</span>
            <span className="text-emerald-700 font-bold">{summary.totalNonFaultAccidents} Non-Fault</span>
            <span className="text-gray-300">•</span>
            <span className="text-amber-700 font-bold">{summary.totalSplitAccidents} Split</span>
          </div>
        </div>

        {/* Total Financial Incurred */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500">Total Financial Incurred</span>
            <span className="p-2 rounded-lg bg-rose-50 text-rose-600">
              <PoundSterling className="w-5 h-5" />
            </span>
          </div>
          <div className="mt-2">
            <span className="text-2xl sm:text-3xl font-black text-rose-700">{formatGBP(summary.totalFleetIncurred)}</span>
          </div>
          <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between text-xs text-gray-600">
            <span>At-Fault Cost:</span>
            <span className="font-bold text-gray-900">
              {formatGBP(summary.driverProfiles.reduce((acc, d) => acc + d.faultIncurred, 0))}
            </span>
          </div>
        </div>

        {/* High-Risk Drivers */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500">Driver Risk Distribution</span>
            <span className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
              <ShieldAlert className="w-5 h-5" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl sm:text-3xl font-black text-rose-600">{summary.highRiskDriversCount}</span>
            <span className="text-xs font-bold text-rose-700 uppercase">High Risk</span>
            <span className="text-xs text-gray-400">({summary.totalDriversWithAccidents} active)</span>
          </div>
          <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between text-xs">
            <span className="text-amber-700 font-bold">{summary.mediumRiskDriversCount} Medium</span>
            <span className="text-gray-300">•</span>
            <span className="text-emerald-700 font-bold">{summary.lowRiskDriversCount} Low</span>
          </div>
        </div>

        {/* 24-Hour Late Reporting Metric */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500">24-Hour Late Reports</span>
            <span className="p-2 rounded-lg bg-amber-50 text-amber-600">
              <Clock className="w-5 h-5" />
            </span>
          </div>
          <div className="mt-2">
            <span className="text-2xl sm:text-3xl font-black text-amber-700">{summary.totalLateReports}</span>
            <span className="text-xs text-amber-800 font-semibold ml-2">
              ({summary.lateReportPercentage.toFixed(1)}% of claims)
            </span>
          </div>
          <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between text-xs text-gray-600">
            <span>Late Penalties Billed:</span>
            <span className="font-bold text-rose-700">{formatGBP(summary.totalLatePenalties)}</span>
          </div>
        </div>
      </div>

      {/* ── Priority Summary Card: Top 5 Highest-Risk Drivers ── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-rose-600" />
            <h3 className="text-sm sm:text-base font-bold text-gray-900">
              Top 5 Highest-Risk Drivers (Priority Underwriting Watchlist)
            </h3>
          </div>
          <span className="text-xs text-gray-500">
            Ranked by accident frequency &amp; incurred loss severity
          </span>
        </div>

        {summary.topRiskDrivers.length === 0 ? (
          <div className="text-center py-6 text-sm text-gray-500 bg-gray-50 rounded-lg">
            No accidents recorded for this policy period.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            {summary.topRiskDrivers.map((driver) => (
              <div
                key={driver.driverName}
                className={`p-3.5 rounded-lg border flex flex-col justify-between transition hover:shadow-md cursor-pointer ${
                  driver.riskRating === 'high'
                    ? 'bg-rose-50/50 border-rose-200'
                    : driver.riskRating === 'medium'
                    ? 'bg-amber-50/50 border-amber-200'
                    : 'bg-emerald-50/50 border-emerald-200'
                }`}
                onClick={() => toggleDriverExpand(driver.driverName)}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-gray-900 bg-white px-2 py-0.5 rounded border shadow-2xs">
                      #{driver.rank}
                    </span>
                    <span
                      className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                        driver.riskRating === 'high'
                          ? 'bg-rose-600 text-white'
                          : driver.riskRating === 'medium'
                          ? 'bg-amber-500 text-white'
                          : 'bg-emerald-600 text-white'
                      }`}
                    >
                      {driver.riskRating}
                    </span>
                  </div>

                  <h4 className="font-bold text-sm text-gray-900 mt-2 truncate" title={driver.driverName}>
                    {driver.driverName}
                  </h4>
                  <p className="text-[11px] text-gray-500 truncate">
                    {driver.driverNIN || driver.driverMobile || 'ID Verified'}
                  </p>
                </div>

                <div className="mt-3 pt-2 border-t border-gray-200/60 space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Accidents:</span>
                    <span className="font-extrabold text-gray-900">{driver.totalAccidents}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Fault / NF:</span>
                    <span className="font-semibold text-rose-700">
                      {driver.faultCount}F / {driver.nonFaultCount}NF
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Incurred:</span>
                    <span className="font-bold text-gray-900">{formatGBP(driver.totalIncurred)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Driver Risk Ranking Table (Highest to Lowest) ── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Table Controls & Filters Toolbar */}
        <div className="p-4 border-b border-gray-200 bg-gray-50/70 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 flex-1 max-w-xl">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search driver name, NIN, mobile, VRN..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Risk Filter */}
            <select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value as any)}
              className="text-xs bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Risk Levels</option>
              <option value="high">High Risk Only (Red)</option>
              <option value="medium">Medium Risk Only (Amber)</option>
              <option value="low">Low Risk Only (Green)</option>
            </select>

            {/* Fault Filter */}
            <select
              value={faultFilter}
              onChange={(e) => setFaultFilter(e.target.value as any)}
              className="text-xs bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Claim Types</option>
              <option value="has_fault">Has At-Fault Claims</option>
            </select>
          </div>

          {/* Sort Selector */}
          <div className="flex items-center space-x-2 text-xs">
            <span className="text-gray-500 font-medium">Sort by:</span>
            <button
              onClick={() => setSortBy('accidents')}
              className={`px-2.5 py-1 rounded-md font-semibold transition ${
                sortBy === 'accidents'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-100'
              }`}
            >
              Accidents (High–Low)
            </button>
            <button
              onClick={() => setSortBy('incurred')}
              className={`px-2.5 py-1 rounded-md font-semibold transition ${
                sortBy === 'incurred'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-100'
              }`}
            >
              Incurred (£)
            </button>
            <button
              onClick={() => setSortBy('late')}
              className={`px-2.5 py-1 rounded-md font-semibold transition ${
                sortBy === 'late'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-100'
              }`}
            >
              Late Reports
            </button>
          </div>
        </div>

        {/* The Ranking Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-xs">
            <thead className="bg-gray-100/80 text-gray-700 font-bold uppercase tracking-wider text-[11px]">
              <tr>
                <th scope="col" className="px-3 py-3 text-left w-12">
                  Rank
                </th>
                <th scope="col" className="px-4 py-3 text-left">
                  Driver Information
                </th>
                <th scope="col" className="px-3 py-3 text-center">
                  Accidents Count
                </th>
                <th scope="col" className="px-3 py-3 text-center">
                  Fault Split
                </th>
                <th scope="col" className="px-4 py-3 text-right">
                  Total Financial Incurred (£)
                </th>
                <th scope="col" className="px-3 py-3 text-center">
                  Late Reports (&gt;24h)
                </th>
                <th scope="col" className="px-3 py-3 text-center">
                  Risk Rating Badge
                </th>
                <th scope="col" className="px-3 py-3 text-center w-24">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {filteredProfiles.map((driver) => {
                const isExpanded = expandedDriver === driver.driverName;

                return (
                  <React.Fragment key={driver.driverName}>
                    <tr
                      onClick={() => toggleDriverExpand(driver.driverName)}
                      className={`hover:bg-blue-50/40 cursor-pointer transition ${
                        driver.riskRating === 'high' ? 'bg-rose-50/20' : ''
                      }`}
                    >
                      {/* Rank */}
                      <td className="px-3 py-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-black ${
                            driver.rank <= 3
                              ? 'bg-rose-600 text-white shadow-2xs'
                              : driver.rank <= 5
                              ? 'bg-amber-500 text-white'
                              : 'bg-gray-200 text-gray-800'
                          }`}
                        >
                          {driver.rank}
                        </span>
                      </td>

                      {/* Driver Info */}
                      <td className="px-4 py-3">
                        <div className="flex items-center space-x-2">
                          <div className="font-bold text-sm text-gray-900">{driver.driverName}</div>
                          {driver.customerId && (
                            <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded font-semibold">
                              Customer
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-gray-500 flex flex-wrap items-center gap-x-2 mt-0.5">
                          {driver.driverNIN && <span>NIN: <strong>{driver.driverNIN}</strong></span>}
                          {driver.driverMobile && <span>Mob: {driver.driverMobile}</span>}
                          {driver.driverAddress && <span className="truncate max-w-xs">{driver.driverAddress}</span>}
                        </div>
                      </td>

                      {/* Total Accidents Count */}
                      <td className="px-3 py-3 whitespace-nowrap text-center">
                        <span
                          className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-sm font-black ${
                            driver.totalAccidents >= 3
                              ? 'bg-rose-100 text-rose-900 border border-rose-300'
                              : driver.totalAccidents === 2
                              ? 'bg-amber-100 text-amber-900 border border-amber-300'
                              : 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                          }`}
                        >
                          {driver.totalAccidents}
                        </span>
                      </td>

                      {/* Fault Split */}
                      <td className="px-3 py-3 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center space-x-1.5">
                          <span
                            className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-rose-100 text-rose-800"
                            title="At-Fault Claims"
                          >
                            {driver.faultCount} Fault
                          </span>
                          <span
                            className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800"
                            title="Non-Fault Claims"
                          >
                            {driver.nonFaultCount} NF
                          </span>
                          {driver.splitCount > 0 && (
                            <span
                              className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800"
                              title="Split Fault Claims"
                            >
                              {driver.splitCount} Sp
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Total Financial Incurred */}
                      <td className="px-4 py-3 whitespace-nowrap text-right font-black text-sm text-gray-900">
                        {formatGBP(driver.totalIncurred)}
                        {driver.faultIncurred > 0 && (
                          <span className="block text-[10px] font-medium text-rose-600">
                            Fault Loss: {formatGBP(driver.faultIncurred)}
                          </span>
                        )}
                      </td>

                      {/* Late Reporting Count */}
                      <td className="px-3 py-3 whitespace-nowrap text-center">
                        {driver.lateReportingCount > 0 ? (
                          <div className="inline-flex flex-col items-center">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                              <AlertCircle className="w-3 h-3 mr-1 text-rose-600" />
                              {driver.lateReportingCount} Late (&gt;24h)
                            </span>
                            {driver.totalLatePenalties > 0 && (
                              <span className="text-[10px] text-rose-700 font-semibold mt-0.5">
                                Pen: {formatGBP(driver.totalLatePenalties)}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700">
                            <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" />
                            Prompt (≤24h)
                          </span>
                        )}
                      </td>

                      {/* Risk Rating Badge */}
                      <td className="px-3 py-3 whitespace-nowrap text-center">
                        <div className="inline-flex flex-col items-center">
                          <span
                            className={`inline-flex items-center px-3 py-1 rounded-md text-xs font-black uppercase tracking-wider ${
                              driver.riskRating === 'high'
                                ? 'bg-rose-600 text-white shadow-2xs'
                                : driver.riskRating === 'medium'
                                ? 'bg-amber-500 text-white shadow-2xs'
                                : 'bg-emerald-600 text-white shadow-2xs'
                            }`}
                          >
                            {driver.riskRating === 'high' ? (
                              <ShieldAlert className="w-3.5 h-3.5 mr-1" />
                            ) : driver.riskRating === 'medium' ? (
                              <AlertTriangle className="w-3.5 h-3.5 mr-1" />
                            ) : (
                              <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                            )}
                            {driver.riskRating} Risk
                          </span>
                          <span className="text-[10px] text-gray-500 mt-1 max-w-[150px] truncate text-center" title={driver.riskReasons.join('; ')}>
                            {driver.riskReasons[0]}
                          </span>
                        </div>
                      </td>

                      {/* Expand Button */}
                      <td className="px-3 py-3 whitespace-nowrap text-center" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => toggleDriverExpand(driver.driverName)}
                          className="inline-flex items-center px-2.5 py-1 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md transition"
                        >
                          {isExpanded ? (
                            <>
                              <span>Hide</span>
                              <ChevronUp className="w-3.5 h-3.5 ml-1" />
                            </>
                          ) : (
                            <>
                              <span>Claims ({driver.totalAccidents})</span>
                              <ChevronDown className="w-3.5 h-3.5 ml-1" />
                            </>
                          )}
                        </button>
                      </td>
                    </tr>

                    {/* Expandable Claims Drill-down Row */}
                    {isExpanded && (
                      <tr className="bg-slate-50/90">
                        <td colSpan={8} className="px-4 py-4 border-y border-blue-200">
                          <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-2xs">
                            <div className="flex items-center justify-between mb-3">
                              <h5 className="font-bold text-xs uppercase tracking-wider text-gray-700 flex items-center">
                                <Car className="w-4 h-4 mr-1.5 text-blue-600" />
                                Claims History for {driver.driverName} ({driver.accidents.length} Records in Policy Period)
                              </h5>
                              <span className="text-[11px] text-gray-500">
                                Policy Term: {selectedPeriod.startDate} to {selectedPeriod.endDate}
                              </span>
                            </div>

                            <div className="overflow-x-auto">
                              <table className="min-w-full divide-y divide-gray-200 text-xs">
                                <thead className="bg-gray-100 text-gray-600 font-semibold">
                                  <tr>
                                    <th className="px-3 py-2 text-left">Date / Time</th>
                                    <th className="px-3 py-2 text-left">Ref / Claim</th>
                                    <th className="px-3 py-2 text-left">Vehicle VRN</th>
                                    <th className="px-3 py-2 text-center">Fault</th>
                                    <th className="px-3 py-2 text-center">Status</th>
                                    <th className="px-3 py-2 text-right">Incurred (£)</th>
                                    <th className="px-3 py-2 text-center">Reporting Window</th>
                                    <th className="px-3 py-2 text-right">Action</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 bg-white">
                                  {driver.accidents.map((claim) => {
                                    const rawAccident = driver.rawAccidents.find((r) => r.id === claim.id);

                                    return (
                                      <tr key={claim.id} className="hover:bg-gray-50">
                                        <td className="px-3 py-2 font-medium text-gray-900 whitespace-nowrap">
                                          {claim.accidentDate} {claim.accidentTime ? `at ${claim.accidentTime}` : ''}
                                        </td>
                                        <td className="px-3 py-2 whitespace-nowrap">
                                          <span className="font-semibold text-gray-800">
                                            {claim.refNo ? `#${claim.refNo}` : '—'}
                                          </span>
                                          {claim.referenceName && (
                                            <span className="text-gray-500 ml-1">({claim.referenceName})</span>
                                          )}
                                        </td>
                                        <td className="px-3 py-2 whitespace-nowrap font-mono font-bold text-gray-800">
                                          {claim.vehicleVRN || '—'}
                                        </td>
                                        <td className="px-3 py-2 text-center whitespace-nowrap">
                                          <span
                                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                                              claim.fault === 'Fault'
                                                ? 'bg-rose-100 text-rose-800'
                                                : claim.fault === 'Non-Fault'
                                                ? 'bg-emerald-100 text-emerald-800'
                                                : 'bg-amber-100 text-amber-800'
                                            }`}
                                          >
                                            {claim.fault}
                                          </span>
                                        </td>
                                        <td className="px-3 py-2 text-center whitespace-nowrap capitalize text-gray-700">
                                          {claim.status}
                                        </td>
                                        <td className="px-3 py-2 text-right whitespace-nowrap font-bold text-gray-900">
                                          {formatGBP(claim.incurred)}
                                        </td>
                                        <td className="px-3 py-2 text-center whitespace-nowrap">
                                          {claim.isLateReport ? (
                                            <span className="inline-flex items-center text-rose-700 font-bold text-[10px] bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                                              &gt; 24h Late {claim.timeToReportDisplay ? `(${claim.timeToReportDisplay})` : ''}
                                            </span>
                                          ) : (
                                            <span className="text-emerald-700 font-medium text-[10px] bg-emerald-50 px-2 py-0.5 rounded">
                                              ≤ 24h Prompt {claim.timeToReportDisplay ? `(${claim.timeToReportDisplay})` : ''}
                                            </span>
                                          )}
                                        </td>
                                        <td className="px-3 py-2 text-right whitespace-nowrap">
                                          {rawAccident && onViewAccident && (
                                            <button
                                              onClick={() => onViewAccident(rawAccident)}
                                              className="inline-flex items-center text-blue-600 hover:text-blue-800 text-xs font-semibold"
                                            >
                                              <Eye className="w-3.5 h-3.5 mr-1" />
                                              View
                                            </button>
                                          )}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}

              {filteredProfiles.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <ShieldAlert className="w-8 h-8 text-gray-300" />
                      <p className="text-sm font-semibold text-gray-700">No driver records found</p>
                      <p className="text-xs text-gray-500">
                        Try selecting another policy period or adjusting your search filters.
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Underwriter Dossier Modal ── */}
      {showUnderwriterModal && (
        <UnderwriterRenewalReportModal
          summary={summary}
          onClose={() => setShowUnderwriterModal(false)}
        />
      )}
    </div>
  );
};
