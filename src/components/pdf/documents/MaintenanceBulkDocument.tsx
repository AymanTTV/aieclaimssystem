import React from 'react';
import { Document, Page, Text, View, Image } from '@react-pdf/renderer';
import { MaintenanceLog, Vehicle, Customer } from '../../../types';
import { styles } from '../styles'; // Ensure this path is correct
import { formatDate } from '../../../utils/dateHelpers';

interface MaintenanceBulkDocumentProps {
  records: MaintenanceLog[];
  vehicles: Record<string, Vehicle>;
  customers: Record<string, Customer>;
  companyDetails: {
    logoUrl?: string;
    fullName: string;
    officialAddress: string;
    phone: string;
    email: string;
  };
  title?: string;
}

const MaintenanceBulkDocument: React.FC<MaintenanceBulkDocumentProps> = ({
  records,
  vehicles = {},
  customers = {},
  companyDetails,
  title = 'Maintenance Summary',
}) => {
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

  // Define local styles for the summary card to mimic FinanceDocument's summaryCard
  // We use existing global styles as much as possible and override specifically
  const localSummaryCardStyles = {
    summaryCard: {
      ...styles.card, // Inherit base card styling (e.g., borderRadius, borderLeft)
      marginBottom: 10,
      padding: 10, // FinanceDocument uses padding: 10
      backgroundColor: '#F9FAFB', // Explicitly set background
      borderColor: '#E5E7EB', // Add border color consistent with Finance
      borderWidth: 1, // Add border width consistent with Finance
      breakInside: 'avoid', // Ensure the card stays together
    },
    summaryLabel: {
      ...styles.text, // Base text style from global styles
      fontSize: 10,
      color: '#4B5563',
    },
    summaryValue: {
      ...styles.text, // Base text style from global styles
      fontSize: 10,
      fontWeight: 'bold',
    },
    // Explicit colors from FinanceDocument
    positiveValue: {
      color: '#10B981', // green
    },
    negativeValue: {
      color: '#EF4444', // red
    },
    neutralValue: {
      color: '#3B82F6', // blue
    },
  };


  return (
    <Document>
      {Array.from({ length: pages }).map((_, pageIndex) => (
        <Page key={pageIndex} size="A4" style={styles.page}>
          {/* Header - Consistent with Vehicle Documents */}
          <View style={styles.header} fixed>
            <View style={styles.headerLeft}>
              {companyDetails?.logoUrl && (
                <Image src={companyDetails.logoUrl} style={styles.logo} />
              )}
            </View>
            <View style={styles.headerRight}>
              <Text style={styles.companyName}>{companyDetails?.fullName || 'AIE Skyline Limited'}</Text>
              <Text style={styles.companyDetail}>{companyDetails?.officialAddress || 'N/A'}</Text>
              <Text style={styles.companyDetail}>Tel: {companyDetails?.phone || 'N/A'}</Text>
              <Text style={styles.companyDetail}>Email: {companyDetails?.email || 'N/A'}</Text>
            </View>
          </View>

          {/* Title & Summary (First Page Only) */}
          {pageIndex === 0 && (
            <>
              <View style={styles.titleContainer}>
                <Text style={styles.title}>{title}</Text>
              </View>

              {/* Maintenance Overview Box - Updated to mimic Finance Summary Card */}
              <View style={localSummaryCardStyles.summaryCard} wrap={false}>
                <Text style={styles.infoCardTitle}>Maintenance Overview</Text> {/* Reusing existing infoCardTitle style */}

                <View style={styles.spaceBetweenRow}> {/* Using existing spaceBetweenRow */}
                  <Text style={localSummaryCardStyles.summaryLabel}>Total Records:</Text>
                  <Text style={localSummaryCardStyles.summaryValue}>{totalRecords}</Text>
                </View>

                <View style={styles.spaceBetweenRow}>
                  <Text style={localSummaryCardStyles.summaryLabel}>Completed:</Text>
                  <Text style={[localSummaryCardStyles.summaryValue, localSummaryCardStyles.positiveValue]}>{completedRecords}</Text>
                </View>

                <View style={styles.spaceBetweenRow}>
                  <Text style={localSummaryCardStyles.summaryLabel}>In Progress:</Text>
                  <Text style={[localSummaryCardStyles.summaryValue, localSummaryCardStyles.neutralValue]}>{inProgressRecords}</Text>
                </View>

                <View style={styles.spaceBetweenRow}>
                  <Text style={localSummaryCardStyles.summaryLabel}>Scheduled:</Text>
                  <Text style={[localSummaryCardStyles.summaryValue, localSummaryCardStyles.neutralValue]}>{scheduledRecords}</Text>
                </View>

                <View style={[styles.spaceBetweenRow, { borderTopWidth: 1, borderTopColor: '#E5E7EB', paddingTop: 5, marginTop: 5 }]}> {/* Add a separator */}
                  <Text style={[localSummaryCardStyles.summaryLabel, { fontWeight: 'bold' }]}>Total Cost:</Text>
                  <Text style={[localSummaryCardStyles.summaryValue, localSummaryCardStyles.negativeValue]}>£{totalCost.toFixed(2)}</Text>
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
                <Text style={[styles.tableCell, { width: '20%' }]}>Vehicle</Text>
                <Text style={[styles.tableCell, { width: '20%' }]}>Customer</Text>
                <Text style={[styles.tableCell, { width: '15%' }]}>Type</Text>
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
                  const vehicle = record.vehicleId ? vehicles[record.vehicleId] : null;
                  const customer = record.customerId ? customers[record.customerId] : null;
                  return (
                    <View key={record.id} style={styles.tableRow}>
                      <Text style={[styles.tableCell, { width: '15%' }]}>
                        {formatDate(record.date)}
                      </Text>
                      <Text style={[styles.tableCell, { width: '20%' }]}>
                        {vehicle?.registrationNumber || 'N/A'}
                      </Text>
                      <Text style={[styles.tableCell, { width: '20%' }]}>
                        {customer?.name || 'N/A'}
                      </Text>
                      <Text style={[styles.tableCell, { width: '15%' }]}>
                        {record.type}
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

          {/* Footer - Consistent with Vehicle Documents */}
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
      ))}
    </Document>
  );
};

export default MaintenanceBulkDocument;