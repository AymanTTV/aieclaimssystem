// src/components/pdf/documents/InvoiceBulkDocument.tsx
import React from 'react';
import { Document, Page, Text, View, Image } from '@react-pdf/renderer';
import { Invoice } from '../../../types/finance';
import { styles } from '../styles';
import { format } from 'date-fns';

interface InvoiceBulkDocumentProps {
  records: Invoice[];
  companyDetails: any;
  title?: string;
}

const InvoiceBulkDocument: React.FC<InvoiceBulkDocumentProps> = ({
  records,
  companyDetails,
  title = 'Invoice Summary',
}) => {
  // Calculate summary statistics
  const totalAmount = records.reduce((sum, r) => sum + r.total, 0);
  const totalPaid = records.reduce((sum, r) => sum + r.paidAmount, 0);
  const totalOutstanding = records.reduce((sum, r) => sum + r.remainingAmount, 0);
  const overdueInvoices = records.filter(
    (r) => r.paymentStatus !== 'paid' && new Date() > r.dueDate
  ).length;

  const ITEMS_PER_PAGE = 10;
  const pages = Math.ceil(records.length / ITEMS_PER_PAGE);

  // Utility to format a JS Date or Firestore Timestamp
  const formatDate = (date: Date | any): string => {
    if (!date) return 'N/A';
    try {
      if (date?.toDate) {
        date = date.toDate();
      }
      const dObj = date instanceof Date ? date : new Date(date);
      if (isNaN(dObj.getTime())) return 'N/A';
      return format(dObj, 'dd/MM/yyyy');
    } catch {
      return 'N/A';
    }
  };

  return (
    <Document>
      {Array.from({ length: pages }).map((_, pageIndex) => (
        <Page key={pageIndex} size="A4" style={styles.page}>
          {/* ── HEADER ── */}
          <View style={styles.header}>
            <Image src={companyDetails.logoUrl} style={styles.logo} />
            <View style={styles.companyInfo}>
              <Text style={styles.companyName}>{companyDetails.fullName}</Text>
              <Text style={styles.companyDetail}>{companyDetails.officialAddress}</Text>
              <Text style={styles.companyDetail}>Tel: {companyDetails.phone}</Text>
              <Text style={styles.companyDetail}>Email: {companyDetails.email}</Text>
            </View>
          </View>

          {/* ── TITLE & SUMMARY (only on first page) ── */}
          {pageIndex === 0 && (
            <>
              <Text style={styles.title}>{title}</Text>

              <View style={[styles.section, styles.keepTogether]}>
                <Text style={styles.sectionTitle}>Invoice Overview</Text>
                <View style={styles.grid}>
                  <View style={styles.gridItem}>
                    <Text>Total Amount: £{totalAmount.toFixed(2)}</Text>
                  </View>
                  <View style={styles.gridItem}>
                    <Text>Amount Paid: £{totalPaid.toFixed(2)}</Text>
                  </View>
                  <View style={styles.gridItem}>
                    <Text>Outstanding: £{totalOutstanding.toFixed(2)}</Text>
                  </View>
                  <View style={styles.gridItem}>
                    <Text>Overdue Invoices: {overdueInvoices}</Text>
                  </View>
                </View>
              </View>
            </>
          )}

          {/* ── Invoice Records Table ── */}
          <View style={[styles.section, styles.keepTogether]}>
            <Text style={styles.sectionTitle}>Invoice Records</Text>
            <View style={styles.tableContainer}>
              {/* Table Header */}
              <View style={styles.tableHeader}>
                <Text style={[styles.tableCell, { width: '15%' }]}>Date</Text>
                <Text style={[styles.tableCell, { width: '20%' }]}>Customer</Text>
                <Text style={[styles.tableCell, { width: '15%' }]}>Status</Text>
                <Text style={[styles.tableCell, { width: '15%' }]}>Total</Text>
                <Text style={[styles.tableCell, { width: '15%' }]}>Paid</Text>
                <Text style={[styles.tableCell, { width: '20%' }]}>Due Date</Text>
              </View>

              {/* Table Rows */}
              {records
                .slice(pageIndex * ITEMS_PER_PAGE, (pageIndex + 1) * ITEMS_PER_PAGE)
                .map((record) => (
                  <View key={record.id} style={styles.tableRow}>
                    <Text style={[styles.tableCell, { width: '15%' }]}>
                      {formatDate(record.date)}
                    </Text>
                    <Text style={[styles.tableCell, { width: '20%' }]}>
                      {record.customerName}
                    </Text>
                    <Text style={[styles.tableCell, { width: '15%' }]}>
                      {record.paymentStatus}
                    </Text>
                    <Text style={[styles.tableCell, { width: '15%' }]}>
                      £{record.total.toFixed(2)}
                    </Text>
                    <Text style={[styles.tableCell, { width: '15%' }]}>
                      £{record.paidAmount.toFixed(2)}
                    </Text>
                    <Text style={[styles.tableCell, { width: '20%' }]}>
                      {formatDate(record.dueDate)}
                    </Text>
                  </View>
                ))}
            </View>
          </View>

          {/* ── Footer & Page Number ── */}
          <Text style={styles.footer}>
            {companyDetails.fullName} | Generated on {formatDate(new Date())}
          </Text>
          <Text style={styles.pageNumber}>
            Page {pageIndex + 1} of {pages}
          </Text>
        </Page>
      ))}
    </Document>
  );
};

export default InvoiceBulkDocument;
