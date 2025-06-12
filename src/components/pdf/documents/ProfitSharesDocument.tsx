// src/components/pdf/documents/ProfitSharesDocument.tsx

import React from 'react';
import { Document, Page, Text, View, Image } from '@react-pdf/renderer';
import { ProfitShare } from '../../../types/incomeExpense';
import { styles } from '../styles';
import { format } from 'date-fns';

interface Props {
  shares: ProfitShare[];
  companyDetails: {
    logoUrl?: string;
    fullName: string;
    officialAddress: string;
    phone: string;
    email: string;
  };
  title?: string;
}

const formatDate = (iso?: string) =>
  iso ? format(new Date(iso), 'dd/MM/yyyy') : '—';

const fmt = (n: number | undefined) => `£${(n ?? 0).toFixed(2)}`;

const ProfitSharesDocument: React.FC<Props> = ({
  shares,
  companyDetails,
  title = 'Profit Share History'
}) => {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          {companyDetails.logoUrl ? (
            <Image src={companyDetails.logoUrl} style={styles.logo} />
          ) : null}
          <View style={styles.companyInfo}>
            <Text>{companyDetails.fullName}</Text>
            <Text>{companyDetails.officialAddress}</Text>
            <Text>Tel: {companyDetails.phone}</Text>
            <Text>Email: {companyDetails.email}</Text>
          </View>
        </View>

        {/* Title */}
        <View style={styles.titleContainer}>
          <Text style={styles.title}>{title}</Text>
        </View>

        {/* Table Header */}
        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeaderCell, { width: '25%' }]}>Date Range</Text>
          <Text style={[styles.tableHeaderCell, { width: '25%' }]}>Recipient</Text>
          <Text style={[styles.tableHeaderCell, { width: '25%' }]}>% Share</Text>
          <Text style={[styles.tableHeaderCell, { width: '25%' }]}>Amount</Text>
        </View>

        {/* Table Rows */}
        {shares.flatMap((share) =>
          share.recipients.map((r, i) => (
            <View key={`${share.id}-${i}`} style={styles.tableRow}>
              <Text style={[styles.tableCell, { width: '25%' }]}>
                {formatDate(share.startDate)} → {formatDate(share.endDate)}
              </Text>
              <Text style={[styles.tableCell, { width: '25%' }]}>{r.name}</Text>
              <Text style={[styles.tableCell, { width: '25%' }]}>{r.percentage}%</Text>
              <Text style={[styles.tableCell, { width: '25%' }]}>{fmt(r.amount)}</Text>
            </View>
          ))
        )}

        {/* Footer */}
        <Text style={styles.footer}>
          {companyDetails.fullName} | Generated on {format(new Date(), 'dd/MM/yyyy HH:mm')}
        </Text>

        {/* Page Number */}
        <Text style={styles.pageNumber}>Page 1 of 1</Text>
      </Page>
    </Document>
  );
};

export default ProfitSharesDocument;
