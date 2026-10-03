// src/components/pdf/documents/PayoutReceiptDocument.tsx
import React from 'react';
import { Document, Page, Text, View, Image, StyleSheet } from '@react-pdf/renderer';
import defaultCompanySignature from '../../../assets/signiture.png';
import defaultCompanyLogo from '../../../assets/logo.png';
import SafePdfLogo from '../SafePdfLogo';
import { extractActiveCorporateEntityProfile } from '../../../utils/legalDocumentUtils';

// Helper to safely check and validate image sources for @react-pdf/renderer
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

export interface PayoutReceiptData {
  payoutReference: string;
  payoutDate: Date | string;
  periodCovered: string;
  vehicleName?: string;
  registrationNumber?: string;
  sourceAccountName?: string;
  companyAccountName?: string;
  grossBilled: number;
  expenses: number;
  netProfit: number;
  companySharePct: number;
  companyShareAmount: number;
  ownerName: string;
  ownerSharePct: number;
  ownerShareAmount: number;
  clearedBalanceAmount?: number;
  clearOwingBalance?: boolean;
  shares?: Array<{
    ownerName: string;
    sharePercentage: number;
    shareAmount: number;
    isCompany?: boolean;
  }>;
  createdBy?: string;
  notes?: string;
}

interface PayoutReceiptDocumentProps {
  data: PayoutReceiptData;
  companyDetails?: {
    logoUrl?: string;
    logo?: string;
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
  };
}

const styles = StyleSheet.create({
  page: {
    padding: 36,
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: '#1E293B',
    lineHeight: 1.4,
    backgroundColor: '#FFFFFF',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1.5,
    borderBottomColor: '#0F172A',
    paddingBottom: 16,
    marginBottom: 16,
  },
  logoContainer: {
    maxWidth: 160,
  },
  companyLogo: {
    width: 120,
    height: 40,
    objectFit: 'contain',
    marginBottom: 4,
  },
  companyTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  companySubText: {
    fontSize: 8,
    color: '#64748B',
    marginTop: 2,
  },
  receiptBadgeContainer: {
    alignItems: 'flex-end',
  },
  docBadge: {
    backgroundColor: '#0F172A',
    color: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    fontSize: 9,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  receiptRef: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#0F172A',
    marginTop: 6,
  },
  dateText: {
    fontSize: 8.5,
    color: '#64748B',
    marginTop: 2,
  },
  metaGrid: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    marginBottom: 16,
  },
  metaCol: {
    flex: 1,
  },
  metaLabel: {
    fontSize: 7.5,
    fontWeight: 'bold',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  metaValue: {
    fontSize: 9.5,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#0F172A',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingBottom: 4,
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 10,
  },
  summaryCardNet: {
    flex: 1,
    backgroundColor: '#ECFDF5',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    padding: 10,
  },
  cardLabel: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  cardValue: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#0F172A',
    marginTop: 4,
  },
  cardValueGreen: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#059669',
    marginTop: 4,
  },
  table: {
    width: '100%',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    overflow: 'hidden',
    marginBottom: 16,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#0F172A',
    paddingVertical: 7,
    paddingHorizontal: 8,
  },
  tableHeaderCell: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    alignItems: 'center',
  },
  tableRowEven: {
    backgroundColor: '#F8FAFC',
  },
  tableCell: {
    fontSize: 8.5,
    color: '#1E293B',
  },
  tableCellBold: {
    fontSize: 8.5,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  badgePill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
    fontSize: 7.5,
    fontWeight: 'bold',
    alignSelf: 'flex-start',
  },
  badgeCompany: {
    backgroundColor: '#EEF2FF',
    color: '#4338CA',
  },
  badgePartner: {
    backgroundColor: '#ECFDF5',
    color: '#047857',
  },
  totalRow: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderTopWidth: 1.5,
    borderTopColor: '#0F172A',
  },
  clearanceNotice: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#86EFAC',
    borderRadius: 6,
    padding: 10,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  clearanceText: {
    fontSize: 8.5,
    color: '#166534',
    fontWeight: 'bold',
  },
  clearanceAmount: {
    fontSize: 10,
    color: '#15803D',
    fontWeight: 'bold',
  },
  footerSection: {
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 12,
    marginTop: 'auto',
  },
  signOffRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 12,
  },
  signCol: {
    width: '46%',
  },
  signatureImageContainer: {
    height: 42,
    justifyContent: 'flex-end',
    marginBottom: 4,
  },
  signatureImage: {
    width: 125,
    height: 40,
    objectFit: 'contain',
  },
  signLine: {
    borderTopWidth: 1,
    borderTopColor: '#94A3B8',
    paddingTop: 4,
  },
  signLabel: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#0F172A',
  },
  signSignerText: {
    fontSize: 7.5,
    color: '#334155',
    marginTop: 2,
    fontFamily: 'Helvetica-Bold',
  },
  signMetaText: {
    fontSize: 7,
    color: '#64748B',
    marginTop: 1,
  },
  footerLegal: {
    fontSize: 7,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 1.3,
  },
});

export const PayoutReceiptDocument: React.FC<PayoutReceiptDocumentProps> = ({
  data,
  companyDetails,
}) => {
  const fmt = (val: number | undefined) => `£${Number(val || 0).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const fmtDate = (d?: Date | string) => {
    if (!d) return '—';
    try {
      const parsed = d instanceof Date ? d : new Date(d);
      return parsed.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return String(d);
    }
  };

  const activeProfile = extractActiveCorporateEntityProfile(companyDetails);
  const companyName = activeProfile.companyName || companyDetails?.fullName || companyDetails?.tradingName || 'Fleet Operator';
  const companyAddress = activeProfile.companyAddress || companyDetails?.officialAddress || 'United Kingdom';
  const companyPhone = activeProfile.phone || companyDetails?.phone || '+44 20 8123 4567';
  const companyEmail = activeProfile.email || companyDetails?.email || 'info@aieskyline.co.uk';
  const companyWebsite = activeProfile.website || companyDetails?.website || '';

  // Automatically resolve company signature and logo with fallbacks
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

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* HEADER ROW */}
        <View style={styles.headerRow}>
          <View style={styles.logoContainer}>
            <SafePdfLogo
              src={companyLogo}
              companyName={companyName}
              style={styles.companyLogo}
              textStyle={styles.companyTitle}
            />
            <Text style={styles.companySubText}>{companyAddress}</Text>
            <Text style={styles.companySubText}>Tel: {companyPhone} | Email: {companyEmail}{Boolean(companyWebsite) ? ` | Web: ${companyWebsite}` : ''}</Text>
          </View>

          <View style={styles.receiptBadgeContainer}>
            <Text style={styles.docBadge}>Profit Payout Receipt</Text>
            <Text style={styles.receiptRef}>{data.payoutReference || 'REF-N/A'}</Text>
            <Text style={styles.dateText}>Date Paid: {fmtDate(data.payoutDate)}</Text>
            <Text style={styles.dateText}>Period: {data.periodCovered || 'All Time'}</Text>
          </View>
        </View>

        {/* METADATA SUMMARY GRID */}
        <View style={styles.metaGrid}>
          <View style={styles.metaCol}>
            <Text style={styles.metaLabel}>Vehicle Asset</Text>
            <Text style={styles.metaValue}>{data.vehicleName || data.registrationNumber || 'Shared Fleet Asset'}</Text>
          </View>
          <View style={styles.metaCol}>
            <Text style={styles.metaLabel}>Source Account</Text>
            <Text style={styles.metaValue}>{data.sourceAccountName || 'Vehicle Operating Account'}</Text>
          </View>
          <View style={styles.metaCol}>
            <Text style={styles.metaLabel}>Co-Owner / Recipient</Text>
            <Text style={styles.metaValue}>{data.ownerName || 'Partner Co-Owner'}</Text>
          </View>
          <View style={styles.metaCol}>
            <Text style={styles.metaLabel}>Committed By</Text>
            <Text style={styles.metaValue}>{data.createdBy || 'Finance Manager'}</Text>
          </View>
        </View>

        {/* FINANCIAL SUMMARY CARDS */}
        <Text style={styles.sectionTitle}>Financial Performance Breakdown</Text>
        <View style={styles.summaryGrid}>
          <View style={styles.summaryCard}>
            <Text style={styles.cardLabel}>Gross Billed / Revenue</Text>
            <Text style={styles.cardValue}>{fmt(data.grossBilled)}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.cardLabel}>Operating Expenses</Text>
            <Text style={styles.cardValue}>-{fmt(data.expenses)}</Text>
          </View>
          <View style={styles.summaryCardNet}>
            <Text style={styles.cardLabel}>Net Profit for Distribution</Text>
            <Text style={styles.cardValueGreen}>{fmt(data.netProfit)}</Text>
          </View>
        </View>

        {/* FINALIZED SHARES & TRANSFERS TABLE */}
        <Text style={styles.sectionTitle}>Finalized Profit Share Distribution & Ledger Entries</Text>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, { width: '28%' }]}>Stakeholder / Recipient</Text>
            <Text style={[styles.tableHeaderCell, { width: '14%' }]}>Share %</Text>
            <Text style={[styles.tableHeaderCell, { width: '24%' }]}>Transfer Type</Text>
            <Text style={[styles.tableHeaderCell, { width: '20%' }]}>Destination Account</Text>
            <Text style={[styles.tableHeaderCell, { width: '14%', textAlign: 'right' }]}>Amount (£)</Text>
          </View>

          {data.shares && data.shares.length > 0 ? (
            data.shares.map((share, sIdx) => {
              const isComp = share.isCompany || share.ownerName.toLowerCase().includes('skyline') || share.ownerName.toLowerCase().includes('company');
              return (
                <View key={`share-${sIdx}`} style={[styles.tableRow, sIdx % 2 === 1 ? styles.tableRowEven : {}]}>
                  <View style={{ width: '28%' }}>
                    <Text style={styles.tableCellBold}>{share.ownerName}</Text>
                    <Text style={{ fontSize: 7, color: '#64748B' }}>{isComp ? 'Operating Company' : 'Co-Owner Partner'}</Text>
                  </View>
                  <View style={{ width: '14%' }}>
                    <Text style={[styles.badgePill, isComp ? styles.badgeCompany : styles.badgePartner]}>{share.sharePercentage}%</Text>
                  </View>
                  <View style={{ width: '24%' }}>
                    <Text style={styles.tableCell}>{isComp ? 'Internal Transfer' : 'Direct Profit Payout'}</Text>
                  </View>
                  <View style={{ width: '20%' }}>
                    <Text style={styles.tableCell}>{isComp ? (data.companyAccountName || 'AIE SKYLINE ACCOUNTS') : 'External Bank Transfer'}</Text>
                  </View>
                  <View style={{ width: '14%' }}>
                    <Text style={[styles.tableCellBold, { textAlign: 'right', color: isComp ? '#0F172A' : '#047857' }]}>{fmt(share.shareAmount)}</Text>
                  </View>
                </View>
              );
            })
          ) : (
            <>
              {/* Row 1: Company Share */}
              <View style={styles.tableRow}>
                <View style={{ width: '28%' }}>
                  <Text style={styles.tableCellBold}>AIE Skyline Limited</Text>
                  <Text style={{ fontSize: 7, color: '#64748B' }}>Operating Company</Text>
                </View>
                <View style={{ width: '14%' }}>
                  <Text style={[styles.badgePill, styles.badgeCompany]}>{data.companySharePct}%</Text>
                </View>
                <View style={{ width: '24%' }}>
                  <Text style={styles.tableCell}>Internal Transfer</Text>
                </View>
                <View style={{ width: '20%' }}>
                  <Text style={styles.tableCell}>{data.companyAccountName || 'AIE SKYLINE ACCOUNTS'}</Text>
                </View>
                <View style={{ width: '14%' }}>
                  <Text style={[styles.tableCellBold, { textAlign: 'right' }]}>{fmt(data.companyShareAmount)}</Text>
                </View>
              </View>

              {/* Row 2: Partner / Co-Owner Share */}
              <View style={[styles.tableRow, styles.tableRowEven]}>
                <View style={{ width: '28%' }}>
                  <Text style={styles.tableCellBold}>{data.ownerName}</Text>
                  <Text style={{ fontSize: 7, color: '#64748B' }}>Co-Owner Partner</Text>
                </View>
                <View style={{ width: '14%' }}>
                  <Text style={[styles.badgePill, styles.badgePartner]}>{data.ownerSharePct}%</Text>
                </View>
                <View style={{ width: '24%' }}>
                  <Text style={styles.tableCell}>Direct Profit Payout</Text>
                </View>
                <View style={{ width: '20%' }}>
                  <Text style={styles.tableCell}>External Bank Transfer</Text>
                </View>
                <View style={{ width: '14%' }}>
                  <Text style={[styles.tableCellBold, { textAlign: 'right', color: '#047857' }]}>{fmt(data.ownerShareAmount)}</Text>
                </View>
              </View>
            </>
          )}

          {/* Total Row */}
          <View style={styles.totalRow}>
            <Text style={[styles.tableCellBold, { width: '42%' }]}>Total Distributed Net Profit</Text>
            <Text style={[styles.tableCellBold, { width: '44%' }]}>100.0% Normalized Split</Text>
            <Text style={[styles.tableCellBold, { width: '14%', textAlign: 'right' }]}>
              {fmt(data.companyShareAmount + data.ownerShareAmount)}
            </Text>
          </View>
        </View>

        {/* PERIOD CLEARANCE & BALANCE ZERO-OUT NOTICE */}
        {data.clearOwingBalance && (data.clearedBalanceAmount ?? 0) > 0 && (
          <View style={styles.clearanceNotice}>
            <Text style={styles.clearanceText}>
              ✓ Period Marked as Cleared — Reconciled and zeroed out Owing to Owners balance.
            </Text>
            <Text style={styles.clearanceAmount}>Cleared: {fmt(data.clearedBalanceAmount)}</Text>
          </View>
        )}

        {/* NOTES IF PROVIDED */}
        {data.notes ? (
          <View style={{ marginBottom: 16 }}>
            <Text style={styles.metaLabel}>Settlement Notes</Text>
            <Text style={{ fontSize: 8.5, color: '#475569' }}>{data.notes}</Text>
          </View>
        ) : null}

        {/* FOOTER & SIGN-OFF */}
        <View style={styles.footerSection}>
          <View style={styles.signOffRow}>
            {/* Authorised Company Signature (Finance Office) */}
            <View style={styles.signCol}>
              <View style={styles.signatureImageContainer}>
                {isValidPdfImageSrc(companySignature) ? (
                  <Image src={companySignature} style={styles.signatureImage} />
                ) : (
                  <View style={{ height: 40 }} />
                )}
              </View>
              <View style={styles.signLine}>
                <Text style={styles.signLabel}>Authorised Signature (Company Office)</Text>
                <Text style={styles.signSignerText}>{companyName}</Text>
                <Text style={styles.signMetaText}>Signed on: {fmtDate(data.payoutDate)} • Finance Authorized</Text>
              </View>
            </View>

            {/* Partner Acknowledgement */}
            <View style={styles.signCol}>
              <View style={styles.signatureImageContainer}>
                <View style={{ height: 40 }} />
              </View>
              <View style={styles.signLine}>
                <Text style={styles.signLabel}>Partner Acknowledgement / Date</Text>
                <Text style={styles.signSignerText}>{data.ownerName}</Text>
                <Text style={styles.signMetaText}>Co-Owner Settlement Confirmation • {fmtDate(data.payoutDate)}</Text>
              </View>
            </View>
          </View>
          <Text style={styles.footerLegal}>
            This document confirms the profit share distribution calculated in accordance with the registered Vehicle Shared Ownership Model. Ledger transfer entries and payment vouchers have been committed to the General Ledger. Generated by AIE Skyline Fleet Management System.
          </Text>
        </View>
      </Page>
    </Document>
  );
};

export default PayoutReceiptDocument;
