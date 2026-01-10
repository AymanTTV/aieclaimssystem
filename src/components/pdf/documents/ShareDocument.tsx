// src/components/pdf/documents/ShareDocument.tsx

import React from 'react';
import { Document, Page, Text, View, Image } from '@react-pdf/renderer';
import { ShareEntry, ExpenseEntry } from '../../../types/share';
import { styles } from '../styles'; 
import { formatDate } from '../../../utils/dateHelpers';

interface ShareDocumentProps {
  data: ShareEntry;
  companyDetails: {
    logoUrl: string;
    fullName: string;
    officialAddress: string;
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
    
    // --- NEW: Commission (Displayed as negative to indicate deduction) ---
    ...( (data as any).commissionCost 
        ? [{ label: 'Commission', value: -((data as any).commissionCost) }] 
        : []
    ),
    // -------------------------------------------------------------------

    // Conditional costs
    ...( (data as any).storageCost  ? [{ label: 'Storage Cost',  value: (data as any).storageCost }] : []),
    ...( (data as any).recoveryCost ? [{ label: 'Recovery Cost', value: (data as any).recoveryCost }] : []),
    ...( (data as any).piCost       ? [{ label: 'PI Cost',       value: (data as any).piCost }] : []),
    
    { label: 'Net Total',     value: (data as any).amount      || 0 },
  ];

  const fmt = (n: number) => `£${n.toFixed(2)}`;

  // Derive header details
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
      <Page size="A4" style={styles.page}>
        {/* HEADER */}
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
        <View style={styles.titleContainer}>
          <Text style={styles.title}>
            {isExpense ? 'Expense Record' : 'Share Record'}
          </Text>
        </View>

        {/* INFORMATION BLOCKS */}
        {/* Using a Container View with explicit column direction usually helps flow, 
            but here we use row for side-by-side. 
            CRITICAL FIX: Removed height: '100%' from cards to prevent overlap. */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 }}>
          
          {/* Left Block: Basic & Vehicle */}
          <View style={{ width: '48%' }}>
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Transaction Details</Text>
              <View style={styles.flexRow}>
                <Text style={styles.label}>Date:</Text>
                <Text style={styles.value}>{formatDate(data.date)}</Text>
              </View>
              <View style={styles.flexRow}>
                <Text style={styles.label}>Ref:</Text>
                <Text style={styles.value}>{data.claimRef}</Text>
              </View>
              <View style={styles.flexRow}>
                <Text style={styles.label}>Status:</Text>
                <Text style={styles.value}>{data.progress}</Text>
              </View>
              
              {/* Vehicle Info Sub-section */}
              <Text style={[styles.sectionTitle, { marginTop: 10, fontSize: 10, color: '#6b7280' }]}>Related Vehicle</Text>
              {data.vehicleName ? (
                 <Text style={styles.value}>{data.vehicleName}</Text>
              ) : (
                 <Text style={[styles.value, { color: '#9ca3af' }]}>No vehicle linked</Text>
              )}
            </View>
          </View>

          {/* Right Block: Client Details */}
          <View style={{ width: '48%' }}>
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Client Information</Text>
              <View style={styles.flexRow}>
                <Text style={styles.label}>Name:</Text>
                <Text style={styles.value}>{data.clientName}</Text>
              </View>
              {data.clientPhone && (
                <View style={styles.flexRow}>
                    <Text style={styles.label}>Phone:</Text>
                    <Text style={styles.value}>{data.clientPhone}</Text>
                </View>
              )}
              {data.clientEmail && (
                <View style={styles.flexRow}>
                    <Text style={styles.label}>Email:</Text>
                    <Text style={styles.value}>{data.clientEmail}</Text>
                </View>
              )}
              {data.clientAddress && (
                <View style={{ marginTop: 4 }}>
                    <Text style={styles.label}>Address:</Text>
                    <Text style={styles.value}>{data.clientAddress}</Text>
                </View>
              )}
            </View>
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
                <Text style={[styles.tableHeaderCell, { width: '35%' }]}>Description</Text>
                <Text style={styles.tableHeaderCell}>Qty</Text>
                <Text style={styles.tableHeaderCell}>Unit</Text>
                <Text style={styles.tableHeaderCell}>Total</Text>
              </View>
              {/* Rows */}
              {items.map((exp, i) => (
                <View key={i} style={styles.tableRow}>
                  <Text style={styles.tableCell}>{exp.type}</Text>
                  <Text style={[styles.tableCell, { width: '35%' }]}>{exp.description}</Text>
                  <Text style={styles.tableCell}>{exp.quantity}</Text>
                  <Text style={styles.tableCell}>{fmt(exp.unitPrice)}</Text>
                  <Text style={styles.tableCell}>
                    {fmt(exp.quantity * exp.unitPrice * (exp.vat ? 1.2 : 1))}
                  </Text>
                </View>
              ))}
              {items.length === 0 && (
                <View style={styles.tableRow}>
                  <Text style={styles.tableCell} colSpan={6}>-- No expenses --</Text>
                </View>
              )}
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 }}>
                <Text style={[styles.value, { fontWeight: 'bold', fontSize: 12 }]}>Total Cost: {fmt((data as any).totalCost)}</Text>
            </View>
          </View>
        ) : (
          <View style={styles.sectionBreak} wrap={false}>
            <Text style={styles.sectionTitle}>Financial Details</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                {incomeCols.map(col => (
                  <Text key={col.label} style={[styles.tableHeaderCell, { flex: 1 }]}>
                    {col.label}
                  </Text>
                ))}
              </View>
              <View style={styles.tableRow}>
                {incomeCols.map(col => (
                  <Text key={col.label} style={[styles.tableCell, { flex: 1 }]}>
                    {fmt(col.value)}
                  </Text>
                ))}
              </View>
            </View>
          </View>
        )}

        {/* NOTES SECTION */}
        {data.notes && (
            <View style={[styles.sectionBreak, { marginTop: 20 }]} wrap={false}>
                <Text style={styles.sectionTitle}>Notes</Text>
                <View style={{ padding: 8, backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 4 }}>
                    <Text style={{ fontSize: 10, color: '#374151' }}>{data.notes}</Text>
                </View>
            </View>
        )}

        {/* FOOTER */}
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