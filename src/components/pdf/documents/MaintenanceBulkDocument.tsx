import React from 'react';
import { Document, Page, Text, View, Image } from '@react-pdf/renderer';
import { MaintenanceLog } from '../../../types';
import { styles } from '../styles';
import { formatDate } from '../../../utils/dateHelpers';

interface MaintenanceBulkDocumentProps {
  records: MaintenanceLog[];
  companyDetails: any;
  title?: string;
}

const MaintenanceBulkDocument: React.FC<MaintenanceBulkDocumentProps> = ({ 
  records, 
  companyDetails,
  title = 'Maintenance Summary'
}) => {
  // Calculate summary statistics
  const totalRecords = records.length;
  const completedRecords = records.filter(r => r.status === 'completed').length;
  const inProgressRecords = records.filter(r => r.status === 'in-progress').length;
  const scheduledRecords = records.filter(r => r.status === 'scheduled').length;
  const totalCost = records.reduce((sum, r) => sum + r.cost, 0);

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
                <Text style={styles.sectionTitle}>Maintenance Overview</Text>
                <View style={styles.grid}>
                  <View style={styles.gridItem}>
                    <Text>Total Records: {totalRecords}</Text>
                  </View>
                  <View style={styles.gridItem}>
                    <Text>Completed: {completedRecords}</Text>
                  </View>
                  <View style={styles.gridItem}>
                    <Text>In Progress: {inProgressRecords}</Text>
                  </View>
                  <View style={styles.gridItem}>
                    <Text>Scheduled: {scheduledRecords}</Text>
                  </View>
                  <View style={styles.gridItem}>
                    <Text>Total Cost: £{totalCost.toFixed(2)}</Text>
                  </View>
                </View>
              </View>
            </>
          )}

          {/* Maintenance Records */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Maintenance Records</Text>
            <View style={styles.tableContainer}>
              {/* Table Header */}
              <View style={styles.tableHeader}>
                <Text style={[styles.tableCell, { width: '15%' }]}>Date</Text>
                <Text style={[styles.tableCell, { width: '20%' }]}>Type</Text>
                <Text style={[styles.tableCell, { width: '25%' }]}>Service Provider</Text>
                <Text style={[styles.tableCell, { width: '20%' }]}>Status</Text>
                <Text style={[styles.tableCell, { width: '20%' }]}>Cost</Text>
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
                      {record.type}
                    </Text>
                    <Text style={[styles.tableCell, { width: '25%' }]}>
                      {record.serviceProvider}
                    </Text>
                    <Text style={[styles.tableCell, { width: '20%' }]}>
                      {record.status}
                    </Text>
                    <Text style={[styles.tableCell, { width: '20%' }]}>
                      £{record.cost.toFixed(2)}
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

export default MaintenanceBulkDocument;