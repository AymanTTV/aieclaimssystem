import React from 'react';
import { Document, Page, Text, View, Image } from '@react-pdf/renderer';
import { Invoice, Vehicle } from '../../types';
import { format } from 'date-fns';
import logo from '../../assets/logo.png';
import { styles } from './styles';

interface InvoicePDFProps {
  invoice: Invoice;
  vehicle?: Vehicle;
  companyDetails: any;
}

const formatDate = (date: any): string => {
  if (date?.toDate) {
    return format(date.toDate(), 'dd/MM/yyyy HH:mm');
  }
  if (date instanceof Date) {
    return format(date, 'dd/MM/yyyy HH:mm');
  }
  return 'N/A';
};

export const InvoicePDF: React.FC<InvoicePDFProps> = ({ invoice, vehicle, companyDetails }) => {
  const customerName = invoice.customerName || (invoice.customerId ? 'Customer' : '');

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Image src={logo} style={styles.logo} />
          <View style={styles.companyInfo}>
            <Text>{companyDetails.fullName}</Text>
            <Text>{companyDetails.officialAddress}</Text>
            <Text>Tel: {companyDetails.phone}</Text>
            <Text>Email: {companyDetails.email}</Text>
            <Text>VAT No: {companyDetails.vatNumber}</Text>
          </View>
        </View>

        <Text style={styles.title}>INVOICE</Text>

        {/* Invoice Details, Bill To, and Service Details in a row */}
        <View style={styles.grid}>
          <View style={styles.gridItem}>
            <View style={styles.card}>
              <Text style={styles.infoCardTitle}>Invoice Details</Text>
              <Text>Invoice Number: AIE-INV-{invoice.id.slice(-8).toUpperCase()}</Text>
              <Text>Date: {formatDate(invoice.date)}</Text>
              <Text>Due Date: {invoice.type === 'weekly' ? 'Every Monday' : formatDate(invoice.dueDate)}</Text>
              <Text>Payment Status: {invoice.paymentStatus.replace('_', ' ').toUpperCase()}</Text>
            </View>
          </View>

          <View style={styles.gridItem}>
            <View style={styles.card}>
              <Text style={styles.infoCardTitle}>Bill To:</Text>
              <Text>{customerName}</Text>
              <Text>{invoice.customerAddress}</Text>
            </View>
          </View>

          <View style={styles.gridItem}>
            <View style={styles.card}>
              <Text style={styles.infoCardTitle}>Service Details</Text>
              <Text>Category: {invoice.category}</Text>
              <Text>Description: {invoice.description}</Text>
            </View>
          </View>
        </View>

        {/* Payment Summary as a Table */}
        <View style={styles.tableContainer}>
          <Text style={styles.sectionTitle}>Payment Summary</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={styles.tableCell}>Original Amount</Text>
              {invoice.ongoingCharges > 0 && <Text style={styles.tableCell}>Ongoing Charges</Text>}
              <Text style={styles.tableCell}>Total Amount</Text>
              <Text style={styles.tableCell}>Amount Paid</Text>
              {invoice.remainingAmount > 0 && <Text style={styles.tableCell}>Balance Due</Text>}
            </View>
            <View style={styles.tableRow}>
              <Text style={styles.tableCell}>£{invoice.amount.toFixed(2)}</Text>
              {invoice.ongoingCharges > 0 && <Text style={styles.tableCell}>£{invoice.ongoingCharges.toFixed(2)}</Text>}
              <Text style={styles.tableCell}>£{(invoice.amount + (invoice.ongoingCharges || 0)).toFixed(2)}</Text>
              <Text style={styles.tableCell}>£{invoice.paidAmount.toFixed(2)}</Text>
              {invoice.remainingAmount > 0 && <Text style={styles.tableCell}>£{invoice.remainingAmount.toFixed(2)}</Text>}
            </View>
          </View>
        </View>

        {/* Payment Instructions */}
        <View style={[styles.card, styles.sectionBreak, { width: '48%' }]} wrap={false}>
          <Text style={styles.infoCardTitle}>Payment Details</Text>
          <Text>Bank: {companyDetails.bankName}</Text>
          <Text>Sort Code: {companyDetails.sortCode}</Text>
          <Text>Account Number: {companyDetails.accountNumber}</Text>
          <Text>Reference: AIE-INV-{invoice.id.slice(-8).toUpperCase()}</Text>
        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          {companyDetails.fullName} | Registered in England and Wales | Company No: {companyDetails.registrationNumber}
        </Text>
      </Page>
    </Document>
  );
};

export default InvoicePDF;