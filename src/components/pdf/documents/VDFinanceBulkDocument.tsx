import React from 'react';
import { Document, Page, Text, View, Image, StyleSheet } from '@react-pdf/renderer';
import { VDFinanceRecord } from '../../../types/vdFinance';
import { styles as globalStyles } from '../styles'; // Renamed to avoid conflict
import { formatDate } from '../../../utils/dateHelpers';
import { useFormattedDisplay } from '../../../hooks/useFormattedDisplay'; // Import currency formatting

interface VDFinanceBulkDocumentProps {
  records: VDFinanceRecord[];
  companyDetails: any;
  title?: string;
}

// Local styles for the summary card, mimicking FinanceDocument.tsx's local styles
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
  neutralValue: {
    color: '#3B82F6', // blue (not explicitly used for profit but good to have)
  },
});

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

  // Pagination adjustments
  const ITEMS_FIRST_PAGE = 5; // 5 records on the first page
  const ITEMS_PER_PAGE = 7;   // 7 records on other pages

  const remainder = Math.max(0, records.length - ITEMS_FIRST_PAGE);
  const otherPages = Math.ceil(remainder / ITEMS_PER_PAGE);
  const pageCount = records.length > 0 ? 1 + otherPages : 0; // Handle empty records case

  const getSlice = (page: number) =>
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
        const slice = getSlice(pageIndex);
        return (
          <Page key={pageIndex} size="A4" style={globalStyles.page}>
            {/* Header - on every page */}
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

            {/* Title and Summary - only on first page */}
            {pageIndex === 0 && (
              <>
                <Text style={globalStyles.title}>{title}</Text>

                {/* Updated Payment Summary Card */}
                <View style={localStyles.summaryCard}>
                  <View style={localStyles.summaryRow}>
                    <Text style={localStyles.summaryLabel}>Total Amount:</Text>
                    <Text style={localStyles.summaryValue}>
                      {formatCurrency(totalAmount)}
                    </Text>
                  </View>

                  <View style={localStyles.summaryRow}>
                    <Text style={localStyles.summaryLabel}>Total NET Amount:</Text>
                    <Text style={localStyles.summaryValue}>
                      {formatCurrency(totalNetAmount)}
                    </Text>
                  </View>

                  <View style={localStyles.summaryRow}>
                    <Text style={localStyles.summaryLabel}>Total VAT IN:</Text>
                    <Text style={localStyles.summaryValue}>
                      {formatCurrency(totalVatIn)}
                    </Text>
                  </View>

                  <View style={localStyles.summaryRow}>
                    <Text style={localStyles.summaryLabel}>Total VAT OUT:</Text>
                    <Text style={localStyles.summaryValue}>
                      {formatCurrency(totalVatOut)}
                    </Text>
                  </View>

                  <View style={localStyles.summaryRow}>
                    <Text style={localStyles.summaryLabel}>Total Expenses:</Text>
                    <Text style={localStyles.summaryValue}>
                      {formatCurrency(totalExpenses)}
                    </Text>
                  </View>

                  <View style={localStyles.summaryRow}>
                    <Text style={localStyles.summaryLabel}>Total Solicitor Fees:</Text>
                    <Text style={localStyles.summaryValue}>
                      {formatCurrency(totalSolicitorFees)}
                    </Text>
                  </View>

                  <View style={localStyles.summaryRow}>
                    <Text style={localStyles.summaryLabel}>Total Client Repair:</Text>
                    <Text style={localStyles.summaryValue}>
                      {formatCurrency(totalClientRepair)}
                    </Text>
                  </View>

                  <View style={localStyles.summaryRow}>
                    <Text style={localStyles.summaryLabel}>Total Profit:</Text>
                    <Text style={[localStyles.summaryValue, totalProfit >= 0 ? localStyles.positiveValue : localStyles.negativeValue]}>
                      {formatCurrency(totalProfit)}
                    </Text>
                  </View>
                </View>
              </>
            )}

            {/* VD Finance Records Table */}
            <View style={globalStyles.section}>
              <Text style={globalStyles.sectionTitle}>VD Finance Records</Text>
              <View style={globalStyles.tableContainer}>
                {/* Table Header */}
                <View style={globalStyles.tableHeader}>
                  <Text style={[globalStyles.tableCell, { width: '20%' }]}>Name</Text>
                  <Text style={[globalStyles.tableCell, { width: '15%' }]}>Reference</Text>
                  <Text style={[globalStyles.tableCell, { width: '15%' }]}>Registration</Text>
                  <Text style={[globalStyles.tableCell, { width: '15%' }]}>Total Amount</Text>
                  <Text style={[globalStyles.tableCell, { width: '15%' }]}>Profit</Text>
                  <Text style={[globalStyles.tableCell, { width: '20%' }]}>Date</Text>
                </View>

                {/* Table Rows */}
                {slice.map((record) => (
                  <View key={record.id} style={globalStyles.tableRow}>
                    <Text style={[globalStyles.tableCell, { width: '20%' }]}>
                      {record.name}
                    </Text>
                    <Text style={[globalStyles.tableCell, { width: '15%' }]}>
                      {record.reference}
                    </Text>
                    <Text style={[globalStyles.tableCell, { width: '15%' }]}>
                      {record.registration}
                    </Text>
                    <Text style={[globalStyles.tableCell, { width: '15%' }]}>
                      {formatCurrency(record.totalAmount)}
                    </Text>
                    <Text style={[globalStyles.tableCell, { width: '15%' }]}>
                      {formatCurrency(record.profit)}
                    </Text>
                    <Text style={[globalStyles.tableCell, { width: '20%' }]}>
                      {formatDate(record.date)}
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Footer */}
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

export default VDFinanceBulkDocument;