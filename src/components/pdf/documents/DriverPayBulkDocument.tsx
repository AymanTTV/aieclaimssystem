import React from 'react';
import { Document, Page, Text, View, Image } from '@react-pdf/renderer';
import { DriverPay } from '../../../types/driverPay';
import { styles } from '../styles';
import { formatDate } from '../../../utils/dateHelpers';

interface DriverPayBulkDocumentProps {
  records: DriverPay[];
  companyDetails: any;
  title?: string;
}

const DriverPayBulkDocument: React.FC<DriverPayBulkDocumentProps> = ({ 
  records, 
  companyDetails,
  title = 'Driver Pay Summary'
}) => {
  // Calculate summary statistics
  const totalAmount = records.reduce((sum, r) =>
    sum + r.paymentPeriods.reduce((pSum, p) => pSum + (Number(p.totalAmount) || 0), 0), 0);
const totalCommission = records.reduce((sum, r) =>
    sum + r.paymentPeriods.reduce((pSum, p) => pSum + (Number(p.commissionAmount) || 0), 0), 0);
const totalNetPay = records.reduce((sum, r) =>
    sum + r.paymentPeriods.reduce((pSum, p) => pSum + (Number(p.netPay) || 0), 0), 0);
const totalPaid = records.reduce((sum, r) =>
    sum + r.paymentPeriods.reduce((pSum, p) => pSum + (Number(p.paidAmount) || 0), 0), 0);

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
                    <Text>Total Amount: £{totalAmount.toFixed(2)}</Text>
                  </View>
                  <View style={styles.gridItem}>
                    <Text>Total Commission: £{totalCommission.toFixed(2)}</Text>
                  </View>
                  <View style={styles.gridItem}>
                    <Text>Total Net Pay: £{totalNetPay.toFixed(2)}</Text>
                  </View>
                  <View style={styles.gridItem}>
                    <Text>Total Paid: £{totalPaid.toFixed(2)}</Text>
                  </View>
                </View>
              </View>
            </>
          )}

          {/* Driver Pay Records */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Driver Pay Records</Text>
            <View style={styles.tableContainer}>
              {/* Table Header */}
              <View style={styles.tableHeader}>
                <Text style={[styles.tableCell, { width: '15%' }]}>Driver No</Text>
                <Text style={[styles.tableCell, { width: '20%' }]}>Name</Text>
                <Text style={[styles.tableCell, { width: '15%' }]}>Collection</Text>
                <Text style={[styles.tableCell, { width: '15%' }]}>Net Pay</Text>
                <Text style={[styles.tableCell, { width: '15%' }]}>Paid</Text>
                {/* <Text style={[styles.tableCell, { width: '20%' }]}>Status</Text> */}
              </View>

              {/* Table Rows */}
              {records
              .slice(pageIndex * ITEMS_PER_PAGE, (pageIndex + 1) * ITEMS_PER_PAGE)
              .map((record) => {
                  const totalNetPay = record.paymentPeriods.reduce((sum, period) => sum + (period.netPay || 0), 0);
                  const totalPaidAmount = record.paymentPeriods.reduce((sum, period) => sum + (period.paidAmount || 0), 0);

                  return (
                      <View key={record.id} style={styles.tableRow}>
                          <Text style={[styles.tableCell, { width: '15%' }]}>
                              {record.driverNo}
                          </Text>
                          <Text style={[styles.tableCell, { width: '20%' }]}>
                              {record.name}
                          </Text>
                          <Text style={[styles.tableCell, { width: '15%' }]}>
                              {record.collection}
                          </Text>
                          <Text style={[styles.tableCell, { width: '15%' }]}>
                              £{totalNetPay.toFixed(2)}
                          </Text>
                          <Text style={[styles.tableCell, { width: '15%' }]}>
                              £{totalPaidAmount.toFixed(2)}
                          </Text>
                          {/* <Text style={[styles.tableCell, { width: '20%' }]}>
                              {record.status}
                          </Text> */}
                      </View>
                  );
              })}
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

export default DriverPayBulkDocument;