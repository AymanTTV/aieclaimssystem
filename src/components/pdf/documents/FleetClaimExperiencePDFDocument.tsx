// src/components/pdf/documents/FleetClaimExperiencePDFDocument.tsx
import React from 'react';
import { Document, Page, Text, View, Image, StyleSheet } from '@react-pdf/renderer';
import { FleetRiskSummary, DriverRiskProfile } from '../../../types/driverRisk';
import { Accident } from '../../../types/accident';
import { formatGBP } from '../../../utils/driverRiskAnalysis';
import { calculateReportingTiming, parseDateSafe } from '../../../utils/accidentCalculations';
import { format } from 'date-fns';

const pdfStyles = StyleSheet.create({
  page: {
    padding: 24,
    fontSize: 8,
    fontFamily: 'Helvetica',
    backgroundColor: '#FFFFFF',
    color: '#0F172A',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1.5,
    borderBottomColor: '#1E293B',
    paddingBottom: 10,
    marginBottom: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: '55%',
  },
  logo: {
    width: 70,
    height: 35,
    objectFit: 'contain',
    marginRight: 10,
  },
  companyName: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    color: '#0F172A',
  },
  companyDetail: {
    fontSize: 7.5,
    color: '#475569',
    marginTop: 1,
  },
  headerRight: {
    alignItems: 'flex-end',
    maxWidth: '45%',
  },
  docBadge: {
    backgroundColor: '#1E3A8A',
    color: '#FFFFFF',
    fontSize: 6.5,
    fontFamily: 'Helvetica-Bold',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 2,
    marginBottom: 3,
    textTransform: 'uppercase',
  },
  docTitle: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: '#1E293B',
    textAlign: 'right',
  },
  docSub: {
    fontSize: 7.5,
    color: '#64748B',
    marginTop: 1.5,
    textAlign: 'right',
  },
  policyPeriodBar: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 3,
    paddingHorizontal: 8,
    paddingVertical: 5,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  policyPeriodLabel: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#1E293B',
  },
  policyPeriodDates: {
    fontSize: 8,
    color: '#334155',
  },
  renewalDeadlineBadge: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 2,
    paddingHorizontal: 6,
    paddingVertical: 2,
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: '#991B1B',
  },

  /* KPI Summary Grid */
  kpiSection: {
    marginBottom: 10,
  },
  sectionHeading: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#0F172A',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  kpiGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 4,
    padding: 6,
  },
  kpiCardHighlight: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  kpiLabel: {
    fontSize: 6.5,
    fontFamily: 'Helvetica-Bold',
    color: '#475569',
    textTransform: 'uppercase',
  },
  kpiValue: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: '#0F172A',
    marginTop: 2,
  },
  kpiSub: {
    fontSize: 6.5,
    color: '#64748B',
    marginTop: 2,
  },

  /* Tables */
  table: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#1E293B',
    paddingVertical: 4,
    paddingHorizontal: 4,
    alignItems: 'center',
  },
  tableHeaderCell: {
    fontSize: 6.5,
    fontFamily: 'Helvetica-Bold',
    color: '#FFFFFF',
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#E2E8F0',
    paddingVertical: 3.5,
    paddingHorizontal: 4,
    alignItems: 'center',
  },
  tableRowEven: {
    backgroundColor: '#F8FAFC',
  },
  tableRowHighlight: {
    backgroundColor: '#FEF2F2',
  },
  tableCell: {
    fontSize: 7,
    color: '#1E293B',
  },
  tableCellBold: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: '#0F172A',
  },
  tableCellMuted: {
    fontSize: 6.5,
    color: '#64748B',
  },
  textRight: {
    textAlign: 'right',
  },
  textCenter: {
    textAlign: 'center',
  },

  /* Badges */
  badgeHigh: {
    backgroundColor: '#FEE2E2',
    color: '#991B1B',
    fontSize: 6,
    fontFamily: 'Helvetica-Bold',
    paddingHorizontal: 4,
    paddingVertical: 1.5,
    borderRadius: 2,
    textAlign: 'center',
  },
  badgeMedium: {
    backgroundColor: '#FEF3C7',
    color: '#92400E',
    fontSize: 6,
    fontFamily: 'Helvetica-Bold',
    paddingHorizontal: 4,
    paddingVertical: 1.5,
    borderRadius: 2,
    textAlign: 'center',
  },
  badgeLow: {
    backgroundColor: '#DCFCE7',
    color: '#166534',
    fontSize: 6,
    fontFamily: 'Helvetica-Bold',
    paddingHorizontal: 4,
    paddingVertical: 1.5,
    borderRadius: 2,
    textAlign: 'center',
  },
  badgeFault: {
    backgroundColor: '#FEE2E2',
    color: '#991B1B',
    fontSize: 6,
    fontFamily: 'Helvetica-Bold',
    paddingHorizontal: 3,
    paddingVertical: 1,
    borderRadius: 2,
  },
  badgeNonFault: {
    backgroundColor: '#DCFCE7',
    color: '#166534',
    fontSize: 6,
    fontFamily: 'Helvetica-Bold',
    paddingHorizontal: 3,
    paddingVertical: 1,
    borderRadius: 2,
  },
  badgeSplit: {
    backgroundColor: '#FEF3C7',
    color: '#92400E',
    fontSize: 6,
    fontFamily: 'Helvetica-Bold',
    paddingHorizontal: 3,
    paddingVertical: 1,
    borderRadius: 2,
  },
  badgeLate: {
    backgroundColor: '#FEE2E2',
    color: '#B91C1C',
    fontSize: 6,
    fontFamily: 'Helvetica-Bold',
    paddingHorizontal: 3,
    paddingVertical: 1,
    borderRadius: 2,
    textAlign: 'center',
  },
  badgePrompt: {
    backgroundColor: '#ECFDF5',
    color: '#047857',
    fontSize: 6,
    paddingHorizontal: 3,
    paddingVertical: 1,
    borderRadius: 2,
    textAlign: 'center',
  },

  /* Totals summary row */
  totalsRow: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderTopWidth: 1,
    borderTopColor: '#0F172A',
    paddingVertical: 4,
    paddingHorizontal: 4,
    alignItems: 'center',
  },

  /* Sign-off box */
  signoffBox: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 3,
    padding: 8,
    backgroundColor: '#F8FAFC',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  signoffColumn: {
    width: '48%',
  },
  signoffTitle: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: '#1E293B',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  signoffLine: {
    borderBottomWidth: 1,
    borderBottomColor: '#94A3B8',
    marginTop: 18,
    marginBottom: 3,
  },
  signoffDetail: {
    fontSize: 6.5,
    color: '#475569',
  },

  /* Footer */
  footer: {
    position: 'absolute',
    bottom: 12,
    left: 24,
    right: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 0.5,
    borderTopColor: '#CBD5E1',
    paddingTop: 4,
    fontSize: 6.5,
    color: '#64748B',
  },
});

interface FleetClaimExperiencePDFDocumentProps {
  summary: FleetRiskSummary;
  companyDetails?: any;
  highlightedAccidentId?: string;
}

export const FleetClaimExperiencePDFDocument: React.FC<FleetClaimExperiencePDFDocumentProps> = ({
  summary,
  companyDetails,
  highlightedAccidentId,
}) => {
  const companyName = companyDetails?.name || companyDetails?.fullName || 'AIE Skyline Limited';
  const companyAddress = companyDetails?.officialAddress || companyDetails?.addressLine1 || 'London, United Kingdom';
  const companyPhone = companyDetails?.phone || '+44 20 8050 5337';
  const companyEmail = companyDetails?.email || 'claims@aieclaims.co.uk';
  const companyLogo = companyDetails?.logoUrl || null;

  const todayStr = format(new Date(), 'dd/MM/yyyy');

  // KPI calculations
  const totalClaims = summary.totalFleetAccidents;
  const totalIncurred = summary.totalFleetIncurred;
  const tpPaid = summary.totalTpPaid;
  const tpEst = summary.totalTpEst;
  const tpPaidPlusEst = tpPaid + tpEst;
  const adPaid = summary.totalAdPaid;
  const adEst = summary.totalAdEst;
  const adPaidPlusEst = adPaid + adEst;
  const lateReportingCount = summary.totalLateReports;
  const latePercentage = summary.lateReportPercentage;

  // Chunk Claims for multi-page Experience Table Log
  // Page 1 contains Header, KPIs, and the complete or top Driver Risk Analysis Table.
  // Page 2+ contains the Claims Experience Table Log (approx 12 claims per page)
  const claimsList = summary.periodAccidents || [];
  const CLAIMS_PER_PAGE = 12;
  const claimPagesCount = Math.max(1, Math.ceil(claimsList.length / CLAIMS_PER_PAGE));

  const fmtDate = (val: any): string => {
    if (!val) return '-';
    const d = parseDateSafe(val);
    return d ? format(d, 'dd/MM/yyyy') : String(val);
  };

  const renderHeader = (subtitleText: string) => (
    <View style={pdfStyles.header}>
      <View style={pdfStyles.headerLeft}>
        {companyLogo && <Image src={companyLogo} style={pdfStyles.logo} />}
        <View>
          <Text style={pdfStyles.companyName}>{companyName}</Text>
          <Text style={pdfStyles.companyDetail}>{companyAddress}</Text>
          <Text style={pdfStyles.companyDetail}>Tel: {companyPhone} | Email: {companyEmail}</Text>
        </View>
      </View>

      <View style={pdfStyles.headerRight}>
        <Text style={pdfStyles.docBadge}>Insurance Underwriting Experience Dossier</Text>
        <Text style={pdfStyles.docTitle}>FLEET CLAIM EXPERIENCE &amp; RISK REPORT</Text>
        <Text style={pdfStyles.docSub}>{subtitleText}</Text>
        <Text style={pdfStyles.docSub}>Generated: {todayStr} | Renewal: 18 Dec 2026</Text>
      </View>
    </View>
  );

  const renderPolicyBar = () => (
    <View style={pdfStyles.policyPeriodBar}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Text style={pdfStyles.policyPeriodLabel}>Annual Policy Term: </Text>
        <Text style={pdfStyles.policyPeriodDates}>
          {summary.policyPeriod.name} ({fmtDate(summary.policyPeriod.startDate)} to {fmtDate(summary.policyPeriod.endDate)})
        </Text>
      </View>
      <Text style={pdfStyles.renewalDeadlineBadge}>Renewal Deadline: 18 December 2026</Text>
    </View>
  );

  return (
    <Document title={`Fleet_Claim_Experience_Report_${summary.policyPeriod.startDate}_to_${summary.policyPeriod.endDate}`}>
      {/* ── PAGE 1: KPI SUMMARY & DRIVER RISK ANALYSIS TABLE ── */}
      <Page size="A4" orientation="landscape" style={pdfStyles.page}>
        {renderHeader('Executive Underwriting Summary & Driver Frequency Analysis')}
        {renderPolicyBar()}

        {/* KPI Summary Cards Grid */}
        <View style={pdfStyles.kpiSection}>
          <Text style={pdfStyles.sectionHeading}>Fleet Policy Period Claim &amp; Loss Performance (KPI Summary)</Text>
          <View style={pdfStyles.kpiGrid}>
            {/* 1. Total Claims */}
            <View style={[pdfStyles.kpiCard, pdfStyles.kpiCardHighlight]}>
              <Text style={pdfStyles.kpiLabel}>Total Claims</Text>
              <Text style={pdfStyles.kpiValue}>{totalClaims}</Text>
              <Text style={pdfStyles.kpiSub}>
                {summary.totalFaultAccidents} Fault | {summary.totalNonFaultAccidents} NF | {summary.totalSplitAccidents} Split
              </Text>
            </View>

            {/* 2. Total Incurred */}
            <View style={pdfStyles.kpiCard}>
              <Text style={pdfStyles.kpiLabel}>Total Incurred (£)</Text>
              <Text style={[pdfStyles.kpiValue, { color: '#B91C1C' }]}>{formatGBP(totalIncurred)}</Text>
              <Text style={pdfStyles.kpiSub}>
                At-Fault Incurred: {formatGBP(summary.driverProfiles.reduce((acc, d) => acc + d.faultIncurred, 0))}
              </Text>
            </View>

            {/* 3. TP Paid / Est */}
            <View style={pdfStyles.kpiCard}>
              <Text style={pdfStyles.kpiLabel}>TP Paid / Est (£)</Text>
              <Text style={[pdfStyles.kpiValue, { color: '#1E3A8A' }]}>{formatGBP(tpPaidPlusEst)}</Text>
              <Text style={pdfStyles.kpiSub}>
                Paid: {formatGBP(tpPaid)} | Est: {formatGBP(tpEst)}
              </Text>
            </View>

            {/* 4. AD Paid / Est */}
            <View style={pdfStyles.kpiCard}>
              <Text style={pdfStyles.kpiLabel}>AD Paid / Est (£)</Text>
              <Text style={[pdfStyles.kpiValue, { color: '#4338CA' }]}>{formatGBP(adPaidPlusEst)}</Text>
              <Text style={pdfStyles.kpiSub}>
                Paid: {formatGBP(adPaid)} | Est: {formatGBP(adEst)}
              </Text>
            </View>

            {/* 5. Late Reporting Count */}
            <View style={pdfStyles.kpiCard}>
              <Text style={pdfStyles.kpiLabel}>Late Reporting (&gt;24h)</Text>
              <Text style={[pdfStyles.kpiValue, { color: lateReportingCount > 0 ? '#B45309' : '#15803D' }]}>
                {lateReportingCount}
              </Text>
              <Text style={pdfStyles.kpiSub}>
                {latePercentage.toFixed(1)}% of Claims | Pen: {formatGBP(summary.totalLatePenalties)}
              </Text>
            </View>
          </View>
        </View>

        {/* Driver Risk Analysis Table (Sorted from highest frequency to lowest) */}
        <View style={{ flex: 1, marginTop: 4 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <Text style={pdfStyles.sectionHeading}>
              Driver Risk Analysis Table (Sorted by Claim Frequency: Highest to Lowest)
            </Text>
            <Text style={pdfStyles.tableCellMuted}>
              {summary.driverProfiles.length} Drivers Active with Claims in Policy Period
            </Text>
          </View>

          <View style={pdfStyles.table}>
            {/* Table Header */}
            <View style={pdfStyles.tableHeaderRow}>
              <Text style={[pdfStyles.tableHeaderCell, { width: '5%', textAlign: 'center' }]}>Rank</Text>
              <Text style={[pdfStyles.tableHeaderCell, { width: '25%' }]}>Driver Information</Text>
              <Text style={[pdfStyles.tableHeaderCell, { width: '10%', textAlign: 'center' }]}>Total Claims</Text>
              <Text style={[pdfStyles.tableHeaderCell, { width: '15%', textAlign: 'center' }]}>Fault Breakdown</Text>
              <Text style={[pdfStyles.tableHeaderCell, { width: '13%', textAlign: 'right' }]}>Total Incurred (£)</Text>
              <Text style={[pdfStyles.tableHeaderCell, { width: '11%', textAlign: 'center' }]}>Late Reports (&gt;24h)</Text>
              <Text style={[pdfStyles.tableHeaderCell, { width: '10%', textAlign: 'center' }]}>Risk Level</Text>
              <Text style={[pdfStyles.tableHeaderCell, { width: '11%' }]}>Risk Rationale</Text>
            </View>

            {/* Table Body */}
            {summary.driverProfiles.slice(0, 10).map((driver: DriverRiskProfile, index: number) => {
              const isEven = index % 2 === 1;
              const isHigh = driver.riskRating === 'high';

              return (
                <View
                  key={driver.driverName}
                  style={[
                    pdfStyles.tableRow,
                    isEven ? pdfStyles.tableRowEven : {},
                    isHigh ? pdfStyles.tableRowHighlight : {},
                  ]}
                >
                  <Text style={[pdfStyles.tableCellBold, { width: '5%', textAlign: 'center' }]}>#{driver.rank}</Text>
                  <View style={{ width: '25%' }}>
                    <Text style={pdfStyles.tableCellBold}>{driver.driverName}</Text>
                    <Text style={pdfStyles.tableCellMuted}>
                      {driver.driverNIN ? `NIN: ${driver.driverNIN} ` : ''}
                      {driver.driverMobile ? `Mob: ${driver.driverMobile}` : ''}
                    </Text>
                  </View>
                  <Text style={[pdfStyles.tableCellBold, { width: '10%', textAlign: 'center' }]}>
                    {driver.totalAccidents}
                  </Text>
                  <Text style={[pdfStyles.tableCell, { width: '15%', textAlign: 'center' }]}>
                    {driver.faultCount} Fault | {driver.nonFaultCount} NF {driver.splitCount > 0 ? `| ${driver.splitCount} Sp` : ''}
                  </Text>
                  <Text style={[pdfStyles.tableCellBold, { width: '13%', textAlign: 'right' }]}>
                    {formatGBP(driver.totalIncurred)}
                  </Text>
                  <Text style={[pdfStyles.tableCell, { width: '11%', textAlign: 'center' }]}>
                    {driver.lateReportingCount > 0 ? `${driver.lateReportingCount} Late` : '0 (Prompt)'}
                  </Text>
                  <View style={{ width: '10%', alignItems: 'center' }}>
                    <Text
                      style={
                        driver.riskRating === 'high'
                          ? pdfStyles.badgeHigh
                          : driver.riskRating === 'medium'
                          ? pdfStyles.badgeMedium
                          : pdfStyles.badgeLow
                      }
                    >
                      {driver.riskRating.toUpperCase()} RISK
                    </Text>
                  </View>
                  <Text style={[pdfStyles.tableCellMuted, { width: '11%' }]}>
                    {driver.riskReasons[0] || 'Standard Profile'}
                  </Text>
                </View>
              );
            })}

            {summary.driverProfiles.length === 0 && (
              <View style={[pdfStyles.tableRow, { justifyContent: 'center', paddingVertical: 12 }]}>
                <Text style={pdfStyles.tableCellMuted}>No driver claim records registered in this policy period.</Text>
              </View>
            )}
          </View>
        </View>

        {/* Footer */}
        <View style={pdfStyles.footer} fixed>
          <Text>CONFIDENTIAL MOTOR FLEET EXPERIENCE BORDEREAU — FOR AUTHORIZED UNDERWRITERS ONLY</Text>
          <Text>Page 1 of {claimPagesCount + 1}</Text>
        </View>
      </Page>

      {/* ── PAGES 2+: CLAIMS EXPERIENCE TABLE LOG (MATCHING INSURER COLUMN STRUCTURE) ── */}
      {Array.from({ length: claimPagesCount }).map((_, pageIdx) => {
        const start = pageIdx * CLAIMS_PER_PAGE;
        const pageClaims = claimsList.slice(start, start + CLAIMS_PER_PAGE);
        const isLastPage = pageIdx === claimPagesCount - 1;

        return (
          <Page key={`claims-page-${pageIdx}`} size="A4" orientation="landscape" style={pdfStyles.page}>
            {renderHeader(`Claims Experience Log (Part ${pageIdx + 1} of ${claimPagesCount})`)}
            {renderPolicyBar()}

            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <Text style={pdfStyles.sectionHeading}>
                  Claims Experience Table Log (Insurer Bordereau Structure: ADPaid, TPPaid, Incurred, Fault, Late Reporting)
                </Text>
                <Text style={pdfStyles.tableCellMuted}>
                  Showing claims {start + 1} to {Math.min(start + CLAIMS_PER_PAGE, claimsList.length)} of {claimsList.length}
                </Text>
              </View>

              <View style={pdfStyles.table}>
                {/* Insurer Header */}
                <View style={pdfStyles.tableHeaderRow}>
                  <Text style={[pdfStyles.tableHeaderCell, { width: '8%' }]}>Claim No</Text>
                  <Text style={[pdfStyles.tableHeaderCell, { width: '8%' }]}>Acc Date</Text>
                  <Text style={[pdfStyles.tableHeaderCell, { width: '8%' }]}>Rep Date</Text>
                  <Text style={[pdfStyles.tableHeaderCell, { width: '7%', textAlign: 'center' }]}>Rep Window</Text>
                  <Text style={[pdfStyles.tableHeaderCell, { width: '13%' }]}>Driver Name</Text>
                  <Text style={[pdfStyles.tableHeaderCell, { width: '7%' }]}>Reg No</Text>
                  <Text style={[pdfStyles.tableHeaderCell, { width: '5%', textAlign: 'center' }]}>Acc Cd</Text>
                  <Text style={[pdfStyles.tableHeaderCell, { width: '7%', textAlign: 'center' }]}>Fault</Text>
                  <Text style={[pdfStyles.tableHeaderCell, { width: '8%', textAlign: 'right' }]}>AD Paid (£)</Text>
                  <Text style={[pdfStyles.tableHeaderCell, { width: '8%', textAlign: 'right' }]}>TP Paid (£)</Text>
                  <Text style={[pdfStyles.tableHeaderCell, { width: '9%', textAlign: 'right' }]}>Incurred (£)</Text>
                  <Text style={[pdfStyles.tableHeaderCell, { width: '7%', textAlign: 'right' }]}>AD Est (£)</Text>
                  <Text style={[pdfStyles.tableHeaderCell, { width: '8%', textAlign: 'right' }]}>TP Est (£)</Text>
                  <Text style={[pdfStyles.tableHeaderCell, { width: '7%', textAlign: 'center' }]}>Late (&gt;24h)</Text>
                </View>

                {/* Insurer Rows */}
                {pageClaims.map((claim: Accident, cIdx: number) => {
                  const isEven = cIdx % 2 === 1;
                  const isHighlighted = highlightedAccidentId && claim.id === highlightedAccidentId;

                  const timing = calculateReportingTiming({
                    accidentDate: claim.accidentDate,
                    accidentTime: claim.accidentTime,
                    reportedDate: claim.reportedDate,
                    reportedTime: claim.reportedTime,
                    submittedAt: claim.submittedAt,
                  });

                  const claimNo = String(claim.claimNo || claim.refNo || 'N/A');
                  const regNo = String(claim.regNo || claim.vehicleVRN || '-');
                  const accCd = String(claim.accCd || '-');
                  const fault = String(claim.fault || claim.faultType || claim.type || 'Fault');

                  const adPaidVal = Number(claim.adPaid) || 0;
                  const tpPaidVal = Number(claim.tpPaid) || 0;
                  const incurredVal = claim.incurred !== undefined && claim.incurred !== null
                    ? Number(claim.incurred)
                    : (adPaidVal + tpPaidVal);
                  const adEstVal = Number(claim.adEst) || 0;
                  const tpEstVal = claim.totalTpEst !== undefined && claim.totalTpEst !== null && Number(claim.totalTpEst) > 0
                    ? Number(claim.totalTpEst)
                    : ((Number(claim.tpPiEst) || 0) + (Number(claim.tpDamageEst) || 0) + (Number(claim.tpHireEst) || 0));

                  const isLate = timing.isLate;

                  return (
                    <View
                      key={claim.id || cIdx}
                      style={[
                        pdfStyles.tableRow,
                        isEven ? pdfStyles.tableRowEven : {},
                        isHighlighted ? { backgroundColor: '#FEF9C3' } : {},
                      ]}
                    >
                      <View style={{ width: '8%' }}>
                        <Text style={pdfStyles.tableCellBold}>{claimNo}</Text>
                        {claim.insuranceRefNo && (
                          <Text style={pdfStyles.tableCellMuted}>Ins: {claim.insuranceRefNo}</Text>
                        )}
                      </View>
                      <Text style={[pdfStyles.tableCell, { width: '8%' }]}>{fmtDate(claim.accidentDate)}</Text>
                      <Text style={[pdfStyles.tableCell, { width: '8%' }]}>
                        {fmtDate(claim.reportedDate || claim.submittedAt)}
                      </Text>
                      <Text style={[pdfStyles.tableCell, { width: '7%', textAlign: 'center' }]}>
                        {timing.timeToReportDisplay || 'N/A'}
                      </Text>
                      <View style={{ width: '13%' }}>
                        <Text style={pdfStyles.tableCellBold}>{claim.driverName || 'Unknown Driver'}</Text>
                        {claim.driverMobile && <Text style={pdfStyles.tableCellMuted}>{claim.driverMobile}</Text>}
                      </View>
                      <Text style={[pdfStyles.tableCellBold, { width: '7%' }]}>{regNo}</Text>
                      <Text style={[pdfStyles.tableCell, { width: '5%', textAlign: 'center' }]}>{accCd}</Text>
                      <View style={{ width: '7%', alignItems: 'center' }}>
                        <Text
                          style={
                            fault.toLowerCase().includes('non')
                              ? pdfStyles.badgeNonFault
                              : fault.toLowerCase().includes('split')
                              ? pdfStyles.badgeSplit
                              : pdfStyles.badgeFault
                          }
                        >
                          {fault}
                        </Text>
                      </View>
                      <Text style={[pdfStyles.tableCell, { width: '8%', textAlign: 'right' }]}>
                        {formatGBP(adPaidVal)}
                      </Text>
                      <Text style={[pdfStyles.tableCell, { width: '8%', textAlign: 'right' }]}>
                        {formatGBP(tpPaidVal)}
                      </Text>
                      <Text style={[pdfStyles.tableCellBold, { width: '9%', textAlign: 'right' }]}>
                        {formatGBP(incurredVal)}
                      </Text>
                      <Text style={[pdfStyles.tableCell, { width: '7%', textAlign: 'right' }]}>
                        {formatGBP(adEstVal)}
                      </Text>
                      <Text style={[pdfStyles.tableCell, { width: '8%', textAlign: 'right' }]}>
                        {formatGBP(tpEstVal)}
                      </Text>
                      <View style={{ width: '7%', alignItems: 'center' }}>
                        <Text style={isLate ? pdfStyles.badgeLate : pdfStyles.badgePrompt}>
                          {isLate ? 'YES' : 'NO'}
                        </Text>
                      </View>
                    </View>
                  );
                })}

                {/* Financial Totals Row on the Last Page */}
                {isLastPage && (
                  <View style={pdfStyles.totalsRow}>
                    <Text style={[pdfStyles.tableCellBold, { width: '49%' }]}>
                      TOTALS FOR POLICY PERIOD ({claimsList.length} CLAIMS):
                    </Text>
                    <Text style={[pdfStyles.tableCellBold, { width: '5%', textAlign: 'center' }]}>-</Text>
                    <Text style={[pdfStyles.tableCellBold, { width: '7%', textAlign: 'center' }]}>
                      {summary.totalFaultAccidents}F/{summary.totalNonFaultAccidents}NF
                    </Text>
                    <Text style={[pdfStyles.tableCellBold, { width: '8%', textAlign: 'right' }]}>
                      {formatGBP(adPaid)}
                    </Text>
                    <Text style={[pdfStyles.tableCellBold, { width: '8%', textAlign: 'right' }]}>
                      {formatGBP(tpPaid)}
                    </Text>
                    <Text style={[pdfStyles.tableCellBold, { width: '9%', textAlign: 'right', color: '#991B1B' }]}>
                      {formatGBP(totalIncurred)}
                    </Text>
                    <Text style={[pdfStyles.tableCellBold, { width: '7%', textAlign: 'right' }]}>
                      {formatGBP(adEst)}
                    </Text>
                    <Text style={[pdfStyles.tableCellBold, { width: '8%', textAlign: 'right' }]}>
                      {formatGBP(tpEst)}
                    </Text>
                    <Text style={[pdfStyles.tableCellBold, { width: '7%', textAlign: 'center', color: lateReportingCount > 0 ? '#B91C1C' : '#047857' }]}>
                      {lateReportingCount} LATE
                    </Text>
                  </View>
                )}
              </View>

              {/* Sign-off Box on Last Page */}
              {isLastPage && (
                <View style={pdfStyles.signoffBox}>
                  <View style={pdfStyles.signoffColumn}>
                    <Text style={pdfStyles.signoffTitle}>Declaration by Fleet Transport Management</Text>
                    <Text style={pdfStyles.signoffDetail}>
                      I hereby certify that the above claims experience and driver risk records are true, complete, and accurate representations of our fleet operations for the policy period noted.
                    </Text>
                    <View style={pdfStyles.signoffLine} />
                    <Text style={pdfStyles.signoffDetail}>Authorized Fleet Representative Signature &amp; Date</Text>
                  </View>

                  <View style={pdfStyles.signoffColumn}>
                    <Text style={pdfStyles.signoffTitle}>Underwriting &amp; Broker Review Receipt</Text>
                    <Text style={pdfStyles.signoffDetail}>
                      Received for annual commercial motor fleet renewal underwriting assessment. Terms and loss ratio calculations subject to policy conditions.
                    </Text>
                    <View style={pdfStyles.signoffLine} />
                    <Text style={pdfStyles.signoffDetail}>Insurance Underwriter / Broker Name &amp; Date</Text>
                  </View>
                </View>
              )}
            </View>

            {/* Footer */}
            <View style={pdfStyles.footer} fixed>
              <Text>CONFIDENTIAL MOTOR FLEET EXPERIENCE BORDEREAU — FOR AUTHORIZED UNDERWRITERS ONLY</Text>
              <Text>Page {pageIdx + 2} of {claimPagesCount + 1}</Text>
            </View>
          </Page>
        );
      })}
    </Document>
  );
};

export default FleetClaimExperiencePDFDocument;
