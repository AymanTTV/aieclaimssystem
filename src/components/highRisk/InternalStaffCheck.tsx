// src/components/highRisk/InternalStaffCheck.tsx
import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  XCircle,
  KeyRound,
  RotateCcw,
  CheckCircle2,
  Trash2,
  Lock,
  Sparkles,
  FileCheck,
  Calendar,
  AlertOctagon,
  History,
  X,
  UserPlus,
  Edit3,
  Building2,
  EyeOff,
  Hash,
} from 'lucide-react';
import {
  HighRiskDriver,
  NewDriverInput,
  EditDriverInput,
  OverridePayload,
  UserRole,
  RiskLevel,
} from '../../types/highRiskDriver';
import { queryHighRiskDriver } from '../../services/highRiskService';
import {
  getStoredSearchHistory,
  recordSearchQuery,
  clearStoredSearchHistory,
  removeSingleSearchHistory,
} from '../../services/searchHistoryService';
import { ManagerOverrideModal } from './ManagerOverrideModal';
import { FlagNewDriverModal } from './FlagNewDriverModal';
import { EditDriverModal } from './EditDriverModal';
import { DeleteConfirmationModal } from './DeleteConfirmationModal';
import { useCustomers } from '../../hooks/useCustomers';

interface InternalStaffCheckProps {
  drivers: HighRiskDriver[];
  onAddDriver: (input: NewDriverInput) => void;
  onEditDriver: (driverId: string, input: EditDriverInput) => void;
  onUpdateStatus: (driverId: string, status: RiskLevel) => void;
  onOverrideDriver: (driverId: string, payload: OverridePayload) => void;
  onDeleteDriver: (driverId: string) => void;
  onResetDrivers: () => void;
  userRole: UserRole;
}

export const InternalStaffCheck: React.FC<InternalStaffCheckProps> = ({
  drivers,
  onAddDriver,
  onEditDriver,
  onUpdateStatus,
  onOverrideDriver,
  onDeleteDriver,
  onResetDrivers,
  userRole,
}) => {
  const [searchName, setSearchName] = useState('');
  const [selectedDriverForOverride, setSelectedDriverForOverride] = useState<HighRiskDriver | null>(null);
  const [selectedDriverForEdit, setSelectedDriverForEdit] = useState<HighRiskDriver | null>(null);
  const [driverToDelete, setDriverToDelete] = useState<HighRiskDriver | null>(null);
  const [cancelledBookingDriver, setCancelledBookingDriver] = useState<string | null>(null);
  const [showRegistry, setShowRegistry] = useState(true);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [showFlagModal, setShowFlagModal] = useState(false);
  const [flagModalPrefill, setFlagModalPrefill] = useState<{ fullName?: string; badgeNumber?: string } | undefined>(undefined);

  // Hook into registered system fleet customers
  const { customers: systemCustomers } = useCustomers();

  // Table-specific Search & Filter Controls
  const [tableSearch, setTableSearch] = useState('');
  const [tableRiskFilter, setTableRiskFilter] = useState<'All' | RiskLevel>('All');
  const [tableCategoryFilter, setTableCategoryFilter] = useState<'All' | string>('All');

  const isManager = userRole === 'manager';

  // Load search history from local storage on mount
  useEffect(() => {
    setSearchHistory(getStoredSearchHistory());
  }, []);

  // Filtered driver list for registry table
  const filteredDrivers = useMemo(() => {
    return drivers.filter((driver) => {
      const q = tableSearch.trim().toLowerCase();
      const matchesQuery =
        !q ||
        driver.fullName.toLowerCase().includes(q) ||
        (driver.badgeNumber && driver.badgeNumber.toLowerCase().includes(q)) ||
        (driver.reportingFleet && driver.reportingFleet.toLowerCase().includes(q)) ||
        driver.category.toLowerCase().includes(q);

      const matchesRisk = tableRiskFilter === 'All' || driver.riskLevel === tableRiskFilter;
      const matchesCategory = tableCategoryFilter === 'All' || driver.category === tableCategoryFilter;

      return matchesQuery && matchesRisk && matchesCategory;
    });
  }, [drivers, tableSearch, tableRiskFilter, tableCategoryFilter]);

  // Live real-time check against current in-memory / local storage driver list
  const searchResult = useMemo(() => {
    return queryHighRiskDriver(searchName, drivers);
  }, [searchName, drivers]);

  // Cross-reference with system-registered customers/drivers
  const matchedSystemCustomer = useMemo(() => {
    const trimmed = searchName.trim().toLowerCase();
    if (trimmed.length < 2) return null;
    return (
      systemCustomers.find((c) => {
        const fullName = (c.name || `${c.firstName || ''} ${c.lastName || ''}`).trim().toLowerCase();
        const license = (c.driverLicenseNumber || '').trim().toLowerCase();
        const mobile = (c.mobile || '').replace(/\s+/g, '');
        const cleanQuery = trimmed.replace(/\s+/g, '');
        return (
          fullName === trimmed ||
          (fullName.length >= 3 && fullName.includes(trimmed)) ||
          (trimmed.length >= 3 && trimmed.includes(fullName)) ||
          (license && license === trimmed) ||
          (cleanQuery.length >= 4 && mobile.includes(cleanQuery))
        );
      }) || null
    );
  }, [searchName, systemCustomers]);

  // Debounce auto-recording searched names into local storage history when length >= 3
  useEffect(() => {
    const trimmed = searchName.trim();
    if (trimmed.length >= 3) {
      const timer = setTimeout(() => {
        const updated = recordSearchQuery(trimmed);
        setSearchHistory(updated);
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [searchName]);

  const handleCancelRental = (driverName: string) => {
    setCancelledBookingDriver(driverName);
  };

  const handleResetSearch = () => {
    setSearchName('');
    setCancelledBookingDriver(null);
  };

  const handleQuickFill = (name: string) => {
    setSearchName(name);
    setCancelledBookingDriver(null);
    const updated = recordSearchQuery(name);
    setSearchHistory(updated);
  };

  const handleSelectHistoryItem = (name: string) => {
    setSearchName(name);
    setCancelledBookingDriver(null);
    const updated = recordSearchQuery(name);
    setSearchHistory(updated);
  };

  const handleRemoveHistoryItem = (e: React.MouseEvent, name: string) => {
    e.stopPropagation();
    const updated = removeSingleSearchHistory(name);
    setSearchHistory(updated);
  };

  const handleClearAllHistory = () => {
    const updated = clearStoredSearchHistory();
    setSearchHistory(updated);
  };

  const handleFlagModalSubmit = (input: NewDriverInput) => {
    onAddDriver(input);
    handleQuickFill(input.fullName);
    setShowFlagModal(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const trimmed = searchName.trim();
      if (trimmed.length >= 2) {
        const updated = recordSearchQuery(trimmed);
        setSearchHistory(updated);
      }
    }
  };

  return (
    <div className="space-y-6 text-slate-100">
      {/* Role Access Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 py-3 rounded-xl bg-[#111a33] border border-slate-800 text-xs shadow-md gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={`px-2.5 py-1 rounded-md font-bold uppercase tracking-wider text-[11px] ${
              isManager
                ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/80'
                : 'bg-blue-950/80 text-blue-300 border border-blue-800/80'
            }`}
          >
            {isManager ? 'Manager (Admin Mode)' : 'Standard Staff (View Only)'}
          </span>
          <span className="text-slate-300 font-medium">
            {isManager
              ? 'Full authorization: Add, Edit, Delete, Status override, and View reporting fleet names.'
              : 'View-only mode: Search queries enabled. Add/Edit/Delete actions locked; reporting fleet names confidential.'}
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-emerald-400 font-semibold text-[11px] whitespace-nowrap">
          <Lock className="w-3.5 h-3.5 text-emerald-400" />
          <span>Strict Zero-PII Compliance Enforced</span>
        </div>
      </div>

      {/* Overview & Quick Testing Panel */}
      <div className="bg-[#111a33] border border-slate-800 rounded-2xl p-6 shadow-lg">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-ping" />
              <h2 className="text-xl font-black text-white tracking-tight">
                Internal High Risk Check (Staff Desk View)
              </h2>
            </div>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl font-medium">
              Type the customer&apos;s <strong className="text-white">Full Name</strong> below to query adverse fleet records.
              Zero PII stored: driving licenses, dates of birth, phone numbers, and addresses are strictly prohibited.
            </p>
          </div>

          {/* Quick test buttons */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-slate-200 text-xs font-bold mr-1 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Pre-loaded Test Drivers:
            </span>
            <button
              type="button"
              onClick={() => handleQuickFill('John Smith')}
              className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-black border-2 border-slate-300 transition font-extrabold shadow-sm flex items-center gap-1.5 cursor-pointer"
              title="Search test driver: John Smith (Apex Rentals)"
            >
              <span className="text-black font-black">John Smith</span>
              <span className="text-[10px] text-red-700 bg-red-100 border border-red-300 px-1.5 py-0.5 rounded font-black">(Apex Rentals)</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickFill('Robert Johnson')}
              className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-black border-2 border-slate-300 transition font-extrabold shadow-sm flex items-center gap-1.5 cursor-pointer"
              title="Search test driver: Robert Johnson (Metro Hire)"
            >
              <span className="text-black font-black">Robert Johnson</span>
              <span className="text-[10px] text-amber-800 bg-amber-100 border border-amber-300 px-1.5 py-0.5 rounded font-black">(Metro Hire)</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickFill('Michael Brown')}
              className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-black border-2 border-slate-300 transition font-extrabold shadow-sm flex items-center gap-1.5 cursor-pointer"
              title="Search test driver: Michael Brown (City Fleet)"
            >
              <span className="text-black font-black">Michael Brown</span>
              <span className="text-[10px] text-red-700 bg-red-100 border border-red-300 px-1.5 py-0.5 rounded font-black">(City Fleet)</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickFill('Sarah Connor')}
              className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-black border-2 border-slate-300 transition font-extrabold shadow-sm flex items-center gap-1.5 cursor-pointer"
              title="Search test driver: Sarah Connor (Clear)"
            >
              <span className="text-black font-black">Sarah Connor</span>
              <span className="text-[10px] text-emerald-800 bg-emerald-100 border border-emerald-300 px-1.5 py-0.5 rounded font-black">(Clear)</span>
            </button>
          </div>
        </div>

        {/* Search Input Bar + Flag New Driver Button */}
        <div className="mt-5">
          <label
            style={{ color: '#ffffff' }}
            className="block text-sm font-black uppercase tracking-wide text-white mb-2 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5"
          >
            <span className="flex items-center gap-2">
              <span className="text-white text-base font-black">Driver Full Name or Badge Number</span>
              <span className="text-[11px] px-2 py-0.5 rounded bg-red-600/40 text-red-100 border border-red-500/50 font-bold lowercase">search input</span>
            </span>
            <span className="text-xs text-emerald-300 font-bold bg-emerald-950/80 border border-emerald-700/80 px-2.5 py-0.5 rounded self-start sm:self-auto">
              Live instant query by driver name or badge #
            </span>
          </label>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <div className="relative flex-1 min-w-0">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-700" />
              </div>
              <input
                type="text"
                value={searchName}
                onChange={(e) => {
                  setSearchName(e.target.value);
                  setCancelledBookingDriver(null);
                }}
                onKeyDown={handleKeyDown}
                data-light-input="true"
                placeholder="Type driver's full name or badge # (e.g. John Smith, BDG-8821)..."
                className="w-full pl-11 pr-24 py-3.5 bg-white border-2 border-slate-300 rounded-xl text-black font-black placeholder:text-gray-500 placeholder:font-bold text-base focus:outline-none focus:ring-4 focus:ring-red-500/25 focus:border-red-500 shadow-md search-input-white high-risk-input"
                style={{ backgroundColor: '#ffffff', color: '#000000', WebkitTextFillColor: '#000000' }}
                autoFocus
              />
              {searchName && (
                <button
                  type="button"
                  onClick={handleResetSearch}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-xs text-gray-700 hover:text-black transition cursor-pointer"
                >
                  <span className="px-2.5 py-1 rounded-md bg-slate-200 hover:bg-slate-300 border border-slate-400 font-black text-black shadow-xs flex items-center gap-1">
                    <X className="w-3.5 h-3.5 text-black stroke-[3]" />
                    <span>Clear</span>
                  </span>
                </button>
              )}
            </div>

            {/* + Add High Risk Driver Button */}
            {isManager ? (
              <button
                type="button"
                onClick={() => setShowFlagModal(true)}
                className="flex-shrink-0 px-5 py-3.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-sm shadow-lg shadow-red-950/50 border border-red-500 transition flex items-center justify-center gap-2 group whitespace-nowrap cursor-pointer"
                title="Add a new driver to the High Risk database (Authorized Manager Only)"
              >
                <UserPlus className="w-4 h-4 group-hover:scale-110 transition-transform text-white" />
                <span>+ Add High Risk Driver</span>
              </button>
            ) : (
              <div className="relative group">
                <button
                  type="button"
                  disabled
                  className="flex-shrink-0 px-5 py-3.5 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-500 font-bold text-sm cursor-not-allowed flex items-center justify-center gap-2 whitespace-nowrap"
                  title="Authorized Manager Access Required"
                >
                  <UserPlus className="w-4 h-4 text-slate-500" />
                  <span>+ Add High Risk Driver</span>
                  <Lock className="w-3.5 h-3.5 text-amber-500" />
                </button>
                <div className="absolute right-0 top-full mt-1.5 hidden group-hover:block z-30 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 text-xs shadow-xl whitespace-nowrap">
                  Authorized Manager Access Required to add drivers
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 px-1 font-medium">
            <span>Query updates live with each keystroke against local fleet records. Press Enter to pin to history.</span>
            <span className="text-slate-500">Case-insensitive matching active</span>
          </div>

          {/* Search History (Last 5 Driver Names) Feature */}
          <div className="mt-4 pt-3.5 border-t border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
                <History className="w-3.5 h-3.5 text-red-400" />
                <span>Search History (Last 5):</span>
                <span className="text-[11px] text-slate-400 font-normal">
                  Click any name to quickly re-run query
                </span>
              </div>

              {searchHistory.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearAllHistory}
                  className="text-[11px] text-slate-400 hover:text-red-400 transition font-bold flex items-center gap-1 self-start sm:self-auto cursor-pointer"
                  title="Clear local search history"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Clear History</span>
                </button>
              )}
            </div>

            {searchHistory.length > 0 ? (
              <div className="flex flex-wrap items-center gap-2">
                {searchHistory.map((historyName) => {
                  const matchCheck = queryHighRiskDriver(historyName, drivers);
                  const isSelected = searchName.trim().toLowerCase() === historyName.toLowerCase();

                  return (
                    <div
                      key={historyName}
                      onClick={() => handleSelectHistoryItem(historyName)}
                      className={`group cursor-pointer inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border-2 text-xs font-bold transition shadow-xs ${
                        isSelected
                          ? 'bg-white border-red-600 text-black ring-2 ring-red-500/50'
                          : 'bg-white hover:bg-slate-100 border-slate-300 text-black'
                      }`}
                      title={`Click to re-run search for "${historyName}"`}
                    >
                      {/* Status indicator dot */}
                      <span
                        className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                          matchCheck.isMatch
                            ? matchCheck.match?.riskLevel === 'High Risk'
                              ? 'bg-red-600 animate-pulse'
                              : matchCheck.match?.riskLevel === 'Caution'
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'
                            : 'bg-emerald-500'
                        }`}
                        title={
                          matchCheck.isMatch
                            ? `Status: ${matchCheck.match?.riskLevel}`
                            : 'Status: Clear'
                        }
                      />

                      <span className="text-black font-black">{historyName}</span>

                      {matchCheck.isMatch ? (
                        <span className="text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-red-100 text-red-800 border border-red-300">
                          {matchCheck.match?.riskLevel === 'High Risk'
                            ? 'Risk'
                            : matchCheck.match?.riskLevel === 'Caution'
                            ? 'Caution'
                            : 'Clear'}
                        </span>
                      ) : (
                        <span className="text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                          Clear
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={(e) => handleRemoveHistoryItem(e, historyName)}
                        className="text-gray-400 hover:text-red-600 p-0.5 rounded transition cursor-pointer"
                        title={`Remove "${historyName}" from history`}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-[11px] text-slate-400 italic py-1 font-medium">
                No recent searches recorded yet. Searched driver names will appear here for 1-click re-runs.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Real-Time Status Result Display */}
      {searchName.trim().length > 0 ? (
        <div className="transition-all duration-300">
          {searchResult.isMatch && searchResult.match ? (
            /* ============================================================== */
            /* IF MATCHED: SLEEK DARK RED ALERT CARD (HIGH-CONTRAST TEXT)      */
            /* ============================================================== */
            <div className="bg-red-950/40 border-2 border-red-600 rounded-2xl p-6 shadow-xl text-slate-100 animate-in zoom-in-95 duration-200">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 pb-5 border-b border-red-900/60">
                <div className="flex items-start gap-3.5">
                  <div className="p-3 rounded-xl bg-red-600 text-white shadow-lg shadow-red-950 ring-4 ring-red-900/40 flex-shrink-0 animate-bounce">
                    <AlertOctagon className="w-8 h-8" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-3 py-1 text-xs font-black uppercase tracking-wider rounded-md bg-red-600 text-white shadow-xs">
                        STATUS: HIGH RISK DRIVER FOUND
                      </span>
                      {searchResult.match.badgeNumber && (
                        <span className="px-2.5 py-1 text-xs font-mono font-bold rounded-md bg-slate-900 text-slate-100 border border-slate-700 shadow-xs flex items-center gap-1">
                          <Hash className="w-3.5 h-3.5 text-red-400" />
                          <span>Badge #{searchResult.match.badgeNumber}</span>
                        </span>
                      )}
                      {searchResult.match.isOverridden && (
                        <span className="px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider rounded-md bg-amber-500 text-slate-950 shadow-xs flex items-center gap-1 font-black">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Manager Overridden
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                      <h3 className="text-3xl font-black text-white tracking-tight">
                        {searchResult.match.fullName}
                      </h3>
                      {searchResult.match.badgeNumber && (
                        <span className="px-2.5 py-1 rounded-lg bg-red-950/80 border border-red-700/80 font-mono text-sm font-black text-red-300">
                          {searchResult.match.badgeNumber}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-red-300 font-semibold mt-0.5">
                      Matched in fleet safety database • Incident recorded: {searchResult.match.reportedYear}
                    </p>
                  </div>
                </div>

                {/* High Contrast Risk Badge */}
                <div className="flex flex-col items-end gap-1.5">
                  <div
                    className={`px-4 py-2 rounded-xl text-sm font-black uppercase tracking-wide border shadow-md ${
                      searchResult.match.riskLevel === 'High Risk'
                        ? 'bg-red-600 text-white border-red-500 shadow-red-950'
                        : searchResult.match.riskLevel === 'Caution'
                        ? 'bg-amber-400 text-slate-950 border-amber-300 font-black'
                        : 'bg-emerald-600 text-white border-emerald-500 font-black'
                    }`}
                  >
                    Risk Level: {searchResult.match.riskLevel === 'High Risk' ? 'HIGH RISK - DO NOT RENT' : searchResult.match.riskLevel}
                  </div>
                  <span className="text-xs text-red-300 font-bold">
                    Category: <strong className="text-white underline">{searchResult.match.category}</strong>
                  </span>
                </div>
              </div>

              {/* Alert Details Body: Badge, Category, Year, Fleet Action & Reporting Fleet */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 py-5 text-xs">
                <div className="p-3.5 rounded-xl bg-[#0c1427] border border-red-900/60 space-y-1 shadow-sm">
                  <span className="text-red-400 font-bold uppercase tracking-wider text-[10px]">
                    Driver Badge Number
                  </span>
                  <div className="text-base font-black text-white font-mono flex items-center gap-1.5">
                    <Hash className="w-4 h-4 text-red-400 flex-shrink-0" />
                    <span>{searchResult.match.badgeNumber || 'Unassigned'}</span>
                  </div>
                  <p className="text-slate-300 text-xs font-medium">
                    Fleet ID Reference
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-[#0c1427] border border-red-900/60 space-y-1 shadow-sm">
                  <span className="text-red-400 font-bold uppercase tracking-wider text-[10px]">
                    Adverse Category
                  </span>
                  <div className="text-base font-black text-white flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 text-red-400 flex-shrink-0" />
                    <span>{searchResult.match.category}</span>
                  </div>
                  <p className="text-slate-300 text-xs font-medium truncate" title={searchResult.match.categoryDetails}>
                    {searchResult.match.categoryDetails || 'Adverse incident filed.'}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-[#0c1427] border border-red-900/60 space-y-1 shadow-sm">
                  <span className="text-red-400 font-bold uppercase tracking-wider text-[10px]">
                    Incident Timestamp &amp; Year
                  </span>
                  <div className="text-base font-black text-white flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-red-400 flex-shrink-0" />
                    <span>Reported {searchResult.match.reportedYear}</span>
                  </div>
                  <p className="text-slate-300 text-xs font-medium">
                    Created: {new Date(searchResult.match.createdAt).toLocaleDateString()}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-[#0c1427] border border-red-900/60 space-y-1 shadow-sm">
                  <span className="text-red-400 font-bold uppercase tracking-wider text-[10px]">
                    Fleet Policy Action
                  </span>
                  <div className="text-base font-black text-red-400 flex items-center gap-1.5">
                    <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                    <span>Default: Deny Handover</span>
                  </div>
                  <p className="text-slate-300 text-xs font-medium">
                    Manager override required.
                  </p>
                </div>

                {/* Reporting Fleet Company: Role-Based Display */}
                <div className="p-3.5 rounded-xl bg-[#0c1427] border border-red-900/60 space-y-1 shadow-sm">
                  <span className="text-red-400 font-bold uppercase tracking-wider text-[10px]">
                    Reporting Fleet Company
                  </span>
                  {isManager ? (
                    <div className="text-base font-black text-white flex items-center gap-1.5">
                      <Building2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      <span className="truncate">{searchResult.match.reportingFleet || 'Apex Rentals'}</span>
                    </div>
                  ) : (
                    <div className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                      <EyeOff className="w-4 h-4 text-amber-400 flex-shrink-0" />
                      <span>Partner Fleet (Private)</span>
                    </div>
                  )}
                  <p className="text-slate-400 text-[11px] font-medium">
                    {isManager ? 'Manager audit trail.' : 'Partner protection.'}
                  </p>
                </div>
              </div>

              {/* Overridden state note if applicable */}
              {searchResult.match.isOverridden && (
                <div className="mb-4 p-4 rounded-xl bg-amber-950/60 border border-amber-700/80 text-xs text-amber-200 space-y-1">
                  <div className="flex items-center gap-2 font-black text-amber-300">
                    <CheckCircle2 className="w-4 h-4 text-amber-400" />
                    <span>Manager Clearance Granted by: {searchResult.match.overriddenBy}</span>
                  </div>
                  <p className="text-amber-200 text-xs font-medium">
                    Reason: &ldquo;{searchResult.match.overrideReason}&rdquo; (Timestamp:{' '}
                    {searchResult.match.overrideTimestamp ? new Date(searchResult.match.overrideTimestamp).toLocaleString() : 'Logged'}
                    )
                  </p>
                </div>
              )}

              {/* Cross-system registered customer matched note */}
              {matchedSystemCustomer && (
                <div className="mb-4 p-3.5 rounded-xl bg-[#0c1427] border border-red-800 text-xs text-red-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-sm">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2 py-0.5 rounded bg-red-600 text-white font-black text-[10px] uppercase tracking-wider">
                      Fleet System Member Matched
                    </span>
                    <span className="font-semibold text-slate-200">
                      Registered customer: <strong className="text-white">{matchedSystemCustomer.name}</strong> • Phone: {matchedSystemCustomer.mobile || 'N/A'} • Account #{matchedSystemCustomer.accountNumber || matchedSystemCustomer.id.slice(0, 6)}
                    </span>
                  </div>
                  <span className="text-[11px] text-red-400 font-bold whitespace-nowrap">
                    Active High Risk Alert on Account
                  </span>
                </div>
              )}

              {/* Cancelled Booking Banner feedback */}
              {cancelledBookingDriver === searchResult.match.fullName && (
                <div className="mb-4 p-4 rounded-xl bg-[#0c1427] border-2 border-red-500 text-xs text-red-200 flex items-start gap-3 shadow-lg">
                  <XCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-black text-red-300 text-sm">
                      Rental Cancelled &amp; Booking Aborted
                    </h4>
                    <p className="mt-0.5 text-slate-300 font-medium">
                      Customer checkout for <strong className="text-white">{searchResult.match.fullName}</strong> has been cancelled.
                      Vehicle returned to unreserved pool. No keys or dispatch release authorized.
                    </p>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-red-900/60">
                <div className="text-xs text-red-300 font-bold">
                  <span>Adverse status actively enforced across all checkout terminals.</span>
                </div>

                <div className="flex items-center gap-2.5 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => handleCancelRental(searchResult.match!.fullName)}
                    className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-red-300 hover:text-red-200 border border-slate-700 font-bold text-xs shadow-sm transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <XCircle className="w-4 h-4 text-red-400" />
                    <span>Cancel Rental</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedDriverForOverride(searchResult.match!)}
                    className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-xs shadow-lg shadow-red-950 transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <KeyRound className="w-4 h-4 text-white" />
                    <span>Override Flag (Manager Required)</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* ============================================================== */
            /* IF CLEAR: SLEEK DARK GREEN BANNER (HIGH-CONTRAST TEXT)         */
            /* ============================================================== */
            <div className="bg-emerald-950/30 border-2 border-emerald-600/80 rounded-2xl p-6 shadow-xl text-slate-100 animate-in zoom-in-95 duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-2xl bg-emerald-600 text-white shadow-lg ring-4 ring-emerald-900/40 flex-shrink-0">
                    <ShieldCheck className="w-8 h-8 text-white stroke-[2.5]" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap mb-1.5">
                      <span className="px-2.5 py-1 text-xs font-black uppercase tracking-wider rounded-md bg-emerald-500 text-slate-950 shadow-xs">
                        STATUS: CLEARED
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-emerald-300 font-bold uppercase tracking-wider">
                          Driver Checked:
                        </span>
                        <span className="px-3 py-1 rounded-lg bg-white text-black font-black text-base border-2 border-emerald-400 shadow-sm">
                          {searchName}
                        </span>
                      </div>
                    </div>
                    <h3 className="text-3xl font-black text-white mt-1 tracking-tight">
                      &ldquo;{searchName}&rdquo; — Cleared &amp; No High Risk Record Found
                    </h3>
                    <p className="text-xs text-emerald-300 font-medium mt-1 max-w-xl">
                      This customer has zero reported vehicle damage arrears, non-payment defaults, or terms violations.
                      Safe to proceed with booking checkout and vehicle assignment.
                    </p>
                  </div>
                </div>

                <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 pt-3 sm:pt-0 border-t sm:border-t-0 border-emerald-900/60">
                  <span className="px-3.5 py-1.5 rounded-lg bg-emerald-900/60 text-emerald-200 border border-emerald-700 text-xs font-black flex items-center gap-1.5 shadow-sm">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Eligible for Rental</span>
                  </span>
                  <span className="text-[11px] text-slate-400 font-semibold">Zero Flags Matched</span>
                </div>
              </div>

              {/* If matched in system registered customers */}
              {matchedSystemCustomer && (
                <div className="mt-4 pt-4 border-t border-emerald-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-blue-600 text-white font-black uppercase text-[10px]">
                        Registered Fleet Member
                      </span>
                      <span className="font-bold text-white text-sm">
                        {matchedSystemCustomer.name}
                      </span>
                    </div>
                    <p className="text-slate-300 text-[11px]">
                      Account: <strong className="capitalize text-white">{matchedSystemCustomer.type || 'Customer'}</strong> • Mobile: <strong className="text-white">{matchedSystemCustomer.mobile || 'N/A'}</strong> • Status: <span className="text-emerald-400 font-bold capitalize">{matchedSystemCustomer.status || 'Active'}</span>
                    </p>
                  </div>

                  {isManager && (
                    <button
                      type="button"
                      onClick={() => {
                        setFlagModalPrefill({
                          fullName: matchedSystemCustomer.name,
                          badgeNumber: matchedSystemCustomer.driverLicenseNumber ? `LIC-${matchedSystemCustomer.driverLicenseNumber.slice(0, 6)}` : undefined,
                        });
                        setShowFlagModal(true);
                      }}
                      className="px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md transition whitespace-nowrap cursor-pointer"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Flag Incident to High Risk</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Quick Manager Action: Register this queried name if not matched */}
          {!searchResult.isMatch && isManager && !matchedSystemCustomer && (
            <div className="mt-3 p-3 rounded-xl bg-[#0c1427] border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <span className="text-slate-400 font-medium">
                Want to register an adverse incident for <strong className="text-white">&ldquo;{searchName}&rdquo;</strong>?
              </span>
              <button
                type="button"
                onClick={() => {
                  setFlagModalPrefill({ fullName: searchName.trim() });
                  setShowFlagModal(true);
                }}
                className="px-3 py-1.5 rounded-lg bg-red-600/90 hover:bg-red-600 text-white font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs self-start sm:self-auto"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>+ Register &ldquo;{searchName.trim()}&rdquo; as High Risk</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Empty search state guidance */
        <div className="bg-[#111a33] border-2 border-dashed border-slate-700 rounded-2xl p-8 text-center text-slate-300 space-y-2">
          <Search className="w-10 h-10 text-slate-500 mx-auto" />
          <h4 className="text-base font-bold text-white">
            Awaiting Driver Full Name
          </h4>
          <p className="text-xs text-slate-400 max-w-md mx-auto font-medium">
            Input the driver&apos;s full legal name into the search bar or choose a sample test driver above to inspect live risk evaluation.
          </p>
        </div>
      )}

      {/* Driver Registry Table with Role-Based Controls */}
      <div className="bg-[#111a33] border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-[#0b132b] border-b border-slate-800 gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-red-950/80 text-red-400 border border-red-800/80">
              <FileCheck className="w-4 h-4 text-red-400" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Fleet High-Risk Registry Database ({drivers.length} Records)
              </h3>
              <p className="text-[11px] text-slate-400 font-medium">
                {isManager
                  ? 'Authorized Manager Controls: Edit details, change status, and delete records.'
                  : 'Standard Staff View: Search and inspection mode. Action buttons restricted.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onResetDrivers}
              className="px-3 py-1.5 text-xs font-bold rounded-lg bg-slate-800/90 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 transition flex items-center gap-1 shadow-sm cursor-pointer"
              title="Reset records to the 3 default mock drivers"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
              <span>Reset 3 Mock Records</span>
            </button>

            <button
              type="button"
              onClick={() => setShowRegistry((prev) => !prev)}
              className="px-3 py-1.5 text-xs font-bold rounded-lg bg-slate-800/90 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 transition shadow-sm cursor-pointer"
            >
              {showRegistry ? 'Collapse Table' : 'Expand Table'}
            </button>
          </div>
        </div>

        {showRegistry && (
          <div>
            {/* Dedicated Table Search & Multi-Filter Bar */}
            <div className="p-3.5 bg-[#0d1630] border-b border-slate-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              <div className="relative flex-1 min-w-[240px]">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="w-4 h-4 text-gray-500" />
                </div>
                <input
                  type="text"
                  value={tableSearch}
                  onChange={(e) => setTableSearch(e.target.value)}
                  data-light-input="true"
                  placeholder="Filter table by driver name, badge #, or company..."
                  className="w-full pl-9 pr-8 py-2 text-xs rounded-xl bg-white border-2 border-slate-300 text-black font-bold placeholder:text-gray-500 shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 search-input-white high-risk-input"
                  style={{ backgroundColor: '#ffffff', color: '#000000', WebkitTextFillColor: '#000000' }}
                />
                {tableSearch && (
                  <button
                    type="button"
                    onClick={() => setTableSearch('')}
                    className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-gray-500 hover:text-black cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs">
                {/* Risk filter */}
                <select
                  value={tableRiskFilter}
                  onChange={(e) => setTableRiskFilter(e.target.value as any)}
                  data-light-input="true"
                  className="px-3 py-2 rounded-xl bg-white border-2 border-slate-300 text-black font-bold text-xs shadow-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-red-500 search-input-white high-risk-input"
                  style={{ backgroundColor: '#ffffff', color: '#000000', WebkitTextFillColor: '#000000' }}
                >
                  <option value="All">All Risk Levels</option>
                  <option value="High Risk">High Risk</option>
                  <option value="Caution">Caution</option>
                  <option value="Cleared">Cleared</option>
                </select>

                {/* Category filter */}
                <select
                  value={tableCategoryFilter}
                  onChange={(e) => setTableCategoryFilter(e.target.value)}
                  data-light-input="true"
                  className="px-3 py-2 rounded-xl bg-white border-2 border-slate-300 text-black font-bold text-xs shadow-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-red-500 search-input-white high-risk-input"
                  style={{ backgroundColor: '#ffffff', color: '#000000', WebkitTextFillColor: '#000000' }}
                >
                  <option value="All">All Categories</option>
                  <option value="Damage">Damage</option>
                  <option value="Non-Payment">Non-Payment</option>
                  <option value="Breach of Terms">Breach of Terms</option>
                  <option value="Fraud Attempt">Fraud Attempt</option>
                  <option value="Reckless Driving">Reckless Driving</option>
                </select>

                {(tableSearch || tableRiskFilter !== 'All' || tableCategoryFilter !== 'All') && (
                  <button
                    type="button"
                    onClick={() => {
                      setTableSearch('');
                      setTableRiskFilter('All');
                      setTableCategoryFilter('All');
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition border border-slate-700 cursor-pointer"
                  >
                    Reset Filters
                  </button>
                )}

                <span className="text-[11px] font-bold text-slate-300 px-1 whitespace-nowrap">
                  Showing {filteredDrivers.length} of {drivers.length}
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-200">
                <thead className="bg-[#070d1e] text-slate-300 border-b border-slate-800 uppercase font-black text-[11px] tracking-wider">
                  <tr>
                    <th className="px-4 py-3.5">Driver Full Name</th>
                    <th className="px-4 py-3.5">Badge Number</th>
                    <th className="px-4 py-3.5">Risk Level / Status</th>
                    <th className="px-4 py-3.5">Incident Category</th>
                    <th className="px-4 py-3.5">Reporting Fleet Company</th>
                    <th className="px-4 py-3.5">Reported Year</th>
                    <th className="px-4 py-3.5 text-right">Actions (Manager Only)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {filteredDrivers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                        <p className="font-bold text-white mb-1">No driver records found matching your table search or filters.</p>
                        <button
                          type="button"
                          onClick={() => {
                            setTableSearch('');
                            setTableRiskFilter('All');
                            setTableCategoryFilter('All');
                          }}
                          className="text-xs text-red-400 underline font-bold cursor-pointer"
                        >
                          Clear All Table Filters
                        </button>
                      </td>
                    </tr>
                  ) : (
                    filteredDrivers.map((driver) => (
                      <tr key={driver.id} className="hover:bg-slate-800/40 transition">
                        <td className="px-4 py-3.5 font-bold text-white">
                          <button
                            type="button"
                            onClick={() => handleQuickFill(driver.fullName)}
                            className="text-left hover:text-red-400 underline font-bold transition cursor-pointer"
                            title="Click to check this driver"
                          >
                            {driver.fullName}
                          </button>
                        </td>

                    {/* Driver Badge Number */}
                    <td className="px-4 py-3.5">
                      <button
                        type="button"
                        onClick={() => handleQuickFill(driver.badgeNumber || driver.fullName)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#0a0f1d] hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-700/80 font-mono font-bold text-xs transition cursor-pointer"
                        title="Click to search by this badge number"
                      >
                        <Hash className="w-3 h-3 text-red-400 flex-shrink-0" />
                        <span>{driver.badgeNumber || 'N/A'}</span>
                      </button>
                    </td>

                    {/* Change Status Dropdown or Badge */}
                    <td className="px-4 py-3.5">
                      {isManager ? (
                        <div className="flex items-center gap-1.5">
                          <select
                            value={driver.riskLevel}
                            onChange={(e) => onUpdateStatus(driver.id, e.target.value as RiskLevel)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wider border focus:outline-none focus:ring-2 focus:ring-red-500 cursor-pointer shadow-xs ${
                              driver.riskLevel === 'High Risk'
                                ? 'text-red-300 border-red-800 bg-[#1c0f17]'
                                : driver.riskLevel === 'Caution'
                                ? 'text-amber-300 border-amber-800 bg-[#1c160a]'
                                : 'text-emerald-300 border-emerald-800 bg-[#0d1d16]'
                            }`}
                            title="Authorized Manager: Change Status Dropdown"
                          >
                            <option value="High Risk" className="bg-slate-900 text-red-300">High Risk</option>
                            <option value="Caution" className="bg-slate-900 text-amber-300">Caution</option>
                            <option value="Cleared" className="bg-slate-900 text-emerald-300">Cleared</option>
                          </select>
                        </div>
                      ) : (
                        <span
                          className={`inline-block px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider border ${
                            driver.riskLevel === 'High Risk'
                              ? 'bg-red-950/80 text-red-300 border-red-800/80'
                              : driver.riskLevel === 'Caution'
                              ? 'bg-amber-950/80 text-amber-300 border-amber-800/80'
                              : 'bg-emerald-950/80 text-emerald-300 border-emerald-800/80'
                          }`}
                        >
                          {driver.riskLevel}
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3.5 text-slate-200 font-semibold">
                      <div>{driver.category}</div>
                      {driver.categoryDetails && (
                        <div className="text-[11px] text-slate-400 font-normal">
                          {driver.categoryDetails}
                        </div>
                      )}
                    </td>

                    {/* Reporting Fleet Company: Full for Manager, Confidential for Staff */}
                    <td className="px-4 py-3.5">
                      {isManager ? (
                        <span className="inline-flex items-center gap-1.5 font-bold text-white">
                          <Building2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>{driver.reportingFleet || 'Apex Rentals'}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-slate-400 italic font-medium">
                          <EyeOff className="w-3.5 h-3.5 text-amber-400" />
                          <span>Verified Partner Fleet (Confidential)</span>
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3.5 text-slate-400 font-medium">
                      Reported {driver.reportedYear}
                    </td>

                    {/* Actions: Edit, Delete (Manager only) */}
                    <td className="px-4 py-3.5 text-right">
                      {isManager ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedDriverForEdit(driver)}
                            className="px-2.5 py-1 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 text-xs font-bold transition flex items-center gap-1 shadow-xs cursor-pointer"
                            title="Edit driver information"
                          >
                            <Edit3 className="w-3 h-3 text-blue-400" />
                            <span>Edit</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setDriverToDelete(driver)}
                            className="px-2.5 py-1 rounded-lg bg-red-950/60 hover:bg-red-900/60 text-red-300 hover:text-red-200 border border-red-800/70 text-xs font-bold transition flex items-center gap-1 shadow-xs cursor-pointer"
                            title="Delete driver from High Risk registry"
                          >
                            <Trash2 className="w-3 h-3 text-red-400" />
                            <span>Delete</span>
                          </button>
                        </div>
                      ) : (
                        <div className="relative group inline-block text-right">
                          <div className="flex items-center justify-end gap-1.5 opacity-50">
                            <button
                              type="button"
                              disabled
                              className="px-2 py-1 rounded bg-slate-800/40 text-slate-500 text-xs font-bold cursor-not-allowed flex items-center gap-1 border border-slate-800"
                            >
                              <Edit3 className="w-3 h-3" />
                              <span>Edit</span>
                            </button>
                            <button
                              type="button"
                              disabled
                              className="p-1 rounded bg-slate-800/40 text-slate-500 text-xs cursor-not-allowed border border-slate-800"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                          <div className="absolute right-0 top-full mt-1 hidden group-hover:block z-20 px-2.5 py-1 rounded bg-slate-900 border border-slate-700 text-slate-200 text-[11px] shadow-xl whitespace-nowrap">
                            Authorized Manager Access Required
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            </table>
          </div>
        </div>
      )}
    </div>

      {/* Flag / Add New Driver Popup Modal */}
      <FlagNewDriverModal
        isOpen={showFlagModal}
        onClose={() => {
          setShowFlagModal(false);
          setFlagModalPrefill(undefined);
        }}
        onSubmit={handleFlagModalSubmit}
        initialData={flagModalPrefill}
      />

      {/* Edit Driver Modal */}
      <EditDriverModal
        isOpen={!!selectedDriverForEdit}
        driver={selectedDriverForEdit}
        onClose={() => setSelectedDriverForEdit(null)}
        onSave={(id, input) => {
          onEditDriver(id, input);
          setSelectedDriverForEdit(null);
        }}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={!!driverToDelete}
        driver={driverToDelete}
        onClose={() => setDriverToDelete(null)}
        onConfirm={(id) => {
          onDeleteDriver(id);
          setDriverToDelete(null);
        }}
      />

      {/* Manager Override Modal */}
      <ManagerOverrideModal
        isOpen={!!selectedDriverForOverride}
        driver={selectedDriverForOverride}
        onClose={() => setSelectedDriverForOverride(null)}
        onConfirmOverride={(id, payload) => {
          onOverrideDriver(id, payload);
          setSelectedDriverForOverride(null);
        }}
      />
    </div>
  );
};
