import React from 'react';
import { Document, Page, Text, View, Image } from '@react-pdf/renderer';
import { Accident } from '../../../types';
import { styles } from '../styles';
import { formatDate } from '../../../utils/dateHelpers';

interface AccidentBulkDocumentProps {
  records: Accident[];
  companyDetails: any;
  title?: string;
}

const AccidentBulkDocument: React.FC<AccidentBulkDocumentProps> = ({ 
  records, 
  companyDetails,
  title = 'Accident Summary'
}) => {
  // Calculate summary statistics
  const totalRecords = records.length;
  const reportedAccidents = records.filter(r => r.status === 'reported').length;
  const investigatingAccidents = records.filter(r => r.status === 'investigating').length;
  const processingAccidents = records.filter(r => r.status === 'processing').length;
  const resolvedAccidents = records.filter(r => r.status === 'resolved').length;
  const totalClaims = records.reduce((sum, r) => sum + (r.amount || 0), 0);

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
                <Text style={styles.sectionTitle}>Accident Overview</Text>
                <View style={styles.grid}>
                  <View style={styles.gridItem}>
                    <Text>Total Accidents: {totalRecords}</Text>
                  </View>
                  <View style={styles.gridItem}>
                    <Text>Reported: {reportedAccidents}</Text>
                  </View>
                  <View style={styles.gridItem}>
                    <Text>Investigating: {investigatingAccidents}</Text>
                  </View>
                  <View style={styles.gridItem}>
                    <Text>Processing: {processingAccidents}</Text>
                  </View>
                  <View style={styles.gridItem}>
                    <Text>Resolved: {resolvedAccidents}</Text>
                  </View>
                  <View style={styles.gridItem}>
                    <Text>Total Claims: £{totalClaims.toFixed(2)}</Text>
                  </View>
                </View>
              </View>
            </>
          )}

          {/* Accident Records */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Accident Records</Text>
            <View style={styles.tableContainer}>
              {/* Table Header */}
              <View style={styles.tableHeader}>
                <Text style={[styles.tableCell, { width: '15%' }]}>Date</Text>
                <Text style={[styles.tableCell, { width: '20%' }]}>Driver</Text>
                <Text style={[styles.tableCell, { width: '25%' }]}>Location</Text>
                <Text style={[styles.tableCell, { width: '20%' }]}>Status</Text>
                <Text style={[styles.tableCell, { width: '20%' }]}>Amount</Text>
              </View>

              {/* Table Rows */}
              {records
                .slice(pageIndex * ITEMS_PER_PAGE, (pageIndex + 1) * ITEMS_PER_PAGE)
                .map((record) => (
                  <View key={record.id} style={styles.tableRow}>
                    <Text style={[styles.tableCell, { width: '15%' }]}>
                      {formatDate(record.accidentDate)}
                    </Text>
                    <Text style={[styles.tableCell, { width: '20%' }]}>
                      {record.driverName}
                    </Text>
                    <Text style={[styles.tableCell, { width: '25%' }]}>
                      {record.accidentLocation}
                    </Text>
                    <Text style={[styles.tableCell, { width: '20%' }]}>
                      {record.status}
                    </Text>
                    <Text style={[styles.tableCell, { width: '20%' }]}>
                      £{(record.amount || 0).toFixed(2)}
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

export default AccidentBulkDocument;