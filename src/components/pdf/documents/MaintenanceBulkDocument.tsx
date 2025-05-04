import React from 'react';
import { Document, Page, Text, View, Image } from '@react-pdf/renderer';
import { MaintenanceLog, Vehicle } from '../../../types';
import { styles } from '../styles';
import { formatDate } from '../../../utils/dateHelpers';

interface MaintenanceBulkDocumentProps {
  records: MaintenanceLog[];
  vehicles: Record<string, Vehicle>; // NEW
  companyDetails: any;
  title?: string;
}

const MaintenanceBulkDocument: React.FC<MaintenanceBulkDocumentProps> = ({
  records,
  vehicles, // NEW
  companyDetails,
  title = 'Maintenance Summary',
}) => {
  // Summary Calculations
  const totalRecords = records.length;
  const completedRecords = records.filter((r) => r.status === 'completed').length;
  const inProgressRecords = records.filter((r) => r.status === 'in-progress').length;
  const scheduledRecords = records.filter((r) => r.status === 'scheduled').length;
  const totalCost = records.reduce((sum, r) => sum + r.cost, 0);

  const ITEMS_PER_PAGE_FIRST_PAGE = 6;
  const ITEMS_PER_PAGE_OTHER_PAGES = 10;

  let pages = 0;
  if (totalRecords > 0) {
    if (totalRecords <= ITEMS_PER_PAGE_FIRST_PAGE) {
      pages = 1;
    } else {
      pages = 1 + Math.ceil((totalRecords - ITEMS_PER_PAGE_FIRST_PAGE) / ITEMS_PER_PAGE_OTHER_PAGES);
    }
  }

  return (
    <Document>
      {Array.from({ length: pages }).map((_, pageIndex) => (
        <Page key={pageIndex} size="A4" style={styles.page}>
          {/* Header */}
          <View style={styles.header}>
            <Image src={companyDetails.logoUrl} style={styles.logo} />
            <View style={styles.companyInfo}>
              <Text>{companyDetails.fullName}</Text>
              <Text>{companyDetails.officialAddress}</Text>
              <Text>Tel: {companyDetails.phone}</Text>
              <Text>Email: {companyDetails.email}</Text>
            </View>
          </View>

          {/* Title & Summary (First Page Only) */}
          {pageIndex === 0 && (
  <>
    <Text style={styles.title}>{title}</Text>

    {/* Maintenance Overview Box */}
    <View style={[styles.sectionBreak, { marginBottom: 20 }]} wrap={false}>
      <View style={styles.infoCard}>
        <Text style={styles.infoCardTitle}>Maintenance Overview</Text>

        <View style={styles.row}>
          <Text style={[styles.label, { width: '50%' }]}>Total Records:</Text>
          <Text style={styles.value}>{totalRecords}</Text>
        </View>

        <View style={styles.row}>
          <Text style={[styles.label, { width: '50%' }]}>Completed:</Text>
          <Text style={styles.value}>{completedRecords}</Text>
        </View>

        <View style={styles.row}>
          <Text style={[styles.label, { width: '50%' }]}>In Progress:</Text>
          <Text style={styles.value}>{inProgressRecords}</Text>
        </View>

        <View style={styles.row}>
          <Text style={[styles.label, { width: '50%' }]}>Scheduled:</Text>
          <Text style={styles.value}>{scheduledRecords}</Text>
        </View>

        <View style={styles.row}>
          <Text style={[styles.label, { width: '50%' }]}>Total Cost:</Text>
          <Text style={styles.value}>£{totalCost.toFixed(2)}</Text>
        </View>
      </View>
    </View>
  </>
)}


          {/* Maintenance Records Table */}
          <View style={styles.sectionBreak} wrap={false}>
            <Text style={styles.sectionTitle}>Maintenance Records</Text>
            <View style={styles.tableContainer}>
              {/* Table Header */}
              <View style={styles.tableHeader}>
                <Text style={[styles.tableCell, { width: '15%' }]}>Date</Text>
                <Text style={[styles.tableCell, { width: '15%' }]}>Vehicle</Text>
                <Text style={[styles.tableCell, { width: '15%' }]}>Type</Text>
                <Text style={[styles.tableCell, { width: '25%' }]}>Service Provider</Text>
                <Text style={[styles.tableCell, { width: '15%' }]}>Status</Text>
                <Text style={[styles.tableCell, { width: '15%' }]}>Cost</Text>
              </View>

              {/* Table Rows */}
              {records
  .slice(
    pageIndex === 0
      ? 0
      : ITEMS_PER_PAGE_FIRST_PAGE +
          (pageIndex - 1) * ITEMS_PER_PAGE_OTHER_PAGES,
    Math.min(
      pageIndex === 0
        ? ITEMS_PER_PAGE_FIRST_PAGE
        : ITEMS_PER_PAGE_FIRST_PAGE +
            pageIndex * ITEMS_PER_PAGE_OTHER_PAGES,
      totalRecords
    )
  )
  .map((record) => {
    const vehicle = vehicles && record.vehicleId && vehicles[record.vehicleId];
    return (
      <View key={record.id} style={styles.tableRow}>
        <Text style={[styles.tableCell, { width: '15%' }]}>
          {formatDate(record.date)}
        </Text>
        <Text style={[styles.tableCell, { width: '15%' }]}>
          {vehicle?.registrationNumber || 'N/A'}
        </Text>
        <Text style={[styles.tableCell, { width: '15%' }]}>
          {record.type}
        </Text>
        <Text style={[styles.tableCell, { width: '25%' }]}>
          {record.serviceProvider}
        </Text>
        <Text style={[styles.tableCell, { width: '15%' }]}>
          {record.status}
        </Text>
        <Text style={[styles.tableCell, { width: '15%' }]}>
          £{record.cost.toFixed(2)}
        </Text>
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

export default MaintenanceBulkDocument;
