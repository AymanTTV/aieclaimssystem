// src/components/pdf/documents/VATRecordBulkDocument.tsx
import React from 'react';
import { Document, Page, Text, View, Image, StyleSheet } from '@react-pdf/renderer';
import { VATRecord } from '../../../types/vatRecord';
import { styles as globalStyles } from '../styles';
import { formatDate } from '../../../utils/dateHelpers';

interface VATRecordBulkDocumentProps {
  records: VATRecord[];
  companyDetails: any;
  title?: string;
}

const localStyles = StyleSheet.create({
  summaryCard: { ...globalStyles.card, marginBottom: 10, padding: 10, backgroundColor: '#F9FAFB', breakInside: 'avoid' },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  summaryLabel: { ...globalStyles.text, fontSize: 10, color: '#4B5563' },
  summaryValue: { ...globalStyles.text, fontSize: 10, fontFamily: 'Helvetica-Bold' },
});

const ITEMS_FIRST_PAGE = 5;
const ITEMS_PER_PAGE = 7;

const VATRecordBulkDocument: React.FC<VATRecordBulkDocumentProps> = ({ 
  records, 
  companyDetails,
  title = 'VAT Records Summary'
}) => {
  const totalNet = records.reduce((sum, r) => sum + r.net, 0);
  const totalVAT = records.reduce((sum, r) => sum + r.vat, 0);
  const totalGross = records.reduce((sum, r) => sum + r.gross, 0);
  const totalVatReceived = records.reduce((sum, r) => sum + (r.vatReceived || 0), 0);
  const balance = totalVAT - totalVatReceived;

  const remainder = Math.max(0, records.length - ITEMS_FIRST_PAGE);
  const pageCount = records.length > 0 ? 1 + Math.ceil(remainder / ITEMS_PER_PAGE) : 0;

  const getPageSlice = (page: number) =>
    page === 0
      ? records.slice(0, ITEMS_FIRST_PAGE)
      : records.slice(
          ITEMS_FIRST_PAGE + (page - 1) * ITEMS_PER_PAGE,
          ITEMS_FIRST_PAGE + page * ITEMS_PER_PAGE
        );

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
            <View style={globalStyles.header} fixed>
              <View style={globalStyles.headerLeft}>{headerDetails.logoUrl && (<Image src={headerDetails.logoUrl} style={globalStyles.logo} />)}</View>
              <View style={globalStyles.headerRight}>
                <Text style={globalStyles.companyName}>{headerDetails.fullName}</Text>
                <Text style={globalStyles.companyDetail}>{headerDetails.addressLine1}</Text>
                <Text style={globalStyles.companyDetail}>{headerDetails.addressLine2}</Text>
                <Text style={globalStyles.companyDetail}>Tel: {headerDetails.phone}</Text>
                <Text style={globalStyles.companyDetail}>Email: {headerDetails.email}</Text>
              </View>
            </View>

            {pageIndex === 0 && (
              <>
                <View style={globalStyles.titleContainer}><Text style={globalStyles.title}>{title}</Text></View>
                <View style={[localStyles.summaryCard, { borderLeftColor: '#438BDC', borderLeftWidth: 3 }]}>
                  <View style={localStyles.summaryRow}><Text style={localStyles.summaryLabel}>Total NET:</Text><Text style={localStyles.summaryValue}>£{totalNet.toFixed(2)}</Text></View>
                  <View style={localStyles.summaryRow}><Text style={localStyles.summaryLabel}>Total VAT:</Text><Text style={localStyles.summaryValue}>£{totalVAT.toFixed(2)}</Text></View>
                  <View style={localStyles.summaryRow}><Text style={localStyles.summaryLabel}>Total GROSS:</Text><Text style={localStyles.summaryValue}>£{totalGross.toFixed(2)}</Text></View>
                  <View style={localStyles.summaryRow}><Text style={localStyles.summaryLabel}>Total VAT Received:</Text><Text style={localStyles.summaryValue}>£{totalVatReceived.toFixed(2)}</Text></View>
                  <View style={localStyles.summaryRow}><Text style={localStyles.summaryLabel}>Balance:</Text><Text style={localStyles.summaryValue}>£{balance.toFixed(2)}</Text></View>
                </View>
              </>
            )}

            <View style={globalStyles.section}>
              <Text style={globalStyles.sectionTitle}>VAT Records</Text>
              <View style={globalStyles.tableContainer}>
                <View style={globalStyles.tableHeader}>
                  <Text style={[globalStyles.tableCell, { width: '10%' }]}>Date</Text>
                  <Text style={[globalStyles.tableCell, { width: '10%' }]}>Due Date</Text>
                  <Text style={[globalStyles.tableCell, { width: '22%' }]}>Receipt/Inv No</Text>
                  <Text style={[globalStyles.tableCell, { width: '22%' }]}>Supplier</Text>
                  <Text style={[globalStyles.tableCell, { width: '12%', textAlign: 'right' }]}>NET</Text>
                  <Text style={[globalStyles.tableCell, { width: '12%', textAlign: 'right' }]}>VAT</Text>
                  <Text style={[globalStyles.tableCell, { width: '12%', textAlign: 'right' }]}>GROSS</Text>
                </View>

                {slice.map((record) => (
                  <View key={record.id} style={globalStyles.tableRow}>
                    <Text style={[globalStyles.tableCell, { width: '10%' }]}>{formatDate(record.date)}</Text>
                    <Text style={[globalStyles.tableCell, { width: '10%' }]}>{record.dueDate ? formatDate(record.dueDate) : '-'}</Text>
                    <Text style={[globalStyles.tableCell, { width: '22%' }]}>{record.receiptNo}</Text>
                    <Text style={[globalStyles.tableCell, { width: '22%' }]}>{record.supplier}</Text>
                    <Text style={[globalStyles.tableCell, { width: '12%', textAlign: 'right' }]}>£{record.net.toFixed(2)}</Text>
                    <Text style={[globalStyles.tableCell, { width: '12%', textAlign: 'right' }]}>£{record.vat.toFixed(2)}</Text>
                    <Text style={[globalStyles.tableCell, { width: '12%', textAlign: 'right' }]}>£{record.gross.toFixed(2)}</Text>
                  </View>
                ))}
              </View>
            </View>

            <View style={globalStyles.footer} fixed>
              <Text style={globalStyles.footerText}>AIE SKYLINE LIMITED, registered in England and Wales with the company registration number 15616639, registered office address: United House, 39-41 North Road, London, N7 9DP. VAT. NO. 453448875</Text>
              <Text style={globalStyles.pageNumber} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
            </View>
          </Page>
        );
      })}
    </Document>
  );
};

export default VATRecordBulkDocument;