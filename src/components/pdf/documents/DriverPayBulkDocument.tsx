import React from 'react';
import { Document, Page, Text, View, Image, StyleSheet } from '@react-pdf/renderer';
import { DriverPay } from '../../../types/driverPay';
import { styles as globalStyles } from '../styles'; // Renamed to avoid conflict
import { formatDate } from '../../../utils/dateHelpers';

interface DriverPayBulkDocumentProps {
  records: DriverPay[];
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
    borderLeftWidth: 3, // Add a border left as per FinanceDocument
    borderLeftColor: '#438BDC', // Default border color
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
    color: '#3B82F6', // blue
  },
});


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
  const totalRemaining = records.reduce((sum, r) =>
      sum + r.paymentPeriods.reduce((pSum, p) => pSum + (Number(p.remainingAmount) || 0), 0), 0);


  // Pagination adjustments
  const ITEMS_FIRST_PAGE = 5; // 5 records on the first page
  const ITEMS_PER_PAGE = 7;   // 7 records on other pages

  const remainder = Math.max(0, records.length - ITEMS_FIRST_PAGE);
  const otherPages = Math.ceil(remainder / ITEMS_PER_PAGE);
  const pages = records.length > 0 ? 1 + otherPages : 0; // Handle empty records case

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
      {Array.from({ length: pages }).map((_, pageIndex) => {
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
                <View style={[globalStyles.section, localStyles.summaryCard]}>
                    <Text style={globalStyles.sectionTitle}>Payment Summary</Text>
                    <View style={localStyles.summaryRow}>
                        <Text style={localStyles.summaryLabel}>Total Amount:</Text>
                        <Text style={localStyles.summaryValue}>£{totalAmount.toFixed(2)}</Text>
                    </View>
                    <View style={localStyles.summaryRow}>
                        <Text style={localStyles.summaryLabel}>Total Commission:</Text>
                        <Text style={localStyles.summaryValue}>£{totalCommission.toFixed(2)}</Text>
                    </View>
                    <View style={localStyles.summaryRow}>
                        <Text style={localStyles.summaryLabel}>Total Net Pay:</Text>
                        <Text style={[localStyles.summaryValue, localStyles.positiveValue]}>£{totalNetPay.toFixed(2)}</Text>
                    </View>
                    <View style={localStyles.summaryRow}>
                        <Text style={localStyles.summaryLabel}>Total Paid:</Text>
                        <Text style={[localStyles.summaryValue, localStyles.positiveValue]}>£{totalPaid.toFixed(2)}</Text>
                    </View>
                    <View style={localStyles.summaryRow}>
                        <Text style={localStyles.summaryLabel}>Total Remaining:</Text>
                        <Text style={[localStyles.summaryValue, localStyles.negativeValue]}>£{totalRemaining.toFixed(2)}</Text>
                    </View>
                </View>
              </>
            )}

            {/* Driver Pay Records */}
            <View style={globalStyles.section}>
              <Text style={globalStyles.sectionTitle}>Driver Pay Records</Text>
              <View style={globalStyles.tableContainer}>
                {/* Table Header */}
                <View style={globalStyles.tableHeader}>
                  <Text style={[globalStyles.tableCell, { width: '15%' }]}>Driver No</Text>
                  <Text style={[globalStyles.tableCell, { width: '20%' }]}>Name</Text>
                  <Text style={[globalStyles.tableCell, { width: '15%' }]}>Collection</Text>
                  <Text style={[globalStyles.tableCell, { width: '15%' }]}>Net Pay</Text>
                  <Text style={[globalStyles.tableCell, { width: '15%' }]}>Paid</Text>
                  {/* <Text style={[globalStyles.tableCell, { width: '20%' }]}>Status</Text> */}
                </View>

                {/* Table Rows */}
                {slice.map((record) => {
                    const driverTotalNetPay = record.paymentPeriods.reduce((sum, period) => sum + (period.netPay || 0), 0);
                    const driverTotalPaidAmount = record.paymentPeriods.reduce((sum, period) => sum + (period.paidAmount || 0), 0);

                    return (
                        <View key={record.id} style={globalStyles.tableRow}>
                            <Text style={[globalStyles.tableCell, { width: '15%' }]}>
                                {record.driverNo}
                            </Text>
                            <Text style={[globalStyles.tableCell, { width: '20%' }]}>
                                {record.name}
                            </Text>
                            <Text style={[globalStyles.tableCell, { width: '15%' }]}>
                                {record.collection}
                            </Text>
                            <Text style={[globalStyles.tableCell, { width: '15%' }]}>
                                £{driverTotalNetPay.toFixed(2)}
                            </Text>
                            <Text style={[globalStyles.tableCell, { width: '15%' }]}>
                                £{driverTotalPaidAmount.toFixed(2)}
                            </Text>
                            {/* <Text style={[globalStyles.tableCell, { width: '20%' }]}>
                                {record.status}
                            </Text> */}
                        </View>
                    );
                })}
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

export default DriverPayBulkDocument;