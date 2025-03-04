import React from 'react';
import { Document, Page, Text, View, Image } from '@react-pdf/renderer';
import { Rental } from '../../../types';
import { styles } from '../styles';
import { formatDate } from '../../../utils/dateHelpers';

interface RentalBulkDocumentProps {
  records: Rental[];
  companyDetails: any;
  title?: string;
}

const RentalBulkDocument: React.FC<RentalBulkDocumentProps> = ({ 
  records, 
  companyDetails,
  title = 'Rental Summary'
}) => {
  // Calculate summary statistics
  const totalRecords = records.length;
  const activeRentals = records.filter(r => r.status === 'active').length;
  const scheduledRentals = records.filter(r => r.status === 'scheduled').length;
  const completedRentals = records.filter(r => r.status === 'completed').length;
  const totalIncome = records.reduce((sum, r) => sum + r.cost, 0);
  const totalPaid = records.reduce((sum, r) => sum + r.paidAmount, 0);
  const totalOutstanding = records.reduce((sum, r) => sum + r.remainingAmount, 0);

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
                <Text style={styles.sectionTitle}>Rental Overview</Text>
                <View style={styles.grid}>
                  <View style={styles.gridItem}>
                    <Text>Total Rentals: {totalRecords}</Text>
                  </View>
                  <View style={styles.gridItem}>
                    <Text>Active: {activeRentals}</Text>
                  </View>
                  <View style={styles.gridItem}>
                    <Text>Scheduled: {scheduledRentals}</Text>
                  </View>
                  <View style={styles.gridItem}>
                    <Text>Completed: {completedRentals}</Text>
                  </View>
                </View>

                <View style={[styles.grid, { marginTop: 10 }]}>
                  <View style={styles.gridItem}>
                    <Text>Total Income: £{totalIncome.toFixed(2)}</Text>
                  </View>
                  <View style={styles.gridItem}>
                    <Text>Amount Paid: £{totalPaid.toFixed(2)}</Text>
                  </View>
                  <View style={styles.gridItem}>
                    <Text>Outstanding: £{totalOutstanding.toFixed(2)}</Text>
                  </View>
                </View>
              </View>
            </>
          )}

          {/* Rental Records */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Rental Records</Text>
            <View style={styles.tableContainer}>
              {/* Table Header */}
              <View style={styles.tableHeader}>
                <Text style={[styles.tableCell, { width: '15%' }]}>Start Date</Text>
                <Text style={[styles.tableCell, { width: '15%' }]}>End Date</Text>
                <Text style={[styles.tableCell, { width: '15%' }]}>Type</Text>
                <Text style={[styles.tableCell, { width: '15%' }]}>Status</Text>
                <Text style={[styles.tableCell, { width: '20%' }]}>Cost</Text>
                <Text style={[styles.tableCell, { width: '20%' }]}>Paid</Text>
              </View>

              {/* Table Rows */}
              {records
                .slice(pageIndex * ITEMS_PER_PAGE, (pageIndex + 1) * ITEMS_PER_PAGE)
                .map((record) => (
                  <View key={record.id} style={styles.tableRow}>
                    <Text style={[styles.tableCell, { width: '15%' }]}>
                      {formatDate(record.startDate)}
                    </Text>
                    <Text style={[styles.tableCell, { width: '15%' }]}>
                      {formatDate(record.endDate)}
                    </Text>
                    <Text style={[styles.tableCell, { width: '15%' }]}>
                      {record.type}
                    </Text>
                    <Text style={[styles.tableCell, { width: '15%' }]}>
                      {record.status}
                    </Text>
                    <Text style={[styles.tableCell, { width: '20%' }]}>
                      £{record.cost.toFixed(2)}
                    </Text>
                    <Text style={[styles.tableCell, { width: '20%' }]}>
                      £{record.paidAmount.toFixed(2)}
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

export default RentalBulkDocument;