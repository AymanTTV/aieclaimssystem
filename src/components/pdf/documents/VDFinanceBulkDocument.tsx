import React from 'react';
import { Document, Page, Text, View, Image } from '@react-pdf/renderer';
import { VDFinanceRecord } from '../../../types/vdFinance';
import { styles } from '../styles';
import { formatDate } from '../../../utils/dateHelpers';
import { useFormattedDisplay } from '../../../hooks/useFormattedDisplay'; // Import currency formatting

interface VDFinanceBulkDocumentProps {
  records: VDFinanceRecord[];
  companyDetails: any;
  title?: string;
}

const VDFinanceBulkDocument: React.FC<VDFinanceBulkDocumentProps> = ({
  records,
  companyDetails,
  title = 'VD Finance Summary',
}) => {
  // Calculate summary statistics
  const totalAmount = records.reduce((sum, r) => sum + (r.totalAmount || 0), 0);
  const totalNetAmount = records.reduce((sum, r) => sum + (r.netAmount || 0), 0);
  const totalVatIn = records.reduce((sum, r) => sum + (r.vatIn || 0), 0);
  const totalVatOut = records.reduce((sum, r) => sum + (r.vatOut || 0), 0);
  const totalExpenses = records.reduce((sum, r) => sum + (r.purchasedItems || 0), 0);
  const totalSolicitorFees = records.reduce((sum, r) => sum + (r.solicitorFee || 0), 0);
  const totalClientRepair = records.reduce((sum, r) => sum + (r.clientRepair || 0), 0);
  const totalProfit = records.reduce((sum, r) => sum + (r.profit || 0), 0);
  const { formatCurrency } = useFormattedDisplay();
  const ITEMS_PER_PAGE = 10;
  const pages = Math.ceil(records.length / ITEMS_PER_PAGE);

  return (
    <Document>
      {Array.from({ length: pages }).map((_, pageIndex) => (
        <Page key={pageIndex} size="A4" style={styles.page}>
          {/* Header - on every page */}
          <View style={styles.header}>
            <Image src={companyDetails.logoUrl} style={styles.logo} />
            <View style={styles.companyInfo}>
              <Text>{companyDetails.fullName}</Text>
              <Text>{companyDetails.officialAddress}</Text>
              <Text>Tel: {companyDetails.phone}</Text>
              <Text>Email: {companyDetails.email}</Text>
            </View>
          </View>

          {/* Title and Summary - only on first page */}
          {pageIndex === 0 && (
            <>
              <Text style={styles.title}>{title}</Text>

              <View style={[styles.section, styles.keepTogether]}>
                <Text style={styles.sectionTitle}>Payment Summary</Text>
                <View style={styles.grid}>
                  <View style={styles.gridItem}>
                    <Text>Total Amount: {formatCurrency(totalAmount)}</Text>
                  </View>
                  <View style={styles.gridItem}>
                    <Text>Total NET Amount: {formatCurrency(totalNetAmount)}</Text>
                  </View>
                  <View style={styles.gridItem}>
                    <Text>Total VAT IN: {formatCurrency(totalVatIn)}</Text>
                  </View>
                  <View style={styles.gridItem}>
                    <Text>Total VAT OUT: {formatCurrency(totalVatOut)}</Text>
                  </View>
                  <View style={styles.gridItem}>
                    <Text>Total Expenses: {formatCurrency(totalExpenses)}</Text>
                  </View>
                  <View style={styles.gridItem}>
                    <Text>Total Solicitor Fees: {formatCurrency(totalSolicitorFees)}</Text>
                  </View>
                  <View style={styles.gridItem}>
                    <Text>Total Client Repair: {formatCurrency(totalClientRepair)}</Text>
                  </View>
                  <View style={styles.gridItem}>
                    <Text>Total Profit: {formatCurrency(totalProfit)}</Text>
                  </View>
                </View>
              </View>
            </>
          )}

          {/* VD Finance Records */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>VD Finance Records</Text>
            <View style={styles.tableContainer}>
              {/* Table Header */}
              <View style={styles.tableHeader}>
                <Text style={[styles.tableCell, { width: '20%' }]}>Name</Text>
                <Text style={[styles.tableCell, { width: '15%' }]}>Reference</Text>
                <Text style={[styles.tableCell, { width: '15%' }]}>Registration</Text>
                <Text style={[styles.tableCell, { width: '15%' }]}>Total Amount</Text>
                <Text style={[styles.tableCell, { width: '15%' }]}>Profit</Text>
                <Text style={[styles.tableCell, { width: '20%' }]}>Date</Text>
              </View>

              {/* Table Rows */}
              {records
                .slice(pageIndex * ITEMS_PER_PAGE, (pageIndex + 1) * ITEMS_PER_PAGE)
                .map((record) => (
                  <View key={record.id} style={styles.tableRow}>
                    <Text style={[styles.tableCell, { width: '20%' }]}>
                      {record.name}
                    </Text>
                    <Text style={[styles.tableCell, { width: '15%' }]}>
                      {record.reference}
                    </Text>
                    <Text style={[styles.tableCell, { width: '15%' }]}>
                      {record.registration}
                    </Text>
                    <Text style={[styles.tableCell, { width: '15%' }]}>
                      {formatCurrency(record.totalAmount)}
                    </Text>
                    <Text style={[styles.tableCell, { width: '15%' }]}>
                      {formatCurrency(record.profit)}
                    </Text>
                    <Text style={[styles.tableCell, { width: '20%' }]}>
                      {formatDate(record.date)}
                    </Text>
                  </View>
                ))}
            </View>
          </View>

          {/* Footer */}
          <Text style={styles.footer}>
            {companyDetails.fullName} | Generated on {formatDate(new Date())}
          </Text>

          {/* Page Number */}
          <Text style={styles.pageNumber}>
            Page {pageIndex + 1} of {pages}
          </Text>
        </Page>
      ))}
    </Document>
  );
};

export default VDFinanceBulkDocument;