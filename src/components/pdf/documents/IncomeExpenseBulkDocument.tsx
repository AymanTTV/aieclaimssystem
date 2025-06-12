// src/components/pdf/documents/IncomeExpenseBulkDocument.tsx

import React from 'react';
import { Document, Page, Text, View, Image } from '@react-pdf/renderer';
import { IncomeExpenseEntry, ProfitShare } from '../../../types/incomeExpense';
import { styles } from '../styles';
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

const ITEMS_FIRST_PAGE = 7;
const ITEMS_PER_PAGE = 10;

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

  const remainder = Math.max(0, records.length - ITEMS_FIRST_PAGE);
  const pageCount = 1 + Math.ceil(remainder / ITEMS_PER_PAGE);

  const getPageSlice = (page: number) =>
    page === 0
      ? records.slice(0, ITEMS_FIRST_PAGE)
      : records.slice(
          ITEMS_FIRST_PAGE + (page - 1) * ITEMS_PER_PAGE,
          ITEMS_FIRST_PAGE + page * ITEMS_PER_PAGE
        );

  return (
    <Document>
      {Array.from({ length: pageCount }).map((_, pageIndex) => {
        const slice = getPageSlice(pageIndex);

        return (
          <Page key={pageIndex} size="A4" style={styles.page}>
            {/* HEADER */}
            <View style={styles.header}>
              {companyDetails.logoUrl && (
                <Image src={companyDetails.logoUrl} style={styles.logo} />
              )}
              <View style={styles.companyInfo}>
                <Text>{companyDetails.fullName}</Text>
                <Text>{companyDetails.officialAddress}</Text>
                <Text>Tel: {companyDetails.phone}</Text>
                <Text>Email: {companyDetails.email}</Text>
              </View>
            </View>

            {/* TITLE + SUMMARY (first page only) */}
            {pageIndex === 0 && (
              <>
                <View style={styles.titleContainer}>
                  <Text style={styles.title}>{title}</Text>
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
                  {/* Income */}
                  <View style={[styles.infoCard, { borderLeftColor: '#059669', width: '23%' }]}>
                    <Text style={styles.infoCardTitle}>Income</Text>
                    <Text style={[styles.value, { fontWeight: 'bold' }]}>{fmt(totalIncome)}</Text>
                  </View>

                  {/* Expense */}
                  <View style={[styles.infoCard, { borderLeftColor: '#DC2626', width: '23%' }]}>
                    <Text style={styles.infoCardTitle}>Expense</Text>
                    <Text style={[styles.value, { fontWeight: 'bold' }]}>{fmt(totalExpense)}</Text>
                  </View>

                  {/* Shared */}
                  <View style={[styles.infoCard, { borderLeftColor: '#3B82F6', width: '23%' }]}>
                    <Text style={styles.infoCardTitle}>Shared</Text>
                    {Object.entries(breakdown).map(([name, amount]) => {
                      const pct = totalShared > 0
                        ? Math.round((amount / totalShared) * 100)
                        : 0;
                      return (
                        <Text key={name} style={styles.value}>
                          {name}: {pct}% = {fmt(amount)}
                        </Text>
                      );
                    })}
                    <Text style={[styles.value, { marginTop: 4, fontWeight: 'bold' }]}>
                      Total: {fmt(totalShared)}
                    </Text>
                  </View>

                  {/* Balance */}
                  <View style={[styles.infoCard, { borderLeftColor: '#10B981', width: '23%' }]}>
                    <Text style={styles.infoCardTitle}>Balance</Text>
                    <Text style={[styles.value, { fontWeight: 'bold' }]}>{fmt(balance)}</Text>
                  </View>
                </View>
              </>
            )}

            {/* TABLE HEADER */}
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, { width: '15%' }]}>Date</Text>
              <Text style={[styles.tableHeaderCell, { width: '25%' }]}>Customer</Text>
              <Text style={[styles.tableHeaderCell, { width: '20%' }]}>Reference</Text>
              <Text style={[styles.tableHeaderCell, { width: '15%' }]}>Type</Text>
              <Text style={[styles.tableHeaderCell, { width: '15%' }]}>Total</Text>
              <Text style={[styles.tableHeaderCell, { width: '10%' }]}>Status</Text>
            </View>

            {/* TABLE ROWS */}
            {slice.map((rec, i) => (
              <View key={i} style={styles.tableRow}>
                <Text style={[styles.tableCell, { width: '15%' }]}>{formatDate(rec.date)}</Text>
                <Text style={[styles.tableCell, { width: '25%' }]}>
                  {rec.customer || (rec as any).customerName || '—'}
                </Text>
                <Text style={[styles.tableCell, { width: '20%' }]}>
                  {rec.reference || '—'}
                </Text>
                <Text style={[styles.tableCell, { width: '15%' }]}>{rec.type}</Text>
                <Text style={[styles.tableCell, { width: '15%' }]}>
                  {fmt(rec.total ?? (rec as any).totalCost ?? 0)}
                </Text>
                <Text style={[styles.tableCell, { width: '10%' }]}>{rec.status}</Text>
              </View>
            ))}

            {/* FOOTER */}
            <Text style={styles.footer}>
              {companyDetails.fullName} | Generated on {formatDate(new Date().toISOString())}
            </Text>

            {/* PAGE NUMBER */}
            <Text style={styles.pageNumber}>
              Page {pageIndex + 1} of {pageCount}
            </Text>
          </Page>
        );
      })}
    </Document>
  );
};

export default IncomeExpenseBulkDocument;
