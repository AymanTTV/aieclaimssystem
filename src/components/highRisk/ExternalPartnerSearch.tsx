// src/components/highRisk/ExternalPartnerSearch.tsx
import React, { useState, useMemo } from 'react';
import {
  Search,
  ShieldAlert,
  ShieldCheck,
  Lock,
  Sparkles,
  AlertTriangle,
  Building2,
  Calendar,
  Info,
  CheckCircle2,
  FileWarning,
  EyeOff,
  UserPlus,
  XCircle,
  Hash,
} from 'lucide-react';
import { HighRiskDriver, NewDriverInput } from '../../types/highRiskDriver';
import { queryHighRiskDriver } from '../../services/highRiskService';

interface ExternalPartnerSearchProps {
  drivers: HighRiskDriver[];
  onPartnerReportDriver?: (input: NewDriverInput) => void;
}

export const ExternalPartnerSearch: React.FC<ExternalPartnerSearchProps> = ({
  drivers,
  onPartnerReportDriver,
}) => {
  const [partnerSearchName, setPartnerSearchName] = useState('');
  const [showReportForm, setShowReportForm] = useState(false);
  const [reportFullName, setReportFullName] = useState('');
  const [reportBadgeNumber, setReportBadgeNumber] = useState('');
  const [reportRiskLevel, setReportRiskLevel] = useState<'High Risk' | 'Caution'>('High Risk');
  const [reportCategory, setReportCategory] = useState<'Damage' | 'Non-Payment' | 'Breach of Terms'>('Damage');
  const [reportFleetCompany, setReportFleetCompany] = useState('');
  const [reportSuccess, setReportSuccess] = useState<string | null>(null);

  // Instant query as user types or clicks
  const result = useMemo(() => {
    return queryHighRiskDriver(partnerSearchName, drivers);
  }, [partnerSearchName, drivers]);

  const handlePartnerReportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportFullName.trim() || !onPartnerReportDriver) return;

    onPartnerReportDriver({
      fullName: reportFullName.trim(),
      badgeNumber: reportBadgeNumber.trim() || undefined,
      riskLevel: reportRiskLevel,
      category: reportCategory,
      reportingFleet: reportFleetCompany.trim() || 'Partner Fleet Affiliate',
    });

    const reported = reportFullName.trim();
    setReportFullName('');
    setReportBadgeNumber('');
    setReportFleetCompany('');
    setPartnerSearchName(reported);
    setReportSuccess(`Cross-fleet notice filed for "${reported}". Registered in shared database.`);
    setTimeout(() => {
      setReportSuccess(null);
      setShowReportForm(false);
    }, 4000);
  };

  const handleQuickTest = (name: string) => {
    setPartnerSearchName(name);
  };

  return (
    <div className="space-y-6 text-slate-100">
      {/* Partner Portal Hero Header */}
      <div className="bg-[#111a33] border border-slate-800 rounded-2xl p-6 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-950/80 border border-indigo-800/80 text-indigo-300 text-xs font-bold">
              <Building2 className="w-3.5 h-3.5 text-indigo-400" />
              <span>Partner Fleet Driver Verification System</span>
            </div>
            <h2 className="text-2xl font-black text-white tracking-tight">
              High Risk - Partner Fleet Search Portal
            </h2>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed font-medium">
              Confidential &amp; Privacy Compliant Cross-Fleet Verification. Operates under strict
              Zero-PII principles. Query adverse rental histories across participating fleet operators
              using only the driver&apos;s full legal name.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#0c1427] border border-slate-800 text-xs text-slate-200 space-y-1.5 md:text-right shadow-sm">
            <div className="flex items-center md:justify-end gap-1.5 font-bold text-emerald-400">
              <Lock className="w-3.5 h-3.5 text-emerald-400" />
              <span>Zero-PII Protection Active</span>
            </div>
            <div className="flex items-center md:justify-end gap-1.5 font-bold text-amber-300 text-[11px]">
              <EyeOff className="w-3.5 h-3.5 text-amber-400" />
              <span>Reporting Fleet Identity Redacted</span>
            </div>
            <p className="text-[10px] text-slate-400 font-medium">
              Reporting fleet companies are confidential to prevent competing fleet disputes.
            </p>
          </div>
        </div>

        {/* Quick Testing Names */}
        <div className="mt-5 pt-4 border-t border-slate-800 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-slate-200 text-xs font-bold flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Quick Test Names:
          </span>
          <button
            type="button"
            onClick={() => handleQuickTest('John Smith')}
            className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-black border-2 border-slate-300 transition font-extrabold shadow-sm flex items-center gap-1.5 cursor-pointer"
            title="Search test driver: John Smith (High Risk)"
          >
            <span className="text-black font-black">John Smith</span>
            <span className="text-[10px] text-red-700 bg-red-100 border border-red-300 px-1.5 py-0.5 rounded font-black">(High Risk)</span>
          </button>
          <button
            type="button"
            onClick={() => handleQuickTest('Robert Johnson')}
            className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-black border-2 border-slate-300 transition font-extrabold shadow-sm flex items-center gap-1.5 cursor-pointer"
            title="Search test driver: Robert Johnson (Caution)"
          >
            <span className="text-black font-black">Robert Johnson</span>
            <span className="text-[10px] text-amber-800 bg-amber-100 border border-amber-300 px-1.5 py-0.5 rounded font-black">(Caution)</span>
          </button>
          <button
            type="button"
            onClick={() => handleQuickTest('Michael Brown')}
            className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-black border-2 border-slate-300 transition font-extrabold shadow-sm flex items-center gap-1.5 cursor-pointer"
            title="Search test driver: Michael Brown (Breach)"
          >
            <span className="text-black font-black">Michael Brown</span>
            <span className="text-[10px] text-red-700 bg-red-100 border border-red-300 px-1.5 py-0.5 rounded font-black">(Breach)</span>
          </button>
          <button
            type="button"
            onClick={() => handleQuickTest('Sarah Connor')}
            className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-black border-2 border-slate-300 transition font-extrabold shadow-sm flex items-center gap-1.5 cursor-pointer"
            title="Search test driver: Sarah Connor (Clear)"
          >
            <span className="text-black font-black">Sarah Connor</span>
            <span className="text-[10px] text-emerald-800 bg-emerald-100 border border-emerald-300 px-1.5 py-0.5 rounded font-black">(Clear)</span>
          </button>

          {/* Dynamically show recently registered drivers */}
          {drivers
            .filter((d) => !['hrd-1', 'hrd-2', 'hrd-3'].includes(d.id))
            .slice(0, 4)
            .map((driver) => (
              <button
                key={driver.id}
                type="button"
                onClick={() => handleQuickTest(driver.fullName)}
                className="px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-black border-2 border-indigo-400 transition font-extrabold shadow-sm flex items-center gap-1.5 cursor-pointer"
                title={`Search registered driver: ${driver.fullName} (${driver.riskLevel})`}
              >
                <span className="text-black font-black">{driver.fullName}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-black border ${
                  driver.riskLevel === 'High Risk'
                    ? 'text-red-700 bg-red-100 border-red-300'
                    : 'text-amber-800 bg-amber-100 border-amber-300'
                }`}>
                  ({driver.riskLevel})
                </span>
              </button>
            ))}
        </div>
      </div>

      {/* Single Search Input for Partner Portal */}
      <div className="bg-[#111a33] border border-slate-800 rounded-2xl p-6 shadow-lg">
        <label
          style={{ color: '#ffffff' }}
          className="block text-sm font-black uppercase tracking-wide text-white mb-2 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5"
        >
          <span className="flex items-center gap-2">
            <span className="text-white text-base font-black">Driver Full Name or Badge Number</span>
            <span className="text-red-400 font-black">*</span>
            <span className="text-[11px] px-2 py-0.5 rounded bg-indigo-600/40 text-indigo-100 border border-indigo-500/50 font-bold lowercase">partner query</span>
          </span>
          <span className="text-xs text-emerald-300 font-bold bg-emerald-950/80 border border-emerald-700/80 px-2.5 py-0.5 rounded self-start sm:self-auto">
            Live query by driver name or badge #
          </span>
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-700" />
          </div>
          <input
            type="text"
            value={partnerSearchName}
            onChange={(e) => setPartnerSearchName(e.target.value)}
            data-light-input="true"
            placeholder="Type Driver's Full Name or Badge # (e.g. John Smith, BDG-8821)..."
            className="w-full pl-12 pr-28 py-3.5 bg-white border-2 border-slate-300 rounded-xl text-black font-black placeholder:text-gray-500 placeholder:font-bold text-base focus:outline-none focus:ring-4 focus:ring-red-500/25 focus:border-red-500 shadow-md search-input-white high-risk-input"
            style={{ backgroundColor: '#ffffff', color: '#000000', WebkitTextFillColor: '#000000' }}
            autoFocus
          />
          {partnerSearchName && (
            <button
              type="button"
              onClick={() => setPartnerSearchName('')}
              className="absolute inset-y-0 right-0 pr-4 flex items-center text-xs text-gray-700 hover:text-black cursor-pointer"
            >
              <span className="px-2.5 py-1 rounded-md bg-slate-200 hover:bg-slate-300 border border-slate-400 font-black text-black shadow-xs flex items-center gap-1">
                <XCircle className="w-3.5 h-3.5 text-black" />
                <span>Clear</span>
              </span>
            </button>
          )}
        </div>
        <p className="text-[11px] text-slate-300 mt-2 font-medium">
          Real-time check against cross-fleet shared high-risk records.
        </p>
      </div>

      {/* SAFE ANONYMIZED SEARCH RESULTS */}
      {partnerSearchName.trim().length > 0 ? (
        <div className="transition-all duration-300">
          {result.isMatch && result.match ? (
            /* ============================================================== */
            /* IF MATCH FOUND: HIGH RISK ALERT                                */
            /* ============================================================== */
            <div className="bg-red-950/40 border-2 border-red-600 rounded-2xl p-6 text-slate-100 shadow-xl animate-in zoom-in-95 duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-red-900/60">
                <div className="flex items-center gap-3.5">
                  <div className="p-3 rounded-xl bg-red-600 text-white shadow-lg shadow-red-950 ring-4 ring-red-900/40 flex-shrink-0 animate-bounce">
                    <ShieldAlert className="w-8 h-8" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="inline-block px-2.5 py-0.5 text-xs font-black uppercase tracking-wider rounded-md bg-red-600 text-white shadow-xs">
                        ALERT: MARKED AS HIGH RISK
                      </span>
                      {result.match.badgeNumber && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-mono font-bold rounded-md bg-slate-900 text-slate-100 border border-slate-700">
                          <Hash className="w-3 h-3 text-red-400" />
                          Badge: {result.match.badgeNumber}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="text-3xl font-black text-white">
                        {result.match.fullName}
                      </h3>
                      {result.match.badgeNumber && (
                        <span className="px-2.5 py-1 rounded-lg bg-red-950/80 border border-red-700/80 font-mono text-sm font-black text-red-300">
                          {result.match.badgeNumber}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Risk Level Badge */}
                <div className="flex flex-col sm:items-end gap-1">
                  <span className="text-[11px] font-bold text-red-300 uppercase tracking-wider">
                    Severity Tier
                  </span>
                  <div
                    className={`px-4 py-2 rounded-xl text-sm font-black uppercase tracking-wide border shadow-md ${
                      result.match.riskLevel === 'High Risk'
                        ? 'bg-red-600 text-white border-red-500 shadow-red-950'
                        : 'bg-amber-400 text-slate-950 border-amber-300'
                    }`}
                  >
                    Risk Level: {result.match.riskLevel === 'High Risk' ? 'DO NOT RENT' : 'HIGH CAUTION'}
                  </div>
                </div>
              </div>

              {/* Incident Category & Year + Redacted Fleet Info */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 py-4 text-xs">
                <div className="p-4 rounded-xl bg-[#0c1427] border border-red-900/60 space-y-1 shadow-sm">
                  <span className="text-red-400 font-bold uppercase tracking-wider text-[10px]">
                    Incident Category &amp; Year
                  </span>
                  <div className="text-base font-black text-white flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
                    <span>
                      {result.match.category} - Reported {result.match.reportedYear}
                    </span>
                  </div>
                  <p className="text-slate-300 text-xs font-medium">
                    {result.match.categoryDetails || 'Adverse incident filed with fleet.'}
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-[#0c1427] border border-red-900/60 space-y-1 shadow-sm">
                  <span className="text-red-400 font-bold uppercase tracking-wider text-[10px]">
                    Reporting Fleet Status
                  </span>
                  <div className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                    <EyeOff className="w-4 h-4 text-amber-400 flex-shrink-0" />
                    <span>Confidential Verified Partner</span>
                  </div>
                  <p className="text-slate-400 text-[11px] font-medium">
                    Specific company name is protected to prevent competing fleet disputes.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-[#0c1427] border border-red-900/60 space-y-1 shadow-sm">
                  <span className="text-red-400 font-bold uppercase tracking-wider text-[10px]">
                    Privacy Compliance Seal
                  </span>
                  <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                    <Lock className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <span>Safe Anonymized Result</span>
                  </div>
                  <p className="text-slate-400 text-[11px] font-medium">
                    Zero sensitive PII: licenses, contact info, and addresses are redacted.
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-red-900/60 flex items-center justify-between text-xs text-red-300 font-bold">
                <span>Adverse flag active across participating fleet networks.</span>
                <span className="text-red-400 font-black">Recommended Policy: Deny Booking</span>
              </div>
            </div>
          ) : (
            /* ============================================================== */
            /* IF NO MATCH: GREEN CLEAR BANNER                                */
            /* ============================================================== */
            <div className="bg-emerald-950/30 border-2 border-emerald-600/80 rounded-2xl p-6 text-slate-100 shadow-xl animate-in zoom-in-95 duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="p-3 rounded-2xl bg-emerald-600 text-white shadow-lg ring-4 ring-emerald-900/40 flex-shrink-0">
                    <ShieldCheck className="w-8 h-8 stroke-[2.5]" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap mb-1.5">
                      <span className="inline-block px-2.5 py-1 text-xs font-black uppercase tracking-wider rounded-md bg-emerald-500 text-slate-950 shadow-xs">
                        STATUS: CLEARED
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-emerald-300 font-bold uppercase tracking-wider">
                          Checked:
                        </span>
                        <span className="px-3 py-1 rounded-lg bg-white text-black font-black text-base border-2 border-emerald-400 shadow-sm">
                          {partnerSearchName}
                        </span>
                      </div>
                    </div>
                    <h3 className="text-3xl font-black text-white tracking-tight">
                      &ldquo;{partnerSearchName}&rdquo; — Cleared &amp; Eligible for Rental
                    </h3>
                    <p className="text-xs text-emerald-300 font-medium mt-1">
                      No adverse risk flags reported by any partner fleet operator under this name.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:items-end gap-1.5">
                  <div className="px-3.5 py-1.5 rounded-lg bg-emerald-900/60 text-emerald-200 border border-emerald-700 text-xs font-black flex items-center gap-1.5 shadow-sm">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Eligible for Rental</span>
                  </div>
                  <span className="text-[11px] text-slate-400 font-medium">Safe to proceed</span>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-[#111a33] border-2 border-dashed border-slate-700 rounded-2xl p-8 text-center text-slate-300 space-y-2">
          <Search className="w-10 h-10 text-slate-500 mx-auto" />
          <h4 className="text-base font-bold text-white">
            Awaiting Driver Full Name
          </h4>
          <p className="text-xs text-slate-400 max-w-md mx-auto font-medium">
            Type the customer&apos;s full legal name above to run a privacy-compliant cross-fleet check.
          </p>
        </div>
      )}

      {/* Partner Incident Reporting Accordion / Section */}
      <div className="bg-[#111a33] border border-slate-800 rounded-2xl p-6 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <FileWarning className="w-4 h-4 text-red-400" />
              <span>Partner Fleet Adverse Incident Reporting</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5 font-medium">
              Registered fleet partner? Submit an adverse report for non-payment, unpaid damage, or vehicle breach.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowReportForm((prev) => !prev)}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold border border-slate-700 transition flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>{showReportForm ? 'Close Report Form' : 'Report an Incident'}</span>
          </button>
        </div>

        {reportSuccess && (
          <div className="mt-4 p-3 bg-emerald-950/60 border border-emerald-700/80 text-emerald-200 rounded-xl text-xs flex items-center gap-2 font-bold animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>{reportSuccess}</span>
          </div>
        )}

        {showReportForm && (
          <form onSubmit={handlePartnerReportSubmit} className="mt-5 pt-4 border-t border-slate-800 space-y-4 dark-form">
            <div className="p-3 bg-blue-950/60 border border-blue-800/80 rounded-xl text-xs text-blue-200 flex items-center gap-2">
              <Info className="w-4 h-4 text-blue-400 flex-shrink-0" />
              <span>
                <strong className="text-white">Confidential Submission</strong>: Your fleet company name remains private to external searches.
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  style={{ color: '#ffffff' }}
                  className="block text-xs font-black text-white uppercase tracking-wider mb-1.5"
                >
                  1. Driver Full Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={reportFullName}
                  onChange={(e) => setReportFullName(e.target.value)}
                  data-light-input="true"
                  placeholder="e.g. David Williams"
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-white border-2 border-slate-300 text-black placeholder:text-gray-500 font-bold focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 shadow-sm search-input-white high-risk-input"
                  style={{ backgroundColor: '#ffffff', color: '#000000', WebkitTextFillColor: '#000000' }}
                  required
                />
              </div>

              <div>
                <label
                  style={{ color: '#ffffff' }}
                  className="block text-xs font-black text-white uppercase tracking-wider mb-1.5 flex items-center justify-between"
                >
                  <span>2. Badge Number</span>
                  <span className="text-[10px] text-slate-300 font-normal lowercase">PCO / Fleet Badge ID</span>
                </label>
                <input
                  type="text"
                  value={reportBadgeNumber}
                  onChange={(e) => setReportBadgeNumber(e.target.value)}
                  data-light-input="true"
                  placeholder="e.g. BDG-8821, TX-4091"
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-white border-2 border-slate-300 text-black placeholder:text-gray-500 font-bold focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 shadow-sm uppercase search-input-white high-risk-input"
                  style={{ backgroundColor: '#ffffff', color: '#000000', WebkitTextFillColor: '#000000' }}
                />
              </div>

              <div>
                <label
                  style={{ color: '#ffffff' }}
                  className="block text-xs font-black text-white uppercase tracking-wider mb-1.5"
                >
                  3. Risk Severity Tier <span className="text-red-400">*</span>
                </label>
                <select
                  value={reportRiskLevel}
                  onChange={(e) => setReportRiskLevel(e.target.value as 'High Risk' | 'Caution')}
                  data-light-input="true"
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-white border-2 border-slate-300 text-black font-bold focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 shadow-sm cursor-pointer search-input-white high-risk-input"
                  style={{ backgroundColor: '#ffffff', color: '#000000', WebkitTextFillColor: '#000000' }}
                >
                  <option value="High Risk" className="bg-white text-black font-bold">High Risk (Do Not Rent)</option>
                  <option value="Caution" className="bg-white text-black font-bold">Caution (Enhanced Deposit)</option>
                </select>
              </div>

              <div>
                <label
                  style={{ color: '#ffffff' }}
                  className="block text-xs font-black text-white uppercase tracking-wider mb-1.5"
                >
                  4. Incident Category <span className="text-red-400">*</span>
                </label>
                <select
                  value={reportCategory}
                  onChange={(e) => setReportCategory(e.target.value as any)}
                  data-light-input="true"
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-white border-2 border-slate-300 text-black font-bold focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 shadow-sm cursor-pointer search-input-white high-risk-input"
                  style={{ backgroundColor: '#ffffff', color: '#000000', WebkitTextFillColor: '#000000' }}
                >
                  <option value="Damage" className="bg-white text-black font-bold">Unpaid Vehicle Damage</option>
                  <option value="Non-Payment" className="bg-white text-black font-bold">Defaulted Payments / Arrears</option>
                  <option value="Breach of Terms" className="bg-white text-black font-bold">Breach of Rental Terms</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label
                  style={{ color: '#ffffff' }}
                  className="block text-xs font-black text-white uppercase tracking-wider mb-1.5"
                >
                  Your Fleet Company Name
                </label>
                <input
                  type="text"
                  value={reportFleetCompany}
                  onChange={(e) => setReportFleetCompany(e.target.value)}
                  data-light-input="true"
                  placeholder="e.g. City Fleet Ltd (Kept Confidential)"
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-white border-2 border-slate-300 text-black placeholder:text-gray-500 font-bold focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 shadow-sm search-input-white high-risk-input"
                  style={{ backgroundColor: '#ffffff', color: '#000000', WebkitTextFillColor: '#000000' }}
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowReportForm(false)}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition shadow-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-black rounded-xl bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-950 transition cursor-pointer"
              >
                Submit Cross-Fleet Incident Report
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
