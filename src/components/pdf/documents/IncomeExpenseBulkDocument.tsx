// src/components/pdf/documents/IncomeExpenseBulkDocument.tsx

import React from 'react';
import { Document, Page, Text, View, Image, StyleSheet } from '@react-pdf/renderer';
import { IncomeExpenseEntry, ProfitShare } from '../../../types/incomeExpense';
import { styles as globalStyles } from '../styles'; // Renamed to avoid conflict
import { format } from 'date-fns';

interface Props {
  records: IncomeExpenseEntry[];
  companyDetails: {
    logoUrl?: string;
    fullName: string;
    officialAddress: string;
    phone: string;
    email: string;
    shares?: ProfitShare[];
  };
  title?: string;
}

// Local styles for the summary card and table, mimicking FinanceDocument.tsx's local styles
const localStyles = StyleSheet.create({
  summaryCard: {
    ...globalStyles.card, // Use existing card style as base
    marginBottom: 10,
    padding: 10,
    backgroundColor: '#F9FAFB',
    breakInside: 'avoid', // Ensure card stays together
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  summaryLabel: {
    ...globalStyles.text, // Use existing text style as base
    fontSize: 10,
    color: '#4B5563',
  },
  summaryValue: {
    ...globalStyles.text, // Use existing text style as base
    fontSize: 10,
    fontWeight: 'bold',
  },
  positiveValue: {
    color: '#10B981', // green
  },
  negativeValue: {
    color: '#EF4444', // red
  },
  // Added style for wrapping text in table cells
  tableCellWrappedText: {
    flexWrap: 'wrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
});

const ITEMS_FIRST_PAGE = 5; // 5 records on the first page table
const ITEMS_PER_PAGE = 7;   // 7 records on other pages table

const fmt = (n: number | undefined) => `£${(n ?? 0).toFixed(2)}`;
const formatDate = (iso?: string) =>
  iso ? format(new Date(iso), 'dd/MM/yyyy') : '—';

const IncomeExpenseBulkDocument: React.FC<Props> = ({
  records,
  companyDetails,
  title = 'Income & Expense Summary',
}) => {
  const shares = companyDetails.shares || [];

  const totalIncome = records
    .filter(r => r.type === 'income')
    .reduce((s, r) => s + (r.total ?? 0), 0);

  const totalExpense = records
    .filter(r => r.type === 'expense')
    .reduce((s, r) => s + ((r.total ?? (r as any).totalCost) ?? 0), 0);

  const totalShared = shares.reduce((s, sp) => s + (sp.totalSplitAmount ?? 0), 0);
  const balance = totalIncome - totalExpense - totalShared;

  const breakdown = shares.reduce<Record<string, number>>((acc, sp) => {
    sp.recipients.forEach(rec => {
      acc[rec.name] = (acc[rec.name] || 0) + (rec.amount ?? 0);
    });
    return acc;
  }, {});

  // Pagination logic
  const remainder = Math.max(0, records.length - ITEMS_FIRST_PAGE);
  const pageCount = records.length > 0 ? 1 + Math.ceil(remainder / ITEMS_PER_PAGE) : 0;

  const getPageSlice = (page: number) =>
    page === 0
      ? records.slice(0, ITEMS_FIRST_PAGE)
      : records.slice(
          ITEMS_FIRST_PAGE + (page - 1) * ITEMS_PER_PAGE,
          ITEMS_FIRST_PAGE + page * ITEMS_PER_PAGE
        );

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
      {Array.from({ length: pageCount }).map((_, pageIndex) => {
        const slice = getPageSlice(pageIndex);

        return (
          <Page key={pageIndex} size="A4" style={globalStyles.page}>
            {/* HEADER - Updated to match the consistent design */}
            <View style={globalStyles.header} fixed>
              <View style={globalStyles.headerLeft}>
                {headerDetails.logoUrl && (
                  <Image src={headerDetails.logoUrl} style={globalStyles.logo} />
                )}
              </View>
              <View style={globalStyles.headerRight}>
                <Text style={globalStyles.companyName}>{headerDetails.fullName}</Text>
                <Text style={globalStyles.companyDetail}>{headerDetails.addressLine1}</Text>
                <Text style={globalStyles.companyDetail}>{headerDetails.addressLine2}</Text>
                <Text style={globalStyles.companyDetail}>Tel: {headerDetails.phone}</Text>
                <Text style={globalStyles.companyDetail}>Email: {headerDetails.email}</Text>
              </View>
            </View>

            {/* TITLE + SUMMARY (first page only) */}
            {pageIndex === 0 && (
              <>
                <View style={globalStyles.titleContainer}>
                  <Text style={globalStyles.title}>{title}</Text>
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
                  {/* Income */}
                  <View style={[localStyles.summaryCard, { borderLeftColor: '#059669', width: '23%' }]}>
                    <Text style={localStyles.summaryLabel}>Income</Text>
                    <Text style={[localStyles.summaryValue, localStyles.positiveValue]}>{fmt(totalIncome)}</Text>
                  </View>

                  {/* Expense */}
                  <View style={[localStyles.summaryCard, { borderLeftColor: '#DC2626', width: '23%' }]}>
                    <Text style={localStyles.summaryLabel}>Expense</Text>
                    <Text style={[localStyles.summaryValue, localStyles.negativeValue]}>{fmt(totalExpense)}</Text>
                  </View>

                  {/* Shared */}
                  <View style={[localStyles.summaryCard, { borderLeftColor: '#3B82F6', width: '23%' }]}>
                    <Text style={localStyles.summaryLabel}>Shared</Text>
                    {Object.entries(breakdown).map(([name, amount]) => {
                      const pct = totalShared > 0
                        ? Math.round((amount / totalShared) * 100)
                        : 0;
                      return (
                        <View key={name} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                          <Text style={localStyles.summaryValue}>
                            {name} ({pct}%)
                          </Text>
                          <Text style={localStyles.summaryValue}>{fmt(amount)}</Text>
                        </View>
                      );
                    })}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                      <Text style={localStyles.summaryLabel}>Total:</Text>
                      <Text style={localStyles.summaryValue}>{fmt(totalShared)}</Text>
                    </View>
                  </View>

                  {/* Balance */}
                  <View style={[localStyles.summaryCard, { borderLeftColor: '#10B981', width: '23%' }]}>
                    <Text style={localStyles.summaryLabel}>Balance</Text>
                    <Text style={[localStyles.summaryValue, balance >= 0 ? localStyles.positiveValue : localStyles.negativeValue]}>{fmt(balance)}</Text>
                  </View>
                </View>
              </>
            )}

            {/* TABLE HEADER */}
            <View style={globalStyles.tableHeader} fixed> {/* Added fixed to tableHeader */}
              <Text style={[globalStyles.tableHeaderCell, { width: '15%' }]}>Date</Text>
              <Text style={[globalStyles.tableHeaderCell, { width: '25%' }]}>Customer</Text>
              <Text style={[globalStyles.tableHeaderCell, { width: '20%' }]}>Reference</Text>
              <Text style={[globalStyles.tableHeaderCell, { width: '15%' }]}>Type</Text>
              <Text style={[globalStyles.tableHeaderCell, { width: '15%' }]}>Total</Text>
              <Text style={[globalStyles.tableHeaderCell, { width: '10%' }]}>Status</Text>
            </View>

            {/* TABLE ROWS */}
            {slice.map((rec, i) => (
              <View key={i} style={globalStyles.tableRow}>
                <Text style={[globalStyles.tableCell, { width: '15%' }, localStyles.tableCellWrappedText]}>{formatDate(rec.date)}</Text>
                <Text style={[globalStyles.tableCell, { width: '25%' }, localStyles.tableCellWrappedText]}>
                  {rec.customer || (rec as any).customerName || '—'}
                </Text>
                <Text style={[globalStyles.tableCell, { width: '20%' }, localStyles.tableCellWrappedText]}>
                  {rec.reference || '—'}
                </Text>
                <Text style={[globalStyles.tableCell, { width: '15%' }, localStyles.tableCellWrappedText]}>{rec.type}</Text>
                <Text style={[globalStyles.tableCell, { width: '15%' }, localStyles.tableCellWrappedText]}>
                  {fmt(rec.total ?? (rec as any).totalCost ?? 0)}
                </Text>
                <Text style={[globalStyles.tableCell, { width: '10%' }, localStyles.tableCellWrappedText]}>{rec.status}</Text>
              </View>
            ))}

            {/* FOOTER - Updated to match the consistent design */}
            <View style={globalStyles.footer} fixed>
              <Text style={globalStyles.footerText}>
                AIE SKYLINE LIMITED, registered in England and Wales with the company registration number 15616639, registered office address: United House, 39-41 North Road, London, N7 9DP. VAT. NO. 453448875
              </Text>
              <Text
                style={globalStyles.pageNumber}
                render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
              />
            </View>
          </Page>
        );
      })}
    </Document>
  );
};

export default IncomeExpenseBulkDocument;