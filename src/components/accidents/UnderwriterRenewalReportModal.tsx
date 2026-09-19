import React from 'react';
import { FleetRiskSummary } from '../../types/driverRisk';
import { formatGBP, generateRenewalRiskCSV } from '../../utils/driverRiskAnalysis';
import { Printer, Download, X, ShieldAlert, CheckCircle, AlertTriangle, Building2, Calendar, FileText } from 'lucide-react';
import { saveAs } from 'file-saver';
import { useCompanyDetails } from '../../hooks/useCompanyDetails';
import { exportFleetClaimExperiencePDF } from '../../utils/exportFleetExperiencePDF';

interface UnderwriterRenewalReportModalProps {
  summary: FleetRiskSummary;
  onClose: () => void;
}

export const UnderwriterRenewalReportModal: React.FC<UnderwriterRenewalReportModalProps> = ({
  summary,
  onClose,
}) => {
  const { companyDetails } = useCompanyDetails();
  const companyName = companyDetails?.name || 'Fleet Operations';

  const handleDownloadCSV = () => {
    const csvData = generateRenewalRiskCSV(summary, companyName);
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const p = summary.policyPeriod;
    saveAs(blob, `Insurance_Renewal_Driver_Risk_Report_${p.startDate}_to_${p.endDate}.csv`);
  };

  const handleExportPDF = async () => {
    await exportFleetClaimExperiencePDF({
      accidents: summary.periodAccidents || [],
      policyPeriod: summary.policyPeriod,
      companyDetails,
    });
  };

  const handlePrint = () => {
    window.print();
  };

  const todayStr = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 flex items-center justify-center p-3 sm:p-6 print:p-0 print:bg-white print:static">
      {/* Container */}
      <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden print:max-w-none print:max-h-none print:shadow-none print:rounded-none">
        {/* Modal Top Actions Toolbar (Hidden on Print) */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50/80 print:hidden">
          <div className="flex items-center space-x-2">
            <FileText className="w-5 h-5 text-blue-600" />
            <h2 className="text-base font-bold text-gray-900">Insurance Renewal Underwriting Dossier</h2>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleDownloadCSV}
              className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md text-xs font-semibold text-gray-700 bg-white hover:bg-gray-100 shadow-2xs transition"
              title="Download full risk breakdown as CSV"
            >
              <Download className="w-4 h-4 mr-1.5 text-gray-600" />
              Export CSV
            </button>
            <button
              onClick={handleExportPDF}
              className="inline-flex items-center px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-xs font-semibold shadow-2xs transition"
              title="Export formatted Insurance-Ready Fleet Claim Experience PDF Report"
            >
              <FileText className="w-4 h-4 mr-1.5" />
              Export PDF Report
            </button>
            <button
              onClick={handlePrint}
              className="inline-flex items-center px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-semibold shadow-2xs transition"
              title="Print document or Save as PDF"
            >
              <Printer className="w-4 h-4 mr-1.5" />
              Print
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Content */}
        <div className="overflow-y-auto p-6 sm:p-8 space-y-6 text-gray-900 print:overflow-visible print:p-8">
          {/* Document Header */}
          <div className="border-b-2 border-gray-900 pb-5">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div>
                <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded bg-blue-900 text-white text-[11px] font-bold uppercase tracking-wider mb-2">
                  <Building2 className="w-3.5 h-3.5" />
                  <span>Confidential Underwriting Disclosure</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-gray-900">
                  Driver High-Risk & Accident Frequency Report
                </h1>
                <p className="text-sm text-gray-600 mt-1 font-medium">
                  Prepared for Commercial Fleet Motor Insurance Underwriters &amp; Policy Renewal
                </p>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-right sm:min-w-[240px]">
                <div className="text-xs text-gray-500 font-medium">Policy Period Term:</div>
                <div className="text-sm font-bold text-gray-900 mt-0.5">
                  {summary.policyPeriod.startDate} to {summary.policyPeriod.endDate}
                </div>
                <div className="text-[11px] text-gray-500 mt-1">
                  Report Date: <span className="font-semibold text-gray-800">{todayStr}</span>
                </div>
                <div className="mt-1.5 pt-1.5 border-t border-gray-200 text-[11px] font-bold text-rose-700">
                  Renewal Deadline: 18 December 2026
                </div>
              </div>
            </div>
          </div>

          {/* Underwriter Executive Summary Metrics */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">
              1. Executive Fleet Underwriting Metrics
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-lg border border-gray-200 bg-gray-50">
                <span className="text-xs text-gray-500 font-medium">Total Fleet Claims</span>
                <p className="text-2xl font-black text-gray-900 mt-1">{summary.totalFleetAccidents}</p>
                <span className="text-[11px] text-gray-500">In selected policy year</span>
              </div>
              <div className="p-3.5 rounded-lg border border-rose-200 bg-rose-50/50">
                <span className="text-xs text-rose-800 font-medium">Total Incurred Loss</span>
                <p className="text-2xl font-black text-rose-900 mt-1">{formatGBP(summary.totalFleetIncurred)}</p>
                <span className="text-[11px] text-rose-700">All combined claims</span>
              </div>
              <div className="p-3.5 rounded-lg border border-amber-200 bg-amber-50/50">
                <span className="text-xs text-amber-800 font-medium">Fault Claims Ratio</span>
                <p className="text-2xl font-black text-amber-900 mt-1">
                  {summary.totalFaultAccidents}{' '}
                  <span className="text-xs font-semibold text-amber-700">({summary.faultPercentage.toFixed(0)}%)</span>
                </p>
                <span className="text-[11px] text-amber-700">
                  Non-Fault: {summary.totalNonFaultAccidents} | Split: {summary.totalSplitAccidents}
                </span>
              </div>
              <div className="p-3.5 rounded-lg border border-indigo-200 bg-indigo-50/50">
                <span className="text-xs text-indigo-800 font-medium">High Risk Drivers</span>
                <p className="text-2xl font-black text-indigo-900 mt-1">
                  {summary.highRiskDriversCount}
                  <span className="text-xs font-normal text-indigo-600"> / {summary.totalDriversWithAccidents} active</span>
                </p>
                <span className="text-[11px] text-indigo-700">
                  Medium: {summary.mediumRiskDriversCount} | Low: {summary.lowRiskDriversCount}
                </span>
              </div>
            </div>
          </div>

          {/* 24-Hour Late Reporting Compliance */}
          <div className="p-4 rounded-lg border border-gray-200 bg-gray-50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
            <div>
              <span className="font-bold text-gray-900">24-Hour Claim Notification Compliance:</span>
              <p className="text-gray-600 mt-0.5">
                {summary.totalLateReports} claims ({summary.lateReportPercentage.toFixed(1)}%) were notified past the mandatory 24-hour window. Total late reporting penalties assessed: {formatGBP(summary.totalLatePenalties)}.
              </p>
            </div>
            <div className="text-right flex-shrink-0">
              <span className="font-bold text-gray-800">Prompt Reporting Rate: </span>
              <span className="text-emerald-700 font-extrabold text-sm">
                {(100 - summary.lateReportPercentage).toFixed(1)}%
              </span>
            </div>
          </div>

          {/* 2. Top 5 Highest-Risk Drivers Breakdown */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3 flex items-center justify-between">
              <span>2. Priority High-Risk Driver Profiles (Action List for Underwriters)</span>
              <span className="text-[11px] font-normal text-gray-400 lowercase">Threshold: ≥3 accidents or high fault loss</span>
            </h3>

            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200 text-xs">
                <thead className="bg-gray-100 text-gray-700 font-bold">
                  <tr>
                    <th className="px-3 py-2 text-left">Rank</th>
                    <th className="px-3 py-2 text-left">Driver Name / Identifier</th>
                    <th className="px-3 py-2 text-center">Accidents</th>
                    <th className="px-3 py-2 text-center">Fault Split</th>
                    <th className="px-3 py-2 text-right">Incurred (£)</th>
                    <th className="px-3 py-2 text-center">Late Reports</th>
                    <th className="px-3 py-2 text-left">Underwriter Note / Trigger</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {summary.topRiskDrivers.map((driver) => (
                    <tr key={driver.driverName} className={driver.riskRating === 'high' ? 'bg-rose-50/30' : ''}>
                      <td className="px-3 py-2 font-black text-gray-900 text-sm">#{driver.rank}</td>
                      <td className="px-3 py-2">
                        <div className="font-bold text-gray-900">{driver.driverName}</div>
                        <div className="text-[10px] text-gray-500">
                          {driver.driverNIN ? `NIN: ${driver.driverNIN}` : ''} {driver.driverMobile ? `| Mob: ${driver.driverMobile}` : ''}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-center font-bold text-sm text-gray-900">
                        {driver.totalAccidents}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span className="font-semibold text-rose-700">{driver.faultCount} Fault</span>
                        <span className="text-gray-400 mx-1">/</span>
                        <span className="text-emerald-700">{driver.nonFaultCount} NF</span>
                        {driver.splitCount > 0 && <span className="text-amber-700 ml-1">({driver.splitCount} Split)</span>}
                      </td>
                      <td className="px-3 py-2 text-right font-black text-gray-900">
                        {formatGBP(driver.totalIncurred)}
                      </td>
                      <td className="px-3 py-2 text-center font-medium">
                        {driver.lateReportingCount > 0 ? (
                          <span className="text-rose-600 font-bold">{driver.lateReportingCount} (&gt;24h)</span>
                        ) : (
                          <span className="text-emerald-700 font-medium">0</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-[11px] text-gray-600">
                        {driver.riskReasons.join('; ')}
                      </td>
                    </tr>
                  ))}
                  {summary.topRiskDrivers.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-4 text-center text-gray-500">
                        No accidents recorded for this policy term.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* 3. Complete Driver Risk Ranking Schedule */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">
              3. Complete Fleet Driver Risk Ranking Schedule ({summary.driverProfiles.length} Total Incident Drivers)
            </h3>

            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200 text-xs">
                <thead className="bg-gray-100 text-gray-700 font-bold">
                  <tr>
                    <th className="px-2.5 py-2 text-left">#</th>
                    <th className="px-3 py-2 text-left">Driver Name</th>
                    <th className="px-3 py-2 text-left">NIN / Mobile</th>
                    <th className="px-2.5 py-2 text-center">Risk</th>
                    <th className="px-2.5 py-2 text-center">Claims</th>
                    <th className="px-2.5 py-2 text-center">Fault</th>
                    <th className="px-2.5 py-2 text-center">Non-Fault</th>
                    <th className="px-3 py-2 text-right">Incurred (£)</th>
                    <th className="px-2.5 py-2 text-center">Late (&gt;24h)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {summary.driverProfiles.map((driver) => (
                    <tr key={driver.driverName} className="hover:bg-gray-50">
                      <td className="px-2.5 py-1.5 font-bold text-gray-500">{driver.rank}</td>
                      <td className="px-3 py-1.5 font-bold text-gray-900">{driver.driverName}</td>
                      <td className="px-3 py-1.5 text-[11px] text-gray-500">
                        {driver.driverNIN || driver.driverMobile || '—'}
                      </td>
                      <td className="px-2.5 py-1.5 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                            driver.riskRating === 'high'
                              ? 'bg-rose-100 text-rose-800'
                              : driver.riskRating === 'medium'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {driver.riskRating}
                        </span>
                      </td>
                      <td className="px-2.5 py-1.5 text-center font-bold text-gray-900">{driver.totalAccidents}</td>
                      <td className="px-2.5 py-1.5 text-center text-rose-700 font-semibold">{driver.faultCount}</td>
                      <td className="px-2.5 py-1.5 text-center text-emerald-700 font-semibold">{driver.nonFaultCount}</td>
                      <td className="px-3 py-1.5 text-right font-bold text-gray-900">{formatGBP(driver.totalIncurred)}</td>
                      <td className="px-2.5 py-1.5 text-center font-medium text-gray-700">
                        {driver.lateReportingCount > 0 ? (
                          <span className="text-rose-600 font-bold">{driver.lateReportingCount}</span>
                        ) : (
                          '0'
                        )}
                      </td>
                    </tr>
                  ))}
                  {summary.driverProfiles.length === 0 && (
                    <tr>
                      <td colSpan={9} className="px-4 py-4 text-center text-gray-500">
                        No claims recorded for this policy cycle.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Underwriter Sign-off Footer */}
          <div className="border-t-2 border-gray-200 pt-6 mt-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs text-gray-600">
              <div>
                <p className="font-bold text-gray-800">Fleet Operations Certification:</p>
                <p className="mt-1">
                  I certify that the above driver risk data accurately reflects all recorded motor claims, reporting times, and loss reserves for the declared policy period.
                </p>
                <div className="mt-6 border-b border-gray-400 w-48"></div>
                <span className="text-[10px] text-gray-400">Fleet Risk Manager Signature</span>
              </div>
              <div>
                <p className="font-bold text-gray-800">Underwriting Assessment:</p>
                <p className="mt-1">
                  Received and noted for annual policy renewal pricing, terms endorsement, and high-risk driver deductible review.
                </p>
                <div className="mt-6 border-b border-gray-400 w-48"></div>
                <span className="text-[10px] text-gray-400">Underwriter Date &amp; Signature</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
