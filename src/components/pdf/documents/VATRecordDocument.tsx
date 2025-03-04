import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { VATRecord } from '../../../types/vatRecord';
import { format } from 'date-fns';

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  section: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 12,
    marginBottom: 10,
    backgroundColor: '#f3f4f6',
    padding: 5,
  },
  table: {
    display: 'table',
    width: 'auto',
    marginBottom: 10,
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tableHeader: {
    backgroundColor: '#f3f4f6',
  },
  tableCell: {
    padding: 5,
    flex: 1,
  },
  tableCellAmount: {
    padding: 5,
    width: 80,
    textAlign: 'right',
  },
  totalRow: {
    backgroundColor: '#f3f4f6',
    fontWeight: 'bold',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    fontSize: 8,
    textAlign: 'center',
    color: '#6b7280',
  },
});

interface VATRecordDocumentProps {
  data: VATRecord;
  companyDetails: any;
}

const VATRecordDocument: React.FC<VATRecordDocumentProps> = ({ data, companyDetails }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={{ fontSize: 14, fontWeight: 'bold' }}>{companyDetails.fullName}</Text>
        <Text>{companyDetails.officialAddress}</Text>
        <Text>VAT No: {companyDetails.vatNumber}</Text>
      </View>

      <Text style={styles.title}>VAT RECORD</Text>

      {/* Basic Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Record Details</Text>
        <View style={{ marginBottom: 10 }}>
          <Text>Receipt No: {data.receiptNo}</Text>
          <Text>Accountant: {data.accountant}</Text>
          <Text>Supplier: {data.supplier}</Text>
          <Text>REG No: {data.regNo}</Text>
          <Text>Date: {format(data.date, 'dd/MM/yyyy')}</Text>
        </View>
      </View>

      {/* Descriptions Table */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Descriptions</Text>
        <View style={styles.table}>
          {/* Table Header */}
          <View style={[styles.tableRow, styles.tableHeader]}>
            <View style={[styles.tableCell, { flex: 2 }]}>
              <Text>Description</Text>
            </View>
            <View style={styles.tableCellAmount}>
              <Text>NET</Text>
            </View>
            <View style={styles.tableCell}>
              <Text>V</Text>
            </View>
            <View style={styles.tableCellAmount}>
              <Text>VAT</Text>
            </View>
            <View style={styles.tableCellAmount}>
              <Text>GROSS</Text>
            </View>
          </View>

          {/* Table Rows */}
          {data.descriptions.map((desc) => (
            <View key={desc.id} style={styles.tableRow}>
              <View style={[styles.tableCell, { flex: 2 }]}>
                <Text>{desc.description}</Text>
              </View>
              <View style={styles.tableCellAmount}>
                <Text>£{desc.net.toFixed(2)}</Text>
              </View>
              <View style={styles.tableCell}>
                <Text>{desc.vType}</Text>
              </View>
              <View style={styles.tableCellAmount}>
                <Text>£{desc.vat.toFixed(2)}</Text>
              </View>
              <View style={styles.tableCellAmount}>
                <Text>£{desc.gross.toFixed(2)}</Text>
              </View>
            </View>
          ))}

          {/* Totals Row */}
          <View style={[styles.tableRow, styles.totalRow]}>
            <View style={[styles.tableCell, { flex: 2 }]}>
              <Text>Totals</Text>
            </View>
            <View style={styles.tableCellAmount}>
              <Text>£{data.net.toFixed(2)}</Text>
            </View>
            <View style={styles.tableCell}>
              <Text></Text>
            </View>
            <View style={styles.tableCellAmount}>
              <Text>£{data.vat.toFixed(2)}</Text>
            </View>
            <View style={styles.tableCellAmount}>
              <Text>£{data.gross.toFixed(2)}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Customer Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Customer Information</Text>
        <Text>Customer Name: {data.customerName}</Text>
        {data.customerId && <Text>Customer ID: {data.customerId}</Text>}
      </View>

      {/* Additional Details */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Additional Details</Text>
        <Text>Status: {data.status}</Text>
        {data.notes && <Text>Notes: {data.notes}</Text>}
      </View>

      {/* Footer */}
      <Text style={styles.footer}>
        {companyDetails.fullName} | Registered in England and Wales | Company No: {companyDetails.registrationNumber}
      </Text>
    </Page>
  </Document>
);

export default VATRecordDocument;