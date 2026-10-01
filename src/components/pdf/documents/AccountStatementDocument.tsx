// src/components/pdf/documents/AccountStatementDocument.tsx

import React from 'react';
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
  counterparty?: string;
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
  },
  statementDocBadge: {
    backgroundColor: '#0F172A',
    color: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 3,
    fontSize: 8.5,
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
    marginTop: 4,
    textTransform: 'uppercase',
  },
  statementRefText: {
    fontSize: 10.5,
    fontFamily: 'Helvetica-Bold',
    color: '#0F172A',
    marginTop: 4,
  },
  dateText: {
    fontSize: 7.5,
    color: '#64748B',
    marginTop: 1.5,
  },

  // Account Identification Banner
  accountBanner: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 10,
    marginBottom: 12,
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
    fontSize: 9.5,
    fontFamily: 'Helvetica-Bold',
    color: '#0F172A',
  },
  bannerSubValue: {
    fontSize: 7.5,
    color: '#475569',
    marginTop: 1,
  },

  // Executive KPI Cards (4 columns)
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

  // Ledger Table
  table: {
    width: '100%',
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    overflow: 'hidden',
    marginBottom: 12,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#0F172A',
    paddingVertical: 5,
    paddingHorizontal: 6,
  },
  tableHeaderCell: {
    color: '#FFFFFF',
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 5,
    paddingHorizontal: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E2E8F0',
    alignItems: 'center',
  },
  tableRowEven: {
    backgroundColor: '#F8FAFC',
  },
  tableCell: {
    fontSize: 7.5,
    color: '#1E293B',
  },
  tableCellBold: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    color: '#0F172A',
  },
  totalRow: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderTopWidth: 1,
    borderTopColor: '#0F172A',
  },

  // Notes & Certification
  notesBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 8,
    marginBottom: 12,
  },
  notesTitle: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    color: '#475569',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  notesText: {
    fontSize: 7.5,
    color: '#334155',
    lineHeight: 1.3,
  },

  // Footer & Authorized Sign-Off
  footerSection: {
    borderTopWidth: 1,
    borderTopColor: '#CBD5E1',
    paddingTop: 10,
    marginTop: 'auto',
  },
  signOffRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 8,
  },
  signCol: {
    width: '46%',
  },
  signatureImageContainer: {
    height: 38,
    justifyContent: 'flex-end',
    marginBottom: 3,
  },
  signatureImage: {
    width: 120,
    height: 36,
    objectFit: 'contain',
  },
  signLine: {
    borderTopWidth: 1,
    borderTopColor: '#94A3B8',
    paddingTop: 3,
  },
  signLabel: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    color: '#0F172A',
  },
  signSignerText: {
    fontSize: 7,
    color: '#334155',
    marginTop: 1,
    fontFamily: 'Helvetica-Bold',
  },
  signMetaText: {
    fontSize: 6.5,
    color: '#64748B',
    marginTop: 0.5,
  },
  legalDisclaimer: {
    fontSize: 6.5,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 1.25,
  },
  pageNumber: {
    position: 'absolute',
    fontSize: 7,
    bottom: 12,
    right: 32,
    color: '#94A3B8',
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

  const companyName =
    companyDetails?.fullName || companyDetails?.tradingName || 'AIE Skyline Limited';
  const companyAddress =
    companyDetails?.officialAddress || 'Unit 4, Business Park, London, United Kingdom';
  const companyPhone = companyDetails?.phone || '+44 20 8123 4567';
  const companyEmail = companyDetails?.email || 'accounts@aieskyline.co.uk';

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

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* ── HEADER ROW ── */}
        <View style={styles.headerRow}>
          <View style={styles.logoContainer}>
            {companyLogo ? (
              <Image src={companyLogo} style={styles.companyLogo} />
            ) : (
              <Text style={styles.companyTitle}>{companyName}</Text>
            )}
            <Text style={styles.companySubText}>{companyAddress}</Text>
            <Text style={styles.companySubText}>
              Tel: {companyPhone} • Email: {companyEmail}
            </Text>
            {companyDetails?.vatNumber && (
              <Text style={styles.companySubText}>
                VAT Reg: {companyDetails.vatNumber} • Co. No: {companyDetails.companyNumber || '12345678'}
              </Text>
            )}
          </View>

          <View style={styles.headerBadgeContainer}>
            <Text style={styles.statementDocBadge}>Official Account Statement</Text>
            <Text style={styles.typePill}>{periodBadgeText}</Text>
            <Text style={styles.statementRefText}>{data.statementReference}</Text>
            <Text style={styles.dateText}>Period: {data.periodLabel}</Text>
            <Text style={styles.dateText}>Issued: {fmtDate(data.generatedDate)}</Text>
          </View>
        </View>

        {/* ── ACCOUNT HOLDER & SUMMARY DETAILS BANNER ── */}
        <View style={styles.accountBanner}>
          <View style={styles.bannerCol}>
            <Text style={styles.bannerLabel}>Account Holder / Account Name</Text>
            <Text style={styles.bannerValue}>{data.account.name}</Text>
            <Text style={styles.bannerSubValue}>
              Classification: {data.account.accountType || 'General Operating Account'}
            </Text>
          </View>

          <View style={styles.bannerCol}>
            <Text style={styles.bannerLabel}>Currency &amp; Asset Link</Text>
            <Text style={styles.bannerValue}>{data.account.currency || 'GBP (£)'}</Text>
            <Text style={styles.bannerSubValue}>
              {data.account.vehicleName
                ? `Vehicle: ${data.account.vehicleName}`
                : 'General Operating Ledger Account'}
            </Text>
          </View>

          <View style={styles.bannerCol}>
            <Text style={styles.bannerLabel}>Statement Period</Text>
            <Text style={styles.bannerValue}>{data.periodLabel}</Text>
            <Text style={styles.bannerSubValue}>
              {fmtDate(data.dateFrom)} to {fmtDate(data.dateTo)}
            </Text>
          </View>

          <View style={[styles.bannerCol, { alignItems: 'flex-end' }]}>
            <Text style={styles.bannerLabel}>Closing Ledger Balance</Text>
            <Text
              style={[
                styles.bannerValue,
                data.closingBalance < 0 ? { color: '#BE123C' } : { color: '#15803D' },
              ]}
            >
              {fmt(data.closingBalance)}
            </Text>
            <Text style={styles.bannerSubValue}>
              Net Change: {data.netMovement >= 0 ? '+' : ''}
              {fmt(data.netMovement)}
            </Text>
          </View>
        </View>

        {/* ── EXECUTIVE KPI FINANCIAL METRICS (4 CARDS) ── */}
        <View style={styles.kpiGrid}>
          {/* 1. Opening Balance */}
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Opening Balance</Text>
            <Text style={styles.kpiValue}>{fmt(data.openingBalance)}</Text>
            <Text style={styles.kpiSubText}>As of {fmtDate(data.dateFrom)}</Text>
          </View>

          {/* 2. Total Inflows (Credits) */}
          <View style={styles.kpiCardHighlight}>
            <Text style={[styles.kpiLabel, { color: '#166534' }]}>Total Inflows (Credits)</Text>
            <Text style={styles.kpiValueGreen}>+{fmt(data.totalInflows)}</Text>
            <Text style={styles.kpiSubText}>{data.inflowCount} Credit Transactions</Text>
          </View>

          {/* 3. Total Outflows (Debits) */}
          <View style={styles.kpiCardNegative}>
            <Text style={[styles.kpiLabel, { color: '#9F1239' }]}>Total Outflows (Debits)</Text>
            <Text style={styles.kpiValueRed}>-{fmt(data.totalOutflows)}</Text>
            <Text style={styles.kpiSubText}>{data.outflowCount} Debit Disbursements</Text>
          </View>

          {/* 4. Closing Balance */}
          <View
            style={data.closingBalance < 0 ? styles.kpiCardNegative : styles.kpiCardHighlight}
          >
            <Text style={styles.kpiLabel}>Closing Balance</Text>
            <Text
              style={data.closingBalance < 0 ? styles.kpiValueRed : styles.kpiValueGreen}
            >
              {fmt(data.closingBalance)}
            </Text>
            <Text style={styles.kpiSubText}>
              Net Move: {data.netMovement >= 0 ? '+' : ''}
              {fmt(data.netMovement)}
            </Text>
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

        {/* ── ITEMIZED STATEMENT TRANSACTION LEDGER ── */}
        {data.includeLedger !== false && (
          <View>
            <Text style={styles.sectionHeader}>
              Itemized Transaction Activity Ledger ({data.transactions.length} entries)
            </Text>
            <View style={styles.table}>
              {/* Table Header */}
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, { width: '13%' }]}>Date</Text>
                <Text style={[styles.tableHeaderCell, { width: '15%' }]}>Reference #</Text>
                <Text style={[styles.tableHeaderCell, { width: '32%' }]}>Description / Counterparty</Text>
                <Text style={[styles.tableHeaderCell, { width: '14%' }]}>Category</Text>
                <Text style={[styles.tableHeaderCell, { width: '13%', textAlign: 'right' }]}>Money Out</Text>
                <Text style={[styles.tableHeaderCell, { width: '13%', textAlign: 'right' }]}>Money In</Text>
              </View>

              {/* Rows (First 15 on page 1, or compact summary) */}
              {data.transactions.slice(0, 16).map((tx, idx) => {
                const isDebit = tx.type === 'debit';
                const isEven = idx % 2 === 1;
                return (
                  <View
                    key={tx.id || `stmt-tx-${idx}`}
                    style={[styles.tableRow, isEven ? styles.tableRowEven : {}]}
                  >
                    <Text style={[styles.tableCell, { width: '13%' }]}>
                      {fmtDate(tx.date)}
                    </Text>
                    <Text style={[styles.tableCellBold, { width: '15%' }]}>
                      {tx.reference || 'TXN-GEN'}
                    </Text>
                    <Text style={[styles.tableCell, { width: '32%' }]} numberOfLines={1}>
                      {tx.description || tx.counterparty || 'General Account Transaction'}
                    </Text>
                    <Text style={[styles.tableCell, { width: '14%', color: '#64748B' }]} numberOfLines={1}>
                      {tx.category || 'General'}
                    </Text>
                    <Text
                      style={[
                        styles.tableCellBold,
                        { width: '13%', textAlign: 'right', color: isDebit ? '#BE123C' : '#94A3B8' },
                      ]}
                    >
                      {isDebit ? fmt(tx.amount) : '—'}
                    </Text>
                    <Text
                      style={[
                        styles.tableCellBold,
                        { width: '13%', textAlign: 'right', color: !isDebit ? '#15803D' : '#94A3B8' },
                      ]}
                    >
                      {!isDebit ? fmt(tx.amount) : '—'}
                    </Text>
                  </View>
                );
              })}

              {data.transactions.length === 0 && (
                <View style={[styles.tableRow, { justifyContent: 'center', paddingVertical: 10 }]}>
                  <Text style={{ fontSize: 8, color: '#94A3B8', textAlign: 'center' }}>
                    No recorded transactions during this statement period.
                  </Text>
                </View>
              )}

              {/* Statement Total Summary Row */}
              <View style={styles.totalRow}>
                <Text style={[styles.tableCellBold, { width: '60%' }]}>
                  Statement Net Movement ({data.periodLabel})
                </Text>
                <Text style={[styles.tableCellBold, { width: '14%', color: '#475569' }]}>
                  Net: {data.netMovement >= 0 ? '+' : ''}{fmt(data.netMovement)}
                </Text>
                <Text style={[styles.tableCellBold, { width: '13%', textAlign: 'right', color: '#BE123C' }]}>
                  -{fmt(data.totalOutflows)}
                </Text>
                <Text style={[styles.tableCellBold, { width: '13%', textAlign: 'right', color: '#15803D' }]}>
                  +{fmt(data.totalInflows)}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* ── NOTES IF PROVIDED ── */}
        {data.notes && (
          <View style={styles.notesBox}>
            <Text style={styles.notesTitle}>Statement Remarks &amp; Compliance Notes</Text>
            <Text style={styles.notesText}>{data.notes}</Text>
          </View>
        )}

        {/* ── FOOTER & AUTHORIZED SIGN-OFF ── */}
        <View style={styles.footerSection}>
          <View style={styles.signOffRow}>
            {/* Authorized Finance Office Signature */}
            <View style={styles.signCol}>
              <View style={styles.signatureImageContainer}>
                {companySignature ? (
                  <Image src={companySignature} style={styles.signatureImage} />
                ) : (
                  <View style={{ height: 36 }} />
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
                <View style={{ height: 36 }} />
              </View>
              <View style={styles.signLine}>
                <Text style={styles.signLabel}>Account Holder / Designated Officer</Text>
                <Text style={styles.signSignerText}>{data.account.name}</Text>
                <Text style={styles.signMetaText}>
                  Verification Acknowledgement • Period Ending {fmtDate(data.dateTo)}
                </Text>
              </View>
            </View>
          </View>

          <Text style={styles.legalDisclaimer}>
            This official account statement is generated directly from the AIE Skyline Fleet &amp; Financial Management System. All opening balances, inflows, outflows, and closing balances reflect verified double-entry General Ledger transactions. Any discrepancies must be reported to {companyEmail} within 14 business days.
          </Text>
        </View>

        <Text
          style={styles.pageNumber}
          render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
          fixed
        />
      </Page>
    </Document>
  );
};

export default AccountStatementDocument;
