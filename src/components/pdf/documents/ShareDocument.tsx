// src/components/pdf/documents/ShareDocument.tsx

import React from 'react';
import { Document, Page, Text, View, Image } from '@react-pdf/renderer';
import { format } from 'date-fns';
import { ShareEntry, ExpenseEntry } from '../../../types/share';
import { styles } from '../styles'; // Assuming 'styles.ts' contains the shared styles
import { formatDate } from '../../../utils/dateHelpers';

interface ShareDocumentProps {
  data: ShareEntry;
  companyDetails: {
    logoUrl: string;
    fullName: string;
    officialAddress: string; // This will be split
    phone: string;
    email: string;
  };
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

  // Derive header details from companyDetails, splitting the address
  const headerDetails = {
    logoUrl: companyDetails?.logoUrl || '',
    fullName: companyDetails?.fullName || 'AIE Skyline Limited',
    addressLine1: 'United House, 39-41 North Road,',
    addressLine2: 'London, N7 9DP.',
    phone: companyDetails?.phone || 'N/A',
    email: companyDetails?.email || 'N/A',
  };

  return (
    <Document>
      <Page size="A4" style={styles.page} wrap>
        {/* HEADER - Updated to match the consistent design */}
        <View style={styles.header} fixed>
          <View style={styles.headerLeft}>
            {headerDetails.logoUrl && (
              <Image src={headerDetails.logoUrl} style={styles.logo} />
            )}
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.companyName}>{headerDetails.fullName}</Text>
            <Text style={styles.companyDetail}>{headerDetails.addressLine1}</Text>
            <Text style={styles.companyDetail}>{headerDetails.addressLine2}</Text>
            <Text style={styles.companyDetail}>Tel: {headerDetails.phone}</Text>
            <Text style={styles.companyDetail}>Email: {headerDetails.email}</Text>
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

        {/* FOOTER - Updated to match the consistent design */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            AIE SKYLINE LIMITED, registered in England and Wales with the company registration number 15616639, registered office address: United House, 39-41 North Road, London, N7 9DP. VAT. NO. 453448875
          </Text>
          <Text
            style={styles.pageNumber}
            render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  );
};

export default ShareDocument;