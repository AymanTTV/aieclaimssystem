// src/components/pdf/documents/DriverPayDocument.tsx
import React from 'react';
import { Document, Page, Text, View, Image, StyleSheet } from '@react-pdf/renderer';
import { DriverPay } from '../../../types/driverPay';
import { formatDate } from '../../../utils/dateHelpers';
import { styles as globalStyles } from '../styles'; // Renamed to avoid conflict

interface DriverPayDocumentProps {
  data: DriverPay;
  companyDetails: any;
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


const DriverPayDocument: React.FC<DriverPayDocumentProps> = ({ data, companyDetails }) => {
  const ITEMS_FIRST_PAGE_PAYMENT_PERIODS = 5;
  const ITEMS_OTHER_PAGES_PAYMENT_PERIODS = 7;

  // Derive header details from companyDetails, splitting the address
  const headerDetails = {
    logoUrl: companyDetails?.logoUrl || '',
    fullName: companyDetails?.fullName || 'AIE Skyline Limited',
    addressLine1: 'United House, 39-41 North Road,',
    addressLine2: 'London, N7 9DP.',
    phone: companyDetails?.phone || 'N/A',
    email: companyDetails?.email || 'N/A',
  };

  const totalPaymentPeriods = data.paymentPeriods.length;
  const firstPagePeriods = Math.min(totalPaymentPeriods, ITEMS_FIRST_PAGE_PAYMENT_PERIODS);
  const remainingPeriods = Math.max(0, totalPaymentPeriods - firstPagePeriods);
  const otherPagesCount = Math.ceil(remainingPeriods / ITEMS_OTHER_PAGES_PAYMENT_PERIODS);
  const totalPages = totalPaymentPeriods > 0 ? 1 + otherPagesCount : 0;


  return (
    <Document>
      {Array.from({ length: totalPages }).map((_, pageIndex) => {
        const start = pageIndex === 0
          ? 0
          : ITEMS_FIRST_PAGE_PAYMENT_PERIODS + (pageIndex - 1) * ITEMS_OTHER_PAGES_PAYMENT_PERIODS;
        const count = pageIndex === 0
          ? ITEMS_FIRST_PAGE_PAYMENT_PERIODS
          : ITEMS_OTHER_PAGES_PAYMENT_PERIODS;
        const slice = data.paymentPeriods.slice(start, start + count);

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

            {/* Title - on first page only */}
            {pageIndex === 0 && (
                <View style={globalStyles.titleContainer}>
                    <Text style={globalStyles.title}>Driver Pay Record</Text>
                </View>
            )}

            {/* Driver Information - on first page only */}
            {pageIndex === 0 && (
              <View style={globalStyles.sectionBreak} wrap={false}>
                <View style={globalStyles.infoCard}>
                  <Text style={globalStyles.infoCardTitle}>Driver Information</Text>
                  <View style={globalStyles.row}>
                    <Text style={globalStyles.label}>Driver No:</Text>
                    <Text style={globalStyles.value}>{data.driverNo}</Text>
                  </View>
                  <View style={globalStyles.row}>
                    <Text style={globalStyles.label}>TID No:</Text>
                    <Text style={globalStyles.value}>{data.tidNo}</Text>
                  </View>
                  <View style={globalStyles.row}>
                    <Text style={globalStyles.label}>Name:</Text>
                    <Text style={globalStyles.value}>{data.name}</Text>
                  </View>
                  <View style={globalStyles.row}>
                    <Text style={globalStyles.label}>Phone Number:</Text>
                    <Text style={globalStyles.value}>{data.phoneNumber}</Text>
                  </View>
                  <View style={globalStyles.row}>
                    <Text style={globalStyles.label}>Collection Point:</Text>
                    <Text style={globalStyles.value}>{data.collection === 'OTHER' ? data.customCollection : data.collection}</Text>
                  </View>
                </View>
              </View>
            )}

            {/* Payment Periods Table */}
            <View style={globalStyles.sectionBreak} wrap={false}>
              <Text style={globalStyles.sectionTitle}>Payment Periods</Text>
              <View style={globalStyles.table}>
                <View style={globalStyles.tableHeader}>
                  <Text style={[globalStyles.tableCell, { flex: 1 }]}>Period</Text>
                  <Text style={[globalStyles.tableCell, { flex: 1 }]}>Start Date</Text>
                  <Text style={[globalStyles.tableCell, { flex: 1 }]}>End Date</Text>
                  <Text style={[globalStyles.tableCell, { flex: 1 }]}>Total</Text>
                  <Text style={[globalStyles.tableCell, { flex: 1 }]}>Commission (%)</Text>
                  <Text style={[globalStyles.tableCell, { flex: 1 }]}>Net Pay</Text>
                  <Text style={[globalStyles.tableCell, { flex: 1 }]}>Paid</Text>
                  <Text style={[globalStyles.tableCell, { flex: 1 }]}>Status</Text>
                </View>
                {slice.map((period, index) => (
                  <View key={period.id || index} style={globalStyles.tableRow}>
                    <Text style={[globalStyles.tableCell, { flex: 1 }]}>#{start + index + 1}</Text>
                    <Text style={[globalStyles.tableCell, { flex: 1 }]}>{formatDate(period.startDate)}</Text>
                    <Text style={[globalStyles.tableCell, { flex: 1 }]}>{formatDate(period.endDate)}</Text>
                    <Text style={[globalStyles.tableCell, { flex: 1 }]}>£{period.totalAmount.toFixed(2)}</Text>
                    <Text style={[globalStyles.tableCell, { flex: 1 }]}>{period.commissionPercentage}%</Text>
                    <Text style={[globalStyles.tableCell, { flex: 1 }]}>£{period.netPay.toFixed(2)}</Text>
                    <Text style={[globalStyles.tableCell, { flex: 1 }]}>£{period.paidAmount.toFixed(2)}</Text>
                    <Text style={[globalStyles.tableCell, { flex: 1 }]}>{period.status}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Payment History for each Period - rendered directly below its corresponding period or grouped */}
            {slice.map((period, index) => (
              period.payments && period.payments.length > 0 && (
                <View key={`payments-${period.id || index}`} style={globalStyles.sectionBreak} wrap={false}>
                  <Text style={globalStyles.sectionTitle}>Payment History - Period {start + index + 1}</Text>
                  <View style={globalStyles.table}>
                    <View style={globalStyles.tableHeader}>
                      <Text style={[globalStyles.tableCell, { flex: 1 }]}>Date</Text>
                      <Text style={[globalStyles.tableCell, { flex: 1 }]}>Amount</Text>
                      <Text style={[globalStyles.tableCell, { flex: 1 }]}>Method</Text>
                      <Text style={[globalStyles.tableCell, { flex: 1 }]}>Reference</Text>
                    </View>
                    {period.payments.map((payment, pIndex) => (
                      <View key={pIndex} style={globalStyles.tableRow}>
                        <Text style={[globalStyles.tableCell, { flex: 1 }]}>{formatDate(payment.date)}</Text>
                        <Text style={[globalStyles.tableCell, { flex: 1 }]}>£{payment.amount.toFixed(2)}</Text>
                        <Text style={[globalStyles.tableCell, { flex: 1 }]}>{payment.method.replace('_', ' ')}</Text>
                        <Text style={[globalStyles.tableCell, { flex: 1 }]}>{payment.reference || '-'}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )
            ))}

            {/* Payment Summary - on last page only to ensure all data is included for calculation */}
            {pageIndex === totalPages - 1 && totalPages > 0 && (
                <View style={globalStyles.sectionBreak} wrap={false}>
                    <Text style={globalStyles.sectionTitle}>Payment Summary</Text>
                    <View style={localStyles.summaryCard}>
                        <View style={localStyles.summaryRow}>
                            <Text style={localStyles.summaryLabel}>Total Periods:</Text>
                            <Text style={localStyles.summaryValue}>{data.paymentPeriods.length}</Text>
                        </View>
                        <View style={localStyles.summaryRow}>
                            <Text style={localStyles.summaryLabel}>Total Amount:</Text>
                            <Text style={localStyles.summaryValue}>
                                £{data.paymentPeriods.reduce((sum, p) => sum + p.totalAmount, 0).toFixed(2)}
                            </Text>
                        </View>
                        <View style={localStyles.summaryRow}>
                            <Text style={localStyles.summaryLabel}>Total Commission:</Text>
                            <Text style={localStyles.summaryValue}>
                                £{data.paymentPeriods.reduce((sum, p) => sum + p.commissionAmount, 0).toFixed(2)}
                            </Text>
                        </View>
                        <View style={localStyles.summaryRow}>
                            <Text style={localStyles.summaryLabel}>Total Net Pay:</Text>
                            <Text style={[localStyles.summaryValue, localStyles.positiveValue]}>
                                £{data.paymentPeriods.reduce((sum, p) => sum + p.netPay, 0).toFixed(2)}
                            </Text>
                        </View>
                        <View style={localStyles.summaryRow}>
                            <Text style={localStyles.summaryLabel}>Total Paid:</Text>
                            <Text style={[localStyles.summaryValue, localStyles.positiveValue]}>
                                £{data.paymentPeriods.reduce((sum, p) => sum + p.paidAmount, 0).toFixed(2)}
                            </Text>
                        </View>
                        <View style={localStyles.summaryRow}>
                            <Text style={localStyles.summaryLabel}>Total Remaining:</Text>
                            <Text style={[localStyles.summaryValue, localStyles.negativeValue]}>
                                £{data.paymentPeriods.reduce((sum, p) => sum + p.remainingAmount, 0).toFixed(2)}
                            </Text>
                        </View>
                    </View>
                </View>
            )}

            {/* Terms and Conditions - on last page only */}
            {pageIndex === totalPages - 1 && companyDetails.driverPayTerms && (
              <View style={globalStyles.sectionBreak} wrap={false}>
                <Text style={globalStyles.sectionTitle}>Terms & Conditions</Text>
                <Text style={globalStyles.text}>{companyDetails.driverPayTerms}</Text>
              </View>
            )}

            {/* Footer - on every page */}
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

export default DriverPayDocument;