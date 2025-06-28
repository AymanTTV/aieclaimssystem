// src/components/pdf/documents/InvoiceBulkDocument.tsx
import React from 'react';
import { Document, Page, Text, View, Image, StyleSheet } from '@react-pdf/renderer';
import { Invoice } from '../../../types/finance';
import { styles as globalStyles } from '../styles'; // Renamed to avoid conflict
import { format } from 'date-fns';

interface InvoiceBulkDocumentProps {
  records: Invoice[];
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
    color: '#3B82F6', // blue
  },
});

const ITEMS_FIRST_PAGE = 5; // 5 records on the first page
const ITEMS_PER_PAGE = 7;   // 7 records on other pages

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

  // Pagination logic
  const remainder = Math.max(0, records.length - ITEMS_FIRST_PAGE);
  const pageCount = records.length > 0 ? 1 + Math.ceil(remainder / ITEMS_PER_PAGE) : 0;

  const getPageSlice = (page: number) =>
    page === 0
      ? records.slice(0, ITEMS_FIRST_PAGE)
      : records.slice(
          ITEMS_FIRST_PAGE + (page - 1) * ITEMS_PER_PAGE,
          ITEMS_FIRST_PAGE + page * ITEMS_PER_PAGE
        );

  // Utility to format a JS Date or Firestore Timestamp
  const formatDateValue = (date: Date | any): string => { // Renamed to avoid conflict with `formatDate` from date-fns
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
        const slice = getPageSlice(pageIndex);
        return (
          <Page key={pageIndex} size="A4" style={globalStyles.page}>
            {/* ── HEADER ── Updated to consistent design */}
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

            {/* ── TITLE & SUMMARY (only on first page) ── */}
            {pageIndex === 0 && (
              <>
                <View style={globalStyles.titleContainer}>
                  <Text style={globalStyles.title}>{title}</Text>
                </View>

                {/* Updated Summary Card */}
                <View style={[localStyles.summaryCard, { borderLeftColor: '#438BDC', borderLeftWidth: 3 }]}>
                    <View style={localStyles.summaryRow}>
                      <Text style={localStyles.summaryLabel}>Total Amount:</Text>
                      <Text style={localStyles.summaryValue}>{`£${totalAmount.toFixed(2)}`}</Text>
                    </View>
                    <View style={localStyles.summaryRow}>
                      <Text style={localStyles.summaryLabel}>Amount Paid:</Text>
                      <Text style={localStyles.summaryValue}>{`£${totalPaid.toFixed(2)}`}</Text>
                    </View>
                    <View style={localStyles.summaryRow}>
                      <Text style={localStyles.summaryLabel}>Outstanding:</Text>
                      <Text style={[localStyles.summaryValue, totalOutstanding > 0 ? localStyles.negativeValue : localStyles.positiveValue]}>
                        {`£${totalOutstanding.toFixed(2)}`}
                      </Text>
                    </View>
                    <View style={localStyles.summaryRow}>
                      <Text style={localStyles.summaryLabel}>Overdue Invoices:</Text>
                      <Text style={[localStyles.summaryValue, overdueInvoices > 0 ? localStyles.negativeValue : localStyles.positiveValue]}>
                        {overdueInvoices}
                      </Text>
                    </View>
                </View>
              </>
            )}

            {/* ── Invoice Records Table ── */}
            <View style={[globalStyles.section, globalStyles.keepTogether]}>
              <Text style={globalStyles.sectionTitle}>Invoice Records</Text>
              <View style={globalStyles.tableContainer}>
                {/* Table Header */}
                <View style={globalStyles.tableHeader}>
                  <Text style={[globalStyles.tableCell, { width: '15%' }]}>Date</Text>
                  <Text style={[globalStyles.tableCell, { width: '20%' }]}>Customer</Text>
                  <Text style={[globalStyles.tableCell, { width: '15%' }]}>Status</Text>
                  <Text style={[globalStyles.tableCell, { width: '15%' }]}>Total</Text>
                  <Text style={[globalStyles.tableCell, { width: '15%' }]}>Paid</Text>
                  <Text style={[globalStyles.tableCell, { width: '20%' }]}>Due Date</Text>
                </View>

                {/* Table Rows */}
                {slice.map((record) => (
                  <View key={record.id} style={globalStyles.tableRow}>
                    <Text style={[globalStyles.tableCell, { width: '15%' }]}>
                      {formatDateValue(record.date)}
                    </Text>
                    <Text style={[globalStyles.tableCell, { width: '20%' }]}>
                      {record.customerName}
                    </Text>
                    <Text style={[globalStyles.tableCell, { width: '15%' }]}>
                      {record.paymentStatus}
                    </Text>
                    <Text style={[globalStyles.tableCell, { width: '15%' }]}>
                      £{record.total.toFixed(2)}
                    </Text>
                    <Text style={[globalStyles.tableCell, { width: '15%' }]}>
                      £{record.paidAmount.toFixed(2)}
                    </Text>
                    <Text style={[globalStyles.tableCell, { width: '20%' }]}>
                      {formatDateValue(record.dueDate)}
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            {/* ── Footer & Page Number ── Updated to consistent design */}
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

export default InvoiceBulkDocument;