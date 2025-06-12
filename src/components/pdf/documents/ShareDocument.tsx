// src/components/pdf/documents/ShareDocument.tsx

import React from 'react';
import { Document, Page, Text, View, Image } from '@react-pdf/renderer';
import { format } from 'date-fns';
import { ShareEntry, ExpenseEntry } from '../../../types/share';
import { styles } from '../styles';
import { formatDate } from '../../../utils/dateHelpers';

interface ShareDocumentProps {
  data: ShareEntry;
  companyDetails: any;
}

const ShareDocument: React.FC<ShareDocumentProps> = ({ data, companyDetails }) => {
  const isExpense = data.type === 'expense';

  // Pull items for expense (fallback to empty array)
  const items = isExpense
    ? (Array.isArray((data as ExpenseEntry).items) ? (data as ExpenseEntry).items : [])
    : [];

  // Build income columns if needed
  const incomeCols: { label: string; value: number }[] = [
    { label: 'VD Profit',     value: (data as any).vdProfit     || 0 },
    { label: 'Actual Paid',   value: (data as any).actualPaid   || 0 },
    { label: 'Legal Fee',     value: (data as any).legalFeeCost || 0 },
    // … include other reason-based cols …
    { label: 'Net Total',     value: (data as any).amount      || 0 },
  ];

  const fmt = (n: number) => `£${n.toFixed(2)}`;

  return (
    <Document>
      <Page size="A4" style={styles.page} wrap>
        {/* HEADER */}
        <View style={styles.header} fixed>
          <Image src={companyDetails.logoUrl} style={styles.logo} />
          <View style={styles.headerRight}>
            <Text style={styles.companyName}>{companyDetails.fullName}</Text>
            <Text style={styles.companyDetail}>{companyDetails.officialAddress}</Text>
            <Text style={styles.companyDetail}>Tel: {companyDetails.phone}</Text>
            <Text style={styles.companyDetail}>Email: {companyDetails.email}</Text>
          </View>
        </View>

        {/* TITLE */}
        <View style={styles.titleContainer} wrap={false}>
          <Text style={styles.title}>
            {isExpense ? 'Expense Record' : 'Share Record'}
          </Text>
        </View>

        {/* BASIC INFO */}
        <View style={[styles.card, { marginBottom: 20 }]} wrap={false}>
          <Text style={styles.sectionTitle}>Basic Information</Text>
          <View style={styles.flexRow}>
            <Text style={styles.label}>Date:</Text>
            <Text style={styles.value}>{formatDate(data.date)}</Text>
          </View>
          <View style={styles.flexRow}>
            <Text style={styles.label}>Client Name:</Text>
            <Text style={styles.value}>{data.clientName}</Text>
          </View>
          <View style={styles.flexRow}>
            <Text style={styles.label}>Claim Ref:</Text>
            <Text style={styles.value}>{data.claimRef}</Text>
          </View>
        </View>

        {/* DETAILS TABLE */}
        {isExpense ? (
          <View style={styles.sectionBreak} wrap={false}>
            <Text style={styles.sectionTitle}>Expenses</Text>
            <View style={styles.table}>
              {/* Header */}
              <View style={styles.tableHeader}>
                <Text style={styles.tableHeaderCell}>Type</Text>
                <Text style={styles.tableHeaderCell}>Description</Text>
                <Text style={styles.tableHeaderCell}>Qty</Text>
                <Text style={styles.tableHeaderCell}>Unit Price</Text>
                <Text style={styles.tableHeaderCell}>VAT?</Text>
                <Text style={styles.tableHeaderCell}>Line Total</Text>
              </View>
              {/* Rows */}
              {items.map((exp, i) => (
                <View key={i} style={styles.tableRow}>
                  <Text style={styles.tableCell}>{exp.type}</Text>
                  <Text style={styles.tableCell}>{exp.description}</Text>
                  <Text style={styles.tableCell}>{exp.quantity}</Text>
                  <Text style={styles.tableCell}>{fmt(exp.unitPrice)}</Text>
                  <Text style={styles.tableCell}>{exp.vat ? '20%' : '0%'}</Text>
                  <Text style={styles.tableCell}>
                    {fmt(exp.quantity * exp.unitPrice * (exp.vat ? 1.2 : 1))}
                  </Text>
                </View>
              ))}
              {items.length === 0 && (
                <View style={styles.tableRow}>
                  <Text style={styles.tableCell} colSpan={6}>\-- No expenses --</Text>
                </View>
              )}
            </View>
          </View>
        ) : (
          <View style={styles.sectionBreak} wrap={false}>
            <Text style={styles.sectionTitle}>Financial Details</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                {incomeCols.map(col => (
                  <Text key={col.label} style={styles.tableHeaderCell}>
                    {col.label}
                  </Text>
                ))}
              </View>
              <View style={styles.tableRow}>
                {incomeCols.map(col => (
                  <Text key={col.label} style={styles.tableCell}>
                    {fmt(col.value)}
                  </Text>
                ))}
              </View>
            </View>
          </View>
        )}

        {/* FOOTER */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            AIE Skyline Limited | Registered in England and Wales | Company No: 12592207
          </Text>
          <Text style={styles.footerText}>
            Generated on {format(new Date(), 'dd/MM/yyyy HH:mm')}
          </Text>
        </View>
      </Page>
    </Document>
  );
};

export default ShareDocument;
