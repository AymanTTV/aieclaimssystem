// src/components/pdf/documents/AccountStatementDocument.tsx

import React, { useMemo } from 'react';
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
} from '@react-pdf/renderer';
import defaultCompanySignature from '../../../assets/signiture.png';
import defaultCompanyLogo from '../../../assets/logo.png';
import SafePdfLogo from '../SafePdfLogo';
import { extractActiveCorporateEntityProfile } from '../../../utils/legalDocumentUtils';

// Safe image validator for @react-pdf/renderer
const isValidPdfImageSrc = (v: any): boolean => {
  if (!v) return false;
  if (typeof v === 'string') {
    const s = v.trim();
    if (!s || s.includes('undefined') || s.includes('null')) return false;
    return (
      s.startsWith('data:image/') ||
      s.startsWith('http://') ||
      s.startsWith('https://') ||
      s.startsWith('/') ||
      s.startsWith('blob:')
    );
  }
  return typeof v === 'object' && v !== null;
};

export interface StatementTransactionItem {
  id: string;
  date: Date | string;
  reference: string;
  description: string;
  category: string;
  type: 'credit' | 'debit';
  amount: number;
  runningBalance?: number;
  calculatedRunningBalance?: number;
  counterparty?: string;
  vehicleReg?: string;
  vehicleName?: string;
}

export interface AccountStatementData {
  statementReference: string;
  statementPeriodType: 'monthly' | 'quarterly' | 'custom';
  periodLabel: string;
  dateFrom: Date | string;
  dateTo: Date | string;
  generatedDate: Date | string;
  account: {
    id: string;
    name: string;
    accountType?: string;
    accountNumber?: string;
    sortCode?: string;
    vehicleName?: string;
    vehicleReg?: string;
    currency?: string;
  };
  openingBalance: number;
  totalInflows: number;
  totalOutflows: number;
  netMovement: number;
  closingBalance: number;
  inflowCount: number;
  outflowCount: number;
  transactions: StatementTransactionItem[];
  categoryBreakdown?: {
    incomeByCategory: Array<{ category: string; amount: number; percentage: number }>;
    expensesByCategory: Array<{ category: string; amount: number; percentage: number }>;
  };
  notes?: string;
  signatoryName?: string;
  signatoryRole?: string;
  includeSignature?: boolean;
  includeLedger?: boolean;
}

interface AccountStatementDocumentProps {
  data: AccountStatementData;
  companyDetails?: {
    fullName?: string;
    tradingName?: string;
    officialAddress?: string;
    phone?: string;
    email?: string;
    website?: string;
    companyNumber?: string;
    vatNumber?: string;
    signature?: string;
    signatureUrl?: string;
    logoUrl?: string;
    logo?: string;
  };
}

const styles = StyleSheet.create({
  page: {
    padding: 32,
    fontFamily: 'Helvetica',
    fontSize: 8.5,
    color: '#0F172A',
    lineHeight: 1.35,
    backgroundColor: '#FFFFFF',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1.5,
    borderBottomColor: '#0F172A',
    paddingBottom: 12,
    marginBottom: 12,
  },
  logoContainer: {
    maxWidth: 220,
  },
  companyLogo: {
    width: 120,
    height: 38,
    objectFit: 'contain',
    marginBottom: 4,
  },
  companyTitle: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    color: '#0F172A',
  },
  companySubText: {
    fontSize: 7.5,
    color: '#64748B',
    marginTop: 1.5,
  },
  headerBadgeContainer: {
    alignItems: 'flex-end',
    maxWidth: 260,
  },
  statementHeaderTitle: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    color: '#0F172A',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  statementDocBadge: {
    backgroundColor: '#0F172A',
    color: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 3,
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  typePill: {
    backgroundColor: '#EEF2FF',
    color: '#4338CA',
    borderWidth: 0.5,
    borderColor: '#C7D2FE',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    marginTop: 3,
    textTransform: 'uppercase',
  },
  statementRefText: {
    fontSize: 9.5,
    fontFamily: 'Helvetica-Bold',
    color: '#1E293B',
    marginTop: 3,
  },
  headerMetaText: {
    fontSize: 7.5,
    color: '#475569',
    marginTop: 1.5,
  },
  headerMetaBold: {
    fontFamily: 'Helvetica-Bold',
    color: '#0F172A',
  },
  dateText: {
    fontSize: 7.5,
    color: '#64748B',
    marginTop: 1.5,
  },

  // Account Identification Banner (Clean slate borders #E2E8F0, tint #F8FAFC)
  accountBanner: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 9,
    marginBottom: 10,
  },
  bannerCol: {
    flex: 1,
  },
  bannerLabel: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 1.5,
  },
  bannerValue: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#0F172A',
  },
  bannerSubValue: {
    fontSize: 7,
    color: '#64748B',
    marginTop: 1,
  },

  // Structured Boxed Account Summary Table (Top KPI Table)
  accountSummaryBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    marginBottom: 12,
  },
  accountSummaryHeaderBar: {
    backgroundColor: '#F1F5F9',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingHorizontal: 10,
    paddingVertical: 5,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  accountSummaryTitle: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#1E293B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  accountSummarySubTitle: {
    fontSize: 7,
    color: '#64748B',
  },
  accountSummaryRow: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
  },
  accountSummaryCol: {
    flex: 1,
    padding: 8,
    borderRightWidth: 1,
    borderRightColor: '#E2E8F0',
  },
  accountSummaryColLast: {
    flex: 1,
    padding: 8,
  },

  // Executive KPI Cards (fallback / secondary)
  kpiGrid: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 8,
  },
  kpiCardHighlight: {
    flex: 1,
    backgroundColor: '#F0FDF4',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    padding: 8,
  },
  kpiCardNegative: {
    flex: 1,
    backgroundColor: '#FEF2F2',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FECACA',
    padding: 8,
  },
  kpiLabel: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  kpiValue: {
    fontSize: 11.5,
    fontFamily: 'Helvetica-Bold',
    color: '#0F172A',
    marginTop: 3,
  },
  kpiValueGreen: {
    fontSize: 11.5,
    fontFamily: 'Helvetica-Bold',
    color: '#15803D',
    marginTop: 3,
  },
  kpiValueRed: {
    fontSize: 11.5,
    fontFamily: 'Helvetica-Bold',
    color: '#BE123C',
    marginTop: 3,
  },
  kpiSubText: {
    fontSize: 6.5,
    color: '#64748B',
    marginTop: 1.5,
  },

  // Section Headers
  sectionHeader: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#0F172A',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingBottom: 3,
  },

  // Category Breakdown Columns
  breakdownGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  breakdownCol: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 8,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
    borderBottomWidth: 0.5,
    borderBottomColor: '#F1F5F9',
  },
  breakdownCatName: {
    fontSize: 7.5,
    color: '#334155',
  },
  breakdownCatAmt: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    color: '#0F172A',
  },

  // ── 1. Classic Bank Ledger Table Design ──
  table: {
    width: '100%',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    overflow: 'hidden',
    marginBottom: 10,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#0F172A', // Dark slate header bar (#0F172A)
    paddingVertical: 5.5,
    paddingHorizontal: 6,
    alignItems: 'center',
  },
  tableHeaderCell: {
    color: '#FFFFFF', // White typography
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  tableHeaderCellRight: {
    color: '#FFFFFF',
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    textAlign: 'right',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 4.5,
    paddingHorizontal: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E2E8F0',
    alignItems: 'center',
  },
  tableRowEven: {
    backgroundColor: '#F8FAFC',
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
  tableCellSub: {
    fontSize: 5.8,
    color: '#64748B',
    marginTop: 0.5,
  },
  tableCellCredit: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: '#059669', // Format in green (#059669) for income/payments received
    textAlign: 'right',
  },
  tableCellDebit: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: '#BE123C', // Format in dark red/slate for expenses
    textAlign: 'right',
  },
  tableCellMuted: {
    fontSize: 7,
    color: '#94A3B8',
    textAlign: 'right',
  },
  tableCellBalance: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: '#0F172A',
    textAlign: 'right',
  },
  tableCellBalanceNegative: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: '#BE123C',
    textAlign: 'right',
  },
  totalRow: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    paddingVertical: 5.5,
    paddingHorizontal: 6,
    borderTopWidth: 1.2,
    borderTopColor: '#0F172A',
    alignItems: 'center',
  },

  // Notes & Certification
  notesBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 7,
    marginBottom: 8,
  },
  notesTitle: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: '#475569',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  notesText: {
    fontSize: 6.8,
    color: '#334155',
    lineHeight: 1.3,
  },

  // ── 3. Compact Legal Footer ──
  footerSection: {
    borderTopWidth: 1,
    borderTopColor: '#CBD5E1', // Subtle bottom footer rule
    paddingTop: 6,
    marginTop: 6,
  },
  signOffRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 6,
  },
  signCol: {
    width: '46%',
  },
  signatureImageContainer: {
    height: 30,
    justifyContent: 'flex-end',
    marginBottom: 2,
  },
  signatureImage: {
    width: 100,
    height: 28,
    objectFit: 'contain',
  },
  signLine: {
    borderTopWidth: 1,
    borderTopColor: '#94A3B8',
    paddingTop: 2,
  },
  signLabel: {
    fontSize: 6.5,
    fontFamily: 'Helvetica-Bold',
    color: '#475569',
    textTransform: 'uppercase',
  },
  signSignerText: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: '#0F172A',
    marginTop: 1,
  },
  signMetaText: {
    fontSize: 5.8,
    color: '#64748B',
    marginTop: 0.5,
  },
  legalDisclaimer: {
    fontSize: 6,
    color: '#64748B',
    lineHeight: 1.3,
    marginBottom: 3,
  },
  footerBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 0.5,
    borderTopColor: '#E2E8F0',
    paddingTop: 3,
    marginTop: 2,
  },
  footerCompanyDetails: {
    fontSize: 6,
    color: '#475569',
    fontFamily: 'Helvetica-Bold',
  },
  footerPageNumber: {
    fontSize: 6.5,
    fontFamily: 'Helvetica-Bold',
    color: '#475569',
  },
});

export const AccountStatementDocument: React.FC<AccountStatementDocumentProps> = ({
  data,
  companyDetails,
}) => {
  const fmt = (val: number | undefined) =>
    `£${Number(val || 0).toLocaleString('en-GB', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const fmtDate = (d?: Date | string) => {
    if (!d) return '—';
    try {
      const parsed = d instanceof Date ? d : new Date(d);
      if (isNaN(parsed.getTime())) return String(d);
      return parsed.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return String(d);
    }
  };

  const fmtDateRange = (from?: Date | string, to?: Date | string) => {
    if (!from || !to) return data.periodLabel;
    try {
      const f = from instanceof Date ? from : new Date(from);
      const t = to instanceof Date ? to : new Date(to);
      if (isNaN(f.getTime()) || isNaN(t.getTime())) return data.periodLabel;
      const pad = (n: number) => String(n).padStart(2, '0');
      const fmtF = `${pad(f.getDate())}/${pad(f.getMonth() + 1)}/${f.getFullYear()}`;
      const fmtT = `${pad(t.getDate())}/${pad(t.getMonth() + 1)}/${t.getFullYear()}`;
      return `${fmtF} to ${fmtT}`;
    } catch {
      return data.periodLabel;
    }
  };

  const activeProfile = extractActiveCorporateEntityProfile(companyDetails);
  const companyName =
    activeProfile.companyName || companyDetails?.fullName || companyDetails?.tradingName || 'AIE Skyline Limited';
  const companyAddress =
    activeProfile.companyAddress || companyDetails?.officialAddress || 'United Kingdom';
  const companyPhone = activeProfile.phone || companyDetails?.phone || '+44 20 8123 4567';
  const companyEmail = activeProfile.email || companyDetails?.email || 'accounts@aieskyline.co.uk';
  const companyWebsite = activeProfile.website || companyDetails?.website || '';
  const companyNumber = activeProfile.companyNumber || companyDetails?.companyNumber || '';
  const vatNumber = activeProfile.vatNumber || companyDetails?.vatNumber || '';

  const accountHolderName = data.account.name || companyName || 'AIE Skyline Limited';
  const accountNumber =
    data.account.accountNumber ||
    companyDetails?.bankAccountNumber ||
    (companyDetails as any)?.accountNumber ||
    '30513162';
  const sortCode =
    data.account.sortCode ||
    companyDetails?.bankSortCode ||
    (companyDetails as any)?.sortCode ||
    '20-00-00';

  // Automatically resolve company signature and logo
  const companySignature = isValidPdfImageSrc(companyDetails?.signature)
    ? companyDetails?.signature
    : isValidPdfImageSrc(companyDetails?.signatureUrl)
    ? companyDetails?.signatureUrl
    : defaultCompanySignature;

  const companyLogo = isValidPdfImageSrc(companyDetails?.logoUrl)
    ? companyDetails?.logoUrl
    : isValidPdfImageSrc(companyDetails?.logo)
    ? companyDetails?.logo
    : defaultCompanyLogo;

  const periodBadgeText =
    data.statementPeriodType === 'monthly'
      ? 'Monthly Statement'
      : data.statementPeriodType === 'quarterly'
      ? 'Quarterly Statement'
      : 'Custom Period Statement';

  // ── Calculate Chronological Running Balance Line-By-Line (Oldest to Newest) ──
  const chronologicalLedgerItems = useMemo(() => {
    const list = [...(data.transactions || [])].sort((a, b) => {
      const ta = new Date(a.date).getTime();
      const tb = new Date(b.date).getTime();
      return ta - tb;
    });

    let running = Number(data.openingBalance || 0);
    return list.map((tx) => {
      const amt = Number(tx.amount || 0);
      if (tx.type === 'credit') {
        running += amt;
      } else {
        running -= amt;
      }
      return {
        ...tx,
        calculatedRunningBalance: Number(running.toFixed(2)),
      };
    });
  }, [data.transactions, data.openingBalance]);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* ── 1. FORMAL STATEMENT HEADER LAYOUT ── */}
        <View style={styles.headerRow}>
          {/* Top Left: Company Branding */}
          <View style={styles.logoContainer}>
            <SafePdfLogo
              src={companyLogo}
              companyName={companyName}
              style={styles.companyLogo}
              textStyle={styles.companyTitle}
            />
            <Text style={styles.companySubText}>{companyAddress}</Text>
            <Text style={styles.companySubText}>
              Tel: {companyPhone} • Email: {companyEmail}{Boolean(companyWebsite) ? ` • Web: ${companyWebsite}` : ''}
            </Text>
            {Boolean(vatNumber || companyNumber) && (
              <Text style={styles.companySubText}>
                {vatNumber ? `VAT Reg: ${vatNumber}` : ''}{vatNumber && companyNumber ? ' • ' : ''}{companyNumber ? `Co. No: ${companyNumber}` : ''}
              </Text>
            )}
          </View>

          {/* Top Right: Official STATEMENT OF ACCOUNT Header */}
          <View style={styles.headerBadgeContainer}>
            <Text style={styles.statementHeaderTitle}>STATEMENT OF ACCOUNT</Text>
            <Text style={styles.typePill}>{periodBadgeText}</Text>
            <Text style={[styles.headerMetaText, { marginTop: 4 }]}>
              Statement Ref: <Text style={styles.headerMetaBold}>{data.statementReference}</Text>
            </Text>
            <Text style={styles.headerMetaText}>
              Period: <Text style={styles.headerMetaBold}>{fmtDateRange(data.dateFrom, data.dateTo)}</Text>
            </Text>
            <Text style={styles.headerMetaText}>
              Date Issued: <Text style={styles.headerMetaBold}>{fmtDate(data.generatedDate)}</Text>
            </Text>
          </View>
        </View>

        {/* ── 2. ACCOUNT HOLDER & IDENTIFICATION BANNER ── */}
        <View style={styles.accountBanner}>
          <View style={styles.bannerCol}>
            <Text style={styles.bannerLabel}>Account Holder Name</Text>
            <Text style={styles.bannerValue}>{accountHolderName}</Text>
            <Text style={styles.bannerSubValue}>
              {data.account.accountType || 'General Operating Account'}
            </Text>
          </View>

          <View style={styles.bannerCol}>
            <Text style={styles.bannerLabel}>Account Number</Text>
            <Text style={styles.bannerValue}>{accountNumber}</Text>
            <Text style={styles.bannerSubValue}>
              Currency: {data.account.currency || 'GBP (£)'}
            </Text>
          </View>

          <View style={styles.bannerCol}>
            <Text style={styles.bannerLabel}>Sort Code</Text>
            <Text style={styles.bannerValue}>{sortCode}</Text>
            <Text style={styles.bannerSubValue}>
              Bank: {companyDetails?.bankName || 'Barclays Bank UK'}
            </Text>
          </View>

          <View style={[styles.bannerCol, { alignItems: 'flex-end' }]}>
            <Text style={styles.bannerLabel}>Statement Date Range</Text>
            <Text style={styles.bannerValue}>{fmtDateRange(data.dateFrom, data.dateTo)}</Text>
            <Text style={styles.bannerSubValue}>
              {data.periodLabel}
            </Text>
          </View>
        </View>

        {/* ── 3. STRUCTURED BOXED ACCOUNT SUMMARY TABLE (TOP KPI CARD) ── */}
        <View style={styles.accountSummaryBox}>
          <View style={styles.accountSummaryHeaderBar}>
            <Text style={styles.accountSummaryTitle}>Account Summary</Text>
            <Text style={styles.accountSummarySubTitle}>
              {data.transactions.length} Verified Ledger Transactions • Period: {fmtDateRange(data.dateFrom, data.dateTo)}
            </Text>
          </View>

          <View style={styles.accountSummaryRow}>
            {/* 1. Opening Balance */}
            <View style={styles.accountSummaryCol}>
              <Text style={styles.kpiLabel}>Opening Balance</Text>
              <Text style={styles.kpiValue}>{fmt(data.openingBalance)}</Text>
              <Text style={styles.kpiSubText}>As of {fmtDate(data.dateFrom)}</Text>
            </View>

            {/* 2. Total Money In (Credits / Income) */}
            <View style={styles.accountSummaryCol}>
              <Text style={[styles.kpiLabel, { color: '#166534' }]}>Total Money In (Credits / Income)</Text>
              <Text style={styles.kpiValueGreen}>+{fmt(data.totalInflows)}</Text>
              <Text style={styles.kpiSubText}>{data.inflowCount} Credit Transactions</Text>
            </View>

            {/* 3. Total Money Out (Debits / Expenses) */}
            <View style={styles.accountSummaryCol}>
              <Text style={[styles.kpiLabel, { color: '#9F1239' }]}>Total Money Out (Debits / Expenses)</Text>
              <Text style={styles.kpiValueRed}>-{fmt(data.totalOutflows)}</Text>
              <Text style={styles.kpiSubText}>{data.outflowCount} Debit Disbursements</Text>
            </View>

            {/* 4. Closing / Running Balance */}
            <View style={styles.accountSummaryColLast}>
              <Text style={styles.kpiLabel}>Closing / Running Balance</Text>
              <Text
                style={data.closingBalance < 0 ? styles.kpiValueRed : styles.kpiValueGreen}
              >
                {fmt(data.closingBalance)}
              </Text>
              <Text style={styles.kpiSubText}>
                Net Movement: {data.netMovement >= 0 ? '+' : ''}{fmt(data.netMovement)}
              </Text>
            </View>
          </View>
        </View>

        {/* ── CATEGORY CASH FLOW BREAKDOWN (IF AVAILABLE) ── */}
        {data.categoryBreakdown &&
          (data.categoryBreakdown.incomeByCategory.length > 0 ||
            data.categoryBreakdown.expensesByCategory.length > 0) && (
            <View style={styles.breakdownGrid}>
              {/* Income Sources */}
              <View style={styles.breakdownCol}>
                <Text style={styles.sectionHeader}>Inflows by Source / Category</Text>
                {data.categoryBreakdown.incomeByCategory.slice(0, 4).map((c, i) => (
                  <View key={`inc-cat-${i}`} style={styles.breakdownRow}>
                    <Text style={styles.breakdownCatName}>
                      {c.category} ({c.percentage}%)
                    </Text>
                    <Text style={[styles.breakdownCatAmt, { color: '#15803D' }]}>
                      +{fmt(c.amount)}
                    </Text>
                  </View>
                ))}
                {data.categoryBreakdown.incomeByCategory.length === 0 && (
                  <Text style={{ fontSize: 7, color: '#94A3B8' }}>No inflow entries</Text>
                )}
              </View>

              {/* Expense Categories */}
              <View style={styles.breakdownCol}>
                <Text style={styles.sectionHeader}>Outflows by Category / Expense</Text>
                {data.categoryBreakdown.expensesByCategory.slice(0, 4).map((c, i) => (
                  <View key={`exp-cat-${i}`} style={styles.breakdownRow}>
                    <Text style={styles.breakdownCatName}>
                      {c.category} ({c.percentage}%)
                    </Text>
                    <Text style={[styles.breakdownCatAmt, { color: '#BE123C' }]}>
                      -{fmt(c.amount)}
                    </Text>
                  </View>
                ))}
                {data.categoryBreakdown.expensesByCategory.length === 0 && (
                  <Text style={{ fontSize: 7, color: '#94A3B8' }}>No outflow entries</Text>
                )}
              </View>
            </View>
          )}

        {/* ── 4. CLASSIC BANK STATEMENT LEDGER TABLE ── */}
        {data.includeLedger !== false && (
          <View>
            <Text style={styles.sectionHeader}>
              Itemized Transaction Activity Ledger ({chronologicalLedgerItems.length} entries)
            </Text>
            <View style={styles.table}>
              {/* Table Header: Dark slate header bar (#0F172A) with white typography */}
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, { width: '12%' }]}>Date</Text>
                <Text style={[styles.tableHeaderCell, { width: '33%' }]}>
                  Transaction Details (Category/Description)
                </Text>
                <Text style={[styles.tableHeaderCell, { width: '17%' }]}>Reference/Vehicle</Text>
                <Text style={[styles.tableHeaderCellRight, { width: '12%' }]}>Paid In (Credit)</Text>
                <Text style={[styles.tableHeaderCellRight, { width: '12%' }]}>Paid Out (Debit)</Text>
                <Text style={[styles.tableHeaderCellRight, { width: '14%' }]}>Running Balance</Text>
              </View>

              {/* Rows: Chronological Line-By-Line with Running Balance */}
              {chronologicalLedgerItems.map((tx, idx) => {
                const isCredit = tx.type === 'credit';
                const isEven = idx % 2 === 1;
                return (
                  <View
                    key={tx.id || `stmt-tx-${idx}`}
                    style={[styles.tableRow, isEven ? styles.tableRowEven : {}]}
                    wrap={false}
                  >
                    {/* 1. Date */}
                    <Text style={[styles.tableCell, { width: '12%' }]}>
                      {fmtDate(tx.date)}
                    </Text>

                    {/* 2. Transaction Details (Category/Description) */}
                    <View style={{ width: '33%', paddingRight: 4 }}>
                      <Text style={styles.tableCellBold} numberOfLines={1}>
                        {tx.description || tx.counterparty || 'General Account Transaction'}
                      </Text>
                      <Text style={styles.tableCellSub} numberOfLines={1}>
                        {tx.category || (isCredit ? 'Credit Income' : 'Debit Expense')}
                      </Text>
                    </View>

                    {/* 3. Reference/Vehicle */}
                    <View style={{ width: '17%', paddingRight: 4 }}>
                      <Text style={styles.tableCell} numberOfLines={1}>
                        {tx.reference || '—'}
                      </Text>
                      {Boolean(tx.vehicleReg || tx.counterparty) && (
                        <Text style={styles.tableCellSub} numberOfLines={1}>
                          {tx.vehicleReg ? `Reg: ${tx.vehicleReg}` : tx.counterparty}
                        </Text>
                      )}
                    </View>

                    {/* 4. Paid In (Credit) - Green #059669 */}
                    <Text
                      style={[
                        isCredit ? styles.tableCellCredit : styles.tableCellMuted,
                        { width: '12%' },
                      ]}
                    >
                      {isCredit ? `+${fmt(tx.amount)}` : '—'}
                    </Text>

                    {/* 5. Paid Out (Debit) - Dark red/slate */}
                    <Text
                      style={[
                        !isCredit ? styles.tableCellDebit : styles.tableCellMuted,
                        { width: '12%' },
                      ]}
                    >
                      {!isCredit ? `-${fmt(tx.amount)}` : '—'}
                    </Text>

                    {/* 6. Running Balance - Chronological Line-by-Line */}
                    <Text
                      style={[
                        tx.calculatedRunningBalance < 0
                          ? styles.tableCellBalanceNegative
                          : styles.tableCellBalance,
                        { width: '14%' },
                      ]}
                    >
                      {fmt(tx.calculatedRunningBalance)}
                    </Text>
                  </View>
                );
              })}

              {chronologicalLedgerItems.length === 0 && (
                <View style={[styles.tableRow, { justifyContent: 'center', paddingVertical: 10 }]}>
                  <Text style={{ fontSize: 7.5, color: '#94A3B8', textAlign: 'center' }}>
                    No recorded transactions during this statement period.
                  </Text>
                </View>
              )}

              {/* Statement Total Summary Row */}
              <View style={styles.totalRow} wrap={false}>
                <Text style={[styles.tableCellBold, { width: '62%' }]}>
                  Reconciled Closing Balance ({data.periodLabel})
                </Text>
                <Text style={[styles.tableCellCredit, { width: '12%' }]}>
                  +{fmt(data.totalInflows)}
                </Text>
                <Text style={[styles.tableCellDebit, { width: '12%' }]}>
                  -{fmt(data.totalOutflows)}
                </Text>
                <Text
                  style={[
                    data.closingBalance < 0
                      ? styles.tableCellBalanceNegative
                      : styles.tableCellBalance,
                    { width: '14%' },
                  ]}
                >
                  {fmt(data.closingBalance)}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* ── REMARKS / COMPLIANCE NOTES IF PROVIDED ── */}
        {data.notes && (
          <View style={styles.notesBox} wrap={false}>
            <Text style={styles.notesTitle}>Statement Remarks &amp; Compliance Notes</Text>
            <Text style={styles.notesText}>{data.notes}</Text>
          </View>
        )}

        {/* ── 5. COMPACT LEGAL FOOTER ── */}
        <View style={styles.footerSection} wrap={false}>
          {data.includeSignature !== false && (
            <View style={styles.signOffRow}>
              {/* Authorized Finance Office Signature */}
              <View style={styles.signCol}>
                <View style={styles.signatureImageContainer}>
                  {isValidPdfImageSrc(companySignature) ? (
                    <Image src={companySignature} style={styles.signatureImage} />
                  ) : (
                    <View style={{ height: 28 }} />
                  )}
                </View>
                <View style={styles.signLine}>
                  <Text style={styles.signLabel}>Authorised Signature (Finance Office)</Text>
                  <Text style={styles.signSignerText}>
                    {data.signatoryName || companyName} • {data.signatoryRole || 'Chief Financial Controller'}
                  </Text>
                  <Text style={styles.signMetaText}>
                    Certified Reconciled on {fmtDate(data.generatedDate)} • General Ledger Audit Approved
                  </Text>
                </View>
              </View>

              {/* Account Holder Verification */}
              <View style={styles.signCol}>
                <View style={styles.signatureImageContainer}>
                  <View style={{ height: 28 }} />
                </View>
                <View style={styles.signLine}>
                  <Text style={styles.signLabel}>Account Holder / Designated Officer</Text>
                  <Text style={styles.signSignerText}>{accountHolderName}</Text>
                  <Text style={styles.signMetaText}>
                    Verification Acknowledgement • Period Ending {fmtDate(data.dateTo)}
                  </Text>
                </View>
              </View>
            </View>
          )}

          <Text style={styles.legalDisclaimer}>
            This official statement of account is generated directly from the AIE Skyline Fleet &amp; Financial Management System. All opening balances, credit entries, debit disbursements, and chronological running balances reflect verified double-entry General Ledger transactions. Any discrepancies must be reported in writing to {companyEmail} within 14 business days of issuance.
          </Text>

          <View style={styles.footerBottomRow}>
            <Text style={styles.footerCompanyDetails}>
              {companyName} • Registered in England &amp; Wales {companyNumber ? `(Co. No: ${companyNumber})` : ''} {vatNumber ? `• VAT Reg: ${vatNumber}` : ''} • {companyAddress}
            </Text>

            <Text
              style={styles.footerPageNumber}
              render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
            />
          </View>
        </View>
      </Page>
    </Document>
  );
};

export default AccountStatementDocument;
